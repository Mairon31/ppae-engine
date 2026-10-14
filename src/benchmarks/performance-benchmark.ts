import { BenchmarkMetricsReport, PPAE_SCHEMA_VERSION } from '../core/contracts';
import { DEFAULT_STYLE_PROFILES } from '../core/coordinates';
import { PPAEEngine, PHASE1_DEFAULT_ASSETS } from '../engine/ppae-engine';

/**
 * Measures CPU asset generation only. Phaser frame/render/draw-call and GPU
 * metrics must be collected from a live renderer; this suite never fabricates them.
 */
export class PPAEPerformanceBenchmarkSuite {
  public runBenchmarks(assetGenerationCycles = 50, warmupCycles = 5): BenchmarkMetricsReport {
    if (!Number.isSafeInteger(assetGenerationCycles) || assetGenerationCycles < 1
      || assetGenerationCycles > 10_000) {
      throw new RangeError('assetGenerationCycles must be an integer in [1, 10000]');
    }
    if (!Number.isSafeInteger(warmupCycles) || warmupCycles < 0 || warmupCycles > 1_000) {
      throw new RangeError('warmupCycles must be an integer in [0, 1000]');
    }
    const engine = new PPAEEngine(32 * 1024 * 1024);
    const palette = engine.paletteManager.getPalette('meadow-summer');
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const times: number[] = [];
    const assets = Object.values(PHASE1_DEFAULT_ASSETS);
    const generate = (i: number, seedPrefix: string): number => {
      const def = assets[i % assets.length];
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      engine.generateAsset({
        worldSeed: `${seedPrefix}-${i}`,
        assetDefinition: def,
        styleProfile: profile,
        palette,
        variantIndex: i
      });
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return end - start;
    }

    for (let i = 0; i < warmupCycles; i++) generate(i, 'warmup');
    for (let i = 0; i < assetGenerationCycles; i++) times.push(generate(i, 'measure'));

    const sorted = [...times].sort((a, b) => a - b);
    const percentile = (p: number): number =>
      sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
    const avg = times.reduce((acc, v) => acc + v, 0) / times.length;

    const telemetry = engine.getTelemetry();

    return {
      schemaVersion: PPAE_SCHEMA_VERSION,
      workload: 'asset-generation',
      measuredSampleCount: times.length,
      warmupSampleCount: warmupCycles,
      totalGeneratedAssets: assetGenerationCycles,
      averageGenerationTimeMs: Number(avg.toFixed(3)),
      p50GenerationTimeMs: Number(percentile(0.5).toFixed(3)),
      p95GenerationTimeMs: Number(percentile(0.95).toFixed(3)),
      p99GenerationTimeMs: Number(percentile(0.99).toFixed(3)),
      estimatedMemoryUsageBytes: telemetry.memoryUsedBytes,
      memoryBudgetBytes: telemetry.memoryBudgetBytes,
      rendererMetricsMeasured: false,
      passedMemoryBudget: telemetry.memoryUsedBytes <= telemetry.memoryBudgetBytes
    };
  }
}
