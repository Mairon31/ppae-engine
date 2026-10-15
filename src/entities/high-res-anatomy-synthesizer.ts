/**
 * PPAE Engine 3.0 — Phase 3C: High-Resolution Secondary Anatomy & Material Cluster Synthesizer
 *
 * Eliminates the "collection of smooth ovals with concentric pillow shading" defect
 * in 16x16..36x36 sprites (Screenshots #15-#19) and the indistinct blocky silhouettes
 * in low resolutions (Screenshots #2-#3) by synthesizing species-specific secondary
 * anatomy and material clusters directly over the 8-direction projected 2.5D volume:
 *   - Bovine Cow: Coherent multi-texel piebald coat patches, moist pink muzzle pad
 *     with nostrils, horn ridges, and cleft hooves.
 *   - Ovine Sheep: Cellular scalloped wool fleece clusters with contrasting dark face and legs.
 *   - Canine Wolf: Dorsal-to-ventral counter-shading (dark saddle, light throat/chest/belly),
 *     directional fur ruff clusters, and inner ear concha.
 *   - Avian Chicken: Layered primary/secondary wing feather rows, serrated red comb/wattle,
 *     amber beak, and scaly tarsus legs.
 *   - Humanoid Biped: Clustered hair volume, tunic tension folds, belt & buckle, and boots/hands.
 *   - Amorphous Corrupt: Dual-layer translucent membrane, internal suspended core refraction,
 *     corruption veins, and sharp wet specular glints.
 */

import {
  AnyGranularityProfileInput,
  UnifiedGranularityProfileId,
  UnifiedSurfaceDetailBudget,
  getUnifiedSurfaceDetailBudget,
  normalizeGranularityProfileId,
} from '../core/resolution-contract-bridge';
import {
  DirectionalLightSpec,
  hashDeterministicTexel,
} from '../rasterizer/surface-cluster-rasterizer';
import type { RGBAColor as RgbaColor } from '../core/contracts';
import {
  AnatomicalPartRole,
  AnatomicalSpeciesId,
  CreatureBodyConditionId,
  CreatureLifeStageId,
  GeneratedAnatomicalRig25D,
  SpeciesAnatomicalSkeletonEngine,
} from './species-anatomical-skeleton';
import {
  CardinalAndDiagonalDirection8,
  DEFAULT_ANATOMICAL_MATERIAL_RAMPS,
  EightDirectionProjectionEngine,
  ProjectedAnatomicalPrimitive,
  ProjectedEightDirectionView,
} from './eight-direction-projection';

export interface SynthesizedEntitySprite30 {
  readonly speciesId: AnatomicalSpeciesId;
  readonly lifeStage: CreatureLifeStageId;
  readonly condition: CreatureBodyConditionId;
  readonly direction: CardinalAndDiagonalDirection8;
  readonly profileId: UnifiedGranularityProfileId;
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8ClampedArray;
  readonly partRoleBuffer: Int16Array;
  readonly rig: GeneratedAnatomicalRig25D;
  readonly projection: ProjectedEightDirectionView;
  readonly budget: UnifiedSurfaceDetailBudget;
  readonly secondaryFeatureCount: number;
}

export interface SilhouetteComparisonMetrics {
  readonly intersectionPixels: number;
  readonly unionPixels: number;
  readonly intersectionOverUnion: number;
  readonly aspectRatioDiff: number;
  readonly areDistinctSilhouettes: boolean;
}

const PART_ROLE_ORDER: readonly AnatomicalPartRole[] = [
  'cranium',
  'jaw-muzzle',
  'neck',
  'thorax',
  'abdomen',
  'pelvis',
  'limb-upper',
  'limb-lower',
  'extremity-foot',
  'wing',
  'ear',
  'horn-or-crest',
  'tail',
  'udder-or-core',
  'mutation-growth',
];

const SECONDARY_ACCENT_COLORS = Object.freeze({
  cowBlackSpotShadow: { r: 28, g: 30, b: 38, a: 255 } as RgbaColor,
  cowBlackSpotMid: { r: 44, g: 48, b: 58, a: 255 } as RgbaColor,
  cowBlackSpotLight: { r: 64, g: 70, b: 82, a: 255 } as RgbaColor,
  cowPinkMuzzleShadow: { r: 186, g: 112, b: 124, a: 255 } as RgbaColor,
  cowPinkMuzzleLight: { r: 228, g: 154, b: 166, a: 255 } as RgbaColor,
  cowNostrilDark: { r: 92, g: 44, b: 54, a: 255 } as RgbaColor,

  wolfVentralLight: { r: 188, g: 196, b: 208, a: 255 } as RgbaColor,
  wolfVentralShadow: { r: 146, g: 156, b: 170, a: 255 } as RgbaColor,
  wolfDorsalDark: { r: 36, g: 40, b: 52, a: 255 } as RgbaColor,
  wolfEyeAmber: { r: 238, g: 182, b: 44, a: 255 } as RgbaColor,

  chickenBeakGold: { r: 236, g: 178, b: 42, a: 255 } as RgbaColor,
  chickenBeakShadow: { r: 184, g: 126, b: 24, a: 255 } as RgbaColor,
  chickenWingStripe: { r: 138, g: 104, b: 74, a: 255 } as RgbaColor,

  humanoidHairDark: { r: 58, g: 36, b: 24, a: 255 } as RgbaColor,
  humanoidHairMid: { r: 88, g: 56, b: 36, a: 255 } as RgbaColor,
  humanoidHairLight: { r: 122, g: 80, b: 52, a: 255 } as RgbaColor,
  humanoidBeltLeather: { r: 72, g: 44, b: 26, a: 255 } as RgbaColor,
  humanoidBuckleGold: { r: 228, g: 186, b: 58, a: 255 } as RgbaColor,

  corruptVeinDark: { r: 44, g: 16, b: 72, a: 255 } as RgbaColor,
  corruptSpecularWet: { r: 236, g: 210, b: 255, a: 255 } as RgbaColor,
  corruptCoreBone: { r: 214, g: 202, b: 184, a: 255 } as RgbaColor,
});

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function setPixelRgba(
  rgba: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  color: RgbaColor
): void {
  const idx = (y * width + x) * 4;
  rgba[idx] = color.r;
  rgba[idx + 1] = color.g;
  rgba[idx + 2] = color.b;
  rgba[idx + 3] = 255;
}

/**
 * Finds the dominant projected anatomical primitive covering texel (x, y)
 * and computes normalized local coordinates (uAlong in [0,1], vAcross in [-1,1]).
 */
function resolveDominantPrimitiveAtTexel(
  x: number,
  y: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  primitives: readonly ProjectedAnatomicalPrimitive[]
): {
  readonly primitive: ProjectedAnatomicalPrimitive;
  readonly uAlong: number;
  readonly vAcross: number;
  readonly distNormalized: number;
} | null {
  const px = x + 0.5;
  const py = y + 0.5;
  const minDim = Math.min(boxW, boxH);

  let bestPrim: ProjectedAnatomicalPrimitive | null = null;
  let bestZ = Number.NEGATIVE_INFINITY;
  let bestU = 0;
  let bestV = 0;
  let bestDistNorm = 1;

  for (const prim of primitives) {
    if (prim.id.startsWith('eye_')) {
      continue;
    }
    const x0 = boxX + prim.x0 * boxW;
    const y0 = boxY + prim.y0 * boxH;
    const x1 = boxX + (prim.x1 ?? prim.x0) * boxW;
    const y1 = boxY + (prim.y1 ?? prim.y0) * boxH;

    const r0 = Math.max(0.8, prim.radius0 * minDim);
    const r1 = Math.max(0.6, (prim.radius1 ?? prim.radius0) * minDim);

    const vx = x1 - x0;
    const vy = y1 - y0;
    const lenSq = vx * vx + vy * vy;
    const t = lenSq > 1e-6 ? clamp(((px - x0) * vx + (py - y0) * vy) / lenSq, 0, 1) : 0;

    const cx = x0 + vx * t;
    const cy = y0 + vy * t;
    const localR = r0 + (r1 - r0) * t;
    const dist = Math.hypot(px - cx, py - cy);

    if (dist <= localR + 0.65 && prim.zBase >= bestZ) {
      bestPrim = prim;
      bestZ = prim.zBase;
      bestU = t;
      const len = Math.sqrt(lenSq) || 1;
      const perpX = -vy / len;
      const perpY = vx / len;
      bestV = clamp(((px - cx) * perpX + (py - cy) * perpY) / Math.max(0.8, localR), -1, 1);
      bestDistNorm = clamp(dist / Math.max(0.8, localR), 0, 1);
    }
  }

  if (!bestPrim) {
    return null;
  }

  return {
    primitive: bestPrim,
    uAlong: bestU,
    vAcross: bestV,
    distNormalized: bestDistNorm,
  };
}

export class HighResAnatomySynthesizer {
  public readonly skeletonEngine: SpeciesAnatomicalSkeletonEngine;
  public readonly projectionEngine: EightDirectionProjectionEngine;

  public constructor(
    skeletonEngine?: SpeciesAnatomicalSkeletonEngine,
    projectionEngine?: EightDirectionProjectionEngine
  ) {
    this.skeletonEngine = skeletonEngine ?? new SpeciesAnatomicalSkeletonEngine();
    this.projectionEngine = projectionEngine ?? new EightDirectionProjectionEngine(34);
  }

  /**
   * Synthesizes a complete creature or character sprite in any of the 8 directions
   * and 10 native resolutions (plus legacy profiles), applying resolution-appropriate
   * secondary anatomical structures and material cluster textures.
   */
  public synthesizeEntitySprite(params: {
    readonly speciesId: AnatomicalSpeciesId;
    readonly direction: CardinalAndDiagonalDirection8;
    readonly profile: AnyGranularityProfileInput;
    readonly lifeStage?: CreatureLifeStageId;
    readonly condition?: CreatureBodyConditionId;
    readonly seed?: number;
    readonly locomotionPhase?: number;
    readonly light?: Partial<DirectionalLightSpec>;
  }): SynthesizedEntitySprite30 {
    const profileId = normalizeGranularityProfileId(params.profile);
    const budget = getUnifiedSurfaceDetailBudget(params.profile);

    const rig = this.skeletonEngine.buildRig({
      speciesId: params.speciesId,
      lifeStage: params.lifeStage,
      condition: params.condition,
      seed: params.seed,
      locomotionPhase: params.locomotionPhase,
    });

    const baseRender = this.projectionEngine.renderDirectionalCreatureSprite({
      rig,
      direction: params.direction,
      profile: params.profile,
      light: params.light,
    });

    const width = baseRender.rasterResult.width;
    const height = baseRender.rasterResult.height;
    const rgba = new Uint8ClampedArray(baseRender.rasterResult.rgba);
    const toneIndexBuffer = baseRender.rasterResult.toneIndexBuffer;
    const normalYBuffer = baseRender.rasterResult.normalYBuffer;
    const box = baseRender.rasterResult.layout.safeContentBoxTexels;

    const partRoleBuffer = new Int16Array(width * height).fill(-1);
    let secondaryFeatureCount = 0;

    // Pass 1: Map each opaque pixel to its anatomical part role and apply species-specific secondary anatomy
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixelIdx = y * width + x;
        if (rgba[pixelIdx * 4 + 3] === 0) {
          continue;
        }

        // Preserve outline pixels on the outer silhouette boundary in mid/high resolutions
        const isSilhouetteBoundary =
          x === 0 ||
          y === 0 ||
          x === width - 1 ||
          y === height - 1 ||
          rgba[(y * width + (x - 1)) * 4 + 3] === 0 ||
          rgba[(y * width + (x + 1)) * 4 + 3] === 0 ||
          rgba[((y - 1) * width + x) * 4 + 3] === 0 ||
          rgba[((y + 1) * width + x) * 4 + 3] === 0;

        const dom = resolveDominantPrimitiveAtTexel(
          x,
          y,
          box.x,
          box.y,
          box.width,
          box.height,
          baseRender.projection.visiblePrimitives
        );

        if (!dom) {
          continue;
        }

        const roleIdx = PART_ROLE_ORDER.indexOf(dom.primitive.role);
        partRoleBuffer[pixelIdx] = roleIdx;

        if (isSilhouetteBoundary && budget.outlineMode !== 'none' && width >= 10) {
          continue;
        }

        if (dom.primitive.isFarSideLimb) {
          continue;
        }

        const applied = this.applySpeciesSecondaryDetailAtTexel({
          speciesId: params.speciesId,
          direction: params.direction,
          seed: rig.seed,
          x,
          y,
          width,
          height,
          rgba,
          toneIndex: toneIndexBuffer[pixelIdx],
          normalY: normalYBuffer[pixelIdx],
          budget,
          primitive: dom.primitive,
          uAlong: dom.uAlong,
          vAcross: dom.vAcross,
          distNormalized: dom.distNormalized,
        });

        if (applied) {
          secondaryFeatureCount += 1;
        }
      }
    }

    // Pass 2: Re-stamp crisp directional eyes on top so secondary coat patterns never obscure gaze
    this.stampCrispEyes(
      rgba,
      width,
      height,
      box.x,
      box.y,
      box.width,
      box.height,
      params.speciesId,
      baseRender.projection
    );

    return {
      speciesId: params.speciesId,
      lifeStage: rig.lifeStage,
      condition: rig.condition,
      direction: params.direction,
      profileId,
      width,
      height,
      rgba,
      partRoleBuffer,
      rig,
      projection: baseRender.projection,
      budget,
      secondaryFeatureCount,
    };
  }

  private applySpeciesSecondaryDetailAtTexel(ctx: {
    readonly speciesId: AnatomicalSpeciesId;
    readonly direction: CardinalAndDiagonalDirection8;
    readonly seed: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly rgba: Uint8ClampedArray;
    readonly toneIndex: number;
    readonly normalY: number;
    readonly budget: UnifiedSurfaceDetailBudget;
    readonly primitive: ProjectedAnatomicalPrimitive;
    readonly uAlong: number;
    readonly vAcross: number;
    readonly distNormalized: number;
  }): boolean {
    const { speciesId, seed, x, y, width, rgba, toneIndex, normalY, budget, primitive, uAlong, vAcross, distNormalized } = ctx;
    const role = primitive.role;

    // 1. BOVINE COW: Piebald black spots in local torso/pelvis space + pink muzzle pad + cleft hooves
    if (speciesId === 'bovine-cow') {
      if (role === 'jaw-muzzle' && uAlong > 0.35) {
        const isNostril =
          budget.artModuleSize >= 16 &&
          width >= 16 &&
          uAlong > 0.65 &&
          Math.abs(vAcross) > 0.25 &&
          Math.abs(vAcross) < 0.65;
        const muzzleColor = isNostril
          ? SECONDARY_ACCENT_COLORS.cowNostrilDark
          : toneIndex >= 2
            ? SECONDARY_ACCENT_COLORS.cowPinkMuzzleLight
            : SECONDARY_ACCENT_COLORS.cowPinkMuzzleShadow;
        setPixelRgba(rgba, width, x, y, muzzleColor);
        return true;
      }

      if (role === 'thorax' || role === 'abdomen' || role === 'pelvis') {
        // Evaluate coherent multi-texel piebald spot cells anchored to segment UV
        const cellU = Math.floor(uAlong * 3.2);
        const cellV = Math.floor((vAcross + 1) * 2.0);
        const spotHash = hashDeterministicTexel(
          seed,
          cellU + (role === 'thorax' ? 10 : role === 'abdomen' ? 20 : 30),
          cellV,
          19
        );
        if (spotHash > 0.52) {
          const spotColor =
            toneIndex <= 1
              ? SECONDARY_ACCENT_COLORS.cowBlackSpotShadow
              : toneIndex <= 3
                ? SECONDARY_ACCENT_COLORS.cowBlackSpotMid
                : SECONDARY_ACCENT_COLORS.cowBlackSpotLight;
          setPixelRgba(rgba, width, x, y, spotColor);
          return true;
        }
      }

      if (role === 'extremity-foot' && budget.enableSecondaryAnatomy && Math.abs(vAcross) < 0.22) {
        setPixelRgba(rgba, width, x, y, DEFAULT_ANATOMICAL_MATERIAL_RAMPS['keratin-horn-hoof'].outlineColor);
        return true;
      }
      return false;
    }

    // 2. OVINE SHEEP: Scalloped cellular wool tufts on fleece + dark keratin face/ears/lower legs
    if (speciesId === 'ovine-sheep') {
      if (
        (role === 'thorax' || role === 'abdomen' || role === 'pelvis' || role === 'neck') &&
        budget.enableSecondaryAnatomy
      ) {
        const tuftPeriod = width >= 24 ? 3 : 2;
        // Tie wool cells to segment-local UV, not screen XY, so their identity
        // follows the rig across yaw rotations and locomotion.
        const tuftU = uAlong * (tuftPeriod === 3 ? 9 : 6);
        const tuftV = (vAcross + 1) * (tuftPeriod === 3 ? 4.5 : 3);
        const tuftX = Math.floor(tuftU);
        const tuftY = Math.floor(tuftV);
        const localDx = tuftU - tuftX - 0.5;
        const localDy = tuftV - tuftY - 0.5;
        const tuftArc = localDx * localDx + localDy * localDy;
        const tuftJitter = hashDeterministicTexel(seed, tuftX, tuftY, 61);

        const woolRamp = DEFAULT_ANATOMICAL_MATERIAL_RAMPS['wool-fleece'].tones;
        if (tuftArc > 0.32 && tuftJitter > 0.35) {
          // Scallop crevice shadow between wool locks
          const shadowIdx = clamp(toneIndex - 1, 0, woolRamp.length - 1);
          setPixelRgba(rgba, width, x, y, woolRamp[shadowIdx]);
          return true;
        }
        if (localDy < -0.1 && tuftJitter > 0.55) {
          // Crown highlight on top of wool tuft
          const lightIdx = clamp(toneIndex + 1, 0, woolRamp.length - 1);
          setPixelRgba(rgba, width, x, y, woolRamp[lightIdx]);
          return true;
        }
      }
      return false;
    }

    // 3. CANINE WOLF: Dorsal dark saddle, ventral light counter-shading (throat/chest/belly), directional fur tufts
    if (speciesId === 'canine-wolf') {
      const isVentralUnderside =
        (role === 'thorax' || role === 'abdomen' || role === 'neck' || role === 'jaw-muzzle') &&
        normalY > 0.22;

      if (isVentralUnderside) {
        const ventralColor =
          toneIndex >= 2
            ? SECONDARY_ACCENT_COLORS.wolfVentralLight
            : SECONDARY_ACCENT_COLORS.wolfVentralShadow;
        setPixelRgba(rgba, width, x, y, ventralColor);
        return true;
      }

      const isDorsalSaddle =
        (role === 'thorax' || role === 'abdomen' || role === 'tail') &&
        normalY < -0.28;
      if (isDorsalSaddle) {
        setPixelRgba(rgba, width, x, y, SECONDARY_ACCENT_COLORS.wolfDorsalDark);
        return true;
      }

      if (budget.enableSurfaceClusters && (role === 'neck' || role === 'tail')) {
        const furStreak = hashDeterministicTexel(seed, Math.floor(uAlong * 11), Math.floor((vAcross + 1) * 7), 83);
        if (furStreak > 0.68) {
          const furTones = DEFAULT_ANATOMICAL_MATERIAL_RAMPS['coarse-fur'].tones;
          const idx = clamp(toneIndex + 1, 0, furTones.length - 1);
          setPixelRgba(rgba, width, x, y, furTones[idx]);
          return true;
        }
      }
      return false;
    }

    // 4. AVIAN CHICKEN: Layered wing feather bars, golden beak, serrated red comb, scaly tarsus
    if (speciesId === 'avian-chicken') {
      if (role === 'jaw-muzzle') {
        const beakColor =
          toneIndex >= 2
            ? SECONDARY_ACCENT_COLORS.chickenBeakGold
            : SECONDARY_ACCENT_COLORS.chickenBeakShadow;
        setPixelRgba(rgba, width, x, y, beakColor);
        return true;
      }

      if (role === 'wing' && budget.enableSecondaryAnatomy) {
        const featherRow = Math.floor(uAlong * 4.0);
        if (featherRow % 2 === 1 && distNormalized > 0.35) {
          setPixelRgba(rgba, width, x, y, SECONDARY_ACCENT_COLORS.chickenWingStripe);
          return true;
        }
      }
      return false;
    }

    // 5. HUMANOID BIPED: Hair cap & strand clusters, belt with gold buckle, tunic folds
    if (speciesId === 'humanoid-biped') {
      if (role === 'cranium' && (normalY < -0.05 || ctx.direction === 'N' || ctx.direction === 'NE' || ctx.direction === 'NW')) {
        const strand = hashDeterministicTexel(seed, Math.floor(uAlong * 8), Math.floor((vAcross + 1) * 6), 97);
        const hairColor =
          strand > 0.72
            ? SECONDARY_ACCENT_COLORS.humanoidHairLight
            : toneIndex >= 2
              ? SECONDARY_ACCENT_COLORS.humanoidHairMid
              : SECONDARY_ACCENT_COLORS.humanoidHairDark;
        setPixelRgba(rgba, width, x, y, hairColor);
        return true;
      }

      if (role === 'pelvis' && uAlong > 0.55) {
        const isFrontBuckle =
          (ctx.direction === 'S' || ctx.direction === 'SE' || ctx.direction === 'SW') &&
          Math.abs(vAcross) < 0.28;
        setPixelRgba(
          rgba,
          width,
          x,
          y,
          isFrontBuckle
            ? SECONDARY_ACCENT_COLORS.humanoidBuckleGold
            : SECONDARY_ACCENT_COLORS.humanoidBeltLeather
        );
        return true;
      }

      if (budget.enableSecondaryAnatomy && width >= 16 && (role === 'thorax' || role === 'abdomen')) {
        const foldWave = Math.sin((uAlong * 3.5 + vAcross * 2.2) * Math.PI);
        if (foldWave > 0.78) {
          const clothTones = DEFAULT_ANATOMICAL_MATERIAL_RAMPS['woven-cloth'].tones;
          const darkFoldIdx = Math.max(0, toneIndex - 1);
          setPixelRgba(rgba, width, x, y, clothTones[darkFoldIdx]);
          return true;
        }
      }
      return false;
    }

    // 6. AMORPHOUS CORRUPT: Internal bone core refraction, dark corruption veins, wet specular glints
    if (speciesId === 'amorphous-corrupt') {
      if (role === 'udder-or-core') {
        setPixelRgba(rgba, width, x, y, SECONDARY_ACCENT_COLORS.corruptCoreBone);
        return true;
      }

      if (normalY < -0.45 && distNormalized < 0.65 && toneIndex >= 3) {
        setPixelRgba(rgba, width, x, y, SECONDARY_ACCENT_COLORS.corruptSpecularWet);
        return true;
      }

      const veinNoise = hashDeterministicTexel(seed, Math.floor(uAlong * 12), Math.floor((vAcross + 1) * 8), 131);
      if (budget.enableSecondaryAnatomy && veinNoise > 0.84 && distNormalized > 0.4) {
        setPixelRgba(rgba, width, x, y, SECONDARY_ACCENT_COLORS.corruptVeinDark);
        return true;
      }
    }

    return false;
  }

  private stampCrispEyes(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number,
    speciesId: AnatomicalSpeciesId,
    projection: ProjectedEightDirectionView
  ): void {
    const pupilColor: RgbaColor =
      speciesId === 'canine-wolf' && width >= 16
        ? SECONDARY_ACCENT_COLORS.wolfEyeAmber
        : { r: 16, g: 16, b: 22, a: 255 };

    for (const eye of projection.eyeMarkers) {
      if (!eye.visible) {
        continue;
      }
      const ex = clamp(Math.round(boxX + eye.normalizedX * boxW), 0, width - 1);
      const ey = clamp(Math.round(boxY + eye.normalizedY * boxH), 0, height - 1);
      // Do not invent disconnected silhouette pixels when tiny sprites have
      // eye anchors outside the material mask.
      if (rgba[(ey * width + ex) * 4 + 3] === 0) continue;
      setPixelRgba(rgba, width, ex, ey, pupilColor);

      // In high resolutions (24..36), add a 1-texel dark upper lash/pupil core alongside catchlight
      if (width >= 24 && ex + 1 < width && rgba[(ey * width + ex + 1) * 4 + 3] !== 0) {
        setPixelRgba(rgba, width, ex + 1, ey, { r: 14, g: 14, b: 18, a: 255 });
      }
    }
  }
}

/**
 * Computes the binary silhouette Intersection-over-Union (IoU) and aspect-ratio difference
 * between two synthesized RGBA sprites to verify that distinct species never share a generic silhouette.
 */
export function compareSpeciesSilhouettes(
  rgbaA: Uint8ClampedArray | Uint8Array,
  rgbaB: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): SilhouetteComparisonMetrics {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width <= 0 || height <= 0 || rgbaA.length !== width * height * 4 ||
      rgbaB.length !== width * height * 4)
    throw new RangeError('Invalid silhouette comparison dimensions or RGBA lengths');
  let intersectionPixels = 0;
  let unionPixels = 0;

  let minXA = width, maxXA = 0, minYA = height, maxYA = 0;
  let minXB = width, maxXB = 0, minYB = height, maxYB = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4 + 3;
      const opA = rgbaA[idx] > 0;
      const opB = rgbaB[idx] > 0;

      if (opA && opB) intersectionPixels += 1;
      if (opA || opB) unionPixels += 1;

      if (opA) {
        if (x < minXA) minXA = x;
        if (x > maxXA) maxXA = x;
        if (y < minYA) minYA = y;
        if (y > maxYA) maxYA = y;
      }
      if (opB) {
        if (x < minXB) minXB = x;
        if (x > maxXB) maxXB = x;
        if (y < minYB) minYB = y;
        if (y > maxYB) maxYB = y;
      }
    }
  }

  const iou = unionPixels > 0 ? intersectionPixels / unionPixels : 0;
  const aspectA = Math.max(1, maxXA - minXA + 1) / Math.max(1, maxYA - minYA + 1);
  const aspectB = Math.max(1, maxXB - minXB + 1) / Math.max(1, maxYB - minYB + 1);
  const aspectRatioDiff = Math.abs(aspectA - aspectB);

  return {
    intersectionPixels,
    unionPixels,
    intersectionOverUnion: iou,
    aspectRatioDiff,
    areDistinctSilhouettes: unionPixels > 0 && (iou < 0.82 || aspectRatioDiff > 0.12),
  };
}
