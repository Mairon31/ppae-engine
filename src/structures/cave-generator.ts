import {
  ArtStyleProfile,
  CaveChamberDefinition,
  LogicalRect,
  PPAE_SCHEMA_VERSION
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export const DEFAULT_CRYSTAL_CAVERN: CaveChamberDefinition = {
  schemaVersion: PPAE_SCHEMA_VERSION,
  caveId: 'cavern_level_01',
  widthInTiles: 9,
  heightInTiles: 7,
  seed: 2026,
  hasLavaPool: true,
  crystalCount: 5,
  exitStairsTileX: 4,
  exitStairsTileY: 5
};

export interface RenderedCaveChamberArtifact {
  readonly caveId: string;
  readonly chamberBuffer: PixelBuffer;
  readonly collisionRects: readonly LogicalRect[];
  readonly bioluminescentNodes: ReadonlyArray<{
    readonly texelX: number;
    readonly texelY: number;
    readonly colorHex: string;
  }>;
}

/**
 * Generador de cámaras de cuevas subterráneas con muros rocosos,
 * escaleras de retorno a superficie, vetas cristalinas luminosas y pozos de lava.
 */
export class CaveDungeonGenerator {
  public generateChamber(
    def: CaveChamberDefinition,
    profile: ArtStyleProfile
  ): RenderedCaveChamberArtifact {
    const tileTex = profile.canonicalTileTexels;
    const widthPx = def.widthInTiles * tileTex;
    const heightPx = def.heightInTiles * tileTex;
    const buf = new PixelBuffer(widthPx, heightPx);
    const rng = new SeededRNG(def.seed);

    const floorCol = hexToRgba('#1e293b');
    const floorSpeck = hexToRgba('#334155');
    const wallCol = hexToRgba('#0f172a');
    const wallHighlight = hexToRgba('#475569');
    const crystalCol = hexToRgba('#38bdf8');
    const crystalCore = hexToRgba('#e0f2fe');
    const lavaCol = hexToRgba('#ea580c');
    const lavaBright = hexToRgba('#facc15');

    const collisionRects: LogicalRect[] = [];
    const bioluminescentNodes: Array<{ texelX: number; texelY: number; colorHex: string }> = [];

    // 1. Suelo de roca subterránea y muros de caverna en el perímetro
    for (let ty = 0; ty < def.heightInTiles; ty++) {
      for (let tx = 0; tx < def.widthInTiles; tx++) {
        const bx = tx * tileTex;
        const by = ty * tileTex;
        const isWall =
          ty === 0 || ty === def.heightInTiles - 1 || tx === 0 || tx === def.widthInTiles - 1;

        if (isWall) {
          collisionRects.push({ x: tx * 16, y: ty * 16, width: 16, height: 16 });
          buf.fillRect(bx, by, tileTex, tileTex, wallCol);
          buf.fillEllipse(
            bx + Math.floor(tileTex / 2),
            by + Math.floor(tileTex / 2),
            Math.floor(tileTex * 0.4),
            Math.floor(tileTex * 0.4),
            wallHighlight
          );
        } else {
          buf.fillRect(bx, by, tileTex, tileTex, floorCol);
          if (rng.chance(0.45)) {
            buf.fillRect(bx + 4, by + 4, 2, 2, floorSpeck);
          }
        }
      }
    }

    // 2. Pozo de lava subterránea en esquina superior derecha
    if (def.hasLavaPool) {
      const lx = 6 * tileTex;
      const ly = 2 * tileTex;
      buf.fillEllipse(lx, ly, Math.floor(tileTex * 0.85), Math.floor(tileTex * 0.65), lavaCol);
      buf.fillEllipse(lx, ly, Math.floor(tileTex * 0.4), Math.floor(tileTex * 0.3), lavaBright);
      collisionRects.push({ x: 5 * 16, y: 1 * 16, width: 32, height: 32 });
      bioluminescentNodes.push({ texelX: lx, texelY: ly, colorHex: '#f97316' });
    }

    // 3. Cristales bioluminiscentes y estalagmitas
    for (let i = 0; i < def.crystalCount; i++) {
      const tx = rng.nextInt(1, def.widthInTiles - 2);
      const ty = rng.nextInt(1, def.heightInTiles - 3);
      if (tx === def.exitStairsTileX && ty === def.exitStairsTileY) continue;

      const cx = tx * tileTex + Math.floor(tileTex / 2);
      const cy = ty * tileTex + Math.floor(tileTex / 2);
      buf.drawLine(cx - 2, cy + 4, cx, cy - 6, crystalCol, 3);
      buf.setPixel(cx, cy - 6, crystalCore);
      bioluminescentNodes.push({ texelX: cx, texelY: cy - 3, colorHex: '#38bdf8' });
    }

    // 4. Escaleras de ascenso hacia el exterior
    const sx = def.exitStairsTileX * tileTex;
    const sy = def.exitStairsTileY * tileTex;
    buf.fillRect(sx + 2, sy + 2, tileTex - 4, tileTex - 4, wallHighlight);
    for (let step = 0; step < 4; step++) {
      buf.fillRect(sx + 4, sy + 4 + step * 4, tileTex - 8, 2, hexToRgba('#cbd5e1'));
    }

    return {
      caveId: def.caveId,
      chamberBuffer: buf,
      collisionRects,
      bioluminescentNodes
    };
  }
}
