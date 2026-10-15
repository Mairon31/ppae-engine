import { describe,expect,it } from 'vitest';
import {
  HydrologySdfTopologyEngine, SUPPORTED_ART_MODULE_SIZES,
  smoothUnionSdf, sampleContinuousNoise2D
} from '../src/index';
import { CoordinateResolutionAdapter } from '../src/core/coordinate-resolution-adapter';

describe('PPAE 3.0 Phase 2A — hydrology SDF topology',()=>{
  it('is deterministic for equal seeds and seed-variable across worlds',()=>{
    const a=new HydrologySdfTopologyEngine({seed:202604});
    const b=new HydrologySdfTopologyEngine({seed:202604});
    const c=new HydrologySdfTopologyEngine({seed:991122});
    const sample=a.sampleWorldHydrology(-5.25,1.75);
    expect(sample).toEqual(b.sampleWorldHydrology(-5.25,1.75));
    expect(sample.signedShoreDistanceTiles).not.toBeCloseTo(
      c.sampleWorldHydrology(-5.25,1.75).signedShoreDistanceTiles,4);
    expect(sampleContinuousNoise2D(11,-3.4,0.7)).toBe(sampleContinuousNoise2D(11,-3.4,0.7));
  });

  it('has curved variable-width channels with a flowing northern tributary',()=>{
    const h=new HydrologySdfTopologyEngine({seed:4242});
    const west=h.evaluatePrimaryRiverSpine(-14);
    const mid=h.evaluatePrimaryRiverSpine(-3.5);
    const east=h.evaluatePrimaryRiverSpine(15);
    expect(west.centerY).not.toBeCloseTo(mid.centerY,2);
    expect(mid.halfWidthTiles).not.toBeCloseTo(east.halfWidthTiles,2);
    const center=h.sampleWorldHydrology(-10,h.evaluatePrimaryRiverSpine(-10).centerY);
    expect(center.isWater).toBe(true);
    expect(center.normalizedDepth).toBeGreaterThan(0.25);
    expect(center.flowSpeed).toBeGreaterThan(0.2);
    expect(Math.hypot(center.flowDirX,center.flowDirY)).toBeCloseTo(1,5);
    const join=h.evaluatePrimaryRiverSpine(-2);
    const tributary=h.sampleWorldHydrology(-2,join.centerY+3.2);
    expect(tributary.isWater).toBe(true);
    expect(['river-main','river-tributary','river-confluence']).toContain(tributary.waterBody);
  });

  it('preserves a land island inside lake water even when main river overlaps',()=>{
    const h=new HydrologySdfTopologyEngine({
      seed:7788,lakeCenterWorldX:4,lakeCenterWorldY:0,lakeRadiusTiles:8,
      enableLakeIsland:true,oceanCoastlineWorldX:28
    });
    const island=h.sampleWorldHydrology(4.6,-0.4);
    expect(island.isNaturalIsland).toBe(true);
    expect(island.isWater).toBe(false);
    expect(island.signedShoreDistanceTiles).toBeGreaterThan(0);
    const lake=h.sampleWorldHydrology(4,4.5);
    expect(lake.isWater).toBe(true);
    expect(lake.waterBody).toBe('lake-basin');
    const ocean=h.sampleWorldHydrology(40,0);
    expect(ocean.waterBody).toBe('ocean-pelagic');
    expect(ocean.normalizedDepth).toBeGreaterThan(0.75);
  });

  it('orders foam, wet and dry sand, wetland, upland across the river bank',()=>{
    const h=new HydrologySdfTopologyEngine({seed:31415,lakeCenterWorldX:50});
    const x=-15,spine=h.evaluatePrimaryRiverSpine(x),seen:string[]=[];
    for(let dy=0;dy<=8;dy+=0.12){
      const zone=h.sampleWorldHydrology(x,spine.centerY+dy).zone;
      if(seen[seen.length-1]!==zone)seen.push(zone);
    }
    expect(seen[0]).toMatch(/water/);
    const ordered=['shore-foam','wet-sandbank','dry-sandbank','riparian-wetland','upland-ground'];
    for(const z of ordered)expect(seen).toContain(z);
    for(let i=1;i<ordered.length;i++)
      expect(seen.indexOf(ordered[i])).toBeGreaterThan(seen.indexOf(ordered[i-1]));
    expect(seen.at(-1)).toBe('upland-ground');
  });

  it('adds waterfall turbulence at an elevation drop',()=>{
    const h=new HydrologySdfTopologyEngine({seed:5500,cliffWaterfallWorldX:-8});
    const y=h.evaluatePrimaryRiverSpine(-8).centerY,s=h.sampleWorldHydrology(-8,y);
    expect(s.isWater).toBe(true);
    expect(s.isWaterfall).toBe(true);
    expect(s.zone).toBe('shore-foam');
    expect(s.foamIntensity).toBeGreaterThanOrEqual(0.85);
    expect(s.flowSpeed).toBeGreaterThan(0.7);
    const upstream=h.sampleWorldHydrology(-10,h.evaluatePrimaryRiverSpine(-10).centerY);
    const downstream=h.sampleWorldHydrology(-6,h.evaluatePrimaryRiverSpine(-6).centerY);
    expect(upstream.terrainElevation).toBeGreaterThan(downstream.terrainElevation);
  });

  it('keeps continuous water boundary fields across adjacent chunks in all profiles',()=>{
    const h=new HydrologySdfTopologyEngine({seed:100200});
    for(const profile of [...SUPPORTED_ART_MODULE_SIZES,'hybrid-24'] as const){
      const left=h.sampleChunkHydrologyTexelGrid(profile,0,0,2);
      const right=h.sampleChunkHydrologyTexelGrid(profile,1,0,2);
      const w=left.widthTexels;
      const step=1/new CoordinateResolutionAdapter(profile).spec.canonicalTileTexelSize;
      for(let y=0;y<w;y++){
        const a=left.samples[y*w+w-1],b=right.samples[y*w];
        expect(Math.abs(a.signedShoreDistanceTiles-b.signedShoreDistanceTiles))
          .toBeLessThan(3.5*step);
        expect(b.worldLogicalX-a.worldLogicalX).toBeCloseTo(step,12);
        expect(a.worldLogicalY).toBeCloseTo(b.worldLogicalY,12);
      }
    }
    expect(smoothUnionSdf(0.2,0.2,1)).toBeLessThan(0.2);
  },60000);

  it('uses absolute world coordinates independently of profile and negative chunk indexing',()=>{
    const h=new HydrologySdfTopologyEngine({seed:3311});
    const a=h.sampleChunkHydrologyTexelGrid(4,-1,0,1);
    const b=h.sampleChunkHydrologyTexelGrid(13,-1,0,1);
    const stepA=1/new CoordinateResolutionAdapter(4).spec.canonicalTileTexelSize;
    const stepB=1/new CoordinateResolutionAdapter(13).spec.canonicalTileTexelSize;
    expect(a.samples[0].worldLogicalX).toBeCloseTo(-1+stepA/2,12);
    expect(b.samples[0].worldLogicalX).toBeCloseTo(-1+stepB/2,12);
    expect(h.sampleWorldHydrology(-0.5,0.5)).toEqual(h.sampleWorldHydrology(-0.5,0.5));
  });

  it('validates seeds coordinates positive hydrology scales and chunk capacity',()=>{
    expect(()=>new HydrologySdfTopologyEngine({seed:2.5})).toThrow();
    expect(()=>new HydrologySdfTopologyEngine({seed:2,lakeRadiusTiles:0})).toThrow();
    const h=new HydrologySdfTopologyEngine({seed:42});
    expect(()=>h.sampleWorldHydrology(Infinity,0)).toThrow();
    expect(()=>h.sampleChunkHydrologyTexelGrid(36,0,0,100)).toThrow();
  });
});
