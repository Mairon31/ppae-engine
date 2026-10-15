import { describe, expect, it } from 'vitest';
import {
  NATIVE_MODULE_SIZES, NATIVE_RESOLUTION_PROFILES,
  NATIVE_ARTISTIC_DETAIL_BUDGETS, NativeCoordinateGrid,
  computeSubGridDivisions, isNativeModuleSize,
  resolveNativeResolutionProfile, verifyTrueNativeResolutionBuffer
} from '../src/core/native-resolution';
import { DEFAULT_STYLE_PROFILES } from '../src/core/coordinates';

describe('PPAE 3.0 Phase 1A — resolution foundations (not yet generator-integrated)', () => {
  it('registers all ten requested native module sizes', () => {
    expect(NATIVE_MODULE_SIZES).toEqual([4,6,8,10,13,16,24,32,34,36]);
    for (const n of NATIVE_MODULE_SIZES) {
      expect(isNativeModuleSize(n)).toBe(true);
      const p = resolveNativeResolutionProfile(n);
      expect(p.moduleSize).toBe(n);
      expect(p.canonicalTileTexels % n).toBe(0);
      expect(p.budget.moduleSize).toBe(n);
    }
    expect(isNativeModuleSize(15)).toBe(false);
  });

  it('preserves existing engine coordinates rather than pretending hybrid-24 is native-24', () => {
    for (const id of [
      'micro-4x4','micro-6x6','classic-8x8',
      'standard-16x16','detailed-32x32','hybrid-24'
    ] as const) {
      const planned = NATIVE_RESOLUTION_PROFILES[id];
      const actual = DEFAULT_STYLE_PROFILES[id];
      expect(planned.moduleSize).toBe(actual.moduleSize);
      expect(planned.canonicalTileTexels).toBe(actual.canonicalTileTexels);
      expect(planned.isAvailableInLegacyGenerators).toBe(true);
    }
    const native24 = resolveNativeResolutionProfile(24);
    expect(native24.id).toBe('native-24x24');
    expect(native24.moduleSize).toBe(24);
    expect(native24.canonicalTileTexels).toBe(96);
    const hybrid = resolveNativeResolutionProfile('hybrid-24');
    expect(hybrid.moduleSize).toBe(4);
    expect(hybrid.canonicalTileTexels).toBe(48);
    expect(hybrid.isLegacyHybrid).toBe(true);
    expect(hybrid.isAvailableInLegacyGenerators).toBe(true);
    expect(native24.isAvailableInLegacyGenerators).toBe(false);
  });

  it('computes exact divisors for prime and composite grids', () => {
    expect(computeSubGridDivisions(10)).toEqual([2,5,10]);
    expect(computeSubGridDivisions(13)).toEqual([13]);
    expect(computeSubGridDivisions(34)).toEqual([2,17,34]);
    expect(computeSubGridDivisions(36)).toEqual([2,3,4,6,9,12,18,36]);
    expect(() => computeSubGridDivisions(0)).toThrow(RangeError);
    expect(() => computeSubGridDivisions(1.1)).toThrow(RangeError);
  });

  it('keeps artistic budget monotonic without exploding ramp colors', () => {
    let lastRamp=0, lastFoliage=0;
    for (const n of NATIVE_MODULE_SIZES) {
      const p=resolveNativeResolutionProfile(n);
      const b=NATIVE_ARTISTIC_DETAIL_BUDGETS[p.id];
      expect(b.maxColorsPerMaterialRamp).toBeGreaterThanOrEqual(lastRamp);
      expect(b.maxColorsPerMaterialRamp).toBeLessThanOrEqual(8);
      expect(b.maxSubFoliageClusters).toBeGreaterThanOrEqual(lastFoliage);
      lastRamp=b.maxColorsPerMaterialRamp;
      lastFoliage=b.maxSubFoliageClusters;
    }
  });

  it('matches module, tile and original logical world mapping independently', () => {
    for (const n of NATIVE_MODULE_SIZES) {
      const g=new NativeCoordinateGrid(n,16);
      expect(g.modulesToTexels(1)).toBe(n);
      expect(g.tilesToTexels(1)).toBe(g.canonicalTileTexels);
      expect(g.logicalWorldUnitsToTexels(16)).toBe(g.canonicalTileTexels);
      expect(g.chunkSizeTexels).toBe(g.canonicalTileTexels*16);
      expect(g.chunkLocalTexelToWorldTexel(1,0,0,0).x).toBe(g.chunkSizeTexels);
    }
  });

  it('maintains exact chunk coordinate adjacency including negative indices', () => {
    for (const n of NATIVE_MODULE_SIZES) {
      const g=new NativeCoordinateGrid(n);
      const last=g.chunkLocalTexelToWorldTexel(-1,0,g.chunkSizeTexels-1,7);
      const next=g.chunkLocalTexelToWorldTexel(0,0,0,7);
      expect(next.x-last.x).toBe(1);
      const before=g.sampleWorldTileAtChunkTexel(-1,0,g.chunkSizeTexels-1,7);
      const after=g.sampleWorldTileAtChunkTexel(0,0,0,7);
      expect(after.x-before.x).toBeCloseTo(1/g.canonicalTileTexels,12);
      expect(before.y).toBeCloseTo(after.y,12);
      const top=g.chunkLocalTexelToWorldTexel(2,-1,9,g.chunkSizeTexels-1);
      const bottom=g.chunkLocalTexelToWorldTexel(2,0,9,0);
      expect(bottom.y-top.y).toBe(1);
    }
  });

  it('resolves true pixel-center pivot for odd 13x13 module', () => {
    const g=new NativeCoordinateGrid('native-13x13');
    const m=g.resolveSpriteMetrics(1,1,{normalizedX:0.5, normalizedY:0.5});
    expect(m.canvasWidthTexels).toBe(13);
    expect(m.canvasHeightTexels).toBe(13);
    expect(m.pivotTexelX).toBe(6);
    expect(m.pivotTexelY).toBe(6);
    expect(m.colliderRectTexels.width).toBeGreaterThan(0);
    expect(() => g.resolveSpriteMetrics(1,1,{normalizedX:2,normalizedY:0})).toThrow();
    expect(() => g.chunkLocalTexelToWorldTexel(0,0,-1,0)).toThrow();
  });

  it('suspects exact nearest-neighbor upscaling but never claims visual proof', () => {
    const img=new Uint8ClampedArray(24*24*4);
    for(let y=0;y<24;y++) for(let x=0;x<24;x++){
      const i=(y*24+x)*4;
      img[i]=Math.floor(x/6)*42+10;
      img[i+1]=Math.floor(y/6)*42+10;
      img[i+2]=120; img[i+3]=255;
    }
    const fake=verifyTrueNativeResolutionBuffer(img,24,24,24);
    expect(fake.classification).toBe('suspected_upscale');
    expect(fake.detectedConstantBlockFactor).toBe(6);
    img[(11*24+13)*4]=251;
    const touched=verifyTrueNativeResolutionBuffer(img,24,24,24);
    expect(touched.classification).toBe('inconclusive');
    expect(touched.reason).toContain('NOT proof');
  });

  it('does not falsely reject flat-color native art as scaled', () => {
    const img=new Uint8ClampedArray(24*24*4);
    img.fill(255);
    const report=verifyTrueNativeResolutionBuffer(img,24,24,24);
    expect(report.classification).toBe('inconclusive');
    expect(report.distinctRgbaColors).toBe(1);
    expect(verifyTrueNativeResolutionBuffer(new Uint8Array(24*24*4),24,24,24).classification).toBe('empty');
  });

  it('validates profiles, coordinates and RGBA dimensions', () => {
    expect(() => resolveNativeResolutionProfile('unknown' as 'native-13x13')).toThrow();
    expect(() => new NativeCoordinateGrid(13,0)).toThrow();
    expect(() => new NativeCoordinateGrid(13).tilesToTexels(Infinity)).toThrow();
    expect(() => verifyTrueNativeResolutionBuffer(new Uint8Array(13),3,3,13)).toThrow();
  });
});
