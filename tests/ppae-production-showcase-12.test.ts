import { describe, expect, it } from 'vitest';
import {
  PPAEInteractiveShowcaseController, ProceduralArtQualityEvaluator
} from '../src/index';

describe('PPAE 2.0 Phase 12 — Full Production Integration, Multi-Resolution Inspector & Master Plan Closure', () => {
  const showcase = new PPAEInteractiveShowcaseController();

  it('verifies the complete PPAE 2.0 catalog inventory across all 12 phases', () => {
    const inv = showcase.getCatalogInventory();

    expect(inv.resolutionProfiles).toEqual([
      'micro-4x4',
      'micro-6x6',
      'classic-8x8',
      'standard-16x16',
      'detailed-32x32',
      'hybrid-24',
      'adaptive-auto'
    ]);
    expect(inv.treeFamiliesCount).toBe(12);
    expect(inv.treeLifecycleStagesCount).toBe(12);
    expect(inv.geologicalFormationsCount).toBe(17);
    expect(inv.floraSpeciesCount).toBe(17);
    expect(inv.canonicalAutotileMasksCount).toBe(47);
    expect(inv.characterActionsCount).toBe(28);
    expect(inv.npcProfessionsCount).toBe(8);
    expect(inv.creatureSpeciesCount).toBe(16);
    expect(inv.creatureFamiliesCount).toBe(10);
    expect(inv.bossArchetypesCount).toBe(2);
    expect(inv.structurePresetsCount).toBeGreaterThanOrEqual(10);
    expect(inv.vfxPresetsCount).toBe(16);
    expect(inv.goldenSeedsCount).toBeGreaterThanOrEqual(9);
  });

  it('renders a complete, deterministic world scene frame with live quality audit and adaptive resolution', () => {
    const frameA = showcase.renderWorldSceneFrame({
      requestedProfileId: 'adaptive-auto',
      cameraZoom: 3,
      weatherCondition: 'thunderstorm',
      heroAction: 'heavy_attack',
      heroDirection: 'E',
      npcProfession: 'blacksmith_artisan',
      featuredCreature: 'forest_stag',
      featuredBoss: 'corrupted_forest_treant_lord',
      featuredStructureId: 'blue_slate_manor_01',
      activeVfxPreset: 'arcane_burst',
      hour24: 18.5,
      frameIndex: 2
    });

    const frameB = showcase.renderWorldSceneFrame({
      requestedProfileId: 'adaptive-auto',
      cameraZoom: 3,
      weatherCondition: 'thunderstorm',
      heroAction: 'heavy_attack',
      heroDirection: 'E',
      npcProfession: 'blacksmith_artisan',
      featuredCreature: 'forest_stag',
      featuredBoss: 'corrupted_forest_treant_lord',
      featuredStructureId: 'blue_slate_manor_01',
      activeVfxPreset: 'arcane_burst',
      hour24: 18.5,
      frameIndex: 2
    });

    // Determinismo bit a bit de la escena compuesta completa
    expect(frameA.sceneBuffer.width).toBe(frameB.sceneBuffer.width);
    expect(frameA.sceneBuffer.height).toBe(frameB.sceneBuffer.height);
    const qa = new ProceduralArtQualityEvaluator();
    expect(qa.hashPixelBuffer(frameA.sceneBuffer)).toBe(qa.hashPixelBuffer(frameB.sceneBuffer));

    // Verificación de telemetría integrada y auditoría de calidad en vivo
    expect(frameA.telemetry.renderedShadowPixels).toBeGreaterThan(0);
    expect(frameA.telemetry.lightningBranchesCount).toBeGreaterThanOrEqual(6);
    expect(frameA.telemetry.activeParticlesRendered).toBeGreaterThan(0);
    expect(frameA.telemetry.heroQualityReport.passed).toBe(true);
    expect(frameA.telemetry.featuredTreeQualityReport.passed).toBe(true);
    console.info('PHASE12_FEATURED_QUALITY', JSON.stringify({
      hero: frameA.telemetry.heroQualityReport,
      tree: frameA.telemetry.featuredTreeQualityReport,
      rock: frameA.telemetry.featuredRockQualityReport
    }));
    expect(frameA.telemetry.featuredRockQualityReport.passed).toBe(true);
  });

  it('generates multi-resolution comparison strips (4x4 to 32x32) where every tier passes quality evaluation', () => {
    for (const kind of ['hero', 'oak_tree', 'crystal_geode'] as const) {
      const details: unknown[] = [];
      const strip = showcase.renderMultiResolutionComparisonStrip(kind, 2026);
      expect(strip.length).toBe(5);

      let prevWidth = 0;
      for (const item of strip) {
        expect(item.buffer.width).toBeGreaterThan(prevWidth);
        prevWidth = item.buffer.width;
        details.push({ kind, tier: item.profileId, score: item.qualityReport.overallScore, defects: item.qualityReport.defects });
      }
      console.info('PHASE12_COMPARISON', JSON.stringify(details));
      for (const item of strip) {
        expect(item.qualityReport.passed, kind + ':' + item.profileId + ':' + item.qualityReport.defects.join(',')).toBe(true);
      }
    }
  });
});
