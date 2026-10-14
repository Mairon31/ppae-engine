import {
  ArtStyleProfile,
  FurnitureKind,
  InteriorDefinition,
  LogicalRect,
  PPAE_SCHEMA_VERSION
} from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export const DEFAULT_COTTAGE_INTERIOR: InteriorDefinition = {
  schemaVersion: PPAE_SCHEMA_VERSION,
  interiorId: 'interior_cottage_01',
  parentStructureId: 'village_cottage_01',
  widthInTiles: 8,
  heightInTiles: 7,
  floorMaterialHex: '#854d0e',
  floorAccentHex: '#713f12',
  wallMaterialHex: '#475569',
  exitDoorTileX: 4,
  exitDoorTileY: 6,
  furniture: [
    {
      id: 'bed_master',
      kind: 'bed',
      tileX: 1,
      tileY: 1,
      widthTiles: 2,
      heightTiles: 2,
      collidable: true
    },
    {
      id: 'bookshelf_north',
      kind: 'bookshelf',
      tileX: 3,
      tileY: 1,
      widthTiles: 2,
      heightTiles: 1,
      collidable: true
    },
    {
      id: 'hearth_furnace',
      kind: 'furnace_hearth',
      tileX: 6,
      tileY: 1,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      emitsLight: true
    },
    {
      id: 'center_rug',
      kind: 'woven_rug',
      tileX: 3,
      tileY: 3,
      widthTiles: 2,
      heightTiles: 2,
      collidable: false
    },
    {
      id: 'oak_table',
      kind: 'dining_table',
      tileX: 2,
      tileY: 3,
      widthTiles: 2,
      heightTiles: 1,
      collidable: true
    },
    {
      id: 'storage_chest_01',
      kind: 'storage_chest',
      tileX: 6,
      tileY: 4,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true
    },
    {
      id: 'torch_west',
      kind: 'wall_torch',
      tileX: 1,
      tileY: 0,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      emitsLight: true
    }
  ]
};

export interface RenderedInteriorArtifact {
  readonly interiorId: string;
  readonly roomBuffer: PixelBuffer;
  readonly collisionRects: readonly LogicalRect[];
  readonly walkabilityGrid: readonly (readonly boolean[])[];
  readonly lightSourcePositionsTexel: ReadonlyArray<{
    readonly id: string;
    readonly texelX: number;
    readonly texelY: number;
    readonly radiusTexels: number;
  }>;
}

/**
 * Motor de representación de interiores con suelos por habitación, muros perimetrales,
 * mobiliario procedural ordenado por profundidad (Y-sorting) y matriz formal de colisiones.
 */
export class InteriorGenerator {
  public renderInterior(
    def: InteriorDefinition,
    profile: ArtStyleProfile
  ): RenderedInteriorArtifact {
    const tileTex = profile.canonicalTileTexels;
    const widthPx = def.widthInTiles * tileTex;
    const heightPx = def.heightInTiles * tileTex;
    const roomBuffer = new PixelBuffer(widthPx, heightPx);

    const floorMain = hexToRgba(def.floorMaterialHex);
    const floorDark = hexToRgba(def.floorAccentHex);
    const wallMain = hexToRgba(def.wallMaterialHex);
    const wallDark = hexToRgba('#1e293b');
    const outlineCol = hexToRgba('#090d16');

    const walkability: boolean[][] = Array.from({ length: def.heightInTiles }, () =>
      Array.from({ length: def.widthInTiles }, () => true)
    );
    const collisionRects: LogicalRect[] = [];
    const lightSources: Array<{ id: string; texelX: number; texelY: number; radiusTexels: number }> = [];

    // 1. Suelo de tablones de madera en el área interior y muros perimetrales
    for (let ty = 0; ty < def.heightInTiles; ty++) {
      for (let tx = 0; tx < def.widthInTiles; tx++) {
        const bx = tx * tileTex;
        const by = ty * tileTex;

        const isPerimeterWall =
          ty === 0 ||
          tx === 0 ||
          tx === def.widthInTiles - 1 ||
          (ty === def.heightInTiles - 1 && tx !== def.exitDoorTileX);

        if (isPerimeterWall) {
          walkability[ty][tx] = false;
          collisionRects.push({ x: tx * 16, y: ty * 16, width: 16, height: 16 });
          roomBuffer.fillRect(bx, by, tileTex, tileTex, wallMain);
          roomBuffer.fillRect(bx, by + tileTex - 3, tileTex, 3, wallDark);
        } else {
          roomBuffer.fillRect(bx, by, tileTex, tileTex, floorMain);
          // Vetas horizontales de tablones
          for (let py = 0; py < tileTex; py += profile.moduleSize) {
            roomBuffer.drawLine(bx, by + py, bx + tileTex - 1, by + py, floorDark, 1);
          }
        }
      }
    }

    // Alfombra de umbral en la puerta de salida
    const exitBx = def.exitDoorTileX * tileTex;
    const exitBy = def.exitDoorTileY * tileTex;
    roomBuffer.fillRect(exitBx + 2, exitBy + 2, tileTex - 4, tileTex - 4, hexToRgba('#b45309'));

    // 2. Ordenar muebles por profundidad (alfombras primero, luego objetos por base Y)
    const sortedFurniture = [...def.furniture].sort((a, b) => {
      if (a.kind === 'woven_rug' && b.kind !== 'woven_rug') return -1;
      if (b.kind === 'woven_rug' && a.kind !== 'woven_rug') return 1;
      return a.tileY + a.heightTiles - (b.tileY + b.heightTiles);
    });

    for (const item of sortedFurniture) {
      const fBuf = this.generateFurnitureSprite(
        item.kind,
        item.widthTiles * tileTex,
        item.heightTiles * tileTex,
        outlineCol
      );

      const destX = item.tileX * tileTex;
      const destY = item.tileY * tileTex;
      for (let py = 0; py < fBuf.height; py++) {
        for (let px = 0; px < fBuf.width; px++) {
          const c = fBuf.getPixel(px, py);
          if (c.a > 0) {
            roomBuffer.setPixel(destX + px, destY + py, c);
          }
        }
      }

      if (item.collidable) {
        collisionRects.push({
          x: item.tileX * 16,
          y: item.tileY * 16,
          width: item.widthTiles * 16,
          height: item.heightTiles * 16
        });
        for (let dy = 0; dy < item.heightTiles; dy++) {
          for (let dx = 0; dx < item.widthTiles; dx++) {
            const gy = item.tileY + dy;
            const gx = item.tileX + dx;
            if (gy >= 0 && gy < def.heightInTiles && gx >= 0 && gx < def.widthInTiles) {
              walkability[gy][gx] = false;
            }
          }
        }
      }

      if (item.emitsLight) {
        lightSources.push({
          id: item.id,
          texelX: destX + Math.floor(fBuf.width / 2),
          texelY: destY + Math.floor(fBuf.height / 2),
          radiusTexels: tileTex * 3
        });
      }
    }

    return {
      interiorId: def.interiorId,
      roomBuffer,
      collisionRects,
      walkabilityGrid: walkability,
      lightSourcePositionsTexel: lightSources
    };
  }

  private generateFurnitureSprite(
    kind: FurnitureKind,
    w: number,
    h: number,
    outlineCol: ReturnType<typeof hexToRgba>
  ): PixelBuffer {
    const buf = new PixelBuffer(w, h);
    const woodMid = hexToRgba('#92400e');
    const woodHigh = hexToRgba('#b45309');

    switch (kind) {
      case 'bed': {
        // Marco de madera, almohada blanca y manta roja
        buf.fillRect(2, 2, w - 4, h - 4, woodMid);
        buf.fillRect(4, 4, w - 8, Math.floor(h * 0.28), hexToRgba('#f8fafc'));
        buf.fillRect(4, 4 + Math.floor(h * 0.28), w - 8, Math.floor(h * 0.56), hexToRgba('#dc2626'));
        buf.applySelectiveOutline(outlineCol);
        break;
      }
      case 'bookshelf': {
        buf.fillRect(2, 2, w - 4, h - 3, woodMid);
        // Lomos de libros de colores
        const bookColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
        for (let x = 5; x < w - 5; x += 3) {
          buf.fillRect(x, 5, 2, Math.floor(h * 0.35), hexToRgba(bookColors[x % bookColors.length]));
          buf.fillRect(
            x,
            Math.floor(h * 0.52),
            2,
            Math.floor(h * 0.32),
            hexToRgba(bookColors[(x + 1) % bookColors.length])
          );
        }
        buf.applySelectiveOutline(outlineCol);
        break;
      }
      case 'dining_table': {
        buf.fillRect(2, 3, w - 4, h - 6, woodHigh);
        buf.fillRect(3, h - 4, 2, 3, woodMid);
        buf.fillRect(w - 5, h - 4, 2, 3, woodMid);
        buf.applySelectiveOutline(outlineCol);
        break;
      }
      case 'storage_chest': {
        buf.fillRect(3, 4, w - 6, h - 6, woodMid);
        buf.fillRect(3, 4, w - 6, 3, woodHigh);
        buf.fillRect(Math.floor(w / 2) - 1, Math.floor(h / 2), 3, 3, hexToRgba('#facc15'));
        buf.applySelectiveOutline(outlineCol);
        break;
      }
      case 'furnace_hearth': {
        buf.fillRect(2, 2, w - 4, h - 3, hexToRgba('#475569'));
        buf.fillEllipse(
          Math.floor(w / 2),
          Math.floor(h * 0.65),
          Math.floor(w * 0.26),
          Math.floor(h * 0.25),
          hexToRgba('#f97316')
        );
        buf.setPixel(Math.floor(w / 2), Math.floor(h * 0.65), hexToRgba('#fef08a'));
        buf.applySelectiveOutline(outlineCol);
        break;
      }
      case 'wall_torch': {
        const cx = Math.floor(w / 2);
        const cy = Math.floor(h / 2);
        buf.fillRect(cx - 1, cy, 2, 5, woodMid);
        buf.fillEllipse(cx, cy - 2, 2, 3, hexToRgba('#facc15'));
        buf.applySelectiveOutline(outlineCol);
        break;
      }
      case 'woven_rug': {
        buf.fillRect(2, 2, w - 4, h - 4, hexToRgba('#991b1b'));
        buf.fillRect(5, 5, w - 10, h - 10, hexToRgba('#d97706'));
        break;
      }
      default: {
        buf.fillRect(3, 3, w - 6, h - 6, woodMid);
        buf.applySelectiveOutline(outlineCol);
        break;
      }
    }
    return buf;
  }
}
