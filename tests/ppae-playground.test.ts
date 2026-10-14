import { describe, expect, it } from 'vitest';
import {
  ALL_DIRECTIONS_8, CharacterAvatarGenerator, CharacterCustomizationService,
  ChunkWorldRenderer, CREATURE_SPECIES_CATALOG, CreatureGenerator,
  DEFAULT_CHARACTER_CLIPS, DEFAULT_CREATURE_CLIPS, DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT, DEFAULT_STYLE_PROFILES, DeterministicWorldField,
  LiquidTileGenerator, NatureGenerator, PixelParticleEngine,
  SpeciesAnimationCapabilityRegistry, SpritesheetCompiler, TerrainAutotiler,
  VFX_EMITTER_PRESETS
} from '../src/index';
import {
  BOSS_IDS, CHARACTER_ACTIONS, CREATURE_ACTIONS, NPC_PROFESSIONS,
  PLAYGROUND_OPTIONS, PLAYGROUND_SECTIONS, formatPlaygroundLabel
} from '../src/demo/playground-catalog';

describe('PPAE Playground — catalog and real generator integration', () => {
  const p = DEFAULT_STYLE_PROFILES['micro-4x4'];
  it('lists nonempty interactive sections connected to the real engine catalogs', () => {
    expect(PLAYGROUND_SECTIONS.length).toBeGreaterThanOrEqual(17);
    expect(new Set(PLAYGROUND_SECTIONS.map(s => s.id)).size).toBe(PLAYGROUND_SECTIONS.length);
    for (const section of PLAYGROUND_SECTIONS) expect(PLAYGROUND_OPTIONS[section.id].length).toBeGreaterThan(0);
    expect(PLAYGROUND_OPTIONS.creatures).toEqual(Object.keys(CREATURE_SPECIES_CATALOG));
    expect(PLAYGROUND_OPTIONS.particles).toEqual(Object.keys(VFX_EMITTER_PRESETS));
    expect(PLAYGROUND_OPTIONS.bosses).toEqual([...BOSS_IDS]);
    expect(PLAYGROUND_OPTIONS.npcs).toEqual([...NPC_PROFESSIONS]);
    expect(CHARACTER_ACTIONS).toHaveLength(28);
    expect(CREATURE_ACTIONS).toHaveLength(12);
    expect(formatPlaygroundLabel('town_guard')).toBe('Guardia');
    expect(formatPlaygroundLabel('forest_moss')).toBe('Forest Moss');
    expect(formatPlaygroundLabel('tool_axe')).toBe('Hacha');
  });

  it('renders playable character and eight deterministic profession presets', () => {
    const avatar = new CharacterAvatarGenerator();
    const custom = new CharacterCustomizationService();
    expect(avatar.renderCharacterFrame(DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, 'walk', 'S', 2, 6, p)
      .buffer.countUniqueOpaqueColors()).toBeGreaterThan(3);
    for (const profession of NPC_PROFESSIONS) {
      const npc = custom.generateNpcPreset(profession, 'playground-seed');
      const frame = avatar.renderCharacterFrame(npc.appearance, npc.equipment, 'idle', 'S', 0, 4, p);
      expect(frame.buffer.countUniqueOpaqueColors()).toBeGreaterThan(3);
    }
  });

  it('renders creatures with species-specific fallbacks and exports both types of atlas', () => {
    const capabilities = new SpeciesAnimationCapabilityRegistry();
    const generator = new CreatureGenerator();
    const compiler = new SpritesheetCompiler();
    for (const species of ['dairy_cow', 'river_trout', 'desert_viper'] as const) {
      const action = capabilities.resolveSupportedAction(species, 'jump_pounce');
      const frame = generator.renderCreatureFrame(species, action, 'E', 1, DEFAULT_CREATURE_CLIPS[action].frameCount, p, 2026);
      expect(frame.buffer.width).toBeGreaterThan(0);
    }
    const sheet = compiler.compileCreatureSheet('timber_wolf', p, ['move'], ALL_DIRECTIONS_8);
    expect(Object.keys(sheet.metadata.sequenceOrder)).toHaveLength(8);
    const heroSheet = compiler.compileCharacterSheet(DEFAULT_HERO_APPEARANCE,
      DEFAULT_HERO_EQUIPMENT, p, ['walk'], ALL_DIRECTIONS_8);
    expect(Object.keys(heroSheet.metadata.sequenceOrder)).toHaveLength(8);
    expect(DEFAULT_CHARACTER_CLIPS.walk.frameCount).toBe(6);
  });

  it('renders deterministic terrain, coastal water, vegetation and real VFX particles', () => {
    const chunk = new ChunkWorldRenderer(new DeterministicWorldField('playground-regression'))
      .renderChunk(0, 0, p, 1, 4, 4);
    expect(chunk.terrainBuffer.width).toBe(4 * p.canonicalTileTexels);
    const road = new TerrainAutotiler().composeAutotiledSurface('dirt_soil', 5, p, 'meadow_grass', 0);
    expect(road.countUniqueOpaqueColors()).toBeGreaterThan(2);
    const coast = new LiquidTileGenerator().generateAnimatedFrame('shallow_water', 1, 4, 127, p);
    expect(coast.width).toBe(p.canonicalTileTexels);
    const tree = new NatureGenerator().generateTreeStage('oak', 'mature', p, 2026);
    expect(tree.buffer.countUniqueOpaqueColors()).toBeGreaterThan(3);
    const particles = new PixelParticleEngine(128);
    expect(particles.emitBurst('campfire_flames', 20, 20, 2026)).toBeGreaterThan(0);
    expect(particles.getTelemetry().activeParticlesCount).toBeGreaterThan(0);
  });
});