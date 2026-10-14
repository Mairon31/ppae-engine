/**
 * PPAE Core Data Contracts & Runtime Schema Validators
 * Version: 1.0.0
 */

export const PPAE_SCHEMA_VERSION = '1.0.0' as const;

export type GranularityProfileId = 'micro-4x4' | 'micro-6x6' | 'hybrid-24';

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

export interface ArtStyleProfile {
  readonly schemaVersion: string;
  readonly id: GranularityProfileId;
  readonly moduleSize: 4 | 6;
  readonly canonicalTileTexels: 24 | 48;
  readonly logicalTileUnits: 16;
  readonly outlineMode: 'none' | 'selective-dark' | 'full-silhouette';
  readonly shadingSteps: 2 | 3 | 4;
  readonly lightDirectionVector: readonly [number, number]; // Normalizado, ej. [-0.7, -0.7] (Noroeste)
  readonly allowDithering: boolean;
  readonly extrudePaddingPx: number;
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
  readonly contrastRatioAgainstBiome: number;
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
  if (profile.moduleSize !== 4 && profile.moduleSize !== 6) {
    throw new ContractValidationError(`moduleSize must be 4 or 6, received ${profile.moduleSize}`);
  }
  if (profile.canonicalTileTexels % profile.moduleSize !== 0) {
    throw new ContractValidationError(
      `canonicalTileTexels (${profile.canonicalTileTexels}) must be a multiple of moduleSize (${profile.moduleSize})`
    );
  }
  if (profile.extrudePaddingPx < 0 || profile.extrudePaddingPx > 4) {
    throw new ContractValidationError('extrudePaddingPx must be between 0 and 4');
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

export type TreeSpeciesId = 'oak' | 'pine' | 'palm' | 'birch' | 'corrupted_thorn';

export type TreeLifecycleStage =
  | 'sapling'
  | 'mature'
  | 'ancient'
  | 'dead'
  | 'burned'
  | 'stump'
  | 'fallen_log';

export interface TreeSpeciesDefinition {
  readonly schemaVersion: string;
  readonly speciesId: TreeSpeciesId;
  readonly canopyShape: 'rounded_clusters' | 'conical_tiers' | 'radial_fronds' | 'slender_column' | 'twisted_branches';
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

export type SecondaryFloraKind =
  | 'tall_grass'
  | 'wild_flower'
  | 'fern'
  | 'mushroom_cluster'
  | 'desert_cactus'
  | 'water_reed';

export type GeologicalResourceKind =
  | 'surface_pebbles'
  | 'mossy_boulder'
  | 'coal_deposit'
  | 'copper_vein'
  | 'iron_vein'
  | 'gold_vein'
  | 'crystal_geode';

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
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack'
  | 'use_tool'
  | 'hurt'
  | 'death';

export type BodyBuildType = 'slim' | 'standard' | 'sturdy';
export type HairStyleId = 'short_crop' | 'long_adventure' | 'ponytail' | 'mohawk' | 'bald';
export type BeardStyleId = 'none' | 'stubble' | 'full_beard' | 'mustache';
export type HelmetStyleId = 'none' | 'knight_helm' | 'ranger_hood' | 'straw_hat' | 'crown';
export type ArmorStyleId = 'cloth_tunic' | 'leather_vest' | 'iron_plate' | 'mage_robe';
export type MainHandItemId = 'none' | 'iron_sword' | 'woodcutter_axe' | 'mining_pickaxe' | 'oak_staff';
export type OffHandItemId = 'none' | 'wooden_shield' | 'knight_kite_shield' | 'lantern';
export type VisualStatusEffect = 'none' | 'hurt_flash' | 'poisoned' | 'frozen' | 'burning';

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
}

export type AnatomicalJointId =
  | 'root'
  | 'pelvis'
  | 'torso'
  | 'head'
  | 'shoulder_r'
  | 'shoulder_l'
  | 'hand_r'
  | 'hand_l'
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
  | 'footstep_left'
  | 'footstep_right'
  | 'attack_hit'
  | 'tool_strike'
  | 'hurt_impact'
  | 'death_collapse'
  | 'clip_complete';

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
