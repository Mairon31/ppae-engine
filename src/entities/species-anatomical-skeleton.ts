/**
 * PPAE Engine 3.0 — Phase 3A: Species-Specific 2.5D Anatomical Skeletons & Life Stages
 *
 * Replaces the generic shared creature silhouette (Screenshot #2 / #3) with a true
 * 2.5D osteological and volumetric rig in local creature coordinates:
 *   +X : Anterior (tail -> head)
 *   +Y : Lateral Right (left flank -> right flank)
 *   +Z : Dorsal Up (ground plane Z=0 -> top of cranium/withers)
 *
 * Enforces authentic non-uniform biological allometry across life stages (offspring,
 * juvenile, adult, elder, alpha) and body builds/conditions (standard, small, giant,
 * robust, slender, sick, wounded, corrupted, mutated).
 */

import { hashDeterministicTexel } from '../rasterizer/surface-cluster-rasterizer';

export type AnatomicalSpeciesId =
  | 'bovine-cow'
  | 'ovine-sheep'
  | 'canine-wolf'
  | 'avian-chicken'
  | 'humanoid-biped'
  | 'amorphous-corrupt';

export type CreatureLifeStageId =
  | 'offspring'
  | 'juvenile'
  | 'adult'
  | 'elder'
  | 'alpha';

export type CreatureBodyConditionId =
  | 'standard'
  | 'small'
  | 'giant'
  | 'robust'
  | 'slender'
  | 'sick'
  | 'wounded'
  | 'corrupted'
  | 'mutated';

export type AnatomicalMaterialKind =
  | 'spotted-hide'
  | 'wool-fleece'
  | 'coarse-fur'
  | 'plumage-feathers'
  | 'keratin-horn-hoof'
  | 'avian-comb'
  | 'humanoid-skin'
  | 'woven-cloth'
  | 'corrupt-gel';

export type AnatomicalPartRole =
  | 'cranium'
  | 'jaw-muzzle'
  | 'neck'
  | 'thorax'
  | 'abdomen'
  | 'pelvis'
  | 'limb-upper'
  | 'limb-lower'
  | 'extremity-foot'
  | 'wing'
  | 'ear'
  | 'horn-or-crest'
  | 'tail'
  | 'udder-or-core'
  | 'mutation-growth';

export type AccessoryAnchorId =
  | 'head_top'
  | 'muzzle_front'
  | 'neck_collar'
  | 'back_saddle'
  | 'chest_front'
  | 'hand_grip_right'
  | 'hand_grip_left'
  | 'tail_tip';

export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AnatomicalSegment3D {
  readonly id: string;
  readonly role: AnatomicalPartRole;
  readonly parentId: string | null;
  readonly side: 'center' | 'left' | 'right';
  readonly limbIndex?: number; // 0=FL, 1=FR, 2=HL, 3=HR
  readonly startPoint: Vector3D;
  readonly endPoint: Vector3D;
  readonly radiusStart: number;
  readonly radiusEnd: number;
  readonly material: AnatomicalMaterialKind;
  readonly smoothUnionFactor: number;
}

export interface GroundSupportContact {
  readonly limbId: string;
  readonly side: 'left' | 'right' | 'center';
  readonly position: Vector3D;
  readonly contactRadius: number;
  readonly isGrounded: boolean;
}

export interface AnatomicalAccessoryAnchor {
  readonly id: AccessoryAnchorId;
  readonly attachedSegmentId: string;
  readonly position: Vector3D;
  readonly forwardNormal: Vector3D;
}

export interface AnatomicalProportionMetrics {
  readonly totalLengthX: number;
  readonly maxWidthY: number;
  readonly standingHeightZ: number;
  readonly headVolume: number;
  readonly torsoVolume: number;
  readonly headToTorsoRatio: number;
  readonly thoraxToAbdomenRatio: number;
  readonly legLengthToHeightRatio: number;
  readonly hornOrCrestLength: number;
}

export interface GeneratedAnatomicalRig25D {
  readonly speciesId: AnatomicalSpeciesId;
  readonly lifeStage: CreatureLifeStageId;
  readonly condition: CreatureBodyConditionId;
  readonly seed: number;
  readonly locomotionPhase: number;
  readonly segments: readonly AnatomicalSegment3D[];
  readonly anchors: Readonly<Record<AccessoryAnchorId, AnatomicalAccessoryAnchor>>;
  readonly supportContacts: readonly GroundSupportContact[];
  /** Ground-plane convex hull of stance contacts, in local X/Y coordinates. */
  readonly supportPolygon: readonly Vector3D[];
  readonly centerOfMass: Vector3D;
  readonly boundingBox3D: {
    readonly min: Vector3D;
    readonly max: Vector3D;
  };
  readonly proportions: AnatomicalProportionMetrics;
}

interface AllometricStageMultipliers {
  readonly overallScale: number;
  readonly craniumScale: number;
  readonly muzzleLengthScale: number;
  readonly neckScale: number;
  readonly thoraxRadiusScale: number;
  readonly abdomenRadiusScale: number;
  readonly torsoLengthScale: number;
  readonly limbLengthScale: number;
  readonly limbThicknessScale: number;
  readonly hornOrCrestScale: number;
  readonly spineDorsalSagZ: number;
}

const LIFE_STAGE_ALLOMETRY: Readonly<
  Record<CreatureLifeStageId, AllometricStageMultipliers>
> = Object.freeze({
  // Authentic neoteny: larger cranium, shorter muzzle, shorter torso, zero/bud horns
  offspring: Object.freeze({
    overallScale: 0.56,
    craniumScale: 1.34,
    muzzleLengthScale: 0.68,
    neckScale: 0.82,
    thoraxRadiusScale: 0.88,
    abdomenRadiusScale: 0.92,
    torsoLengthScale: 0.76,
    limbLengthScale: 0.86,
    limbThicknessScale: 0.84,
    hornOrCrestScale: 0.12,
    spineDorsalSagZ: 0.0,
  }),
  juvenile: Object.freeze({
    overallScale: 0.78,
    craniumScale: 1.15,
    muzzleLengthScale: 0.84,
    neckScale: 0.92,
    thoraxRadiusScale: 0.94,
    abdomenRadiusScale: 0.95,
    torsoLengthScale: 0.88,
    limbLengthScale: 0.95,
    limbThicknessScale: 0.9,
    hornOrCrestScale: 0.45,
    spineDorsalSagZ: 0.0,
  }),
  adult: Object.freeze({
    overallScale: 1.0,
    craniumScale: 1.0,
    muzzleLengthScale: 1.0,
    neckScale: 1.0,
    thoraxRadiusScale: 1.0,
    abdomenRadiusScale: 1.0,
    torsoLengthScale: 1.0,
    limbLengthScale: 1.0,
    limbThicknessScale: 1.0,
    hornOrCrestScale: 1.0,
    spineDorsalSagZ: 0.0,
  }),
  // Elder: slight spinal sway/kyphosis, leaner abdomen, full weathered horns
  elder: Object.freeze({
    overallScale: 0.97,
    craniumScale: 1.02,
    muzzleLengthScale: 1.04,
    neckScale: 0.95,
    thoraxRadiusScale: 0.94,
    abdomenRadiusScale: 0.86,
    torsoLengthScale: 1.0,
    limbLengthScale: 0.96,
    limbThicknessScale: 0.88,
    hornOrCrestScale: 1.12,
    spineDorsalSagZ: -0.04,
  }),
  // Alpha: hypertrophied chest/withers, thick neck ruff, massive horns/crest, athletic waist
  alpha: Object.freeze({
    overallScale: 1.18,
    craniumScale: 1.08,
    muzzleLengthScale: 1.14,
    neckScale: 1.24,
    thoraxRadiusScale: 1.28,
    abdomenRadiusScale: 0.96,
    torsoLengthScale: 1.08,
    limbLengthScale: 1.08,
    limbThicknessScale: 1.25,
    hornOrCrestScale: 1.65,
    spineDorsalSagZ: 0.03,
  }),
});

interface ConditionModifiers {
  readonly scaleMult: number;
  readonly torsoWidthMult: number;
  readonly limbThickMult: number;
  readonly postureDropZ: number;
  readonly headDroopZ: number;
  readonly addCorruptionGrowths: boolean;
}

const BODY_CONDITION_MODIFIERS: Readonly<
  Record<CreatureBodyConditionId, ConditionModifiers>
> = Object.freeze({
  standard: {
    scaleMult: 1.0,
    torsoWidthMult: 1.0,
    limbThickMult: 1.0,
    postureDropZ: 0.0,
    headDroopZ: 0.0,
    addCorruptionGrowths: false,
  },
  small: {
    scaleMult: 0.84,
    torsoWidthMult: 0.94,
    limbThickMult: 0.92,
    postureDropZ: 0.0,
    headDroopZ: 0.0,
    addCorruptionGrowths: false,
  },
  giant: {
    scaleMult: 1.32,
    torsoWidthMult: 1.14,
    limbThickMult: 1.2,
    postureDropZ: 0.0,
    headDroopZ: 0.0,
    addCorruptionGrowths: false,
  },
  robust: {
    scaleMult: 1.04,
    torsoWidthMult: 1.26,
    limbThickMult: 1.22,
    postureDropZ: 0.0,
    headDroopZ: 0.0,
    addCorruptionGrowths: false,
  },
  slender: {
    scaleMult: 0.98,
    torsoWidthMult: 0.78,
    limbThickMult: 0.82,
    postureDropZ: 0.0,
    headDroopZ: 0.0,
    addCorruptionGrowths: false,
  },
  sick: {
    scaleMult: 0.95,
    torsoWidthMult: 0.74,
    limbThickMult: 0.8,
    postureDropZ: -0.04,
    headDroopZ: -0.08,
    addCorruptionGrowths: false,
  },
  wounded: {
    scaleMult: 1.0,
    torsoWidthMult: 0.92,
    limbThickMult: 0.95,
    postureDropZ: -0.05,
    headDroopZ: -0.06,
    addCorruptionGrowths: false,
  },
  corrupted: {
    scaleMult: 1.06,
    torsoWidthMult: 1.08,
    limbThickMult: 1.1,
    postureDropZ: -0.02,
    headDroopZ: -0.03,
    addCorruptionGrowths: true,
  },
  mutated: {
    scaleMult: 1.12,
    torsoWidthMult: 1.18,
    limbThickMult: 1.15,
    postureDropZ: 0.02,
    headDroopZ: 0.04,
    addCorruptionGrowths: true,
  },
});

function vec3(x: number, y: number, z: number): Vector3D {
  return { x, y, z };
}

function segmentVolumeApprox(seg: AnatomicalSegment3D): number {
  const dx = seg.endPoint.x - seg.startPoint.x;
  const dy = seg.endPoint.y - seg.startPoint.y;
  const dz = seg.endPoint.z - seg.startPoint.z;
  const len = Math.hypot(dx, dy, dz) + 0.05;
  const rAvg = (seg.radiusStart + seg.radiusEnd) * 0.5;
  return Math.PI * rAvg * rAvg * len;
}

export class SpeciesAnatomicalSkeletonEngine {
  /**
   * Builds a complete, species-specific 2.5D anatomical skeleton at a given
   * life stage, body condition, deterministic seed, and normalized locomotion phase in [0, 1).
   */
  public buildRig(params: {
    readonly speciesId: AnatomicalSpeciesId;
    readonly lifeStage?: CreatureLifeStageId;
    readonly condition?: CreatureBodyConditionId;
    readonly seed?: number;
    readonly locomotionPhase?: number;
  }): GeneratedAnatomicalRig25D {
    const speciesId = params.speciesId;
    const lifeStage = params.lifeStage ?? 'adult';
    const condition = params.condition ?? 'standard';
    const seed = (params.seed ?? 2026) >>> 0;
    const locomotionPhase = ((params.locomotionPhase ?? 0) % 1 + 1) % 1;

    const allometry = LIFE_STAGE_ALLOMETRY[lifeStage];
    const cond = BODY_CONDITION_MODIFIERS[condition];

    const seedJitter = (hashDeterministicTexel(seed, 11, 23, 7) - 0.5) * 0.04;
    const S = allometry.overallScale * cond.scaleMult * (1 + seedJitter);

    const segments: AnatomicalSegment3D[] = [];
    const supportContacts: GroundSupportContact[] = [];

    if (
      speciesId === 'bovine-cow' ||
      speciesId === 'ovine-sheep' ||
      speciesId === 'canine-wolf'
    ) {
      this.buildQuadrupedSpeciesSegments(
        speciesId,
        S,
        allometry,
        cond,
        locomotionPhase,
        segments,
        supportContacts
      );
    } else if (speciesId === 'avian-chicken') {
      this.buildAvianChickenSegments(
        S,
        allometry,
        cond,
        locomotionPhase,
        segments,
        supportContacts
      );
    } else if (speciesId === 'humanoid-biped') {
      this.buildHumanoidBipedSegments(
        S,
        allometry,
        cond,
        locomotionPhase,
        segments,
        supportContacts
      );
    } else {
      this.buildAmorphousCorruptSegments(
        S,
        allometry,
        cond,
        locomotionPhase,
        seed,
        segments,
        supportContacts
      );
    }

    if (cond.addCorruptionGrowths) {
      this.appendCorruptionOrMutationGrowths(speciesId, S, condition, seed, segments);
    }

    const anchors = this.computeAccessoryAnchors(segments);
    const supportPolygon = this.computeSupportPolygon(supportContacts);
    const { centerOfMass, boundingBox3D, proportions } =
      this.computeMetricsAndBounds(segments);

    return {
      speciesId,
      lifeStage,
      condition,
      seed,
      locomotionPhase,
      segments,
      anchors,
      supportContacts,
      supportPolygon,
      centerOfMass,
      boundingBox3D,
      proportions,
    };
  }

  private buildQuadrupedSpeciesSegments(
    speciesId: 'bovine-cow' | 'ovine-sheep' | 'canine-wolf',
    S: number,
    allometry: AllometricStageMultipliers,
    cond: ConditionModifiers,
    phase: number,
    segments: AnatomicalSegment3D[],
    supportContacts: GroundSupportContact[]
  ): void {
    // Species-specific base osteological ratios
    const isCow = speciesId === 'bovine-cow';
    const isSheep = speciesId === 'ovine-sheep';
    const isWolf = speciesId === 'canine-wolf';

    const coatMaterial: AnatomicalMaterialKind = isCow
      ? 'spotted-hide'
      : isSheep
        ? 'wool-fleece'
        : 'coarse-fur';

    const legHeight =
      (isCow ? 0.34 : isSheep ? 0.27 : 0.36) *
      S *
      allometry.limbLengthScale +
      cond.postureDropZ * S;

    const torsoHalfLen =
      (isCow ? 0.33 : isSheep ? 0.26 : 0.29) *
      S *
      allometry.torsoLengthScale;

    const thoraxRadius =
      (isCow ? 0.19 : isSheep ? 0.23 : 0.155) *
      S *
      allometry.thoraxRadiusScale *
      cond.torsoWidthMult;

    // Wolves have an athletic tucked abdomen; cows have a deep barrel; sheep have a round fleece
    const abdomenRadius =
      (isCow ? 0.205 : isSheep ? 0.24 : 0.105) *
      S *
      allometry.abdomenRadiusScale *
      cond.torsoWidthMult;

    const pelvisRadius =
      (isCow ? 0.175 : isSheep ? 0.21 : 0.13) *
      S *
      allometry.abdomenRadiusScale *
      cond.torsoWidthMult;

    const spineZ = legHeight + thoraxRadius * 0.72;
    const withersRaise = (isCow ? 0.045 : isWolf ? 0.03 : 0.015) * S * allometry.thoraxRadiusScale;

    const pelvisPos = vec3(-torsoHalfLen, 0, spineZ);
    const abdomenPos = vec3(
      -torsoHalfLen * 0.15,
      0,
      spineZ + allometry.spineDorsalSagZ * S
    );
    const thoraxPos = vec3(torsoHalfLen * 0.85, 0, spineZ + withersRaise);

    // 1. Pelvis -> Abdomen -> Thorax
    segments.push({
      id: 'pelvis',
      role: 'pelvis',
      parentId: null,
      side: 'center',
      startPoint: pelvisPos,
      endPoint: abdomenPos,
      radiusStart: pelvisRadius,
      radiusEnd: abdomenRadius,
      material: coatMaterial,
      smoothUnionFactor: 0.08,
    });

    segments.push({
      id: 'abdomen',
      role: 'abdomen',
      parentId: 'pelvis',
      side: 'center',
      startPoint: abdomenPos,
      endPoint: thoraxPos,
      radiusStart: abdomenRadius,
      radiusEnd: thoraxRadius,
      material: coatMaterial,
      smoothUnionFactor: 0.09,
    });

    segments.push({
      id: 'thorax',
      role: 'thorax',
      parentId: 'abdomen',
      side: 'center',
      startPoint: vec3(torsoHalfLen * 0.4, 0, spineZ + withersRaise * 0.5),
      endPoint: vec3(torsoHalfLen, 0, spineZ + withersRaise),
      radiusStart: thoraxRadius,
      radiusEnd: thoraxRadius * 0.94,
      material: coatMaterial,
      smoothUnionFactor: 0.08,
    });

    // Optional dairy udder on adult/elder bovine-cow
    if (isCow && allometry.overallScale >= 0.9) {
      segments.push({
        id: 'udder',
        role: 'udder-or-core',
        parentId: 'pelvis',
        side: 'center',
        startPoint: vec3(-torsoHalfLen * 0.55, 0, spineZ - abdomenRadius * 0.85),
        endPoint: vec3(-torsoHalfLen * 0.35, 0, spineZ - abdomenRadius * 1.05),
        radiusStart: 0.075 * S,
        radiusEnd: 0.065 * S,
        material: 'humanoid-skin',
        smoothUnionFactor: 0.04,
      });
    }

    // 2. Neck -> Cranium -> Jaw/Muzzle
    const neckLen = (isCow ? 0.16 : isSheep ? 0.13 : 0.18) * S * allometry.neckScale;
    const neckAngleZ = (isCow ? 0.08 : isSheep ? 0.11 : 0.14) * S + cond.headDroopZ * S;
    const headBasePos = vec3(
      torsoHalfLen + neckLen,
      0,
      spineZ + withersRaise + neckAngleZ
    );

    const neckRadius =
      (isCow ? 0.115 : isSheep ? 0.13 : 0.105) *
      S *
      allometry.neckScale *
      cond.torsoWidthMult;

    segments.push({
      id: 'neck',
      role: 'neck',
      parentId: 'thorax',
      side: 'center',
      startPoint: vec3(torsoHalfLen * 0.9, 0, spineZ + withersRaise * 0.8),
      endPoint: headBasePos,
      radiusStart: neckRadius,
      radiusEnd: neckRadius * 0.82,
      material: coatMaterial,
      smoothUnionFactor: 0.06,
    });

    const craniumRadius =
      (isCow ? 0.115 : isSheep ? 0.105 : 0.1) *
      S *
      allometry.craniumScale;
    const craniumEnd = vec3(
      headBasePos.x + craniumRadius * 0.65,
      0,
      headBasePos.z + craniumRadius * 0.15
    );

    segments.push({
      id: 'cranium',
      role: 'cranium',
      parentId: 'neck',
      side: 'center',
      startPoint: headBasePos,
      endPoint: craniumEnd,
      radiusStart: craniumRadius,
      radiusEnd: craniumRadius * 0.92,
      material: isSheep ? 'keratin-horn-hoof' : coatMaterial,
      smoothUnionFactor: 0.04,
    });

    // Muzzle: broad & squared for cow, rounded Roman nose for sheep, long tapered snout for wolf
    const muzzleLen =
      (isCow ? 0.13 : isSheep ? 0.1 : 0.165) *
      S *
      allometry.muzzleLengthScale *
      allometry.craniumScale;
    const muzzleTip = vec3(
      craniumEnd.x + muzzleLen,
      0,
      craniumEnd.z - (isCow ? 0.035 : isSheep ? 0.04 : 0.015) * S
    );

    segments.push({
      id: 'jaw-muzzle',
      role: 'jaw-muzzle',
      parentId: 'cranium',
      side: 'center',
      startPoint: craniumEnd,
      endPoint: muzzleTip,
      radiusStart: craniumRadius * (isCow ? 0.82 : isSheep ? 0.72 : 0.68),
      radiusEnd: craniumRadius * (isCow ? 0.68 : isSheep ? 0.48 : 0.36),
      material: isCow ? 'humanoid-skin' : isSheep ? 'keratin-horn-hoof' : coatMaterial,
      smoothUnionFactor: 0.03,
    });

    // 3. Ears (Erect dorsal triangles for wolf, lateral for cow, drooping for sheep)
    const earSpreadY = craniumRadius * 0.85;
    const earLen = (isWolf ? 0.1 : isCow ? 0.085 : 0.08) * S * allometry.craniumScale;
    for (const side of ['left', 'right'] as const) {
      const signY = side === 'right' ? 1 : -1;
      const earBase = vec3(
        headBasePos.x + craniumRadius * 0.2,
        signY * earSpreadY,
        craniumEnd.z + craniumRadius * (isWolf ? 0.55 : 0.2)
      );
      const earTip = vec3(
        earBase.x + (isWolf ? 0.02 : -0.02) * S,
        signY * (earSpreadY + (isWolf ? 0.025 : earLen * 0.85)),
        earBase.z + (isWolf ? earLen : isSheep ? -earLen * 0.5 : -earLen * 0.15)
      );
      segments.push({
        id: `ear_${side}`,
        role: 'ear',
        parentId: 'cranium',
        side,
        startPoint: earBase,
        endPoint: earTip,
        radiusStart: 0.036 * S * allometry.craniumScale,
        radiusEnd: 0.014 * S * allometry.craniumScale,
        material: coatMaterial,
        smoothUnionFactor: 0.01,
      });
    }

    // 4. Horns (Bovine horns or Alpha ovine horns)
    if (isCow || (isSheep && allometry.hornOrCrestScale > 1.2)) {
      const hornLen = 0.11 * S * allometry.hornOrCrestScale;
      for (const side of ['left', 'right'] as const) {
        const signY = side === 'right' ? 1 : -1;
        const hornBase = vec3(
          headBasePos.x + craniumRadius * 0.1,
          signY * craniumRadius * 0.72,
          craniumEnd.z + craniumRadius * 0.62
        );
        const hornTip = vec3(
          hornBase.x + hornLen * 0.45,
          signY * (craniumRadius * 0.72 + hornLen * 0.65),
          hornBase.z + hornLen * 0.75
        );
        segments.push({
          id: `horn_${side}`,
          role: 'horn-or-crest',
          parentId: 'cranium',
          side,
          startPoint: hornBase,
          endPoint: hornTip,
          radiusStart: 0.032 * S,
          radiusEnd: 0.01 * S,
          material: 'keratin-horn-hoof',
          smoothUnionFactor: 0.0,
        });
      }
    }

    // 5. Tail (Long tufted tail for cow, short woolly tail for sheep, bushy tail for wolf)
    const tailLen = (isCow ? 0.24 : isSheep ? 0.11 : 0.26) * S;
    const tailSwayY = Math.sin(phase * Math.PI * 2) * 0.04 * S;
    const tailBase = vec3(pelvisPos.x - pelvisRadius * 0.4, 0, pelvisPos.z + pelvisRadius * 0.2);
    const tailTip = vec3(
      tailBase.x - tailLen * (isWolf ? 0.75 : 0.35),
      tailSwayY,
      tailBase.z - tailLen * (isCow ? 0.85 : isSheep ? 0.65 : 0.45)
    );
    segments.push({
      id: 'tail',
      role: 'tail',
      parentId: 'pelvis',
      side: 'center',
      startPoint: tailBase,
      endPoint: tailTip,
      radiusStart: (isWolf ? 0.065 : isSheep ? 0.055 : 0.03) * S,
      radiusEnd: (isWolf ? 0.045 : isCow ? 0.042 : 0.035) * S,
      material: coatMaterial,
      smoothUnionFactor: 0.02,
    });

    // 6. Four articulated limbs (upper limb -> lower limb -> hoof/paw) with 4-beat gait kinematics
    const limbSpecs: ReadonlyArray<{
      readonly idPrefix: string;
      readonly side: 'left' | 'right';
      readonly isFore: boolean;
      readonly limbIndex: number;
      readonly phaseOffset: number;
    }> = [
      { idPrefix: 'forelimb_left', side: 'left', isFore: true, limbIndex: 0, phaseOffset: 0.0 },
      { idPrefix: 'hindlimb_right', side: 'right', isFore: false, limbIndex: 3, phaseOffset: 0.25 },
      { idPrefix: 'forelimb_right', side: 'right', isFore: true, limbIndex: 1, phaseOffset: 0.5 },
      { idPrefix: 'hindlimb_left', side: 'left', isFore: false, limbIndex: 2, phaseOffset: 0.75 },
    ];

    const limbBaseR =
      (isCow ? 0.068 : isSheep ? 0.052 : 0.058) *
      S *
      allometry.limbThicknessScale *
      cond.limbThickMult;

    for (const spec of limbSpecs) {
      const signY = spec.side === 'right' ? 1 : -1;
      const hipOrShoulderX = spec.isFore ? torsoHalfLen * 0.75 : -torsoHalfLen * 0.82;
      const hipOrShoulderY = signY * (spec.isFore ? thoraxRadius * 0.68 : pelvisRadius * 0.68);
      const hipOrShoulderZ = spineZ - thoraxRadius * 0.15;

      const localPhase = ((phase + spec.phaseOffset) % 1) * Math.PI * 2;
      const strideX = Math.sin(localPhase) * 0.09 * S;
      const footLiftZ = Math.max(0, Math.cos(localPhase)) * 0.06 * S;

      const kneeOrHockX =
        hipOrShoulderX + (spec.isFore ? 0.02 : -0.04) * S + strideX * 0.45;
      const kneeOrHockZ = hipOrShoulderZ * 0.52 + footLiftZ * 0.5;

      const footX = hipOrShoulderX + strideX;
      const footZ = footLiftZ;

      const topPoint = vec3(hipOrShoulderX, hipOrShoulderY, hipOrShoulderZ);
      const midJoint = vec3(kneeOrHockX, hipOrShoulderY, kneeOrHockZ);
      const anklePoint = vec3(footX, hipOrShoulderY, footZ + 0.035 * S);
      const groundPoint = vec3(footX + 0.015 * S, hipOrShoulderY, footZ);

      segments.push({
        id: `${spec.idPrefix}_upper`,
        role: 'limb-upper',
        parentId: spec.isFore ? 'thorax' : 'pelvis',
        side: spec.side,
        limbIndex: spec.limbIndex,
        startPoint: topPoint,
        endPoint: midJoint,
        radiusStart: limbBaseR,
        radiusEnd: limbBaseR * 0.76,
        material: coatMaterial,
        smoothUnionFactor: 0.03,
      });

      segments.push({
        id: `${spec.idPrefix}_lower`,
        role: 'limb-lower',
        parentId: `${spec.idPrefix}_upper`,
        side: spec.side,
        limbIndex: spec.limbIndex,
        startPoint: midJoint,
        endPoint: anklePoint,
        radiusStart: limbBaseR * 0.74,
        radiusEnd: limbBaseR * 0.56,
        material: isSheep ? 'keratin-horn-hoof' : coatMaterial,
        smoothUnionFactor: 0.01,
      });

      segments.push({
        id: `${spec.idPrefix}_foot`,
        role: 'extremity-foot',
        parentId: `${spec.idPrefix}_lower`,
        side: spec.side,
        limbIndex: spec.limbIndex,
        startPoint: anklePoint,
        endPoint: groundPoint,
        radiusStart: limbBaseR * 0.62,
        radiusEnd: limbBaseR * 0.68,
        material: 'keratin-horn-hoof',
        smoothUnionFactor: 0.0,
      });

      supportContacts.push({
        limbId: `${spec.idPrefix}_foot`,
        side: spec.side,
        position: groundPoint,
        contactRadius: limbBaseR * 0.68,
        isGrounded: footLiftZ <= 0.01 * S,
      });
    }
  }

  private buildAvianChickenSegments(
    S: number,
    allometry: AllometricStageMultipliers,
    cond: ConditionModifiers,
    phase: number,
    segments: AnatomicalSegment3D[],
    supportContacts: GroundSupportContact[]
  ): void {
    const legHeight = 0.25 * S * allometry.limbLengthScale + cond.postureDropZ * S;
    const bodyZ = legHeight + 0.14 * S;
    const bodyRadius = 0.175 * S * allometry.thoraxRadiusScale * cond.torsoWidthMult;

    // 1. Keel Thorax & Pelvis
    const pelvisPos = vec3(-0.14 * S * allometry.torsoLengthScale, 0, bodyZ + 0.02 * S);
    const breastPos = vec3(0.15 * S * allometry.torsoLengthScale, 0, bodyZ - 0.01 * S);

    segments.push({
      id: 'pelvis',
      role: 'pelvis',
      parentId: null,
      side: 'center',
      startPoint: pelvisPos,
      endPoint: vec3(0, 0, bodyZ),
      radiusStart: bodyRadius * 0.85,
      radiusEnd: bodyRadius,
      material: 'plumage-feathers',
      smoothUnionFactor: 0.07,
    });

    segments.push({
      id: 'thorax',
      role: 'thorax',
      parentId: 'pelvis',
      side: 'center',
      startPoint: vec3(0, 0, bodyZ),
      endPoint: breastPos,
      radiusStart: bodyRadius,
      radiusEnd: bodyRadius * 0.92,
      material: 'plumage-feathers',
      smoothUnionFactor: 0.07,
    });

    // 2. Upright S-Neck, Cranium, Beak, Comb & Wattle
    const headBobX = Math.sin(phase * Math.PI * 4) * 0.03 * S;
    const headPos = vec3(
      breastPos.x + 0.08 * S + headBobX,
      0,
       breastPos.z + 0.19 * S * allometry.neckScale + cond.headDroopZ * S
    );

    segments.push({
      id: 'neck',
      role: 'neck',
      parentId: 'thorax',
      side: 'center',
      startPoint: breastPos,
      endPoint: headPos,
      radiusStart: 0.085 * S * allometry.neckScale,
      radiusEnd: 0.065 * S * allometry.craniumScale,
      material: 'plumage-feathers',
      smoothUnionFactor: 0.05,
    });

    const craniumR = 0.078 * S * allometry.craniumScale;
    segments.push({
      id: 'cranium',
      role: 'cranium',
      parentId: 'neck',
      side: 'center',
      startPoint: headPos,
      endPoint: vec3(headPos.x + craniumR * 0.4, 0, headPos.z + craniumR * 0.2),
      radiusStart: craniumR,
      radiusEnd: craniumR * 0.9,
      material: 'plumage-feathers',
      smoothUnionFactor: 0.03,
    });

    // Beak
    const beakLen = 0.075 * S * allometry.muzzleLengthScale;
    segments.push({
      id: 'jaw-muzzle',
      role: 'jaw-muzzle',
      parentId: 'cranium',
      side: 'center',
      startPoint: vec3(headPos.x + craniumR * 0.6, 0, headPos.z),
      endPoint: vec3(headPos.x + craniumR * 0.6 + beakLen, 0, headPos.z - 0.015 * S),
      radiusStart: 0.034 * S,
      radiusEnd: 0.01 * S,
      material: 'keratin-horn-hoof',
      smoothUnionFactor: 0.0,
    });

    // Comb (Cresta)
    const combHeight = 0.065 * S * allometry.hornOrCrestScale;
    segments.push({
      id: 'crest_comb',
      role: 'horn-or-crest',
      parentId: 'cranium',
      side: 'center',
      startPoint: vec3(headPos.x - 0.01 * S, 0, headPos.z + craniumR * 0.75),
      endPoint: vec3(headPos.x + 0.05 * S, 0, headPos.z + craniumR * 0.75 + combHeight),
      radiusStart: 0.032 * S,
      radiusEnd: 0.024 * S * allometry.hornOrCrestScale,
      material: 'avian-comb',
      smoothUnionFactor: 0.01,
    });

    // Folded Lateral Wings
    for (const side of ['left', 'right'] as const) {
      const signY = side === 'right' ? 1 : -1;
      segments.push({
        id: `wing_${side}`,
        role: 'wing',
        parentId: 'thorax',
        side,
        startPoint: vec3(breastPos.x * 0.5, signY * bodyRadius * 0.82, bodyZ + 0.02 * S),
        endPoint: vec3(pelvisPos.x * 0.85, signY * bodyRadius * 0.75, bodyZ - 0.04 * S),
        radiusStart: 0.075 * S,
        radiusEnd: 0.045 * S,
        material: 'plumage-feathers',
        smoothUnionFactor: 0.02,
      });
    }

    // Elevated Fan Tail
    segments.push({
      id: 'tail',
      role: 'tail',
      parentId: 'pelvis',
      side: 'center',
      startPoint: pelvisPos,
      endPoint: vec3(
        pelvisPos.x - 0.16 * S * allometry.hornOrCrestScale,
        0,
        pelvisPos.z + 0.14 * S * allometry.hornOrCrestScale
      ),
      radiusStart: 0.08 * S,
      radiusEnd: 0.04 * S,
      material: 'plumage-feathers',
      smoothUnionFactor: 0.03,
    });

    // Two bipedal scaly tarsus legs
    for (const [idx, side] of (['left', 'right'] as const).entries()) {
      const signY = side === 'right' ? 1 : -1;
      const localPhase = ((phase + idx * 0.5) % 1) * Math.PI * 2;
      const strideX = Math.sin(localPhase) * 0.07 * S;
      const liftZ = Math.max(0, Math.cos(localPhase)) * 0.05 * S;

      const hip = vec3(0, signY * bodyRadius * 0.52, bodyZ - bodyRadius * 0.55);
      const hock = vec3(-0.03 * S + strideX * 0.5, hip.y, legHeight * 0.48 + liftZ * 0.5);
      const foot = vec3(0.02 * S + strideX, hip.y, liftZ);

      segments.push({
        id: `leg_${side}_upper`,
        role: 'limb-upper',
        parentId: 'pelvis',
        side,
        limbIndex: idx,
        startPoint: hip,
        endPoint: hock,
        radiusStart: 0.042 * S,
        radiusEnd: 0.028 * S,
        material: 'plumage-feathers',
        smoothUnionFactor: 0.02,
      });

      segments.push({
        id: `leg_${side}_lower`,
        role: 'limb-lower',
        parentId: `leg_${side}_upper`,
        side,
        limbIndex: idx,
        startPoint: hock,
        endPoint: foot,
        radiusStart: 0.022 * S,
        radiusEnd: 0.018 * S,
        material: 'keratin-horn-hoof',
        smoothUnionFactor: 0.0,
      });

      segments.push({
        id: `leg_${side}_foot`,
        role: 'extremity-foot',
        parentId: `leg_${side}_lower`,
        side,
        limbIndex: idx,
        startPoint: foot,
        endPoint: vec3(foot.x + 0.045 * S, foot.y, foot.z),
        radiusStart: 0.024 * S,
        radiusEnd: 0.016 * S,
        material: 'keratin-horn-hoof',
        smoothUnionFactor: 0.0,
      });

      supportContacts.push({
        limbId: `leg_${side}_foot`,
        side,
        position: foot,
        contactRadius: 0.03 * S,
        isGrounded: liftZ <= 0.01 * S,
      });
    }
  }

  private buildHumanoidBipedSegments(
    S: number,
    allometry: AllometricStageMultipliers,
    cond: ConditionModifiers,
    phase: number,
    segments: AnatomicalSegment3D[],
    supportContacts: GroundSupportContact[]
  ): void {
    const legLen = 0.42 * S * allometry.limbLengthScale + cond.postureDropZ * S;
    const pelvisZ = legLen;
    const abdomenZ = pelvisZ + 0.12 * S * allometry.torsoLengthScale;
    const thoraxZ = abdomenZ + 0.16 * S * allometry.torsoLengthScale;
    const neckZ = thoraxZ + 0.06 * S * allometry.neckScale;
    const headZ = neckZ + 0.11 * S * allometry.craniumScale + cond.headDroopZ * S;

    const chestW = 0.14 * S * allometry.thoraxRadiusScale * cond.torsoWidthMult;
    const waistW = 0.115 * S * allometry.abdomenRadiusScale * cond.torsoWidthMult;

    segments.push({
      id: 'pelvis',
      role: 'pelvis',
      parentId: null,
      side: 'center',
      startPoint: vec3(0, 0, pelvisZ),
      endPoint: vec3(0, 0, abdomenZ),
      radiusStart: waistW * 1.05,
      radiusEnd: waistW,
      material: 'woven-cloth',
      smoothUnionFactor: 0.04,
    });

    segments.push({
      id: 'abdomen',
      role: 'abdomen',
      parentId: 'pelvis',
      side: 'center',
      startPoint: vec3(0, 0, abdomenZ),
      endPoint: vec3(0, 0, (abdomenZ + thoraxZ) * 0.5),
      radiusStart: waistW,
      radiusEnd: chestW * 0.95,
      material: 'woven-cloth',
      smoothUnionFactor: 0.04,
    });

    segments.push({
      id: 'thorax',
      role: 'thorax',
      parentId: 'abdomen',
      side: 'center',
      startPoint: vec3(0, 0, (abdomenZ + thoraxZ) * 0.5),
      endPoint: vec3(0, 0, thoraxZ),
      radiusStart: chestW * 0.95,
      radiusEnd: chestW,
      material: 'woven-cloth',
      smoothUnionFactor: 0.04,
    });

    segments.push({
      id: 'neck',
      role: 'neck',
      parentId: 'thorax',
      side: 'center',
      startPoint: vec3(0, 0, thoraxZ),
      endPoint: vec3(0, 0, neckZ),
      radiusStart: 0.055 * S,
      radiusEnd: 0.05 * S,
      material: 'humanoid-skin',
      smoothUnionFactor: 0.02,
    });

    const headR = 0.115 * S * allometry.craniumScale;
    segments.push({
      id: 'cranium',
      role: 'cranium',
      parentId: 'neck',
      side: 'center',
      startPoint: vec3(0, 0, neckZ + headR * 0.35),
      endPoint: vec3(0.015 * S, 0, headZ),
      radiusStart: headR * 0.92,
      radiusEnd: headR,
      material: 'humanoid-skin',
      smoothUnionFactor: 0.03,
    });

    segments.push({
      id: 'jaw-muzzle',
      role: 'jaw-muzzle',
      parentId: 'cranium',
      side: 'center',
      startPoint: vec3(0.035 * S, 0, neckZ + headR * 0.25),
      endPoint: vec3(0.06 * S, 0, neckZ + headR * 0.1),
      radiusStart: headR * 0.65,
      radiusEnd: headR * 0.45,
      material: 'humanoid-skin',
      smoothUnionFactor: 0.03,
    });

    // Arms & Legs with counter-swing gait
    for (const [idx, side] of (['left', 'right'] as const).entries()) {
      const signY = side === 'right' ? 1 : -1;
      const legAngle = ((phase + idx * 0.5) % 1) * Math.PI * 2;
      const armAngle = ((phase + (1 - idx) * 0.5) % 1) * Math.PI * 2;

      const legSwingX = Math.sin(legAngle) * 0.09 * S;
      const footLiftZ = Math.max(0, Math.cos(legAngle)) * 0.06 * S;
      const armSwingX = Math.sin(armAngle) * 0.08 * S;

      const shoulder = vec3(0, signY * (chestW + 0.035 * S), thoraxZ - 0.02 * S);
      const elbow = vec3(armSwingX * 0.45, shoulder.y + signY * 0.015 * S, abdomenZ + 0.02 * S);
      const hand = vec3(armSwingX + 0.03 * S, elbow.y, pelvisZ - 0.02 * S);

      const armR = 0.048 * S * allometry.limbThicknessScale * cond.limbThickMult;
      segments.push({
        id: `arm_${side}_upper`,
        role: 'limb-upper',
        parentId: 'thorax',
        side,
        startPoint: shoulder,
        endPoint: elbow,
        radiusStart: armR,
        radiusEnd: armR * 0.85,
        material: 'woven-cloth',
        smoothUnionFactor: 0.02,
      });

      segments.push({
        id: `arm_${side}_lower`,
        role: 'limb-lower',
        parentId: `arm_${side}_upper`,
        side,
        startPoint: elbow,
        endPoint: hand,
        radiusStart: armR * 0.82,
        radiusEnd: armR * 0.72,
        material: 'humanoid-skin',
        smoothUnionFactor: 0.01,
      });

      const hip = vec3(0, signY * waistW * 0.65, pelvisZ);
      const knee = vec3(legSwingX * 0.5 + 0.02 * S, hip.y, pelvisZ * 0.52 + footLiftZ * 0.5);
      const ankle = vec3(legSwingX, hip.y, footLiftZ + 0.035 * S);
      const footTip = vec3(legSwingX + 0.055 * S, hip.y, footLiftZ);

      const legR = 0.062 * S * allometry.limbThicknessScale * cond.limbThickMult;
      segments.push({
        id: `leg_${side}_upper`,
        role: 'limb-upper',
        parentId: 'pelvis',
        side,
        limbIndex: idx,
        startPoint: hip,
        endPoint: knee,
        radiusStart: legR,
        radiusEnd: legR * 0.82,
        material: 'woven-cloth',
        smoothUnionFactor: 0.02,
      });

      segments.push({
        id: `leg_${side}_lower`,
        role: 'limb-lower',
        parentId: `leg_${side}_upper`,
        side,
        limbIndex: idx,
        startPoint: knee,
        endPoint: ankle,
        radiusStart: legR * 0.78,
        radiusEnd: legR * 0.62,
        material: 'keratin-horn-hoof',
        smoothUnionFactor: 0.01,
      });

      segments.push({
        id: `leg_${side}_foot`,
        role: 'extremity-foot',
        parentId: `leg_${side}_lower`,
        side,
        limbIndex: idx,
        startPoint: ankle,
        endPoint: footTip,
        radiusStart: legR * 0.65,
        radiusEnd: legR * 0.58,
        material: 'keratin-horn-hoof',
        smoothUnionFactor: 0.0,
      });

      supportContacts.push({
        limbId: `leg_${side}_foot`,
        side,
        position: footTip,
        contactRadius: legR * 0.62,
        isGrounded: footLiftZ <= 0.01 * S,
      });
    }
  }

  private buildAmorphousCorruptSegments(
    S: number,
    allometry: AllometricStageMultipliers,
    cond: ConditionModifiers,
    phase: number,
    seed: number,
    segments: AnatomicalSegment3D[],
    supportContacts: GroundSupportContact[]
  ): void {
    // Peristaltic squash & stretch pulse (never a static geometric circle)
    const pulse = Math.sin(phase * Math.PI * 2);
    const baseRadius = 0.28 * S * allometry.thoraxRadiusScale * cond.torsoWidthMult * (1 + 0.08 * pulse);
    const domeHeight = 0.34 * S * (1 - 0.07 * pulse);

    // Gravity-flattened wide base
    segments.push({
      id: 'pelvis',
      role: 'pelvis',
      parentId: null,
      side: 'center',
      startPoint: vec3(-0.08 * S, 0, baseRadius * 0.42),
      endPoint: vec3(0.08 * S, 0, baseRadius * 0.45),
      radiusStart: baseRadius * 1.12,
      radiusEnd: baseRadius * 1.05,
      material: 'corrupt-gel',
      smoothUnionFactor: 0.12,
    });

    // Asymmetric upper crest dome
    segments.push({
      id: 'thorax',
      role: 'thorax',
      parentId: 'pelvis',
      side: 'center',
      startPoint: vec3(0, 0, baseRadius * 0.45),
      endPoint: vec3(0.06 * S, 0.03 * S, domeHeight),
      radiusStart: baseRadius * 0.92,
      radiusEnd: baseRadius * 0.58,
      material: 'corrupt-gel',
      smoothUnionFactor: 0.12,
    });

    // Suspended internal anatomical core / skull remnant
    const coreR = 0.095 * S * allometry.craniumScale;
    segments.push({
      id: 'cranium',
      role: 'udder-or-core',
      parentId: 'thorax',
      side: 'center',
      startPoint: vec3(0.04 * S, 0, domeHeight * 0.58),
      endPoint: vec3(0.08 * S, 0, domeHeight * 0.65),
      radiusStart: coreR,
      radiusEnd: coreR * 0.85,
      material: 'keratin-horn-hoof',
      smoothUnionFactor: 0.0,
    });

    // Asymmetric pseudopod tendrils
    for (const [idx, side] of (['left', 'right'] as const).entries()) {
      const signY = side === 'right' ? 1 : -1;
      const angle = (seed % 5) * 0.2 + idx * 1.1;
      const tendrilTip = vec3(
        Math.cos(angle) * baseRadius * 1.15,
        signY * baseRadius * 0.95,
        0.04 * S
      );
      segments.push({
        id: `pseudopod_${side}`,
        role: 'extremity-foot',
        parentId: 'pelvis',
        side,
        limbIndex: idx,
        startPoint: vec3(0, signY * baseRadius * 0.45, 0.08 * S),
        endPoint: tendrilTip,
        radiusStart: 0.085 * S,
        radiusEnd: 0.035 * S,
        material: 'corrupt-gel',
        smoothUnionFactor: 0.09,
      });

      supportContacts.push({
        limbId: `pseudopod_${side}`,
        side,
        position: tendrilTip,
        contactRadius: 0.06 * S,
        isGrounded: true,
      });
    }
  }

  private appendCorruptionOrMutationGrowths(
    speciesId: AnatomicalSpeciesId,
    S: number,
    condition: CreatureBodyConditionId,
    seed: number,
    segments: AnatomicalSegment3D[]
  ): void {
    const thorax = segments.find((s) => s.role === 'thorax') ?? segments[0];
    const count = condition === 'mutated' ? 3 : 2;
    for (let i = 0; i < count; i += 1) {
      const h = hashDeterministicTexel(seed, i + 1, 99, 13);
      const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
      const signY = side === 'right' ? 1 : -1;
      const base = thorax.endPoint;
      segments.push({
        id: `mutation_growth_${i}`,
        role: 'mutation-growth',
        parentId: thorax.id,
        side,
        startPoint: vec3(base.x - i * 0.05 * S, signY * thorax.radiusStart * 0.55, base.z + thorax.radiusStart * 0.5),
        endPoint: vec3(
          base.x - (i * 0.06 + 0.08) * S,
          signY * (thorax.radiusStart * 0.85 + h * 0.06 * S),
          base.z + thorax.radiusStart * 1.15 + h * 0.08 * S
        ),
        radiusStart: 0.045 * S,
        radiusEnd: 0.015 * S,
        material: speciesId === 'amorphous-corrupt' ? 'keratin-horn-hoof' : 'corrupt-gel',
        smoothUnionFactor: 0.02,
      });
    }
  }

  private computeAccessoryAnchors(
    segments: readonly AnatomicalSegment3D[]
  ): Readonly<Record<AccessoryAnchorId, AnatomicalAccessoryAnchor>> {
    const findSeg = (role: AnatomicalPartRole): AnatomicalSegment3D =>
      segments.find((s) => s.role === role) ?? segments[0];

    const cranium = segments.find((s) => s.id === 'cranium') ?? findSeg('cranium');
    const muzzle = findSeg('jaw-muzzle');
    const neck = findSeg('neck');
    const thorax = findSeg('thorax');
    const abdomen = findSeg('abdomen');
    const tail = findSeg('tail');

    const rightHand =
      segments.find((s) => s.id === 'arm_right_lower') ??
      segments.find((s) => s.role === 'limb-lower' && s.side === 'right') ??
      thorax;
    const leftHand =
      segments.find((s) => s.id === 'arm_left_lower') ??
      segments.find((s) => s.role === 'limb-lower' && s.side === 'left') ??
      thorax;

    return Object.freeze({
      head_top: {
        id: 'head_top',
        attachedSegmentId: cranium.id,
        position: vec3(cranium.endPoint.x, 0, cranium.endPoint.z + cranium.radiusEnd),
        forwardNormal: vec3(1, 0, 0),
      },
      muzzle_front: {
        id: 'muzzle_front',
        attachedSegmentId: muzzle.id,
        position: muzzle.endPoint,
        forwardNormal: vec3(1, 0, 0),
      },
      neck_collar: {
        id: 'neck_collar',
        attachedSegmentId: neck.id,
        position: neck.startPoint,
        forwardNormal: vec3(1, 0, 0),
      },
      back_saddle: {
        id: 'back_saddle',
        attachedSegmentId: abdomen.id,
        position: vec3(
          (abdomen.startPoint.x + abdomen.endPoint.x) * 0.5,
          0,
          abdomen.endPoint.z + abdomen.radiusEnd
        ),
        forwardNormal: vec3(1, 0, 0),
      },
      chest_front: {
        id: 'chest_front',
        attachedSegmentId: thorax.id,
        position: vec3(thorax.endPoint.x + thorax.radiusEnd * 0.8, 0, thorax.endPoint.z),
        forwardNormal: vec3(1, 0, 0),
      },
      hand_grip_right: {
        id: 'hand_grip_right',
        attachedSegmentId: rightHand.id,
        position: rightHand.endPoint,
        forwardNormal: vec3(1, 0, 0),
      },
      hand_grip_left: {
        id: 'hand_grip_left',
        attachedSegmentId: leftHand.id,
        position: leftHand.endPoint,
        forwardNormal: vec3(1, 0, 0),
      },
      tail_tip: {
        id: 'tail_tip',
        attachedSegmentId: tail.id,
        position: tail.endPoint,
        forwardNormal: vec3(-1, 0, 0),
      },
    });
  }


  /**
   * Deterministic 2D convex hull of grounded feet. Two-contact bipeds return a
   * support segment; no artificial support area is invented.
   */
  private computeSupportPolygon(contacts: readonly GroundSupportContact[]): readonly Vector3D[] {
    const grounded = contacts.filter((c) => c.isGrounded);
    const selected = grounded.length ? grounded : contacts;
    const pts = selected.map((c) => vec3(c.position.x, c.position.y, 0))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    const unique = pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
    if (unique.length <= 2) return unique;
    const cross = (a: Vector3D, b: Vector3D, c: Vector3D): number =>
      (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const lower: Vector3D[] = [];
    for (const p of unique) {
      while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper: Vector3D[] = [];
    for (let i = unique.length - 1; i >= 0; i--) {
      const p = unique[i];
      while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop();
    upper.pop();
    return [...lower, ...upper];
  }

  private computeMetricsAndBounds(segments: readonly AnatomicalSegment3D[]): {
    readonly centerOfMass: Vector3D;
    readonly boundingBox3D: { readonly min: Vector3D; readonly max: Vector3D };
    readonly proportions: AnatomicalProportionMetrics;
  } {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    let totalMass = 0;
    let comX = 0;
    let comY = 0;
    let comZ = 0;

    let headVolume = 0;
    let torsoVolume = 0;
    let thoraxRadiusMax = 0.01;
    let abdomenRadiusMax = 0.01;
    let hornOrCrestLength = 0;
    let maxLegRootHeightZ = 0.01;

    for (const seg of segments) {
      const rMax = Math.max(seg.radiusStart, seg.radiusEnd);
      const sxMin = Math.min(seg.startPoint.x, seg.endPoint.x) - rMax;
      const sxMax = Math.max(seg.startPoint.x, seg.endPoint.x) + rMax;
      const syMin = Math.min(seg.startPoint.y, seg.endPoint.y) - rMax;
      const syMax = Math.max(seg.startPoint.y, seg.endPoint.y) + rMax;
      const szMin = Math.min(seg.startPoint.z, seg.endPoint.z) - rMax;
      const szMax = Math.max(seg.startPoint.z, seg.endPoint.z) + rMax;

      if (sxMin < minX) minX = sxMin;
      if (sxMax > maxX) maxX = sxMax;
      if (syMin < minY) minY = syMin;
      if (syMax > maxY) maxY = syMax;
      if (szMin < minZ) minZ = szMin;
      if (szMax > maxZ) maxZ = szMax;

      const vol = segmentVolumeApprox(seg);
      const midX = (seg.startPoint.x + seg.endPoint.x) * 0.5;
      const midY = (seg.startPoint.y + seg.endPoint.y) * 0.5;
      const midZ = (seg.startPoint.z + seg.endPoint.z) * 0.5;

      totalMass += vol;
      comX += midX * vol;
      comY += midY * vol;
      comZ += midZ * vol;

      if (seg.role === 'cranium' || seg.role === 'jaw-muzzle') {
        headVolume += vol;
      } else if (seg.role === 'thorax' || seg.role === 'abdomen' || seg.role === 'pelvis') {
        torsoVolume += vol;
      }

      if (seg.role === 'thorax') {
        thoraxRadiusMax = Math.max(thoraxRadiusMax, rMax);
        
      }
      if (seg.role === 'limb-upper' && seg.limbIndex !== undefined) {
        maxLegRootHeightZ = Math.max(maxLegRootHeightZ, seg.startPoint.z);
      }
      if (seg.role === 'abdomen') {
        abdomenRadiusMax = Math.max(abdomenRadiusMax, seg.radiusStart);
      }
      if (seg.role === 'horn-or-crest') {
        const len = Math.hypot(
          seg.endPoint.x - seg.startPoint.x,
          seg.endPoint.y - seg.startPoint.y,
          seg.endPoint.z - seg.startPoint.z
        );
        hornOrCrestLength = Math.max(hornOrCrestLength, len);
      }
    }

    const totalLengthX = Math.max(0.01, maxX - minX);
    const maxWidthY = Math.max(0.01, maxY - minY);
    const standingHeightZ = Math.max(0.01, maxZ - Math.max(0, minZ));

    return {
      centerOfMass: vec3(
        comX / (totalMass || 1),
        comY / (totalMass || 1),
        comZ / (totalMass || 1)
      ),
      boundingBox3D: {
        min: vec3(minX, minY, minZ),
        max: vec3(maxX, maxY, maxZ),
      },
      proportions: {
        totalLengthX,
        maxWidthY,
        standingHeightZ,
        headVolume,
        torsoVolume,
        headToTorsoRatio: headVolume / Math.max(1e-5, torsoVolume),
        thoraxToAbdomenRatio: thoraxRadiusMax / Math.max(1e-5, abdomenRadiusMax),
        legLengthToHeightRatio: maxLegRootHeightZ / standingHeightZ,
        hornOrCrestLength,
      },
    };
  }
}
