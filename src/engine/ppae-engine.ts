import { ProceduralGrammarExecutor } from '../art-generator/grammars';
import {
  AssetGenerationRequest,
  EngineTelemetrySnapshot,
  GeneratedAssetArtifact,
  PPAE_SCHEMA_VERSION,
  ProceduralAssetDefinition,
  validateArtStyleProfile,
  validateAssetDefinition
} from '../core/contracts';
import { deriveDeterministicSeed, SeededRNG } from '../core/deterministic';
import type { ShowcaseSceneConfig } from '../core/contracts';
import {
  PPAEInteractiveShowcaseController
} from '../showcase/interactive-inspector';
import type {
  MultiResolutionComparisonItem, RenderedShowcaseSceneFrame
} from '../showcase/interactive-inspector';
import { PaletteManager } from '../palette/palette-manager';
import { BoundedTextureCache } from '../runtime/texture-cache';

export const GENERATOR_ENGINE_VERSION = '1.0.1';

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key =>
      `${JSON.stringify(key)}:${stableSerialize(record[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function stableContentHash(value: unknown): string {
  const serialized = stableSerialize(value);
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= BigInt(serialized.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Catálogo inicial de definiciones de recursos de Fase 1
 */
export const PHASE1_DEFAULT_ASSETS: Readonly<Record<string, ProceduralAssetDefinition>> = {
  oak_tree_mature: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'oak_tree_mature',
    category: 'tree',
    archetype: 'deciduous_oak',
    widthInModules: 6,
    heightInModules: 8,
    primaryRampId: 'foliage',
    secondaryRampId: 'wood',
    accentRampId: 'berry_accent',
    symmetry: 'none',
    pivotNormalized: [0.5, 0.92],
    logicalHitbox: { offsetX: -6, offsetY: -4, width: 12, height: 8, collidable: true },
    parameters: { canopyDensity: 0.85 }
  },
  pine_tree_tall: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'pine_tree_tall',
    category: 'tree',
    archetype: 'pine_conifer',
    widthInModules: 6,
    heightInModules: 9,
    primaryRampId: 'foliage',
    secondaryRampId: 'wood',
    symmetry: 'vertical',
    pivotNormalized: [0.5, 0.93],
    logicalHitbox: { offsetX: -5, offsetY: -4, width: 10, height: 8, collidable: true },
    parameters: { tiers: 4 }
  },
  crystal_ore_node: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'crystal_ore_node',
    category: 'mineral_rock',
    archetype: 'crystal_vein',
    widthInModules: 5,
    heightInModules: 4,
    primaryRampId: 'stone',
    secondaryRampId: 'mineral_crystal',
    symmetry: 'none',
    pivotNormalized: [0.5, 0.88],
    logicalHitbox: { offsetX: -7, offsetY: -5, width: 14, height: 10, collidable: true },
    parameters: { richness: 0.9 }
  },
  berry_bush_wild: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'berry_bush_wild',
    category: 'bush_flora',
    archetype: 'shrub_berry',
    widthInModules: 4,
    heightInModules: 3,
    primaryRampId: 'foliage',
    secondaryRampId: 'berry_accent',
    symmetry: 'none',
    pivotNormalized: [0.5, 0.9],
    logicalHitbox: { offsetX: -5, offsetY: -3, width: 10, height: 6, collidable: false },
    parameters: { hasBerries: true }
  },
  knight_broadsword: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'knight_broadsword',
    category: 'weapon_blade',
    archetype: 'broadsword',
    widthInModules: 4,
    heightInModules: 6,
    primaryRampId: 'mineral_crystal',
    secondaryRampId: 'wood',
    symmetry: 'vertical',
    pivotNormalized: [0.5, 0.75],
    logicalHitbox: { offsetX: -2, offsetY: -2, width: 4, height: 4, collidable: false },
    parameters: { bladeGrade: 2 }
  }
};

export class PPAEEngine {
  public readonly paletteManager: PaletteManager;
  public readonly cache: BoundedTextureCache;
  private readonly grammarExecutor: ProceduralGrammarExecutor;
  private readonly definitions = new Map<string, ProceduralAssetDefinition>();
  private productionShowcase: PPAEInteractiveShowcaseController | null = null;

  constructor(memoryBudgetBytes = 16 * 1024 * 1024) {
    this.paletteManager = new PaletteManager();
    this.cache = new BoundedTextureCache(memoryBudgetBytes);
    this.grammarExecutor = new ProceduralGrammarExecutor();

    for (const def of Object.values(PHASE1_DEFAULT_ASSETS)) {
      this.registerAssetDefinition(def);
    }
  }

  /**
   * Optional production scene path (Phase 12). The expensive controllers are
   * lazily allocated, preserving fast construction for standalone sprite users.
   */
  public renderProductionScene(config: Partial<ShowcaseSceneConfig> = {}): RenderedShowcaseSceneFrame {
    return this.resolveProductionShowcase().renderWorldSceneFrame(config);
  }

  /** Five native resolution variants plus quality diagnostics for the same seed. */
  public compareProductionProfiles(
    kind: 'hero' | 'oak_tree' | 'crystal_geode' = 'hero',
    seed = 2026
  ): readonly MultiResolutionComparisonItem[] {
    return this.resolveProductionShowcase().renderMultiResolutionComparisonStrip(kind, seed);
  }

  private resolveProductionShowcase(): PPAEInteractiveShowcaseController {
    return this.productionShowcase ??= new PPAEInteractiveShowcaseController();
  }

  public registerAssetDefinition(definition: ProceduralAssetDefinition): void {
    validateAssetDefinition(definition);
    this.definitions.set(definition.id, definition);
  }

  public getAssetDefinition(id: string): ProceduralAssetDefinition {
    const def = this.definitions.get(id);
    if (!def) {
      throw new Error(`[PPAEEngine] Unknown asset definition '${id}'`);
    }
    return def;
  }

  public listAssetDefinitions(): ProceduralAssetDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Pipeline de 10 pasos:
   * Definition -> Validation -> Seed Resolution -> Archetype -> Geometry ->
   * Palette -> Composition -> Rasterization -> Padding -> Runtime Cache
   */
  public generateAsset(request: AssetGenerationRequest): GeneratedAssetArtifact {
    const { assetDefinition, styleProfile, palette, worldSeed } = request;
    const variantIndex = request.variantIndex ?? 0;
    const stateTag = request.stateTag ?? 'intact';

    // 1. Validation
    validateArtStyleProfile(styleProfile);
    validateAssetDefinition(assetDefinition);

    // 2. Deterministic Seed & Cache Key Resolution
    const resolvedSeed = deriveDeterministicSeed(
      worldSeed,
      'geometry_cluster',
      assetDefinition.id,
      variantIndex,
      GENERATOR_ENGINE_VERSION
    );

    const contentRevision = stableContentHash({
      assetDefinition,
      styleProfile,
      palette
    });
    const cacheKey = [
      assetDefinition.id,
      styleProfile.id,
      palette.id,
      contentRevision,
      resolvedSeed,
      stateTag,
      `v${GENERATOR_ENGINE_VERSION}`
    ].join('::');

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 3. PRNG Instantiation & Grammar Execution
    const rng = new SeededRNG(resolvedSeed);
    const { buffer: rawBuffer, anchors } = this.grammarExecutor.execute(
      assetDefinition,
      styleProfile,
      palette,
      rng,
      stateTag
    );

    // 4. Padding / Border Extrusion for Atlas safety
    const paddedBuffer = rawBuffer.withExtrudedPadding(styleProfile.extrudePaddingPx);
    const pad = styleProfile.extrudePaddingPx;

    // 5. Contrast & Color Budget Verification
    const primaryRamp = palette.ramps[assetDefinition.primaryRampId] ?? Object.values(palette.ramps)[0];
    const contrastCheck = this.paletteManager.verifyRampContrast(primaryRamp, palette);
    const uniqueColorCount = paddedBuffer.countUniqueOpaqueColors();

    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const generationTimeMs = Number(Math.max(0.01, endTime - startTime).toFixed(3));

    const pivotTexel: readonly [number, number] = [
      Math.round(rawBuffer.width * assetDefinition.pivotNormalized[0]) + pad,
      Math.round(rawBuffer.height * assetDefinition.pivotNormalized[1]) + pad
    ];

    const artifact: GeneratedAssetArtifact = {
      metadata: {
        cacheKey,
        assetId: assetDefinition.id,
        category: assetDefinition.category,
        generatorVersion: GENERATOR_ENGINE_VERSION,
        resolvedSeed,
        profileId: styleProfile.id,
        texelWidth: paddedBuffer.width,
        texelHeight: paddedBuffer.height,
        innerWidth: rawBuffer.width,
        innerHeight: rawBuffer.height,
        paddingPx: pad,
        pivotTexel,
        anchors,
        logicalHitbox: assetDefinition.logicalHitbox,
        uniqueColorCount,
        contrastRatioAgainstBiome: contrastCheck.bestContrast,
        generationTimeMs,
        memoryBytes: paddedBuffer.data.byteLength
      },
      pixels: paddedBuffer.data
    };

    this.cache.put(cacheKey, artifact);
    return artifact;
  }

  public getTelemetry(): EngineTelemetrySnapshot {
    return this.cache.getTelemetrySnapshot();
  }
}
