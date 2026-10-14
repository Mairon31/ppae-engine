import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_PROFILES,
  LodAndChunkCuller,
  OptimizedAtlasPacker,
  PPAEEngine,
  PPAEPerformanceBenchmarkSuite,
  PhaserPPAEAdapter,
  PHASE1_DEFAULT_ASSETS
} from '../src/index';

describe('PPAE Phase 8 — Atlas Packer, LOD, Culling, Phaser Adapter & Benchmarks', () => {
  it('packs multiple assets into an optimized shelf atlas with border padding', () => {
    const engine = new PPAEEngine();
    const palette = engine.paletteManager.getPalette('meadow-summer');
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const artifacts = [
      engine.generateAsset({ worldSeed: 's1', assetDefinition: PHASE1_DEFAULT_ASSETS.oak_tree_mature, styleProfile: profile, palette }),
      engine.generateAsset({ worldSeed: 's2', assetDefinition: PHASE1_DEFAULT_ASSETS.crystal_ore_node, styleProfile: profile, palette }),
      engine.generateAsset({ worldSeed: 's3', assetDefinition: PHASE1_DEFAULT_ASSETS.knight_broadsword, styleProfile: profile, palette })
    ];

    const packer = new OptimizedAtlasPacker();
    const packed = packer.packArtifacts('test_atlas', artifacts, 512, 1);

    expect(packed.atlasBuffer.width).toBe(512);
    expect(packed.atlasBuffer.height).toBeGreaterThan(0);
    expect(Object.keys(packed.metadata.entries).length).toBe(3);
  });

  it('evaluates LOD tiers and culls entities outside camera viewport correctly', () => {
    const culler = new LodAndChunkCuller(10, 20);

    // Entidad cercana (< 10 tiles de 16px = 160px)
    expect(culler.evaluateLodTier(100, 100, 0, 0)).toBe('near');
    // Entidad a distancia media (15 tiles)
    expect(culler.evaluateLodTier(240, 0, 0, 0)).toBe('mid');
    // Entidad lejana (> 20 tiles)
    expect(culler.evaluateLodTier(500, 500, 0, 0)).toBe('far');

    const entities = [
      { id: 'e1', worldX: 50, worldY: 50 },
      { id: 'e2', worldX: 1000, worldY: 1000 } // Fuera de viewport
    ];

    const visible = culler.cullEntitiesByViewport(entities, { x: 0, y: 0, width: 200, height: 200 }, 1);
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('e1');
  });

  it('passes performance benchmark report criteria under 16.6ms per frame budget', () => {
    const suite = new PPAEPerformanceBenchmarkSuite();
    const report = suite.runBenchmarks(15);

    expect(report.schemaVersion).toBe(PPAE_SCHEMA_VERSION);
    expect(report.totalGeneratedAssets).toBe(15);
    expect(report.p95FrameTimeMs).toBeLessThan(16.6);
    expect(report.passedAllBenchmarks).toBe(true);
  });

  it('provides metadata for Phaser 3 adapter integration', () => {
    const meta = PhaserPPAEAdapter.getAdapterMetadata();
    expect(meta.engine).toContain('Phaser 3');
    expect(meta.schemaVersion).toBe(PPAE_SCHEMA_VERSION);
  });
});
