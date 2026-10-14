import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_PROFILES,
  TreeCanopyFoliageRasterizer,
  TreeMorphologyResolver,
  TreeSkeletonRasterizer
} from '../src/index';

describe('PPAE 2.0 Phase 1C — Advanced Canopy Foliage & Multi-Layer Skeleton Composition', () => {
  const resolver = new TreeMorphologyResolver();
  const skeletonRasterizer = new TreeSkeletonRasterizer();
  const foliageRasterizer = new TreeCanopyFoliageRasterizer();
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('produces deterministic multi-layer canopy buffers and preserves visible wood structure', () => {
    const desc = resolver.resolveTreeMorphology(
      'oak', 'mature', profile6, 'canopy-seed-700', 'oak_spreading_monarch'
    );
    const skel = skeletonRasterizer.renderSkeleton(desc, profile6);
    const canopyA = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6);
    const canopyB = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6);
    expect(canopyA.foliagePixelCount).toBeGreaterThan(80);
    expect(canopyA.visibleWoodPixelCountAfterComposition).toBeGreaterThan(20);
    expect(Array.from(canopyA.compositeTreeBuffer.data)).toEqual(
      Array.from(canopyB.compositeTreeBuffer.data)
    );
  });

  it('generates distinct non-lollipop canopy silhouettes across oak, pine, willow, birch, and palm', () => {
    const families = ['oak', 'pine', 'willow', 'birch', 'palm'] as const;
    const renders = families.map(family => {
      const desc = resolver.resolveTreeMorphology(family, 'mature', profile6, 4096);
      const skel = skeletonRasterizer.renderSkeleton(desc, profile6);
      return { family, desc, canopy: foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6) };
    });
    for (let i = 0; i < renders.length; i++) {
      expect(renders[i].canopy.foliagePixelCount).toBeGreaterThan(25);
      for (let j = i + 1; j < renders.length; j++) {
        expect(Array.from(renders[i].canopy.compositeTreeBuffer.data)).not.toEqual(
          Array.from(renders[j].canopy.compositeTreeBuffer.data)
        );
      }
    }
  });

  it('keeps birch white lenticel bark partially visible through sparse tuft foliage', () => {
    const desc = resolver.resolveTreeMorphology(
      'birch', 'mature', profile6, 'birch-open-canopy', 'birch_slender_column'
    );
    const skel = skeletonRasterizer.renderSkeleton(desc, profile6);
    const tree = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6);
    expect(tree.visibleWoodPixelCountAfterComposition).toBeGreaterThan(
      skel.woodyPixelCount * 0.4
    );
  });

  it('supports seasonal and environmental canopy states (normal, autumn, snowy, blossom)', () => {
    const desc = resolver.resolveTreeMorphology('fruit_tree', 'mature', profile6, 888);
    const skel = skeletonRasterizer.renderSkeleton(desc, profile6);
    const normal = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6, undefined, 'normal');
    const autumn = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6, undefined, 'autumn');
    const snowy = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6, undefined, 'snowy');
    const blossom = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6, undefined, 'blossom');
    const values = [normal, autumn, snowy, blossom].map(tree => Array.from(tree.compositeTreeBuffer.data));
    expect(values[0]).not.toEqual(values[1]);
    expect(values[0]).not.toEqual(values[2]);
    expect(values[0]).not.toEqual(values[3]);
  });

  it('leaves dead and burned trees leafless, retaining visible timber', () => {
    for (const stage of ['dead', 'burned'] as const) {
      const desc = resolver.resolveTreeMorphology('oak', stage, profile6, 123);
      const skel = skeletonRasterizer.renderSkeleton(desc, profile6);
      const tree = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6);
      expect(tree.foliagePixelCount).toBe(0);
      expect(tree.visibleWoodPixelCountAfterComposition).toBe(skel.woodyPixelCount);
    }
  });

  it('maintains base anchor, produces valid canopy anchor and supports wind', () => {
    const desc = resolver.resolveTreeMorphology('willow', 'mature', profile6, 512);
    const skel = skeletonRasterizer.renderSkeleton(desc, profile6);
    const calm = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6, undefined, 'normal', 0);
    const windy = foliageRasterizer.renderCanopyAndCompose(desc, skel, profile6, undefined, 'normal', 2);
    expect(calm.pivotTexel).toEqual([desc.skeleton.pivotX, desc.skeleton.pivotY]);
    expect(windy.anchors.base_pivot).toEqual(calm.anchors.base_pivot);
    expect(windy.anchors.canopy_center.normalizedX).toBeGreaterThanOrEqual(0);
    expect(windy.anchors.canopy_center.normalizedX).toBeLessThanOrEqual(1);
    expect(Array.from(calm.compositeTreeBuffer.data)).not.toEqual(
      Array.from(windy.compositeTreeBuffer.data)
    );
  });

  it('rejects skeleton layers from a different canvas size', () => {
    const oak = resolver.resolveTreeMorphology('oak', 'mature', profile6, 1);
    const pine = resolver.resolveTreeMorphology('pine', 'mature', profile6, 1);
    const wrong = skeletonRasterizer.renderSkeleton(pine, profile6);
    expect(() => foliageRasterizer.renderCanopyAndCompose(oak, wrong, profile6)).toThrow(RangeError);
  });
});
