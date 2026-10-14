import { describe, expect, it } from 'vitest';
import {
  ALL_DIRECTIONS_8,
  CREATURE_SPECIES_CATALOG,
  CreatureGenerator,
  CreatureSpeciesId,
  createCorruptedTreantBossState,
  createDefaultColossusBossState,
  DEFAULT_STYLE_PROFILES,
  MultiSegmentBossRenderer,
  SpeciesAnimationCapabilityRegistry,
  SpritesheetCompiler
} from '../src/index';

describe('PPAE 2.0 Phase 8A — 10 anatomical families, 16 species and two multisegment bosses', () => {
  const creatures = new CreatureGenerator();
  const bosses = new MultiSegmentBossRenderer();
  const registry = new SpeciesAnimationCapabilityRegistry();
  const profiles = [
    DEFAULT_STYLE_PROFILES['micro-4x4'],
    DEFAULT_STYLE_PROFILES['micro-6x6'],
    DEFAULT_STYLE_PROFILES['classic-8x8'],
    DEFAULT_STYLE_PROFILES['standard-16x16'],
    DEFAULT_STYLE_PROFILES['detailed-32x32']
  ] as const;

  it('registers all 16 species in 10 anatomical families with supported animations', () => {
    const species = Object.keys(CREATURE_SPECIES_CATALOG) as CreatureSpeciesId[];
    expect(species.length).toBe(16);
    const families = new Set<string>();
    for (const id of species) {
      const frame = creatures.renderCreatureFrame(id, 'move', 'E', 1, 6, profiles[0], 2026);
      families.add(frame.family);
      expect(frame.buffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(3);
      expect(registry.getSpeciesSupportedActions(id).length).toBeGreaterThanOrEqual(6);
      expect(frame.anchors.ground_pivot.texelX).toBe(frame.pivotTexel[0]);
    }
    expect(families.size).toBe(10);
    expect(registry.resolveSupportedAction('stone_golem', 'jump_pounce')).toBe('special_ability');
    expect(registry.resolveSupportedAction('desert_viper', 'rest_graze')).toBe('idle');
    expect(registry.resolveSupportedAction('horned_beetle', 'swim')).toBe('move');
    expect(registry.resolveSupportedAction('dairy_cow', 'jump_pounce')).toBe('move');
  });

  it('scales all new anatomical solvers from 4 to 32 native texels/module', () => {
    const representatives: CreatureSpeciesId[] = [
      'forest_stag', 'desert_viper', 'horned_beetle',
      'stone_golem', 'skeleton_warrior', 'river_trout'
    ];
    for (const id of representatives) {
      let previousWidth = 0;
      for (const p of profiles) {
        const frame = creatures.renderCreatureFrame(id, 'idle', 'S', 0, 4, p, 42);
        expect(frame.buffer.width).toBeGreaterThan(previousWidth);
        expect(frame.buffer.height).toBe(CREATURE_SPECIES_CATALOG[id].heightModules * p.moduleSize);
        expect(frame.buffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(3);
        previousWidth = frame.buffer.width;
      }
    }
  });

  it('renders the four new families deterministically across all eight directions and representative actions', () => {
    const pairs: readonly [CreatureSpeciesId, 'move' | 'special_ability' | 'attack'][] = [
      ['desert_viper', 'attack'], ['horned_beetle', 'move'],
      ['stone_golem', 'special_ability'], ['forest_goblin', 'attack']
    ];
    for (const [species, action] of pairs) {
      for (const dir of ALL_DIRECTIONS_8) {
        const a = creatures.renderCreatureFrame(species, action, dir, 2, 6, profiles[2], 2026);
        const b = creatures.renderCreatureFrame(species, action, dir, 2, 6, profiles[2], 2026);
        expect(Array.from(a.buffer.data)).toEqual(Array.from(b.buffer.data));
        expect(a.buffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('differentiates juvenile, adult, elder, wounded and corrupted variants without API regressions', () => {
    const render = (ageStage: 'juvenile' | 'adult' | 'alpha_elder',
      healthState: 'healthy' | 'wounded' | 'corrupted') =>
      creatures.renderCreatureFrame('forest_stag', 'idle', 'E',
        0, 4, profiles[0], 101, { ageStage, healthState });
    const juvenile = render('juvenile', 'healthy');
    const adult = render('adult', 'healthy');
    const elder = render('alpha_elder', 'corrupted');
    const wounded = render('adult', 'wounded');
    const corrupted = render('adult', 'corrupted');
    expect(juvenile.buffer.width).toBeLessThan(adult.buffer.width);
    expect(elder.buffer.width).toBeGreaterThan(adult.buffer.width);
    expect(Array.from(wounded.buffer.data)).not.toEqual(Array.from(adult.buffer.data));
    expect(Array.from(corrupted.buffer.data)).not.toEqual(Array.from(adult.buffer.data));
    // Clamped custom scale should never produce runaway atlas dimensions.
    const capped = creatures.renderCreatureFrame('forest_stag', 'idle', 'E', 0, 4,
      profiles[0], 101, { sizeScaleMultiplier: 500 });
    expect(capped.buffer.width).toBeLessThan(adult.buffer.width * 1.5);
  });

  it('renders distinct treant and crystal boss geometry with correct 4x to 16x scaling', () => {
    const colossus4 = bosses.renderBoss(createDefaultColossusBossState(2026), profiles[0]);
    const colossus16 = bosses.renderBoss(createDefaultColossusBossState(2026), profiles[3]);
    const treant4 = bosses.renderBoss(createCorruptedTreantBossState(2026), profiles[0]);
    const treant16 = bosses.renderBoss(createCorruptedTreantBossState(2026), profiles[3]);
    expect(colossus16.buffer.width).toBe(colossus4.buffer.width * 4);
    expect(treant16.buffer.width).toBe(treant4.buffer.width * 4);
    expect(Array.from(colossus4.buffer.data)).not.toEqual(Array.from(treant4.buffer.data));
    expect(Object.keys(treant4.segmentAnchors)).toHaveLength(4);
    expect(treant4.intactSegmentCount).toBe(4);
    expect(treant4.activeWeakPointExposed).toBe(false);
  });

  it('retains creature atlas export and animation fallbacks for the expanded bestiary', () => {
    const sheet = new SpritesheetCompiler().compileCreatureSheet(
      'desert_viper', profiles[1], ['idle', 'attack', 'rest_graze'], ['S', 'E', 'N', 'W']
    );
    expect(sheet.metadata.actions).toEqual(['idle', 'attack']);
    expect(Object.keys(sheet.metadata.sequenceOrder)).toHaveLength(8);
    const key = 'desert_viper::attack::E::f2';
    expect(sheet.metadata.frames[key].events).toContain('attack_hit');
    expect(sheet.atlasBuffer.width).toBe(sheet.metadata.sheetWidth);
  });
});
