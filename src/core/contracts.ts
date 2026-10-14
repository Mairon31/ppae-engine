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
  | 'rest_graze'
  | 'attack'
  | 'hurt'
  | 'death';

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
