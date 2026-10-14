import {
  ArtStyleProfile,
  LogicalRect,
  PPAE_SCHEMA_VERSION,
  StructureDefinition
} from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export const DEFAULT_STRUCTURE_CATALOG: Readonly<Record<string, StructureDefinition>> = {
  village_cottage_01: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'village_cottage_01',
    archetype: 'cottage_house',
    wallMaterial: 'timber_frame',
    roofStyle: 'pitched_shingle',
    widthInTiles: 5,
    heightInTiles: 4,
    hasChimney: true,
    windowCount: 2,
    doorTileOffsetX: 2,
    wallPrimaryHex: '#d6c7b2',
    wallSecondaryHex: '#6b4423',
    roofPrimaryHex: '#991b1b',
    roofShadowHex: '#5c1111'
  },
  blacksmith_forge_01: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'blacksmith_forge_01',
    archetype: 'blacksmith_forge',
    wallMaterial: 'cobblestone',
    roofStyle: 'stone_battlement',
    widthInTiles: 6,
    heightInTiles: 4,
    hasChimney: true,
    windowCount: 2,
    doorTileOffsetX: 2,
    wallPrimaryHex: '#64748b',
    wallSecondaryHex: '#334155',
    roofPrimaryHex: '#475569',
    roofShadowHex: '#1e293b'
  },
  north_mine_cave_mouth: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'north_mine_cave_mouth',
    archetype: 'cave_entrance',
    wallMaterial: 'cavern_rock',
    roofStyle: 'none',
    widthInTiles: 4,
    heightInTiles: 3,
    hasChimney: false,
    windowCount: 0,
    doorTileOffsetX: 1,
    wallPrimaryHex: '#475569',
    wallSecondaryHex: '#1e293b',
    roofPrimaryHex: '#334155',
    roofShadowHex: '#0f172a'
  },
  river_wooden_bridge: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'river_wooden_bridge',
    archetype: 'wooden_bridge',
    wallMaterial: 'timber_frame',
    roofStyle: 'none',
    widthInTiles: 4,
    heightInTiles: 2,
    hasChimney: false,
    windowCount: 0,
    doorTileOffsetX: 0,
    wallPrimaryHex: '#854d0e',
    wallSecondaryHex: '#451a03',
    roofPrimaryHex: '#713f12',
    roofShadowHex: '#3f2305'
  }
};

export interface RenderedStructureArtifact {
  readonly structureId: string;
  readonly baseAndWallsBuffer: PixelBuffer;
  readonly roofOverlayBuffer: PixelBuffer;
  readonly pivotTexel: readonly [number, number];
  readonly wallCollisionRects: readonly LogicalRect[];
  readonly doorCollisionRect: LogicalRect;
  readonly roofOcclusionFootprint: LogicalRect;
}

/**
 * Generador de arquitectura 2D basada en componentes reutilizables.
 * Separa estrictamente `baseAndWallsBuffer` de `roofOverlayBuffer` para permitir
 * oclusión selectiva de tejados cuando el jugador entra o pasa detrás del edificio.
 */
export class StructureGenerator {
  public generateStructure(
    def: StructureDefinition,
    profile: ArtStyleProfile,
    isDoorOpen = false,
    interiorWindowLit = true
  ): RenderedStructureArtifact {
    const tileTex = profile.canonicalTileTexels;
    const widthPx = def.widthInTiles * tileTex;
    const heightPx = def.heightInTiles * tileTex;

    const baseAndWallsBuffer = new PixelBuffer(widthPx, heightPx);
    const roofOverlayBuffer = new PixelBuffer(widthPx, heightPx);

    const wallMain = hexToRgba(def.wallPrimaryHex);
    const wallBeam = hexToRgba(def.wallSecondaryHex);
    const roofMain = hexToRgba(def.roofPrimaryHex);
    const roofShad = hexToRgba(def.roofShadowHex);
    const foundationCol = hexToRgba('#475569');
    const outlineCol = hexToRgba('#0f172a');

    if (def.archetype === 'wooden_bridge') {
      return this.generateBridge(def, baseAndWallsBuffer, roofOverlayBuffer, tileTex);
    }

    if (def.archetype === 'cave_entrance') {
      return this.generateCaveMouth(def, baseAndWallsBuffer, roofOverlayBuffer, tileTex);
    }

    // 1. Cimientos de piedra en la base inferior y muros frontales/laterales (Perspectiva 3/4)
    const roofHeightPx = Math.floor(heightPx * 0.52);
    const wallTopY = Math.floor(heightPx * 0.36);
    const wallBottomY = heightPx - 2;
    const foundationH = Math.max(4, Math.floor(tileTex * 0.25));

    // Relleno de pared principal
    baseAndWallsBuffer.fillRect(2, wallTopY, widthPx - 4, wallBottomY - wallTopY, wallMain);
    // Zócalo / Cimiento inferior de piedra
    baseAndWallsBuffer.fillRect(
      2,
      wallBottomY - foundationH,
      widthPx - 4,
      foundationH,
      foundationCol
    );

    // Vigas estructurales verticales y horizontales (Timber frame o sillería)
    const beamThick = Math.max(2, Math.floor(profile.moduleSize * 0.5));
    baseAndWallsBuffer.fillRect(2, wallTopY, beamThick, wallBottomY - wallTopY, wallBeam);
    baseAndWallsBuffer.fillRect(
      widthPx - 2 - beamThick,
      wallTopY,
      beamThick,
      wallBottomY - wallTopY,
      wallBeam
    );
    baseAndWallsBuffer.fillRect(2, wallTopY, widthPx - 4, beamThick, wallBeam);

    // 2. Puerta funcional con estado abierto/cerrado verificable
    const doorCenterX = Math.floor((def.doorTileOffsetX + 0.5) * tileTex);
    const doorW = Math.floor(tileTex * 0.72);
    const doorH = Math.floor(tileTex * 1.15);
    const doorLeftX = doorCenterX - Math.floor(doorW / 2);
    const doorTopY = wallBottomY - doorH;

    // Marco de puerta
    baseAndWallsBuffer.fillRect(
      doorLeftX - 2,
      doorTopY - 2,
      doorW + 4,
      doorH + 2,
      wallBeam
    );

    if (isDoorOpen) {
      // Umbral interior oscuro transitable + hoja de puerta batida a la derecha
      baseAndWallsBuffer.fillRect(
        doorLeftX,
        doorTopY,
        doorW,
        doorH,
        hexToRgba('#090d16')
      );
      baseAndWallsBuffer.fillRect(
        doorLeftX + doorW,
        doorTopY,
        Math.max(3, Math.floor(doorW * 0.28)),
        doorH,
        hexToRgba('#78350f')
      );
    } else {
      // Hoja de madera cerrada con tablones y picaporte metálico
      baseAndWallsBuffer.fillRect(
        doorLeftX,
        doorTopY,
        doorW,
        doorH,
        hexToRgba('#92400e')
      );
      baseAndWallsBuffer.drawLine(
        doorCenterX,
        doorTopY,
        doorCenterX,
        wallBottomY - 1,
        hexToRgba('#451a03'),
        1
      );
      baseAndWallsBuffer.fillRect(
        doorLeftX + doorW - 4,
        doorTopY + Math.floor(doorH * 0.5),
        2,
        2,
        hexToRgba('#facc15')
      );
    }

    // 3. Ventanas integradas en la fachada
    const windowColor = interiorWindowLit ? hexToRgba('#fde047') : hexToRgba('#1e293b');
    const winSize = Math.floor(tileTex * 0.5);
    const winY = wallTopY + Math.floor((wallBottomY - wallTopY) * 0.28);

    if (def.windowCount >= 1) {
      const w1X = Math.floor(tileTex * 0.75);
      baseAndWallsBuffer.fillRect(w1X - 1, winY - 1, winSize + 2, winSize + 2, wallBeam);
      baseAndWallsBuffer.fillRect(w1X, winY, winSize, winSize, windowColor);
    }
    if (def.windowCount >= 2) {
      const w2X = widthPx - Math.floor(tileTex * 0.75) - winSize;
      baseAndWallsBuffer.fillRect(w2X - 1, winY - 1, winSize + 2, winSize + 2, wallBeam);
      baseAndWallsBuffer.fillRect(w2X, winY, winSize, winSize, windowColor);
    }

    baseAndWallsBuffer.applySelectiveOutline(outlineCol);

    // 4. Capa Independiente de Techo (`roofOverlayBuffer`) para oclusión dinámica
    for (let y = 2; y < roofHeightPx; y++) {
      const progress = y / roofHeightPx;
      const inset =
        def.roofStyle === 'stone_battlement'
          ? 2
          : Math.floor((1 - progress) * (tileTex * 0.45));
      const rowLeft = Math.max(1, inset);
      const rowRight = Math.min(widthPx - 1, widthPx - inset);

      const isRidge = y < 6;
      const isShingleRow = y % profile.moduleSize === 0;
      const tone = isRidge || isShingleRow ? roofShad : roofMain;

      roofOverlayBuffer.fillRect(rowLeft, y, rowRight - rowLeft, 1, tone);
    }

    // Chimenea en el techo
    if (def.hasChimney) {
      const chimX = widthPx - Math.floor(tileTex * 1.2);
      const chimW = Math.floor(tileTex * 0.45);
      const chimH = Math.floor(tileTex * 0.75);
      roofOverlayBuffer.fillRect(chimX, 1, chimW, chimH, foundationCol);
      roofOverlayBuffer.fillRect(chimX - 1, 1, chimW + 2, 3, hexToRgba('#1e293b'));
    }

    roofOverlayBuffer.applySelectiveOutline(outlineCol);

    // 5. Geometría lógica de colisiones (en unidades base 16 por tile)
    const totalLogicalW = def.widthInTiles * 16;
    const totalLogicalH = def.heightInTiles * 16;
    const doorLogicalX = def.doorTileOffsetX * 16;
    const doorLogicalW = 16;

    // Los muros bloquean todo el perímetro salvo el vano de la puerta cuando está abierta
    const wallCollisionRects: LogicalRect[] = [
      // Muro trasero/superior y laterales
      { x: 0, y: 0, width: totalLogicalW, height: totalLogicalH - 16 },
      // Muro frontal izquierdo (a la izquierda de la puerta)
      { x: 0, y: totalLogicalH - 16, width: doorLogicalX, height: 16 },
      // Muro frontal derecho (a la derecha de la puerta)
      {
        x: doorLogicalX + doorLogicalW,
        y: totalLogicalH - 16,
        width: totalLogicalW - (doorLogicalX + doorLogicalW),
        height: 16
      }
    ];

    const doorCollisionRect: LogicalRect = {
      x: doorLogicalX,
      y: totalLogicalH - 16,
      width: doorLogicalW,
      height: 16
    };

    const roofOcclusionFootprint: LogicalRect = {
      x: 0,
      y: 0,
      width: totalLogicalW,
      height: totalLogicalH - 8
    };

    return {
      structureId: def.structureId,
      baseAndWallsBuffer,
      roofOverlayBuffer,
      pivotTexel: [Math.floor(widthPx / 2), heightPx - 2],
      wallCollisionRects,
      doorCollisionRect,
      roofOcclusionFootprint
    };
  }

  private generateCaveMouth(
    def: StructureDefinition,
    baseBuf: PixelBuffer,
    roofBuf: PixelBuffer,
    tileTex: number
  ): RenderedStructureArtifact {
    const w = baseBuf.width;
    const h = baseBuf.height;
    const cx = Math.floor(w / 2);
    const bottomY = h - 2;

    const rockDark = hexToRgba('#1e293b');
    const rockMid = hexToRgba('#475569');
    const rockHigh = hexToRgba('#64748b');
    const voidBlack = hexToRgba('#050811');

    // Formación montañosa exterior
    baseBuf.fillEllipse(cx, Math.floor(h * 0.56), Math.floor(w * 0.45), Math.floor(h * 0.42), rockDark);
    baseBuf.fillEllipse(cx, Math.floor(h * 0.54), Math.floor(w * 0.42), Math.floor(h * 0.38), rockMid);
    baseBuf.fillEllipse(cx - 4, Math.floor(h * 0.42), Math.floor(w * 0.28), Math.floor(h * 0.2), rockHigh);

    // Arco de entrada a la cueva con escalones descendentes
    const archW = Math.floor(tileTex * 1.1);
    const archH = Math.floor(tileTex * 1.25);
    const archLeft = cx - Math.floor(archW / 2);
    const archTop = bottomY - archH;

    baseBuf.fillRect(archLeft, archTop, archW, archH, voidBlack);
    for (let s = 0; s < 3; s++) {
      baseBuf.fillRect(
        archLeft + 3,
        bottomY - (s + 1) * 3,
        archW - 6,
        2,
        hexToRgba('#334155')
      );
    }

    baseBuf.applySelectiveOutline(hexToRgba('#090d16'));

    // Cresta superior de roca en el buffer de techo
    roofBuf.fillEllipse(cx, Math.floor(h * 0.25), Math.floor(w * 0.35), Math.floor(h * 0.16), rockHigh);
    roofBuf.applySelectiveOutline(hexToRgba('#090d16'));

    const totalLogicalW = def.widthInTiles * 16;
    const totalLogicalH = def.heightInTiles * 16;

    return {
      structureId: def.structureId,
      baseAndWallsBuffer: baseBuf,
      roofOverlayBuffer: roofBuf,
      pivotTexel: [cx, bottomY],
      wallCollisionRects: [
        { x: 0, y: 0, width: 16, height: totalLogicalH },
        { x: totalLogicalW - 16, y: 0, width: 16, height: totalLogicalH }
      ],
      doorCollisionRect: { x: 16, y: totalLogicalH - 16, width: 32, height: 16 },
      roofOcclusionFootprint: { x: 0, y: 0, width: totalLogicalW, height: totalLogicalH - 12 }
    };
  }

  private generateBridge(
    def: StructureDefinition,
    baseBuf: PixelBuffer,
    roofBuf: PixelBuffer,
    tileTex: number
  ): RenderedStructureArtifact {
    const w = baseBuf.width;
    const h = baseBuf.height;
    const plankLight = hexToRgba('#a16207');
    const plankDark = hexToRgba('#713f12');
    const railCol = hexToRgba('#451a03');

    baseBuf.fillRect(0, 4, w, h - 8, plankLight);
    for (let x = 0; x < w; x += Math.max(4, Math.floor(tileTex / 4))) {
      baseBuf.drawLine(x, 4, x, h - 5, plankDark, 1);
    }
    // Barandillas superior e inferior
    baseBuf.fillRect(0, 2, w, 3, railCol);
    baseBuf.fillRect(0, h - 5, w, 3, railCol);

    return {
      structureId: def.structureId,
      baseAndWallsBuffer: baseBuf,
      roofOverlayBuffer: roofBuf,
      pivotTexel: [Math.floor(w / 2), Math.floor(h / 2)],
      wallCollisionRects: [],
      doorCollisionRect: { x: 0, y: 0, width: 0, height: 0 },
      roofOcclusionFootprint: { x: 0, y: 0, width: 0, height: 0 }
    };
  }
}
