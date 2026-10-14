import {
  ArtStyleProfile,
  LogicalRect,
  PPAE_SCHEMA_VERSION,
  RGBAColor,
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
    roofShadowHex: '#5c1111',
    hasDormerWindow: true,
    hasWindowShutters: true,
    hasFlowerBoxes: false,
    facadeTimberPattern: 'cross_braced'
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
    roofShadowHex: '#1e293b',
    hasDormerWindow: false,
    hasWindowShutters: true
  },
  thatched_peasant_hut_01: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'thatched_peasant_hut_01',
    archetype: 'cottage_house',
    wallMaterial: 'cobblestone',
    roofStyle: 'thatched_gable',
    widthInTiles: 5,
    heightInTiles: 4,
    hasChimney: true,
    windowCount: 2,
    doorTileOffsetX: 2,
    wallPrimaryHex: '#d6c7b2',
    wallSecondaryHex: '#57534e',
    roofPrimaryHex: '#eab308',
    roofShadowHex: '#a16207',
    hasDormerWindow: true
  },
  blue_slate_manor_01: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'blue_slate_manor_01',
    archetype: 'cottage_house',
    wallMaterial: 'timber_frame',
    roofStyle: 'steep_dormer_slate',
    widthInTiles: 5,
    heightInTiles: 4,
    hasChimney: true,
    windowCount: 2,
    doorTileOffsetX: 2,
    wallPrimaryHex: '#e7e5e4',
    wallSecondaryHex: '#5c3a21',
    roofPrimaryHex: '#1e3a8a',
    roofShadowHex: '#172554',
    hasDormerWindow: true,
    hasWindowShutters: true,
    hasFlowerBoxes: true,
    facadeTimberPattern: 'cross_braced'
  },
  farm_timber_barn_01: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'farm_timber_barn_01',
    archetype: 'farm_barn',
    wallMaterial: 'weatherboard_plank',
    roofStyle: 'gambrel_barn',
    widthInTiles: 6,
    heightInTiles: 4,
    hasChimney: false,
    windowCount: 2,
    doorTileOffsetX: 2,
    wallPrimaryHex: '#991b1b',
    wallSecondaryHex: '#f8fafc',
    roofPrimaryHex: '#475569',
    roofShadowHex: '#1e293b',
    hasDormerWindow: true
  },
  grain_windmill_01: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'grain_windmill_01',
    archetype: 'windmill',
    wallMaterial: 'cobblestone',
    roofStyle: 'conical_turret',
    widthInTiles: 5,
    heightInTiles: 5,
    hasChimney: false,
    windowCount: 1,
    doorTileOffsetX: 2,
    wallPrimaryHex: '#d6d3d1',
    wallSecondaryHex: '#57534e',
    roofPrimaryHex: '#78350f',
    roofShadowHex: '#451a03'
  },
  village_stone_well_01: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'village_stone_well_01',
    archetype: 'stone_well',
    wallMaterial: 'cobblestone',
    roofStyle: 'pitched_shingle',
    widthInTiles: 2,
    heightInTiles: 2,
    hasChimney: false,
    windowCount: 0,
    doorTileOffsetX: 0,
    wallPrimaryHex: '#64748b',
    wallSecondaryHex: '#451a03',
    roofPrimaryHex: '#78350f',
    roofShadowHex: '#451a03'
  },
  ancient_mossy_ruins_01: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    structureId: 'ancient_mossy_ruins_01',
    archetype: 'ancient_ruins',
    wallMaterial: 'ruined_masonry',
    roofStyle: 'none',
    widthInTiles: 5,
    heightInTiles: 4,
    hasChimney: false,
    windowCount: 1,
    doorTileOffsetX: 2,
    wallPrimaryHex: '#64748b',
    wallSecondaryHex: '#3f7d44',
    roofPrimaryHex: '#334155',
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

function shiftTone(c: RGBAColor, delta: number): RGBAColor {
  return {
    r: Math.max(0, Math.min(255, Math.round(c.r + delta))),
    g: Math.max(0, Math.min(255, Math.round(c.g + delta))),
    b: Math.max(0, Math.min(255, Math.round(c.b + delta))),
    a: c.a
  };
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
    const wallShadow = shiftTone(wallMain, -28);
    const wallHighlight = shiftTone(wallMain, 20);
    const wallBeam = hexToRgba(def.wallSecondaryHex);
    const roofMain = hexToRgba(def.roofPrimaryHex);
    const roofHigh = shiftTone(roofMain, 26);
    const roofShad = hexToRgba(def.roofShadowHex);
    const foundationCol = hexToRgba('#475569');
    const foundationDark = hexToRgba('#1e293b');
    const outlineCol = hexToRgba('#0f172a');

    if (def.archetype === 'wooden_bridge') {
      return this.generateBridge(def, baseAndWallsBuffer, roofOverlayBuffer, tileTex);
    }

    if (def.archetype === 'cave_entrance') {
      return this.generateCaveMouth(def, baseAndWallsBuffer, roofOverlayBuffer, tileTex);
    }

    if (def.archetype === 'windmill') {
      return this.generateWindmill(def, baseAndWallsBuffer, roofOverlayBuffer, tileTex, isDoorOpen, interiorWindowLit);
    }

    if (def.archetype === 'stone_well') {
      return this.generateStoneWell(def, baseAndWallsBuffer, roofOverlayBuffer, tileTex);
    }

    if (def.archetype === 'ancient_ruins') {
      return this.generateAncientRuins(def, baseAndWallsBuffer, roofOverlayBuffer, tileTex);
    }

    // 1. Cimientos de piedra en la base inferior y muros frontales/laterales (Perspectiva 3/4)
    const roofHeightPx = Math.floor(heightPx * 0.52);
    const wallTopY = Math.floor(heightPx * 0.36);
    const wallBottomY = heightPx - 2;
    const foundationH = Math.max(4, Math.floor(tileTex * 0.25));

    // 1A. Texturizado estructural de la fachada según `def.wallMaterial`
    this.renderWallSurfacePattern(
      baseAndWallsBuffer,
      def,
      2,
      wallTopY,
      widthPx - 4,
      wallBottomY - wallTopY,
      wallMain,
      wallShadow,
      wallHighlight,
      wallBeam,
      profile.moduleSize
    );

    // 1B. Zócalo / Cimiento inferior de mampostería de piedra
    for (let fy = wallBottomY - foundationH; fy < wallBottomY; fy++) {
      for (let fx = 2; fx < widthPx - 2; fx++) {
        const isMortar =
          fy === wallBottomY - foundationH ||
          ((fx + Math.floor(fy / 2) * 3) % Math.max(4, profile.moduleSize)) === 0;
        baseAndWallsBuffer.setPixel(
          fx,
          fy,
          isMortar ? foundationDark : foundationCol
        );
      }
    }

    // 2. Puerta funcional con estado abierto/cerrado verificable
    const doorCenterX = Math.floor((def.doorTileOffsetX + 0.5) * tileTex);
    const doorW = Math.floor(tileTex * 0.72);
    const doorH = Math.floor(tileTex * 1.15);
    const doorLeftX = doorCenterX - Math.floor(doorW / 2);
    const doorTopY = wallBottomY - doorH;

    // Marco de puerta arqueado de piedra / madera labrada
    baseAndWallsBuffer.fillRect(
      doorLeftX - 2,
      doorTopY - 2,
      doorW + 4,
      doorH + 2,
      wallBeam
    );
    // Dovelas superiores del arco de entrada
    for (let dx = -2; dx <= doorW + 1; dx += 2) {
      baseAndWallsBuffer.setPixel(doorLeftX + dx, doorTopY - 2, foundationCol);
    }

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
      for (let px = doorLeftX + 3; px < doorLeftX + doorW - 1; px += 3) {
        baseAndWallsBuffer.drawLine(
          px,
          doorTopY,
          px,
          wallBottomY - 1,
          hexToRgba('#451a03'),
          1
        );
      }
      // Herrajes horizontales de hierro y picaporte dorado
      baseAndWallsBuffer.fillRect(doorLeftX + 1, doorTopY + 3, 4, 1, foundationDark);
      baseAndWallsBuffer.fillRect(doorLeftX + 1, wallBottomY - 5, 4, 1, foundationDark);
      baseAndWallsBuffer.fillRect(
        doorLeftX + doorW - 4,
        doorTopY + Math.floor(doorH * 0.5),
        2,
        2,
        hexToRgba('#facc15')
      );
    }

    // 3. Ventanas con parteluz en cruz, contraventanas y jardineras opcionales
    const winSize = Math.floor(tileTex * 0.5);
    const winY = wallTopY + Math.floor((wallBottomY - wallTopY) * 0.28);

    if (def.windowCount >= 1) {
      const w1X = Math.floor(tileTex * 0.75);
      this.renderDetailedWindow(
        baseAndWallsBuffer,
        w1X,
        winY,
        winSize,
        interiorWindowLit,
        wallBeam,
        Boolean(def.hasWindowShutters),
        Boolean(def.hasFlowerBoxes)
      );
    }
    if (def.windowCount >= 2) {
      const w2X = widthPx - Math.floor(tileTex * 0.75) - winSize;
      this.renderDetailedWindow(
        baseAndWallsBuffer,
        w2X,
        winY,
        winSize,
        interiorWindowLit,
        wallBeam,
        Boolean(def.hasWindowShutters),
        Boolean(def.hasFlowerBoxes)
      );
    }

    baseAndWallsBuffer.applySelectiveOutline(outlineCol);

    // 4. Capa Independiente de Techo (`roofOverlayBuffer`) con morfología por estilo
    this.renderRoofOverlayByStyle(
      roofOverlayBuffer,
      def,
      widthPx,
      roofHeightPx,
      tileTex,
      profile.moduleSize,
      roofMain,
      roofHigh,
      roofShad,
      wallMain,
      wallBeam,
      foundationCol,
      interiorWindowLit
    );

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

  private renderWallSurfacePattern(
    buf: PixelBuffer,
    def: StructureDefinition,
    leftX: number,
    topY: number,
    wallW: number,
    wallH: number,
    wallMain: RGBAColor,
    wallShadow: RGBAColor,
    wallHighlight: RGBAColor,
    wallBeam: RGBAColor,
    moduleSize: number
  ): void {
    buf.fillRect(leftX, topY, wallW, wallH, wallMain);

    if (def.wallMaterial === 'cobblestone' || def.wallMaterial === 'ashlar_brick') {
      const courseH = Math.max(3, Math.floor(moduleSize * 0.75));
      const brickW = Math.max(5, Math.floor(moduleSize * 1.4));
      for (let y = topY; y < topY + wallH; y++) {
        const rowIdx = Math.floor((y - topY) / courseH);
        const isHorizJoint = (y - topY) % courseH === 0;
        const rowOffset = (rowIdx % 2) * Math.floor(brickW / 2);

        for (let x = leftX; x < leftX + wallW; x++) {
          const isVertJoint = (x - leftX + rowOffset) % brickW === 0;
          if (isHorizJoint || isVertJoint) {
            buf.setPixel(x, y, wallShadow);
          } else if (
            def.wallMaterial === 'cobblestone' &&
            ((x * 17 + rowIdx * 31) & 7) === 0
          ) {
            buf.setPixel(x, y, wallHighlight);
          }
        }
      }
    } else if (def.wallMaterial === 'weatherboard_plank') {
      const plankH = Math.max(3, Math.floor(moduleSize * 0.65));
      for (let y = topY; y < topY + wallH; y++) {
        if ((y - topY) % plankH === 0) {
          buf.fillRect(leftX, y, wallW, 1, wallShadow);
        } else if ((y - topY) % plankH === 1) {
          buf.fillRect(leftX, y, wallW, 1, wallHighlight);
        }
      }
    } else {
      // 'timber_frame': estuco con grano sutil
      for (let y = topY; y < topY + wallH; y += 2) {
        for (let x = leftX; x < leftX + wallW; x += 3) {
          if (((x * 13 + y * 29) & 7) === 0) {
            buf.setPixel(x, y, wallShadow);
          }
        }
      }
    }

    // Entramado estructural de vigas (esquineros, soleras y arriostramiento en cruz Tudor)
    const beamThick = Math.max(2, Math.floor(moduleSize * 0.45));
    buf.fillRect(leftX, topY, beamThick, wallH, wallBeam);
    buf.fillRect(leftX + wallW - beamThick, topY, beamThick, wallH, wallBeam);
    buf.fillRect(leftX, topY, wallW, beamThick, wallBeam);
    buf.fillRect(leftX, topY + Math.floor(wallH * 0.48), wallW, Math.max(1, beamThick - 1), wallBeam);

    if (def.wallMaterial === 'timber_frame' || def.archetype === 'farm_barn') {
      const bayW = Math.floor(wallW / 3);
      buf.fillRect(leftX + bayW, topY, beamThick, wallH, wallBeam);
      buf.fillRect(leftX + wallW - bayW - beamThick, topY, beamThick, wallH, wallBeam);

      if (def.facadeTimberPattern === 'cross_braced' || def.archetype === 'farm_barn') {
        const midY = topY + Math.floor(wallH * 0.48);
        buf.drawLine(leftX + beamThick, topY + beamThick, leftX + bayW, midY, wallBeam, 1);
        buf.drawLine(leftX + bayW, topY + beamThick, leftX + beamThick, midY, wallBeam, 1);
        buf.drawLine(
          leftX + wallW - bayW,
          topY + beamThick,
          leftX + wallW - beamThick - 1,
          midY,
          wallBeam,
          1
        );
        buf.drawLine(
          leftX + wallW - beamThick - 1,
          topY + beamThick,
          leftX + wallW - bayW,
          midY,
          wallBeam,
          1
        );
      }
    }
  }

  private renderDetailedWindow(
    buf: PixelBuffer,
    winX: number,
    winY: number,
    winSize: number,
    isLit: boolean,
    frameCol: RGBAColor,
    hasShutters: boolean,
    hasFlowerBox: boolean
  ): void {
    const paneCol = isLit ? hexToRgba('#fde047') : hexToRgba('#1e293b');
    const paneGlow = isLit ? hexToRgba('#fef9c3') : hexToRgba('#334155');
    const shutterCol = shiftTone(frameCol, -16);

    // Contraventanas laterales de madera
    if (hasShutters) {
      const shutW = Math.max(2, Math.floor(winSize * 0.32));
      buf.fillRect(winX - 1 - shutW, winY - 1, shutW, winSize + 2, shutterCol);
      buf.fillRect(winX + winSize + 1, winY - 1, shutW, winSize + 2, shutterCol);
    }

    // Marco principal y cristal con reflejo diagonal
    buf.fillRect(winX - 1, winY - 1, winSize + 2, winSize + 2, frameCol);
    buf.fillRect(winX, winY, winSize, winSize, paneCol);
    buf.setPixel(winX + 1, winY + 1, paneGlow);

    // Parteluz en cruz (mullions)
    const midOffset = Math.floor(winSize / 2);
    buf.fillRect(winX + midOffset, winY, 1, winSize, frameCol);
    buf.fillRect(winX, winY + midOffset, winSize, 1, frameCol);

    // Alféizar o jardinera con flores bajo la ventana
    if (hasFlowerBox) {
      buf.fillRect(winX - 2, winY + winSize + 1, winSize + 4, 2, hexToRgba('#78350f'));
      buf.fillRect(winX - 1, winY + winSize, winSize + 2, 1, hexToRgba('#22c55e'));
      buf.setPixel(winX + 1, winY + winSize, hexToRgba('#f43f5e'));
      buf.setPixel(winX + winSize - 2, winY + winSize, hexToRgba('#facc15'));
    } else {
      buf.fillRect(winX - 2, winY + winSize + 1, winSize + 4, 2, hexToRgba('#94a3b8'));
    }
  }

  private renderRoofOverlayByStyle(
    roofBuf: PixelBuffer,
    def: StructureDefinition,
    widthPx: number,
    roofHeightPx: number,
    tileTex: number,
    moduleSize: number,
    roofMain: RGBAColor,
    roofHigh: RGBAColor,
    roofShad: RGBAColor,
    wallMain: RGBAColor,
    wallBeam: RGBAColor,
    foundationCol: RGBAColor,
    interiorWindowLit: boolean
  ): void {
    // 1. Chimenea de mampostería con caperuza (detrás o integrada en el faldón del tejado)
    if (def.hasChimney) {
      const chimX = widthPx - Math.floor(tileTex * 1.15);
      const chimW = Math.max(5, Math.floor(tileTex * 0.44));
      const chimH = Math.floor(tileTex * 0.85);
      roofBuf.fillRect(chimX, 1, chimW, chimH, foundationCol);
      roofBuf.fillRect(chimX - 1, 1, chimW + 2, 3, hexToRgba('#1e293b'));
    }

    // 2. Superficie principal del techo según `def.roofStyle`
    for (let y = 2; y < roofHeightPx; y++) {
      const progress = (y - 2) / Math.max(1, roofHeightPx - 2);
      let inset = Math.floor((1 - progress) * (tileTex * 0.45));

      if (def.roofStyle === 'stone_battlement') {
        inset = 2;
      } else if (def.roofStyle === 'thatched_gable') {
        // Perfil abombado orgánico de paja gruesa
        inset = Math.max(0, Math.floor((1 - Math.pow(progress, 0.72)) * (tileTex * 0.52)));
      } else if (def.roofStyle === 'gambrel_barn') {
        inset =
          progress < 0.45
            ? Math.floor((1 - progress * 1.2) * (tileTex * 0.55))
            : Math.floor((1 - progress) * (tileTex * 0.25));
      } else if (def.roofStyle === 'conical_turret') {
        inset = Math.floor((1 - progress) * (widthPx * 0.36));
      }

      const rowLeft = Math.max(1, inset);
      const rowRight = Math.min(widthPx - 1, widthPx - inset);

      // Almenas recortadas en la parte superior para 'stone_battlement'
      if (def.roofStyle === 'stone_battlement' && y < 7) {
        const merlonW = Math.max(4, moduleSize);
        for (let x = rowLeft; x < rowRight; x++) {
          if (Math.floor(x / merlonW) % 2 === 0) {
            roofBuf.setPixel(x, y, y < 4 ? roofHigh : roofMain);
          }
        }
        continue;
      }

      const courseH = Math.max(3, Math.floor(moduleSize * 0.75));
      const shingleW = Math.max(3, Math.floor(moduleSize * 0.8));
      const courseIdx = Math.floor(y / courseH);
      const isCourseBottom = y % courseH === courseH - 1;

      for (let x = rowLeft; x < rowRight; x++) {
        let tone = roofMain;

        if (y < 5) {
          // Cumbrera superior (ridge cap)
          tone = y === 2 ? roofHigh : roofShad;
          if (def.roofStyle === 'thatched_gable' && x % (shingleW * 2) === 0) {
            tone = wallBeam; // Ataduras cruzadas en la cumbrera de paja
          }
        } else if (def.roofStyle === 'thatched_gable') {
          // Capas escalonadas de paja dorada con flecos verticales
          const thatchNotch = ((x * 17 + courseIdx * 11) & 3) === 0;
          tone = isCourseBottom && thatchNotch ? roofShad : y < roofHeightPx * 0.35 ? roofHigh : roofMain;
        } else {
          // Tejas escamadas ('pitched_shingle', 'steep_dormer_slate', 'gambrel_barn')
          const stagger = (courseIdx % 2) * Math.floor(shingleW / 2);
          const isTileJoint = (x + stagger) % shingleW === 0;
          if (isCourseBottom || isTileJoint) {
            tone = roofShad;
          } else if (y % courseH === 0 && ((x + courseIdx) & 1) === 0) {
            tone = roofHigh;
          }
        }

        // Vigas de hastial (bargeboards) en los extremos izquierdo y derecho del faldón
        if (
          def.roofStyle !== 'stone_battlement' &&
          (x <= rowLeft + 1 || x >= rowRight - 2)
        ) {
          tone = wallBeam;
        }

        roofBuf.setPixel(x, y, tone);
      }
    }

    // 3. Buhardilla o hastial frontal ('hasDormerWindow' o 'steep_dormer_slate')
    if (def.hasDormerWindow || def.roofStyle === 'steep_dormer_slate') {
      const dormerCenterX = Math.floor(widthPx / 2);
      const dormerHalfW = Math.max(5, Math.floor(tileTex * 0.48));
      const dormerTopY = Math.max(4, Math.floor(roofHeightPx * 0.22));
      const dormerBotY = roofHeightPx - 1;

      for (let y = dormerTopY; y <= dormerBotY; y++) {
        const t = (y - dormerTopY) / Math.max(1, dormerBotY - dormerTopY);
        const span = Math.max(2, Math.round(t * dormerHalfW));
        for (let dx = -span; dx <= span; dx++) {
          const px = dormerCenterX + dx;
          const isGableEdge = Math.abs(dx) >= span - 1;
          roofBuf.setPixel(px, y, isGableEdge ? wallBeam : wallMain);
        }
      }

      // Ventana integrada dentro de la buhardilla
      const dWinSize = Math.max(3, Math.floor(dormerHalfW * 0.7));
      const dWinX = dormerCenterX - Math.floor(dWinSize / 2);
      const dWinY = dormerBotY - dWinSize - 1;
      roofBuf.fillRect(dWinX - 1, dWinY - 1, dWinSize + 2, dWinSize + 2, wallBeam);
      roofBuf.fillRect(
        dWinX,
        dWinY,
        dWinSize,
        dWinSize,
        interiorWindowLit ? hexToRgba('#fde047') : hexToRgba('#1e293b')
      );
    }

    // 4. Aspas de molino de viento si el arquetipo es 'windmill'
    if (def.archetype === 'windmill') {
      const hubX = Math.floor(widthPx / 2);
      const hubY = Math.floor(roofHeightPx * 0.65);
      const bladeSpan = Math.floor(Math.min(widthPx, roofHeightPx * 1.6) * 0.44);
      const sailCol = hexToRgba('#fef3c7');
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1]
      ]) {
        roofBuf.drawLine(
          hubX,
          hubY,
          hubX + sx * bladeSpan,
          hubY + sy * bladeSpan,
          wallBeam,
          2
        );
        roofBuf.drawLine(
          hubX + sx * 3,
          hubY + sy * 2,
          hubX + sx * bladeSpan,
          hubY + sy * (bladeSpan - 2),
          sailCol,
          2
        );
      }
      roofBuf.fillEllipse(hubX, hubY, 2, 2, hexToRgba('#facc15'));
    }
  }


  private generateWindmill(
    def: StructureDefinition,
    baseBuf: PixelBuffer,
    roofBuf: PixelBuffer,
    tileTex: number,
    isDoorOpen: boolean,
    interiorWindowLit: boolean
  ): RenderedStructureArtifact {
    const w = baseBuf.width;
    const h = baseBuf.height;
    const cx = Math.floor(w / 2);
    const top = Math.floor(h * 0.27);
    const bottom = h - 3;
    const stone = hexToRgba(def.wallPrimaryHex);
    const mortar = shiftTone(stone, -40);
    const highlight = shiftTone(stone, 24);
    const shade = shiftTone(stone, -19);
    const wood = hexToRgba(def.wallSecondaryHex);
    const course = Math.max(4, Math.floor(tileTex * 0.22));
    const brick = Math.max(5, Math.floor(tileTex * 0.42));

    // Tapered masonry tower: independent native-size geometry, never a roofed cottage.
    for (let y = top; y <= bottom; y++) {
      const taper = (y - top) / Math.max(1, bottom - top);
      const half = Math.round(tileTex * (0.67 + taper * 0.45));
      const left = cx - half;
      const right = cx + half;
      baseBuf.fillRect(left, y, right - left + 1, 1, stone);
      baseBuf.fillRect(left, y, Math.max(2, Math.floor(half * 0.22)), 1, shade);
      baseBuf.setPixel(right, y, mortar);
      if ((y - top) % course === 0) {
        baseBuf.fillRect(left + 2, y, right - left - 3, 1, mortar);
      } else {
        const row = Math.floor((y - top) / course);
        const shift = (row % 2) * Math.floor(brick / 2);
        for (let x = left + 3; x < right - 2; x++) {
          if ((x + shift) % brick === 0) baseBuf.setPixel(x, y, mortar);
          else if ((x * 13 + y * 7) % 31 === 0) baseBuf.setPixel(x, y, highlight);
        }
      }
    }
    // Elevated narrow window and a real door controlled by the original open/close argument.
    const winX = cx - Math.max(2, Math.floor(tileTex * 0.17));
    const winY = top + Math.floor((bottom - top) * 0.33);
    const winW = Math.max(5, Math.floor(tileTex * 0.34));
    baseBuf.fillRect(winX - 2, winY - 2, winW + 4, Math.floor(tileTex * 0.53), wood);
    baseBuf.fillRect(winX, winY, winW, Math.floor(tileTex * 0.37),
      interiorWindowLit ? hexToRgba('#fde68a') : hexToRgba('#1e293b'));
    baseBuf.drawLine(cx, winY, cx, winY + Math.floor(tileTex * 0.37), wood, 1);
    const doorW = Math.max(8, Math.floor(tileTex * 0.61));
    const doorH = Math.max(12, Math.floor(tileTex * 0.97));
    const doorX = cx - Math.floor(doorW / 2);
    const doorY = bottom - doorH + 1;
    baseBuf.fillRect(doorX - 2, doorY - 2, doorW + 4, doorH + 2, mortar);
    baseBuf.fillRect(doorX, doorY, doorW, doorH,
      isDoorOpen ? hexToRgba('#090d16') : hexToRgba('#7c3f1e'));
    if (!isDoorOpen) {
      for (let x = doorX + 3; x < doorX + doorW; x += Math.max(3, Math.floor(tileTex / 6))) {
        baseBuf.drawLine(x, doorY, x, bottom, wood, 1);
      }
      baseBuf.fillRect(doorX + doorW - 4, doorY + Math.floor(doorH / 2), 2, 2, hexToRgba('#facc15'));
    }
    baseBuf.fillRect(cx - Math.round(tileTex * 1.13), bottom - 2,
      Math.round(tileTex * 2.26), 3, mortar);
    baseBuf.applySelectiveOutline(hexToRgba('#0f172a'));

    // Independent conical cap and four cloth lattice sails in the occludable roof layer.
    const roofBottom = top + Math.floor(tileTex * 0.37);
    const roofTip = Math.max(3, top - Math.floor(tileTex * 0.86));
    const roofPrimary = hexToRgba(def.roofPrimaryHex);
    const roofShadow = hexToRgba(def.roofShadowHex);
    for (let y = roofTip; y <= roofBottom; y++) {
      const t = (y - roofTip) / Math.max(1, roofBottom - roofTip);
      const half = Math.max(1, Math.round(t * tileTex * 0.86));
      roofBuf.fillRect(cx - half, y, half * 2 + 1, 1, y % course === 0 ? roofShadow : roofPrimary);
      roofBuf.setPixel(cx - half, y, wood);
      roofBuf.setPixel(cx + half, y, roofShadow);
    }
    const hubX = cx;
    const hubY = Math.floor(h * 0.41);
    const bladeLength = Math.floor(Math.min(w, h) * 0.31);
    const sailColor = hexToRgba('#f7edd0');
    const sailShadow = hexToRgba('#c9b995');
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const endX = hubX + dx * bladeLength;
      const endY = hubY + dy * bladeLength;
      roofBuf.drawLine(hubX, hubY, endX, endY, wood, Math.max(2, Math.floor(tileTex / 12)));
      // The sail spreads perpendicular to each timber spar, with discrete cloth ribs.
      const perpX = -dy;
      const perpY = dx;
      const sailWidth = Math.max(5, Math.floor(tileTex * 0.36));
      roofBuf.drawLine(hubX + dx * 9 + perpX * sailWidth, hubY + dy * 9 + perpY * sailWidth,
        endX + perpX * sailWidth, endY + perpY * sailWidth, wood, 1);
      for (let step = 9; step <= bladeLength - 2; step += Math.max(2, Math.floor(tileTex / 7))) {
        const px = hubX + dx * step;
        const py = hubY + dy * step;
        roofBuf.drawLine(px, py, px + perpX * sailWidth, py + perpY * sailWidth, sailColor, 2);
        roofBuf.setPixel(px + perpX * sailWidth, py + perpY * sailWidth, sailShadow);
      }
    }
    roofBuf.fillEllipse(hubX, hubY, 3, 3, wood);
    roofBuf.fillEllipse(hubX, hubY, 1, 1, hexToRgba('#facc15'));
    roofBuf.applySelectiveOutline(hexToRgba('#0f172a'));

    const logicalW = def.widthInTiles * 16;
    const logicalH = def.heightInTiles * 16;
    const doorXLogical = def.doorTileOffsetX * 16;
    return {
      structureId: def.structureId,
      baseAndWallsBuffer: baseBuf,
      roofOverlayBuffer: roofBuf,
      pivotTexel: [cx, bottom],
      wallCollisionRects: [
        { x: 0, y: 0, width: logicalW, height: logicalH - 16 },
        { x: 0, y: logicalH - 16, width: doorXLogical, height: 16 },
        { x: doorXLogical + 16, y: logicalH - 16,
          width: logicalW - doorXLogical - 16, height: 16 }
      ],
      doorCollisionRect: { x: doorXLogical, y: logicalH - 16, width: 16, height: 16 },
      roofOcclusionFootprint: { x: 0, y: 0, width: logicalW, height: logicalH - 8 }
    };
  }

  private generateStoneWell(
    def: StructureDefinition,
    baseBuf: PixelBuffer,
    roofBuf: PixelBuffer,
    tileTex: number
  ): RenderedStructureArtifact {
    const w = baseBuf.width;
    const h = baseBuf.height;
    const cx = Math.floor(w / 2);
    const bottomY = h - 3;

    const stoneDark = hexToRgba('#334155');
    const stoneMid = hexToRgba('#64748b');
    const stoneHigh = hexToRgba('#94a3b8');
    const waterCol = hexToRgba('#0284c7');
    const woodCol = hexToRgba(def.wallSecondaryHex);
    const roofMain = hexToRgba(def.roofPrimaryHex);
    const roofShad = hexToRgba(def.roofShadowHex);

    const wellRx = Math.max(5, Math.floor(w * 0.36));
    const wellRy = Math.max(3, Math.floor(tileTex * 0.28));
    const rimY = bottomY - Math.floor(tileTex * 0.38);

    // Cilindro de mampostería del brocal y agua interior
    baseBuf.fillRect(cx - wellRx, rimY, wellRx * 2 + 1, bottomY - rimY, stoneMid);
    baseBuf.fillEllipse(cx, bottomY, wellRx, wellRy, stoneDark);
    baseBuf.fillEllipse(cx, rimY, wellRx, wellRy, stoneHigh);
    baseBuf.fillEllipse(cx, rimY, Math.max(2, wellRx - 2), Math.max(1, wellRy - 1), waterCol);

    // Postes laterales de madera y torno con cuerda
    const postTopY = Math.floor(h * 0.25);
    baseBuf.fillRect(cx - wellRx + 1, postTopY, 2, rimY - postTopY, woodCol);
    baseBuf.fillRect(cx + wellRx - 2, postTopY, 2, rimY - postTopY, woodCol);
    baseBuf.drawLine(cx, postTopY + 2, cx, rimY, hexToRgba('#d6c7b2'), 1);
    baseBuf.applySelectiveOutline(hexToRgba('#090d16'));

    // Tejadillo protector en el buffer de techo
    for (let y = 2; y <= postTopY + 2; y++) {
      const progress = (y - 2) / Math.max(1, postTopY);
      const span = Math.max(2, Math.round(progress * (wellRx + 2)));
      roofBuf.fillRect(cx - span, y, span * 2 + 1, 1, y % 2 === 0 ? roofMain : roofShad);
    }
    roofBuf.applySelectiveOutline(hexToRgba('#090d16'));

    return {
      structureId: def.structureId,
      baseAndWallsBuffer: baseBuf,
      roofOverlayBuffer: roofBuf,
      pivotTexel: [cx, bottomY],
      wallCollisionRects: [
        { x: 2, y: 8, width: def.widthInTiles * 16 - 4, height: def.heightInTiles * 16 - 10 }
      ],
      doorCollisionRect: { x: 0, y: 0, width: 0, height: 0 },
      roofOcclusionFootprint: { x: 0, y: 0, width: def.widthInTiles * 16, height: 16 }
    };
  }


  private generateAncientRuins(
    def: StructureDefinition,
    baseBuf: PixelBuffer,
    roofBuf: PixelBuffer,
    tileTex: number
  ): RenderedStructureArtifact {
    const w = baseBuf.width;
    const h = baseBuf.height;
    const cx = Math.floor(w / 2);
    const bottom = h - 2;
    const blockSize = Math.max(4, Math.floor(tileTex * 0.23));
    const courseSize = Math.max(3, Math.floor(tileTex * 0.19));
    const gapHalf = Math.max(8, Math.floor(tileTex * 0.53));
    const stone = hexToRgba(def.wallPrimaryHex);
    const shadow = shiftTone(stone, -41);
    const highlight = shiftTone(stone, 30);
    const moss = hexToRgba(def.wallSecondaryHex);
    const mossDark = shiftTone(moss, -29);

    // Collapsed gatehouse walls: broad stepped masonry with a genuine central break.
    for (let x = 3; x < w - 3; x++) {
      if (Math.abs(x - cx) < gapHalf) continue;
      const segment = Math.floor(x / blockSize);
      const noise = ((segment * 73 + segment * segment * 19) >>> 0) % (blockSize * 3);
      const nearGap = Math.max(0, 1 - (Math.abs(x - cx) - gapHalf) / Math.max(1, w * 0.23));
      const top = Math.floor(h * 0.25 + noise + nearGap * h * 0.31);
      if (top >= bottom) continue;
      for (let y = top; y < bottom; y++) {
        const row = Math.floor(y / courseSize);
        const offset = row % 2 ? Math.floor(blockSize / 2) : 0;
        const joint = y % courseSize === 0 || (x + offset) % blockSize === 0;
        let tone = joint ? shadow : stone;
        if (!joint && ((x * 7 + y * 13) % 29) === 0) tone = highlight;
        baseBuf.setPixel(x, y, tone);
      }
      baseBuf.setPixel(x, top, moss);
      if ((segment % 3) === 0) {
        baseBuf.fillRect(x, top + 1, 1, 2, mossDark);
      }
    }
    // Pillar remnants with chipped tops and cracked lintel stones.
    for (const side of [-1, 1]) {
      const bx = cx + side * Math.floor(w * 0.34);
      const by = Math.floor(h * 0.39);
      baseBuf.fillRect(bx - 3, by, 7, bottom - by, stone);
      baseBuf.fillRect(bx - 4, by + 3, 9, 2, shadow);
      baseBuf.fillRect(bx - 2, by + 6, 1, bottom - by - 6, highlight);
      baseBuf.fillRect(bx - 4, by - 2, 6, 2, moss);
      baseBuf.drawLine(bx, by + Math.floor(tileTex * 0.45),
        bx + side * 2, by + Math.floor(tileTex * 0.85), shadow, 1);
    }
    // Fallen masonry rubble in front of the gate; no artificial sinusoidal roof.
    for (let i = 0; i < 17; i++) {
      const hash = (i * 101 + i * i * 17) % (w - 12);
      const x = 6 + hash;
      const y = bottom - 1 - ((i * 19) % Math.max(4, Math.floor(tileTex * 0.45)));
      const size = 2 + (i % Math.max(2, Math.floor(tileTex * 0.12)));
      baseBuf.fillRect(x, y, size + 2, Math.max(2, Math.floor(size / 2)), i % 3 === 0 ? shadow : stone);
      baseBuf.fillRect(x, y, Math.max(1, Math.floor(size / 2)), 1, highlight);
      if (i % 4 === 0) baseBuf.setPixel(x, y - 1, moss);
    }
    baseBuf.applySelectiveOutline(hexToRgba('#0f172a'));

    const totalLogicalW = def.widthInTiles * 16;
    const totalLogicalH = def.heightInTiles * 16;
    return {
      structureId: def.structureId,
      baseAndWallsBuffer: baseBuf,
      roofOverlayBuffer: roofBuf,
      pivotTexel: [cx, bottom],
      wallCollisionRects: [
        { x: 0, y: totalLogicalH - 16, width: 24, height: 16 },
        { x: totalLogicalW - 24, y: totalLogicalH - 16, width: 24, height: 16 }
      ],
      doorCollisionRect: {
        x: 24, y: totalLogicalH - 16, width: totalLogicalW - 48, height: 16
      },
      roofOcclusionFootprint: { x: 0, y: 0, width: 0, height: 0 }
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

