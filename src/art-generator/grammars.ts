import {
  AnchorPoint,
  ArtStyleProfile,
  PaletteDefinition,
  ProceduralAssetDefinition
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export interface GrammarOutput {
  readonly buffer: PixelBuffer;
  readonly anchors: Record<string, AnchorPoint>;
}

/**
 * Patrones modulares discretos 4x4 y 6x6 para clusters de hojas y texturas minerales
 */
const LEAF_CLUSTER_4X4: readonly number[][] = [
  [0, 3, 3, 0],
  [3, 3, 2, 2],
  [2, 2, 2, 1],
  [0, 1, 1, 0]
];

const LEAF_CLUSTER_6X6: readonly number[][] = [
  [0, 0, 3, 3, 0, 0],
  [0, 3, 3, 3, 2, 0],
  [3, 3, 2, 2, 2, 2],
  [2, 2, 2, 2, 1, 1],
  [0, 2, 1, 1, 1, 0],
  [0, 0, 1, 1, 0, 0]
];

export class ProceduralGrammarExecutor {
  public execute(
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG,
    stateTag: 'intact' | 'damaged' | 'snowy' | 'wind_sway' = 'intact'
  ): GrammarOutput {
    const texelWidth = def.widthInModules * profile.moduleSize;
    const texelHeight = def.heightInModules * profile.moduleSize;
    const buffer = new PixelBuffer(texelWidth, texelHeight);

    switch (def.category) {
      case 'tree':
        return this.generateTree(buffer, def, profile, palette, rng, stateTag);
      case 'mineral_rock':
        return this.generateMineralRock(buffer, def, profile, palette, rng, stateTag);
      case 'bush_flora':
        return this.generateBushFlora(buffer, def, profile, palette, rng, stateTag);
      case 'weapon_blade':
        return this.generateWeaponBlade(buffer, def, profile, palette, rng);
      default:
        return this.generateTree(buffer, def, profile, palette, rng, stateTag);
    }
  }

  /**
   * Gramática de Árboles:
   * 1. Genera tronco cónico con raíces ensanchadas en la base y sombreado lateral 3/4.
   * 2. Genera clusters de copa jerárquicos alineados a la granularidad 4x4 o 6x6.
   * 3. Aplica iluminación cenital-noroeste por bandas discretas y estado climático (nieve/viento).
   */
  private generateTree(
    buffer: PixelBuffer,
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG,
    stateTag: 'intact' | 'damaged' | 'snowy' | 'wind_sway'
  ): GrammarOutput {
    const foliageRamp = palette.ramps[def.primaryRampId] ?? palette.ramps.foliage;
    const woodRamp = palette.ramps[def.secondaryRampId] ?? palette.ramps.wood;
    const accentRamp = def.accentRampId ? palette.ramps[def.accentRampId] : undefined;

    const w = buffer.width;
    const h = buffer.height;
    const centerX = Math.floor(w / 2);
    const baseY = h - 2;
    const windShift = stateTag === 'wind_sway' ? Math.max(1, Math.floor(profile.moduleSize / 2)) : 0;

    // 1. Tronco y raíces
    const trunkHeight = Math.floor(h * rng.nextRange(0.38, 0.48));
    const trunkBaseRadius = Math.max(2, Math.floor(w * 0.11));
    const canopyCenterY = h - trunkHeight - Math.floor(h * 0.18);

    for (let y = canopyCenterY; y <= baseY; y++) {
      const progress = (y - canopyCenterY) / Math.max(1, baseY - canopyCenterY);
      const flare = progress > 0.78 ? Math.ceil((progress - 0.78) * 8) : 0;
      const halfWidth = trunkBaseRadius + flare;
      const swayOffset = Math.round((1 - progress) * windShift * 0.5);

      for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const px = centerX + dx + swayOffset;
        const tone =
          dx < -halfWidth * 0.25
            ? woodRamp.highlight
            : dx > halfWidth * 0.3
            ? woodRamp.shadow
            : woodRamp.midtone;
        buffer.setPixel(px, y, tone);
      }
    }

    // 2. Copa por elipses jerárquicas + estampado de módulos 4x4 o 6x6
    const isPine = def.archetype === 'pine_conifer';
    const clusterCount = isPine ? 4 : rng.nextInt(5, 7);

    for (let i = 0; i < clusterCount; i++) {
      const ratio = i / clusterCount;
      const cx = isPine
        ? centerX + windShift
        : centerX + rng.nextInt(-Math.floor(w * 0.22), Math.floor(w * 0.22)) + windShift;
      const cy = isPine
        ? Math.floor(h * 0.2 + ratio * (h * 0.42))
        : canopyCenterY + rng.nextInt(-Math.floor(h * 0.22), Math.floor(h * 0.08));

      const rx = isPine
        ? Math.floor(w * (0.16 + ratio * 0.22))
        : Math.floor(w * rng.nextRange(0.2, 0.28));
      const ry = isPine
        ? Math.max(3, Math.floor(h * 0.11))
        : Math.floor(h * rng.nextRange(0.16, 0.22));

      // Banda de sombra inferior, medio tono central, brillo superior-izquierdo
      buffer.fillEllipse(cx, cy + 1, rx, ry, foliageRamp.shadow);
      buffer.fillEllipse(cx, cy, rx, ry - 1, foliageRamp.midtone);
      buffer.fillEllipse(
        cx - Math.max(1, Math.floor(rx * 0.2)),
        cy - Math.max(1, Math.floor(ry * 0.25)),
        Math.max(2, Math.floor(rx * 0.65)),
        Math.max(2, Math.floor(ry * 0.6)),
        foliageRamp.highlight
      );
    }

    // 3. Estampado de micro-clusters 4x4 o 6x6 para reforzar la textura modular
    const pattern = profile.moduleSize === 4 ? LEAF_CLUSTER_4X4 : LEAF_CLUSTER_6X6;
    const moduleMap = {
      1: foliageRamp.shadow,
      2: foliageRamp.midtone,
      3: stateTag === 'snowy' ? hexToRgba('#eef6fa') : foliageRamp.highlight
    };

    const gridCols = def.widthInModules;
    const gridRows = Math.floor(def.heightInModules * 0.65);
    for (let gy = 1; gy < gridRows; gy++) {
      for (let gx = 1; gx < gridCols - 1; gx++) {
        const sampleX = gx * profile.moduleSize + Math.floor(profile.moduleSize / 2);
        const sampleY = gy * profile.moduleSize + Math.floor(profile.moduleSize / 2);
        if (buffer.isOpaque(sampleX, sampleY) && rng.chance(0.45)) {
          buffer.stampModulePattern(gx, gy, profile.moduleSize, pattern, moduleMap);
        }
      }
    }

    // 4. Frutos o flores opcionales
    if (accentRamp && stateTag !== 'damaged') {
      const fruitCount = rng.nextInt(4, 7);
      for (let f = 0; f < fruitCount; f++) {
        const fx = centerX + rng.nextInt(-Math.floor(w * 0.26), Math.floor(w * 0.26));
        const fy = canopyCenterY + rng.nextInt(-Math.floor(h * 0.18), Math.floor(h * 0.08));
        if (buffer.isOpaque(fx, fy)) {
          buffer.fillRect(fx, fy, 2, 2, accentRamp.midtone);
          buffer.setPixel(fx, fy, accentRamp.highlight);
        }
      }
    }

    if (profile.outlineMode !== 'none') {
      buffer.applySelectiveOutline(foliageRamp.outline);
    }

    return {
      buffer,
      anchors: {
        base_pivot: {
          id: 'base_pivot',
          texelX: centerX,
          texelY: baseY,
          normalizedX: centerX / w,
          normalizedY: baseY / h
        },
        canopy_center: {
          id: 'canopy_center',
          texelX: centerX + windShift,
          texelY: canopyCenterY,
          normalizedX: (centerX + windShift) / w,
          normalizedY: canopyCenterY / h
        }
      }
    };
  }

  /**
   * Gramática de Rocas y Vetas Minerales:
   * Construye facetas poligonales discretas y vetas cristalinas incrustadas.
   */
  private generateMineralRock(
    buffer: PixelBuffer,
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG,
    stateTag: 'intact' | 'damaged' | 'snowy' | 'wind_sway'
  ): GrammarOutput {
    const stoneRamp = palette.ramps[def.primaryRampId] ?? palette.ramps.stone;
    const crystalRamp = palette.ramps[def.secondaryRampId] ?? palette.ramps.mineral_crystal;

    const w = buffer.width;
    const h = buffer.height;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h * 0.62);
    const rx = Math.floor(w * 0.36);
    const ry = Math.floor(h * 0.28);

    // Bloque rocoso facetado por niveles de sombra
    buffer.fillEllipse(cx, cy + 1, rx, ry, stoneRamp.shadow);
    buffer.fillEllipse(cx, cy - 1, rx - 1, ry - 1, stoneRamp.midtone);
    buffer.fillRect(cx - Math.floor(rx * 0.5), cy - ry + 1, Math.floor(rx * 0.8), Math.floor(ry * 0.6), stoneRamp.highlight);

    // Incrustaciones de cristales / vetas minerales según semilla
    const crystalCount = stateTag === 'damaged' ? 2 : rng.nextInt(3, 6);
    for (let i = 0; i < crystalCount; i++) {
      const vx = cx + rng.nextInt(-Math.floor(rx * 0.65), Math.floor(rx * 0.65));
      const vy = cy + rng.nextInt(-Math.floor(ry * 0.55), Math.floor(ry * 0.25));
      const spireH = rng.nextInt(3, Math.max(4, profile.moduleSize + 1));
      buffer.drawLine(vx, vy, vx + rng.nextInt(-2, 2), vy - spireH, crystalRamp.midtone, 2);
      buffer.setPixel(vx, vy - spireH, crystalRamp.accent);
      buffer.setPixel(vx - 1, vy - spireH + 1, crystalRamp.highlight);
    }

    if (profile.outlineMode !== 'none') {
      buffer.applySelectiveOutline(stoneRamp.outline);
    }

    return {
      buffer,
      anchors: {
        base_pivot: {
          id: 'base_pivot',
          texelX: cx,
          texelY: cy + ry,
          normalizedX: cx / w,
          normalizedY: (cy + ry) / h
        }
      }
    };
  }

  /**
   * Gramática de Arbustos y Flora:
   * Clusters redondeados bajos con distribución de flores/bayas de alto contraste.
   */
  private generateBushFlora(
    buffer: PixelBuffer,
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG,
    stateTag: 'intact' | 'damaged' | 'snowy' | 'wind_sway'
  ): GrammarOutput {
    const foliageRamp = palette.ramps[def.primaryRampId] ?? palette.ramps.foliage;
    const berryRamp = palette.ramps[def.secondaryRampId] ?? palette.ramps.berry_accent;

    const w = buffer.width;
    const h = buffer.height;
    const cx = Math.floor(w / 2);
    const baseY = h - 2;

    const lobes = 3;
    for (let i = 0; i < lobes; i++) {
      const offsetX = (i - 1) * Math.floor(w * 0.16);
      const lx = cx + offsetX;
      const ly = Math.floor(h * 0.58) - (i === 1 ? 2 : 0);
      const rx = Math.floor(w * 0.22);
      const ry = Math.floor(h * 0.24);

      buffer.fillEllipse(lx, ly + 1, rx, ry, foliageRamp.shadow);
      buffer.fillEllipse(lx, ly, rx - 1, ry - 1, foliageRamp.midtone);
      buffer.fillEllipse(
        lx - 1,
        ly - 2,
        Math.max(2, Math.floor(rx * 0.55)),
        Math.max(2, Math.floor(ry * 0.5)),
        stateTag === 'snowy' ? hexToRgba('#eef6fa') : foliageRamp.highlight
      );
    }

    // Bayas/flores con distancia mínima
    const berries = rng.nextInt(4, 7);
    for (let b = 0; b < berries; b++) {
      const bx = cx + rng.nextInt(-Math.floor(w * 0.28), Math.floor(w * 0.28));
      const by = Math.floor(h * 0.45) + rng.nextInt(-3, 4);
      if (buffer.isOpaque(bx, by)) {
        buffer.setPixel(bx, by, berryRamp.midtone);
        buffer.setPixel(bx, by - 1, berryRamp.highlight);
      }
    }

    if (profile.outlineMode !== 'none') {
      buffer.applySelectiveOutline(foliageRamp.outline);
    }

    return {
      buffer,
      anchors: {
        base_pivot: {
          id: 'base_pivot',
          texelX: cx,
          texelY: baseY,
          normalizedX: cx / w,
          normalizedY: baseY / h
        }
      }
    };
  }

  /**
   * Gramática de Armas y Herramientas (Espada / Hoja):
   * Genera pomo, empuñadura, guarda simétrica y hoja biselada con punto de anclaje de mano.
   */
  private generateWeaponBlade(
    buffer: PixelBuffer,
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG
  ): GrammarOutput {
    const bladeRamp = palette.ramps[def.primaryRampId] ?? palette.ramps.mineral_crystal;
    const hiltRamp = palette.ramps[def.secondaryRampId] ?? palette.ramps.wood;

    const w = buffer.width;
    const h = buffer.height;
    const cx = Math.floor(w / 2);

    const tipY = 2;
    const guardY = Math.floor(h * 0.72);
    const pommelY = h - 3;
    const bladeHalfWidth = Math.max(1, Math.floor(profile.moduleSize * 0.35));

    // Hoja con bisel izquierdo iluminado y derecho sombreado
    for (let y = tipY; y < guardY; y++) {
      const taper = y < tipY + 4 ? Math.max(0, y - tipY) : bladeHalfWidth;
      for (let dx = -taper; dx <= taper; dx++) {
        const tone =
          dx < 0 ? bladeRamp.highlight : dx === 0 ? bladeRamp.accent : bladeRamp.midtone;
        buffer.setPixel(cx + dx, y, tone);
      }
    }

    // Guarda cruzada
    const guardHalfSpan = Math.max(3, bladeHalfWidth + rng.nextInt(2, 4));
    buffer.fillRect(cx - guardHalfSpan, guardY, guardHalfSpan * 2 + 1, 2, hiltRamp.highlight);

    // Empuñadura y pomo
    buffer.fillRect(cx - 1, guardY + 2, 3, Math.max(2, pommelY - guardY - 2), hiltRamp.midtone);
    buffer.fillRect(cx - 2, pommelY, 5, 2, bladeRamp.midtone);

    if (profile.outlineMode !== 'none') {
      buffer.applySelectiveOutline(bladeRamp.outline);
    }

    const gripY = guardY + 3;
    return {
      buffer,
      anchors: {
        grip_anchor: {
          id: 'grip_anchor',
          texelX: cx,
          texelY: gripY,
          normalizedX: cx / w,
          normalizedY: gripY / h
        },
        blade_tip: {
          id: 'blade_tip',
          texelX: cx,
          texelY: tipY,
          normalizedX: cx / w,
          normalizedY: tipY / h
        }
      }
    };
  }
}
