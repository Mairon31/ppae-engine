import type {
  ArtStyleProfile,
  BotanicalFamilyId,
  RGBAColor,
  TreeBranchSegment,
  TreeMorphologyDescriptor,
  TreeRootTendril,
  TreeSpeciesDefinition
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { BOTANICAL_SPECIES_DEFINITIONS } from './tree-morphology';

export type BarkPatternStyle =
  | 'fissured_rough'
  | 'birch_lenticels'
  | 'palm_rings'
  | 'bamboo_nodes'
  | 'smooth_Striated'
  | 'charred_cracked';

export interface RenderedTreeSkeletonLayers {
  readonly backBranchesBuffer: PixelBuffer;
  readonly trunkAndMainBranchesBuffer: PixelBuffer;
  readonly exposedTipsBuffer: PixelBuffer;
  readonly compositeSkeletonBuffer: PixelBuffer;
  readonly barkStyle: BarkPatternStyle;
  readonly woodyPixelCount: number;
}

interface BarkColorSet {
  readonly outline: RGBAColor;
  readonly shadow: RGBAColor;
  readonly midtone: RGBAColor;
  readonly highlight: RGBAColor;
  readonly knotOrMark: RGBAColor;
}

/**
 * Rasterizador independiente de DOM y Canvas de troncos y ramas (FASE 1B).
 * Interpola Bézier cuadrático y radio variable, y entrega tres capas leñosas
 * y un compuesto para que la fase 1C intercale masas de follaje por profundidad.
 */
export class TreeSkeletonRasterizer {
  public renderSkeleton(
    descriptor: TreeMorphologyDescriptor,
    profile: ArtStyleProfile,
    speciesOverride?: TreeSpeciesDefinition,
    windShiftTexels = 0
  ): RenderedTreeSkeletonLayers {
    const w = descriptor.canvasWidthTexels;
    const h = descriptor.canvasHeightTexels;
    const backBranchesBuffer = new PixelBuffer(w, h);
    const trunkAndMainBranchesBuffer = new PixelBuffer(w, h);
    const exposedTipsBuffer = new PixelBuffer(w, h);
    const compositeSkeletonBuffer = new PixelBuffer(w, h);

    const species = speciesOverride ?? BOTANICAL_SPECIES_DEFINITIONS[descriptor.familyId];
    const barkStyle = this.resolveBarkPatternStyle(descriptor.familyId, descriptor.stage);
    const colors = this.resolveBarkColors(species, descriptor.stage);
    const rng = new SeededRNG(descriptor.seed ^ 0x51e1e70d);

    // Sombra de contacto. El pivote de suelo permanece fijo durante el viento.
    const shadowRx = Math.max(3, Math.round(w * 0.22));
    const shadowRy = Math.max(1, Math.round(profile.moduleSize * 0.45));
    trunkAndMainBranchesBuffer.fillEllipse(
      descriptor.skeleton.pivotX,
      descriptor.skeleton.pivotY + 1,
      shadowRx,
      shadowRy,
      { r: 15, g: 23, b: 42, a: 105 }
    );

    if (descriptor.stage === 'seed') {
      this.renderSeedStage(trunkAndMainBranchesBuffer, descriptor, colors);
    } else if (descriptor.stage === 'stump') {
      this.renderStumpStage(trunkAndMainBranchesBuffer, descriptor, profile, colors);
    } else if (descriptor.stage === 'fallen_log') {
      this.renderFallenLogStage(
        trunkAndMainBranchesBuffer, descriptor, profile, colors, barkStyle, rng
      );
    } else {
      for (let idx = 0; idx < descriptor.skeleton.segments.length; idx++) {
        const segment = descriptor.skeleton.segments[idx];
        const target = segment.isExposedDeadwood
          ? exposedTipsBuffer
          : segment.order === 2 && idx % 2 === 0
            ? backBranchesBuffer
            : trunkAndMainBranchesBuffer;
        this.rasterizeQuadraticBranchSegment(
          target, segment, descriptor.skeleton.pivotY, h,
          colors, barkStyle, profile, rng, windShiftTexels
        );
      }
      for (const root of descriptor.skeleton.roots) {
        this.rasterizeRootTendril(trunkAndMainBranchesBuffer, root, colors);
      }
    }

    if (profile.outlineMode !== 'none') {
      backBranchesBuffer.applySelectiveOutline(colors.outline);
      trunkAndMainBranchesBuffer.applySelectiveOutline(colors.outline);
      exposedTipsBuffer.applySelectiveOutline(colors.outline);
    }
    this.blitBuffer(compositeSkeletonBuffer, backBranchesBuffer);
    this.blitBuffer(compositeSkeletonBuffer, trunkAndMainBranchesBuffer);
    this.blitBuffer(compositeSkeletonBuffer, exposedTipsBuffer);
    return {
      backBranchesBuffer, trunkAndMainBranchesBuffer,
      exposedTipsBuffer, compositeSkeletonBuffer, barkStyle,
      woodyPixelCount: this.countOpaquePixels(compositeSkeletonBuffer)
    };
  }

  public resolveBarkPatternStyle(
    familyId: BotanicalFamilyId,
    stage: TreeMorphologyDescriptor['stage']
  ): BarkPatternStyle {
    if (stage === 'burned') return 'charred_cracked';
    switch (familyId) {
      case 'birch': return 'birch_lenticels';
      case 'palm': return 'palm_rings';
      case 'bamboo': return 'bamboo_nodes';
      case 'tropical':
      case 'mangrove':
      case 'fruit_tree':
        return 'smooth_Striated';
      default:
        return 'fissured_rough';
    }
  }

  private resolveBarkColors(
    species: TreeSpeciesDefinition,
    stage: TreeMorphologyDescriptor['stage']
  ): BarkColorSet {
    if (stage === 'burned') {
      return {
        outline: hexToRgba('#090a0f'),
        shadow: hexToRgba('#18181b'),
        midtone: hexToRgba('#27272a'),
        highlight: hexToRgba('#3f3f46'),
        knotOrMark: hexToRgba('#ea580c')
      };
    }
    return {
      outline: hexToRgba(species.woodColors.outline),
      shadow: hexToRgba(species.woodColors.shadow),
      midtone: hexToRgba(species.woodColors.midtone),
      highlight: hexToRgba(species.woodColors.highlight),
      knotOrMark: species.speciesId === 'birch'
        ? hexToRgba(species.woodColors.outline)
        : hexToRgba(species.woodColors.shadow)
    };
  }

  /** B(t)=(1-t)²P0+2(1-t)tP1+t²P2; radio interpolado base->punta. */
  private rasterizeQuadraticBranchSegment(
    buffer: PixelBuffer,
    segment: TreeBranchSegment,
    pivotY: number,
    canvasHeight: number,
    colors: BarkColorSet,
    style: BarkPatternStyle,
    profile: ArtStyleProfile,
    rng: SeededRNG,
    windShiftTexels: number
  ): void {
    const approxLength =
      Math.hypot(segment.controlX - segment.startX, segment.controlY - segment.startY) +
      Math.hypot(segment.endX - segment.controlX, segment.endY - segment.controlY);
    const steps = Math.max(8, Math.ceil(approxLength * 2.2));
    const [lightX, lightY] = profile.lightDirectionVector;

    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const invT = 1 - t;
      const rawX =
        invT * invT * segment.startX +
        2 * invT * t * segment.controlX + t * t * segment.endX;
      const rawY =
        invT * invT * segment.startY +
        2 * invT * t * segment.controlY + t * t * segment.endY;
      const heightRatio = Math.max(0, (pivotY - rawY) / Math.max(1, canvasHeight));
      const swayX = heightRatio > 0.25
        ? Math.round((heightRatio - 0.25) * windShiftTexels) : 0;
      const cx = Math.round(rawX) + swayX;
      const cy = Math.round(rawY);
      const radius = Math.max(0.6,
        segment.startRadiusPx * invT + segment.endRadiusPx * t
      );

      // Tangente analítica y normal local de la curva, sin suavizado subpíxel.
      const tx = 2 * invT * (segment.controlX - segment.startX) +
        2 * t * (segment.endX - segment.controlX);
      const ty = 2 * invT * (segment.controlY - segment.startY) +
        2 * t * (segment.endY - segment.controlY);
      const tangentLength = Math.max(1e-4, Math.hypot(tx, ty));
      const nx = ty / tangentLength;
      const ny = -tx / tangentLength;
      const integerRadius = Math.ceil(radius);

      for (let dy = -integerRadius; dy <= integerRadius; dy++) {
        for (let dx = -integerRadius; dx <= integerRadius; dx++) {
          if (Math.hypot(dx, dy) > radius + 0.35) continue;
          const px = cx + dx;
          const py = cy + dy;
          const crossPosition = radius > 0.8 ? (dx * nx + dy * ny) / radius : 0;
          const alignment = dx * lightX + dy * lightY;
          let color: RGBAColor;
          if (crossPosition > 0.28 || alignment > 0.35) {
            color = colors.highlight;
          } else if (crossPosition < -0.25 || alignment < -0.35) {
            color = colors.shadow;
          } else {
            color = colors.midtone;
          }
          if (segment.order <= 1 && radius >= 1.2) {
            color = this.applyBarkSurfaceGrammar(
              px, py, crossPosition, color, colors, style, profile.moduleSize, rng
            );
          }
          buffer.setPixel(px, py, color);
        }
      }
    }
  }

  /** Patrones de corteza discretos y deterministas según familia y estado. */
  private applyBarkSurfaceGrammar(
    px: number, py: number, crossPosition: number,
    baseTone: RGBAColor, colors: BarkColorSet,
    style: BarkPatternStyle, moduleSize: number, rng: SeededRNG
  ): RGBAColor {
    switch (style) {
      case 'birch_lenticels': {
        const rowHash = ((py * 37) ^ (px * 13)) & 7;
        if (py % 3 === 0 && Math.abs(crossPosition) < 0.65 && rowHash < 3) {
          return colors.knotOrMark;
        }
        return baseTone;
      }
      case 'palm_rings':
        return py % 3 === 0 ? colors.shadow : baseTone;
      case 'bamboo_nodes': {
        const interval = Math.max(4, moduleSize);
        if (py % interval === 0) return colors.highlight;
        if (py % interval === 1) return colors.shadow;
        return baseTone;
      }
      case 'fissured_rough': {
        const groove = ((px * 19 + Math.floor(py / 2) * 31) & 7) === 0;
        return groove && Math.abs(crossPosition) < 0.5 ? colors.shadow : baseTone;
      }
      case 'charred_cracked':
        return ((px * 23 + py * 17) & 15) === 0 && rng.chance(0.4)
          ? colors.knotOrMark : baseTone;
      default:
        return baseTone;
    }
  }

  private rasterizeRootTendril(
    buffer: PixelBuffer, root: TreeRootTendril, colors: BarkColorSet
  ): void {
    if (root.isAerialProp) {
      const midX = Math.round((root.startX + root.endX) * 0.55);
      const midY = Math.round((root.startY + root.endY) * 0.45);
      buffer.drawLine(root.startX, root.startY, midX, midY, colors.midtone, root.thicknessPx);
      buffer.drawLine(midX, midY, root.endX, root.endY, colors.shadow, root.thicknessPx);
    } else {
      buffer.drawLine(
        root.startX, root.startY, root.endX, root.endY,
        colors.midtone, root.thicknessPx
      );
      buffer.drawLine(
        root.startX, root.startY - 1,
        Math.round((root.startX + root.endX) * 0.6), root.endY - 1,
        colors.highlight, 1
      );
    }
  }

  private renderSeedStage(
    buffer: PixelBuffer, descriptor: TreeMorphologyDescriptor, colors: BarkColorSet
  ): void {
    const cx = descriptor.skeleton.pivotX;
    const cy = descriptor.skeleton.pivotY - 2;
    buffer.fillEllipse(cx, cy, 2, 2, colors.midtone);
    buffer.setPixel(cx - 1, cy - 1, colors.highlight);
    buffer.fillRect(cx - 1, cy - 2, 3, 1, colors.shadow);
  }

  private renderStumpStage(
    buffer: PixelBuffer, descriptor: TreeMorphologyDescriptor,
    profile: ArtStyleProfile, colors: BarkColorSet
  ): void {
    const cx = descriptor.skeleton.pivotX;
    const baseY = descriptor.skeleton.pivotY;
    const radius = Math.max(3, Math.round(profile.moduleSize * 0.95));
    const height = Math.max(3, Math.round(profile.moduleSize * 0.9));
    buffer.fillRect(cx - radius, baseY - height, radius * 2 + 1, height, colors.midtone);
    buffer.fillRect(cx + 1, baseY - height, radius, height, colors.shadow);
    buffer.drawLine(cx - radius, baseY - 2, cx - radius - 2, baseY, colors.shadow, 2);
    buffer.drawLine(cx + radius, baseY - 2, cx + radius + 2, baseY, colors.shadow, 2);
    buffer.fillEllipse(cx, baseY - height, radius, 2, colors.highlight);
    buffer.setPixel(cx, baseY - height, colors.shadow);
  }

  private renderFallenLogStage(
    buffer: PixelBuffer, descriptor: TreeMorphologyDescriptor,
    profile: ArtStyleProfile, colors: BarkColorSet,
    style: BarkPatternStyle, rng: SeededRNG
  ): void {
    const w = descriptor.canvasWidthTexels;
    const baseY = descriptor.skeleton.pivotY;
    const logLength = Math.max(8, Math.floor(w * 0.76));
    const startX = Math.floor((w - logLength) / 2);
    const radius = Math.max(2, Math.floor(profile.moduleSize * 0.65));
    const cy = baseY - radius - 1;
    for (let x = startX; x < startX + logLength; x++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const y = cy + dy;
        const baseTone = dy < 0 ? colors.highlight : dy > 0
          ? colors.shadow : colors.midtone;
        const tone = this.applyBarkSurfaceGrammar(
          x, y, dy / radius, baseTone, colors, style, profile.moduleSize, rng
        );
        buffer.setPixel(x, y, tone);
      }
    }
    buffer.fillEllipse(startX, cy, 2, radius, colors.highlight);
    buffer.setPixel(startX, cy, colors.outline);
  }

  private blitBuffer(target: PixelBuffer, source: PixelBuffer): void {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const color = source.getPixel(x, y);
        if (color.a > 0) target.setPixel(x, y, color);
      }
    }
  }

  private countOpaquePixels(buffer: PixelBuffer): number {
    let count = 0;
    for (let i = 3; i < buffer.data.length; i += 4) {
      if (buffer.data[i] > 0) count++;
    }
    return count;
  }
}
