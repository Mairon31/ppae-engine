import {
  AdaptiveResolutionController, ALL_DIRECTIONS_8, AMBIENT_PROFILES_BY_PHASE,
  AnimationStateMachine, ArtStyleProfile, CharacterActionId, CharacterAvatarGenerator,
  CharacterCustomizationService, CHUNK_SIZE_TILES, ChunkWorldRenderer,
  CaveDungeonGenerator, CreatureActionId, CreatureAgeStage, CreatureGenerator,
  CreatureHealthState, CreatureSpeciesId, CropSpeciesId, DEFAULT_CHARACTER_CLIPS, DEFAULT_CREATURE_CLIPS,
  DEFAULT_CRYSTAL_CAVERN, DEFAULT_COTTAGE_INTERIOR, DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT, DEFAULT_HUD_PANEL_CONFIG, DEFAULT_STRUCTURE_CATALOG,
  DEFAULT_STYLE_PROFILES, DEFAULT_WEATHER_STATES, DeterministicWorldField,
  Direction8, EquipmentItemCategory, FarmingAndCropGenerator, fnv1aHash32,
  GeologicalResourceKind, GranularityProfileId, InteriorGenerator, InventoryIconGenerator,
  ItemEquipmentDefinition, ItemMaterialTier, LiquidTileGenerator, MultiSegmentBossRenderer,
  NatureGenerator, NpcProfessionArchetypeId, PixelBuffer, PixelNineSliceLibrary,
  PixelParticleEngine, PixelPerfectLightingEngine, PPAE_SCHEMA_VERSION,
  SecondaryFloraKind, SpeciesAnimationCapabilityRegistry, SpritesheetCompiler,
  StructureGenerator, TerrainAutotiler, TerrainMaterialId, TimeOfDayPhase,
  TreeLifecycleStage, TreeSpeciesId, VFXPresetId, WeatherAndWindSystem,
  WeatherConditionId, createCorruptedTreantBossState, createDefaultColossusBossState
} from '../index';
import {
  BOSS_IDS, CHARACTER_ACTIONS, CROP_STAGES, CREATURE_ACTIONS,
  EIGHT_DIRECTIONS, formatPlaygroundLabel, getPlaygroundSection,
  PLAYGROUND_OPTIONS,
  PLAYGROUND_SECTIONS, PlaygroundSectionId, TREE_STAGES
} from './playground-catalog';

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
const caves = new CaveDungeonGenerator();
const farms = new FarmingAndCropGenerator();
const icons = new InventoryIconGenerator();
const ui = new PixelNineSliceLibrary();
const terrain = new TerrainAutotiler();
const liquids = new LiquidTileGenerator();
const weather = new WeatherAndWindSystem();
const lighting = new PixelPerfectLightingEngine(8);
const bosses = new MultiSegmentBossRenderer();
const compiler = new SpritesheetCompiler();
const adaptive = new AdaptiveResolutionController();
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
};
const state: PlaygroundState = {
  section: 'world', selected: 'world_overview', profile: 'micro-6x6',
  seed: 'PixelProject-2026', direction: 'S', action: 'walk',
  creatureAction: 'move', frame: 0, playing: true, loop: true,
  grid: false, pivot: false, hitbox: false, zoom: 2, speed: 1,
  stage: 'mature', age: 'adult', health: 'healthy',
  time: 'noon', weather: 'clear', page: 0
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
    section, id, state.seed, state.selected, state.stage, state.age, state.health,
    state.time, state.weather, state.direction, state.action, state.creatureAction
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


function seedNumber(extra = ''): number {
  return fnv1aHash32(state.seed + ':' + state.selected + ':' + extra);
}
function profile(): ArtStyleProfile {
  if (state.profile !== 'adaptive-auto') return DEFAULT_STYLE_PROFILES[state.profile];
  return adaptive.selectOptimalProfile({
    category: state.section === 'characters' || state.section === 'npcs' ? 'character' :
      state.section === 'trees' ? 'tree' : state.section === 'bosses' ? 'creature' : 'terrain',
    cameraZoom: state.zoom, screenPixelRatio: window.devicePixelRatio || 1,
    viewportHeightPx: window.innerHeight, distanceFromCameraTiles: 4,
    visualImportance: state.section === 'characters' || state.section === 'bosses' ? 'hero_focal' : 'standard',
    currentFrameTimeMs: lastDrawTime, targetFrameBudgetMs: 20
  });
}
function frameInfo(): { frame: number; count: number; duration: number } {
  if (state.section === 'characters' || state.section === 'npcs' || state.section === 'world') {
    const clip = DEFAULT_CHARACTER_CLIPS[state.action];
    return { frame: state.frame % clip.frameCount, count: clip.frameCount, duration: clip.frameDurationMs };
  }
  if (state.section === 'creatures') {
    const act = capabilities.resolveSupportedAction(state.selected as CreatureSpeciesId, state.creatureAction);
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
  for (const prop of chunk.sortedProps) blend(scene, prop.buffer, prop.drawTexelX, prop.drawTexelY);
  const tile = p.canonicalTileTexels;
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
  const hero = avatar.renderCharacterFrame(
    DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT,
    state.action, state.direction, tick % clip.frameCount, clip.frameCount, p);
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
  const n = seedNumber(id);
  switch (section) {
    case 'world': return worldScene(p, tick);
    case 'characters': {
      const clip = DEFAULT_CHARACTER_CLIPS[state.action];
      return avatar.renderCharacterFrame(DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT,
        state.action, state.direction, tick % clip.frameCount, clip.frameCount, p).buffer;
    }
    case 'npcs': {
      const npc = customization.generateNpcPreset(id as NpcProfessionArchetypeId, n);
      const clip = DEFAULT_CHARACTER_CLIPS[state.action];
      return avatar.renderCharacterFrame(npc.appearance, npc.equipment, state.action,
        state.direction, tick % clip.frameCount, clip.frameCount, p).buffer;
    }
    case 'creatures': {
      const action = capabilities.resolveSupportedAction(id as CreatureSpeciesId, state.creatureAction);
      const clip = DEFAULT_CREATURE_CLIPS[action];
      return creatures.renderCreatureFrame(id as CreatureSpeciesId, action, state.direction,
        tick % clip.frameCount, clip.frameCount, p, n,
        { ageStage: state.age, healthState: state.health }).buffer;
    }
    case 'bosses': {
      const boss = id === BOSS_IDS[1] ? createCorruptedTreantBossState(n) : createDefaultColossusBossState(n);
      const current = { ...boss, phase: (state.stage.startsWith('phase_') ? state.stage : 'phase_1_dormant') as typeof boss.phase,
        frameIndex: tick % 6, direction: state.direction,
        telegraphKind: 'radial_slam' as const, telegraphProgress: (tick % 6) / 5 };
      const rendered = bosses.renderBoss(current, p);
      blend(rendered.buffer, rendered.telegraphOverlayBuffer, 0, 0);
      return rendered.buffer;
    }
    case 'trees':
      return nature.generateTreeStage(id as TreeSpeciesId, state.stage as TreeLifecycleStage, p, n, {
        envState: state.weather === 'snow' ? 'snowy' : 'normal',
        windShiftTexels: Math.round(Math.sin(elapsed / 600) * (p.moduleSize / 4))
      }).buffer;
    case 'flora': return nature.generateSecondaryFlora(id as SecondaryFloraKind, p, n,
      Math.round(Math.sin(elapsed / 500) * p.moduleSize / 6)).buffer;
    case 'geology': return nature.generateGeologicalResource(id as GeologicalResourceKind, p, n).buffer;
    case 'terrain': {
      const tile = baseScene('terrain', p, tick, id);
      return tile;
    }
    case 'structures': {
      const result = structures.generateStructure(DEFAULT_STRUCTURE_CATALOG[id], p, true, true);
      const scene = new PixelBuffer(result.baseAndWallsBuffer.width, result.baseAndWallsBuffer.height);
      blend(scene, result.baseAndWallsBuffer, 0, 0);
      blend(scene, result.roofOverlayBuffer, 0, 0);
      return scene;
    }
    case 'interiors': return interiors.renderInterior(DEFAULT_COTTAGE_INTERIOR, p).roomBuffer;
    case 'caves': return caves.generateChamber({ ...DEFAULT_CRYSTAL_CAVERN, seed: n }, p).chamberBuffer;
    case 'farming': {
      const soil = farms.renderTilledSoilTile(true, p);
      const crop = farms.renderCropStage(id as CropSpeciesId,
        state.stage as typeof CROP_STAGES[number], true, p);
      blend(soil, crop.buffer, 0, 0);
      return soil;
    }
    case 'equipment': {
      const item: ItemEquipmentDefinition = {
        schemaVersion: PPAE_SCHEMA_VERSION, itemId: 'playground_' + id,
        category: id as EquipmentItemCategory, tier: 'iron' as ItemMaterialTier,
        wearState: 'pristine', durabilityMax: 100, durabilityCurrent: 100,
        attackOrPowerBonus: 12, defenseBonus: 5, primaryColorHex: '#cbd5e1', secondaryColorHex: '#475569'
      };
      const icon = icons.generateIcon(item, p, 28 * p.moduleSize / 4);
      const panel = ui.renderNineSlicePanel(DEFAULT_HUD_PANEL_CONFIG,
        76 * p.moduleSize / 4, 58 * p.moduleSize / 4,
        { r: 25, g: 34, b: 47, a: 255 }, { r: 120, g: 96, b: 59, a: 255 });
      blend(panel, icon, Math.floor((panel.width - icon.width) / 2), Math.floor((panel.height - icon.height) / 2));
      return panel;
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
      return lighting.applyLightingToScene(sample,
        { x: 0, y: 0, width: 8 * 16, height: 7 * 16 },
        AMBIENT_PROFILES_BY_PHASE[id as TimeOfDayPhase], p, [], elapsed / 1000).litBuffer;
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
    const p = profile();
    const info = frameInfo();
    const buffer = renderSubject(state.section, state.selected, p, state.frame);
    presentBuffer(buffer);
    lastDrawTime = performance.now() - t0;
    errorString = '';
    byId('engine-live').textContent = 'RENDER OK';
    byId('render-stats').textContent =
      p.id + ' · ' + buffer.width + '×' + buffer.height + ' · ' + lastDrawTime.toFixed(0) + ' ms';
    byId('stage-coordinates').textContent = 'SEED · ' + seedNumber().toString(16).toUpperCase().slice(0, 8);
    byId('stage-action').textContent = state.section.toUpperCase() + ' / ' +
      (state.section === 'creatures' ? state.creatureAction : state.section === 'characters' || state.section === 'npcs' ? state.action : state.selected).toUpperCase();
    byId('stage-frames').textContent = 'FRAME ' + String(info.frame + 1).padStart(2, '0') +
      ' / ' + String(info.count).padStart(2, '0');
    byId('telemetry').innerHTML =
      '<strong>PRODUCCIÓN LIVE</strong><br/>Perfil: ' + p.id +
      '<br/>Semilla hash: ' + seedNumber().toString(16) +
      '<br/>Buffer: ' + buffer.width + ' × ' + buffer.height +
      '<br/>Colores opacos: ' + buffer.countUniqueOpaqueColors() +
      '<br/>Render: ' + lastDrawTime.toFixed(1) + ' ms' +
      '<br/>Animación: ' + (state.playing ? 'PLAY' : 'PAUSE') +
      '<br/>VFX activos: ' + particles.getTelemetry().activeParticlesCount;
  } catch (err) {
    errorString = err instanceof Error ? err.message : String(err);
    byId('engine-live').textContent = 'ERROR';
    byId('telemetry').textContent = errorString;
    sceneBackground(view, stage.width, stage.height);
    view.fillStyle = '#f5b0a6'; view.font = '14px ui-monospace,monospace';
    view.fillText('No se pudo generar esta muestra. Ver inspector.', 32, stage.height / 2);
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
function renderCards(): void {
  const generation = ++galleryGeneration;
  const section = state.section;
  const pending: Array<{ id: string; key: string; canvas: HTMLCanvasElement; thumb: HTMLElement }> = [];
  const items = PLAYGROUND_OPTIONS[state.section];
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
  byId('gallery-range').textContent = (start + 1) + '–' +
    Math.min(items.length, start + PAGE_SIZE) + ' de ' + items.length;
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
      caption.textContent = 'No disponible: ' + String(error);
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
function refreshControlVisibility(): void {
  const character = ['characters', 'npcs', 'world'].includes(state.section);
  const creature = state.section === 'creatures';
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
  byId<HTMLSelectElement>('age-select').disabled = !creature;
  byId<HTMLSelectElement>('health-select').disabled = !creature;
  byId<HTMLSelectElement>('direction-select').disabled = !['characters', 'npcs', 'creatures', 'bosses','world'].includes(state.section);
  const downloadable = state.section === 'characters' || state.section === 'npcs' || creature;
  (byId('download-atlas') as HTMLButtonElement).disabled = !downloadable;
  (byId('download-json') as HTMLButtonElement).disabled = !downloadable;
}
function selectItem(id: string): void {
  if (!PLAYGROUND_OPTIONS[state.section].includes(id)) return;
  state.selected = id;
  state.frame = 0;
  elapsed = 0;
  particleMode = '';
  if (state.section === 'particles') resetParticles();
  refreshControlVisibility();
  renderCards();
  renderPreviewPending = true;
}
function renderNav(): void {
  const nav = byId('section-nav');
  nav.replaceChildren();
  let lastGroup = '';
  const glyphs = ['▦','◈','⌘','♟','♜','♠','♧','◈','▤','⌂','▧','◬','❀','◆','✦','☂','☼'];
  PLAYGROUND_SECTIONS.forEach((section, idx) => {
    if (lastGroup !== section.group) {
      lastGroup = section.group;
      const group = document.createElement('div'); group.className = 'nav-group'; group.textContent = lastGroup;
      nav.appendChild(group);
    }
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'nav-link' + (state.section === section.id ? ' active' : '');
    const glyph = document.createElement('span'); glyph.className = 'nav-glyph'; glyph.textContent = glyphs[idx];
    const label = document.createElement('span'); label.textContent = section.label;
    btn.append(glyph, label);
    btn.addEventListener('click', () => selectSection(section.id));
    nav.appendChild(btn);
  });
}
function selectSection(section: PlaygroundSectionId): void {
  state.section = section; state.selected = PLAYGROUND_OPTIONS[section][0];
  state.page = 0; state.frame = 0; elapsed = 0;
  state.stage = section === 'trees' || section === 'farming' ? 'mature' :
    section === 'bosses' ? 'phase_2_enraged' : 'intact';
  const definition = getPlaygroundSection(section);
  byId('page-title').textContent = definition.label;
  byId('page-description').textContent = definition.description;
  byId('crumb-current').textContent = definition.label;
  byId('preview-subtitle').textContent = definition.group + ' / PPAE 2.0';
  byId('gallery-title').textContent = definition.label + ' · Colección';
  byId('stage-mode-label').textContent = section.toUpperCase() + ' / LIVE SCENE';
  window.history.replaceState(null, '', '#' + section);
  document.querySelector('.studio')?.classList.remove('nav-open');
  (byId('toggle-sidebar') as HTMLButtonElement).setAttribute('aria-expanded','false');
  if (section === 'particles') resetParticles();
  refreshControlVisibility(); renderNav(); renderCards(); renderPreviewPending = true;
}
/**
 * Spread real engine bursts across the demo viewport. PixelParticleEngine's
 * emitBurst starts particles within ~2px of an origin: emitting 85 at once was
 * virtually a single dot despite correct particle counts in telemetry.
 */
function emitPlaygroundVfx(
  pool: PixelParticleEngine, id: VFXPresetId, x: number, y: number,
  seed: number, bursts: number, countPerBurst: number, spanX: number, spanY: number
): void {
  for (let i = 0; i < bursts; i++) {
    const h = fnv1aHash32(id + ':' + seed + ':' + i);
    const px = x + Math.round(((h & 1023) / 1023 - .5) * spanX);
    const py = y + Math.round((((h >>> 10) & 1023) / 1023 - .5) * spanY);
    pool.emitBurst(id, px, py, h, countPerBurst);
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
  if (!['characters','npcs','creatures'].includes(state.section)) return;
  const p = profile();
  const directions = ALL_DIRECTIONS_8;
  const selectedAction = state.section === 'creatures' ? state.creatureAction : state.action;
  const name = state.section + '-' + state.selected + '-' + String(selectedAction) + '-' + p.id;
  if (state.section === 'creatures') {
    const result = compiler.compileCreatureSheet(state.selected as CreatureSpeciesId, p,
      [state.creatureAction], directions, seedNumber());
    if (kind === 'png') downloadUrl(encodePng(result.atlasBuffer), name + '.png');
    else downloadUrl(URL.createObjectURL(new Blob([JSON.stringify(result.metadata, null, 2)],
      { type: 'application/json' })), name + '.json');
  } else {
    const npc = state.section === 'npcs' ?
      customization.generateNpcPreset(state.selected as NpcProfessionArchetypeId, seedNumber()) :
      { appearance: DEFAULT_HERO_APPEARANCE, equipment: DEFAULT_HERO_EQUIPMENT };
    const result = compiler.compileCharacterSheet(npc.appearance, npc.equipment, p,
      [state.action], directions);
    if (kind === 'png') downloadUrl(encodePng(result.atlasBuffer), name + '.png');
    else downloadUrl(URL.createObjectURL(new Blob([JSON.stringify(result.metadata, null, 2)],
      { type: 'application/json' })), name + '.json');
  }
}
function syncPlayButton(): void {
  const button = byId<HTMLButtonElement>('play-toggle');
  button.textContent = state.playing ? 'Ⅱ' : '▶';
  button.setAttribute('aria-pressed', String(state.playing));
  button.setAttribute('aria-label', state.playing ? 'Pausar animación' : 'Reproducir animación');
}
function closeMobileNav(): void {
  document.querySelector('.studio')?.classList.remove('nav-open');
  byId('toggle-sidebar').setAttribute('aria-expanded', 'false');
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
    if ((state.page + 1) * PAGE_SIZE < PLAYGROUND_OPTIONS[state.section].length) {
      state.page++; renderCards();
    }
  });
  byId('download-png').addEventListener('click', () => {
    const filename = 'ppae-' + state.section + '-' + state.selected + '-' + profile().id + '.png';
    downloadUrl(stage.toDataURL('image/png'), filename);
  });
  byId('download-atlas').addEventListener('click', () => exportSheet('png'));
  byId('download-json').addEventListener('click', () => exportSheet('json'));
  byId('mobile-nav-scrim').addEventListener('click', closeMobileNav);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMobileNav();
  });
  byId('toggle-sidebar').addEventListener('click', () => {
    const studio = document.querySelector('.studio')!;
    const open = !studio.classList.contains('nav-open');
    studio.classList.toggle('nav-open', open);
    byId('toggle-sidebar').setAttribute('aria-expanded',String(open));
  });
  window.addEventListener('hashchange', () => {
    const hash = location.hash.replace('#','') as PlaygroundSectionId;
    if (PLAYGROUND_SECTIONS.some(section => section.id === hash) && state.section !== hash) selectSection(hash);
  });
}
function tick(now: number): void {
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
      byId('fps-counter').textContent = frameCounter + ' FPS (visor)';
      frameCounter = 0; lastFps = now;
    }
  }
  requestAnimationFrame(tick);
}
let lastRender = 0;
let lastFps = 0;
connectControls();
const hash = location.hash.replace('#','') as PlaygroundSectionId;
selectSection(PLAYGROUND_SECTIONS.some(section => section.id === hash) ? hash : 'world');
characterAsm.requestState(state.action, true);
requestAnimationFrame(tick);
