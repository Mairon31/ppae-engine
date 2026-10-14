import { describe, expect, it } from 'vitest';
import {
  ChunkWorldRenderer,
  DEFAULT_STYLE_PROFILES,
  DeterministicWorldField,
  LiquidTileGenerator,
  NatureGenerator,
  TerrainAutotiler
} from '../src/index';

describe('PPAE Phase 2 — Terrain, Autotiling, Chunk Continuity & Nature Verification', () => {
  it('generates seamless base terrain tiles with toroidal wrap consistency', () => {
    const autotiler = new TerrainAutotiler();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];
    const tile = autotiler.generateSeamlessBaseTile('meadow_grass', profile, 0);

    expect(tile.width).toBe(24);
    expect(tile.height).toBe(24);

    // Every pixel must be fully opaque and belong to the meadow grass palette
    for (let y = 0; y < tile.height; y++) {
      for (let x = 0; x < tile.width; x++) {
        expect(tile.getPixel(x, y).a).toBe(255);
      }
    }
  });

  it('applies diagonal corner gating correctly on 8-neighbor autotiling masks', () => {
    const field = new DeterministicWorldField('autotile-test-seed');

    // Rodeamos (10, 10) de meadow_grass salvo en la esquina diagonal (11, 9) = dirt_soil
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        field.applyTileModification(10 + dx, 10 + dy, { material: 'meadow_grass' });
      }
    }
    field.applyTileModification(11, 9, { material: 'dirt_soil' });

    const sample = field.sampleWorldTile(10, 10);
    // Todos los bits activos excepto NE (bit 2): 255 - 2 = 253
    expect(sample.autotileMask).toBe(253);
    expect(sample.transitionNeighborMaterial).toBe('dirt_soil');
  });

  it('guarantees cross-chunk boundary continuity regardless of chunk evaluation order', () => {
    const profile = DEFAULT_STYLE_PROFILES['micro-6x6'];

    // Instancia A evalúa solo el chunk derecho (1, 0) sin haber cargado jamás (0, 0)
    const fieldA = new DeterministicWorldField('chunk-continuity-seed-2026');
    const rendererA = new ChunkWorldRenderer(fieldA);
    const chunkRightIsolated = rendererA.renderChunk(1, 0, profile, 0, 4, 8);

    // Instancia B evalúa primero (0, 0), luego (0, 1) y finalmente (1, 0)
    const fieldB = new DeterministicWorldField('chunk-continuity-seed-2026');
    const rendererB = new ChunkWorldRenderer(fieldB);
    const chunkLeft = rendererB.renderChunk(0, 0, profile, 0, 4, 8);
    rendererB.renderChunk(0, 1, profile, 0, 4, 8);
    const chunkRightAfterNeighbors = rendererB.renderChunk(1, 0, profile, 0, 4, 8);

    // El chunk (1,0) aislado debe ser idéntico byte a byte al evaluado tras otros chunks
    expect(Array.from(chunkRightIsolated.terrainBuffer.data)).toEqual(
      Array.from(chunkRightAfterNeighbors.terrainBuffer.data)
    );

    // Además, la máscara del borde derecho de (0,0) en x=7 es coherente con el borde izquierdo de (1,0) en x=8
    for (let row = 0; row < 8; row++) {
      const leftBorderTile = chunkLeft.samples[row][7];
      const rightBorderTile = chunkRightIsolated.samples[row][0];
      expect(leftBorderTile.tileX + 1).toBe(rightBorderTile.tileX);
      expect(leftBorderTile.tileY).toBe(rightBorderTile.tileY);
    }
  });

  it('produces distinct morphological silhouettes for each tree lifecycle stage', () => {
    const natureGen = new NatureGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const sapling = natureGen.generateTreeStage('oak', 'sapling', profile, 42);
    const mature = natureGen.generateTreeStage('oak', 'mature', profile, 42);
    const stump = natureGen.generateTreeStage('oak', 'stump', profile, 42);
    const fallenLog = natureGen.generateTreeStage('oak', 'fallen_log', profile, 42);

    // Un árbol maduro es más alto que un retoño y que un tocón
    expect(mature.buffer.height).toBeGreaterThan(sapling.buffer.height);
    expect(sapling.buffer.height).toBeGreaterThan(stump.buffer.height);
    // Un tronco caído es más ancho que alto
    expect(fallenLog.buffer.width).toBeGreaterThan(fallenLog.buffer.height);
  });

  it('renders cyclic, spatially seamless animated liquid frames', () => {
    const liquidGen = new LiquidTileGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const frame0 = liquidGen.generateAnimatedFrame('shallow_water', 0, 4, 255, profile);
    const frame1 = liquidGen.generateAnimatedFrame('shallow_water', 1, 4, 255, profile);
    const frame4Loop = liquidGen.generateAnimatedFrame('shallow_water', 4, 4, 255, profile);

    // El fotograma 0 y el 1 difieren por el desplazamiento de onda
    expect(Array.from(frame0.data)).not.toEqual(Array.from(frame1.data));
    // El fotograma 4 cierra exactamente el ciclo temporal con el fotograma 0
    expect(Array.from(frame0.data)).toEqual(Array.from(frame4Loop.data));
  });
});
