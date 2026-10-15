/**
 * PPAE Engine 3.0 — Phase 3B: Eight-Direction 2.5D Projection & Occlusion Engine
 *
 * Projects a species-specific 2.5D anatomical skeleton (Phase 3A) into all 8 true
 * directions (N, NE, E, SE, S, SW, W, NW) without naive 2D profile mirroring:
 *   - Explicit directional convention policy (S = front/viewer-facing, N = back/away,
 *     E = right profile, W = left profile, SE/SW = front 3/4, NE/NW = back 3/4).
 *   - Rotation-invariant metric normalization so apparent torso width foreshortens
 *     naturally in N/S views while expanding to full length in E/W views.
 *   - Explicit part visibility & occlusion rules (muzzle/eyes hidden in N view,
 *     tail occluded in S view, far-side limbs recessed in depth and darkened).
 *   - Direct compilation into SurfaceVolumePrimitive[] for SurfaceClusterRasterizer.
 */

import {
  AnyGranularityProfileInput,
  UnifiedGranularityProfileId,
  normalizeGranularityProfileId,
} from '../core/resolution-contract-bridge';
import {
  DirectionalLightSpec,
  MaterialColorRamp30,
  SurfaceClusterRasterizer,
  SurfaceRasterizationResult,
  SurfaceVolumePrimitive,
} from '../rasterizer/surface-cluster-rasterizer';
import {
  AccessoryAnchorId,
  AnatomicalMaterialKind,
  AnatomicalPartRole,
  AnatomicalSegment3D,
  GeneratedAnatomicalRig25D,
  Vector3D,
} from './species-anatomical-skeleton';

export const EIGHT_DIRECTIONS_CLOCKWISE = [
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
] as const;

export type CardinalAndDiagonalDirection8 =
  (typeof EIGHT_DIRECTIONS_CLOCKWISE)[number];

export type PartVisibilityState =
  | 'fully-visible'
  | 'partially-occluded'
  | 'culled-hidden';

export interface DirectionConventionSpec {
  readonly direction: CardinalAndDiagonalDirection8;
  /**
   * Yaw angle in degrees in the horizontal world plane:
   *   E  = 0 deg   (facing right +X_cam)
   *   SE = 45 deg  (facing front-right)
   *   S  = 90 deg  (facing viewer +Y_depth)
   *   SW = 135 deg (facing front-left)
   *   W  = 180 deg (facing left -X_cam)
   *   NW = 225 deg (facing back-left)
   *   N  = 270 deg (facing away -Y_depth)
   *   NE = 315 deg (facing back-right)
   */
  readonly yawDegrees: number;
  readonly isFrontHemisphere: boolean;
  readonly isBackHemisphere: boolean;
  readonly isStrictCardinalFrontOrBack: boolean;
  readonly isStrictLateralProfile: boolean;
  readonly expectedVisibleEyeCount: 0 | 1 | 2;
}

export const DEFAULT_EIGHT_DIRECTION_CONVENTIONS: Readonly<
  Record<CardinalAndDiagonalDirection8, DirectionConventionSpec>
> = Object.freeze({
  E: Object.freeze({
    direction: 'E',
    yawDegrees: 0,
    isFrontHemisphere: false,
    isBackHemisphere: false,
    isStrictCardinalFrontOrBack: false,
    isStrictLateralProfile: true,
    expectedVisibleEyeCount: 1,
  }),
  SE: Object.freeze({
    direction: 'SE',
    yawDegrees: 45,
    isFrontHemisphere: true,
    isBackHemisphere: false,
    isStrictCardinalFrontOrBack: false,
    isStrictLateralProfile: false,
    expectedVisibleEyeCount: 2,
  }),
  S: Object.freeze({
    direction: 'S',
    yawDegrees: 90,
    isFrontHemisphere: true,
    isBackHemisphere: false,
    isStrictCardinalFrontOrBack: true,
    isStrictLateralProfile: false,
    expectedVisibleEyeCount: 2,
  }),
  SW: Object.freeze({
    direction: 'SW',
    yawDegrees: 135,
    isFrontHemisphere: true,
    isBackHemisphere: false,
    isStrictCardinalFrontOrBack: false,
    isStrictLateralProfile: false,
    expectedVisibleEyeCount: 2,
  }),
  W: Object.freeze({
    direction: 'W',
    yawDegrees: 180,
    isFrontHemisphere: false,
    isBackHemisphere: false,
    isStrictCardinalFrontOrBack: false,
    isStrictLateralProfile: true,
    expectedVisibleEyeCount: 1,
  }),
  NW: Object.freeze({
    direction: 'NW',
    yawDegrees: 225,
    isFrontHemisphere: false,
    isBackHemisphere: true,
    isStrictCardinalFrontOrBack: false,
    isStrictLateralProfile: false,
    expectedVisibleEyeCount: 0,
  }),
  N: Object.freeze({
    direction: 'N',
    yawDegrees: 270,
    isFrontHemisphere: false,
    isBackHemisphere: true,
    isStrictCardinalFrontOrBack: true,
    isStrictLateralProfile: false,
    expectedVisibleEyeCount: 0,
  }),
  NE: Object.freeze({
    direction: 'NE',
    yawDegrees: 315,
    isFrontHemisphere: false,
    isBackHemisphere: true,
    isStrictCardinalFrontOrBack: false,
    isStrictLateralProfile: false,
    expectedVisibleEyeCount: 0,
  }),
});

export interface ProjectedAnatomicalPrimitive extends SurfaceVolumePrimitive {
  readonly sourceSegmentId: string;
  readonly role: AnatomicalPartRole;
  readonly side: 'center' | 'left' | 'right';
  readonly visibilityState: PartVisibilityState;
  readonly isFarSideLimb: boolean;
  readonly depthSortKey: number;
}

export interface ProjectedEyeMarker {
  readonly side: 'left' | 'right';
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly depthSortKey: number;
  readonly visible: boolean;
}

export interface ProjectedGroundSupportPoint {
  readonly limbId: string;
  readonly side: 'left' | 'right' | 'center';
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly depthSortKey: number;
  readonly isGrounded: boolean;
}

export interface ProjectedAnchorPoint2D {
  readonly id: AccessoryAnchorId;
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly depthSortKey: number;
  readonly isOccludedByBody: boolean;
}

export interface ProjectedEightDirectionView {
  readonly direction: CardinalAndDiagonalDirection8;
  readonly convention: DirectionConventionSpec;
  readonly cameraPitchDegrees: number;
  readonly primitives: readonly ProjectedAnatomicalPrimitive[];
  readonly visiblePrimitives: readonly ProjectedAnatomicalPrimitive[];
  readonly hiddenSegmentIds: readonly string[];
  readonly eyeMarkers: readonly ProjectedEyeMarker[];
  readonly supportPoints: readonly ProjectedGroundSupportPoint[];
  readonly anchors: Readonly<Record<AccessoryAnchorId, ProjectedAnchorPoint2D>>;
  readonly apparentTorsoWidthNormalized: number;
  readonly silhouetteBoundsNormalized: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface DirectionalContinuityPairMetric {
  readonly fromDirection: CardinalAndDiagonalDirection8;
  readonly toDirection: CardinalAndDiagonalDirection8;
  readonly widthRatioJump: number;
  readonly heightRatioJump: number;
  readonly centerOfMassDelta: number;
  readonly isContinuous: boolean;
}

export interface EightDirectionContinuityAudit {
  readonly speciesId: string;
  readonly allDirectionsValid: boolean;
  readonly lateralToFrontalForeshorteningRatio: number;
  readonly pairMetrics: readonly DirectionalContinuityPairMetric[];
}

export const DEFAULT_ANATOMICAL_MATERIAL_RAMPS: Readonly<
  Record<AnatomicalMaterialKind | 'far-limb-shadow' | 'eye-pupil', MaterialColorRamp30>
> = Object.freeze({
  'spotted-hide': {
    materialId: 'spotted-hide',
    outlineColor: { r: 28, g: 24, b: 26, a: 255 },
    tones: [
      { r: 148, g: 142, b: 146, a: 255 },
      { r: 182, g: 176, b: 180, a: 255 },
      { r: 212, g: 208, b: 210, a: 255 },
      { r: 236, g: 234, b: 235, a: 255 },
      { r: 250, g: 248, b: 248, a: 255 },
    ],
  },
  'wool-fleece': {
    materialId: 'wool-fleece',
    outlineColor: { r: 38, g: 34, b: 32, a: 255 },
    tones: [
      { r: 162, g: 156, b: 146, a: 255 },
      { r: 192, g: 186, b: 176, a: 255 },
      { r: 218, g: 212, b: 202, a: 255 },
      { r: 238, g: 234, b: 224, a: 255 },
      { r: 252, g: 248, b: 240, a: 255 },
    ],
  },
  'coarse-fur': {
    materialId: 'coarse-fur',
    outlineColor: { r: 18, g: 20, b: 26, a: 255 },
    tones: [
      { r: 52, g: 58, b: 70, a: 255 },
      { r: 74, g: 82, b: 96, a: 255 },
      { r: 98, g: 108, b: 124, a: 255 },
      { r: 124, g: 136, b: 152, a: 255 },
      { r: 152, g: 164, b: 180, a: 255 },
    ],
  },
  'plumage-feathers': {
    materialId: 'plumage-feathers',
    outlineColor: { r: 42, g: 28, b: 18, a: 255 },
    tones: [
      { r: 168, g: 142, b: 112, a: 255 },
      { r: 196, g: 172, b: 140, a: 255 },
      { r: 222, g: 202, b: 172, a: 255 },
      { r: 242, g: 228, b: 204, a: 255 },
      { r: 254, g: 246, b: 232, a: 255 },
    ],
  },
  'keratin-horn-hoof': {
    materialId: 'keratin-horn-hoof',
    outlineColor: { r: 22, g: 18, b: 16, a: 255 },
    tones: [
      { r: 58, g: 48, b: 42, a: 255 },
      { r: 84, g: 70, b: 60, a: 255 },
      { r: 114, g: 96, b: 82, a: 255 },
      { r: 148, g: 128, b: 108, a: 255 },
    ],
  },
  'avian-comb': {
    materialId: 'avian-comb',
    outlineColor: { r: 54, g: 12, b: 16, a: 255 },
    tones: [
      { r: 148, g: 28, b: 36, a: 255 },
      { r: 188, g: 42, b: 48, a: 255 },
      { r: 224, g: 64, b: 68, a: 255 },
      { r: 246, g: 96, b: 96, a: 255 },
    ],
  },
  'humanoid-skin': {
    materialId: 'humanoid-skin',
    outlineColor: { r: 44, g: 26, b: 22, a: 255 },
    tones: [
      { r: 158, g: 108, b: 88, a: 255 },
      { r: 188, g: 136, b: 112, a: 255 },
      { r: 216, g: 166, b: 138, a: 255 },
      { r: 238, g: 194, b: 166, a: 255 },
    ],
  },
  'woven-cloth': {
    materialId: 'woven-cloth',
    outlineColor: { r: 18, g: 28, b: 48, a: 255 },
    tones: [
      { r: 38, g: 64, b: 112, a: 255 },
      { r: 54, g: 92, b: 148, a: 255 },
      { r: 76, g: 122, b: 182, a: 255 },
      { r: 104, g: 152, b: 212, a: 255 },
    ],
  },
  'corrupt-gel': {
    materialId: 'corrupt-gel',
    outlineColor: { r: 26, g: 12, b: 42, a: 255 },
    tones: [
      { r: 68, g: 32, b: 104, a: 255 },
      { r: 96, g: 48, b: 142, a: 255 },
      { r: 128, g: 72, b: 178, a: 255 },
      { r: 164, g: 104, b: 212, a: 255 },
      { r: 198, g: 144, b: 238, a: 255 },
    ],
  },
  'far-limb-shadow': {
    materialId: 'far-limb-shadow',
    outlineColor: { r: 16, g: 16, b: 22, a: 255 },
    tones: [
      { r: 42, g: 42, b: 52, a: 255 },
      { r: 62, g: 62, b: 74, a: 255 },
      { r: 84, g: 84, b: 98, a: 255 },
    ],
  },
  'eye-pupil': {
    materialId: 'eye-pupil',
    outlineColor: { r: 10, g: 10, b: 14, a: 255 },
    tones: [
      { r: 14, g: 14, b: 18, a: 255 },
      { r: 240, g: 244, b: 250, a: 255 },
    ],
  },
});

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export class EightDirectionProjectionEngine {
  public readonly cameraPitchDegrees: number;
  private readonly cosPitch: number;
  private readonly sinPitch: number;

  public constructor(cameraPitchDegrees = 34) {
    if (cameraPitchDegrees < 10 || cameraPitchDegrees > 75) {
      throw new RangeError(
        `cameraPitchDegrees must be in [10, 75] for top-down 3/4 projection, received: ${cameraPitchDegrees}`
      );
    }
    this.cameraPitchDegrees = cameraPitchDegrees;
    const rad = (cameraPitchDegrees * Math.PI) / 180;
    this.cosPitch = Math.cos(rad);
    this.sinPitch = Math.sin(rad);
  }

  /**
   * Projects a 3D anatomical point (x, y, z) into normalized 2D canvas space [0, 1]^2
   * and camera depth sort key using a rotation-invariant reference metric span.
   */
  private projectPoint3D(
    pt: Vector3D,
    cosYaw: number,
    sinYaw: number,
    refSpan: number,
    groundAnchorY: number
  ): { readonly normX: number; readonly normY: number; readonly depthKey: number; readonly camYDepth: number } {
    // Horizontal world rotation by yaw angle:
    // +X_cam is right on screen, +Y_depth is toward the viewer (down on screen)
    const camX = pt.x * cosYaw - pt.y * sinYaw;
    const camYDepth = pt.x * sinYaw + pt.y * cosYaw;

    // Orthographic 3/4 projection:
    // Screen X comes from camX; Screen Y increases downward (+camYDepth * sinPitch - z * cosPitch)
    const uMetric = camX;
    const vMetric = camYDepth * this.sinPitch - pt.z * this.cosPitch;
    const depthKey = camYDepth * this.cosPitch + pt.z * this.sinPitch;

    const normX = clamp(0.5 + uMetric / refSpan, 0.02, 0.98);
    const normY = clamp(groundAnchorY + vMetric / refSpan, 0.02, 0.98);

    return {
      normX,
      normY,
      depthKey,
      camYDepth,
    };
  }

  /**
   * Projects a GeneratedAnatomicalRig25D into a specific direction among the 8 directions
   * (N, NE, E, SE, S, SW, W, NW).
   */
  public projectDirection(
    rig: GeneratedAnatomicalRig25D,
    direction: CardinalAndDiagonalDirection8
  ): ProjectedEightDirectionView {
    const convention = DEFAULT_EIGHT_DIRECTION_CONVENTIONS[direction];
    if (!convention) {
      throw new RangeError(`Unsupported direction: ${String(direction)}`);
    }

    const yawRad = (convention.yawDegrees * Math.PI) / 180;
    const cosYaw = Math.cos(yawRad);
    const sinYaw = Math.sin(yawRad);

    // Compute a direction-invariant reference metric span from the 3D rig so that
    // N/S views foreshorten naturally rather than stretching across the entire canvas
    const spanX = rig.proportions.totalLengthX;
    const spanY = rig.proportions.maxWidthY;
    const spanZ = rig.proportions.standingHeightZ;
    const refSpan = Math.max(spanX, spanY, spanZ, 0.45) * 1.28;
    const groundAnchorY = 0.8;

    const projectedPrimitives: ProjectedAnatomicalPrimitive[] = [];
    const hiddenSegmentIds: string[] = [];

    let torsoMinX = 1.0;
    let torsoMaxX = 0.0;

    for (const seg of rig.segments) {
      const p0 = this.projectPoint3D(
        seg.startPoint,
        cosYaw,
        sinYaw,
        refSpan,
        groundAnchorY
      );
      const p1 = this.projectPoint3D(
        seg.endPoint,
        cosYaw,
        sinYaw,
        refSpan,
        groundAnchorY
      );

      const visibilityState = this.evaluateSegmentVisibility(
        seg,
        convention,
        p0.camYDepth,
        p1.camYDepth
      );

      if (visibilityState === 'culled-hidden') {
        hiddenSegmentIds.push(seg.id);
        continue;
      }

      // Determine whether this is a far-side limb recessed behind the torso
      const isLimbRole =
        seg.role === 'limb-upper' ||
        seg.role === 'limb-lower' ||
        seg.role === 'extremity-foot' ||
        seg.role === 'wing';

      const isFarSideLimb =
        isLimbRole &&
        ((direction === 'E' && seg.side === 'left') ||
          (direction === 'W' && seg.side === 'right') ||
          ((direction === 'SE' || direction === 'NE') && seg.side === 'left') ||
          ((direction === 'SW' || direction === 'NW') && seg.side === 'right') ||
          (direction === 'S' && seg.limbIndex !== undefined && seg.limbIndex >= 2) ||
          (direction === 'N' && seg.limbIndex !== undefined && seg.limbIndex <= 1));

      // Radius scaling into normalized canvas space
      const normR0 = Math.max(0.018, seg.radiusStart / refSpan);
      const normR1 = Math.max(0.014, seg.radiusEnd / refSpan);

      // Compute painter's sort key (zBase in [0.02, 0.95]) from 3D camera depth + role bias
      const roleBias = this.computeRoleDepthBias(seg.role, convention, isFarSideLimb);
      const rawSortKey = (p0.depthKey + p1.depthKey) * 0.5 + roleBias;
      const normalizedZBase = clamp(0.5 + rawSortKey / (refSpan * 1.4), 0.02, 0.95);

      if (
        seg.role === 'thorax' ||
        seg.role === 'abdomen' ||
        seg.role === 'pelvis'
      ) {
        torsoMinX = Math.min(torsoMinX, p0.normX - normR0, p1.normX - normR1);
        torsoMaxX = Math.max(torsoMaxX, p0.normX + normR0, p1.normX + normR1);
      }

      const materialId = isFarSideLimb ? 'far-limb-shadow' : seg.material;

      projectedPrimitives.push({
        id: `${seg.id}_${direction}`,
        sourceSegmentId: seg.id,
        role: seg.role,
        side: seg.side,
        visibilityState,
        isFarSideLimb,
        depthSortKey: rawSortKey,
        kind: 'tapered-capsule',
        materialId,
        x0: p0.normX,
        y0: p0.normY,
        x1: p1.normX,
        y1: p1.normY,
        radius0: normR0,
        radius1: normR1,
        zBase: normalizedZBase,
        blendSmoothness: isFarSideLimb ? 0 : seg.smoothUnionFactor,
        surfaceClusterAmplitude:
          seg.material === 'wool-fleece'
            ? 0.14
            : seg.material === 'coarse-fur' || seg.material === 'plumage-feathers'
              ? 0.1
              : 0.05,
      });
    }

    // Project eyes with explicit directional occlusion
    const eyeMarkers = this.projectEyes(
      rig,
      convention,
      cosYaw,
      sinYaw,
      refSpan,
      groundAnchorY
    );

    // Append visible eye primitives on top of the cranium for high-readability gaze
    for (const eye of eyeMarkers) {
      if (!eye.visible) {
        continue;
      }
      projectedPrimitives.push({
        id: `eye_${eye.side}_${direction}`,
        sourceSegmentId: 'cranium',
        role: 'cranium',
        side: eye.side,
        visibilityState: 'fully-visible',
        isFarSideLimb: false,
        depthSortKey: eye.depthSortKey + 0.15,
        kind: 'ellipsoid',
        materialId: 'eye-pupil',
        x0: eye.normalizedX,
        y0: eye.normalizedY,
        radius0: 0.022,
        radius1: 0.022,
        zBase: 0.96,
        blendSmoothness: 0,
      });
    }

    // Re-sort after appending eyes: stable painter order is a public projection contract.
    // SurfaceClusterRasterizer independently resolves per-texel material/depth ownership.
    projectedPrimitives.sort((a, b) => a.depthSortKey - b.depthSortKey || a.id.localeCompare(b.id));

    // Project ground support points
    const supportPoints: ProjectedGroundSupportPoint[] = rig.supportContacts.map((sc) => {
      const p = this.projectPoint3D(
        sc.position,
        cosYaw,
        sinYaw,
        refSpan,
        groundAnchorY
      );
      return {
        limbId: sc.limbId,
        side: sc.side,
        normalizedX: p.normX,
        normalizedY: p.normY,
        depthSortKey: p.depthKey,
        isGrounded: sc.isGrounded,
      };
    });

    // Project accessory anchors
    const anchorKeys = Object.keys(rig.anchors) as AccessoryAnchorId[];
    const projectedAnchors = {} as Record<AccessoryAnchorId, ProjectedAnchorPoint2D>;
    for (const key of anchorKeys) {
      const a = rig.anchors[key];
      const p = this.projectPoint3D(
        a.position,
        cosYaw,
        sinYaw,
        refSpan,
        groundAnchorY
      );
      const isOccludedByBody =
        (key === 'muzzle_front' && convention.isBackHemisphere) ||
        (key === 'tail_tip' && direction === 'S') ||
        (key === 'chest_front' && convention.isBackHemisphere);
      projectedAnchors[key] = {
        id: key,
        normalizedX: p.normX,
        normalizedY: p.normY,
        depthSortKey: p.depthKey,
        isOccludedByBody,
      };
    }

    // Compute overall silhouette bounds in normalized coordinates
    let minX = 1.0;
    let maxX = 0.0;
    let minY = 1.0;
    let maxY = 0.0;

    for (const prim of projectedPrimitives) {
      const rMax = Math.max(prim.radius0, prim.radius1 ?? prim.radius0);
      const px0 = Math.min(prim.x0, prim.x1 ?? prim.x0) - rMax;
      const px1 = Math.max(prim.x0, prim.x1 ?? prim.x0) + rMax;
      const py0 = Math.min(prim.y0, prim.y1 ?? prim.y0) - rMax;
      const py1 = Math.max(prim.y0, prim.y1 ?? prim.y0) + rMax;
      if (px0 < minX) minX = px0;
      if (px1 > maxX) maxX = px1;
      if (py0 < minY) minY = py0;
      if (py1 > maxY) maxY = py1;
    }

    const apparentTorsoWidthNormalized = Math.max(0.05, torsoMaxX - torsoMinX);

    return {
      direction,
      convention,
      cameraPitchDegrees: this.cameraPitchDegrees,
      primitives: projectedPrimitives,
      visiblePrimitives: projectedPrimitives.filter(
        (p) => p.visibilityState !== 'culled-hidden'
      ),
      hiddenSegmentIds,
      eyeMarkers,
      supportPoints,
      anchors: Object.freeze(projectedAnchors),
      apparentTorsoWidthNormalized,
      silhouetteBoundsNormalized: {
        minX: clamp(minX, 0, 1),
        maxX: clamp(maxX, 0, 1),
        minY: clamp(minY, 0, 1),
        maxY: clamp(maxY, 0, 1),
        width: Math.max(0.01, clamp(maxX, 0, 1) - clamp(minX, 0, 1)),
        height: Math.max(0.01, clamp(maxY, 0, 1) - clamp(minY, 0, 1)),
      },
    };
  }

  /**
   * Projects all 8 directions (N, NE, E, SE, S, SW, W, NW) for a given rig.
   */
  public projectAllEightDirections(
    rig: GeneratedAnatomicalRig25D
  ): Readonly<Record<CardinalAndDiagonalDirection8, ProjectedEightDirectionView>> {
    const out = {} as Record<CardinalAndDiagonalDirection8, ProjectedEightDirectionView>;
    for (const dir of EIGHT_DIRECTIONS_CLOCKWISE) {
      out[dir] = this.projectDirection(rig, dir);
    }
    return Object.freeze(out);
  }

  /**
   * Renders an anatomical rig in a given direction and native resolution profile
   * directly to an RGBA buffer via SurfaceClusterRasterizer.
   */
  public renderDirectionalCreatureSprite(params: {
    readonly rig: GeneratedAnatomicalRig25D;
    readonly direction: CardinalAndDiagonalDirection8;
    readonly profile: AnyGranularityProfileInput;
    readonly materials?: Readonly<Record<string, MaterialColorRamp30>>;
    readonly light?: Partial<DirectionalLightSpec>;
  }): {
    readonly profileId: UnifiedGranularityProfileId;
    readonly direction: CardinalAndDiagonalDirection8;
    readonly projection: ProjectedEightDirectionView;
    readonly rasterResult: SurfaceRasterizationResult;
  } {
    const profileId = normalizeGranularityProfileId(params.profile);
    const projection = this.projectDirection(params.rig, params.direction);
    const rasterizer = new SurfaceClusterRasterizer();

    const materials = {
      ...DEFAULT_ANATOMICAL_MATERIAL_RAMPS,
      ...(params.materials ?? {}),
    };

    const rasterResult = rasterizer.renderSurface({
      profile: params.profile,
      seed: params.rig.seed,
      primitives: projection.visiblePrimitives,
      materials,
      light: params.light,
    });

    return {
      profileId,
      direction: params.direction,
      projection,
      rasterResult,
    };
  }

  /**
   * Evaluates directional continuity across all 8 contiguous compass transitions
   * (N->NE, NE->E, E->SE, SE->S, S->SW, SW->W, W->NW, NW->N) and verifies foreshortening.
   */
  public auditEightDirectionContinuity(
    rig: GeneratedAnatomicalRig25D
  ): EightDirectionContinuityAudit {
    const views = this.projectAllEightDirections(rig);
    const pairMetrics: DirectionalContinuityPairMetric[] = [];
    let allValid = true;

    for (let i = 0; i < EIGHT_DIRECTIONS_CLOCKWISE.length; i += 1) {
      const fromDir = EIGHT_DIRECTIONS_CLOCKWISE[i];
      const toDir = EIGHT_DIRECTIONS_CLOCKWISE[(i + 1) % EIGHT_DIRECTIONS_CLOCKWISE.length];
      const vA = views[fromDir];
      const vB = views[toDir];

      const widthRatioJump = Math.abs(
        vA.silhouetteBoundsNormalized.width - vB.silhouetteBoundsNormalized.width
      );
      const heightRatioJump = Math.abs(
        vA.silhouetteBoundsNormalized.height - vB.silhouetteBoundsNormalized.height
      );

      const comAx = (vA.silhouetteBoundsNormalized.minX + vA.silhouetteBoundsNormalized.maxX) * 0.5;
      const comAy = (vA.silhouetteBoundsNormalized.minY + vA.silhouetteBoundsNormalized.maxY) * 0.5;
      const comBx = (vB.silhouetteBoundsNormalized.minX + vB.silhouetteBoundsNormalized.maxX) * 0.5;
      const comBy = (vB.silhouetteBoundsNormalized.minY + vB.silhouetteBoundsNormalized.maxY) * 0.5;
      const centerOfMassDelta = Math.hypot(comBx - comAx, comBy - comAy);

      const isContinuous =
        widthRatioJump < 0.42 && heightRatioJump < 0.25 && centerOfMassDelta < 0.22;
      if (!isContinuous) {
        allValid = false;
      }

      pairMetrics.push({
        fromDirection: fromDir,
        toDirection: toDir,
        widthRatioJump,
        heightRatioJump,
        centerOfMassDelta,
        isContinuous,
      });
    }

    const lateralWidth =
      (views.E.apparentTorsoWidthNormalized + views.W.apparentTorsoWidthNormalized) * 0.5;
    const frontalWidth =
      (views.S.apparentTorsoWidthNormalized + views.N.apparentTorsoWidthNormalized) * 0.5;
    const lateralToFrontalForeshorteningRatio =
      lateralWidth / Math.max(0.01, frontalWidth);

    return {
      speciesId: rig.speciesId,
      allDirectionsValid: allValid,
      lateralToFrontalForeshorteningRatio,
      pairMetrics,
    };
  }

  private evaluateSegmentVisibility(
    seg: AnatomicalSegment3D,
    convention: DirectionConventionSpec,
    camY0: number,
    camY1: number
  ): PartVisibilityState {
    // 1. In strict North (back) view, the anterior muzzle/beak is occluded behind the cranium/neck
    if (convention.direction === 'N' && seg.role === 'jaw-muzzle') {
      return 'culled-hidden';
    }
    // 2. In strict South (front) view, a short low tail or udder behind the pelvis is occluded
    if (
      convention.direction === 'S' &&
      (seg.role === 'tail' || seg.role === 'udder-or-core') &&
      Math.max(seg.startPoint.z, seg.endPoint.z) < 0.32
    ) {
      return 'culled-hidden';
    }
    // 3. In strict lateral profile (E or W), the far-side ear or wing directly behind the near side is partially occluded
    if (
      (convention.direction === 'E' && seg.side === 'left' && seg.role === 'wing') ||
      (convention.direction === 'W' && seg.side === 'right' && seg.role === 'wing')
    ) {
      return 'culled-hidden';
    }

    if (camY0 < 0 && camY1 < 0) {
      return 'partially-occluded';
    }
    return 'fully-visible';
  }

  private computeRoleDepthBias(
    role: AnatomicalPartRole,
    convention: DirectionConventionSpec,
    isFarSideLimb: boolean
  ): number {
    if (isFarSideLimb) {
      return -0.22;
    }
    if (convention.isFrontHemisphere) {
      if (role === 'jaw-muzzle') return 0.16;
      if (role === 'cranium' || role === 'horn-or-crest' || role === 'ear') return 0.12;
      if (role === 'tail') return -0.18;
    } else if (convention.isBackHemisphere) {
      if (role === 'tail') return 0.18;
      if (role === 'pelvis') return 0.1;
      if (role === 'cranium' || role === 'jaw-muzzle') return -0.14;
    }
    return 0;
  }

  private projectEyes(
    rig: GeneratedAnatomicalRig25D,
    convention: DirectionConventionSpec,
    cosYaw: number,
    sinYaw: number,
    refSpan: number,
    groundAnchorY: number
  ): readonly ProjectedEyeMarker[] {
    const cranium = rig.segments.find((s) => s.role === 'cranium');
    if (!cranium || rig.speciesId === 'amorphous-corrupt') {
      return [];
    }

    const r = cranium.radiusEnd;
    const markers: ProjectedEyeMarker[] = [];

    for (const side of ['left', 'right'] as const) {
      const signY = side === 'right' ? 1 : -1;
      const eye3D: Vector3D = {
        x: cranium.endPoint.x + r * 0.55,
        y: signY * r * 0.62,
        z: cranium.endPoint.z + r * 0.18,
      };

      const proj = this.projectPoint3D(eye3D, cosYaw, sinYaw, refSpan, groundAnchorY);

      let visible = false;
      if (convention.direction === 'S' || convention.direction === 'SE' || convention.direction === 'SW') {
        visible = true;
      } else if (convention.direction === 'E' && side === 'right') {
        visible = true;
      } else if (convention.direction === 'W' && side === 'left') {
        visible = true;
      }

      markers.push({
        side,
        normalizedX: proj.normX,
        normalizedY: proj.normY,
        depthSortKey: proj.depthKey,
        visible,
      });
    }

    return markers;
  }
}
