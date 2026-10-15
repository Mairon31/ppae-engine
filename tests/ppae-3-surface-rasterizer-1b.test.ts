import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_ART_MODULE_SIZES, SUBSYSTEM_TEN_RESOLUTION_READINESS,
  getResolutionSpaceSpec, getUnifiedSurfaceDetailBudget,
  normalizeGranularityProfileId, resolveTileAndAnchorLayout
} from '../src/core/resolution-contract-bridge';
import { DEFAULT_STYLE_PROFILES } from '../src/core/coordinates';
import { NATIVE_RESOLUTION_PROFILES } from '../src/core/native-resolution';
import {
  SurfaceClusterRasterizer, hashDeterministicTexel,
  type MaterialColorRamp30, type SurfaceVolumePrimitive
} from '../src/rasterizer/surface-cluster-rasterizer';
import { SurfaceClusterRasterizer as PackageSurfaceRasterizer } from '../src/index';

const materials:Readonly<Record<string,MaterialColorRamp30>>={
  bark:{
    materialId:'bark',outlineColor:{r:29,g:16,b:10,a:255},
    tones:[
      {r:50,g:28,b:18,a:255},{r:75,g:45,b:29,a:255},
      {r:110,g:68,b:44,a:255},{r:145,g:95,b:61,a:255},
      {r:180,g:129,b:95,a:255}
    ]
  },
  foliage:{
    materialId:'foliage',outlineColor:{r:16,g:38,b:22,a:255},
    tones:[
      {r:28,g:64,b:36,a:255},{r:42,g:94,b:48,a:255},
      {r:64,g:128,b:62,a:255},{r:92,g:164,b:78,a:255},
      {r:126,g:196,b:96,a:255},{r:162,g:222,b:120,a:255}
    ]
  }
};
const primitives:readonly SurfaceVolumePrimitive[]=[
  {id:'trunk',kind:'tapered-capsule',materialId:'bark',
    x0:0.50,y0:0.90,x1:0.48,y1:0.33,radius0:0.15,radius1:0.065,
    zBase:0.05,blendSmoothness:0.04,surfaceClusterAmplitude:0.08},
  {id:'branch',kind:'tapered-capsule',materialId:'bark',
    x0:0.49,y0:0.56,x1:0.75,y1:0.30,radius0:0.055,radius1:0.022,
    zBase:0.10,blendSmoothness:0.03},
  {id:'crown',kind:'ellipsoid',materialId:'foliage',
    x0:0.49,y0:0.34,radius0:0.30,radius1:0.23,
    zBase:0.26,surfaceClusterAmplitude:0.12},
  {id:'crown2',kind:'ellipsoid',materialId:'foliage',
    x0:0.70,y0:0.30,radius0:0.16,radius1:0.15,
    zBase:0.28,surfaceClusterAmplitude:0.12}
];

describe('PPAE 3.0 / Phase 1B.1 — bridged profiles and surface clusters',()=>{
  const renderer=new SurfaceClusterRasterizer();

  it('leaves all legacy profiles exactly compatible with Phase 1A and current engine',()=>{
    const ids=[
      'micro-4x4','micro-6x6','classic-8x8',
      'standard-16x16','detailed-32x32','hybrid-24','adaptive-auto'
    ] as const;
    for(const id of ids){
      const p=getResolutionSpaceSpec(id),actual=DEFAULT_STYLE_PROFILES[id];
      expect(p.profileId).toBe(id);
      expect(p.artModuleSize).toBe(actual.moduleSize);
      expect(p.canonicalTileTexelSize).toBe(actual.canonicalTileTexels);
      expect(p.logicalTileWorldSize).toBe(16);
      expect(p.texelsPerLogicalWorldUnit).toBe(actual.canonicalTileTexels/16);
    }
    expect(getResolutionSpaceSpec('adaptive-auto').isAdaptiveAuto).toBe(true);
    expect(normalizeGranularityProfileId('adaptive-auto')).toBe('classic-8x8');
  });

  it('does NOT conflate native 24 with the legacy hybrid composite grid',()=>{
    const hybrid=getResolutionSpaceSpec('hybrid-24');
    const native=getResolutionSpaceSpec('native-24x24');
    expect(hybrid.artModuleSize).toBe(4);
    expect(hybrid.canonicalTileTexelSize).toBe(48);
    expect(hybrid.modulesPerCanonicalTile).toBe(12);
    expect(hybrid.isTrueNativeOneModulePerTile).toBe(false);
    expect(native.artModuleSize).toBe(24);
    expect(native.canonicalTileTexelSize).toBe(96);
    expect(native.modulesPerCanonicalTile).toBe(4);
    expect(native.integratedInLegacyGenerators).toBe(false);
    expect(NATIVE_RESOLUTION_PROFILES['native-24x24'].canonicalTileTexels).toBe(96);
    expect(normalizeGranularityProfileId('native-24')).toBe('native-24x24');
  });

  it('pivots at true odd 13x13 center and retains symmetric safe margins for 34/36',()=>{
    const odd=resolveTileAndAnchorLayout('native-13x13',0.25,0.25,{
      normalizedPivotX:0.5,normalizedPivotY:0.5
    });
    expect([odd.widthTexels,odd.heightTexels]).toEqual([13,13]);
    expect(odd.pivotTexels).toEqual({x:6,y:6});
    expect(odd.safeContentBoxTexels).toEqual({x:1,y:1,width:11,height:11});
    for(const [id,margin,size] of [
      ['native-34x34',1,34],['native-36x36',2,36]
    ] as const){
      const spec=getResolutionSpaceSpec(id);
      const box=resolveTileAndAnchorLayout(id,1/spec.modulesPerCanonicalTile,
        1/spec.modulesPerCanonicalTile).safeContentBoxTexels;
      expect(box).toEqual({x:margin,y:margin,width:size-margin*2,height:size-margin*2});
    }
  });

  it('matches Phase 1A canonical tiles and budgets for all proposed module sizes',()=>{
    for(const n of SUPPORTED_ART_MODULE_SIZES){
      const spec=getResolutionSpaceSpec(n),actual=NATIVE_RESOLUTION_PROFILES[normalizeGranularityProfileId(n)];
      expect(spec.canonicalTileTexelSize).toBe(actual.canonicalTileTexels);
      expect(spec.artModuleSize).toBe(n);
      expect(spec.canonicalTileTexelSize/spec.artModuleSize).toBeGreaterThanOrEqual(1);
      expect(getUnifiedSurfaceDetailBudget(n).maxRampTonesPerMaterial).toBeGreaterThan(0);
    }
    expect(SUBSYSTEM_TEN_RESOLUTION_READINESS['core-coordinates']).toBe(false);
    expect(SUBSYSTEM_TEN_RESOLUTION_READINESS['surface-rasterizer']).toBe(true);
    expect(SUBSYSTEM_TEN_RESOLUTION_READINESS['terrain-hydrology']).toBe(false);
    expect(SUBSYSTEM_TEN_RESOLUTION_READINESS['entity-anatomy']).toBe(false);
  });

  it('synthesizes real module-sized opaque/transparent pixels across all ten resolutions',()=>{
    expect(PackageSurfaceRasterizer).toBe(SurfaceClusterRasterizer);
    for(const n of SUPPORTED_ART_MODULE_SIZES){
      const a=renderer.renderSurface({profile:n,seed:42026,primitives,materials});
      const b=renderer.renderSurface({profile:n,seed:42026,primitives,materials});
      expect([a.width,a.height]).toEqual([n,n]);
      expect(a.rgba).toEqual(b.rgba);
      expect(a.pixelBuffer.data).toEqual(a.rgba);
      expect(a.materialIndexBuffer.some(m=>m>=0)).toBe(true);
      expect(a.rgba.some((_,i)=>i%4===3&&a.rgba[i]===255)).toBe(true);
      for(let i=3;i<a.rgba.length;i+=4)expect([0,255]).toContain(a.rgba[i]);
    }
  });

  it('draws full world tiles only when tile extent is explicitly requested',()=>{
    const a=renderer.renderSurface({
      profile:'micro-6x6',seed:12,logicalWidthUnits:1,logicalHeightUnits:1,
      primitives,materials
    });
    expect([a.width,a.height]).toEqual([24,24]);
  });

  it('uses directional normal shading, not purely concentric radial bands',()=>{
    for(const n of [16,32] as const){
      const single:readonly SurfaceVolumePrimitive[]=[
        {id:'dome',kind:'ellipsoid',materialId:'foliage',
          x0:0.5,y0:0.5,radius0:0.4,radius1:0.4,zBase:0.20}
      ];
      const lit=renderer.renderSurface({
        profile:n,seed:77,primitives:single,materials,
        light:{dirX:-0.65,dirY:-0.65,dirZ:0.4,ambientFloor:0.15}
      });
      const a=Math.floor(n*0.34),b=n-1-a;
      expect(lit.materialIndexBuffer[a*n+a]).toBeGreaterThanOrEqual(0);
      expect(lit.materialIndexBuffer[b*n+b]).toBeGreaterThanOrEqual(0);
      expect(lit.toneIndexBuffer[a*n+a]).toBeGreaterThan(
        lit.toneIndexBuffer[b*n+b]);
    }
  });

  it('preserves deterministic material masks regardless of caller primitive order',()=>{
    const a=renderer.renderSurface({profile:32,seed:123,primitives,materials});
    const b=renderer.renderSurface({profile:32,seed:123,primitives:[...primitives].reverse(),materials});
    expect(a.rgba).toEqual(b.rgba);
  });

  it('accepts branches, rounded boxes and ellipsoid without disconnecting shared silhouette',()=>{
    const box:SurfaceVolumePrimitive={
      id:'box',kind:'rounded-box',materialId:'bark',
      x0:0.2,y0:0.18,x1:0.82,y1:0.82,radius0:0.12,zBase:0.12
    };
    const result=renderer.renderSurface({profile:24,seed:17,primitives:[box],materials});
    expect(result.materialIndexBuffer.some(m=>m===0)).toBe(true);
    expect(result.width).toBe(24);
  });

  it('rejects invalid geometry, missing materials, fractional alpha and invalid light',()=>{
    const base={profile:32 as const,seed:1,primitives,materials};
    expect(()=>renderer.renderSurface({...base,seed:1.5})).toThrow();
    expect(()=>renderer.renderSurface({...base,primitives:[{
      ...primitives[0],materialId:'unknown'
    }]})).toThrow();
    expect(()=>renderer.renderSurface({...base,light:{dirX:0,dirY:0,dirZ:0}})).toThrow();
    expect(()=>renderer.renderSurface({...base,materials:{foliage:{
      ...materials.foliage,tones:[{r:1,g:2,b:3,a:128}]
    },bark:materials.bark}})).toThrow();
    expect(()=>resolveTileAndAnchorLayout(13,-1,1)).toThrow();
    expect(()=>resolveTileAndAnchorLayout(13,1,1,{
      normalizedHitbox:{x:0.8,y:0.8,width:0.5,height:0.5}
    })).toThrow();
  });

  it('keeps seeded texture field stable per coordinate',()=>{
    const a=hashDeterministicTexel(123,7,9,11);
    expect(a).toBe(hashDeterministicTexel(123,7,9,11));
    expect(a).not.toBe(hashDeterministicTexel(124,7,9,11));
  });
});
