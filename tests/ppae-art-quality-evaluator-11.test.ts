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
    expect(APPROVED_GOLDEN_SEED_REGISTRY.length).toBeGreaterThanOrEqual(10);
    const results = evaluator.runGoldenSeedBenchmarkSuite();

    const failures: string[] = [];
    for (const { entry, report, pixelHash } of results) {
      console.info('PHASE11_REFERENCE', JSON.stringify({ id: entry.benchmarkId, pixelHash, score: report.overallScore, minimum: entry.minExpectedScore, defects: report.defects, metrics: report.metrics }));
      if (!entry.expectedPixelHash || pixelHash !== entry.expectedPixelHash) failures.push(entry.benchmarkId + ': RGBA fingerprint changed');
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
    for (const id of [
      'micro-4x4', 'micro-6x6', 'classic-8x8',
      'standard-16x16', 'detailed-32x32'
    ] as const) {
      const profile = DEFAULT_STYLE_PROFILES[id];
      for (const rep of evaluator.auditAllBaseTerrainMaterials(profile)) {
        expect(rep.isSeamless, id + ':' + rep.materialId).toBe(true);
        expect(rep.seamRatio).toBeLessThanOrEqual(2.4);
        expect(rep.horizontalBoundaryDelta).toBe(0);
        expect(rep.verticalBoundaryDelta).toBe(0);
      }
    }
  });

  it('detects true color-budget overflow and contrast failure without fake clamping', () => {
    const buffer = new PixelBuffer(16, 16);
    const backdrop = { r: 72, g: 122, b: 62, a: 255 };
    buffer.fillRect(0, 0, 16, 16, backdrop);
    for (let x = 0; x < 10; x++) buffer.setPixel(x, 8, { r: x * 21, g: 10, b: 30, a: 255 });
    const report = evaluator.evaluateSpriteQuality(buffer, {
      assetId: 'bad_color_budget', category: 'terrain', profile: profile4,
      backdropColor: backdrop, maxColorsOverride: 4, checkDirectionalLighting: false
    });
    expect(report.defects).toContain('PALETTE_BUDGET_EXCEEDED');
    const flat = new PixelBuffer(8, 8);
    flat.fillRect(0, 0, 8, 8, backdrop);
    const contrast = evaluator.evaluateSpriteQuality(flat, {
      assetId: 'invisible_tile', category: 'terrain', profile: profile4,
      backdropColor: backdrop, checkDirectionalLighting: false
    });
    expect(contrast.metrics.contrastRatioAgainstBackdrop).toBe(1);
    expect(contrast.defects).toContain('LOW_CONTRAST_RATIO');
  });

  it('flags synthetic non-seamless tiles and preserves actual toroidal edges', () => {
    const broken = new PixelBuffer(24, 24);
    broken.fillRect(0, 0, 24, 24, { r: 70, g: 110, b: 80, a: 255 });
    broken.fillRect(23, 0, 1, 24, { r: 250, g: 15, b: 25, a: 255 });
    const report = evaluator.auditTileSeamlessness(broken, 'meadow_grass', profile4);
    expect(report.isSeamless).toBe(false);
    expect(report.horizontalBoundaryDelta).toBeGreaterThan(95);
  });

  it('records deterministic RGBA hashes for each registry specimen and varied terrain', () => {
    const first = evaluator.runGoldenSeedBenchmarkSuite();
    const second = evaluator.runGoldenSeedBenchmarkSuite();
    expect(first.map(x => x.pixelHash)).toEqual(second.map(x => x.pixelHash));
    expect(first.some(x => x.entry.category === 'terrain')).toBe(true);
    expect(new Set(first.map(x => x.entry.expectedPixelHash)).size).toBe(first.length);
    expect(first.every(x => x.pixelHash === x.entry.expectedPixelHash)).toBe(true);
    for (const result of first) expect(result.pixelHash).toMatch(/^[0-9a-f]{8}$/);
  });


  it('detects centered pillow shading in a single coherent material', () => {
    const sprite = new PixelBuffer(32, 32);
    sprite.fillEllipse(16, 16, 11, 11, { r: 60, g: 135, b: 65, a: 255 });
    sprite.fillEllipse(16, 16, 4, 4, { r: 115, g: 225, b: 125, a: 255 });
    const report = evaluator.evaluateSpriteQuality(sprite, {
      assetId: 'pillow_concentric', category: 'tree', profile: profile6,
      backdropColor: { r: 12, g: 23, b: 44, a: 255 },
      maxColorsOverride: 12
    });
    expect(report.metrics.directionalLightAlignment).toBeLessThan(-0.15);
    expect(report.defects).toContain('PILLOW_SHADING_DETECTED');
  });

  it('fingerprints actual RGBA bytes and changes when only one pixel changes', () => {
    const buffer = new PixelBuffer(4, 4);
    const original = evaluator.hashPixelBuffer(buffer);
    buffer.setPixel(2, 1, { r: 1, g: 2, b: 3, a: 255 });
    expect(evaluator.hashPixelBuffer(buffer)).not.toBe(original);
  });

  it('keeps exact empty-silhouette failure instead of giving a passing neutral score', () => {
    const report = evaluator.evaluateSpriteQuality(new PixelBuffer(8, 8), {
      assetId: 'empty', category: 'tree', profile: profile4
    });
    expect(report.defects).toEqual(['EMPTY_SILHOUETTE']);
    expect(report.passed).toBe(false);
    expect(report.overallScore).toBe(0);
  });

});
