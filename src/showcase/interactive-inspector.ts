import {
  DEFAULT_CREATURE_CLIPS,
  SpeciesAnimationCapabilityRegistry
} from '../animation/species-capabilities';
import { SpritesheetCompiler } from '../animation/spritesheet-compiler';
import { DEFAULT_CHARACTER_CLIPS } from '../animation/state-machine';
import {
  ArtQualityEvaluationReport,
  ArtStyleProfile,
  GranularityProfileId,
  LogicalRect,
  ShowcaseCatalogInventory,
  ShowcaseSceneConfig,
  ShowcaseTelemetrySnapshot,
  SolarShadowCaster
} from '../core/contracts';
import {
  AdaptiveResolutionController,
  CoordinateSystem,
  DEFAULT_STYLE_PROFILES
} from '../core/coordinates';
import {
  createCorruptedTreantBossState,
  createDefaultColossusBossState,
  MultiSegmentBossRenderer
} from '../entities/boss-generator';
import { CharacterCustomizationService } from '../entities/character-customization';
import {
  CharacterAvatarGenerator,
  DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT
} from '../entities/character-generator';
import {
  CREATURE_SPECIES_CATALOG,
  CreatureGenerator
} from '../entities/creature-archetypes';
import {
  DEFAULT_WEATHER_STATES,
  WeatherAndWindSystem
} from '../environment/weather-wind-system';
import {
  DEFAULT_COTTAGE_INTERIOR,
  InteriorGenerator
} from '../interiors/interior-generator';
import { AMBIENT_PROFILES_BY_PHASE, PixelPerfectLightingEngine } from '../lighting/lighting-engine';
import { fnv1aHash32 } from '../core/deterministic';
import {
  APPROVED_GOLDEN_SEED_REGISTRY,
  ProceduralArtQualityEvaluator
} from '../quality/art-quality-evaluator';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import {
  CaveDungeonGenerator,
  DEFAULT_CRYSTAL_CAVERN
} from '../structures/cave-generator';
import {
  DEFAULT_STRUCTURE_CATALOG,
  StructureGenerator
} from '../structures/structure-generator';
import { CANONICAL_47_AUTOTILE_MASKS } from '../terrain/autotiler';
import { ChunkWorldRenderer } from '../terrain/chunk-renderer';
import { DeterministicWorldField } from '../terrain/world-field';
import { FLORA_SPECIES_CATALOG } from '../vegetation/flora-morphology';
import { GEOLOGICAL_ARCHETYPE_CATALOG } from '../vegetation/geology-morphology';
import { NatureGenerator } from '../vegetation/nature-generator';
import {
  BOTANICAL_SPECIES_DEFINITIONS,
  TREE_LIFECYCLE_STAGES
} from '../vegetation/tree-morphology';
import {
  PixelParticleEngine,
  VFX_EMITTER_PRESETS
} from '../vfx/particle-engine';

export const DEFAULT_SHOWCASE_SCENE_CONFIG: ShowcaseSceneConfig = {
  worldSeed: 'ppae-2.0-master-showcase-2026',
  requestedProfileId: 'micro-6x6',
  cameraZoom: 2,
  viewportHeightPx: 1080,
  screenPixelRatio: 1,
  hour24: 17.5,
  weatherCondition: 'clear',
  heroAction: 'idle',
  heroDirection: 'S',
  npcProfession: 'villager_farmer',
  featuredCreature: 'forest_stag',
  featuredCreatureAction: 'idle',
  featuredBoss: 'ancient_crystal_colossus',
  featuredStructureId: 'village_cottage_01',
  isDoorOpen: false,
  isRoofCutaway: false,
  activeVfxPreset: 'campfire_flames',
  frameIndex: 0,
  timeSeconds: 1.0
};

export interface RenderedShowcaseSceneFrame {
  readonly sceneBuffer: PixelBuffer;
  readonly bossPreviewBuffer: PixelBuffer;
  readonly interiorPreviewBuffer: PixelBuffer;
  readonly cavePreviewBuffer: PixelBuffer;
  readonly telemetry: ShowcaseTelemetrySnapshot;
}

export interface MultiResolutionComparisonItem {
  readonly profileId: Exclude<GranularityProfileId, 'hybrid-24' | 'adaptive-auto'>;
  readonly profile: ArtStyleProfile;
  readonly buffer: PixelBuffer;
  readonly qualityReport: ArtQualityEvaluationReport;
}

/**
 * Orquestador de Producción e Inspector Interactivo de PPAE 2.0 (Fase 12):
 * Unifica los 11 subsistemas del motor en un pipeline de escena reproducible,
 * expone comparativas multirresolución (4x4 a 32x32) y audita la calidad en tiempo real.
 */
export class PPAEInteractiveShowcaseController {
  private readonly adaptiveController = new AdaptiveResolutionController();
  private readonly natureGen = new NatureGenerator();
  private readonly avatarGen = new CharacterAvatarGenerator();
  private readonly npcService = new CharacterCustomizationService();
  private readonly creatureGen = new CreatureGenerator();
  private readonly capabilityRegistry = new SpeciesAnimationCapabilityRegistry();
  private readonly bossRenderer = new MultiSegmentBossRenderer();
  private readonly structureGen = new StructureGenerator();
  private readonly interiorGen = new InteriorGenerator();
  private readonly caveGen = new CaveDungeonGenerator();
  private readonly lightingEngine = new PixelPerfectLightingEngine(16);
  private readonly weatherSystem = new WeatherAndWindSystem();
  private readonly qualityEvaluator = new ProceduralArtQualityEvaluator();
  private readonly spritesheetCompiler = new SpritesheetCompiler();

  /**
   * Devuelve el inventario cuantitativo completo de capacidades registradas en PPAE 2.0.
   */
  public getCatalogInventory(): ShowcaseCatalogInventory {
    const creatureSpecs = Object.values(CREATURE_SPECIES_CATALOG);
    const uniqueCreatureFamilies = new Set(creatureSpecs.map((c) => c.family));

    return {
      resolutionProfiles: Object.keys(DEFAULT_STYLE_PROFILES) as GranularityProfileId[],
      treeFamiliesCount: Object.keys(BOTANICAL_SPECIES_DEFINITIONS).length,
      treeLifecycleStagesCount: TREE_LIFECYCLE_STAGES.length,
      geologicalFormationsCount: Object.keys(GEOLOGICAL_ARCHETYPE_CATALOG).length,
      floraSpeciesCount: Object.keys(FLORA_SPECIES_CATALOG).length,
      canonicalAutotileMasksCount: CANONICAL_47_AUTOTILE_MASKS.length,
      characterActionsCount: Object.keys(DEFAULT_CHARACTER_CLIPS).length,
      npcProfessionsCount: 8,
      creatureSpeciesCount: creatureSpecs.length,
      creatureFamiliesCount: uniqueCreatureFamilies.size,
      bossArchetypesCount: 2,
      structurePresetsCount: Object.keys(DEFAULT_STRUCTURE_CATALOG).length,
      vfxPresetsCount: Object.keys(VFX_EMITTER_PRESETS).length,
      goldenSeedsCount: APPROVED_GOLDEN_SEED_REGISTRY.length
    };
  }

  /**
   * Resuelve el perfil de estilo efectivo (permite conmutación manual o selección adaptativa).
   */
  public resolveEffectiveProfile(config: ShowcaseSceneConfig): ArtStyleProfile {
    if (config.requestedProfileId === 'adaptive-auto') {
      return this.adaptiveController.selectOptimalProfile({
        category: 'character',
        cameraZoom: config.cameraZoom,
        viewportHeightPx: config.viewportHeightPx,
        screenPixelRatio: config.screenPixelRatio,
        distanceFromCameraTiles: 4,
        visualImportance: 'hero_focal',
        currentFrameTimeMs: 7.5,
        targetFrameBudgetMs: 16.6
      });
    }
    return DEFAULT_STYLE_PROFILES[config.requestedProfileId] ?? DEFAULT_STYLE_PROFILES['micro-6x6'];
  }

  /**
   * Renderiza un fotograma completo de la escena integrada del mundo combinando:
   * Terreno + Autotiling 47 + Caminos -> Sombras Solares -> Estructuras ->
   * Árboles/Rocas/Flora -> NPC + Criatura + Héroe -> VFX -> Clima/Rayos/Niebla.
   */
  public renderWorldSceneFrame(
    config: Partial<ShowcaseSceneConfig> = {}
  ): RenderedShowcaseSceneFrame {
    const cfg: ShowcaseSceneConfig = {
      ...DEFAULT_SHOWCASE_SCENE_CONFIG,
      ...config
    };

    const profile = this.resolveEffectiveProfile(cfg);
    const coord = new CoordinateSystem(profile);
    this.weatherSystem.setWeatherState(DEFAULT_WEATHER_STATES[cfg.weatherCondition] ?? DEFAULT_WEATHER_STATES.clear);
    const chunkSizeTiles = 6;
    const worldField = new DeterministicWorldField(cfg.worldSeed);
    const chunkRenderer = new ChunkWorldRenderer(worldField);

    // Trazar un sendero orgánico ('dirt_soil') en el chunk central para demostrar Fase 4B
    worldField.applyTileModification(2, 4, { material: 'dirt_soil', treeStageOverride: 'removed' });
    worldField.applyTileModification(3, 4, { material: 'dirt_soil', treeStageOverride: 'removed' });
    worldField.applyTileModification(3, 5, { material: 'dirt_soil', treeStageOverride: 'removed' });

    // 1. Terreno base, costas, agua animada y props naturales del chunk
    const renderedChunk = chunkRenderer.renderChunk(
      0,
      0,
      profile,
      cfg.frameIndex % 4,
      4,
      chunkSizeTiles
    );

    const sceneW = renderedChunk.terrainBuffer.width;
    const sceneH = renderedChunk.terrainBuffer.height;
    const sceneBuffer = new PixelBuffer(sceneW, sceneH);
    sceneBuffer.data.set(renderedChunk.terrainBuffer.data);

    const cameraWorldRect: LogicalRect = {
      x: 0,
      y: 0,
      width: chunkSizeTiles * 16,
      height: chunkSizeTiles * 16
    };

    // Subjects are generated before the shadow pass so casters use their
    // actual pixel foot positions instead of hardcoded unrelated world points.

    // 3. Estructura arquitectónica con separación de muros y techo (Fase 9)
    const structDef =
      DEFAULT_STRUCTURE_CATALOG[cfg.featuredStructureId] ??
      DEFAULT_STRUCTURE_CATALOG.village_cottage_01;
    const renderedStruct = this.structureGen.generateStructure(
      structDef,
      profile,
      cfg.isDoorOpen,
      cfg.hour24 >= 18 || cfg.hour24 <= 6
    );

    // 4. Árboles, formaciones geológicas y flora destacados (Fases 1, 2 y 3)
    const windSample = this.weatherSystem.sampleWindField(0, 0, cfg.timeSeconds);
    const featuredTree = this.natureGen.generateTreeStage(
      'oak',
      'mature',
      profile,
      202601,
      { windShiftTexels: windSample.canopyPixelShiftX }
    );
    const featuredRock = this.natureGen.generateGeologicalResource(
      'crystal_geode',
      profile,
      202603
    );
    const featuredFlora = this.natureGen.generateSecondaryFlora(
      'flower_cluster',
      profile,
      202605,
      windSample.canopyPixelShiftX
    );

    // 5. NPC de profesión, criatura con capacidades validadas y avatar del héroe (Fases 5, 6 y 8)
    const sceneSeed = fnv1aHash32(String(cfg.worldSeed));
    const npcPreset = this.npcService.generateNpcPreset(cfg.npcProfession, sceneSeed);
    const npcFrame = this.avatarGen.renderCharacterFrame(
      npcPreset.appearance,
      npcPreset.equipment,
      'idle',
      'S',
      cfg.frameIndex % 4,
      4,
      profile
    );

    const validCreatureAction = this.capabilityRegistry.resolveSupportedAction(
      cfg.featuredCreature,
      cfg.featuredCreatureAction
    );
    const creatureClip = DEFAULT_CREATURE_CLIPS[validCreatureAction];
    const creatureFrame = this.creatureGen.renderCreatureFrame(
      cfg.featuredCreature,
      validCreatureAction,
      'E',
      cfg.frameIndex % creatureClip.frameCount,
      creatureClip.frameCount,
      profile,
      sceneSeed ^ 0xc3e4a
    );

    const heroClip = DEFAULT_CHARACTER_CLIPS[cfg.heroAction];
    const heroFrame = this.avatarGen.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,
      DEFAULT_HERO_EQUIPMENT,
      cfg.heroAction,
      cfg.heroDirection,
      cfg.frameIndex % heroClip.frameCount,
      heroClip.frameCount,
      profile
    );


    // 2. Determine all ground-contact points in the same pixel coordinate
    // system used by the chunk renderer; preserve original terrain prop spawns.
    const tile = profile.canonicalTileTexels;
    const structX = Math.max(0, Math.floor((sceneW - renderedStruct.baseAndWallsBuffer.width) / 2));
    const structY = Math.max(0, Math.floor(sceneH * 0.15));
    const treeX = Math.max(0, Math.floor(sceneW * 0.07));
    const treeY = Math.max(0, Math.floor(sceneH * 0.41 - featuredTree.buffer.height));
    const rockX = Math.floor(sceneW * 0.72);
    const rockY = Math.floor(sceneH * 0.67 - featuredRock.buffer.height);
    const floraX = Math.floor(sceneW * 0.14);
    const floraY = Math.floor(sceneH * 0.79 - featuredFlora.buffer.height);
    const npcX = Math.floor(sceneW * 0.73 - npcFrame.buffer.width / 2);
    const npcY = Math.floor(sceneH * 0.69 - npcFrame.buffer.height);
    const creatureX = Math.floor(sceneW * 0.30 - creatureFrame.buffer.width / 2);
    const creatureY = Math.floor(sceneH * 0.77 - creatureFrame.buffer.height);
    const heroX = Math.floor(sceneW * 0.48 - heroFrame.buffer.width / 2);
    const heroY = Math.floor(sceneH * 0.84 - heroFrame.buffer.height);

    const actualCasters: SolarShadowCaster[] = [
      { casterId: 'oak_mature', worldX: (treeX + featuredTree.buffer.width / 2) * 16 / tile,
        worldY: (treeY + featuredTree.buffer.height) * 16 / tile,
        baseRadiusTexels: Math.max(3, Math.floor(featuredTree.buffer.width * 0.25)),
        heightTexels: featuredTree.buffer.height },
      { casterId: 'hero', worldX: (heroX + heroFrame.buffer.width / 2) * 16 / tile,
        worldY: (heroY + heroFrame.buffer.height) * 16 / tile,
        baseRadiusTexels: Math.max(2, Math.floor(heroFrame.buffer.width * 0.26)),
        heightTexels: heroFrame.buffer.height },
      ...renderedChunk.sortedProps.filter(prop => prop.buffer.height >= tile)
        .slice(0, 24).map(prop => ({
          casterId: 'prop_' + prop.tileX + '_' + prop.tileY,
          worldX: (prop.drawTexelX + prop.buffer.width / 2) * 16 / tile,
          worldY: (prop.drawTexelY + prop.buffer.height) * 16 / tile,
          baseRadiusTexels: Math.max(2, Math.floor(prop.buffer.width * 0.22)),
          heightTexels: prop.buffer.height
        }))
    ];
    const shadowResult = this.lightingEngine.renderDirectionalCastShadows(
      sceneBuffer, actualCasters, cameraWorldRect, cfg.hour24, profile, false);

    // 3–5. Depth-sort native sprites by their *pixel foot position*. This
    // includes real chunk flora/rocks/trees rather than discarding sortedProps.
    const sceneItems: Array<{
      readonly sprite: PixelBuffer;
      readonly x: number;
      readonly y: number;
      readonly depth: number;
    }> = [
      ...renderedChunk.sortedProps.map(prop => ({
        sprite: prop.buffer, x: prop.drawTexelX, y: prop.drawTexelY,
        depth: prop.drawTexelY + prop.buffer.height
      })),
      { sprite: renderedStruct.baseAndWallsBuffer, x: structX, y: structY,
        depth: structY + renderedStruct.baseAndWallsBuffer.height },
      { sprite: featuredTree.buffer, x: treeX, y: treeY,
        depth: treeY + featuredTree.buffer.height },
      { sprite: featuredRock.buffer, x: rockX, y: rockY,
        depth: rockY + featuredRock.buffer.height },
      { sprite: featuredFlora.buffer, x: floraX, y: floraY,
        depth: floraY + featuredFlora.buffer.height },
      { sprite: npcFrame.buffer, x: npcX, y: npcY,
        depth: npcY + npcFrame.buffer.height },
      { sprite: creatureFrame.buffer, x: creatureX, y: creatureY,
        depth: creatureY + creatureFrame.buffer.height },
      { sprite: heroFrame.buffer, x: heroX, y: heroY,
        depth: heroY + heroFrame.buffer.height }
    ];
    sceneItems.sort((a, b) => a.depth - b.depth);
    for (const item of sceneItems) this.blitAlpha(sceneBuffer, item.sprite, item.x, item.y);
    if (!cfg.isRoofCutaway) {
      this.blitAlpha(sceneBuffer, renderedStruct.roofOverlayBuffer, structX, structY);
    }

    // Color grading is derived from the same hour as the cast shadows.
    const solarPhase = cfg.hour24 < 5 || cfg.hour24 >= 21 ? 'night' :
      cfg.hour24 < 8 ? 'dawn' : cfg.hour24 < 11 ? 'morning' :
      cfg.hour24 < 15 ? 'noon' : cfg.hour24 < 18 ? 'afternoon' : 'dusk';
    const grade = this.lightingEngine.applyLightingToScene(
      sceneBuffer, cameraWorldRect,
      AMBIENT_PROFILES_BY_PHASE[solarPhase], profile, [], cfg.timeSeconds);
    sceneBuffer.data.set(grade.litBuffer.data);

    // 6. Emisión y renderizado de partículas VFX (Fase 10)
    const particleEngine = new PixelParticleEngine(256);
    particleEngine.emitBurst(
      cfg.activeVfxPreset,
      Math.floor(sceneW * 0.5),
      Math.floor(sceneH * 0.55),
      sceneSeed ^ 0x731d,
      8
    );
    particleEngine.update(40, windSample);
    const activeParticlesRendered = particleEngine.renderParticles(sceneBuffer, profile);

    // 7. Clima dinámico, niebla multicapa y relámpagos ramificados con supresión bajo techo (Fase 10)
    const roof = renderedStruct.roofOcclusionFootprint;
    const shelteredRects: readonly LogicalRect[] = cfg.isRoofCutaway ? [] : [{
      x: structX * 16 / tile + roof.x,
      y: structY * 16 / tile + roof.y,
      width: roof.width,
      height: roof.height
    }];
    const weatherResult = this.weatherSystem.renderWeatherOverlay(
      sceneW,
      sceneH,
      cameraWorldRect,
      profile,
      cfg.timeSeconds,
      shelteredRects,
      false,
      sceneSeed ^ 0x3944
    );
    this.blitAlpha(sceneBuffer, weatherResult.overlayBuffer, 0, 0);

    // 8. Vistas secundarias del inspector: Jefe Multisegmento, Interior y Cueva Subterránea
    const bossState =
      cfg.featuredBoss === 'corrupted_forest_treant_lord'
        ? createCorruptedTreantBossState(sceneSeed)
        : createDefaultColossusBossState(sceneSeed);
    const bossRender = this.bossRenderer.renderBoss({ ...bossState, frameIndex: cfg.frameIndex }, profile);
    const interiorRender = this.interiorGen.renderInterior(DEFAULT_COTTAGE_INTERIOR, profile);
    const caveRender = this.caveGen.generateChamber(DEFAULT_CRYSTAL_CAVERN, profile);

    // 9. Auditoría de Calidad Artística en Tiempo Real (Fase 11)
    const heroQualityReport = this.qualityEvaluator.evaluateSpriteQuality(
      heroFrame.buffer,
      {
        assetId: `hero_${cfg.heroAction}_${cfg.heroDirection}`,
        category: 'character',
        profile,
        requireOrganicAsymmetry: false,
        maxColorsOverride: 28
      }
    );

    const featuredTreeQualityReport = this.qualityEvaluator.evaluateSpriteQuality(
      featuredTree.buffer,
      {
        assetId: 'featured_oak_mature',
        category: 'tree',
        profile,
        requireOrganicAsymmetry: true,
        allowMultiFragment: true,
        maxColorsOverride: 24
      }
    );

    const featuredRockQualityReport = this.qualityEvaluator.evaluateSpriteQuality(
      featuredRock.buffer,
      {
        assetId: 'featured_crystal_geode',
        category: 'mineral_rock',
        profile,
        // Faceted crystal axes can be radial; organic-tree asymmetry is inapplicable.
        requireOrganicAsymmetry: false,
        allowMultiFragment: true,
        maxColorsOverride: 24,
        checkDirectionalLighting: false // Emissive geode: no single solar key light.
      }
    );

    const heroDimensionSpec = coord.resolveNineDimensionSpec(
      6,
      8,
      1,
      1,
      cfg.cameraZoom,
      cfg.screenPixelRatio
    );

    return {
      sceneBuffer,
      bossPreviewBuffer: bossRender.buffer,
      interiorPreviewBuffer: interiorRender.roomBuffer,
      cavePreviewBuffer: caveRender.chamberBuffer,
      telemetry: {
        resolvedProfileId: profile.id,
        moduleSizeTexels: profile.moduleSize,
        canonicalTileTexels: profile.canonicalTileTexels,
        heroDimensionSpec,
        solarShadowVector: shadowResult.shadowVector,
        renderedShadowPixels: shadowResult.renderedShadowPixels,
        weatherDropsSpawned: weatherResult.spawnedDropsCount,
        weatherDropsSuppressedByRoof: weatherResult.suppressedByRoofCount,
        lightningBranchesCount: weatherResult.lightningBranchesCount,
        activeParticlesRendered,
        heroQualityReport,
        featuredTreeQualityReport,
        featuredRockQualityReport
      }
    };
  }

  /**
   * Genera una tira comparativa del mismo activo a través de los 5 perfiles de resolución
   * ('micro-4x4', 'micro-6x6', 'classic-8x8', 'standard-16x16', 'detailed-32x32')
   * con evaluación de calidad individual.
   */
  public renderMultiResolutionComparisonStrip(
    assetKind: 'hero' | 'oak_tree' | 'crystal_geode' = 'hero',
    seed = 2026
  ): readonly MultiResolutionComparisonItem[] {
    const tiers: readonly Exclude<GranularityProfileId, 'hybrid-24' | 'adaptive-auto'>[] = [
      'micro-4x4',
      'micro-6x6',
      'classic-8x8',
      'standard-16x16',
      'detailed-32x32'
    ];

    return tiers.map((profileId) => {
      const profile = DEFAULT_STYLE_PROFILES[profileId];
      let buffer: PixelBuffer;
      let category: 'character' | 'tree' | 'mineral_rock' = 'character';
      let requireAsymmetry = false;

      if (assetKind === 'oak_tree') {
        buffer = this.natureGen.generateTreeStage('oak', 'mature', profile, seed).buffer;
        category = 'tree';
        requireAsymmetry = true;
      } else if (assetKind === 'crystal_geode') {
        buffer = this.natureGen.generateGeologicalResource('crystal_geode', profile, seed).buffer;
        category = 'mineral_rock';
        requireAsymmetry = false; // Crystalline radial symmetry is not an organic-lollipop fault.
      } else {
        buffer = this.avatarGen.renderCharacterFrame(
          DEFAULT_HERO_APPEARANCE,
          DEFAULT_HERO_EQUIPMENT,
          'idle',
          'S',
          0,
          4,
          profile
        ).buffer;
      }

      const qualityReport = this.qualityEvaluator.evaluateSpriteQuality(buffer, {
        assetId: `comparison_${assetKind}_${profileId}`,
        category,
        profile,
        requireOrganicAsymmetry: requireAsymmetry,
        allowMultiFragment: assetKind !== 'hero',
        maxColorsOverride: 32,
        checkDirectionalLighting: assetKind !== 'crystal_geode'
      });

      return {
        profileId,
        profile,
        buffer,
        qualityReport
      };
    });
  }

  public getSpritesheetCompiler(): SpritesheetCompiler {
    return this.spritesheetCompiler;
  }

  private blitOpaque(
    dest: PixelBuffer,
    src: PixelBuffer,
    offsetX: number,
    offsetY: number
  ): void {
    for (let y = 0; y < src.height; y++) {
      const dy = offsetY + y;
      if (dy < 0 || dy >= dest.height) continue;
      for (let x = 0; x < src.width; x++) {
        const dx = offsetX + x;
        if (dx < 0 || dx >= dest.width) continue;
        const c = src.getPixel(x, y);
        if (c.a > 0) {
          dest.setPixel(dx, dy, c);
        }
      }
    }
  }

  private blitAlpha(
    dest: PixelBuffer,
    src: PixelBuffer,
    offsetX: number,
    offsetY: number
  ): void {
    for (let y = 0; y < src.height; y++) {
      const dy = offsetY + y;
      if (dy < 0 || dy >= dest.height) continue;
      for (let x = 0; x < src.width; x++) {
        const dx = offsetX + x;
        if (dx < 0 || dx >= dest.width) continue;
        const top = src.getPixel(x, y);
        if (top.a === 0) continue;
        if (top.a === 255) {
          dest.setPixel(dx, dy, top);
          continue;
        }
        const bot = dest.getPixel(dx, dy);
        const alpha = top.a / 255;
        dest.setPixel(dx, dy, {
          r: Math.round(top.r * alpha + bot.r * (1 - alpha)),
          g: Math.round(top.g * alpha + bot.g * (1 - alpha)),
          b: Math.round(top.b * alpha + bot.b * (1 - alpha)),
          a: 255
        });
      }
    }
  }
}
