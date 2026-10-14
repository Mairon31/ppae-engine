import './landing.css';
import './studio-theme.css';
import { initLanding } from './landing';
import { initializeLanguageControls, tr } from './i18n';
import { pixelIcon, hydratePixelIcons } from './pixelarticons';
import type { PixelIconName } from './pixelarticons';
import {
  AdaptiveResolutionController, ALL_DIRECTIONS_8, AMBIENT_PROFILES_BY_PHASE,
  AnimationStateMachine, ArtStyleProfile, CharacterActionId, CharacterAvatarGenerator,
  CharacterCustomizationService, CHUNK_SIZE_TILES, ChunkWorldRenderer,
  CaveDungeonGenerator, CreatureActionId, CreatureAgeStage, CreatureGenerator,
  CreatureHealthState, CreatureSpeciesId, CropSpeciesId, DEFAULT_CHARACTER_CLIPS, DEFAULT_CREATURE_CLIPS,
  DEFAULT_CRYSTAL_CAVERN, DEFAULT_COTTAGE_INTERIOR, DEFAULT_FORGE_INTERIOR, DEFAULT_ALCHEMY_INTERIOR, DEFAULT_HUD_PANEL_CONFIG, DEFAULT_STRUCTURE_CATALOG,
  DEFAULT_STYLE_PROFILES, DEFAULT_WEATHER_STATES, DeterministicWorldField,
  Direction8, EquipmentItemCategory, EquipmentGenerator, FarmingAndCropGenerator, fnv1aHash32,
  GeologicalResourceKind, GranularityProfileId, InteriorGenerator, InventoryIconGenerator,
  ItemEquipmentDefinition, ItemMaterialTier, ItemWearState, LiquidTileGenerator, MultiSegmentBossRenderer,
  NatureGenerator, NpcProfessionArchetypeId, PixelBuffer, PixelNineSliceLibrary,
  PixelParticleEngine, PixelPerfectLightingEngine, PPAE_SCHEMA_VERSION,
  SecondaryFloraKind, SpeciesAnimationCapabilityRegistry, SpritesheetCompiler,
  StructureGenerator, TerrainAutotiler, TerrainMaterialId, TimeOfDayPhase,
  TreeLifecycleStage, TreeSpeciesId, VFXPresetId, WeatherAndWindSystem,
  WeatherConditionId, VisualStatusEffect, EntityAppearance, EquipmentLoadout,
  MATERIAL_TIER_PALETTES, CANONICAL_47_AUTOTILE_MASKS, TERRAIN_MATERIALS,
  PaletteManager,
  classifyAutotileMask47, VFX_EMITTER_PRESETS,
  createCorruptedTreantBossState, createDefaultColossusBossState
} from '../index';
import {
  BOSS_IDS, CHARACTER_ACTIONS, CROP_STAGES, CREATURE_ACTIONS,
  EIGHT_DIRECTIONS, formatPlaygroundLabel, getPlaygroundSection,
  PLAYGROUND_OPTIONS,
  PLAYGROUND_SECTIONS, PlaygroundSectionId, TREE_STAGES
} from './playground-catalog';
import { AVATAR_FIELDS, generateAvatarPreset, shadeHex } from './avatar-lab';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error('Missing Playground element: ' + id);
  return element as T;
};
const stage = byId<HTMLCanvasElement>('world-stage');
const ctx = stage.getContext('2d');
if (!ctx) throw new Error('Canvas 2D is required by the PPAE Playground');
const view = ctx;
const scratch = document.createElement('canvas');
const scratchCtx = scratch.getContext('2d')!;
scratchCtx.imageSmoothingEnabled = false;
view.imageSmoothingEnabled = false;

const avatar = new CharacterAvatarGenerator();
const customization = new CharacterCustomizationService();
const creatures = new CreatureGenerator();
const capabilities = new SpeciesAnimationCapabilityRegistry();
const nature = new NatureGenerator();
const structures = new StructureGenerator();
const interiors = new InteriorGenerator();
const interiorCatalog = { cottage_interior: DEFAULT_COTTAGE_INTERIOR, forge_interior: DEFAULT_FORGE_INTERIOR, alchemy_interior: DEFAULT_ALCHEMY_INTERIOR } as const;
const caves = new CaveDungeonGenerator();
const farms = new FarmingAndCropGenerator();
const icons = new InventoryIconGenerator();
const equipmentGenerator = new EquipmentGenerator();
const ui = new PixelNineSliceLibrary();
const terrain = new TerrainAutotiler();
const liquids = new LiquidTileGenerator();
const weather = new WeatherAndWindSystem();
const lighting = new PixelPerfectLightingEngine(8);
const LIGHTING_HOURS: Record<TimeOfDayPhase, number> = { dawn: 6, morning: 9, noon: 12.5, afternoon: 16, dusk: 19, night: 23, underground_dark: 12 };
const bosses = new MultiSegmentBossRenderer();
const compiler = new SpritesheetCompiler();
const adaptive = new AdaptiveResolutionController();
const paletteManager = new PaletteManager();
const characterAsm = new AnimationStateMachine();

type PlaygroundState = {
  section: PlaygroundSectionId;
  selected: string;
  profile: GranularityProfileId;
  seed: string;
  direction: Direction8;
  action: CharacterActionId;
  creatureAction: CreatureActionId;
  frame: number;
  playing: boolean;
  loop: boolean;
  grid: boolean;
  pivot: boolean;
  hitbox: boolean;
  zoom: number;
  speed: number;
  stage: string;
  age: CreatureAgeStage;
  health: CreatureHealthState;
  time: TimeOfDayPhase;
  weather: WeatherConditionId;
  page: number;
  avatarReroll: number;
  activeAvatarId: string;
  avatarAppearance: Partial<EntityAppearance>;
  avatarEquipment: Partial<EquipmentLoadout>;
  avatarStatus: VisualStatusEffect;
  materialTier: ItemMaterialTier;
  wearState: ItemWearState;
  terrainMask: number;
  terrainMaterial: TerrainMaterialId;
  terrainUnderlay: TerrainMaterialId;
  treeEnvironment: 'normal' | 'autumn' | 'snowy' | 'blossom';
  bossTelegraph: 'none' | 'radial_slam' | 'frontal_cleave' | 'cross_laser';
  progress: number;
  catalogQuery: string;
  creatureScale: number;
  bossAction: 'idle_float' | 'telegraph_charge' | 'crusher_slam' | 'crystal_nova' | 'hurt_stagger' | 'staged_death';
  bossDeath: 'alive' | 'stage_1_arms_shatter' | 'stage_2_core_overload' | 'stage_3_monolith_collapse';
  bossIntegrity: 'intact' | 'cracked' | 'destroyed';
  structureRoof: boolean;
  structureDoor: boolean;
  structureWindows: boolean;
  caveLava: boolean;
  caveCrystals: number;
};
const state: PlaygroundState = {
  section: 'world', selected: 'world_overview', profile: 'micro-6x6',
  seed: 'PixelProject-2026', direction: 'S', action: 'walk',
  creatureAction: 'move', frame: 0, playing: true, loop: true,
  grid: false, pivot: false, hitbox: false, zoom: 2, speed: 1,
  stage: 'mature', age: 'adult', health: 'healthy',
  time: 'noon', weather: 'clear', page: 0,
  avatarReroll: 0, activeAvatarId: 'hero',
  avatarAppearance: {}, avatarEquipment: {}, avatarStatus: 'none',
  materialTier: 'iron', wearState: 'pristine',
  terrainMask: 255, terrainMaterial: 'forest_moss', terrainUnderlay: 'meadow_grass',
  treeEnvironment: 'normal', bossTelegraph: 'radial_slam',
  progress: 70, catalogQuery: '',
  creatureScale: 1, bossAction: 'telegraph_charge', bossDeath: 'alive',
  bossIntegrity: 'intact', structureRoof: true, structureDoor: true,
  structureWindows: true, caveLava: true, caveCrystals: 5
};

let worldField = new DeterministicWorldField(state.seed);
let worldRenderer = new ChunkWorldRenderer(worldField);
let showcaseChunk = findShowcaseChunk(worldField);
let cachedWorld = new Map<string, ReturnType<ChunkWorldRenderer['renderChunk']>>();
let particles = new PixelParticleEngine(450);
let particleMode = '';
let elapsed = 0;
let lastTick = 0;
let lastDrawTime = 0;
let errorString = '';
let frameCounter = 0;
let renderPreviewPending = true;
const PAGE_SIZE = 6;
const THUMB_CACHE_LIMIT = 36;
const thumbnailCache = new Map<string, HTMLCanvasElement>();
let galleryGeneration = 0;
let vfxEmissionElapsed = 0;
let vfxBurstIndex = 0;

function thumbnailKey(section: PlaygroundSectionId, id: string): string {
  return [
    section, id, state.seed, section === 'world' ? state.selected : '',
    state.stage, state.age, state.health, state.time, state.weather,
    state.direction, state.action, state.creatureAction
  ].join('|');
}
function restoreThumbnail(key: string, canvas: HTMLCanvasElement): boolean {
  const cached = thumbnailCache.get(key);
  if (!cached) return false;
  thumbnailCache.delete(key); thumbnailCache.set(key, cached);
  canvas.getContext('2d')!.drawImage(cached, 0, 0);
  return true;
}
function storeThumbnail(key: string, canvas: HTMLCanvasElement): void {
  const copy = document.createElement('canvas');
  copy.width = canvas.width; copy.height = canvas.height;
  copy.getContext('2d')!.drawImage(canvas, 0, 0);
  thumbnailCache.delete(key); thumbnailCache.set(key, copy);
  while (thumbnailCache.size > THUMB_CACHE_LIMIT) {
    thumbnailCache.delete(thumbnailCache.keys().next().value!);
  }
}


function characterPreset(id: string, edited = false) {
  const base = generateAvatarPreset(state.seed, id, state.avatarReroll);
  if (!edited) return base;
  return {
    appearance: { ...base.appearance, ...state.avatarAppearance },
    equipment: { ...base.equipment, ...state.avatarEquipment }
  };
}
function currentCharacter() {
  return characterPreset(state.activeAvatarId, true);
}
function seedNumber(extra = ''): number {
  return fnv1aHash32(state.seed + ':' + state.selected + ':' + extra);
}
/** Catalog assets must not mutate when a different card becomes selected. */
function stableSubjectSeed(section: PlaygroundSectionId, id: string): number {
  return fnv1aHash32(state.seed + ':subject:' + section + ':' + id);
}
function profile(): ArtStyleProfile {
  if (state.profile !== 'adaptive-auto') return DEFAULT_STYLE_PROFILES[state.profile];
  return adaptive.selectOptimalProfile({
    category: state.section === 'characters' || state.section === 'character-actions' || state.section === 'npcs' ? 'character' :
      state.section === 'trees' ? 'tree' : state.section === 'bosses' ? 'creature' : 'terrain',
    cameraZoom: state.zoom, screenPixelRatio: window.devicePixelRatio || 1,
    viewportHeightPx: window.innerHeight, distanceFromCameraTiles: 4,
    visualImportance: state.section === 'characters' || state.section === 'character-actions' || state.section === 'bosses' ? 'hero_focal' : 'standard',
    currentFrameTimeMs: lastDrawTime, targetFrameBudgetMs: 20
  });
}
function frameInfo(): { frame: number; count: number; duration: number } {
  if (['characters','character-actions','npcs','world'].includes(state.section)) {
    const clip = DEFAULT_CHARACTER_CLIPS[state.action];
    return { frame: state.frame % clip.frameCount, count: clip.frameCount, duration: clip.frameDurationMs };
  }
  if (state.section === 'creatures' || state.section === 'creature-variants') {
    const species = state.selected.split(':')[0] as CreatureSpeciesId;
    const act = capabilities.resolveSupportedAction(species, state.creatureAction);
    const clip = DEFAULT_CREATURE_CLIPS[act];
    return { frame: state.frame % clip.frameCount, count: clip.frameCount, duration: clip.frameDurationMs };
  }
  return { frame: state.frame % 6, count: 6, duration: 170 };
}
function blend(target: PixelBuffer, source: PixelBuffer, dx: number, dy: number): void {
  const x0 = Math.max(0, Math.round(dx));
  const y0 = Math.max(0, Math.round(dy));
  const x1 = Math.min(target.width, Math.round(dx) + source.width);
  const y1 = Math.min(target.height, Math.round(dy) + source.height);
  const ox = Math.round(dx);
  const oy = Math.round(dy);
  for (let y = y0; y < y1; y++) {
    const sy = y - oy;
    for (let x = x0; x < x1; x++) {
      const si = (sy * source.width + x - ox) * 4;
      const alpha = source.data[si + 3];
      if (!alpha) continue;
      const ti = (y * target.width + x) * 4;
      if (alpha === 255) {
        target.data[ti] = source.data[si];
        target.data[ti + 1] = source.data[si + 1];
        target.data[ti + 2] = source.data[si + 2];
        target.data[ti + 3] = 255;
      } else {
        const a = alpha / 255, keep = 1 - a;
        target.data[ti] = Math.round(source.data[si] * a + target.data[ti] * keep);
        target.data[ti + 1] = Math.round(source.data[si + 1] * a + target.data[ti + 1] * keep);
        target.data[ti + 2] = Math.round(source.data[si + 2] * a + target.data[ti + 2] * keep);
        target.data[ti + 3] = 255;
      }
    }
  }
}
function fromPixelBuffer(buffer: PixelBuffer, target: CanvasRenderingContext2D): void {
  if (scratch.width !== buffer.width || scratch.height !== buffer.height) {
    scratch.width = buffer.width; scratch.height = buffer.height;
  }
  scratchCtx.putImageData(new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height), 0, 0);
  target.imageSmoothingEnabled = false;
}
function drawBuffer(target: CanvasRenderingContext2D, buffer: PixelBuffer, x: number, y: number, scale: number): void {
  fromPixelBuffer(buffer, target);
  target.drawImage(scratch, Math.round(x), Math.round(y),
    Math.max(1, Math.round(buffer.width * scale)), Math.max(1, Math.round(buffer.height * scale)));
}
function sceneBackground(target: CanvasRenderingContext2D, w: number, h: number): void {
  target.fillStyle = '#172230';
  target.fillRect(0, 0, w, h);
  const grd = target.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#233244'); grd.addColorStop(1, '#0c1621');
  target.fillStyle = grd;
  target.fillRect(0, 0, w, h);
  target.fillStyle = '#ffffff09';
  for (let i = 0; i < w; i += 28) target.fillRect(i, 0, 1, h);
  for (let i = 0; i < h; i += 28) target.fillRect(0, i, w, 1);
  target.fillStyle = '#ffffff04';
  target.fillRect(70, 90, w - 140, h - 180);
}
function baseScene(type: string, p: ArtStyleProfile, tick: number, materialId = state.selected): PixelBuffer {
  const size = p.canonicalTileTexels;
  const countX = type === 'terrain' ? 5 : 8;
  const countY = type === 'terrain' ? 5 : 7;
  const result = new PixelBuffer(size * countX, size * countY);
  const targetMaterial = type === 'terrain' ? materialId as TerrainMaterialId :
    type === 'weather' ? 'meadow_grass' : 'forest_moss';
  for (let y = 0; y < countY; y++) {
    for (let x = 0; x < countX; x++) {
      let tile: PixelBuffer;
      if (targetMaterial === 'shallow_water' || targetMaterial === 'deep_water' || targetMaterial === 'lava_magma') {
        const mask = x === 0 || y === 0 ? 191 : 255;
        tile = liquids.generateAnimatedFrame(targetMaterial, tick % 4, 4, mask, p);
      } else {
        const mask = targetMaterial === 'dirt_soil' ? 1 | 16 : 255;
        tile = terrain.composeAutotiledSurface(targetMaterial, mask, p, 'meadow_grass', (x * 5 + y * 13) % 16);
      }
      blend(result, tile, x * size, y * size);
    }
  }
  return result;
}
/**
 * Choose a real, deterministic 8x8 sample of the user's world with visible land and
 * some shoreline. The old hard-coded (0,0) chunk was nearly all deep water for
 * the default seed, hiding the engine's ecological and terrestrial generators.
 * Scoring only probes cheap field samples; it never pre-renders candidate chunks.
 */
function findShowcaseChunk(field: DeterministicWorldField): { x: number; y: number } {
  let best = { x: 0, y: 0, score: -Infinity };
  for (let cy = -3; cy <= 3; cy++) {
    for (let cx = -3; cx <= 3; cx++) {
      let land = 0, water = 0, forest = 0, meadow = 0, materials = new Set<string>();
      for (let y = 0; y < CHUNK_SIZE_TILES; y += 2) {
        for (let x = 0; x < CHUNK_SIZE_TILES; x += 2) {
          const sample = field.sampleMaterialOnly(cx * CHUNK_SIZE_TILES + x, cy * CHUNK_SIZE_TILES + y);
          materials.add(sample.material);
          if (sample.material === 'deep_water' || sample.material === 'shallow_water') water++;
          else land++;
          if (sample.material === 'forest_moss') forest++;
          if (sample.material === 'meadow_grass') meadow++;
        }
      }
      const shore = water > 0 && land > 0 ? 22 + Math.min(land, water) * 3 : 0;
      const score = land * 2 + forest * 2 + meadow * 2 + shore + materials.size * 3;
      if (score > best.score) best = { x: cx, y: cy, score };
    }
  }
  return { x: best.x, y: best.y };
}
function worldScene(p: ArtStyleProfile, tick: number, previewId = state.selected): PixelBuffer {
  const variant = tick % 4;
  const cacheKey = state.seed + ':' + showcaseChunk.x + ',' + showcaseChunk.y + ':' + p.id + ':' + variant;
  let chunk = cachedWorld.get(cacheKey);
  if (!chunk) {
    chunk = worldRenderer.renderChunk(showcaseChunk.x, showcaseChunk.y, p, variant, 4);
    if (cachedWorld.size >= 8) cachedWorld.clear();
    cachedWorld.set(cacheKey, chunk);
  }
  const scene = new PixelBuffer(chunk.terrainBuffer.width, chunk.terrainBuffer.height);
  scene.data.set(chunk.terrainBuffer.data);
  const tile = p.canonicalTileTexels;
  // Actual chunk props cast ground shadows before the opaque subject sprites.
  const casters = chunk.sortedProps.filter(prop => prop.buffer.height >= tile)
    .slice(0, 32).map(prop => ({
      casterId: String(prop.tileX) + ':' + String(prop.tileY),
      worldX: (prop.drawTexelX + prop.buffer.width * 0.5) * 16 / tile,
      worldY: (prop.drawTexelY + prop.buffer.height - 2) * 16 / tile,
      baseRadiusTexels: Math.max(2, Math.floor(Math.min(tile * 2, prop.buffer.width) * 0.24)),
      heightTexels: Math.min(tile * 4, prop.buffer.height)
    }));
  lighting.renderDirectionalCastShadows(scene, casters,
    { x: 0, y: 0, width: CHUNK_SIZE_TILES * 16, height: CHUNK_SIZE_TILES * 16 },
    LIGHTING_HOURS[state.time], p, state.time === 'underground_dark');
  for (const prop of chunk.sortedProps) blend(scene, prop.buffer, prop.drawTexelX, prop.drawTexelY);
  const village = previewId === 'world_village';
  if (village) {
    const cottage = structures.generateStructure(DEFAULT_STRUCTURE_CATALOG.village_cottage_01, p, true, true);
    blend(scene, cottage.baseAndWallsBuffer, tile * 1, tile);
    blend(scene, cottage.roofOverlayBuffer, tile * 1, tile);
  }
  if (previewId === 'world_wildlife') {
    const wolf = creatures.renderCreatureFrame('timber_wolf', 'move', 'E', tick % 6, 6, p, seedNumber('wolf'));
    blend(scene, wolf.buffer, Math.floor(tile * 5 - wolf.pivotTexel[0]), Math.floor(tile * 5 - wolf.pivotTexel[1]));
  }
  const clip = DEFAULT_CHARACTER_CLIPS[state.action];
  const heroPreset = currentCharacter();
  const hero = avatar.renderCharacterFrame(
    heroPreset.appearance, heroPreset.equipment,
    state.action, state.direction, tick % clip.frameCount, clip.frameCount, p, state.avatarStatus);
  blend(scene, hero.buffer, Math.round(tile * 3.8 - hero.pivotTexel[0]), Math.round(tile * 6.3 - hero.pivotTexel[1]));
  if (village) {
    const npc = customization.generateNpcPreset('villager_farmer', state.seed);
    const farmer = avatar.renderCharacterFrame(npc.appearance, npc.equipment, 'walk', 'S', tick % 6, 6, p);
    blend(scene, farmer.buffer, Math.round(tile * 6.4 - farmer.pivotTexel[0]), Math.round(tile * 6.4 - farmer.pivotTexel[1]));
  }
  if (state.weather !== 'clear') {
    weather.setWeatherState(DEFAULT_WEATHER_STATES[state.weather]);
    const result = weather.renderWeatherOverlay(
      scene.width, scene.height, { x: 0, y: 0, width: CHUNK_SIZE_TILES * 16, height: CHUNK_SIZE_TILES * 16 },
      p, elapsed / 1000, [], false, seedNumber('weather'));
    blend(scene, result.overlayBuffer, 0, 0);
  }
  if (state.time !== 'noon') {
    const lit = lighting.applyLightingToScene(scene,
      { x: 0, y: 0, width: CHUNK_SIZE_TILES * 16, height: CHUNK_SIZE_TILES * 16 },
      AMBIENT_PROFILES_BY_PHASE[state.time], p, [], elapsed / 1000);
    return lit.litBuffer;
  }
  return scene;
}
function renderSubject(section: PlaygroundSectionId, id: string, p: ArtStyleProfile, tick: number): PixelBuffer {
  const n = stableSubjectSeed(section, id);
  switch (section) {
    case 'world': return worldScene(p, tick);
    case 'characters':
    case 'character-actions': {
      const action = section === 'character-actions' ? id as CharacterActionId : state.action;
      const selectedAvatar = section === 'characters' ? id : state.activeAvatarId;
      const preset = characterPreset(selectedAvatar,
        section === 'character-actions' || selectedAvatar === state.activeAvatarId);
      const clip = DEFAULT_CHARACTER_CLIPS[action];
      return avatar.renderCharacterFrame(preset.appearance, preset.equipment,
        action, state.direction, tick % clip.frameCount, clip.frameCount, p, state.avatarStatus).buffer;
    }
    case 'npcs':
    case 'npc-variants': {
      const [profession, variant] = section === 'npc-variants' ? id.split(':') : [id, '0'];
      const npc = customization.generateNpcPreset(profession as NpcProfessionArchetypeId,
        state.seed + ':npc:' + variant);
      const clip = DEFAULT_CHARACTER_CLIPS[state.action];
      return avatar.renderCharacterFrame(npc.appearance, npc.equipment, state.action,
        state.direction, tick % clip.frameCount, clip.frameCount, p).buffer;
    }
    case 'creatures':
    case 'creature-variants': {
      const [species, age, health] = section === 'creature-variants'
        ? id.split(':') : [id, state.age, state.health];
      const action = capabilities.resolveSupportedAction(species as CreatureSpeciesId, state.creatureAction);
      const clip = DEFAULT_CREATURE_CLIPS[action];
      return creatures.renderCreatureFrame(species as CreatureSpeciesId, action, state.direction,
        tick % clip.frameCount, clip.frameCount, p, n,
        { ageStage: age as CreatureAgeStage, healthState: health as CreatureHealthState,
          sizeScaleMultiplier: state.creatureScale }).buffer;
    }
    case 'bosses': {
      const boss = id === BOSS_IDS[1] ? createCorruptedTreantBossState(n) : createDefaultColossusBossState(n);
      const segments = Object.fromEntries(Object.entries(boss.segments).map(([name, segment]) =>
        [name, { ...segment, integrity: state.bossIntegrity }])) as unknown as typeof boss.segments;
      const current = { ...boss,
        phase: (state.stage.startsWith('phase_') ? state.stage : 'phase_1_dormant') as typeof boss.phase,
        action: state.bossAction, deathStage: state.bossDeath, segments,
        frameIndex: tick % 6, direction: state.direction,
        telegraphKind: state.bossTelegraph, telegraphProgress: (tick % 6) / 5 };
      const rendered = bosses.renderBoss(current, p);
      blend(rendered.buffer, rendered.telegraphOverlayBuffer, 0, 0);
      return rendered.buffer;
    }
    case 'trees':
    case 'tree-archetypes':
    case 'tree-lifecycle': {
      const [family, value] = section === 'trees' ? [id, undefined] : id.split(':');
      const archetypeId = section === 'tree-archetypes' ? value : undefined;
      const lifecycleStage = section === 'tree-lifecycle' ? value : state.stage;
      return nature.generateTreeStage(family as TreeSpeciesId,
        section === 'tree-archetypes' ? 'mature' : lifecycleStage as TreeLifecycleStage, p, n, {
        ...(archetypeId ? { archetypeId } : {}),
        envState: state.treeEnvironment === 'normal' && state.weather === 'snow'
          ? 'snowy' : state.treeEnvironment,
        windShiftTexels: Math.round(Math.sin(elapsed / 600) * (p.moduleSize / 4))
      }).buffer;
    }
    case 'flora': return nature.generateSecondaryFlora(id as SecondaryFloraKind, p, n,
      Math.round(Math.sin(elapsed / 500) * p.moduleSize / 6)).buffer;
    case 'geology': return nature.generateGeologicalResource(id as GeologicalResourceKind, p, n).buffer;
    case 'terrain': return baseScene('terrain', p, tick, id);
    case 'terrain-variants': {
      const [material, index] = id.split(':');
      return terrain.generateSeamlessBaseTile(material as TerrainMaterialId, p, Number(index));
    }
    case 'autotiling':
      return terrain.composeAutotiledSurface(state.terrainMaterial,
        Number(id), p, state.terrainUnderlay, n % 16);
    case 'liquids':
      return liquids.generateAnimatedFrame(id as 'shallow_water'|'deep_water'|'lava_magma',
        tick % 8, 8, state.terrainMask, p);
    case 'structures': {
      const result = structures.generateStructure(DEFAULT_STRUCTURE_CATALOG[id], p,
        state.structureDoor, state.structureWindows);
      const scene = new PixelBuffer(result.baseAndWallsBuffer.width, result.baseAndWallsBuffer.height);
      blend(scene, result.baseAndWallsBuffer, 0, 0);
      if (state.structureRoof) blend(scene, result.roofOverlayBuffer, 0, 0);
      return scene;
    }
    case 'interiors': return interiors.renderInterior(interiorCatalog[id as keyof typeof interiorCatalog] ?? DEFAULT_COTTAGE_INTERIOR, p).roomBuffer;
    case 'caves': return caves.generateChamber({
      ...DEFAULT_CRYSTAL_CAVERN, seed: n,
      hasLavaPool: state.caveLava, crystalCount: state.caveCrystals
    }, p).chamberBuffer;
    case 'farming':
    case 'crop-lifecycle': {
      const [species, stage] = section === 'crop-lifecycle' ? id.split(':') : [id, state.stage];
      const soil = farms.renderTilledSoilTile(true, p);
      const crop = farms.renderCropStage(species as CropSpeciesId,
        stage as typeof CROP_STAGES[number], true, p);
      blend(soil, crop.buffer, 0, 0);
      return soil;
    }
    case 'equipment':
    case 'equipment-materials': {
      const [material, category] = section === 'equipment-materials' ? id.split(':') : [state.materialTier, id];
      const item: ItemEquipmentDefinition = {
        schemaVersion: PPAE_SCHEMA_VERSION, itemId: 'playground_' + id,
        category: category as EquipmentItemCategory, tier: material as ItemMaterialTier,
        wearState: state.wearState, durabilityMax: 100,
        durabilityCurrent: state.wearState === 'damaged' ? 20 : state.wearState === 'worn' ? 60 : 100,
        attackOrPowerBonus: 12, defenseBonus: 5, primaryColorHex: '#cbd5e1', secondaryColorHex: '#475569'
      };
      if (section === 'equipment-materials') return equipmentGenerator.renderEquipmentItem(item, p);
      const icon = icons.generateIcon(item, p, 28 * p.moduleSize / 4);
      const panel = ui.renderNineSlicePanel(DEFAULT_HUD_PANEL_CONFIG,
        76 * p.moduleSize / 4, 58 * p.moduleSize / 4,
        { r: 25, g: 34, b: 47, a: 255 }, { r: 120, g: 96, b: 59, a: 255 });
      blend(panel, icon, Math.floor((panel.width - icon.width) / 2), Math.floor((panel.height - icon.height) / 2));
      return panel;
    }
    case 'hud': {
      const w = p.moduleSize * 14, h = p.moduleSize * 5;
      if (id === 'hud_panel') return ui.renderNineSlicePanel(
        DEFAULT_HUD_PANEL_CONFIG, w, h,
        { r: 24, g: 37, b: 50, a: 255 }, { r: 143, g: 112, b: 67, a: 255 });
      const colors = id === 'health_bar' ? ['#dc444b','#251c27'] :
        id === 'mana_bar' ? ['#408ad9','#172945'] : ['#65b971','#20362b'];
      return ui.renderProgressBar(state.progress, 100, w, p.moduleSize * 2,
        colors[0], colors[1]);
    }
    case 'particles': {
      const s = 240;
      const scene = new PixelBuffer(s, 150);
      scene.fillRect(0, 0, s, 150, { r: 18, g: 28, b: 39, a: 255 });
      scene.fillRect(0, 111, s, 39, { r: 39, g: 55, b: 49, a: 255 });
      const pool = particleMode === id ? particles : new PixelParticleEngine(180);
      if (particleMode !== id) {
        pool.emitBurst(id as VFXPresetId, 120, 90, n, 80);
      }
      pool.renderParticles(scene, p);
      return scene;
    }
    case 'weather': {
      const scene = baseScene('weather', p, tick);
      weather.setWeatherState(DEFAULT_WEATHER_STATES[id as WeatherConditionId]);
      const ov = weather.renderWeatherOverlay(scene.width, scene.height,
        { x: 0, y: 0, width: 8 * 16, height: 7 * 16 }, p, elapsed / 1000, [], false, n);
      blend(scene, ov.overlayBuffer, 0, 0);
      return scene;
    }
    case 'lighting': {
      const sample = baseScene('lighting', p, tick);
      // Show an actual engine-generated tree and the ground shadow of that same
      // specimen at 06:00 / 12:30 / 19:00; not a static illustration.
      const tree = nature.generateTreeStage('oak', 'mature', p,
        stableSubjectSeed('trees', 'oak')).buffer;
      const tile = p.canonicalTileTexels;
      const pivotX = Math.round(sample.width * 0.53);
      const pivotY = Math.round(sample.height * 0.79);
      const camera = { x: 0, y: 0, width: 8 * 16, height: 7 * 16 };
      lighting.renderDirectionalCastShadows(sample, [{
        casterId: 'oak_demo',
        worldX: pivotX * 16 / tile,
        worldY: pivotY * 16 / tile,
        baseRadiusTexels: Math.max(2, Math.floor(tile * 0.38)),
        heightTexels: Math.min(tree.height, tile * 4)
      }], camera, LIGHTING_HOURS[id as TimeOfDayPhase], p,
      id === 'underground_dark');
      blend(sample, tree, pivotX - Math.floor(tree.width / 2), pivotY - tree.height + 2);
      return lighting.applyLightingToScene(sample, camera,
        AMBIENT_PROFILES_BY_PHASE[id as TimeOfDayPhase], p, [], elapsed / 1000).litBuffer;
    }
    case 'palettes': {
      // Display exactly the actual stored palette ramps, without invented swatches.
      const palette = paletteManager.getPalette(id);
      const ramps = Object.values(palette.ramps);
      const colors = ['outline', 'shadow', 'midtone', 'highlight', 'accent'] as const;
      const out = new PixelBuffer(colors.length * 24, Math.max(1, ramps.length) * 20);
      ramps.forEach((ramp, row) => colors.forEach((key, column) => {
        out.fillRect(column * 24, row * 20, 24, 20, ramp[key]);
      }));
      return out;
    }
    case 'resolution-profiles': {
      // Identical procedural specimen/seed across all native detail budgets:
      // only the profile changes, never the random tree morphology.
      const nativeProfile = DEFAULT_STYLE_PROFILES[id as GranularityProfileId];
      const comparisonSeed = fnv1aHash32(state.seed + ':compare-oak-mature');
      return nature.generateTreeStage('oak', 'mature', nativeProfile, comparisonSeed).buffer;
    }
  }
}
function presentBuffer(buffer: PixelBuffer): void {
  sceneBackground(view, stage.width, stage.height);
  const availW = stage.width - 110, availH = stage.height - 100;
  const fitScale = Math.min(availW / buffer.width, availH / buffer.height);
  const requested = state.zoom / 2;
  const scalar = Math.min(13, Math.max(0.04, fitScale * requested));
  const scale = scalar >= 1 ? Math.floor(scalar) : scalar;
  const x = Math.round((stage.width - buffer.width * scale) / 2);
  const y = Math.round((stage.height - buffer.height * scale) / 2);
  drawBuffer(view, buffer, x, y, scale);
  if (state.grid) {
    const tileSize = (state.section === 'world' || state.section === 'terrain' ||
      state.section === 'weather' || state.section === 'lighting') ?
      profile().canonicalTileTexels : Math.max(1, profile().moduleSize);
    const step = tileSize * scale;
    if (step >= 6) {
      view.save(); view.strokeStyle = '#d6e3fa60'; view.lineWidth = 1;
      for (let gx = 0; gx <= buffer.width; gx += tileSize) {
        const sx = Math.round(x + gx * scale) + 0.5;
        view.beginPath(); view.moveTo(sx, y); view.lineTo(sx, y + buffer.height * scale); view.stroke();
      }
      for (let gy = 0; gy <= buffer.height; gy += tileSize) {
        const sy = Math.round(y + gy * scale) + 0.5;
        view.beginPath(); view.moveTo(x, sy); view.lineTo(x + buffer.width * scale, sy); view.stroke();
      }
      view.restore();
    }
  }
  if (state.pivot) {
    const px = Math.round(x + buffer.width * scale / 2);
    const py = Math.round(y + buffer.height * scale * .86);
    view.strokeStyle = '#a8ef83'; view.lineWidth = 2;
    view.beginPath(); view.moveTo(px - 10, py); view.lineTo(px + 10, py);
    view.moveTo(px, py - 10); view.lineTo(px, py + 10); view.stroke();
  }
  if (state.hitbox) {
    view.strokeStyle = '#eab677b9'; view.setLineDash([5, 5]); view.lineWidth = 1;
    const w = buffer.width * scale, h = buffer.height * scale;
    view.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    view.setLineDash([]);
  }
}
function paint(): void {
  const t0 = performance.now();
  try {
    const p = state.section === 'resolution-profiles'
      ? DEFAULT_STYLE_PROFILES[state.selected as GranularityProfileId] : profile();
    const info = frameInfo();
    const buffer = renderSubject(state.section, state.selected, p, state.frame);
    presentBuffer(buffer);
    lastDrawTime = performance.now() - t0;
    errorString = '';
    byId('engine-live').textContent = 'RENDER OK';
    byId('render-stats').textContent =
      p.id + ' · ' + buffer.width + '×' + buffer.height + ' · ' + lastDrawTime.toFixed(0) + ' ms';
    const sourceHash = state.section === 'resolution-profiles'
      ? fnv1aHash32(state.seed + ':compare-oak-mature')
      : stableSubjectSeed(state.section, state.selected);
    byId('stage-coordinates').textContent = 'SEED · ' +
      sourceHash.toString(16).toUpperCase().slice(0, 8);
    byId('stage-action').textContent = state.section.toUpperCase() + ' / ' +
      (state.section === 'creatures' ? state.creatureAction : state.section === 'characters' || state.section === 'npcs' ? state.action : state.selected).toUpperCase();
    byId('stage-frames').textContent = 'FRAME ' + String(info.frame + 1).padStart(2, '0') +
      ' / ' + String(info.count).padStart(2, '0');
    byId('telemetry').innerHTML =
      '<strong>' + tr('LIVE GENERATION') + '</strong><br/>' + tr('Profile: ') + p.id +
      '<br/>' + tr('Seed hash: ') + sourceHash.toString(16) +
      '<br/>' + tr('Buffer: ') + buffer.width + ' × ' + buffer.height +
      '<br/>' + tr('Opaque colors: ') + buffer.countUniqueOpaqueColors() +
      '<br/>' + tr('Render: ') + lastDrawTime.toFixed(1) + ' ms' +
      '<br/>' + tr('Animation: ') + (state.playing ? 'PLAY' : 'PAUSE') +
      '<br/>' + tr('Active VFX: ') + particles.getTelemetry().activeParticlesCount;
  } catch (err) {
    errorString = err instanceof Error ? err.message : String(err);
    byId('engine-live').textContent = 'ERROR';
    byId('telemetry').textContent = errorString;
    sceneBackground(view, stage.width, stage.height);
    view.fillStyle = '#f5b0a6'; view.font = '14px ui-monospace,monospace';
    view.fillText(tr('Unable to generate this sample. Check the inspector.'), 32, stage.height / 2);
  }
}
function toThumbnail(container: HTMLCanvasElement, buffer: PixelBuffer): void {
  const tctx = container.getContext('2d')!;
  tctx.imageSmoothingEnabled = false;
  const scale = Math.min((container.width - 26) / buffer.width, (container.height - 16) / buffer.height);
  const x = (container.width - buffer.width * scale) / 2;
  const y = (container.height - buffer.height * scale) / 2;
  tctx.fillStyle = '#1a2835';
  tctx.fillRect(0, 0, container.width, container.height);
  drawBuffer(tctx, buffer, x, y, scale);
}
function previewCard(section: PlaygroundSectionId, id: string, canvas: HTMLCanvasElement): void {
  const p = DEFAULT_STYLE_PROFILES['micro-4x4'];
  // Preview generation uses the same engine entrypoints, at a bounded resolution.
  if (section === 'world') {
    toThumbnail(canvas, worldScene(p, 0, id));
  } else if (section === 'particles') {
    const pool = new PixelParticleEngine(128);
    const wide = ['falling_leaves','forest_fireflies','rain_splash','water_ripple'].includes(id);
    emitPlaygroundVfx(pool, id as VFXPresetId, 60, wide ? 36 : 45,
      seedNumber(id), 9, 6, wide ? 94 : 48, wide ? 44 : 18);
    pool.update(120, { vx: .2, vy: 0, canopyPixelShiftX: 0, canopyPixelShiftY: 0, strength: .2 });
    const b = new PixelBuffer(120, 86);
    b.fillRect(0, 0, 120, 86, { r: 20, g: 32, b: 44, a: 255 });
    pool.renderParticles(b, p);
    toThumbnail(canvas, b);
  } else {
    toThumbnail(canvas, renderSubject(section, id, p, 0));
  }
}
function filteredItems(section: PlaygroundSectionId): readonly string[] {
  const all = PLAYGROUND_OPTIONS[section];
  if (!state.catalogQuery.trim()) return all;
  const text = state.catalogQuery.trim().toLocaleLowerCase();
  return all.filter(id => id.toLowerCase().includes(text) ||
    formatPlaygroundLabel(id).toLocaleLowerCase().includes(text));
}
function renderCards(): void {
  const generation = ++galleryGeneration;
  const section = state.section;
  const pending: Array<{ id: string; key: string; canvas: HTMLCanvasElement; thumb: HTMLElement }> = [];
  const items = filteredItems(state.section);
  const start = state.page * PAGE_SIZE;
  const visible = items.slice(start, start + PAGE_SIZE);
  const wrap = byId('cards-container');
  wrap.replaceChildren();
  visible.forEach((id, offset) => {
    const button = document.createElement('button');
    button.className = 'asset-card' + (id === state.selected ? ' active' : '');
    button.setAttribute('type', 'button');
    button.setAttribute('aria-pressed', String(id === state.selected));
    const thumb = document.createElement('div'); thumb.className = 'asset-thumb';
    const canvas = document.createElement('canvas'); canvas.width = 198; canvas.height = 112;
    thumb.appendChild(canvas);
    const info = document.createElement('div'); info.className = 'asset-card-info';
    const words = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = formatPlaygroundLabel(id);
    const subtitle = document.createElement('small'); subtitle.textContent = state.section.toUpperCase() + ' · PROCEDURAL';
    words.append(name, subtitle);
    const index = document.createElement('span'); index.className = 'asset-index';
    index.textContent = String(start + offset + 1).padStart(2, '0');
    info.append(words, index);
    button.append(thumb, info);
    button.addEventListener('click', () => selectItem(id));
    wrap.appendChild(button);
    const key = thumbnailKey(section, id);
    if (!restoreThumbnail(key, canvas)) pending.push({ id, key, canvas, thumb });
  });
  byId('gallery-range').textContent = items.length ?
    (start + 1) + '–' + Math.min(items.length, start + PAGE_SIZE) + tr(' of ') + items.length :
    tr('0 results');
  byId('catalog-summary').textContent = PLAYGROUND_OPTIONS[section].length +
    tr(' samples in this category');
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'catalog-empty';
    empty.textContent = tr('No results match this filter.');
    wrap.appendChild(empty);
  }
  (byId('gallery-prev') as HTMLButtonElement).disabled = state.page === 0;
  (byId('gallery-next') as HTMLButtonElement).disabled = start + PAGE_SIZE >= items.length;
  // Generate a single real engine thumbnail per animation frame; cancel stale pages.
  function nextThumbnail(): void {
    if (generation !== galleryGeneration) return;
    const item = pending.shift();
    if (!item) return;
    try {
      if (!restoreThumbnail(item.key, item.canvas)) {
        previewCard(section, item.id, item.canvas);
        storeThumbnail(item.key, item.canvas);
      }
    } catch (error) {
      const caption = document.createElement('small');
      caption.className = 'error-banner';
      caption.textContent = tr('Unavailable: ') + String(error);
      item.thumb.appendChild(caption);
    }
    if (pending.length > 0) requestAnimationFrame(nextThumbnail);
  }
  if (pending.length > 0) requestAnimationFrame(nextThumbnail);
}
function options(select: HTMLSelectElement, values: readonly string[], selected: string): void {
  select.replaceChildren();
  for (const id of values) {
    const opt = document.createElement('option'); opt.value = id;
    opt.textContent = formatPlaygroundLabel(id);
    select.appendChild(opt);
  }
  if (values.includes(selected)) select.value = selected;
}
type ChoiceCallback = (value: string) => void;
function appendLabSelect(
  root: HTMLElement, labelText: string, id: string,
  values: readonly string[], selected: string, onSelect: ChoiceCallback
): void {
  const label = document.createElement('label');
  label.textContent = tr(labelText);
  const select = document.createElement('select'); select.id = id;
  for (const value of values) {
    const opt = document.createElement('option');
    opt.value = value; opt.textContent = formatPlaygroundLabel(value);
    select.append(opt);
  }
  select.value = selected;
  select.addEventListener('change', () => onSelect(select.value));
  label.append(select); root.append(label);
}
function appendLabButton(root: HTMLElement, label: string, id: string, action: () => void): void {
  const button = document.createElement('button');
  button.type = 'button'; button.id = id; button.className = 'full-button';
  const icon: PixelIconName | null = id === 'avatar-randomize' ? 'refresh' :
    id === 'avatar-reset' ? 'refresh' : id === 'avatar-export-json' ? 'download' : null;
  if (icon) button.append(pixelIcon(icon));
  button.append(document.createTextNode(tr(label)));
  button.addEventListener('click', action);
  root.append(button);
}
function refreshLabPreview(): void {
  thumbnailCache.clear(); renderCards(); renderPreviewPending = true;
}
const avatarFieldNames: Record<string, string> = {
  bodyBuild: 'Body build',
  hairStyle: 'Hairstyle', beardStyle: 'Beard',
  expression: 'Facial expression', ageGroup: 'Age group',
  earStyle: 'Ears', hornStyle: 'Horns',
  faceMarking: 'Face markings', scarSide: 'Scar side',
  helmet: 'Helmet or hat', armor: 'Outfit / armor',
  mainHand: 'Main hand', offHand: 'Off hand',
  backpack: 'Backpack'
};
function renderLabControls(): void {
  const avatarRoot = byId<HTMLElement>('avatar-lab-controls');
  const systemRoot = byId<HTMLElement>('system-lab-controls');
  avatarRoot.replaceChildren(); systemRoot.replaceChildren();
  const isAvatar = ['characters','character-actions'].includes(state.section);
  avatarRoot.hidden = !isAvatar;
  const isSystem = ['trees','tree-archetypes','bosses','autotiling','liquids',
    'equipment','equipment-materials','hud','creatures','creature-variants',
    'structures','caves'].includes(state.section);
  systemRoot.hidden = !isSystem;
  if (isAvatar) {
    const heading = document.createElement('h3'); heading.className = 'lab-heading';
    heading.textContent = tr('PLAYER CUSTOMIZATION');
    avatarRoot.append(heading);
    const caption = document.createElement('p'); caption.className = 'lab-description';
    caption.textContent = tr('Changes are reflected in the 16-joint character renderer and exported spritesheets.');
    avatarRoot.append(caption);
    appendLabButton(avatarRoot, 'Randomize character', 'avatar-randomize', () => {
      state.avatarReroll++;
      state.avatarAppearance = {}; state.avatarEquipment = {};
      renderLabControls(); refreshLabPreview();
    });
    appendLabButton(avatarRoot, 'Reset appearance', 'avatar-reset', () => {
      state.avatarReroll = 0;
      state.avatarAppearance = {}; state.avatarEquipment = {}; state.avatarStatus = 'none';
      renderLabControls(); refreshLabPreview();
    });
    const source = currentCharacter();
    const appearanceFields: readonly (keyof EntityAppearance)[] = [
      'bodyBuild','hairStyle','beardStyle','expression','ageGroup',
      'earStyle','hornStyle','faceMarking','scarSide'
    ];
    const equipmentFields: readonly (keyof EquipmentLoadout)[] = [
      'helmet','armor','mainHand','offHand','backpack'
    ];
    for (const key of appearanceFields) {
      const values = AVATAR_FIELDS[key as keyof typeof AVATAR_FIELDS] as readonly string[];
      appendLabSelect(avatarRoot, avatarFieldNames[key] ?? formatPlaygroundLabel(key), 'avatar-' + key,
        values, String(source.appearance[key] ?? values[0]), value => {
          state.avatarAppearance = { ...state.avatarAppearance, [key]: value };
          refreshLabPreview();
        });
    }
    const heightLabel = document.createElement('label');
    heightLabel.textContent = tr('Character height ');
    const heightValue = document.createElement('strong');
    heightValue.textContent = source.appearance.heightScale.toFixed(2) + '×';
    const heightInput = document.createElement('input');
    heightInput.id = 'avatar-heightScale'; heightInput.type = 'range';
    heightInput.min = '.9'; heightInput.max = '1.1'; heightInput.step = '.01';
    heightInput.value = String(source.appearance.heightScale);
    heightInput.addEventListener('input', () => {
      const value = Number(heightInput.value);
      state.avatarAppearance = { ...state.avatarAppearance, heightScale: value };
      heightValue.textContent = value.toFixed(2) + '×'; refreshLabPreview();
    });
    heightLabel.append(heightValue, heightInput); avatarRoot.append(heightLabel);
    for (const key of equipmentFields) {
      const values = AVATAR_FIELDS[key as keyof typeof AVATAR_FIELDS] as readonly string[];
      appendLabSelect(avatarRoot, avatarFieldNames[key] ?? formatPlaygroundLabel(key), 'avatar-' + key,
        values, String(source.equipment[key] ?? values[0]), value => {
          state.avatarEquipment = { ...state.avatarEquipment, [key]: value };
          refreshLabPreview();
        });
    }
    for (const [id, title, value] of [
      ['hasCape','Cape',source.equipment.hasCape],
      ['hasFacialScar','Facial scar',source.appearance.hasFacialScar]
    ] as const) {
      const row = document.createElement('label'); row.className = 'toggle-row';
      const caption = document.createElement('span'); caption.textContent = tr(title);
      const box = document.createElement('input');
      box.type = 'checkbox'; box.id = 'avatar-' + id; box.checked = value;
      box.addEventListener('change', () => {
        if (id === 'hasCape') state.avatarEquipment = { ...state.avatarEquipment, hasCape: box.checked };
        else state.avatarAppearance = { ...state.avatarAppearance, hasFacialScar: box.checked };
        refreshLabPreview();
      });
      row.append(caption, box); avatarRoot.append(row);
    }
    for (const [key, title] of [
      ['skinColorHex','Skin'], ['hairColorHex','Hair'], ['eyeColorHex','Eyes'],
      ['armorPrimaryHex','Armor'], ['armorSecondaryHex','Armor accents'],
      ['capeColorHex','Cape'], ['helmetPrimaryHex','Helmet'],
      ['bootsColorHex','Boots'], ['glovesColorHex','Gloves'],
      ['backpackColorHex','Backpack']
    ] as const) {
      const label = document.createElement('label'); label.className = 'color-field';
      label.textContent = tr(title);
      const input = document.createElement('input'); input.type = 'color';
      input.id = 'avatar-' + key;
      const raw = key in source.appearance
        ? source.appearance[key as keyof EntityAppearance]
        : source.equipment[key as keyof EquipmentLoadout];
      input.value = typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw) ? raw : '#64748b';
      input.addEventListener('input', () => {
        if (key === 'skinColorHex') state.avatarAppearance = {
          ...state.avatarAppearance, skinColorHex: input.value, skinShadowHex: shadeHex(input.value) };
        else if (key === 'hairColorHex') state.avatarAppearance = {
          ...state.avatarAppearance, hairColorHex: input.value, hairShadowHex: shadeHex(input.value) };
        else if (key === 'eyeColorHex') state.avatarAppearance = {
          ...state.avatarAppearance, eyeColorHex: input.value };
        else state.avatarEquipment = { ...state.avatarEquipment, [key]: input.value };
        refreshLabPreview();
      });
      label.append(input); avatarRoot.append(label);
    }
    appendLabSelect(avatarRoot, 'Status effect', 'avatar-status',
      AVATAR_FIELDS.status, state.avatarStatus, value => {
        state.avatarStatus = value as VisualStatusEffect; refreshLabPreview();
      });
    appendLabButton(avatarRoot, 'Export character JSON', 'avatar-export-json', () => {
      const json = JSON.stringify({
        seed: state.seed, variant: state.activeAvatarId, ...currentCharacter(),
        statusEffect: state.avatarStatus
      }, null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      downloadUrl(url, 'ppae-avatar-' + state.activeAvatarId + '.json');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  if (!isSystem) return;
  const heading = document.createElement('h3'); heading.className = 'lab-heading';
  heading.textContent = tr('SYSTEM PARAMETERS');
  systemRoot.append(heading);
  const choose = (label: string, name: string, vals: readonly string[], current: string,
    assign: (v: string) => void): void => {
    appendLabSelect(systemRoot, label, name, vals, current, value => {
      assign(value); refreshLabPreview();
    });
  };
  if (state.section === 'trees' || state.section === 'tree-archetypes')
    choose('Foliage season', 'lab-tree-env',
      ['normal','autumn','snowy','blossom'], state.treeEnvironment,
      value => { state.treeEnvironment = value as typeof state.treeEnvironment; });
  if (state.section === 'bosses') {
    choose('Boss telegraph', 'lab-boss-telegraph',
      ['none','radial_slam','frontal_cleave','cross_laser'], state.bossTelegraph,
      value => { state.bossTelegraph = value as typeof state.bossTelegraph; });
    choose('Boss action', 'lab-boss-action',
      ['idle_float','telegraph_charge','crusher_slam','crystal_nova','hurt_stagger','staged_death'],
      state.bossAction, value => { state.bossAction = value as typeof state.bossAction; });
    choose('Death sequence', 'lab-boss-death',
      ['alive','stage_1_arms_shatter','stage_2_core_overload','stage_3_monolith_collapse'],
      state.bossDeath, value => { state.bossDeath = value as typeof state.bossDeath; });
    choose('Segment integrity', 'lab-boss-integrity',
      ['intact','cracked','destroyed'], state.bossIntegrity,
      value => { state.bossIntegrity = value as typeof state.bossIntegrity; });
  }
  const addToggle = (id: string, title: string, value: boolean, cb: (checked: boolean) => void): void => {
    const row = document.createElement('label'); row.className = 'toggle-row';
    const titleSpan = document.createElement('span'); titleSpan.textContent = tr(title);
    const input = document.createElement('input'); input.type = 'checkbox'; input.id = id; input.checked = value;
    input.addEventListener('change', () => { cb(input.checked); refreshLabPreview(); });
    row.append(titleSpan, input); systemRoot.append(row);
  };
  if (state.section === 'structures') {
    addToggle('lab-roof','Show roof',state.structureRoof,
      value => { state.structureRoof = value; });
    addToggle('lab-door','Open door',state.structureDoor,
      value => { state.structureDoor = value; });
    addToggle('lab-windows','Lit windows',state.structureWindows,
      value => { state.structureWindows = value; });
  }
  if (state.section === 'caves') {
    addToggle('lab-cave-lava','Lava pool',state.caveLava,
      value => { state.caveLava = value; });
    const label = document.createElement('label'); label.textContent = tr('Crystals: ');
    const value = document.createElement('strong'); value.textContent = String(state.caveCrystals);
    const input = document.createElement('input'); input.type = 'range';
    input.id = 'lab-cave-crystals'; input.min = '0'; input.max = '12';
    input.step = '1'; input.value = String(state.caveCrystals);
    input.addEventListener('input', () => {
      state.caveCrystals = Number(input.value); value.textContent = input.value;
      refreshLabPreview();
    });
    label.append(value, input); systemRoot.append(label);
  }
  if (state.section === 'creatures' || state.section === 'creature-variants') {
    const label = document.createElement('label'); label.textContent = tr('Anatomical scale: ');
    const value = document.createElement('strong'); value.textContent = state.creatureScale.toFixed(2) + '×';
    const input = document.createElement('input'); input.type = 'range';
    input.id = 'lab-creature-scale'; input.min = '.75'; input.max = '1.35';
    input.step = '.05'; input.value = String(state.creatureScale);
    input.addEventListener('input', () => {
      state.creatureScale = Number(input.value); value.textContent = input.value + '×';
      refreshLabPreview();
    });
    label.append(value, input); systemRoot.append(label);
  }
  if (state.section === 'equipment' || state.section === 'equipment-materials') {
    choose('Material', 'lab-tier', Object.keys(MATERIAL_TIER_PALETTES), state.materialTier,
      value => { state.materialTier = value as ItemMaterialTier; });
    choose('Wear state', 'lab-wear', ['pristine','worn','damaged'], state.wearState,
      value => { state.wearState = value as ItemWearState; });
  }
  if (state.section === 'autotiling') {
    choose('Primary terrain material', 'lab-terrain-primary', Object.keys(TERRAIN_MATERIALS),
      state.terrainMaterial, value => { state.terrainMaterial = value as TerrainMaterialId; });
    choose('Underlying material', 'lab-terrain-underlay', Object.keys(TERRAIN_MATERIALS),
      state.terrainUnderlay, value => { state.terrainUnderlay = value as TerrainMaterialId; });
  }
  if (state.section === 'liquids')
    choose('Shore mask (47 states)', 'lab-liquid-mask',
      CANONICAL_47_AUTOTILE_MASKS.map(String), String(state.terrainMask),
      value => { state.terrainMask = Number(value); });
  if (state.section === 'hud') {
    const label = document.createElement('label'); label.textContent = tr('Progress: ');
    const val = document.createElement('strong'); val.textContent = state.progress + '%';
    const input = document.createElement('input'); input.type = 'range';
    input.id = 'lab-progress'; input.min = '0'; input.max = '100'; input.value = String(state.progress);
    input.addEventListener('input', () => {
      state.progress = Number(input.value); val.textContent = state.progress + '%';
      refreshLabPreview();
    });
    label.append(val, input); systemRoot.append(label);
  }
}
function refreshControlVisibility(): void {
  const character = ['characters','character-actions','npcs','npc-variants','world'].includes(state.section);
  const creature = state.section === 'creatures' || state.section === 'creature-variants';
  const animated = character || creature;
  const actionSelect = byId<HTMLSelectElement>('action-select');
  actionSelect.disabled = !animated;
  options(actionSelect, creature ? CREATURE_ACTIONS : character ? CHARACTER_ACTIONS : ['idle'],
    creature ? state.creatureAction : state.action);
  const stages = state.section === 'trees' ? TREE_STAGES :
    state.section === 'farming' ? CROP_STAGES :
    state.section === 'bosses' ? ['phase_1_dormant','phase_2_enraged','phase_3_critical'] :
    ['intact'];
  const selectedStage = stages.includes(state.stage as never) ? state.stage : stages[0];
  state.stage = selectedStage;
  options(byId<HTMLSelectElement>('stage-select'), stages, selectedStage);
  byId<HTMLSelectElement>('age-select').disabled = !creature || state.section === 'creature-variants';
  byId<HTMLSelectElement>('health-select').disabled = !creature || state.section === 'creature-variants';
  byId<HTMLSelectElement>('direction-select').disabled = !['characters','character-actions','npcs','npc-variants','creatures','creature-variants','bosses','world'].includes(state.section);
  const downloadable = ['characters','character-actions','npcs','npc-variants'].includes(state.section) || creature;
  (byId('download-atlas') as HTMLButtonElement).disabled = !downloadable;
  (byId('download-json') as HTMLButtonElement).disabled = false;
}
function selectItem(id: string): void {
  if (!PLAYGROUND_OPTIONS[state.section].includes(id)) return;
  state.selected = id;
  if (state.section === 'characters') {
    state.activeAvatarId = id;
    state.avatarAppearance = {};
    state.avatarEquipment = {};
  }
  if (state.section === 'character-actions') state.action = id as CharacterActionId;
  if (state.section === 'creature-variants') {
    const [, age, health] = id.split(':');
    state.age = age as CreatureAgeStage;
    state.health = health as CreatureHealthState;
    byId<HTMLSelectElement>('age-select').value = age;
    byId<HTMLSelectElement>('health-select').value = health;
  }
  state.frame = 0;
  elapsed = 0;
  particleMode = '';
  if (state.section === 'particles') resetParticles();
  refreshControlVisibility();
  renderLabControls();
  renderCards();
  renderPreviewPending = true;
}
function renderNav(): void {
  const nav = byId('section-nav');
  nav.replaceChildren();
  let lastGroup = '';
  const sectionIcons: Partial<Record<PlaygroundSectionId, PixelIconName>> = {
    world:'home', characters:'users', 'character-actions':'play',
    npcs:'users', 'npc-variants':'users', creatures:'gamepad',
    'creature-variants':'gamepad', bosses:'star', trees:'tree',
    'tree-lifecycle':'tree', 'tree-archetypes':'tree-pine',
    flora:'tree-pine', geology:'grid-3x3', terrain:'grid-3x3',
    'terrain-variants':'grid-3x3', autotiling:'grid-3x3',
    liquids:'cloud', structures:'home', interiors:'home',
    caves:'grid-3x3', farming:'tree', 'crop-lifecycle':'tree',
    equipment:'gamepad', 'equipment-materials':'gear',
    hud:'heart', particles:'sparkles', weather:'cloud',
    lighting:'sun', palettes:'star', 'resolution-profiles':'sliders'
  };
  PLAYGROUND_SECTIONS.forEach(section => {
    if (lastGroup !== section.group) {
      lastGroup = section.group;
      const group = document.createElement('div'); group.className = 'nav-group'; group.textContent = tr(lastGroup);
      nav.appendChild(group);
    }
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'nav-link' + (state.section === section.id ? ' active' : '');
    const glyph = document.createElement('span'); glyph.className = 'nav-glyph';
    glyph.append(pixelIcon(sectionIcons[section.id] ?? 'grid-3x3'));
    const label = document.createElement('span'); label.textContent = tr(section.label);
    btn.append(glyph, label);
    btn.addEventListener('click', () => selectSection(section.id));
    nav.appendChild(btn);
  });
}
function selectSection(section: PlaygroundSectionId): void {
  state.section = section; state.selected = PLAYGROUND_OPTIONS[section][0];
  if (section === 'character-actions') state.action = 'idle';
  if (section === 'creature-variants') {
    state.age = 'juvenile'; state.health = 'healthy';
    byId<HTMLSelectElement>('age-select').value = state.age;
    byId<HTMLSelectElement>('health-select').value = state.health;
  }
  state.catalogQuery = '';
  byId<HTMLInputElement>('catalog-search').value = '';
  state.page = 0; state.frame = 0; elapsed = 0;
  state.stage = section === 'trees' || section === 'farming' ? 'mature' :
    section === 'bosses' ? 'phase_2_enraged' : 'intact';
  const definition = getPlaygroundSection(section);
  byId('page-title').textContent = tr(definition.label);
  byId('page-description').textContent = tr(definition.description);
  byId('crumb-current').textContent = tr(definition.label);
  byId('preview-subtitle').textContent = tr(definition.group) + ' / PPAE 2.0';
  byId('gallery-title').textContent = tr(definition.label) + tr(' · Collection');
  byId('stage-mode-label').textContent = section.toUpperCase() + ' / LIVE SCENE';
  window.history.replaceState(null, '', location.pathname + location.search + '#' + section);
  document.querySelector('.studio')?.classList.remove('nav-open');
  closeInspector();
  (byId('toggle-sidebar') as HTMLButtonElement).setAttribute('aria-expanded','false');
  if (section === 'particles') resetParticles();
  refreshControlVisibility(); renderLabControls(); renderNav(); renderCards(); renderPreviewPending = true;
}
/**
 * Spread real engine bursts across the demo viewport. PixelParticleEngine's
 * emitBurst starts particles within ~2px of an origin: emitting 85 at once was
 * virtually a single dot despite correct particle counts in telemetry.
 */
function scatterHash(text: string): number {
  // FNV alone has correlated output for adjacent decimal suffixes. Avalanche
  // fully before mapping to 2D coordinates for spatially distinct emitters.
  let h = fnv1aHash32(text);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
function emitPlaygroundVfx(
  pool: PixelParticleEngine, id: VFXPresetId, x: number, y: number,
  seed: number, bursts: number, countPerBurst: number, spanX: number, spanY: number
): void {
  for (let i = 0; i < bursts; i++) {
    const hx = scatterHash('vfx-x:' + id + ':' + seed + ':' + i);
    const hy = scatterHash('vfx-y:' + id + ':' + seed + ':' + i);
    const px = x + Math.round((hx / 4294967295 - .5) * spanX);
    const py = y + Math.round((hy / 4294967295 - .5) * spanY);
    pool.emitBurst(id, px, py, hx ^ hy, countPerBurst);
  }
}
function resetParticles(): void {
  vfxEmissionElapsed = 0;
  vfxBurstIndex = 0;
  particles = new PixelParticleEngine(450);
  particleMode = state.selected;
  const wide = ['falling_leaves','forest_fireflies','rain_splash','water_ripple'].includes(state.selected);
  emitPlaygroundVfx(particles, state.selected as VFXPresetId, 120,
    wide ? 72 : 90, seedNumber(), 12, 7, wide ? 158 : 62, wide ? 60 : 28);
}
function regenerateWorld(): void {
  thumbnailCache.clear();
  worldField = new DeterministicWorldField(state.seed);
  worldRenderer = new ChunkWorldRenderer(worldField);
  showcaseChunk = findShowcaseChunk(worldField);
  cachedWorld.clear();
  particleMode = '';
  if (state.section === 'particles') resetParticles();
  renderCards();
  renderPreviewPending = true;
}
function encodePng(buffer: PixelBuffer): string {
  const canvas = document.createElement('canvas'); canvas.width = buffer.width; canvas.height = buffer.height;
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height), 0, 0);
  return canvas.toDataURL('image/png');
}
function downloadUrl(url: string, filename: string): void {
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
}
function exportSheet(kind: 'png' | 'json'): void {
  if (!['characters','character-actions','npcs','npc-variants','creatures','creature-variants'].includes(state.section)) return;
  const p = profile();
  const directions = ALL_DIRECTIONS_8;
  const selectedAction = ['creatures','creature-variants'].includes(state.section) ? state.creatureAction : state.action;
  const name = state.section + '-' + state.selected + '-' + String(selectedAction) + '-' + p.id;
  if (state.section === 'creatures' || state.section === 'creature-variants') {
    const [species, age, health] = state.section === 'creature-variants'
      ? state.selected.split(':') : [state.selected, state.age, state.health];
    const result = compiler.compileCreatureSheet(species as CreatureSpeciesId, p,
      [state.creatureAction], directions, seedNumber(),
      { ageStage: age as CreatureAgeStage, healthState: health as CreatureHealthState,
        sizeScaleMultiplier: state.creatureScale });
    if (kind === 'png') downloadUrl(encodePng(result.atlasBuffer), name + '.png');
    else downloadUrl(URL.createObjectURL(new Blob([JSON.stringify(result.metadata, null, 2)],
      { type: 'application/json' })), name + '.json');
  } else {
    const [profession, variation] = state.section === 'npc-variants'
      ? state.selected.split(':') : [state.selected, '0'];
    const npc = ['npcs','npc-variants'].includes(state.section) ?
      customization.generateNpcPreset(profession as NpcProfessionArchetypeId,
        state.seed + ':npc:' + variation) : currentCharacter();
    const result = compiler.compileCharacterSheet(npc.appearance, npc.equipment, p,
      [state.action], directions, state.avatarStatus);
    if (kind === 'png') downloadUrl(encodePng(result.atlasBuffer), name + '.png');
    else downloadUrl(URL.createObjectURL(new Blob([JSON.stringify(result.metadata, null, 2)],
      { type: 'application/json' })), name + '.json');
  }
}
function exportTechnicalJSON(): void {
  if (['characters','character-actions','npcs','npc-variants','creatures','creature-variants']
    .includes(state.section)) {
    exportSheet('json');
    return;
  }
  const p = profile();
  const id = state.selected;
  const buffer = renderSubject(state.section, id, p, state.frame);
  const data: Record<string, unknown> = {
    engine: 'PPAE Engine 2.0', section: state.section,
    id, seed: state.seed, seedHash: stableSubjectSeed(state.section, id), styleProfile: p.id,
    nativeBuffer: { width: buffer.width, height: buffer.height,
      encoding: 'RGBA8', uniqueOpaqueColors: buffer.countUniqueOpaqueColors() }
  };
  switch (state.section) {
    case 'trees':
    case 'tree-lifecycle':
    case 'tree-archetypes': {
      const [family, value] = state.section === 'trees' ? [id, undefined] : id.split(':');
      const options = {
        ...(state.section === 'tree-archetypes' ? { archetypeId: value } : {}),
        envState: state.treeEnvironment
      };
      const artifact = nature.generateTreeStage(family as TreeSpeciesId,
        (state.section === 'tree-lifecycle' ? value : state.section === 'tree-archetypes'
          ? 'mature' : state.stage) as TreeLifecycleStage, p, stableSubjectSeed(state.section,id), options);
      data.morphology = artifact.morphology;
      data.anchors = artifact.anchors;
      data.pivotTexel = artifact.pivotTexel;
      break;
    }
    case 'flora': {
      const artifact = nature.generateSecondaryFlora(id as SecondaryFloraKind, p, stableSubjectSeed(state.section,id));
      data.morphology = artifact.flora; data.anchors = artifact.anchors;
      break;
    }
    case 'geology': {
      const artifact = nature.generateGeologicalResource(id as GeologicalResourceKind, p, stableSubjectSeed(state.section,id));
      data.morphology = artifact.geology; data.anchors = artifact.anchors;
      break;
    }
    case 'autotiling':
      data.mask = classifyAutotileMask47(Number(id));
      data.material = state.terrainMaterial;
      data.underlay = state.terrainUnderlay;
      break;
    case 'liquids':
      data.material = id; data.mask = classifyAutotileMask47(state.terrainMask);
      data.animationFrame = state.frame % 8;
      break;
    case 'terrain-variants':
      data.material = id.split(':')[0]; data.variantIndex = Number(id.split(':')[1]);
      break;
    case 'terrain':
      data.material = id;
      break;
    case 'structures': {
      const artifact = structures.generateStructure(DEFAULT_STRUCTURE_CATALOG[id], p,
        state.structureDoor, state.structureWindows);
      data.definition = DEFAULT_STRUCTURE_CATALOG[id];
      data.showRoof = state.structureRoof;
      data.anchors = { ground: artifact.pivotTexel };
      data.wallCollisionRects = artifact.wallCollisionRects;
      data.doorCollisionRect = artifact.doorCollisionRect;
      data.roofOcclusionFootprint = artifact.roofOcclusionFootprint;
      break;
    }
    case 'interiors': {
      const definition = interiorCatalog[id as keyof typeof interiorCatalog] ?? DEFAULT_COTTAGE_INTERIOR;
      const artifact = interiors.renderInterior(definition, p);
      data.definition = definition;
      data.collisionRects = artifact.collisionRects;
      data.walkabilityGrid = artifact.walkabilityGrid;
      data.lightSourcePositionsTexel = artifact.lightSourcePositionsTexel;
      break;
    }
    case 'caves': {
      const artifact = caves.generateChamber({ ...DEFAULT_CRYSTAL_CAVERN, seed: seedNumber(id),
        hasLavaPool: state.caveLava, crystalCount: state.caveCrystals }, p);
      data.definition = { ...DEFAULT_CRYSTAL_CAVERN, hasLavaPool: state.caveLava,
        crystalCount: state.caveCrystals };
      data.collisionRects = artifact.collisionRects;
      data.bioluminescentNodes = artifact.bioluminescentNodes;
      break;
    }
    case 'bosses': {
      const boss = id === BOSS_IDS[1] ?
        createCorruptedTreantBossState(seedNumber(id)) : createDefaultColossusBossState(seedNumber(id));
      data.bossState = {
        ...boss, phase: state.stage, action: state.bossAction,
        telegraphKind: state.bossTelegraph,
        deathStage: state.bossDeath, segmentIntegrity: state.bossIntegrity
      };
      break;
    }
    case 'farming':
    case 'crop-lifecycle': {
      const [crop, phase] = state.section === 'crop-lifecycle' ? id.split(':') : [id, state.stage];
      data.crop = crop; data.lifecycleStage = phase;
      break;
    }
    case 'equipment':
    case 'equipment-materials':
      data.material = state.section === 'equipment-materials' ? id.split(':')[0] : state.materialTier;
      data.category = state.section === 'equipment-materials' ? id.split(':')[1] : id;
      data.wearState = state.wearState;
      break;
    case 'hud':
      data.progress = state.progress;
      break;
    case 'particles':
      data.emitterPreset = VFX_EMITTER_PRESETS[id as VFXPresetId];
      data.activeParticles = particles.getTelemetry().activeParticlesCount;
      break;
    case 'weather':
      data.weather = DEFAULT_WEATHER_STATES[id as WeatherConditionId];
      break;
    case 'lighting':
      data.ambient = AMBIENT_PROFILES_BY_PHASE[id as TimeOfDayPhase];
      data.solarShadowVector = lighting.resolveSolarShadowVector(
        LIGHTING_HOURS[id as TimeOfDayPhase], id === 'underground_dark');
      break;
    case 'palettes':
      data.palette = paletteManager.getPalette(id);
      break;
    case 'resolution-profiles':
      data.artStyleProfile = DEFAULT_STYLE_PROFILES[id as GranularityProfileId];
      data.generatedNativeProfile = id;
      data.comparisonSeed = fnv1aHash32(state.seed + ':compare-oak-mature');
      break;
    case 'world':
      data.worldChunk = showcaseChunk;
      data.weather = state.weather; data.time = state.time;
      break;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadUrl(url, 'ppae-metadata-' + state.section + '-' + id.replace(/:/g,'-') + '.json');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function syncPlayButton(): void {
  const button = byId<HTMLButtonElement>('play-toggle');
  button.replaceChildren(pixelIcon(state.playing ? 'pause' : 'play'));
  button.setAttribute('aria-pressed', String(state.playing));
  button.setAttribute('aria-label', tr(state.playing ? 'Pause animation' : 'Play animation'));
}
function closeMobileNav(): void {
  document.querySelector('.studio')?.classList.remove('nav-open');
  byId('toggle-sidebar').setAttribute('aria-expanded', 'false');
}
function closeInspector(): void {
  document.querySelector('.studio')?.classList.remove('inspector-open');
  byId('toggle-inspector').setAttribute('aria-expanded','false');
}
function routeToView(): void {
  const hash = location.hash.replace('#','');
  const match = PLAYGROUND_SECTIONS.some(section => section.id === hash);
  const studio = byId<HTMLElement>('playground-app');
  const landing = byId<HTMLElement>('landing-page');
  // #home, #features and #showcase belong to the product homepage;
  // every existing engine section deep-link remains backwards compatible.
  const showStudio = match || hash === 'playground';
  studio.hidden = !showStudio; landing.hidden = showStudio;
  document.body.classList.toggle('view-playground',showStudio);
  document.body.classList.toggle('view-landing',!showStudio);
  if (showStudio) {
    closeMobileNav(); closeInspector();
    const section = (hash === 'playground' ? 'world' : hash) as PlaygroundSectionId;
    if (state.section !== section) selectSection(section);
    renderPreviewPending = true;
    window.scrollTo(0,0);
  } else {
    closeMobileNav(); closeInspector();
    if (hash === 'features' || hash === 'showcase') {
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({behavior:'smooth'}));
    } else {
      window.scrollTo(0,0);
    }
  }
}
function connectControls(): void {
  options(byId<HTMLSelectElement>('direction-select'), EIGHT_DIRECTIONS, state.direction);
  byId<HTMLInputElement>('seed-input').addEventListener('change', e => {
    state.seed = (e.currentTarget as HTMLInputElement).value.trim().slice(0, 140) || 'PixelProject-2026';
    regenerateWorld();
  });
  byId('random-seed-btn').addEventListener('click', () => {
    state.seed = 'PPAE-' + Math.floor(Math.random() * 999999999).toString(36);
    byId<HTMLInputElement>('seed-input').value = state.seed; regenerateWorld();
  });
  byId<HTMLSelectElement>('profile-select').addEventListener('change', e => {
    state.profile = (e.currentTarget as HTMLSelectElement).value as GranularityProfileId;
    cachedWorld.clear(); renderCards(); renderPreviewPending = true;
  });
  byId<HTMLSelectElement>('direction-select').addEventListener('change', e => {
    state.direction = (e.currentTarget as HTMLSelectElement).value as Direction8;
    characterAsm.setDirection(state.direction);
    renderCards(); renderPreviewPending = true;
  });
  byId<HTMLSelectElement>('action-select').addEventListener('change', e => {
    const act = (e.currentTarget as HTMLSelectElement).value;
    if (state.section === 'creatures') state.creatureAction = act as CreatureActionId;
    else { state.action = act as CharacterActionId; characterAsm.requestState(state.action, true); }
    state.frame = 0; elapsed = 0; renderCards(); renderPreviewPending = true;
  });
  byId<HTMLSelectElement>('stage-select').addEventListener('change', e => {
    state.stage = (e.currentTarget as HTMLSelectElement).value;
    renderCards(); renderPreviewPending = true;
  });
  byId<HTMLSelectElement>('age-select').addEventListener('change', e => {
    state.age = (e.currentTarget as HTMLSelectElement).value as CreatureAgeStage; renderCards(); renderPreviewPending = true;
  });
  byId<HTMLSelectElement>('health-select').addEventListener('change', e => {
    state.health = (e.currentTarget as HTMLSelectElement).value as CreatureHealthState; renderCards(); renderPreviewPending = true;
  });
  byId<HTMLSelectElement>('time-select').addEventListener('change', e => {
    state.time = (e.currentTarget as HTMLSelectElement).value as TimeOfDayPhase;
    renderCards(); renderPreviewPending = true;
  });
  byId<HTMLSelectElement>('weather-select').addEventListener('change', e => {
    state.weather = (e.currentTarget as HTMLSelectElement).value as WeatherConditionId;
    renderCards(); renderPreviewPending = true;
  });
  byId<HTMLInputElement>('zoom-select').addEventListener('input', e => {
    state.zoom = Number((e.currentTarget as HTMLInputElement).value);
    byId('zoom-display').textContent = state.zoom + '×'; renderPreviewPending = true;
  });
  byId<HTMLInputElement>('speed-select').addEventListener('input', e => {
    state.speed = Number((e.currentTarget as HTMLInputElement).value);
    byId('speed-display').textContent = state.speed.toFixed(2) + '×';
    characterAsm.setSpeedMultiplier(state.speed); renderPreviewPending = true;
  });
  byId<HTMLInputElement>('loop-toggle').addEventListener('change', e => {
    state.loop = (e.currentTarget as HTMLInputElement).checked;
  });
  for (const [id, prop] of [
    ['pivot-toggle','pivot'], ['hitbox-toggle','hitbox'], ['toggle-grid','grid']
  ] as const) {
    byId(id).addEventListener('click', e => {
      if ((e.currentTarget as HTMLElement).tagName === 'INPUT') return;
      state[prop] = !state[prop];
      (e.currentTarget as HTMLElement).setAttribute('aria-pressed',String(state[prop]));
      renderPreviewPending = true;
    });
    if (id.endsWith('toggle') && id !== 'toggle-grid') {
      byId<HTMLInputElement>(id).addEventListener('change', e => {
        state[prop] = (e.currentTarget as HTMLInputElement).checked; renderPreviewPending = true;
      });
    }
  }
  byId('play-toggle').addEventListener('click', () => {
    if (!state.playing && !state.loop && state.frame >= frameInfo().count - 1) {
      state.frame = 0; elapsed = 0;
    }
    state.playing = !state.playing;
    syncPlayButton();
    renderPreviewPending = true;
  });
  byId('gallery-prev').addEventListener('click', () => {
    if (state.page > 0) { state.page--; renderCards(); }
  });
  byId('gallery-next').addEventListener('click', () => {
    if ((state.page + 1) * PAGE_SIZE < filteredItems(state.section).length) {
      state.page++; renderCards();
    }
  });
  byId('download-sprite').addEventListener('click', () => {
    const buffer = renderSubject(state.section, state.selected, profile(), state.frame);
    const filename = 'ppae-native-' + state.section + '-' + state.selected.replace(/:/g,'-') +
      '-' + (state.section === 'resolution-profiles' ? state.selected : profile().id) + '.png';
    downloadUrl(encodePng(buffer), filename);
  });
  byId('download-png').addEventListener('click', () => {
    const filename = 'ppae-' + state.section + '-' + state.selected + '-' + profile().id + '.png';
    downloadUrl(stage.toDataURL('image/png'), filename);
  });
  byId<HTMLInputElement>('catalog-search').addEventListener('input', event => {
    state.catalogQuery = (event.currentTarget as HTMLInputElement).value;
    state.page = 0; renderCards();
  });
  byId('download-atlas').addEventListener('click', () => exportSheet('png'));
  byId('download-json').addEventListener('click', () => exportTechnicalJSON());
  byId('mobile-nav-scrim').addEventListener('click', closeMobileNav);
  byId('inspector-scrim').addEventListener('click', closeInspector);
  byId('close-inspector').addEventListener('click', closeInspector);
  byId('toggle-inspector').addEventListener('click', () => {
    closeMobileNav();
    const studio = document.querySelector('.studio')!;
    const open = !studio.classList.contains('inspector-open');
    studio.classList.toggle('inspector-open',open);
    byId('toggle-inspector').setAttribute('aria-expanded',String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeMobileNav(); closeInspector(); }
  });
  byId('toggle-sidebar').addEventListener('click', () => {
    const studio = document.querySelector('.studio')!;
    const open = !studio.classList.contains('nav-open');
    studio.classList.toggle('nav-open', open);
    byId('toggle-sidebar').setAttribute('aria-expanded',String(open));
  });
  window.addEventListener('hashchange', routeToView);
}
function tick(now: number): void {
  // Keep the heavyweight gallery/world renderer asleep while on the landing.
  if (byId<HTMLElement>('playground-app').hidden) {
    lastTick = now;
    requestAnimationFrame(tick);
    return;
  }
  const dt = Math.min(120, lastTick ? now - lastTick : 16);
  lastTick = now;
  if (state.playing && !document.hidden) {
    elapsed += dt * state.speed;
    const info = frameInfo();
    while (elapsed >= (state.frame + 1) * info.duration) {
      state.frame++;
      if (!state.loop && state.frame >= info.count) {
        state.frame = info.count - 1;
        state.playing = false;
        syncPlayButton();
        break;
      }
      if (state.frame >= info.count) { state.frame = 0; elapsed = 0; }
    }
    if (state.section === 'particles' && particleMode === state.selected) {
      const dtMs = dt * state.speed;
      particles.update(dtMs, { vx: .17, vy: 0,
        canopyPixelShiftX: 0, canopyPixelShiftY: 0, strength: .17 });
      vfxEmissionElapsed += dtMs;
      // Even short-lived impacts/ripples should never disappear for >1 second.
      if (vfxEmissionElapsed >= 175) {
        vfxEmissionElapsed %= 175;
        const wide = ['falling_leaves','forest_fireflies','rain_splash','water_ripple'].includes(state.selected);
        emitPlaygroundVfx(particles, state.selected as VFXPresetId, 120,
          wide ? 72 : 90, seedNumber(String(++vfxBurstIndex)), 3, 5,
          wide ? 158 : 62, wide ? 60 : 28);
      }
    }
  }
  const drawInterval = state.section === 'world' || state.section === 'weather' ||
    state.section === 'lighting' ? 180 : 95;
  if ((renderPreviewPending || (state.playing && now - lastRender > drawInterval)) && !document.hidden) {
    lastRender = now; renderPreviewPending = false; paint(); frameCounter++;
    if (now - lastFps > 1000) {
      byId('fps-counter').textContent = frameCounter + tr(' FPS (preview)');
      frameCounter = 0; lastFps = now;
    }
  }
  requestAnimationFrame(tick);
}
let lastRender = 0;
let lastFps = 0;
const initialHash = location.hash.replace('#','') as PlaygroundSectionId;
const hasStudioRoute = PLAYGROUND_SECTIONS.some(section => section.id === initialHash);
hydratePixelIcons();
initializeLanguageControls();
connectControls();
// selectSection initializes existing atlas navigation; restore the root route
// afterward so a visit to /ppae-engine/ stays on the product landing.
selectSection(hasStudioRoute ? initialHash : 'world');
if (!hasStudioRoute) {
  const originalFragment = initialHash ? '#' + initialHash : '';
  history.replaceState(null,'',location.pathname + location.search + originalFragment);
}
routeToView();
characterAsm.requestState(state.action, true);
initLanding();
requestAnimationFrame(tick);
