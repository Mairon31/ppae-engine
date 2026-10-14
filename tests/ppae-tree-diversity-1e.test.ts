import { describe, expect, it } from 'vitest';
import {
  ChunkWorldRenderer,
  DEFAULT_STYLE_PROFILES,
  DeterministicWorldField,
  NatureGenerator,
  PixelBuffer,
  TreeDiversityController
} from '../src/index';

describe('PPAE 2.0 Phase 1E — Tree Diversity Controller & Morphology Regression', () => {
  const controller = new TreeDiversityController();
  const natureGen = new NatureGenerator();
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('builds a diverse nine-oak cohort across all three archetypes', () => {
    const cohort = controller.generateDiverseTreeCohort(
      'oak', 'mature', 9, profile6, 'cohort-regression-seed-2026'
    );
    expect(cohort).toHaveLength(9);
    const report = controller.evaluateCohortDiversity(cohort);
    expect(report.uniqueArchetypesCount).toBe(3);
    expect(report.widthSpanPx).toBeGreaterThan(0);
    expect(report.heightSpanPx).toBeGreaterThan(0);
    expect(report.meanPairwiseSilhouetteDistance).toBeGreaterThanOrEqual(0.08);
    expect(report.meanBilateralSymmetry).toBeLessThan(0.92);
    expect(report.passedDiversityCriteria).toBe(true);
  });

  it('detects measurable silhouette differences across seven botanical families', () => {
    const families = ['oak', 'pine', 'birch', 'palm', 'willow', 'bamboo', 'dead_tree'] as const;
    const silhouettes = families.map(family =>
      controller.analyzeRasterSilhouette(
        natureGen.generateTreeStage(family, 'mature', profile6, 4096).buffer
      ));
    for (let i = 0; i < silhouettes.length; i++) {
      expect(silhouettes[i].opaquePixelCount).toBeGreaterThan(30);
      for (let j = i + 1; j < silhouettes.length; j++) {
        expect(controller.computeRasterSilhouetteDistance(silhouettes[i], silhouettes[j]))
          .toBeGreaterThan(0.06);
      }
    }
  });

  it('rotates three oak archetypes in three consecutive cells, without chunk-order dependencies', () => {
    const choices = [10,11,12].map(x =>
      controller.resolveSpatiallyStratifiedTreeVariant('world-1', x, 10, 'oak'));
    expect(new Set(choices.map(choice => choice.archetypeId)).size).toBe(3);
    const choicesAgain = [12,10,11].map(x =>
      controller.resolveSpatiallyStratifiedTreeVariant('world-1', x, 10, 'oak'));
    expect(choicesAgain[1]).toEqual(choices[0]);
    for (const choice of choices) expect(choice.variantSeed).toBeGreaterThanOrEqual(0);
    const fieldA = new DeterministicWorldField('spatial-stratification-check');
    const fieldB = new DeterministicWorldField('spatial-stratification-check');
    const chunkIsolated = new ChunkWorldRenderer(fieldA).renderChunk(1, 0, profile6, 0, 4, 8);
    const rendererB = new ChunkWorldRenderer(fieldB);
    rendererB.renderChunk(0, 0, profile6, 0, 4, 8);
    const afterNeighbors = rendererB.renderChunk(1, 0, profile6, 0, 4, 8);
    expect(chunkIsolated.sortedProps).toHaveLength(afterNeighbors.sortedProps.length);
    for (let i = 0; i < chunkIsolated.sortedProps.length; i++) {
      expect(Array.from(chunkIsolated.sortedProps[i].buffer.data)).toEqual(
        Array.from(afterNeighbors.sortedProps[i].buffer.data)
      );
    }
  });

  it('extracts exact silhouette descriptors and returns zero for identical buffers', () => {
    const buffer = new PixelBuffer(12, 10);
    const color = {r: 100,g: 80,b: 60,a: 255};
    buffer.fillRect(3, 2, 6, 6, color);
    const silhouette = controller.analyzeRasterSilhouette(buffer);
    expect(silhouette.boundingBox).toEqual({
      minX: 3, minY: 2, maxX: 8, maxY: 7, width: 6, height: 6
    });
    expect(silhouette.opaquePixelCount).toBe(36);
    expect(silhouette.perimeterPixelCount).toBe(20);
    expect(silhouette.bilateralSymmetryRatio).toBe(1);
    expect(silhouette.horizontalProfile8).toHaveLength(8);
    expect(silhouette.verticalProfile8).toHaveLength(8);
    expect(controller.computeRasterSilhouetteDistance(silhouette,silhouette)).toBe(0);
  });

  it('analyzes empty buffers safely and differentiates empty from occupied ones', () => {
    const empty = controller.analyzeRasterSilhouette(new PixelBuffer(8,8));
    const filled = new PixelBuffer(8,8);
    filled.setPixel(2,2,{r:10,g:10,b:10,a:255});
    const occupied = controller.analyzeRasterSilhouette(filled);
    expect(empty.opaquePixelCount).toBe(0);
    expect(empty.boundingBox.width).toBe(0);
    expect(controller.computeRasterSilhouetteDistance(empty,empty)).toBe(0);
    expect(controller.computeRasterSilhouetteDistance(empty,occupied)).toBe(1);
    expect(controller.evaluateCohortDiversity([]).passedDiversityCriteria).toBe(false);
  });

  it('prevents cardinal archetype repeats whenever a family has multiple choices', () => {
    for (const family of ['oak','pine','birch'] as const) {
      const here = controller.resolveSpatiallyStratifiedTreeVariant('checker-2026',-9,12,family);
      const right = controller.resolveSpatiallyStratifiedTreeVariant('checker-2026',-8,12,family);
      const down = controller.resolveSpatiallyStratifiedTreeVariant('checker-2026',-9,13,family);
      expect(right.archetypeId).not.toBe(here.archetypeId);
      expect(down.archetypeId).not.toBe(here.archetypeId);
    }
    const single = controller.resolveSpatiallyStratifiedTreeVariant('checker-2026',10,10,'willow');
    const next = controller.resolveSpatiallyStratifiedTreeVariant('checker-2026',11,10,'willow');
    expect(single.archetypeId).toBe(next.archetypeId);
    expect(single.variantSeed).not.toBe(next.variantSeed);
  });

  it('populates archetype IDs for actual world trees, including beach trees', () => {
    const field = new DeterministicWorldField('ecological-diversity-seed-2026');
    let count = 0;
    for(let y=-18;y<18;y++){
      for(let x=-18;x<18;x++){
        const sample=field.sampleWorldTile(x,y);
        if(sample.propSpawn?.kind!=='tree')continue;
        count++;
        expect(sample.propSpawn.archetypeId).toBeTruthy();
        const repeated=field.sampleWorldTile(x,y);
        expect(repeated.propSpawn).toEqual(sample.propSpawn);
      }
    }
    expect(count).toBeGreaterThan(5);
  });

  it('rejects invalid cohort counts and thresholds', () => {
    expect(() => controller.generateDiverseTreeCohort('oak','mature',-1,profile6,42)).toThrow(RangeError);
    expect(() => controller.generateDiverseTreeCohort('oak','mature',2,profile6,42,2)).toThrow(RangeError);
  });
});
