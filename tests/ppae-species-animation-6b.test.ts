import { describe, expect, it } from 'vitest';
import {
  ALL_DIRECTIONS_8,
  CREATURE_SPECIES_CATALOG,
  CreatureActionId,
  CreatureGenerator,
  DEFAULT_CREATURE_CLIPS,
  DEFAULT_STYLE_PROFILES,
  FAMILY_ANIMATION_CAPABILITIES,
  SpeciesAnimationCapabilityRegistry,
  SpritesheetCompiler
} from '../src/index';

describe('PPAE 2.0 Phase 6B — species capabilities and creature spritesheets', () => {
  const registry = new SpeciesAnimationCapabilityRegistry();
  const generator = new CreatureGenerator();
  const compiler = new SpritesheetCompiler();
  const profile4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('retains 12 canonical clips and includes all ten anatomical families after phase 8A', () => {
    expect(Object.keys(DEFAULT_CREATURE_CLIPS)).toHaveLength(12);
    expect(Object.keys(FAMILY_ANIMATION_CAPABILITIES)).toHaveLength(10);
    for (const originalFamily of [
      'quadruped', 'avian_biped', 'gelatinous_slime', 'arachnid',
      'flying_winged', 'aquatic_swimmer'
    ]) {
      expect(FAMILY_ANIMATION_CAPABILITIES).toHaveProperty(originalFamily);
    }
    for (const [action, clip] of Object.entries(DEFAULT_CREATURE_CLIPS)) {
      expect(clip.action).toBe(action);
      expect(clip.frameCount).toBeGreaterThan(2);
      expect(clip.frameDurationMs).toBeGreaterThan(0);
      for (const event of clip.events) {
        expect(event.frameIndex).toBeGreaterThanOrEqual(0);
        expect(event.frameIndex).toBeLessThan(clip.frameCount);
      }
    }
  });

  it('enforces anatomical capabilities and semantic per-species fallbacks', () => {
    expect(registry.isActionSupportedBySpecies('timber_wolf','jump_pounce')).toBe(true);
    expect(registry.isActionSupportedBySpecies('dairy_cow','jump_pounce')).toBe(false);
    expect(registry.resolveSupportedAction('dairy_cow','jump_pounce')).toBe('move');
    expect(registry.isActionSupportedBySpecies('river_trout','rest_graze')).toBe(false);
    expect(registry.resolveSupportedAction('river_trout','rest_graze')).toBe('swim');
    expect(registry.resolveSupportedAction('emerald_slime','rest_graze')).toBe('idle');
    expect(registry.isActionSupportedBySpecies('emerald_slime','jump_pounce')).toBe(true);
    for (const species of Object.keys(CREATURE_SPECIES_CATALOG) as Array<keyof typeof CREATURE_SPECIES_CATALOG>) {
      const requests = Object.keys(DEFAULT_CREATURE_CLIPS) as CreatureActionId[];
      for (const action of requests) {
        expect(registry.isActionSupportedBySpecies(
          species, registry.resolveSupportedAction(species,action)
        )).toBe(true);
      }
    }
  });

  it('renders distinct frames for wolf pounce/sleep and spider special ability', () => {
    const frame = (species: keyof typeof CREATURE_SPECIES_CATALOG, action: CreatureActionId,
      direction: 'E'|'S', i: number, n: number) =>
      generator.renderCreatureFrame(species,action,direction,i,n,profile6,2026).buffer;
    const wolfIdle = frame('timber_wolf','idle','E',1,4);
    const wolfPounce = frame('timber_wolf','jump_pounce','E',2,5);
    const wolfSleep = frame('timber_wolf','sleep','E',1,4);
    const spiderIdle = frame('cave_spider','idle','S',0,4);
    const spiderSpecial = frame('cave_spider','special_ability','S',2,6);
    expect(Array.from(wolfIdle.data)).not.toEqual(Array.from(wolfPounce.data));
    expect(Array.from(wolfIdle.data)).not.toEqual(Array.from(wolfSleep.data));
    expect(Array.from(spiderIdle.data)).not.toEqual(Array.from(spiderSpecial.data));
  });

  it('keeps deterministic creature geometry across the six rigs and all eight directions', () => {
    for (const species of Object.keys(CREATURE_SPECIES_CATALOG) as Array<keyof typeof CREATURE_SPECIES_CATALOG>) {
      for (const direction of ALL_DIRECTIONS_8) {
        const a=generator.renderCreatureFrame(species,'sprint_flee',direction,1,6,profile4,42);
        const b=generator.renderCreatureFrame(species,'sprint_flee',direction,1,6,profile4,42);
        expect(Array.from(a.buffer.data)).toEqual(Array.from(b.buffer.data));
        expect(a.anchors.ground_pivot).toBeDefined();
        expect(a.buffer.countUniqueOpaqueColors()).toBeGreaterThan(1);
      }
    }
  });

  it('compiles creature spritesheets, events, pivots, padding, and hitbox metadata', () => {
    const wolf = compiler.compileCreatureSheet('timber_wolf',profile6,
      ['idle','sprint_flee','jump_pounce'],['S','E','N','W']);
    expect(wolf.metadata.speciesId).toBe('timber_wolf');
    expect(wolf.metadata.family).toBe('quadruped');
    expect(wolf.metadata.actions).toEqual(['idle','sprint_flee','jump_pounce']);
    expect(Object.keys(wolf.metadata.sequenceOrder)).toHaveLength(12);
    const f=wolf.metadata.frames['timber_wolf::jump_pounce::E::f3'];
    expect(f.events).toContain('attack_hit');
    expect(f.hitbox).toEqual(CREATURE_SPECIES_CATALOG.timber_wolf.logicalHitbox);
    expect(f.pivotTexel[0]).toBeGreaterThan(profile6.extrudePaddingPx);
    expect(f.anchors.ground_pivot.texelX).toBe(f.pivotTexel[0]);
    expect(f.anchors.ground_pivot.texelY).toBe(f.pivotTexel[1]);
    expect(wolf.atlasBuffer.width).toBe(wolf.metadata.sheetWidth);
    expect(wolf.atlasBuffer.height).toBe(wolf.metadata.sheetHeight);
  });

  it('deduplicates incompatible and repeated actions for peaceful and aquatic species', () => {
    const cow = compiler.compileCreatureSheet('dairy_cow',profile4,
      ['jump_pounce','move','special_ability','idle','jump_pounce'],['S']);
    expect(cow.metadata.actions).toEqual(['move','idle']);
    expect(Object.keys(cow.metadata.sequenceOrder)).toHaveLength(2);

    const trout = compiler.compileCreatureSheet('river_trout',profile4,
      ['rest_graze','swim','jump_pounce'],['N','S']);
    expect(trout.metadata.actions).toEqual(['swim','sprint_flee']);
    expect(Object.keys(trout.metadata.sequenceOrder)).toHaveLength(4);
    expect(trout.metadata.frames['river_trout::swim::N::f1'].events)
      .toContain('swim_stroke');
  });
});
