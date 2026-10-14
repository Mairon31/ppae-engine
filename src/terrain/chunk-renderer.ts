import {
  ArtStyleProfile,
  GeologicalResourceKind,
  SecondaryFloraKind,
  TreeLifecycleStage,
  TreeSpeciesId,
  WorldTileSample
} from '../core/contracts';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { NatureGenerator } from '../vegetation/nature-generator';
import { TerrainAutotiler } from './autotiler';
import { LiquidKind, LiquidTileGenerator } from './liquid-renderer';
import { DeterministicWorldField, TERRAIN_MATERIALS } from './world-field';

export const CHUNK_SIZE_TILES = 8; // Configurable (8x8 o 16x16 tiles por chunk)

export interface RenderedChunkArtifact {
  readonly chunkX: number;
  readonly chunkY: number;
  readonly liquidFrame: number;
  readonly terrainBuffer: PixelBuffer;
  readonly sortedProps: Array<{
    readonly tileX: number;
    readonly tileY: number;
    readonly drawTexelX: number;
    readonly drawTexelY: number;
    readonly sortY: number;
    readonly buffer: PixelBuffer;
  }>;
  readonly samples: WorldTileSample[][];
}

/**
 * Renderiza chunks completos garantizando que los bordes (x=0, x=N-1, y=0, y=N-1)
 * consulten el campo espacial determinista global sin depender de chunks vecinos en RAM.
 */
export class ChunkWorldRenderer {
  private readonly autotiler = new TerrainAutotiler();
  private readonly liquidGen = new LiquidTileGenerator();
  private readonly natureGen = new NatureGenerator();
  private readonly tileSurfaceCache = new Map<string, PixelBuffer>();

  constructor(public readonly worldField: DeterministicWorldField) {}

  public invalidateTileCache(): void {
    this.tileSurfaceCache.clear();
  }

  public renderChunk(
    chunkX: number,
    chunkY: number,
    profile: ArtStyleProfile,
    liquidFrame = 0,
    totalLiquidFrames = 4,
    chunkSizeTiles = CHUNK_SIZE_TILES
  ): RenderedChunkArtifact {
    const tileTexels = profile.canonicalTileTexels;
    const chunkPixelSpan = chunkSizeTiles * tileTexels;
    const terrainBuffer = new PixelBuffer(chunkPixelSpan, chunkPixelSpan);
    const samples: WorldTileSample[][] = [];
    const sortedProps: RenderedChunkArtifact['sortedProps'] = [];

    const startTileX = chunkX * chunkSizeTiles;
    const startTileY = chunkY * chunkSizeTiles;

    for (let localY = 0; localY < chunkSizeTiles; localY++) {
      const row: WorldTileSample[] = [];
      for (let localX = 0; localX < chunkSizeTiles; localX++) {
        const worldTileX = startTileX + localX;
        const worldTileY = startTileY + localY;
        const sample = this.worldField.sampleWorldTile(worldTileX, worldTileY);
        row.push(sample);

        const tileBuf = this.resolveTileSurface(
          sample,
          profile,
          liquidFrame,
          totalLiquidFrames
        );

        // Copiar el tile de terreno dentro del buffer del chunk
        const destBaseX = localX * tileTexels;
        const destBaseY = localY * tileTexels;
        for (let ty = 0; ty < tileTexels; ty++) {
          for (let tx = 0; tx < tileTexels; tx++) {
            terrainBuffer.setPixel(destBaseX + tx, destBaseY + ty, tileBuf.getPixel(tx, ty));
          }
        }

        // Si el tile contiene un árbol, planta o roca mineral, generarlo y ordenarlo por su base de apoyo
        if (sample.propSpawn) {
          const propArtifact = this.resolvePropSprite(sample.propSpawn, profile);
          const anchorWorldTexelX = destBaseX + Math.floor(tileTexels / 2);
          const anchorWorldTexelY = destBaseY + Math.floor(tileTexels * 0.78);

          sortedProps.push({
            tileX: worldTileX,
            tileY: worldTileY,
            drawTexelX: anchorWorldTexelX - propArtifact.pivotTexel[0],
            drawTexelY: anchorWorldTexelY - propArtifact.pivotTexel[1],
            sortY: worldTileY * 1000 + localX * 0.01,
            buffer: propArtifact.buffer
          });
        }
      }
      samples.push(row);
    }

    sortedProps.sort((a, b) => a.sortY - b.sortY);

    return {
      chunkX,
      chunkY,
      liquidFrame,
      terrainBuffer,
      sortedProps,
      samples
    };
  }

  private resolveTileSurface(
    sample: WorldTileSample,
    profile: ArtStyleProfile,
    liquidFrame: number,
    totalLiquidFrames: number
  ): PixelBuffer {
    const matDef = TERRAIN_MATERIALS[sample.material];
    const variantIdx = Math.abs((sample.tileX * 31 + sample.tileY * 17) % 4);

    if (matDef.isLiquid) {
      const key = `liq::${sample.material}::${sample.autotileMask}::f${liquidFrame}::${profile.id}`;
      let cached = this.tileSurfaceCache.get(key);
      if (!cached) {
        cached = this.liquidGen.generateAnimatedFrame(
          sample.material as LiquidKind,
          liquidFrame,
          totalLiquidFrames,
          sample.autotileMask,
          profile
        );
        this.tileSurfaceCache.set(key, cached);
      }
      return cached;
    }

    const key = `ter::${sample.material}::${sample.autotileMask}::${sample.transitionNeighborMaterial ?? 'none'}::v${variantIdx}::${profile.id}`;
    let cached = this.tileSurfaceCache.get(key);
    if (!cached) {
      cached = this.autotiler.composeAutotiledSurface(
        sample.material,
        sample.autotileMask,
        profile,
        sample.transitionNeighborMaterial,
        variantIdx
      );
      this.tileSurfaceCache.set(key, cached);
    }
    return cached;
  }

  private resolvePropSprite(
    propSpawn: NonNullable<WorldTileSample['propSpawn']>,
    profile: ArtStyleProfile
  ) {
    if (propSpawn.kind === 'tree') {
      return this.natureGen.generateTreeStage(
        propSpawn.subType as TreeSpeciesId,
        (propSpawn.stage ?? 'mature') as TreeLifecycleStage,
        profile,
        propSpawn.variantSeed
      );
    }
    if (propSpawn.kind === 'flora') {
      return this.natureGen.generateSecondaryFlora(
        propSpawn.subType as SecondaryFloraKind,
        profile,
        propSpawn.variantSeed
      );
    }
    return this.natureGen.generateGeologicalResource(
      propSpawn.subType as GeologicalResourceKind,
      profile,
      propSpawn.variantSeed
    );
  }
}
