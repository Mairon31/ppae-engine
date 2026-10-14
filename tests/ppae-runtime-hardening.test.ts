import { describe, expect, it } from 'vitest';
import {
  BoundedTextureCache,
  DEFAULT_STYLE_PROFILES,
  GeneratedAssetArtifact,
  OptimizedAtlasPacker,
  PPAEEngine,
  PhaserPPAEAdapter,
  PHASE1_DEFAULT_ASSETS,
  PixelBuffer
} from '../src/index';

function artifact(cacheKey: string, width: number, height: number): GeneratedAssetArtifact {
  const pixels = new Uint8ClampedArray(width * height * 4);
  return {
    metadata: {
      cacheKey,
      assetId: cacheKey,
      category: 'tree',
      generatorVersion: 'test',
      resolvedSeed: 1,
      profileId: 'micro-4x4',
      texelWidth: width,
      texelHeight: height,
      innerWidth: width,
      innerHeight: height,
      paddingPx: 0,
      pivotTexel: [0, 0],
      anchors: {},
      logicalHitbox: {
        offsetX: 0,
        offsetY: 0,
        width: 1,
        height: 1,
        collidable: false
      },
      uniqueColorCount: 0,
      contrastRatioAgainstBiome: null,
      generationTimeMs: 1,
      memoryBytes: pixels.byteLength
    },
    pixels
  };
}

describe('PPAE runtime hardening', () => {
  it('includes serialized generator inputs in deterministic cache identity', () => {
    const engine = new PPAEEngine();
    const palette = engine.paletteManager.getPalette('meadow-summer');
    const assetDefinition = PHASE1_DEFAULT_ASSETS.oak_tree_mature;
    const styleProfile = DEFAULT_STYLE_PROFILES['micro-4x4'];
    const request = { worldSeed: 'cache-key-regression', assetDefinition, styleProfile, palette };

    const original = engine.generateAsset(request);
    expect(engine.generateAsset(request)).toBe(original);
    expect(original.metadata.cacheKey.split('::')[3]).toMatch(/^[0-9a-f]{16}$/);

    const foliage = palette.ramps.foliage;
    const changedPalette = {
      ...palette,
      ramps: {
        ...palette.ramps,
        foliage: {
          ...foliage,
          midtone: { ...foliage.midtone, r: (foliage.midtone.r + 1) % 256 }
        }
      }
    };
    const changedDefinition = {
      ...assetDefinition,
      parameters: { ...assetDefinition.parameters, canopyDensity: 0.42 }
    };

    expect(engine.generateAsset({ ...request, palette: changedPalette }).metadata.cacheKey)
      .not.toBe(original.metadata.cacheKey);
    expect(engine.generateAsset({ ...request, assetDefinition: changedDefinition }).metadata.cacheKey)
      .not.toBe(original.metadata.cacheKey);
  });

  it('keeps extrusion separate from transparent padding and preserves visible pixels', () => {
    const source = new PixelBuffer(2, 2);
    source.setPixel(0, 0, { r: 10, g: 20, b: 30, a: 255 });
    source.setPixel(1, 0, { r: 40, g: 50, b: 60, a: 255 });
    source.setPixel(0, 1, { r: 70, g: 80, b: 90, a: 255 });
    source.setPixel(1, 1, { r: 100, g: 110, b: 120, a: 255 });

    const gutter = source.withPadding(1);
    const extruded = source.withExtrudedPadding(1);

    expect(gutter.getPixel(0, 0).a).toBe(0);
    expect(extruded.getPixel(0, 0)).toEqual(source.getPixel(0, 0));
    expect(extruded.getPixel(3, 3)).toEqual(source.getPixel(1, 1));
    expect(extruded.getPixel(1, 1)).toEqual(source.getPixel(0, 0));
    expect(extruded.getPixel(2, 1)).toEqual(source.getPixel(1, 0));
    expect(source.width).toBe(2);
    expect(() => source.withExtrudedPadding(-1)).toThrow(RangeError);
  });

  it('bounds texture memory, protects retained artifacts, and evicts the oldest unretained entry', () => {
    const cache = new BoundedTextureCache(32);
    const first = artifact('first', 2, 2);
    cache.put('first', first);
    cache.retain('first');
    cache.put('second', artifact('second', 2, 2));

    const attemptedReplacement = artifact('first', 1, 2);
    cache.put('first', attemptedReplacement);
    expect(cache.get('first')).toBe(first);

    cache.put('third', artifact('third', 2, 2));
    expect(cache.get('second')).toBeUndefined();
    expect(cache.get('third')).toBeDefined();
    expect(cache.getTelemetrySnapshot().memoryUsedBytes).toBe(32);

    expect(cache.invalidateByPrefix('first')).toBe(0);
    cache.release('first');
    expect(cache.invalidateByPrefix('first')).toBe(1);
    expect(cache.getTelemetrySnapshot().memoryUsedBytes).toBe(16);
  });

  it('skips an artifact larger than the whole cache and rejects inconsistent pixels', () => {
    const cache = new BoundedTextureCache(8);
    cache.put('large', artifact('large', 2, 2));
    expect(cache.get('large')).toBeUndefined();
    expect(cache.getTelemetrySnapshot().memoryUsedBytes).toBe(0);
    expect(() => new BoundedTextureCache(-1)).toThrow(RangeError);

    const malformed = { ...artifact('bad', 2, 2), pixels: new Uint8ClampedArray(4) };
    expect(() => cache.put('bad', malformed)).toThrow(TypeError);

    const backing = new Uint8ClampedArray(64);
    const view = { ...artifact('view', 2, 2), pixels: backing.subarray(0, 16) };
    expect(() => cache.put('view', view)).toThrow(/complete backing buffer/);
  });

  it('rejects atlas overflow before writing and preserves atlas placement bounds', () => {
    const packer = new OptimizedAtlasPacker();
    const sprite = artifact('sprite', 2, 2);
    expect(() => packer.packArtifacts('too-small', [sprite], 3, 1)).toThrow(RangeError);

    const packed = packer.packArtifacts('valid', [sprite], 4, 1);
    const entry = packed.metadata.entries.sprite;
    expect(entry.atlasX).toBe(1);
    expect(entry.atlasY).toBe(1);
    expect(packed.atlasBuffer.getPixel(entry.atlasX, entry.atlasY).a).toBe(0);
    expect(packed.atlasBuffer.width).toBe(4);
  });

  it('validates Phaser texture inputs and removes a partially-created texture on failure', () => {
    const engine = new PPAEEngine();
    const generated = engine.generateAsset({
      worldSeed: 'adapter-test',
      assetDefinition: PHASE1_DEFAULT_ASSETS.oak_tree_mature,
      styleProfile: DEFAULT_STYLE_PROFILES['micro-4x4'],
      palette: engine.paletteManager.getPalette('meadow-summer')
    });
    let removed = false;
    let createCalls = 0;
    const adapter = new PhaserPPAEAdapter({
      createCanvas: () => {
        createCalls++;
        return { canvas: { getContext: () => null } as unknown as HTMLCanvasElement, refresh: () => undefined };
      },
      remove: () => { removed = true; }
    });
    const malformed = {
      ...generated,
      pixels: new Uint8ClampedArray(1)
    };

    expect(adapter.registerArtifactAsPhaserCanvasTexture('bad', malformed).success).toBe(false);
    expect(adapter.registerArtifactAsPhaserCanvasTexture(
      'null-artifact', null as unknown as GeneratedAssetArtifact
    ).success).toBe(false);
    expect(createCalls).toBe(0);
    expect(adapter.registerArtifactAsPhaserCanvasTexture('valid', generated).success).toBe(false);
    expect(createCalls).toBe(1);
    expect(removed).toBe(true);
    expect(adapter.registerArtifactAsPhaserCanvasTexture(' ', generated).success).toBe(false);

    const imageData = { data: new Uint8ClampedArray(generated.pixels.length) } as ImageData;
    let writtenPixels: Uint8ClampedArray | undefined;
    let refreshed = false;
    const canvasContext = {
      createImageData: () => imageData,
      putImageData: (image: ImageData) => { writtenPixels = image.data; }
    };
    const existingKeys = new Set<string>();
    let successfulCreateCalls = 0;
    const successfulAdapter = new PhaserPPAEAdapter({
      exists: key => existingKeys.has(key),
      createCanvas: key => {
        successfulCreateCalls++;
        existingKeys.add(key);
        return {
        canvas: { getContext: () => canvasContext } as unknown as HTMLCanvasElement,
        refresh: () => { refreshed = true; }
        };
      },
      remove: key => { existingKeys.delete(key); }
    });
    expect(successfulAdapter.registerArtifactAsPhaserCanvasTexture('ok', generated).success)
      .toBe(true);
    expect(successfulAdapter.registerArtifactAsPhaserCanvasTexture('ok', generated).success)
      .toBe(true);
    expect(successfulCreateCalls).toBe(1);
    const changedPixels = { ...generated, pixels: new Uint8ClampedArray(generated.pixels) };
    expect(successfulAdapter.registerArtifactAsPhaserCanvasTexture('ok', changedPixels).success)
      .toBe(false);
    expect(writtenPixels).toEqual(generated.pixels);
    expect(refreshed).toBe(true);
  });
});
