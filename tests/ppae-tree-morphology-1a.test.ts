import { describe, expect, it } from 'vitest';
import {
  BOTANICAL_SPECIES_DEFINITIONS,
  DEFAULT_STYLE_PROFILES,
  TREE_MORPHOLOGY_ARCHETYPES,
  TreeMorphologyResolver
} from '../src/index';

describe('PPAE 2.0 Phase 1A — Procedural Tree Morphology Architecture', () => {
  const resolver = new TreeMorphologyResolver();
  const profile4 = DEFAULT_STYLE_PROFILES['micro-4x4'];

  it('guarantees strict determinism for identical family, stage, profile, and seed', () => {
    const descA = resolver.resolveTreeMorphology('oak', 'mature', profile4, 'seed-alpha-100');
    const descB = resolver.resolveTreeMorphology('oak', 'mature', profile4, 'seed-alpha-100');
    expect(descA).toEqual(descB);
  });

  it('produces structurally distinct morphologies across botanical families and archetypes', () => {
    const oakMonarch = resolver.resolveTreeMorphology('oak', 'mature', profile4, 1024, 'oak_spreading_monarch');
    const pineSpire = resolver.resolveTreeMorphology('pine', 'mature', profile4, 1024, 'pine_alpine_spire');
    const birchColumn = resolver.resolveTreeMorphology('birch', 'mature', profile4, 1024, 'birch_slender_column');
    const willowWeeping = resolver.resolveTreeMorphology('willow', 'mature', profile4, 1024, 'willow_weeping_cascade');

    expect(oakMonarch.canvasWidthTexels).toBeGreaterThan(pineSpire.canvasWidthTexels);
    // Compare morphological proportions, not transparent sprite safety padding.
    expect(pineSpire.metrics.aspectRatio).toBeLessThan(oakMonarch.metrics.aspectRatio);
    expect(willowWeeping.skeleton.foliageMasses[0].dropLengthPx).toBeGreaterThan(0);
    expect(resolver.computeStructuralDissimilarity(oakMonarch, pineSpire)).toBeGreaterThan(0.35);
    expect(resolver.computeStructuralDissimilarity(oakMonarch, birchColumn)).toBeGreaterThan(0.35);
  });

  it('varies individual skeletons across seeds within the same archetype', () => {
    const tree1 = resolver.resolveTreeMorphology('oak', 'mature', profile4, 'forest-tree-1', 'oak_gnarled_veteran');
    const tree2 = resolver.resolveTreeMorphology('oak', 'mature', profile4, 'forest-tree-2', 'oak_gnarled_veteran');
    expect(tree1.skeleton.nodes).not.toEqual(tree2.skeleton.nodes);
    expect(resolver.computeStructuralDissimilarity(tree1, tree2)).toBeGreaterThan(0.02);
  });

  it('scales dimensions and foliage coherently across the lifecycle', () => {
    const seedStage = resolver.resolveTreeMorphology('oak', 'seed', profile4, 777);
    const saplingStage = resolver.resolveTreeMorphology('oak', 'sapling', profile4, 777);
    const matureStage = resolver.resolveTreeMorphology('oak', 'mature', profile4, 777);
    const ancientStage = resolver.resolveTreeMorphology('oak', 'ancient', profile4, 777);
    const deadStage = resolver.resolveTreeMorphology('oak', 'dead', profile4, 777);

    expect(seedStage.canvasHeightTexels).toBeLessThan(saplingStage.canvasHeightTexels);
    expect(saplingStage.canvasHeightTexels).toBeLessThan(matureStage.canvasHeightTexels);
    expect(matureStage.canvasWidthTexels).toBeLessThanOrEqual(ancientStage.canvasWidthTexels);
    expect(deadStage.skeleton.segments.length).toBeGreaterThan(1);
    expect(deadStage.skeleton.foliageMasses.length).toBe(0);
  });

  it('registers all 12 botanical families in species definitions and archetypes', () => {
    const families = Object.keys(BOTANICAL_SPECIES_DEFINITIONS);
    expect(families.length).toBe(12);
    for (const family of families) {
      expect(TREE_MORPHOLOGY_ARCHETYPES[family as keyof typeof TREE_MORPHOLOGY_ARCHETYPES].length).toBeGreaterThan(0);
    }
  });

  it('creates linked primary/secondary branches and exposes both sides of a mature crown', () => {
    const tree = resolver.resolveTreeMorphology('oak', 'mature', profile4, 4096, 'oak_spreading_monarch');
    const nodeIds = new Set(tree.skeleton.nodes.map((node) => node.nodeId));
    for (const segment of tree.skeleton.segments) {
      expect(nodeIds.has(segment.fromNodeId)).toBe(true);
      expect(nodeIds.has(segment.toNodeId)).toBe(true);
    }
    expect(tree.skeleton.segments.some((segment) => segment.order === 1)).toBe(true);
    expect(tree.skeleton.segments.some((segment) => segment.order === 2)).toBe(true);
    const hub = tree.skeleton.nodes.find((node) => node.nodeId === 'crown_hub')!;
    const primary = tree.skeleton.nodes.filter((node) => node.depthOrder === 1);
    expect(primary.some((node) => node.x < hub.x)).toBe(true);
    expect(primary.some((node) => node.x > hub.x)).toBe(true);
  });

  it('covers all 12 lifecycle stages with finite metrics and non-negative dimensions', () => {
    const stages = ['seed','sprout','sapling','young','immature','mature','ancient','damaged','dead','burned','stump','fallen_log'] as const;
    for (const stage of stages) {
      const tree = resolver.resolveTreeMorphology('oak', stage, profile4, 321);
      expect(tree.canvasWidthTexels).toBeGreaterThan(0);
      expect(tree.canvasHeightTexels).toBeGreaterThan(0);
      expect(Number.isFinite(tree.metrics.horizontalAsymmetry)).toBe(true);
      expect(tree.metrics.foliageMassCount).toBe(tree.skeleton.foliageMasses.length);
    }
  });
});
