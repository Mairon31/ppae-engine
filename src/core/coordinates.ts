import {
  AdaptiveProfileSelectionRequest, ArtisticDetailBudget, ArtStyleProfile,
  GranularityProfileId, MultiResolutionDimensionSpec
} from './contracts';

/** Artistic complexity per native module resolution; detail synthesis follows in 7B. */
export const ARTISTIC_DETAIL_BUDGETS: Readonly<
  Record<Exclude<GranularityProfileId, 'adaptive-auto'>, ArtisticDetailBudget>
> = {
  'micro-4x4': {
    profileId: 'micro-4x4', moduleSize: 4, shadingSteps: 3,
    maxColorsPerSprite: 8, facialDetailTier: 'eyes_only',
    foliageSubdivisionLevel: 1, barkAndFacetMicroDetailLevel: 1,
    enableSecondaryJointArticulation: false,
    enableClothFoldsAndSeams: false, enableSpecularHighlights: false,
    enableSubTexelClusterDithering: false
  },
  'micro-6x6': {
    profileId: 'micro-6x6', moduleSize: 6, shadingSteps: 3,
    maxColorsPerSprite: 10, facialDetailTier: 'eyes_and_brows',
    foliageSubdivisionLevel: 2, barkAndFacetMicroDetailLevel: 2,
    enableSecondaryJointArticulation: true,
    enableClothFoldsAndSeams: false, enableSpecularHighlights: true,
    enableSubTexelClusterDithering: false
  },
  'classic-8x8': {
    profileId: 'classic-8x8', moduleSize: 8, shadingSteps: 3,
    maxColorsPerSprite: 12, facialDetailTier: 'eyes_and_brows',
    foliageSubdivisionLevel: 2, barkAndFacetMicroDetailLevel: 2,
    enableSecondaryJointArticulation: true,
    enableClothFoldsAndSeams: true, enableSpecularHighlights: true,
    enableSubTexelClusterDithering: false
  },
  'standard-16x16': {
    profileId: 'standard-16x16', moduleSize: 16, shadingSteps: 4,
    maxColorsPerSprite: 16, facialDetailTier: 'full_features',
    foliageSubdivisionLevel: 3, barkAndFacetMicroDetailLevel: 3,
    enableSecondaryJointArticulation: true,
    enableClothFoldsAndSeams: true, enableSpecularHighlights: true,
    enableSubTexelClusterDithering: true
  },
  'detailed-32x32': {
    profileId: 'detailed-32x32', moduleSize: 32, shadingSteps: 5,
    maxColorsPerSprite: 24, facialDetailTier: 'expressive_hd',
    foliageSubdivisionLevel: 4, barkAndFacetMicroDetailLevel: 4,
    enableSecondaryJointArticulation: true,
    enableClothFoldsAndSeams: true, enableSpecularHighlights: true,
    enableSubTexelClusterDithering: true
  },
  'hybrid-24': {
    profileId: 'hybrid-24', moduleSize: 4, shadingSteps: 4,
    maxColorsPerSprite: 14, facialDetailTier: 'full_features',
    foliageSubdivisionLevel: 2, barkAndFacetMicroDetailLevel: 2,
    enableSecondaryJointArticulation: true,
    enableClothFoldsAndSeams: true, enableSpecularHighlights: true,
    enableSubTexelClusterDithering: true
  }
};

/**
 * Seven named style profiles: original 4x4, 6x6 and hybrid retain their
 * previous spatial metrics; adaptive-auto is a safe classic default only.
 * Resolve a concrete profile via AdaptiveResolutionController before rendering.
 */
export const DEFAULT_STYLE_PROFILES: Readonly<Record<GranularityProfileId, ArtStyleProfile>> = {
  'micro-4x4': {
    schemaVersion: '1.0.0', id: 'micro-4x4',
    moduleSize: 4, canonicalTileTexels: 24, logicalTileUnits: 16,
    outlineMode: 'selective-dark', shadingSteps: 3,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: false, extrudePaddingPx: 1,
    detailBudget: ARTISTIC_DETAIL_BUDGETS['micro-4x4']
  },
  'micro-6x6': {
    schemaVersion: '1.0.0', id: 'micro-6x6',
    moduleSize: 6, canonicalTileTexels: 24, logicalTileUnits: 16,
    outlineMode: 'selective-dark', shadingSteps: 3,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: false, extrudePaddingPx: 1,
    detailBudget: ARTISTIC_DETAIL_BUDGETS['micro-6x6']
  },
  'classic-8x8': {
    schemaVersion: '1.0.0', id: 'classic-8x8',
    moduleSize: 8, canonicalTileTexels: 32, logicalTileUnits: 16,
    outlineMode: 'selective-dark', shadingSteps: 3,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: false, extrudePaddingPx: 1,
    detailBudget: ARTISTIC_DETAIL_BUDGETS['classic-8x8']
  },
  'standard-16x16': {
    schemaVersion: '1.0.0', id: 'standard-16x16',
    moduleSize: 16, canonicalTileTexels: 64, logicalTileUnits: 16,
    outlineMode: 'selective-dark', shadingSteps: 4,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: true, extrudePaddingPx: 2,
    detailBudget: ARTISTIC_DETAIL_BUDGETS['standard-16x16']
  },
  'detailed-32x32': {
    schemaVersion: '1.0.0', id: 'detailed-32x32',
    moduleSize: 32, canonicalTileTexels: 128, logicalTileUnits: 16,
    outlineMode: 'selective-dark', shadingSteps: 5,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: true, extrudePaddingPx: 2,
    detailBudget: ARTISTIC_DETAIL_BUDGETS['detailed-32x32']
  },
  'hybrid-24': {
    schemaVersion: '1.0.0', id: 'hybrid-24',
    moduleSize: 4, canonicalTileTexels: 48, logicalTileUnits: 16,
    outlineMode: 'selective-dark', shadingSteps: 4,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: true, extrudePaddingPx: 2,
    detailBudget: ARTISTIC_DETAIL_BUDGETS['hybrid-24']
  },
  'adaptive-auto': {
    schemaVersion: '1.0.0', id: 'adaptive-auto',
    moduleSize: 8, canonicalTileTexels: 32, logicalTileUnits: 16,
    outlineMode: 'selective-dark', shadingSteps: 3,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: false, extrudePaddingPx: 1,
    detailBudget: ARTISTIC_DETAIL_BUDGETS['classic-8x8']
  }
};

export function resolveDetailBudgetForProfile(profile: ArtStyleProfile): ArtisticDetailBudget {
  if (profile.detailBudget?.moduleSize === profile.moduleSize) return profile.detailBudget;
  if (profile.id !== 'adaptive-auto') {
    const budget = ARTISTIC_DETAIL_BUDGETS[profile.id];
    if (budget?.moduleSize === profile.moduleSize) return budget;
  }
  switch (profile.moduleSize) {
    case 4: return ARTISTIC_DETAIL_BUDGETS['micro-4x4'];
    case 6: return ARTISTIC_DETAIL_BUDGETS['micro-6x6'];
    case 8: return ARTISTIC_DETAIL_BUDGETS['classic-8x8'];
    case 16: return ARTISTIC_DETAIL_BUDGETS['standard-16x16'];
    case 32: return ARTISTIC_DETAIL_BUDGETS['detailed-32x32'];
  }
}

export interface WorldCoordinate {
  readonly worldX: number; // En unidades lógicas (1 tile = 16 unidades)
  readonly worldY: number;
}

export interface ScreenProjection {
  readonly screenX: number;
  readonly screenY: number;
  readonly integerScale: number;
  readonly depthSortKey: number;
}

export class CoordinateSystem {
  constructor(private readonly profile: ArtStyleProfile) {}

  /**
   * Convierte dimensiones en módulos a dimensiones exactas en texels
   */
  public modulesToTexels(modulesWidth: number, modulesHeight: number): { width: number; height: number } {
    return {
      width: Math.round(modulesWidth * this.profile.moduleSize),
      height: Math.round(modulesHeight * this.profile.moduleSize)
    };
  }

  /** Scale of one art module relative to the legacy 4x4 baseline. */
  public computeModuleScaleRatio(): number {
    return this.profile.moduleSize / 4;
  }

  public computeStyleScaleFactor(): number {
    return this.computeModuleScaleRatio();
  }

  /** Resolves nine independent spatial, rendering and presentation dimensions. */
  public resolveNineDimensionSpec(
    widthInModules: number, heightInModules: number,
    logicalFootprintTilesX = 1, logicalFootprintTilesY = 1,
    cameraZoom = 2, screenPixelRatio = 1
  ): MultiResolutionDimensionSpec {
    if (![widthInModules, heightInModules, logicalFootprintTilesX,
      logicalFootprintTilesY, screenPixelRatio].every(n => Number.isFinite(n) && n > 0)) {
      throw new RangeError('All sprite dimensions and screenPixelRatio must be positive finite numbers');
    }
    if (!Number.isFinite(cameraZoom)) throw new RangeError('cameraZoom must be finite');
    const mod = this.profile.moduleSize;
    const pad = this.profile.extrudePaddingPx;
    const innerWidthTexels = Math.round(widthInModules * mod);
    const innerHeightTexels = Math.round(heightInModules * mod);
    return {
      logicalWorldUnits: {
        tileUnits: 16,
        widthLogical: logicalFootprintTilesX * 16,
        heightLogical: logicalFootprintTilesY * 16
      },
      artCompositionUnits: {
        widthInModules, heightInModules, moduleSizeTexels: mod
      },
      nativeSpriteTexels: { innerWidthTexels, innerHeightTexels },
      canonicalTileResolution: this.profile.canonicalTileTexels,
      runtimeSpriteDimensions: {
        paddedWidthTexels: innerWidthTexels + 2 * pad,
        paddedHeightTexels: innerHeightTexels + 2 * pad,
        extrudePaddingPx: pad
      },
      cameraScale: this.computePixelPerfectZoom(cameraZoom),
      screenPixelRatio,
      textureSamplingPolicy: 'nearest-neighbor',
      pixelSnappingPolicy: 'integer-grid'
    };
  }

  /**
   * Convierte coordenadas lógicas del mundo (base 16) a texels del mundo visual canónico (base 24/48)
   * sin alterar jamás la posición física ni el hitbox lógico.
   */
  public logicalToVisualTexel(logicalUnits: number): number {
    const ratio = this.profile.canonicalTileTexels / this.profile.logicalTileUnits;
    return Math.round(logicalUnits * ratio);
  }

  /**
   * Calcula el factor de escala entero (Integer Scaling) libre de pixel shimmering
   */
  public computePixelPerfectZoom(requestedZoom: number, minScale = 1, maxScale = 8): number {
    const clamped = Math.max(minScale, Math.min(maxScale, Math.round(requestedZoom)));
    return clamped;
  }

  /**
   * Proyecta una entidad desde coordenadas lógicas de mundo hacia coordenadas de pantalla pixel-snapped
   */
  public projectWorldToViewport(
    pos: WorldCoordinate,
    cameraWorldX: number,
    cameraWorldY: number,
    requestedZoom: number,
    elevationLogical = 0
  ): ScreenProjection {
    const integerScale = this.computePixelPerfectZoom(requestedZoom);

    const visualX = this.logicalToVisualTexel(pos.worldX);
    const visualY = this.logicalToVisualTexel(pos.worldY);
    const camVisualX = this.logicalToVisualTexel(cameraWorldX);
    const camVisualY = this.logicalToVisualTexel(cameraWorldY);

    // Pixel snapping estricto antes de multiplicar por la escala entera
    const screenX = (visualX - camVisualX) * integerScale;
    const screenY = (visualY - camVisualY) * integerScale;

    // Clave de ordenamiento de profundidad (Y-sorting por punto de apoyo + elevación)
    const depthSortKey = pos.worldY * 1000 + elevationLogical * 10 + (pos.worldX % 10) * 0.01;

    return {
      screenX,
      screenY,
      integerScale,
      depthSortKey
    };
  }
}

const ORDERED_RESOLUTION_TIERS = [
  'micro-4x4', 'micro-6x6', 'classic-8x8', 'standard-16x16', 'detailed-32x32'
] as const;

/**
 * Pure adaptive resolution decision. The caller sends previousProfileId
 * to suppress >1-tier changes (no mutable global selection state).
 */
export class AdaptiveResolutionController {
  public selectOptimalProfile(request: AdaptiveProfileSelectionRequest): ArtStyleProfile {
    const target = request.targetFrameBudgetMs ?? 16.6;
    const frameTime = request.currentFrameTimeMs ?? 8.0;
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(frameTime) || frameTime < 0 ||
      !Number.isFinite(request.cameraZoom) || !Number.isFinite(request.screenPixelRatio) ||
      request.screenPixelRatio <= 0 ||
      !Number.isFinite(request.viewportHeightPx) || request.viewportHeightPx <= 0 ||
      !Number.isFinite(request.distanceFromCameraTiles) || request.distanceFromCameraTiles < 0) {
      throw new RangeError('Invalid adaptive resolution request');
    }

    const viewportFactor = Math.max(0.8, Math.min(1.2, request.viewportHeightPx / 900));
    const effectivePixelsPerTile = 24 * Math.max(0.5, request.cameraZoom)
      * Math.max(1, request.screenPixelRatio * 0.75) * viewportFactor;
    let tierIndex = effectivePixelsPerTile >= 120 ? 4
      : effectivePixelsPerTile >= 64 ? 3
      : effectivePixelsPerTile >= 36 ? 2
      : effectivePixelsPerTile >= 22 ? 1 : 0;

    if (request.visualImportance === 'hero_focal' ||
      request.visualImportance === 'boss_major' || request.category === 'character') {
      tierIndex = Math.min(4, tierIndex + 1);
    } else if (request.visualImportance === 'background') {
      tierIndex = Math.max(0, tierIndex - 1);
    }

    if (request.distanceFromCameraTiles > 28) tierIndex = Math.max(0, tierIndex - 2);
    else if (request.distanceFromCameraTiles > 16) tierIndex = Math.max(0, tierIndex - 1);

    if (frameTime > target * 1.15) tierIndex = Math.max(0, tierIndex - 1);

    if (request.previousProfileId && request.distanceFromCameraTiles <= 28) {
      const previous = ORDERED_RESOLUTION_TIERS.indexOf(
        request.previousProfileId as (typeof ORDERED_RESOLUTION_TIERS)[number]
      );
      if (previous >= 0 && Math.abs(tierIndex - previous) > 1) {
        tierIndex = previous + Math.sign(tierIndex - previous);
      }
    }

    return DEFAULT_STYLE_PROFILES[ORDERED_RESOLUTION_TIERS[tierIndex]];
  }
}
