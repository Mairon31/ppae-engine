import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_PROFILES,
  FLORA_SPECIES_CATALOG,
  FloraMorphologyResolver
} from '../src/index';
import type { SecondaryFloraKind } from '../src/index';

describe('PPAE 2.0 Phase 3A — Microvegetation, Floral Anatomy & Ecological Clustering', () => {
  const resolver = new FloraMorphologyResolver();
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];
  const profile4 = DEFAULT_STYLE_PROFILES['micro-4x4'];

  it('guarantees deterministic floral anatomy for identical species, profile and seed', () => {
    const a = resolver.resolveFloraMorphology('flower_cluster', profile6, 'flora-seed-77');
    const b = resolver.resolveFloraMorphology('flower_cluster', profile6, 'flora-seed-77');
    expect(a).toEqual(b);
  });

  it('registers all 17 plant guilds, keeping the six pre-existing kinds', () => {
    const kinds = Object.keys(FLORA_SPECIES_CATALOG) as SecondaryFloraKind[];
    expect(kinds).toHaveLength(17);
    for (const legacy of [
      'tall_grass', 'wild_flower', 'fern', 'mushroom_cluster', 'desert_cactus', 'water_reed'
    ]) expect(kinds).toContain(legacy);
    for (const kind of kinds) {
      const desc = resolver.resolveFloraMorphology(kind, profile6, 2026);
      expect(desc.kind).toBe(kind);
      expect(desc.canvasWidthTexels).toBe(desc.canvasWidthModules * profile6.moduleSize);
      expect(desc.canvasHeightTexels).toBe(desc.canvasHeightModules * profile6.moduleSize);
      expect(desc.metrics.stemCount).toBeGreaterThanOrEqual(1);
      if (kind === 'mushroom_cluster') {
        expect(desc.fungalCaps.length).toBeGreaterThanOrEqual(2);
        expect(desc.stems).toHaveLength(0);
      } else {
        expect(desc.stems.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('eliminates barcode-like grass and differentiates fern fronds and flower clusters', () => {
    const shortGrass = resolver.resolveFloraMorphology('short_grass', profile6, 101);
    const tallGrass = resolver.resolveFloraMorphology('tall_grass', profile6, 102);
    const fern = resolver.resolveFloraMorphology('fern', profile6, 103);
    const flowers = resolver.resolveFloraMorphology('flower_cluster', profile6, 104);

    expect(tallGrass.metrics.maxHeightPx).toBeGreaterThan(shortGrass.metrics.maxHeightPx);
    expect(fern.growthHabit).toBe('frond_arch');
    expect(fern.leaves.length).toBeGreaterThanOrEqual(12);
    expect(fern.leaves.every(leaf => leaf.shape === 'serrated_fern')).toBe(true);
    expect(flowers.blossoms.length).toBeGreaterThanOrEqual(3);
    expect(flowers.blossoms[0].petalCount).toBeGreaterThanOrEqual(3);
    expect(flowers.blossoms[0].centerDiskHex).toMatch(/^#[a-f0-9]{6}$/i);
    // Stems have meaningful independent control points and different end positions.
    expect(new Set(tallGrass.stems.map(s => s.tipX + ':' + s.tipY)).size).toBeGreaterThan(1);
  });

  it('samples clustered and ecologically diverse flora around shorelines and meadows', () => {
    const coast = resolver.selectEcologicalFloraKind(
      2026, 5, 5, 'meadow', 'sand_beach', .8, .6, true
    );
    expect(['water_reed', 'fern', 'ground_moss']).toContain(coast.kind);
    const types = new Set<SecondaryFloraKind>();
    for (let y = 0; y < 18; y += 3) {
      for (let x = 0; x < 18; x += 3) {
        const choice = resolver.selectEcologicalFloraKind(
          2026, x, y, 'meadow', 'meadow_grass', .5, .55, false
        );
        types.add(choice.kind);
      }
    }
    expect(types.size).toBeGreaterThanOrEqual(4);
  });

  it('generates valid attachment topology and positions for both style resolutions', () => {
    for (const profile of [profile4, profile6]) {
      const kinds = Object.keys(FLORA_SPECIES_CATALOG) as SecondaryFloraKind[];
      for (const kind of kinds) {
        const desc = resolver.resolveFloraMorphology(kind, profile, 4096);
        const stems = new Set(desc.stems.map(s => s.stemId));
        for (const stem of desc.stems) {
          expect(stem.baseX).toBeGreaterThanOrEqual(0);
          expect(stem.tipX).toBeLessThan(desc.canvasWidthTexels);
          expect(stem.tipY).toBeGreaterThanOrEqual(0);
          expect(stem.baseY).toBeLessThan(desc.canvasHeightTexels);
        }
        for (const leaf of desc.leaves) {
          expect(stems.has(leaf.parentStemId)).toBe(true);
          expect(leaf.tipX).toBeLessThan(desc.canvasWidthTexels);
          expect(leaf.tipY).toBeGreaterThanOrEqual(0);
        }
        for (const flower of desc.blossoms) {
          expect(stems.has(flower.parentStemId)).toBe(true);
        }
        expect(desc.metrics.leafCount).toBe(desc.leaves.length);
        expect(desc.metrics.blossomCount).toBe(desc.blossoms.length);
      }
    }
  });

  it('returns stable, different variation seeds for adjacent and negative coordinate tiles', () => {
    const args = ['forest', 'forest_moss', .71, .4, false] as const;
    const a = resolver.selectEcologicalFloraKind('world-2026', -4, -1, ...args);
    const again = resolver.selectEcologicalFloraKind('world-2026', -4, -1, ...args);
    const b = resolver.selectEcologicalFloraKind('world-2026', -3, -1, ...args);
    expect(a).toEqual(again);
    expect(a.variantSeed).not.toBe(b.variantSeed);
    expect(['fern', 'mushroom_cluster', 'ground_moss']).toContain(a.kind);
    const aquatic = resolver.selectEcologicalFloraKind(
      'world-2026', 2, 3, 'meadow', 'shallow_water', .9, .5, true
    );
    expect(['water_lily_pad', 'water_reed']).toContain(aquatic.kind);
  });
});
