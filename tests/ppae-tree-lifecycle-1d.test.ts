import { describe, expect, it } from 'vitest';
import {
  BOTANICAL_SPECIES_DEFINITIONS,
  DEFAULT_STYLE_PROFILES,
  DeterministicWorldField,
  NatureGenerator,
  PHASE1_DEFAULT_ASSETS,
  PPAEEngine,
  TREE_SPECIES_CATALOG
} from '../src/index';
import type { TreeLifecycleStage, TreeSpeciesId } from '../src/index';

describe('PPAE 2.0 Phase 1D — Integrated Species, Lifecycle Stages & World Ecological Distribution', () => {
  const generator = new NatureGenerator();
  const profile4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('generates deterministic sprites for all twelve families through the production generator', () => {
    const families = Object.keys(BOTANICAL_SPECIES_DEFINITIONS) as TreeSpeciesId[];
    expect(families).toHaveLength(12);
    expect(Object.keys(TREE_SPECIES_CATALOG)).toHaveLength(12);
    for (const species of families) {
      const first = generator.generateTreeStage(species, 'mature', profile4, 2026);
      const second = generator.generateTreeStage(species, 'mature', profile4, 2026);
      expect(first.buffer.countUniqueOpaqueColors()).toBeGreaterThan(2);
      expect(first.morphology?.familyId).toBe(species);
      expect(first.anchors?.base_pivot.texelX).toBe(first.pivotTexel[0]);
      expect(Array.from(first.buffer.data)).toEqual(Array.from(second.buffer.data));
    }
  });

  it('keeps lifecycle progression and special states coherent across all twelve stages', () => {
    const stages: TreeLifecycleStage[] = [
      'seed','sprout','sapling','young','immature','mature','ancient',
      'damaged','dead','burned','stump','fallen_log'
    ];
    const artifacts = Object.fromEntries(stages.map(stage =>
      [stage, generator.generateTreeStage('oak', stage, profile6, 42)]
    )) as Record<TreeLifecycleStage, ReturnType<typeof generator.generateTreeStage>>;
    expect(artifacts.seed.buffer.height).toBeLessThan(artifacts.sapling.buffer.height);
    expect(artifacts.sapling.buffer.height).toBeLessThan(artifacts.young.buffer.height);
    expect(artifacts.young.buffer.height).toBeLessThanOrEqual(artifacts.mature.buffer.height);
    expect(artifacts.mature.buffer.height).toBeLessThanOrEqual(artifacts.ancient.buffer.height);
    expect(artifacts.stump.buffer.height).toBeLessThan(artifacts.sapling.buffer.height);
    expect(artifacts.fallen_log.buffer.width).toBeGreaterThan(artifacts.fallen_log.buffer.height);
    for (const stage of stages) expect(artifacts[stage].morphology?.stage).toBe(stage);
  });

  it('keeps catalogue grammar assets within exact dimensions and palette budget', () => {
    const engine = new PPAEEngine();
    const palette = engine.paletteManager.getPalette('meadow-summer');
    for (const def of [PHASE1_DEFAULT_ASSETS.oak_tree_mature, PHASE1_DEFAULT_ASSETS.pine_tree_tall]) {
      const artifact = engine.generateAsset({
        worldSeed: 'phase1d-grammar-check', assetDefinition: def,
        styleProfile: profile6, palette, stateTag: 'intact'
      });
      expect(artifact.metadata.uniqueColorCount).toBeGreaterThan(2);
      expect(artifact.metadata.uniqueColorCount).toBeLessThanOrEqual(palette.maxColorsPerAsset);
      expect(artifact.metadata.innerWidth).toBe(def.widthInModules * profile6.moduleSize);
      expect(artifact.metadata.innerHeight).toBe(def.heightInModules * profile6.moduleSize);
      expect(artifact.metadata.anchors.canopy_center).toBeDefined();
    }
  });

  it('spawns several families and lifecycle stages in a multi-chunk region', () => {
    const field = new DeterministicWorldField('ecological-diversity-seed-2026');
    const species = new Set<string>();
    const stages = new Set<string>();
    for (let y = -20; y < 20; y++) {
      for (let x = -20; x < 20; x++) {
        const sample = field.sampleWorldTile(x, y);
        if (sample.propSpawn?.kind === 'tree') {
          species.add(sample.propSpawn.subType);
          if (sample.propSpawn.stage) stages.add(sample.propSpawn.stage);
        }
      }
    }
    expect(species.size).toBeGreaterThanOrEqual(4);
    expect(stages.size).toBeGreaterThanOrEqual(5);
  });

  it('supports backward-compatible optional archetype, seasonal and wind settings', () => {
    const options = { archetypeId: 'oak_gnarled_veteran', envState: 'autumn' as const, windShiftTexels: 2 };
    const custom = generator.generateTreeStage('oak', 'mature', profile6, 17, options);
    const normal = generator.generateTreeStage('oak', 'mature', profile6, 17);
    expect(custom.morphology?.archetypeId).toBe(options.archetypeId);
    expect(Array.from(custom.buffer.data)).not.toEqual(Array.from(normal.buffer.data));
    expect(custom.stage).toBe('mature');
    expect(custom.anchors?.canopy_center).toBeDefined();
  });

  it('retains spatial determinism independently of query order and unrelated tiles', () => {
    const fieldA = new DeterministicWorldField('spatial-ecology');
    const fieldB = new DeterministicWorldField('spatial-ecology');
    const first = fieldA.sampleWorldTile(12, 14);
    fieldB.sampleWorldTile(400, -55);
    fieldB.sampleWorldTile(-2, 15);
    expect(first).toEqual(fieldB.sampleWorldTile(12, 14));
  });
});
