import { describe, expect, it } from 'vitest';
import {
  APPROVED_GOLDEN_SEED_REGISTRY,
  DEFAULT_STYLE_PROFILES,
  PixelBuffer,
  ProceduralArtQualityEvaluator
} from '../src/index';

describe('PPAE 2.0 Phase 11 — Procedural Art Quality Evaluator, Anti-Pillow-Shading & Golden Seed Suite', () => {
  const evaluator = new ProceduralArtQualityEvaluator();
  const profile4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('passes all entries in the Approved Golden Seed Registry across trees, rocks, flora, characters, creatures, and structures', () => {
    expect(APPROVED_GOLDEN_SEED_REGISTRY.length).toBeGreaterThanOrEqual(9);
    const results = evaluator.runGoldenSeedBenchmarkSuite();

    const failures: string[] = [];
    for (const { entry, report } of results) {
      console.info('PHASE11_REFERENCE', JSON.stringify({ id: entry.benchmarkId, score: report.overallScore, minimum: entry.minExpectedScore, defects: report.defects, metrics: report.metrics }));
      if (!report.passed || report.overallScore < entry.minExpectedScore || report.defects.length) {
        failures.push(entry.benchmarkId + ': ' + report.overallScore + ' ' + report.defects.join(','));
      }
    }
    expect(failures).toEqual([]);
  });

  it('detects excessive bilateral symmetry (lollipop defect) and orphan noise pixels on synthetic bad sprites', () => {
    // Crear un árbol artificialmente simétrico con ruido huérfano en su interior
    const badLollipop = new PixelBuffer(24, 24);
    badLollipop.fillEllipse(12, 12, 8, 8, { r: 60, g: 140, b: 60, a: 255 });
    // Inyectar píxeles huérfanos aislados de colores dispares
    for (let y = 7; y <= 17; y += 2) {
      for (let x = 7; x <= 17; x += 2) {
        badLollipop.setPixel(x, y, { r: 250, g: 20, b: 220, a: 255 });
      }
    }

    const report = evaluator.evaluateSpriteQuality(badLollipop, {
      assetId: 'synthetic_bad_lollipop',
      category: 'tree',
      profile: profile4,
      requireOrganicAsymmetry: true
    });

    expect(report.passed).toBe(false);
    expect(report.defects).toContain('EXCESSIVE_BILATERAL_SYMMETRY');
    expect(report.defects).toContain('ORPHAN_NOISE_PIXELS');
  });

  it('certifies seamless 2x2 tile continuity across all base terrain materials', () => {
    const reports4 = evaluator.auditAllBaseTerrainMaterials(profile4);
    const reports6 = evaluator.auditAllBaseTerrainMaterials(profile6);

    for (const rep of [...reports4, ...reports6]) {
      expect(rep.isSeamless).toBe(true);
      expect(rep.seamRatio).toBeLessThanOrEqual(2.4);
    }
  });
});
