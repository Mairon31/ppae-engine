import type {
  AnchorPoint,
  ArtStyleProfile,
  RGBAColor,
  TreeFoliageMassNode,
  TreeMorphologyDescriptor,
  TreeSpeciesDefinition
} from '../core/contracts';
import { SeededRNG, fnv1aHash32 } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { BOTANICAL_SPECIES_DEFINITIONS } from './tree-morphology';
import type { RenderedTreeSkeletonLayers } from './tree-skeleton-rasterizer';

export type CanopyEnvironmentalState = 'normal' | 'autumn' | 'snowy' | 'blossom';

export interface RenderedTreeCanopyLayers {
  readonly backFoliageBuffer: PixelBuffer;
  readonly midFoliageBuffer: PixelBuffer;
  readonly frontFoliageBuffer: PixelBuffer;
  readonly compositeTreeBuffer: PixelBuffer;
  readonly pivotTexel: readonly [number, number];
  readonly anchors: Readonly<Record<string, AnchorPoint>>;
  readonly foliagePixelCount: number;
  readonly visibleWoodPixelCountAfterComposition: number;
}

interface FoliageColorPalette {
  readonly outline: RGBAColor;
  readonly deepShadow: RGBAColor;
  readonly midtone: RGBAColor;
  readonly highlight: RGBAColor;
  readonly accentOrFruit?: RGBAColor;
  readonly snowCap: RGBAColor;
}

/**
 * Rasterizador de masas foliares dirigidas por ramas de PPAE 2.0, fase 1C.
 * El módulo no modifica la salida del generador legado hasta la integración de la fase 1D.
 */
export class TreeCanopyFoliageRasterizer {
  public renderCanopyAndCompose(
    descriptor: TreeMorphologyDescriptor,
    skeletonLayers: RenderedTreeSkeletonLayers,
    profile: ArtStyleProfile,
    speciesOverride?: TreeSpeciesDefinition,
    envState: CanopyEnvironmentalState = 'normal',
    windShiftTexels = 0
  ): RenderedTreeCanopyLayers {
    const w = descriptor.canvasWidthTexels;
    const h = descriptor.canvasHeightTexels;
    const backFoliageBuffer = new PixelBuffer(w, h);
    const midFoliageBuffer = new PixelBuffer(w, h);
    const frontFoliageBuffer = new PixelBuffer(w, h);
    const compositeTreeBuffer = new PixelBuffer(w, h);
    const speciesDef = speciesOverride ?? BOTANICAL_SPECIES_DEFINITIONS[descriptor.familyId];
    const palette = this.resolveFoliagePalette(speciesDef, envState);
    const rng = new SeededRNG(descriptor.seed ^ 0x7f4a7c15);

    // La fase 1C requiere las mismas dimensiones en todos los planos.
    for (const buffer of [
      skeletonLayers.backBranchesBuffer,
      skeletonLayers.trunkAndMainBranchesBuffer,
      skeletonLayers.exposedTipsBuffer
    ]) {
      if (buffer.width !== w || buffer.height !== h) {
        throw new RangeError('Tree canopy and skeleton layer dimensions must match');
      }
    }

    if (descriptor.foliageDistribution !== 'none' && descriptor.skeleton.foliageMasses.length > 0) {
      if (descriptor.crownArchitecture === 'radial_fronds') {
        this.renderPalmRadialFronds(
          backFoliageBuffer, midFoliageBuffer, frontFoliageBuffer,
          descriptor, palette, profile, rng, envState, windShiftTexels
        );
      } else {
        for (const mass of descriptor.skeleton.foliageMasses) {
          const target = mass.layerDepth === 'back'
            ? backFoliageBuffer
            : mass.layerDepth === 'mid' ? midFoliageBuffer : frontFoliageBuffer;
          // Sub-flujos estables por masa: no depende del orden de otras masas.
          const massRng = new SeededRNG(
            fnv1aHash32(descriptor.seed + '::foliage::' + mass.massId)
          );
          this.rasterizeFoliageMass(
            target, mass, descriptor, palette, profile, envState, massRng, windShiftTexels
          );
        }
      }
      if (profile.outlineMode !== 'none') {
        backFoliageBuffer.applySelectiveOutline(palette.outline);
        midFoliageBuffer.applySelectiveOutline(palette.outline);
        frontFoliageBuffer.applySelectiveOutline(palette.outline);
      }
    }

    // Seis planos de profundidad (orden del pintor).
    this.blitBuffer(compositeTreeBuffer, backFoliageBuffer);
    this.blitBuffer(compositeTreeBuffer, skeletonLayers.backBranchesBuffer);
    this.blitBuffer(compositeTreeBuffer, skeletonLayers.trunkAndMainBranchesBuffer);
    this.blitBuffer(compositeTreeBuffer, midFoliageBuffer);
    this.blitBuffer(compositeTreeBuffer, skeletonLayers.exposedTipsBuffer);
    this.blitBuffer(compositeTreeBuffer, frontFoliageBuffer);

    const foliagePixelCount = this.countOpaquePixels(backFoliageBuffer) +
      this.countOpaquePixels(midFoliageBuffer) + this.countOpaquePixels(frontFoliageBuffer);
    const visibleWoodPixelCountAfterComposition = this.countVisibleSkeletonPixels(
      skeletonLayers, midFoliageBuffer, frontFoliageBuffer
    );
    const hubNode = descriptor.skeleton.nodes.find(n => n.nodeId === 'crown_hub') ??
      descriptor.skeleton.nodes[0];
    const pivotX = descriptor.skeleton.pivotX;
    const pivotY = descriptor.skeleton.pivotY;
    const canopyX = Math.min(w - 1, Math.max(0, hubNode.x + windShiftTexels));
    return {
      backFoliageBuffer, midFoliageBuffer, frontFoliageBuffer,
      compositeTreeBuffer, pivotTexel: [pivotX, pivotY],
      anchors: {
        base_pivot: {
          id: 'base_pivot', texelX: pivotX, texelY: pivotY,
          normalizedX: pivotX / w, normalizedY: pivotY / h
        },
        canopy_center: {
          id: 'canopy_center', texelX: canopyX, texelY: hubNode.y,
          normalizedX: canopyX / w, normalizedY: hubNode.y / h
        }
      },
      foliagePixelCount,
      visibleWoodPixelCountAfterComposition
    };
  }

  private resolveFoliagePalette(
    species: TreeSpeciesDefinition,
    envState: CanopyEnvironmentalState
  ): FoliageColorPalette {
    if (envState === 'autumn' && species.speciesId !== 'pine') {
      return {
        outline: hexToRgba('#2e130c'),
        deepShadow: hexToRgba('#6e2515'),
        midtone: hexToRgba('#b54821'),
        highlight: hexToRgba('#e68a2e'),
        accentOrFruit: hexToRgba('#facc15'),
        snowCap: hexToRgba('#eef6fa')
      };
    }
    if (envState === 'blossom') {
      return {
        outline: hexToRgba('#3b1224'),
        deepShadow: hexToRgba('#8a2be2'),
        midtone: hexToRgba('#ec4899'),
        highlight: hexToRgba('#fbcfe8'),
        accentOrFruit: hexToRgba('#ffffff'),
        snowCap: hexToRgba('#eef6fa')
      };
    }
    return {
      outline: hexToRgba(species.foliageColors.outline),
      deepShadow: hexToRgba(species.foliageColors.shadow),
      midtone: hexToRgba(species.foliageColors.midtone),
      highlight: hexToRgba(species.foliageColors.highlight),
      accentOrFruit: species.foliageColors.fruitOrAccent
        ? hexToRgba(species.foliageColors.fruitOrAccent) : undefined,
      snowCap: hexToRgba('#eef6fa')
    };
  }

  private rasterizeFoliageMass(
    buf: PixelBuffer, mass: TreeFoliageMassNode, descriptor: TreeMorphologyDescriptor,
    palette: FoliageColorPalette, profile: ArtStyleProfile,
    envState: CanopyEnvironmentalState, rng: SeededRNG, windShiftTexels: number
  ): void {
    switch (descriptor.foliageDistribution) {
      case 'stratified_pads':
        this.renderStratifiedPadMass(buf, mass, palette, profile, envState, rng, windShiftTexels);
        break;
      case 'pendulous_fronds':
        this.renderWeepingCascadeMass(buf, mass, palette, profile, envState, rng, windShiftTexels);
        break;
      case 'sparse_tufts':
        this.renderSparseTuftMass(buf, mass, descriptor, palette, envState, rng, windShiftTexels);
        break;
      case 'vertical_plumes':
        this.renderBambooPlumeMass(buf, mass, palette, envState, rng, windShiftTexels);
        break;
      case 'none':
        break;
      case 'dense_billowing':
      default:
        this.renderBillowingClusterMass(
          buf, mass, descriptor, palette, profile, envState, rng, windShiftTexels
        );
    }
  }

  /** Masas densas multilobulares con sombreado 3/4 y porosidad central. */
  private renderBillowingClusterMass(
    buf: PixelBuffer, mass: TreeFoliageMassNode, descriptor: TreeMorphologyDescriptor,
    palette: FoliageColorPalette, profile: ArtStyleProfile,
    envState: CanopyEnvironmentalState, rng: SeededRNG, windShiftTexels: number
  ): void {
    const cx = mass.centerX + windShiftTexels;
    const cy = mass.centerY;
    const rx = mass.radiusX;
    const ry = mass.radiusY;
    const lobes = Math.max(3, mass.lobeCount);
    const centers: Array<{x: number; y: number; rx: number; ry: number}> = [];
    for (let i = 0; i < lobes; i++) {
      const angle = (i / lobes) * Math.PI * 2 + mass.angleTiltRad;
      centers.push({
        x: Math.round(cx + Math.cos(angle) * rx * 0.48),
        y: Math.round(cy + Math.sin(angle) * ry * 0.42),
        rx: Math.max(2, Math.round(rx * rng.nextRange(0.55, 0.78))),
        ry: Math.max(2, Math.round(ry * rng.nextRange(0.52, 0.75)))
      });
    }
    const minX = Math.max(1, cx - rx - 3);
    const maxX = Math.min(buf.width - 2, cx + rx + 3);
    const minY = Math.max(1, cy - ry - 3);
    const maxY = Math.min(buf.height - 2, cy + ry + 3);
    const [lightX, lightY] = profile.lightDirectionVector;
    const openness = descriptor.metrics.canopyOpennessScore;
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        let closest = Infinity;
        for (const lobe of centers) {
          const dx = (px - lobe.x) / lobe.rx;
          const dy = (py - lobe.y) / lobe.ry;
          closest = Math.min(closest, dx * dx + dy * dy);
        }
        const edgeJitter = (((px * 17) ^ (py * 31)) & 3) * 0.08;
        if (closest > 1 + edgeJitter) continue;
        if (mass.layerDepth === 'mid' && openness > 0.35 &&
          closest < 0.32 && ((px + py) & 1) === 0) continue;
        const relativeX = (px - cx) / Math.max(1, rx);
        const relativeY = (py - cy) / Math.max(1, ry);
        const lightScore = relativeX * lightX + relativeY * lightY;
        let tone: RGBAColor;
        if (envState === 'snowy' && relativeY < -0.25) {
          tone = palette.snowCap;
        } else if (mass.layerDepth === 'back') {
          tone = lightScore > 0.15 ? palette.midtone : palette.deepShadow;
        } else if (lightScore > 0.22 && ((px + py * 3) & 3) !== 0) {
          tone = palette.highlight;
        } else if (relativeY > 0.32 || lightScore < -0.25) {
          tone = palette.deepShadow;
        } else {
          tone = palette.midtone;
        }
        buf.setPixel(px, py, tone);
      }
    }

    if (palette.accentOrFruit && mass.layerDepth === 'front' && envState !== 'snowy' &&
      ['fruit_tree', 'oak', 'tropical', 'fantasy_lumin'].includes(descriptor.familyId)) {
      const count = descriptor.familyId === 'fruit_tree' ? 3 : 1;
      for (let f = 0; f < count; f++) {
        const fx = cx + rng.nextInt(-Math.max(1, rx - 2), Math.max(1, rx - 2));
        const fy = cy + rng.nextInt(-Math.max(1, ry - 2), Math.max(1, ry - 2));
        if (buf.isOpaque(fx, fy)) buf.setPixel(fx, fy, palette.accentOrFruit);
      }
    }
  }

  /** Estratos acampanados con flecos de acículas y huecos entre pisos. */
  private renderStratifiedPadMass(
    buf: PixelBuffer, mass: TreeFoliageMassNode, palette: FoliageColorPalette,
    _profile: ArtStyleProfile, envState: CanopyEnvironmentalState,
    _rng: SeededRNG, windShiftTexels: number
  ): void {
    const cx = mass.centerX + windShiftTexels;
    const cy = mass.centerY;
    const padRx = Math.max(3, Math.round(mass.radiusX * 1.25));
    const padRy = Math.max(2, Math.round(mass.radiusY * 0.65));
    for (let dy = -padRy; dy <= padRy + 1; dy++) {
      const progress = (dy + padRy) / Math.max(1, padRy * 2);
      const halfSpan = Math.max(1, Math.round(
        padRx * Math.sin(Math.min(1, progress * 1.25) * (Math.PI * 0.55))
      ));
      for (let dx = -halfSpan; dx <= halfSpan; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (dy >= padRy && ((px * 7 + py * 13) & 1) === 0) continue;
        let tone: RGBAColor;
        if (envState === 'snowy' && dy <= -padRy + 1) {
          tone = palette.snowCap;
        } else if (dy < 0 && dx <= Math.floor(halfSpan * 0.35)) {
          tone = palette.highlight;
        } else if (dy >= padRy - 1 || dx > Math.floor(halfSpan * 0.5)) {
          tone = palette.deepShadow;
        } else {
          tone = palette.midtone;
        }
        buf.setPixel(px, py, tone);
      }
    }
  }

  /** Cortinas de sauce con filamentos de longitudes variables, parcialmente transparentes. */
  private renderWeepingCascadeMass(
    buf: PixelBuffer, mass: TreeFoliageMassNode, palette: FoliageColorPalette,
    _profile: ArtStyleProfile, envState: CanopyEnvironmentalState,
    rng: SeededRNG, windShiftTexels: number
  ): void {
    const cx = mass.centerX + windShiftTexels;
    const cy = mass.centerY;
    const rx = mass.radiusX;
    const ry = Math.max(2, Math.round(mass.radiusY * 0.7));
    // Dosel arqueado superior, las hebras dejan huecos entre sí para mostrar ramas.
    buf.fillEllipse(cx, cy, rx, ry, palette.midtone);
    buf.fillEllipse(cx - 1, cy - 1, Math.max(2, rx - 1), Math.max(1, ry - 1),
      envState === 'snowy' ? palette.snowCap : palette.highlight
    );
    const dropBase = mass.dropLengthPx ?? 8;
    for (let dx = -rx; dx <= rx; dx += 2) {
      const strandX = cx + dx;
      const strandLength = Math.max(3, dropBase - Math.abs(dx) + rng.nextInt(-2, 2));
      for (let sy = 0; sy < strandLength; sy++) {
        const sway = sy > 3
          ? Math.round((sy / strandLength) * windShiftTexels * 0.6) : 0;
        const py = cy + sy;
        if (py >= buf.height - 3) break;
        const tone = sy < 2 ? palette.highlight
          : sy > strandLength - 2 ? palette.deepShadow : palette.midtone;
        buf.setPixel(strandX + sway, py, tone);
      }
    }
  }

  /** Racimos aireados con ventanas que dejan asomar troncos de abedules. */
  private renderSparseTuftMass(
    buf: PixelBuffer, mass: TreeFoliageMassNode, descriptor: TreeMorphologyDescriptor,
    palette: FoliageColorPalette, envState: CanopyEnvironmentalState,
    rng: SeededRNG, windShiftTexels: number
  ): void {
    const cx = mass.centerX + windShiftTexels;
    const cy = mass.centerY;
    const tuftCount = Math.max(3, mass.lobeCount + 1);
    const openness = descriptor.metrics.canopyOpennessScore;
    for (let t = 0; t < tuftCount; t++) {
      const x = cx + rng.nextInt(-mass.radiusX, mass.radiusX);
      const y = cy + rng.nextInt(-mass.radiusY, mass.radiusY);
      if (descriptor.familyId === 'birch' &&
        Math.abs(x - descriptor.skeleton.pivotX) <= 1 && t % 2 === 0) continue;
      if (t > 0 && rng.chance(Math.max(0, Math.min(0.36, openness * 0.18)))) continue;
      const top = envState === 'snowy' ? palette.snowCap : palette.highlight;
      buf.fillRect(x - 1, y, 3, 2, palette.midtone);
      buf.fillRect(x - 1, y - 1, 2, 1, top);
      buf.fillRect(x, y + 1, 2, 1, palette.deepShadow);
    }
  }

  /** Penachos lanceolados del bambú que brotan de los extremos de las cañas. */
  private renderBambooPlumeMass(
    buf: PixelBuffer, mass: TreeFoliageMassNode, palette: FoliageColorPalette,
    envState: CanopyEnvironmentalState, rng: SeededRNG,
    windShiftTexels: number
  ): void {
    const cx = mass.centerX + windShiftTexels;
    const cy = mass.centerY;
    const bladeOffsets = [[-4, -2], [4, -2], [-5, 2], [5, 2], [0, -4]];
    for (const [bx, by] of bladeOffsets) {
      const tipX = cx + bx + rng.nextInt(-1, 1);
      const tipY = cy + by;
      buf.drawLine(cx, cy, tipX, tipY, palette.midtone, 1);
      buf.setPixel(
        cx + Math.round(bx * 0.4), cy + Math.round(by * 0.4),
        envState === 'snowy' ? palette.snowCap : palette.highlight
      );
    }
  }

  /** Frondas pinnadas de palmera arqueadas con foliolos individuales. */
  private renderPalmRadialFronds(
    back: PixelBuffer, mid: PixelBuffer, front: PixelBuffer,
    descriptor: TreeMorphologyDescriptor,
    palette: FoliageColorPalette,
    profile: ArtStyleProfile,
    _rng: SeededRNG,
    envState: CanopyEnvironmentalState,
    windShiftTexels: number
  ): void {
    const hub = descriptor.skeleton.nodes.find(n => n.nodeId === 'crown_hub') ??
      descriptor.skeleton.nodes[descriptor.skeleton.nodes.length - 1];
    const crownX = hub.x + windShiftTexels;
    const crownY = hub.y;
    const mod = profile.moduleSize;
    if (palette.accentOrFruit && envState !== 'snowy') {
      mid.fillRect(crownX - 2, crownY, 2, 2, palette.accentOrFruit);
      mid.fillRect(crownX + 1, crownY + 1, 2, 2, palette.accentOrFruit);
    }
    const fronds = [
      { dx: -mod * 2.4, dy: -mod * 0.8, drop: mod * 1.3, layer: back },
      { dx:  mod * 2.4, dy: -mod * 0.8, drop: mod * 1.3, layer: back },
      { dx: -mod * 2.8, dy:  mod * 0.3, drop: mod * 1.8, layer: mid },
      { dx:  mod * 2.8, dy:  mod * 0.3, drop: mod * 1.8, layer: mid },
      { dx: -mod * 1.6, dy: -mod * 1.6, drop: mod * 0.8, layer: front },
      { dx:  mod * 1.6, dy: -mod * 1.6, drop: mod * 0.8, layer: front }
    ];
    for (const frond of fronds) {
      const endX = Math.round(crownX + frond.dx + windShiftTexels * 0.5);
      const endY = Math.round(crownY + frond.dy + frond.drop);
      const controlX = Math.round(crownX + frond.dx * 0.65);
      const controlY = Math.round(crownY + frond.dy - mod * 0.7);
      for (let s = 0; s <= 14; s++) {
        const t = s / 14;
        const inv = 1 - t;
        const x = Math.round(inv * inv * crownX +
          2 * inv * t * controlX + t * t * endX);
        const y = Math.round(inv * inv * crownY +
          2 * inv * t * controlY + t * t * endY);
        frond.layer.setPixel(x, y,
          envState === 'snowy' && t < 0.22 ? palette.snowCap : palette.highlight);
        if (s > 2 && s % 2 === 0) {
          const pinnaLength = Math.max(2,
            Math.round((1 - Math.abs(t - 0.5)) * mod * 0.9));
          for (let p = 1; p <= pinnaLength; p++) {
            frond.layer.setPixel(x, y + p,
              p === pinnaLength ? palette.deepShadow : palette.midtone);
          }
        }
      }
    }
  }

  /**
   * Cuenta sólo la madera visible en el orden final de composición.
   * Un brote frontal tapa madera; una punta expuesta tapa follaje intermedio.
   */
  private countVisibleSkeletonPixels(
    skeleton: RenderedTreeSkeletonLayers,
    midFoliage: PixelBuffer,
    frontFoliage: PixelBuffer
  ): number {
    let count = 0;
    const back = skeleton.backBranchesBuffer;
    const main = skeleton.trunkAndMainBranchesBuffer;
    const tips = skeleton.exposedTipsBuffer;
    for (let y = 0; y < frontFoliage.height; y++) {
      for (let x = 0; x < frontFoliage.width; x++) {
        if (frontFoliage.isOpaque(x, y)) continue;
        if (tips.isOpaque(x, y)) {
          count++;
        } else if (!midFoliage.isOpaque(x, y) &&
          (main.isOpaque(x, y) || back.isOpaque(x, y))) {
          count++;
        }
      }
    }
    return count;
  }

  private blitBuffer(dest: PixelBuffer, src: PixelBuffer): void {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const color = src.getPixel(x, y);
        if (color.a > 0) dest.setPixel(x, y, color);
      }
    }
  }

  private countOpaquePixels(buf: PixelBuffer): number {
    let count = 0;
    for (let i = 3; i < buf.data.length; i += 4) {
      if (buf.data[i] > 0) count++;
    }
    return count;
  }
}
