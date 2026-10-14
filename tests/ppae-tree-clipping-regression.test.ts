import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_PROFILES, NatureGenerator, TREE_SPECIES_CATALOG,
  TreeMorphologyResolver, TREE_MORPHOLOGY_ARCHETYPES
} from '../src/index';
import type { TreeSpeciesId } from '../src/index';

const families = Object.keys(TREE_SPECIES_CATALOG) as TreeSpeciesId[];
const profiles = [
  'micro-4x4', 'micro-6x6', 'classic-8x8', 'standard-16x16', 'detailed-32x32'
] as const;

/**
 * A cropped canopy forms a flat, opaque strip on the outer raster boundary.
 * Validate the native engine buffer, not an enlarged Playground thumbnail.
 */
function assertSafeEdges(
  buffer: ReturnType<NatureGenerator['generateTreeStage']>['buffer'],
  context: string
): void {
  const alpha = (x: number, y: number) => buffer.getPixel(x, y).a;
  let touching = 0;
  for (let x = 0; x < buffer.width; x++) {
    if (alpha(x, 0) !== 0) touching++;
    if (alpha(x, buffer.height - 1) !== 0) touching++;
  }
  for (let y = 0; y < buffer.height; y++) {
    if (alpha(0, y) !== 0) touching++;
    if (alpha(buffer.width - 1, y) !== 0) touching++;
  }
  expect(touching, context + ' must have a transparent outer border (no cropped foliage)').toBe(0);
}

describe('P0 tree canopy clipping and runtime sprite bounds regression', () => {
  const generator = new NatureGenerator();
  const resolver = new TreeMorphologyResolver();

  it('fits all 12 botanical families in all 5 native resolutions', () => {
    for (const id of profiles) {
      const profile = DEFAULT_STYLE_PROFILES[id];
      for (const family of families) {
        const sample = generator.generateTreeStage(family, 'mature', profile, 12345);
        expect(sample.buffer.width, family + '/' + id).toBe(sample.morphology?.canvasWidthTexels);
        expect(sample.buffer.height, family + '/' + id).toBe(sample.morphology?.canvasHeightTexels);
        expect(sample.buffer.width % profile.moduleSize).toBe(0);
        expect(sample.buffer.height % profile.moduleSize).toBe(0);
        assertSafeEdges(sample.buffer, family + '/' + id);
      }
    }
  });

  it('retains safety borders in ancient, young, damaged, burned and fallen life stages', () => {
    for (const family of families) {
      for (const stage of ['young','ancient','damaged','burned','fallen_log'] as const) {
        const result = generator.generateTreeStage(family, stage, DEFAULT_STYLE_PROFILES['micro-6x6'], 8765);
        assertSafeEdges(result.buffer, family + '/' + stage);
      }
    }
  });

  it('retains the world ground anchor under wind and maintains reproducibility', () => {
    for (const family of families) {
      const profile = DEFAULT_STYLE_PROFILES['standard-16x16'];
      const calm = generator.generateTreeStage(family, 'mature', profile, 42);
      const windy = generator.generateTreeStage(family, 'mature', profile, 42,
        { windShiftTexels: 7 });
      const stable = generator.generateTreeStage(family, 'mature', profile, 42,
        { windShiftTexels: 7 });
      assertSafeEdges(windy.buffer, family + '/wind');
      expect(windy.pivotTexel).toEqual(windy.anchors?.base_pivot &&
        [windy.anchors.base_pivot.texelX, windy.anchors.base_pivot.texelY]);
      const moved = windy.morphology!.skeleton.pivotX - calm.morphology!.skeleton.pivotX;
      expect(moved % profile.moduleSize).toBe(0);
      expect(Array.from(windy.buffer.data)).toEqual(Array.from(stable.buffer.data));
    }
  });

  it('contains each original foliage envelope after fitting without modifying branch topology', () => {
    for (const family of families) {
      for (const archetype of TREE_MORPHOLOGY_ARCHETYPES[family]) {
        const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];
        const desc = resolver.resolveTreeMorphology(family, 'mature', profile, 909, archetype.archetypeId);
        const ids = new Set(desc.skeleton.nodes.map(node => node.nodeId));
        expect(desc.skeleton.pivotX).toBeGreaterThan(0);
        expect(desc.skeleton.pivotX).toBeLessThan(desc.canvasWidthTexels);
        for (const branch of desc.skeleton.segments) {
          expect(ids.has(branch.fromNodeId)).toBe(true);
          expect(ids.has(branch.toNodeId)).toBe(true);
        }
        for (const mass of desc.skeleton.foliageMasses) {
          expect(mass.centerX).toBeGreaterThan(0);
          expect(mass.centerY).toBeGreaterThan(0);
          expect(mass.centerX).toBeLessThan(desc.canvasWidthTexels);
          expect(mass.centerY).toBeLessThan(desc.canvasHeightTexels);
        }
      }
    }
  });
});
