import { describe, expect, it } from 'vitest';
import {
  CoordinateSystem,
  DEFAULT_STYLE_PROFILES,
  PHASE1_DEFAULT_ASSETS,
  PPAEEngine
} from '../src/index';

describe('PPAE Phase 0 & Phase 1 — Core Engine Verification', () => {
  it('produces identical byte-for-byte RGBA output for identical seeds regardless of generation order', () => {
    const engineA = new PPAEEngine();
    const engineB = new PPAEEngine();
    const palette = engineA.paletteManager.getPalette('meadow-summer');
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    // Engine A generates oak first, then crystal
    const oakA = engineA.generateAsset({
      worldSeed: 'deterministic-seed-99',
      assetDefinition: PHASE1_DEFAULT_ASSETS.oak_tree_mature,
      styleProfile: profile,
      palette,
      variantIndex: 3
    });

    // Engine B generates bush and sword first, then oak
    engineB.generateAsset({
      worldSeed: 'other-seed',
      assetDefinition: PHASE1_DEFAULT_ASSETS.berry_bush_wild,
      styleProfile: profile,
      palette,
      variantIndex: 1
    });
    const oakB = engineB.generateAsset({
      worldSeed: 'deterministic-seed-99',
      assetDefinition: PHASE1_DEFAULT_ASSETS.oak_tree_mature,
      styleProfile: profile,
      palette,
      variantIndex: 3
    });

    expect(oakA.metadata.resolvedSeed).toBe(oakB.metadata.resolvedSeed);
    expect(oakA.pixels.length).toBe(oakB.pixels.length);
    expect(Array.from(oakA.pixels)).toEqual(Array.from(oakB.pixels));
  });

  it('resolves 4x4 and 6x6 module divisibility cleanly against canonical 24x24 visual tiles', () => {
    const p4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
    const p6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

    expect(p4.canonicalTileTexels % p4.moduleSize).toBe(0);
    expect(p6.canonicalTileTexels % p6.moduleSize).toBe(0);

    const coord4 = new CoordinateSystem(p4);
    const coord6 = new CoordinateSystem(p6);

    // 1 logical tile (16 units) maps to 24 canonical visual texels in both profiles
    expect(coord4.logicalToVisualTexel(16)).toBe(24);
    expect(coord6.logicalToVisualTexel(16)).toBe(24);
  });

  it('enforces biome contrast ratio and bounded color counts on all default grammars', () => {
    const engine = new PPAEEngine();
    const palette = engine.paletteManager.getPalette('meadow-summer');
    const profile = DEFAULT_STYLE_PROFILES['micro-6x6'];

    for (const def of Object.values(PHASE1_DEFAULT_ASSETS)) {
      const artifact = engine.generateAsset({
        worldSeed: 'contrast-check-seed',
        assetDefinition: def,
        styleProfile: profile,
        palette
      });

      expect(artifact.metadata.contrastRatioAgainstBiome).toBeGreaterThanOrEqual(
        palette.minContrastRatio
      );
      expect(artifact.metadata.uniqueColorCount).toBeGreaterThan(2);
      expect(artifact.metadata.uniqueColorCount).toBeLessThanOrEqual(palette.maxColorsPerAsset);
    }
  });

  it('evicts least-recently-used textures when memory budget is exceeded', () => {
    // Budget muy pequeño (12 KB) para forzar expulsión LRU
    const smallEngine = new PPAEEngine(12 * 1024);
    const palette = smallEngine.paletteManager.getPalette('tundra-winter');
    const profile = DEFAULT_STYLE_PROFILES['micro-6x6'];

    for (let i = 0; i < 20; i++) {
      smallEngine.generateAsset({
        worldSeed: `seed-${i}`,
        assetDefinition: PHASE1_DEFAULT_ASSETS.pine_tree_tall,
        styleProfile: profile,
        palette,
        variantIndex: i
      });
    }

    const telemetry = smallEngine.getTelemetry();
    expect(telemetry.memoryUsedBytes).toBeLessThanOrEqual(12 * 1024);
    expect(telemetry.evictedEntriesCount).toBeGreaterThan(0);
  });
});
