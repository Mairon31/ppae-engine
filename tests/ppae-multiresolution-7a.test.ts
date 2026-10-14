import { describe, expect, it } from 'vitest';
import {
  AdaptiveResolutionController,
  ARTISTIC_DETAIL_BUDGETS,
  CoordinateSystem,
  DEFAULT_STYLE_PROFILES,
  GranularityProfileId,
  PHASE1_DEFAULT_ASSETS,
  PPAEEngine,
  PixelBuffer,
  resolveDetailBudgetForProfile,
  validateArtStyleProfile
} from '../src/index';

describe('PPAE 2.0 Phase 7A — multiresolution art architecture', () => {
  const levels: readonly Exclude<GranularityProfileId, 'hybrid-24' | 'adaptive-auto'>[] = [
    'micro-4x4', 'micro-6x6', 'classic-8x8',
    'standard-16x16', 'detailed-32x32'
  ];

  it('validates five canonical resolutions and preserves three legacy configurations', () => {
    for (const id of Object.keys(DEFAULT_STYLE_PROFILES) as GranularityProfileId[]) {
      const profile = DEFAULT_STYLE_PROFILES[id];
      expect(() => validateArtStyleProfile(profile)).not.toThrow();
      expect(profile.canonicalTileTexels % profile.moduleSize).toBe(0);
      expect(resolveDetailBudgetForProfile(profile).moduleSize).toBe(profile.moduleSize);
    }
    expect(DEFAULT_STYLE_PROFILES['micro-4x4'].canonicalTileTexels).toBe(24);
    expect(DEFAULT_STYLE_PROFILES['micro-6x6'].canonicalTileTexels).toBe(24);
    expect(DEFAULT_STYLE_PROFILES['hybrid-24'].canonicalTileTexels).toBe(48);
    expect(DEFAULT_STYLE_PROFILES['hybrid-24'].moduleSize).toBe(4);
    for (const id of levels) {
      const profile = DEFAULT_STYLE_PROFILES[id];
      expect(profile.detailBudget).toBeDefined();
      expect(profile.detailBudget?.moduleSize).toBe(profile.moduleSize);
    }
  });

  it('increases artistic complexity monotonically from 4x4 through 32x32', () => {
    const budgets = levels.map(id => ARTISTIC_DETAIL_BUDGETS[id]);
    for (let i = 1; i < budgets.length; i++) {
      expect(budgets[i].maxColorsPerSprite).toBeGreaterThan(budgets[i - 1].maxColorsPerSprite);
      expect(budgets[i].foliageSubdivisionLevel).toBeGreaterThanOrEqual(
        budgets[i - 1].foliageSubdivisionLevel
      );
      expect(budgets[i].barkAndFacetMicroDetailLevel).toBeGreaterThanOrEqual(
        budgets[i - 1].barkAndFacetMicroDetailLevel
      );
    }
  });

  it('separates nine dimensions without changing logical world footprints', () => {
    const specs = levels.map(id => {
      const cs = new CoordinateSystem(DEFAULT_STYLE_PROFILES[id]);
      const spec = cs.resolveNineDimensionSpec(6, 8, 1, 1, 2, 1);
      expect(cs.computeModuleScaleRatio()).toBe(DEFAULT_STYLE_PROFILES[id].moduleSize / 4);
      expect(cs.computeStyleScaleFactor()).toBe(cs.computeModuleScaleRatio());
      return spec;
    });
    for (const spec of specs) {
      expect(spec.logicalWorldUnits).toEqual({
        tileUnits: 16, widthLogical: 16, heightLogical: 16
      });
      expect(spec.textureSamplingPolicy).toBe('nearest-neighbor');
      expect(spec.pixelSnappingPolicy).toBe('integer-grid');
      expect(spec.runtimeSpriteDimensions.paddedWidthTexels).toBe(
        spec.nativeSpriteTexels.innerWidthTexels +
        2 * spec.runtimeSpriteDimensions.extrudePaddingPx
      );
    }
    expect(specs[0].nativeSpriteTexels).toEqual({
      innerWidthTexels: 24, innerHeightTexels: 32
    });
    expect(specs[3].nativeSpriteTexels).toEqual({
      innerWidthTexels: 96, innerHeightTexels: 128
    });
    expect(specs[4].nativeSpriteTexels).toEqual({
      innerWidthTexels: 192, innerHeightTexels: 256
    });
    const ratio6 = specs[1].nativeSpriteTexels.innerWidthTexels / specs[1].canonicalTileResolution;
    const ratio16 = specs[3].nativeSpriteTexels.innerWidthTexels / specs[3].canonicalTileResolution;
    const ratio32 = specs[4].nativeSpriteTexels.innerWidthTexels / specs[4].canonicalTileResolution;
    expect(ratio6).toBeCloseTo(ratio16);
    expect(ratio16).toBeCloseTo(ratio32);
  });

  it('selects profiles using camera zoom, performance, importance, distance, and hysteresis', () => {
    const select = new AdaptiveResolutionController();
    const common = {
      category: 'tree' as const,
      cameraZoom: 2,
      viewportHeightPx: 1080,
      screenPixelRatio: 1,
      distanceFromCameraTiles: 2,
      visualImportance: 'standard' as const,
      targetFrameBudgetMs: 16.6
    };
    const hero = select.selectOptimalProfile({
      ...common, category: 'character', cameraZoom: 4,
      screenPixelRatio: 2, visualImportance: 'hero_focal', currentFrameTimeMs: 6.5
    });
    expect(['standard-16x16', 'detailed-32x32']).toContain(hero.id);
    const far = select.selectOptimalProfile({
      ...common, cameraZoom: 1, viewportHeightPx: 720,
      distanceFromCameraTiles: 32,
      visualImportance: 'background', currentFrameTimeMs: 14
    });
    expect(['micro-4x4','micro-6x6']).toContain(far.id);
    const normal = select.selectOptimalProfile({...common, currentFrameTimeMs: 8});
    const slow = select.selectOptimalProfile({...common, currentFrameTimeMs: 35});
    expect(slow.moduleSize).toBeLessThanOrEqual(normal.moduleSize);
    const previous = select.selectOptimalProfile({
      ...common, category: 'character', cameraZoom: 6, screenPixelRatio: 2,
      visualImportance: 'hero_focal', previousProfileId: 'micro-4x4'
    });
    expect(previous.id).toBe('micro-6x6');
    expect(select.selectOptimalProfile({...common}).id).toBe(
      select.selectOptimalProfile({...common}).id
    );
  });

  it('rejects unsupported module/grid dimensions and inconsistent attached detail budgets', () => {
    const profile = DEFAULT_STYLE_PROFILES['standard-16x16'];
    expect(() => validateArtStyleProfile({
      ...profile, moduleSize: 7 as typeof profile.moduleSize
    })).toThrow();
    expect(() => validateArtStyleProfile({
      ...profile, canonicalTileTexels: 24
    })).toThrow();
    expect(() => validateArtStyleProfile({
      ...profile, detailBudget: ARTISTIC_DETAIL_BUDGETS['micro-4x4']
    })).toThrow();
    expect(() => new CoordinateSystem(profile).resolveNineDimensionSpec(0, 4)).toThrow();
  });

  it('stamps high-resolution module patterns deterministically without changing legacy 4x4 layout', () => {
    const blank = {r: 0, g: 0, b: 0, a: 0};
    const base = {r: 100, g: 120, b: 80, a: 255};
    const lighter = {r: 155, g: 190, b: 105, a: 255};
    const legacy = new PixelBuffer(4, 4);
    legacy.stampModulePattern(0, 0, 4, [[1,0,0,0],[],[0,2]], {1:base,2:lighter});
    expect(legacy.getPixel(0, 0)).toEqual(base);
    expect(legacy.getPixel(1, 0)).toEqual(blank);
    expect(legacy.getPixel(1, 2)).toEqual(lighter);

    for (const moduleSize of [8,16,32] as const) {
      const a=new PixelBuffer(moduleSize,moduleSize);
      const b=new PixelBuffer(moduleSize,moduleSize);
      const pattern=[[0,1,1,0],[1,2,2,1],[1,2,2,1],[0,1,1,0]];
      for (const target of [a,b]) {
        target.stampModulePattern(0,0,moduleSize,pattern,
          {1:base,2:lighter,3:{r:220,g:230,b:140,a:255}});
      }
      expect(Array.from(a.data)).toEqual(Array.from(b.data));
      expect(a.getPixel(Math.floor(moduleSize/2),Math.floor(moduleSize/2)).a).toBe(255);
      expect(a.getPixel(0,0)).toEqual(blank);
      expect(a.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(2);
    }
  });

  it('generates deterministic legacy-compatible assets at all five native resolutions', () => {
    const engine = new PPAEEngine(64 * 1024 * 1024);
    const palette = engine.paletteManager.getPalette('meadow-summer');
    const definition = PHASE1_DEFAULT_ASSETS.oak_tree_mature;
    for (const id of levels) {
      const profile=DEFAULT_STYLE_PROFILES[id];
      const art=engine.generateAsset({
        worldSeed:'multires-seed-2026',
        assetDefinition:definition, styleProfile:profile, palette
      });
      expect(art.metadata.innerWidth).toBe(definition.widthInModules*profile.moduleSize);
      expect(art.metadata.innerHeight).toBe(definition.heightInModules*profile.moduleSize);
    }
  });
});
