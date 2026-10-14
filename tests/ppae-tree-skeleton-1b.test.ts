import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_PROFILES,
  TreeMorphologyResolver,
  TreeSkeletonRasterizer
} from '../src/index';

describe('PPAE 2.0 Phase 1B — Tree Skeleton, Branching & Bark Rasterization', () => {
  const resolver = new TreeMorphologyResolver();
  const rasterizer = new TreeSkeletonRasterizer();
  const profile4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('renders deterministic woody skeleton buffers with roots, curved trunks, and secondary branches', () => {
    const desc = resolver.resolveTreeMorphology(
      'oak', 'mature', profile6, 'skeleton-seed-101', 'oak_spreading_monarch'
    );
    const orders = new Set(desc.skeleton.segments.map((segment) => segment.order));
    expect(orders.has(0)).toBe(true);
    expect(orders.has(1)).toBe(true);
    expect(orders.has(2)).toBe(true);
    const renderA = rasterizer.renderSkeleton(desc, profile6);
    const renderB = rasterizer.renderSkeleton(desc, profile6);
    expect(renderA.woodyPixelCount).toBeGreaterThan(40);
    expect(Array.from(renderA.compositeSkeletonBuffer.data)).toEqual(
      Array.from(renderB.compositeSkeletonBuffer.data)
    );
  });

  it('applies species-specific bark patterns (birch lenticels, bamboo nodes, palm rings)', () => {
    const birchDesc = resolver.resolveTreeMorphology('birch', 'mature', profile6, 303);
    const bambooDesc = resolver.resolveTreeMorphology('bamboo', 'mature', profile6, 303);
    const palmDesc = resolver.resolveTreeMorphology('palm', 'mature', profile6, 303);
    const birchRender = rasterizer.renderSkeleton(birchDesc, profile6);
    const bambooRender = rasterizer.renderSkeleton(bambooDesc, profile6);
    const palmRender = rasterizer.renderSkeleton(palmDesc, profile6);
    expect(birchRender.barkStyle).toBe('birch_lenticels');
    expect(bambooRender.barkStyle).toBe('bamboo_nodes');
    expect(palmRender.barkStyle).toBe('palm_rings');
    expect(birchRender.compositeSkeletonBuffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(4);
    const bambooCulms = bambooDesc.skeleton.segments.filter((segment) => segment.order === 0);
    expect(bambooCulms.length).toBeGreaterThanOrEqual(3);
  });

  it('separates back branches, main trunk, and exposed deadwood tips into distinct layers', () => {
    const desc = resolver.resolveTreeMorphology(
      'oak', 'damaged', profile6, 909, 'oak_gnarled_veteran'
    );
    const layers = rasterizer.renderSkeleton(desc, profile6);
    expect(layers.trunkAndMainBranchesBuffer.countUniqueOpaqueColors()).toBeGreaterThan(0);
    expect(layers.exposedTipsBuffer.countUniqueOpaqueColors()).toBeGreaterThan(0);
  });

  it('maintains a fixed ground pivot while swaying upper branches under wind shift', () => {
    const desc = resolver.resolveTreeMorphology('pine', 'mature', profile4, 512);
    const calm = rasterizer.renderSkeleton(desc, profile4, undefined, 0);
    const windy = rasterizer.renderSkeleton(desc, profile4, undefined, 2);
    expect(calm.trunkAndMainBranchesBuffer.getPixel(desc.skeleton.pivotX, desc.skeleton.pivotY))
      .toEqual(windy.trunkAndMainBranchesBuffer.getPixel(desc.skeleton.pivotX, desc.skeleton.pivotY));
    expect(Array.from(calm.compositeSkeletonBuffer.data))
      .not.toEqual(Array.from(windy.compositeSkeletonBuffer.data));
  });

  it('models forked trunks as two connected axes diverging from a junction', () => {
    const desc = resolver.resolveTreeMorphology(
      'oak', 'mature', profile6, 456, 'oak_spreading_monarch'
    );
    const nodes = new Map(desc.skeleton.nodes.map((node) => [node.nodeId, node]));
    expect(nodes.has('fork_junction')).toBe(true);
    expect(nodes.has('crown_hub_twin')).toBe(true);
    const trunkSegments = desc.skeleton.segments.filter((segment) => segment.order === 0);
    expect(trunkSegments.length).toBeGreaterThanOrEqual(3);
    expect(trunkSegments.filter((segment) => segment.fromNodeId === 'fork_junction').length).toBe(2);
    for (const segment of desc.skeleton.segments) {
      expect(nodes.has(segment.fromNodeId)).toBe(true);
      expect(nodes.has(segment.toNodeId)).toBe(true);
    }
    expect(rasterizer.renderSkeleton(desc, profile6).woodyPixelCount).toBeGreaterThan(40);
  });

  it('supports independent bamboo stems and mangrove aerial roots', () => {
    const bamboo = resolver.resolveTreeMorphology('bamboo', 'mature', profile6, 77);
    const mangrove = resolver.resolveTreeMorphology('mangrove', 'mature', profile6, 77);
    for (const descriptor of [bamboo, mangrove]) {
      const stemSegments = descriptor.skeleton.segments.filter(
        (segment) => segment.segmentId.startsWith('seg_culm_stem_')
      );
      expect(stemSegments.length).toBe(2);
      const nodes = new Map(descriptor.skeleton.nodes.map((node) => [node.nodeId, node]));
      for (const segment of stemSegments) {
        const start = nodes.get(segment.fromNodeId);
        expect(start).toBeDefined();
        expect(start?.x).toBe(segment.startX);
        expect(start?.y).toBe(segment.startY);
      }
    }
    expect(mangrove.skeleton.roots.some((root) => root.isAerialProp)).toBe(true);
  });

  it('attaches secondary foliage to live order-2 branches without adding leaves to dead stages', () => {
    const mature = resolver.resolveTreeMorphology('willow', 'mature', profile6, 132);
    const dead = resolver.resolveTreeMorphology('willow', 'dead', profile6, 132);
    const secondaryNodeIds = new Set(
      mature.skeleton.segments.filter((segment) => segment.order === 2 && !segment.isExposedDeadwood)
        .map((segment) => segment.toNodeId)
    );
    const masses = mature.skeleton.foliageMasses.filter(
      (mass) => mass.massId.startsWith('foliage_s_')
    );
    expect(masses.length).toBeGreaterThan(0);
    expect(masses.every((mass) => secondaryNodeIds.has(mass.attachedNodeId))).toBe(true);
    expect(dead.skeleton.foliageMasses.length).toBe(0);
  });

  it('generates stable, non-empty raster buffers for seed, stump, and fallen log', () => {
    for (const stage of ['seed', 'stump', 'fallen_log'] as const) {
      const desc = resolver.resolveTreeMorphology('oak', stage, profile4, 2026);
      const result = rasterizer.renderSkeleton(desc, profile4);
      expect(result.woodyPixelCount).toBeGreaterThan(0);
      expect(result.compositeSkeletonBuffer.width).toBe(desc.canvasWidthTexels);
      expect(result.compositeSkeletonBuffer.height).toBe(desc.canvasHeightTexels);
    }
  });
});
