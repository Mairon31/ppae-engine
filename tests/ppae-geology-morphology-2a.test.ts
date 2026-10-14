import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_PROFILES,
  GEOLOGICAL_ARCHETYPE_CATALOG,
  GeologicalMorphologyResolver
} from '../src/index';
import type { GeologicalResourceKind } from '../src/index';

describe('PPAE 2.0 Phase 2A — Advanced Geological Morphology Architecture', () => {
  const resolver = new GeologicalMorphologyResolver();
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('guarantees determinism for identical kind, profile and seed', () => {
    const a = resolver.resolveGeologicalMorphology('angular_boulder', profile6, 'geo-seed-99');
    const b = resolver.resolveGeologicalMorphology('angular_boulder', profile6, 'geo-seed-99');
    expect(a).toEqual(b);
  });

  it('registers all seventeen formations with faceted planar normals and multiple light bands', () => {
    const kinds = Object.keys(GEOLOGICAL_ARCHETYPE_CATALOG) as GeologicalResourceKind[];
    expect(kinds).toHaveLength(17);
    for (const kind of kinds) {
      const desc = resolver.resolveGeologicalMorphology(kind, profile6, 2026);
      expect(desc.fragments.length).toBeGreaterThanOrEqual(1);
      expect(desc.metrics.totalFacetCount).toBeGreaterThanOrEqual(6);
      const bands = new Set(desc.fragments[0].facets.map(facet => facet.toneBand));
      expect(bands.size).toBeGreaterThanOrEqual(2);
      for (const fragment of desc.fragments) {
        for (const facet of fragment.facets) {
          const length = Math.hypot(...facet.normalVector3D);
          expect(length).toBeGreaterThan(0.997);
          expect(length).toBeLessThan(1.003);
          expect(facet.faceLightScore).toBeGreaterThanOrEqual(-1);
          expect(facet.faceLightScore).toBeLessThanOrEqual(1);
          expect(facet.vertices).toHaveLength(3);
        }
      }
    }
  });

  it('differentiates pebble scatters, slabs, fractured monoliths, mossy boulders and geodes', () => {
    const pebbles = resolver.resolveGeologicalMorphology('surface_pebbles', profile6, 500);
    const slab = resolver.resolveGeologicalMorphology('flat_slab', profile6, 500);
    const monolith = resolver.resolveGeologicalMorphology('fractured_monolith', profile6, 500);
    const mossy = resolver.resolveGeologicalMorphology('mossy_boulder', profile6, 500);
    const geode = resolver.resolveGeologicalMorphology('crystal_geode', profile6, 500);

    expect(pebbles.metrics.fragmentCount).toBeGreaterThanOrEqual(4);
    expect(slab.metrics.aspectRatio).toBeGreaterThan(monolith.metrics.aspectRatio);
    expect(monolith.metrics.fractureCount).toBeGreaterThan(0);
    expect(mossy.fragments[0].mossCoverageRatio).toBeGreaterThan(0.5);
    expect(geode.mineralInclusions.length).toBeGreaterThanOrEqual(4);
    expect(geode.mineralInclusions.some(i => i.shape === 'hex_crystal_spire')).toBe(true);
    expect(geode.mineralInclusions.some(i => i.shape === 'geode_cavity')).toBe(true);
    expect(resolver.computeGeologicalDissimilarity(pebbles, monolith)).toBeGreaterThan(0.45);
    expect(resolver.computeGeologicalDissimilarity(slab, monolith)).toBeGreaterThan(0.35);
  });

  it('retains all seven original geological kinds and stable geometry metrics', () => {
    const legacyKinds = [
      'surface_pebbles', 'mossy_boulder', 'coal_deposit', 'copper_vein',
      'iron_vein', 'gold_vein', 'crystal_geode'
    ] as const;
    for (const kind of legacyKinds) {
      const desc = resolver.resolveGeologicalMorphology(kind, profile6, 1234);
      expect(desc.kind).toBe(kind);
      expect(desc.canvasWidthTexels).toBe(desc.canvasWidthModules * profile6.moduleSize);
      expect(desc.canvasHeightTexels).toBe(desc.canvasHeightModules * profile6.moduleSize);
      expect(desc.metrics.fragmentCount).toBe(desc.fragments.length);
      expect(desc.metrics.totalFacetCount).toBe(
        desc.fragments.reduce((sum, fragment) => sum + fragment.facets.length, 0)
      );
      expect(desc.metrics.fractureCount).toBe(
        desc.fragments.reduce((sum, fragment) => sum + fragment.fractures.length, 0)
      );
      expect(desc.metrics.inclusionCount).toBe(desc.mineralInclusions.length);
    }
  });

  it('ensures all fragment polygon coordinates and topology are finite and deterministic', () => {
    const kinds = Object.keys(GEOLOGICAL_ARCHETYPE_CATALOG) as GeologicalResourceKind[];
    for (const kind of kinds) {
      for (const seed of [0, 7, 4096]) {
        const d = resolver.resolveGeologicalMorphology(kind, profile6, seed);
        expect(d.fragments.every(f => f.hullVertices.length >= 6)).toBe(true);
        const ids = d.fragments.map(f => f.fragmentId);
        expect(new Set(ids).size).toBe(ids.length);
        for (const frag of d.fragments) {
          expect(frag.mossCoverageRatio).toBeGreaterThanOrEqual(0);
          expect(frag.mossCoverageRatio).toBeLessThanOrEqual(1);
          for (const vertex of frag.hullVertices) {
            expect(Number.isInteger(vertex.x)).toBe(true);
            expect(Number.isInteger(vertex.y)).toBe(true);
          }
          expect(frag.facets.length).toBe(frag.hullVertices.length);
          for (const fracture of frag.fractures) expect(fracture.points.length).toBeGreaterThan(1);
        }
      }
    }
  });

  it('changes topology for variant seeds within one formation', () => {
    const a = resolver.resolveGeologicalMorphology('jagged_outcrop', profile6, 'rock-1');
    const b = resolver.resolveGeologicalMorphology('jagged_outcrop', profile6, 'rock-2');
    expect(a.fragments).not.toEqual(b.fragments);
    expect(resolver.computeGeologicalDissimilarity(a, b)).toBeGreaterThan(0);
  });
});
