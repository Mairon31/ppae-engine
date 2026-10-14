import {
  AnchorPoint,
  ArtStyleProfile,
  PaletteDefinition,
  ProceduralAssetDefinition,
  RGBAColor,
  BotanicalFamilyId,
  TreeSpeciesDefinition
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba, rgbaToHex } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { BOTANICAL_SPECIES_DEFINITIONS, TreeMorphologyResolver } from '../vegetation/tree-morphology';
import { TreeSkeletonRasterizer } from '../vegetation/tree-skeleton-rasterizer';
import { TreeCanopyFoliageRasterizer } from '../vegetation/tree-foliage-rasterizer';

export interface GrammarOutput {
  readonly buffer: PixelBuffer;
  readonly anchors: Record<string, AnchorPoint>;
}

export class ProceduralGrammarExecutor {
  private readonly morphologyResolver = new TreeMorphologyResolver();
  private readonly skeletonRasterizer = new TreeSkeletonRasterizer();
  private readonly foliageRasterizer = new TreeCanopyFoliageRasterizer();
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
   * Grammar trees now use the same morphology, wood and foliage synthesis as
   * world vegetation. The final nearest-neighbor fit preserves the catalogue
   * definition's exact dimensions and maps every pixel to its palette ramps.
   * No legacy cones, independent ellipse canopies or new colors are introduced.
   */
  private generateTree(
    buffer: PixelBuffer,
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG,
    stateTag: 'intact' | 'damaged' | 'snowy' | 'wind_sway'
  ): GrammarOutput {
    const foliage = palette.ramps[def.primaryRampId] ?? palette.ramps.foliage;
    const wood = palette.ramps[def.secondaryRampId] ?? palette.ramps.wood;
    const accent = def.accentRampId ? palette.ramps[def.accentRampId] : undefined;
    const botanicalIds = Object.keys(BOTANICAL_SPECIES_DEFINITIONS) as BotanicalFamilyId[];
    const family: BotanicalFamilyId = botanicalIds.includes(def.archetype as BotanicalFamilyId)
      ? def.archetype as BotanicalFamilyId
      : def.archetype === 'pine_conifer' || def.id.startsWith('pine_')
        ? 'pine' : 'oak';
    const baseSpecies = BOTANICAL_SPECIES_DEFINITIONS[family];
    // Use the palette ramp itself at source resolution: no hand-tuned color
    // changes can escape the final declared PaletteDefinition color budget.
    const styleColors: TreeSpeciesDefinition = {
      ...baseSpecies,
      woodColors: {
        outline: rgbaToHex(wood.outline),
        shadow: rgbaToHex(wood.shadow),
        midtone: rgbaToHex(wood.midtone),
        highlight: rgbaToHex(wood.highlight)
      },
      foliageColors: {
        outline: rgbaToHex(foliage.outline),
        shadow: rgbaToHex(foliage.shadow),
        midtone: rgbaToHex(foliage.midtone),
        highlight: rgbaToHex(foliage.highlight),
        ...(accent ? { fruitOrAccent: rgbaToHex(accent.midtone) } : {})
      }
    };
    const stage = stateTag === 'damaged' ? 'damaged' : 'mature';
    const windShift = stateTag === 'wind_sway'
      ? Math.max(1, Math.floor(profile.moduleSize / 2)) : 0;
    const descriptor = this.morphologyResolver.resolveTreeMorphology(
      family, stage, profile, rng.nextInt(0, 0xffffffff)
    );
    const skeleton = this.skeletonRasterizer.renderSkeleton(
      descriptor, profile, styleColors, windShift
    );
    const canopy = this.foliageRasterizer.renderCanopyAndCompose(
      descriptor, skeleton, profile, styleColors,
      stateTag === 'snowy' ? 'snowy' : 'normal', windShift
    );

    // At most N distinct opaque colors, selected exclusively from this palette.
    const declared: RGBAColor[] = [
      wood.outline, wood.shadow, wood.midtone, wood.highlight,
      foliage.outline, foliage.shadow, foliage.midtone, foliage.highlight,
      ...(accent ? [accent.midtone, accent.highlight] : []),
      foliage.accent
    ];
    const seen = new Set<string>();
    const permitted = declared.filter(color => {
      const key = `${color.r}:${color.g}:${color.b}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, Math.max(1, palette.maxColorsPerAsset));
    const source = canopy.compositeTreeBuffer;
    const width = buffer.width;
    const height = buffer.height;
    const scale = Math.min((width - 2) / source.width, (height - 2) / source.height);
    const fitWidth = Math.max(1, Math.min(width, Math.round(source.width * scale)));
    const fitHeight = Math.max(1, Math.min(height, Math.round(source.height * scale)));
    const left = Math.max(0, Math.min(width - fitWidth,
      Math.round(width / 2 - (canopy.pivotTexel[0] / source.width) * fitWidth)));
    const top = Math.max(0, Math.min(height - fitHeight,
      height - 2 - Math.round((canopy.pivotTexel[1] / source.height) * fitHeight)));

    // Quantization is deterministic, preserves every opaque silhouette pixel,
    // and does not introduce anti-aliasing or change the public raster dimensions.
    const quantize = (original: RGBAColor): RGBAColor => {
      let nearest = permitted[0];
      let distance = Infinity;
      for (const color of permitted) {
        const dr = color.r - original.r;
        const dg = color.g - original.g;
        const db = color.b - original.b;
        const delta = dr * dr + dg * dg + db * db;
        if (delta < distance) {
          nearest = color;
          distance = delta;
        }
      }
      return { ...nearest, a: original.a };
    };
    for (let y = 0; y < fitHeight; y++) {
      const sourceY = Math.min(source.height - 1,
        Math.floor((y + 0.5) * source.height / fitHeight));
      for (let x = 0; x < fitWidth; x++) {
        const sourceX = Math.min(source.width - 1,
          Math.floor((x + 0.5) * source.width / fitWidth));
        const pixel = source.getPixel(sourceX, sourceY);
        if (pixel.a > 0) buffer.setPixel(left + x, top + y, quantize(pixel));
      }
    }
    const canvasAnchor = (id: string, sx: number, sy: number): {
      id: string; texelX: number; texelY: number; normalizedX: number; normalizedY: number;
    } => {
      const texelX = Math.max(0, Math.min(width - 1,
        left + Math.round(sx * fitWidth / source.width)));
      const texelY = Math.max(0, Math.min(height - 1,
        top + Math.round(sy * fitHeight / source.height)));
      return { id, texelX, texelY, normalizedX: texelX / width, normalizedY: texelY / height };
    };
    return {
      buffer,
      anchors: {
        base_pivot: canvasAnchor(
          'base_pivot', canopy.pivotTexel[0], canopy.pivotTexel[1]
        ),
        canopy_center: canvasAnchor(
          'canopy_center', canopy.anchors.canopy_center.texelX,
          canopy.anchors.canopy_center.texelY
        )
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
