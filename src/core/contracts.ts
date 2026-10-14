/**
 * PPAE Core Data Contracts & Runtime Schema Validators
 * Version: 1.0.0
 */

export const PPAE_SCHEMA_VERSION = '1.0.0' as const;

export type GranularityProfileId =
  | 'micro-4x4'
  | 'micro-6x6'
  | 'classic-8x8'
  | 'standard-16x16'
  | 'detailed-32x32'
  | 'hybrid-24'
  | 'adaptive-auto';

export type ArtModuleSize = 4 | 6 | 8 | 16 | 32;
export type CanonicalTileTexelSize = 24 | 32 | 48 | 64 | 128;

export type AssetCategory =
  | 'terrain'
  | 'tree'
  | 'bush_flora'
  | 'mineral_rock'
  | 'weapon_blade'
  | 'character'
  | 'creature'
  | 'structure';

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type BiomeId = 'meadow' | 'forest' | 'desert' | 'tundra' | 'volcanic' | 'corrupted';

export interface RGBAColor {
  readonly r: number; // 0-255
  readonly g: number; // 0-255
  readonly b: number; // 0-255
  readonly a: number; // 0-255
}

export interface ColorRamp {
  readonly id: string;
  readonly shadow: RGBAColor;
  readonly midtone: RGBAColor;
  readonly highlight: RGBAColor;
  readonly accent: RGBAColor;
  readonly outline: RGBAColor;
}

export interface PaletteDefinition {
  readonly schemaVersion: string;
  readonly id: string;
  readonly name: string;
  readonly biome: BiomeId;
  readonly season: SeasonId;
  readonly maxColorsPerAsset: number;
  readonly minContrastRatio: number;
  readonly backgroundReference: RGBAColor;
  readonly ramps: Readonly<Record<string, ColorRamp>>;
}

// Phase 7A — nine independent resolution dimensions and per-profile complexity.
export type FacialDetailTier =
  | 'eyes_only'
  | 'eyes_and_brows'
  | 'full_features'
  | 'expressive_hd';

export type TextureSamplingPolicy = 'nearest-neighbor';
export type PixelSnappingPolicy = 'integer-grid' | 'subpixel-camera-snap';

export interface ArtisticDetailBudget {
  readonly profileId: GranularityProfileId;
  readonly moduleSize: ArtModuleSize;
  readonly shadingSteps: 2 | 3 | 4 | 5;
  readonly maxColorsPerSprite: number;
  readonly facialDetailTier: FacialDetailTier;
  readonly foliageSubdivisionLevel: 1 | 2 | 3 | 4;
  readonly barkAndFacetMicroDetailLevel: 1 | 2 | 3 | 4;
  readonly enableSecondaryJointArticulation: boolean;
  readonly enableClothFoldsAndSeams: boolean;
  readonly enableSpecularHighlights: boolean;
  readonly enableSubTexelClusterDithering: boolean;
}

export interface MultiResolutionDimensionSpec {
  readonly logicalWorldUnits: {
    readonly tileUnits: 16;
    readonly widthLogical: number;
    readonly heightLogical: number;
  };
  readonly artCompositionUnits: {
    readonly widthInModules: number;
    readonly heightInModules: number;
    readonly moduleSizeTexels: ArtModuleSize;
  };
  readonly nativeSpriteTexels: {
    readonly innerWidthTexels: number;
    readonly innerHeightTexels: number;
  };
  readonly canonicalTileResolution: CanonicalTileTexelSize;
  readonly runtimeSpriteDimensions: {
    readonly paddedWidthTexels: number;
    readonly paddedHeightTexels: number;
    readonly extrudePaddingPx: number;
  };
  readonly cameraScale: number;
  readonly screenPixelRatio: number;
  readonly textureSamplingPolicy: TextureSamplingPolicy;
  readonly pixelSnappingPolicy: PixelSnappingPolicy;
}

export interface AdaptiveProfileSelectionRequest {
  readonly category: AssetCategory;
  readonly cameraZoom: number;
  readonly viewportHeightPx: number;
  readonly screenPixelRatio: number;
  readonly distanceFromCameraTiles: number;
  readonly visualImportance: 'background' | 'standard' | 'hero_focal' | 'boss_major';
  readonly currentFrameTimeMs?: number;
  readonly targetFrameBudgetMs?: number;
  readonly previousProfileId?: GranularityProfileId;
}

export interface ArtStyleProfile {
  readonly schemaVersion: string;
  readonly id: GranularityProfileId;
  readonly moduleSize: ArtModuleSize;
  readonly canonicalTileTexels: CanonicalTileTexelSize;
  readonly logicalTileUnits: 16;
  readonly outlineMode: 'none' | 'selective-dark' | 'full-silhouette';
  readonly shadingSteps: 2 | 3 | 4 | 5;
  readonly lightDirectionVector: readonly [number, number]; // Normalizado, ej. [-0.7, -0.7] (Noroeste)
  readonly allowDithering: boolean;
  readonly extrudePaddingPx: number;
  readonly detailBudget?: ArtisticDetailBudget;
}

export interface AnchorPoint {
  readonly id: string;
  readonly texelX: number;
  readonly texelY: number;
  readonly normalizedX: number;
  readonly normalizedY: number;
}

export interface LogicalHitbox {
  readonly offsetX: number; // En unidades lógicas (base 16)
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
  readonly collidable: boolean;
}

export interface ProceduralAssetDefinition {
  readonly schemaVersion: string;
  readonly id: string;
  readonly category: AssetCategory;
  readonly archetype: string;
  readonly widthInModules: number;
  readonly heightInModules: number;
  readonly primaryRampId: string;
  readonly secondaryRampId: string;
  readonly accentRampId?: string;
  readonly symmetry: 'none' | 'vertical' | 'radial';
  readonly pivotNormalized: readonly [number, number]; // [0.5, 0.9] para base de apoyo
  readonly logicalHitbox: LogicalHitbox;
  readonly parameters: Readonly<Record<string, number | string | boolean>>;
}

export interface AssetGenerationRequest {
  readonly worldSeed: string | number;
  readonly assetDefinition: ProceduralAssetDefinition;
  readonly styleProfile: ArtStyleProfile;
  readonly palette: PaletteDefinition;
  readonly variantIndex?: number;
  readonly stateTag?: 'intact' | 'damaged' | 'snowy' | 'wind_sway';
}

export interface GeneratedTextureMetadata {
  readonly cacheKey: string;
  readonly assetId: string;
  readonly category: AssetCategory;
  readonly generatorVersion: string;
  readonly resolvedSeed: number;
  readonly profileId: GranularityProfileId;
  readonly texelWidth: number;
  readonly texelHeight: number;
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly paddingPx: number;
  readonly pivotTexel: readonly [number, number];
  readonly anchors: Readonly<Record<string, AnchorPoint>>;
  readonly logicalHitbox: LogicalHitbox;
  readonly uniqueColorCount: number;
  readonly contrastRatioAgainstBiome: number | null;
  readonly generationTimeMs: number;
  readonly memoryBytes: number;
}

export interface GeneratedAssetArtifact {
  readonly metadata: GeneratedTextureMetadata;
  readonly pixels: Uint8ClampedArray;
}

export interface TextureAtlasEntry {
  readonly cacheKey: string;
  readonly atlasX: number;
  readonly atlasY: number;
  readonly width: number;
  readonly height: number;
  readonly metadata: GeneratedTextureMetadata;
}

export interface TextureAtlasMetadata {
  readonly schemaVersion: string;
  readonly atlasId: string;
  readonly width: number;
  readonly height: number;
  readonly entries: Readonly<Record<string, TextureAtlasEntry>>;
}

export interface EngineTelemetrySnapshot {
  readonly totalGeneratedCount: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly cacheHitRate: number;
  readonly activeCacheEntries: number;
  readonly memoryUsedBytes: number;
  readonly memoryBudgetBytes: number;
  readonly evictedEntriesCount: number;
  readonly genTimeP50Ms: number;
  readonly genTimeP95Ms: number;
  readonly genTimeP99Ms: number;
}

/**
 * Validación estricta de contratos en runtime
 */
export class ContractValidationError extends Error {
  constructor(message: string) {
    super(`[PPAE ContractValidationError] ${message}`);
    this.name = 'ContractValidationError';
  }
}

export function validateArtStyleProfile(profile: ArtStyleProfile): void {
  if (profile.schemaVersion !== PPAE_SCHEMA_VERSION) {
    throw new ContractValidationError(`Unsupported schemaVersion: ${profile.schemaVersion}`);
  }
  if (![4, 6, 8, 16, 32].includes(profile.moduleSize)) {
    throw new ContractValidationError(
      `moduleSize must be one of 4, 6, 8, 16, or 32; received ${profile.moduleSize}`
    );
  }
  if (![24, 32, 48, 64, 128].includes(profile.canonicalTileTexels)) {
    throw new ContractValidationError(
      `canonicalTileTexels must be one of 24, 32, 48, 64, or 128; received ${profile.canonicalTileTexels}`
    );
  }
  if (profile.canonicalTileTexels % profile.moduleSize !== 0) {
    throw new ContractValidationError(
      `canonicalTileTexels (${profile.canonicalTileTexels}) must be a multiple of moduleSize (${profile.moduleSize})`
    );
  }
  if (!Number.isInteger(profile.extrudePaddingPx) || profile.extrudePaddingPx < 0 || profile.extrudePaddingPx > 4) {
    throw new ContractValidationError('extrudePaddingPx must be between 0 and 4');
  }
  if (profile.detailBudget && (
    profile.detailBudget.moduleSize !== profile.moduleSize ||
    profile.detailBudget.shadingSteps !== profile.shadingSteps ||
    profile.detailBudget.maxColorsPerSprite < 1
  )) {
    throw new ContractValidationError(
      'detailBudget must match the profile moduleSize and shadingSteps and have a positive color budget'
    );
  }
}

export function validateAssetDefinition(def: ProceduralAssetDefinition): void {
  if (!def.id || def.id.trim().length === 0) {
    throw new ContractValidationError('Asset definition requires a non-empty id');
  }
  if (def.widthInModules < 1 || def.heightInModules < 1) {
    throw new ContractValidationError(
      `Asset ${def.id} dimensions in modules must be >= 1 (got ${def.widthInModules}x${def.heightInModules})`
    );
  }
  const [px, py] = def.pivotNormalized;
  if (px < 0 || px > 1 || py < 0 || py > 1) {
    throw new ContractValidationError(`Asset ${def.id} pivotNormalized must be within [0, 1]`);
  }
}
// ============================================================================
// PHASE 2 CONTRACTS: TERRAIN, AUTOTILING, LIQUIDS, NATURE & CHUNK STREAMING
// ============================================================================

export type TerrainMaterialId =
  | 'deep_water'
  | 'shallow_water'
  | 'sand_beach'
  | 'dirt_soil'
  | 'meadow_grass'
  | 'forest_moss'
  | 'desert_dune'
  | 'rock_cliff'
  | 'snow_frost'
  | 'volcanic_ash'
  | 'lava_magma';

export interface TerrainMaterialDefinition {
  readonly schemaVersion: string;
  readonly id: TerrainMaterialId;
  readonly layerPriority: number; // Mayor prioridad superpone su borde sobre prioridades menores
  readonly isLiquid: boolean;
  readonly walkable: boolean;
  readonly baseColorHex: string;
  readonly shadowColorHex: string;
  readonly highlightColorHex: string;
  readonly accentColorHex: string;
  readonly transitionBorderHex: string;
  readonly patternType: 'organic_tuft' | 'granular_sand' | 'cracked_stone' | 'liquid_wave' | 'frost_crystalline';
}

export interface BiomeVisualDefinition {
  readonly schemaVersion: string;
  readonly id: BiomeId;
  readonly primarySurface: TerrainMaterialId;
  readonly secondarySurface: TerrainMaterialId;
  readonly shoreSurface: TerrainMaterialId;
  readonly liquidSurface: TerrainMaterialId;
  readonly treeDensity: number; // [0, 1]
  readonly floraDensity: number; // [0, 1]
  readonly rockDensity: number; // [0, 1]
}

/**
 * Bits cardinales y diagonales ya filtrados por Corner Gating (estándar 47-blob)
 * N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128
 */
export type AutotileMask8 = number;

/** Semantic configuration of one of the 47 corner-gated 8-neighbor blob masks. */
export type AutotileTopologyKind =
  | 'interior_full'
  | 'isolated_island'
  | 'end_cap'
  | 'straight_edge'
  | 'outer_corner'
  | 'inner_corner'
  | 'corridor_bridge'
  | 't_junction'
  | 'cross_junction'
  | 'complex_blend';

export interface AutotileMaskClassification {
  readonly mask: AutotileMask8;
  readonly isCanonical47: boolean;
  readonly topology: AutotileTopologyKind;
  readonly cardinalCount: number;
  readonly diagonalCount: number;
}

export type BotanicalFamilyId =
  | 'oak'
  | 'pine'
  | 'birch'
  | 'palm'
  | 'tropical'
  | 'mangrove'
  | 'willow'
  | 'fruit_tree'
  | 'bamboo'
  | 'dead_tree'
  | 'fantasy_lumin'
  | 'corrupted_thorn';

export type TreeSpeciesId = BotanicalFamilyId;

export type TreeLifecycleStage =
  | 'seed'
  | 'sprout'
  | 'sapling'
  | 'young'
  | 'immature'
  | 'mature'
  | 'ancient'
  | 'damaged'
  | 'dead'
  | 'burned'
  | 'stump'
  | 'fallen_log';

export type TreeCrownArchitecture =
  | 'spreading_dome'
  | 'layered_tiers'
  | 'weeping_cascade'
  | 'columnar_spire'
  | 'umbrella_canopy'
  | 'fragmented_open'
  | 'windswept_asymmetric'
  | 'radial_fronds'
  | 'segmented_culms'
  | 'gnarled_bare';

export type TreeTrunkPosture =
  | 'upright'
  | 'leaning'
  | 'curved_s'
  | 'forked_twin'
  | 'gnarled_twisted'
  | 'multi_stemmed'
  | 'buttressed_wide';

export type TreeRootStructure =
  | 'compact_flare'
  | 'spreading_surface'
  | 'aerial_prop'
  | 'buttress_ridges'
  | 'sunken';

export type FoliageClusterDistribution =
  | 'dense_billowing'
  | 'stratified_pads'
  | 'pendulous_fronds'
  | 'sparse_tufts'
  | 'vertical_plumes'
  | 'none';

export interface TreeSpeciesDefinition {
  readonly schemaVersion: string;
  readonly speciesId: TreeSpeciesId;
  readonly canopyShape:
    | 'rounded_clusters'
    | 'conical_tiers'
    | 'radial_fronds'
    | 'slender_column'
    | 'twisted_branches'
    | TreeCrownArchitecture;
  readonly trunkWidthModules: number;
  readonly baseHeightModules: number;
  readonly woodColors: {
    readonly outline: string;
    readonly shadow: string;
    readonly midtone: string;
    readonly highlight: string;
  };
  readonly foliageColors: {
    readonly outline: string;
    readonly shadow: string;
    readonly midtone: string;
    readonly highlight: string;
    readonly fruitOrAccent?: string;
  };
}

/** Nivel B: arquetipo morfológico dentro de una familia botánica. */
export interface TreeMorphologyArchetype {
  readonly archetypeId: string;
  readonly familyId: BotanicalFamilyId;
  readonly displayName: string;
  readonly crownArchitecture: TreeCrownArchitecture;
  readonly trunkPosture: TreeTrunkPosture;
  readonly rootStructure: TreeRootStructure;
  readonly foliageDistribution: FoliageClusterDistribution;
  readonly widthModulesRange: readonly [number, number];
  readonly heightModulesRange: readonly [number, number];
  readonly trunkHeightRatioRange: readonly [number, number];
  readonly trunkSlendernessRange: readonly [number, number];
  readonly maxLeanAngleRad: number;
  readonly asymmetryBiasRange: readonly [number, number];
  readonly primaryBranchCountRange: readonly [number, number];
  readonly secondaryBranchCountRange: readonly [number, number];
  readonly canopyOpenness: number;
  readonly exposedBranchRatio: number;
  readonly allowsFruitOrBlossom: boolean;
}

export interface TreeSkeletonNode {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly radiusPx: number;
  readonly depthOrder: number;
}

export interface TreeBranchSegment {
  readonly segmentId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly startX: number;
  readonly startY: number;
  readonly controlX: number;
  readonly controlY: number;
  readonly endX: number;
  readonly endY: number;
  readonly startRadiusPx: number;
  readonly endRadiusPx: number;
  readonly order: 0 | 1 | 2;
  readonly isExposedDeadwood: boolean;
}

export interface TreeRootTendril {
  readonly rootId: string;
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly thicknessPx: number;
  readonly isAerialProp: boolean;
}

export interface TreeFoliageMassNode {
  readonly massId: string;
  readonly attachedNodeId: string;
  readonly centerX: number;
  readonly centerY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly lobeCount: number;
  readonly angleTiltRad: number;
  readonly density: number;
  readonly layerDepth: 'back' | 'mid' | 'front';
  readonly dropLengthPx?: number;
}

export interface TreeStructuralSkeleton {
  readonly pivotX: number;
  readonly pivotY: number;
  readonly nodes: readonly TreeSkeletonNode[];
  readonly segments: readonly TreeBranchSegment[];
  readonly roots: readonly TreeRootTendril[];
  readonly foliageMasses: readonly TreeFoliageMassNode[];
}

export interface TreeSilhouetteMetrics {
  readonly aspectRatio: number;
  readonly canopyWidthToHeightRatio: number;
  readonly trunkToTotalHeightRatio: number;
  readonly horizontalAsymmetry: number;
  readonly branchSpreadSpanPx: number;
  readonly foliageMassCount: number;
  readonly canopyOpennessScore: number;
}

export interface TreeMorphologyDescriptor {
  readonly schemaVersion: string;
  readonly seed: number;
  readonly familyId: BotanicalFamilyId;
  readonly archetypeId: string;
  readonly stage: TreeLifecycleStage;
  readonly crownArchitecture: TreeCrownArchitecture;
  readonly trunkPosture: TreeTrunkPosture;
  readonly rootStructure: TreeRootStructure;
  readonly foliageDistribution: FoliageClusterDistribution;
  readonly canvasWidthModules: number;
  readonly canvasHeightModules: number;
  readonly canvasWidthTexels: number;
  readonly canvasHeightTexels: number;
  readonly skeleton: TreeStructuralSkeleton;
  readonly metrics: TreeSilhouetteMetrics;
}

export type SecondaryFloraKind =
  | 'short_grass'
  | 'tall_grass'
  | 'wild_herb'
  | 'weed_thistle'
  | 'low_shrub'
  | 'flowering_shrub'
  | 'wild_flower'
  | 'flower_cluster'
  | 'fern'
  | 'ground_moss'
  | 'mushroom_cluster'
  | 'water_lily_pad'
  | 'water_reed'
  | 'creeping_vine'
  | 'thorny_bramble'
  | 'tropical_broadleaf'
  | 'desert_cactus';

export type GeologicalResourceKind =
  | 'surface_pebbles'
  | 'mossy_boulder'
  | 'coal_deposit'
  | 'copper_vein'
  | 'iron_vein'
  | 'gold_vein'
  | 'crystal_geode'
  | 'angular_boulder'
  | 'rounded_riverstone'
  | 'fractured_monolith'
  | 'flat_slab'
  | 'sunken_half_buried'
  | 'jagged_outcrop'
  | 'stacked_cairn'
  | 'eroded_sandstone'
  | 'volcanic_basalt'
  | 'crag_cliff_boulder';

export type RockLithologyId =
  | 'granite' | 'slate' | 'sandstone' | 'basalt'
  | 'limestone' | 'quartzite' | 'obsidian';

export type GeologicalFormationGeometryClass =
  | 'pebble_scatter'
  | 'angular_polyhedron'
  | 'rounded_boulder'
  | 'split_monolith'
  | 'layered_slab'
  | 'sunken_embed'
  | 'jagged_spires'
  | 'stacked_stones'
  | 'columnar_basalt'
  | 'crystal_cluster_geode';

export interface GeologicalPolygonVertex {
  readonly x: number;
  readonly y: number;
}

export interface GeologicalFacetPlane {
  readonly facetId: string;
  readonly vertices: readonly GeologicalPolygonVertex[];
  readonly normalVector3D: readonly [number, number, number];
  readonly faceLightScore: number; // [-1, 1]
  readonly toneBand: 'shadow' | 'midtone' | 'highlight' | 'rim_accent';
}

export interface GeologicalFractureLine {
  readonly fractureId: string;
  readonly points: readonly GeologicalPolygonVertex[];
  readonly widthPx: number;
  readonly depthShadow: boolean;
  readonly hostsMineralVein: boolean;
}

export interface MineralInclusionCluster {
  readonly inclusionId: string;
  readonly shape: 'embedded_vein' | 'hex_crystal_spire' | 'geode_cavity' | 'ore_nodule';
  readonly centerX: number;
  readonly centerY: number;
  readonly lengthPx: number;
  readonly widthPx: number;
  readonly tiltAngleRad: number;
  readonly primaryHex: string;
  readonly highlightHex: string;
  readonly coreGlowHex: string;
}

export interface RockSubFragment {
  readonly fragmentId: string;
  readonly centerX: number;
  readonly centerY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly zOrder: number;
  readonly hullVertices: readonly GeologicalPolygonVertex[];
  readonly facets: readonly GeologicalFacetPlane[];
  readonly fractures: readonly GeologicalFractureLine[];
  readonly mossCoverageRatio: number;
  readonly strataLineSpacingPx?: number;
}

export interface GeologicalArchetypeDefinition {
  readonly kind: GeologicalResourceKind;
  readonly lithology: RockLithologyId;
  readonly geometryClass: GeologicalFormationGeometryClass;
  readonly widthModulesRange: readonly [number, number];
  readonly heightModulesRange: readonly [number, number];
  readonly fragmentCountRange: readonly [number, number];
  readonly angularity: number;
  readonly flatnessRatio: number;
  readonly burialDepthRatio: number;
  readonly fractureDensity: number;
  readonly mossAffinity: number;
  readonly hasStrataBands: boolean;
  readonly stonePalette: {
    readonly outlineHex: string;
    readonly deepShadowHex: string;
    readonly midtoneHex: string;
    readonly highlightHex: string;
    readonly accentHex: string;
  };
  readonly mineralPalette?: {
    readonly veinShadowHex: string;
    readonly veinMidtoneHex: string;
    readonly veinHighlightHex: string;
    readonly veinCoreHex: string;
  };
}

export interface GeologicalMorphologyDescriptor {
  readonly schemaVersion: string;
  readonly seed: number;
  readonly kind: GeologicalResourceKind;
  readonly lithology: RockLithologyId;
  readonly geometryClass: GeologicalFormationGeometryClass;
  readonly canvasWidthModules: number;
  readonly canvasHeightModules: number;
  readonly canvasWidthTexels: number;
  readonly canvasHeightTexels: number;
  readonly pivotTexel: readonly [number, number];
  readonly fragments: readonly RockSubFragment[];
  readonly mineralInclusions: readonly MineralInclusionCluster[];
  readonly metrics: {
    readonly fragmentCount: number;
    readonly totalFacetCount: number;
    readonly fractureCount: number;
    readonly inclusionCount: number;
    readonly aspectRatio: number;
    readonly angularityScore: number;
  };
}

export interface WorldTileSample {
  readonly tileX: number;
  readonly tileY: number;
  readonly elevation: number; // [-1.0 a 1.0]
  readonly moisture: number; // [0.0 a 1.0]
  readonly temperature: number; // [0.0 a 1.0]
  readonly biome: BiomeId;
  readonly material: TerrainMaterialId;
  readonly autotileMask: AutotileMask8;
  readonly transitionNeighborMaterial?: TerrainMaterialId;
  readonly propSpawn?: {
    readonly kind: 'tree' | 'flora' | 'mineral';
    readonly subType: string;
    readonly stage?: TreeLifecycleStage;
    readonly variantSeed: number;
    readonly archetypeId?: string;
  };
}
// ============================================================================
// PHASE 3 CONTRACTS: CHARACTER ANATOMY, 8-DIRECTION RIGGING, ASM & SPRITESHEETS
// ============================================================================

export type Direction8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export const ALL_DIRECTIONS_8: readonly Direction8[] = [
  'S',
  'SE',
  'E',
  'NE',
  'N',
  'NW',
  'W',
  'SW'
] as const;

export type CharacterActionId =
  | 'idle' | 'walk' | 'run' | 'sprint' | 'sneak'
  | 'attack' | 'heavy_attack' | 'block' | 'dodge' | 'use_tool'
  | 'hurt' | 'death'
  | 'healing' | 'eating' | 'drinking'
  | 'mining' | 'chopping' | 'harvesting' | 'fishing'
  | 'farming' | 'digging' | 'building' | 'crafting'
  | 'swimming' | 'sleeping' | 'sitting'
  | 'casting_spells' | 'carrying_objects';

export type BodyBuildType = 'slim' | 'standard' | 'sturdy';
export type HairStyleId =
  | 'short_crop' | 'long_adventure' | 'ponytail' | 'mohawk'
  | 'wavy_shoulder' | 'braided_crown' | 'curly_afro' | 'bald';
export type BeardStyleId = 'none' | 'stubble' | 'full_beard' | 'mustache';
export type HelmetStyleId =
  | 'none' | 'knight_helm' | 'ranger_hood' | 'straw_hat' | 'crown'
  | 'miner_hardhat' | 'wizard_pointed_hat' | 'bandana';
export type ArmorStyleId =
  | 'cloth_tunic' | 'leather_vest' | 'iron_plate' | 'mage_robe'
  | 'farmer_overalls' | 'blacksmith_apron' | 'noble_coat';
export type MainHandItemId =
  | 'none' | 'iron_sword' | 'woodcutter_axe' | 'mining_pickaxe' | 'oak_staff'
  | 'wooden_hoe' | 'fishing_rod' | 'smith_hammer' | 'hunting_bow';
export type OffHandItemId =
  | 'none' | 'wooden_shield' | 'knight_kite_shield' | 'lantern'
  | 'spell_tome' | 'harvest_basket';
export type VisualStatusEffect = 'none' | 'hurt_flash' | 'poisoned' | 'frozen' | 'burning';
export type FacialExpressionId = 'neutral' | 'determined' | 'happy' | 'surprised' | 'blink';
export type CharacterAgeGroup = 'youth' | 'adult' | 'elder';
export type CharacterEarStyle = 'human_round' | 'elf_pointed' | 'fae_long';
export type CharacterHornStyle = 'none' | 'small_oni' | 'curved_ram';
export type FaceMarkingStyle = 'none' | 'freckles' | 'war_paint' | 'arcane_rune';
export type BackpackStyleId = 'none' | 'travel_pack' | 'miner_basket' | 'herbalist_satchel' | 'quiver';

export interface EntityAppearance {
  readonly schemaVersion: string;
  readonly entityId: string;
  readonly seed: number;
  readonly bodyBuild: BodyBuildType;
  readonly heightScale: number; // Rango artístico permitido: [0.9, 1.1]
  readonly skinColorHex: string;
  readonly skinShadowHex: string;
  readonly eyeColorHex: string;
  readonly hairStyle: HairStyleId;
  readonly hairColorHex: string;
  readonly hairShadowHex: string;
  readonly beardStyle: BeardStyleId;
  readonly hasFacialScar: boolean;
  readonly scarSide: 'left' | 'right'; // Asimetría anatómica real
  readonly expression?: FacialExpressionId;
  readonly ageGroup?: CharacterAgeGroup;
  readonly earStyle?: CharacterEarStyle;
  readonly hornStyle?: CharacterHornStyle;
  readonly faceMarking?: FaceMarkingStyle;
}

export interface EquipmentLoadout {
  readonly helmet: HelmetStyleId;
  readonly helmetPrimaryHex: string;
  readonly armor: ArmorStyleId;
  readonly armorPrimaryHex: string;
  readonly armorSecondaryHex: string;
  readonly hasCape: boolean;
  readonly capeColorHex: string;
  readonly bootsColorHex: string;
  readonly glovesColorHex: string;
  readonly mainHand: MainHandItemId; // Siempre equipado en la mano derecha anatómica
  readonly offHand: OffHandItemId;   // Siempre equipado en la mano izquierda anatómica
  readonly backpack?: BackpackStyleId;
  readonly backpackColorHex?: string;
}

export type NpcProfessionArchetypeId =
  | 'villager_farmer' | 'blacksmith_artisan' | 'town_guard' | 'wandering_mage'
  | 'forest_ranger' | 'merchant_trader' | 'elder_scholar' | 'miner_prospector';

export interface CharacterDirectionContinuityMetrics {
  readonly direction: Direction8;
  readonly bodyOpaquePixelCount: number;
  readonly connectedComponentCount: number;
  readonly largestComponentRatio: number;
  readonly headConnectedToTorso: boolean;
  readonly feetAnchoredToGround: boolean;
}

export interface CharacterAnatomicalAuditReport {
  readonly entityId: string;
  readonly action: CharacterActionId;
  readonly passedAllDirections: boolean;
  readonly directionMetrics: Readonly<Record<Direction8, CharacterDirectionContinuityMetrics>>;
}

export type AnatomicalJointId =
  | 'root'
  | 'pelvis'
  | 'torso'
  | 'neck'
  | 'head'
  | 'shoulder_r'
  | 'shoulder_l'
  | 'elbow_r'
  | 'elbow_l'
  | 'hand_r'
  | 'hand_l'
  | 'knee_r'
  | 'knee_l'
  | 'foot_r'
  | 'foot_l'
  | 'weapon_tip';

export interface JointTransform2D {
  readonly jointId: AnatomicalJointId;
  readonly x: number; // En texels relativos al centro horizontal del lienzo
  readonly y: number; // En texels relativos al pivote de suelo (root = 0)
  readonly zOrder: number; // Mayor valor se dibuja más cerca de la cámara
}

export interface CharacterRigPose {
  readonly action: CharacterActionId;
  readonly direction: Direction8;
  readonly frameIndex: number;
  readonly totalFrames: number;
  readonly isCollapsedOnGround: boolean;
  readonly weaponSwingAngleDeg: number;
  readonly joints: Readonly<Record<AnatomicalJointId, JointTransform2D>>;
}

export type AnimationEventId =
  | 'footstep_left' | 'footstep_right'
  | 'attack_hit' | 'heavy_attack_cleave'
  | 'block_guard_up' | 'dodge_iframe_start'
  | 'tool_strike' | 'mine_pick_impact' | 'chop_axe_impact'
  | 'harvest_gather' | 'fish_cast_line' | 'farm_hoe_till'
  | 'dig_shovel_scoop' | 'build_hammer_hit' | 'craft_work_tick'
  | 'consume_item_effect' | 'heal_pulse' | 'spell_cast_release'
  | 'swim_stroke' | 'hurt_impact' | 'death_collapse' | 'clip_complete';

export interface AnimationFrameEvent {
  readonly frameIndex: number;
  readonly eventId: AnimationEventId;
  readonly payload?: Readonly<Record<string, string | number | boolean>>;
}

export interface AnimationClipDefinition {
  readonly schemaVersion: string;
  readonly action: CharacterActionId;
  readonly frameCount: number;
  readonly frameDurationMs: number;
  readonly loop: boolean;
  readonly priority: number;
  readonly interruptible: boolean;
  readonly events: readonly AnimationFrameEvent[];
}

export interface SpritesheetFrameMetadata {
  readonly frameKey: string;
  readonly action: CharacterActionId;
  readonly direction: Direction8;
  readonly frameIndex: number;
  readonly atlasX: number;
  readonly atlasY: number;
  readonly width: number;
  readonly height: number;
  readonly innerX: number;
  readonly innerY: number;
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly durationMs: number;
  readonly pivotTexel: readonly [number, number];
  readonly anchors: Readonly<Record<string, AnchorPoint>>;
  readonly hitbox: LogicalHitbox;
  readonly events: readonly AnimationEventId[];
}

export interface CompiledSpritesheetMetadata {
  readonly schemaVersion: string;
  readonly entityId: string;
  readonly profileId: GranularityProfileId;
  readonly sheetWidth: number;
  readonly sheetHeight: number;
  readonly paddingPx: number;
  readonly directions: readonly Direction8[];
  readonly actions: readonly CharacterActionId[];
  readonly frames: Readonly<Record<string, SpritesheetFrameMetadata>>;
  readonly sequenceOrder: Readonly<Record<string, readonly string[]>>;
}
// ============================================================================
// PHASE 4 CONTRACTS: CREATURE ARCHETYPES, FAUNA, MONSTERS & MULTI-SEGMENT BOSS
// ============================================================================

export type CreatureFamilyId =
  | 'quadruped'
  | 'avian_biped'
  | 'gelatinous_slime'
  | 'arachnid'
  | 'flying_winged'
  | 'aquatic_swimmer';

export type CreatureActionId =
  | 'idle'
  | 'move'
  | 'sprint_flee'
  | 'rest_graze'
  | 'eat_feed'
  | 'sleep'
  | 'jump_pounce'
  | 'swim'
  | 'attack'
  | 'special_ability'
  | 'hurt'
  | 'death';

export type LocomotionMedium = 'terrestrial' | 'aquatic' | 'aerial' | 'amphibious';

export type CreatureSpeciesId =
  | 'dairy_cow'
  | 'meadow_sheep'
  | 'farm_chicken'
  | 'timber_wolf'
  | 'river_trout'
  | 'emerald_slime'
  | 'cave_spider'
  | 'vampire_bat';

export interface CreatureSpeciesProfile {
  readonly schemaVersion: string;
  readonly speciesId: CreatureSpeciesId;
  readonly family: CreatureFamilyId;
  readonly isHostile: boolean;
  readonly widthModules: number;
  readonly heightModules: number;
  readonly primaryHex: string;
  readonly shadowHex: string;
  readonly highlightHex: string;
  readonly secondaryHex: string; // Manchas, cresta, núcleo interno, ojos o colmillos
  readonly accentHex: string;
  readonly outlineHex: string;
  readonly features: {
    readonly hasHorns?: boolean;
    readonly hasSpots?: boolean;
    readonly hasUdder?: boolean;
    readonly hasBushyTail?: boolean;
    readonly hasPointedEars?: boolean;
    readonly hasCombAndWattle?: boolean;
    readonly hasTranslucentCore?: boolean;
    readonly legPairs?: 1 | 2 | 4;
    readonly defaultFlightAltitudeTexels?: number;
  };
  readonly logicalHitbox: LogicalHitbox;
}

// Phase 6B — capability-gated creature animation and deterministic sprite atlases.
export interface CreatureAnimationClipDefinition {
  readonly schemaVersion: string;
  readonly action: CreatureActionId;
  readonly frameCount: number;
  readonly frameDurationMs: number;
  readonly loop: boolean;
  readonly priority: number;
  readonly interruptible: boolean;
  readonly events: readonly AnimationFrameEvent[];
}

export interface SpeciesAnimationCapabilityProfile {
  readonly schemaVersion: string;
  readonly family: CreatureFamilyId;
  readonly locomotionMedia: readonly LocomotionMedium[];
  readonly supportedActions: readonly CreatureActionId[];
  readonly fallbackActionMap: Readonly<Partial<Record<CreatureActionId, CreatureActionId>>>;
}

export interface CreatureSpritesheetFrameMetadata {
  readonly frameKey: string;
  readonly speciesId: CreatureSpeciesId;
  readonly action: CreatureActionId;
  readonly direction: Direction8;
  readonly frameIndex: number;
  readonly atlasX: number;
  readonly atlasY: number;
  readonly width: number;
  readonly height: number;
  readonly innerX: number;
  readonly innerY: number;
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly durationMs: number;
  readonly pivotTexel: readonly [number, number];
  readonly anchors: Readonly<Record<string, AnchorPoint>>;
  readonly hitbox: LogicalHitbox;
  readonly events: readonly AnimationEventId[];
}

export interface CompiledCreatureSpritesheetMetadata {
  readonly schemaVersion: string;
  readonly speciesId: CreatureSpeciesId;
  readonly family: CreatureFamilyId;
  readonly profileId: GranularityProfileId;
  readonly sheetWidth: number;
  readonly sheetHeight: number;
  readonly paddingPx: number;
  readonly directions: readonly Direction8[];
  readonly actions: readonly CreatureActionId[];
  readonly frames: Readonly<Record<string, CreatureSpritesheetFrameMetadata>>;
  readonly sequenceOrder: Readonly<Record<string, readonly string[]>>;
}

export type BossPhaseId = 'phase_1_dormant' | 'phase_2_enraged' | 'phase_3_critical';

export type BossSegmentId =
  | 'core_monolith'
  | 'dorsal_weakpoint_crystal'
  | 'left_bastion_shield_arm'
  | 'right_crusher_hammer_arm';

export type BossSegmentIntegrity = 'intact' | 'cracked' | 'destroyed';

export type BossActionId =
  | 'idle_float'
  | 'telegraph_charge'
  | 'crusher_slam'
  | 'crystal_nova'
  | 'hurt_stagger'
  | 'staged_death';

export type BossDeathStage =
  | 'alive'
  | 'stage_1_arms_shatter'
  | 'stage_2_core_overload'
  | 'stage_3_monolith_collapse';

export type TelegraphPatternKind = 'none' | 'radial_slam' | 'frontal_cleave' | 'cross_laser';

export interface BossSegmentState {
  readonly segmentId: BossSegmentId;
  readonly integrity: BossSegmentIntegrity;
  readonly isWeakPoint: boolean;
  readonly localHitbox: LogicalHitbox;
}

export interface BossVisualState {
  readonly schemaVersion: string;
  readonly bossId: string;
  readonly seed: number;
  readonly phase: BossPhaseId;
  readonly action: BossActionId;
  readonly direction: Direction8;
  readonly frameIndex: number;
  readonly totalFrames: number;
  readonly deathStage: BossDeathStage;
  readonly telegraphKind: TelegraphPatternKind;
  readonly telegraphProgress: number; // [0.0 a 1.0]
  readonly segments: Readonly<Record<BossSegmentId, BossSegmentState>>;
}
// ============================================================================
// PHASE 5 CONTRACTS: STRUCTURES, INTERIORS, FORMAL PORTALS & CAVES
// ============================================================================

export type StructureArchetypeId =
  | 'cottage_house'
  | 'blacksmith_forge'
  | 'watch_tower'
  | 'wooden_bridge'
  | 'cave_entrance';

export type WallMaterialId = 'timber_frame' | 'cobblestone' | 'ashlar_brick' | 'cavern_rock';
export type RoofStyleId = 'pitched_shingle' | 'thatched_gable' | 'stone_battlement' | 'none';

export interface LogicalRect {
  readonly x: number; // En unidades lógicas de mundo (base 16 por tile)
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface StructureDefinition {
  readonly schemaVersion: string;
  readonly structureId: string;
  readonly archetype: StructureArchetypeId;
  readonly wallMaterial: WallMaterialId;
  readonly roofStyle: RoofStyleId;
  readonly widthInTiles: number;
  readonly heightInTiles: number;
  readonly hasChimney: boolean;
  readonly windowCount: number;
  readonly doorTileOffsetX: number; // Offset en tiles desde la esquina izquierda del edificio
  readonly wallPrimaryHex: string;
  readonly wallSecondaryHex: string;
  readonly roofPrimaryHex: string;
  readonly roofShadowHex: string;
}

export type FurnitureKind =
  | 'bed'
  | 'dining_table'
  | 'wooden_chair'
  | 'bookshelf'
  | 'storage_chest'
  | 'furnace_hearth'
  | 'wall_torch'
  | 'woven_rug';

export interface FurniturePlacement {
  readonly id: string;
  readonly kind: FurnitureKind;
  readonly tileX: number;
  readonly tileY: number;
  readonly widthTiles: number;
  readonly heightTiles: number;
  readonly collidable: boolean;
  readonly emitsLight?: boolean;
}

export interface InteriorDefinition {
  readonly schemaVersion: string;
  readonly interiorId: string;
  readonly parentStructureId: string;
  readonly widthInTiles: number;
  readonly heightInTiles: number;
  readonly floorMaterialHex: string;
  readonly floorAccentHex: string;
  readonly wallMaterialHex: string;
  readonly exitDoorTileX: number;
  readonly exitDoorTileY: number;
  readonly furniture: readonly FurniturePlacement[];
}

export type WorldSpaceKind = 'exterior_overworld' | 'building_interior' | 'underground_cave';

export interface PortalEndpoint {
  readonly spaceKind: WorldSpaceKind;
  readonly spaceId: string;
  readonly triggerRect: LogicalRect;
  readonly safeSpawnPoint: {
    readonly worldX: number;
    readonly worldY: number;
    readonly facingDirection: Direction8;
  };
}

export interface PortalDefinition {
  readonly schemaVersion: string;
  readonly portalId: string;
  readonly structureId: string;
  readonly doorId: string;
  readonly isOpen: boolean;
  readonly isLocked: boolean;
  readonly requiredKeyId?: string;
  readonly sideA: PortalEndpoint; // Ej: Exterior frente a la puerta
  readonly sideB: PortalEndpoint; // Ej: Interior de la vivienda o cámara de cueva
}

export interface CaveChamberDefinition {
  readonly schemaVersion: string;
  readonly caveId: string;
  readonly widthInTiles: number;
  readonly heightInTiles: number;
  readonly seed: number;
  readonly hasLavaPool: boolean;
  readonly crystalCount: number;
  readonly exitStairsTileX: number;
  readonly exitStairsTileY: number;
}
// ============================================================================
// PHASE 6 CONTRACTS: DYNAMIC LIGHTING, DAY/NIGHT, WEATHER, WIND & PARTICLE VFX
// ============================================================================

export type TimeOfDayPhase =
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'dusk'
  | 'night'
  | 'underground_dark';

export type LightSourceKind =
  | 'campfire'
  | 'torch'
  | 'lantern'
  | 'furnace'
  | 'lava_glow'
  | 'bioluminescent_crystal'
  | 'spell_projectile'
  | 'window_interior';

export interface LightSourceDefinition {
  readonly schemaVersion: string;
  readonly lightId: string;
  readonly kind: LightSourceKind;
  readonly worldX: number; // En unidades lógicas (base 16 por tile)
  readonly worldY: number;
  readonly radiusLogical: number;
  readonly colorHex: string;
  readonly intensity: number; // [0.0 a 1.5]
  readonly priority: number;  // Mayor prioridad prevalece bajo límite de presupuesto
  readonly flickerSpeed: number;
  readonly flickerAmplitude: number; // [0.0 a 0.35]
  readonly castsShadows: boolean;
  readonly enabled: boolean;
}

export interface AmbientLightProfile {
  readonly phase: TimeOfDayPhase;
  readonly ambientColorHex: string;
  readonly ambientIntensity: number; // [0.08 en noche cerrada/cueva hasta 1.0 en mediodía]
  readonly shadowLengthMultiplier: number;
}

export type WeatherConditionId =
  | 'clear'
  | 'sunny'
  | 'overcast'
  | 'drizzle'
  | 'rain'
  | 'thunderstorm'
  | 'snow'
  | 'blizzard'
  | 'dense_fog'
  | 'sandstorm'
  | 'volcanic_ash';

export interface WeatherVisualState {
  readonly schemaVersion: string;
  readonly condition: WeatherConditionId;
  readonly intensity: number; // [0.0 a 1.0]
  readonly windAngleRad: number;
  readonly windSpeed: number; // [0.0 a 1.0]
  readonly fogDensity: number; // [0.0 a 1.0]
  readonly lightningFlashIntensity: number; // [0.0 a 1.0]
}

export interface WindVectorSample {
  readonly vx: number;
  readonly vy: number;
  readonly strength: number; // [0.0 a 1.0]
  readonly canopyPixelShiftX: number; // Desplazamiento discreto entero en texels (-2, -1, 0, 1, 2)
  readonly canopyPixelShiftY: number;
}

export type VFXPresetId =
  | 'campfire_flames'
  | 'ember_smoke'
  | 'wood_chop_chips'
  | 'stone_mine_sparks'
  | 'falling_leaves'
  | 'rain_splash'
  | 'water_ripple'
  | 'combat_hit_sparks'
  | 'healing_aura'
  | 'forest_fireflies';

export interface ParticleEmitterDefinition {
  readonly schemaVersion: string;
  readonly presetId: VFXPresetId;
  readonly spawnCount: number;
  readonly minLifetimeMs: number;
  readonly maxLifetimeMs: number;
  readonly minSpeedTexelsPerSec: number;
  readonly maxSpeedTexelsPerSec: number;
  readonly gravityTexelsPerSec2: number;
  readonly windInfluence: number; // [0.0 a 1.0]
  readonly sizeTexels: 1 | 2 | 3;
  readonly colorRampHex: readonly [string, string, string]; // Inicio -> Medio -> Final
  readonly collidesWithFloor: boolean;
}
// ============================================================================
// PHASE 7 CONTRACTS: EQUIPMENT TIERS, INVENTORY ICONS, FARMING & NINE-SLICE HUD
// ============================================================================

export type ItemMaterialTier = 'wood' | 'stone' | 'copper' | 'iron' | 'gold' | 'crystal';

export type ItemWearState = 'pristine' | 'worn' | 'damaged';

export type EquipmentItemCategory =
  | 'tool_axe'
  | 'tool_pickaxe'
  | 'tool_shovel'
  | 'weapon_sword'
  | 'weapon_dagger'
  | 'shield'
  | 'armor_helmet'
  | 'armor_chest'
  | 'raw_material';

export interface ItemEquipmentDefinition {
  readonly schemaVersion: string;
  readonly itemId: string;
  readonly category: EquipmentItemCategory;
  readonly tier: ItemMaterialTier;
  readonly wearState: ItemWearState;
  readonly durabilityMax: number;
  readonly durabilityCurrent: number;
  readonly attackOrPowerBonus: number;
  readonly defenseBonus: number;
  readonly primaryColorHex: string;
  readonly secondaryColorHex: string;
}

export type CropSpeciesId = 'wheat' | 'tomato' | 'pumpkin' | 'carrot';

export type CropGrowthStage = 'seed' | 'sprout' | 'growing' | 'mature' | 'withered';

export interface CropSpeciesDefinition {
  readonly schemaVersion: string;
  readonly speciesId: CropSpeciesId;
  readonly totalGrowthStages: number;
  readonly daysToMature: number;
  readonly requiresWater: boolean;
  readonly colorPaletteHex: readonly [string, string, string, string];
}

export interface NineSliceConfig {
  readonly schemaVersion: string;
  readonly frameId: string;
  readonly sourceWidthTexels: number;
  readonly sourceHeightTexels: number;
  readonly cornerSizePx: number; // Ancho/alto de las esquinas preservadas 1:1
}

export type HudBarKind = 'health' | 'energy' | 'mana' | 'durability';

export interface HudBarConfig {
  readonly kind: HudBarKind;
  readonly currentVal: number;
  readonly maxVal: number;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly fillColorHex: string;
  readonly backgroundColorHex: string;
}
// ============================================================================
// PHASE 8 CONTRACTS: OPTIMIZED ATLAS, LOD, CULLING & PHASER ADAPTER
// ============================================================================

export type LevelOfDetailTier = 'near' | 'mid' | 'far';

export interface LodConfiguration {
  readonly schemaVersion: string;
  readonly nearDistanceTiles: number; // Ej: < 12 tiles
  readonly midDistanceTiles: number; // Ej: 12 - 24 tiles
  readonly farDistanceTiles: number; // Ej: > 24 tiles (o culling fuera de pantalla)
}

export interface CullingViewportRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BenchmarkMetricsReport {
  readonly schemaVersion: string;
  readonly workload: 'asset-generation';
  readonly measuredSampleCount: number;
  readonly warmupSampleCount: number;
  readonly totalGeneratedAssets: number;
  readonly averageGenerationTimeMs: number;
  readonly p50GenerationTimeMs: number;
  readonly p95GenerationTimeMs: number;
  readonly p99GenerationTimeMs: number;
  readonly estimatedMemoryUsageBytes: number;
  readonly memoryBudgetBytes: number;
  readonly rendererMetricsMeasured: false;
  readonly passedMemoryBudget: boolean;
}

export interface PhaserAdapterConfig {
  readonly textureManagerRef: unknown; // Referencia a Phaser.Textures.TextureManager
  readonly defaultProfileId: string;
  readonly enableBatching: boolean;
}

// ============================================================================
// PHASE 3A: Botanical microvegetation / flowering anatomy / ecological patches
// ============================================================================
export type FloraGrowthHabit =
  | 'tuft_graminoid'
  | 'basal_rosette'
  | 'erect_forb'
  | 'woody_cushion'
  | 'frond_arch'
  | 'moss_carpet'
  | 'mycelium_colony'
  | 'emergent_reed'
  | 'floating_aquatic'
  | 'trailing_vine'
  | 'spiny_succulent'
  | 'tropical_rosette';

export type FloralCorollaSymmetry =
  | 'none'
  | 'radial_daisy'
  | 'cup_tulip'
  | 'bell_campanula'
  | 'spike_inflorescence'
  | 'umbel_cluster';

export type LeafBladeShape =
  | 'linear_grass'
  | 'lanceolate'
  | 'serrated_fern'
  | 'ovate_shrub'
  | 'broad_tropical'
  | 'floating_pad'
  | 'thorn_stem';

export interface FloraStemSegment {
  readonly stemId: string;
  readonly baseX: number;
  readonly baseY: number;
  readonly controlX: number;
  readonly controlY: number;
  readonly tipX: number;
  readonly tipY: number;
  readonly thicknessPx: number;
  readonly hasThorns: boolean;
}

export interface FloraLeafBlade {
  readonly leafId: string;
  readonly parentStemId: string;
  readonly attachX: number;
  readonly attachY: number;
  readonly tipX: number;
  readonly tipY: number;
  readonly widthPx: number;
  readonly shape: LeafBladeShape;
  readonly toneBand: 'shadow' | 'midtone' | 'highlight';
}

export interface FloraBlossomHead {
  readonly blossomId: string;
  readonly parentStemId: string;
  readonly centerX: number;
  readonly centerY: number;
  readonly symmetry: FloralCorollaSymmetry;
  readonly petalCount: number;
  readonly petalRadiusPx: number;
  readonly centerDiskRadiusPx: number;
  readonly orientationAngleRad: number;
  readonly petalPrimaryHex: string;
  readonly petalHighlightHex: string;
  readonly centerDiskHex: string;
}

export interface FungalCapNode {
  readonly capId: string;
  readonly stemBaseX: number;
  readonly stemBaseY: number;
  readonly capCenterX: number;
  readonly capCenterY: number;
  readonly capRadiusX: number;
  readonly capRadiusY: number;
  readonly hasSpots: boolean;
  readonly capColorHex: string;
  readonly spotColorHex: string;
  readonly stemColorHex: string;
}

export interface FloraSpeciesArchetype {
  readonly kind: SecondaryFloraKind;
  readonly growthHabit: FloraGrowthHabit;
  readonly corollaSymmetry: FloralCorollaSymmetry;
  readonly leafShape: LeafBladeShape;
  readonly widthModulesRange: readonly [number, number];
  readonly heightModulesRange: readonly [number, number];
  readonly stemCountRange: readonly [number, number];
  readonly leafCountPerStemRange: readonly [number, number];
  readonly blossomCountRange: readonly [number, number];
  readonly maxStemCurvePx: number;
  readonly foliagePalette: {
    readonly outlineHex: string;
    readonly shadowHex: string;
    readonly midtoneHex: string;
    readonly highlightHex: string;
  };
  readonly floralPalettes?: ReadonlyArray<{
    readonly petalPrimaryHex: string;
    readonly petalHighlightHex: string;
    readonly centerDiskHex: string;
  }>;
}

export interface FloraMorphologyDescriptor {
  readonly schemaVersion: string;
  readonly seed: number;
  readonly kind: SecondaryFloraKind;
  readonly growthHabit: FloraGrowthHabit;
  readonly corollaSymmetry: FloralCorollaSymmetry;
  readonly canvasWidthModules: number;
  readonly canvasHeightModules: number;
  readonly canvasWidthTexels: number;
  readonly canvasHeightTexels: number;
  readonly pivotTexel: readonly [number, number];
  readonly stems: readonly FloraStemSegment[];
  readonly leaves: readonly FloraLeafBlade[];
  readonly blossoms: readonly FloraBlossomHead[];
  readonly fungalCaps: readonly FungalCapNode[];
  readonly metrics: {
    readonly stemCount: number;
    readonly leafCount: number;
    readonly blossomCount: number;
    readonly horizontalSpreadPx: number;
    readonly maxHeightPx: number;
    readonly stemSpacingVariance: number;
  };
}
