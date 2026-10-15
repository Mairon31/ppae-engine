import { describe,expect,it } from 'vitest';
import {
  CoordinateResolutionAdapter,euclideanFloorDiv,euclideanModulo,
  SUPPORTED_ART_MODULE_SIZES,SurfaceClusterRasterizer,
  auditPillowShadingAndBlobGeometry,drawPixelPerfectTaperedSegment,
  fillClusteredPolygon,tracePixelPerfectLine,drawPixelPerfectLine,
  getResolutionSpaceSpec,type MaterialColorRamp30,
  type SurfaceVolumePrimitive
} from '../src/index';
import { DEFAULT_STYLE_PROFILES } from '../src/core/coordinates';

const WOOD:MaterialColorRamp30={
  materialId:'wood',outlineColor:{r:24,g:14,b:8,a:255},
  tones:[
    {r:48,g:28,b:18,a:255},{r:76,g:46,b:28,a:255},
    {r:108,g:68,b:42,a:255},{r:140,g:92,b:58,a:255},
    {r:172,g:118,b:78,a:255},{r:202,g:146,b:100,a:255}
  ]
};

describe('PPAE 3.0 / Phase 1B.2 — coordinate and primitive integration',()=>{
  it('addresses signed chunks with exact integer seam adjacency for every profile',()=>{
    const all=[...SUPPORTED_ART_MODULE_SIZES,'hybrid-24','adaptive-auto'] as const;
    for(const profile of all){
      const a=new CoordinateResolutionAdapter(profile,16);
      const report=a.verifyCrossChunkTexelContinuity(-2,3);
      expect(report.isSeamless).toBe(true);
      expect(report.horizontalTexelGap).toBe(0);
      expect(report.verticalTexelGap).toBe(0);
      expect(report.diagonalTexelGap).toBe(0);
      expect(report.horizontalSeamMaxDrift).toBeLessThan(1e-10);
      expect(report.verticalSeamMaxDrift).toBeLessThan(1e-10);
      expect(report.diagonalCornerMaxDrift).toBeLessThan(1e-10);
      const edge=a.resolveWorldTexelAddress(-1,-1);
      expect(edge.chunkX).toBe(-1);
      expect(edge.chunkY).toBe(-1);
      expect(edge.texelInChunkX).toBe(a.chunkSizeTexels-1);
      expect(edge.texelInChunkY).toBe(a.chunkSizeTexels-1);
      const right=a.resolveWorldTexelAddress(0,0);
      expect(right.chunkX).toBe(0);
      expect(right.texelInChunkX).toBe(0);
    }
  });

  it('preserves the actual legacy world units and 24x24 native distinction',()=>{
    const hybrid=new CoordinateResolutionAdapter('hybrid-24');
    const native=new CoordinateResolutionAdapter('native-24x24');
    expect([hybrid.spec.artModuleSize,hybrid.spec.canonicalTileTexelSize]).toEqual([4,48]);
    expect([native.spec.artModuleSize,native.spec.canonicalTileTexelSize]).toEqual([24,96]);
    expect(hybrid.moduleStepTexels).toBe(4);
    expect(hybrid.snapTexelToArtModuleGrid(7)).toBe(4);
    expect(hybrid.snapTexelToArtModuleGrid(8)).toBe(8);
    expect(native.moduleStepTexels).toBe(1);
    expect(native.snapTexelToArtModuleGrid(7)).toBe(7);
    expect(native.resolveWorldTexelAddress(0,0).artModuleIndexX).toBe(0);
    expect(native.resolveWorldTexelAddress(24,0).artModuleIndexX).toBe(1);
    expect(native.resolveLogicalWorldPoint(16,0).worldTexelX).toBe(96);
    expect(native.resolveWorldTexelAddress(95,0).logicalWorldX).toBeCloseTo(95.5*16/96,12);
    expect(getResolutionSpaceSpec('native-24x24').logicalTileWorldSize).toBe(16);
    expect(DEFAULT_STYLE_PROFILES['hybrid-24'].canonicalTileTexels).toBe(48);
  });

  it('computes atlas padding and pivots with real canonical tile sizes',()=>{
    const thirteen=new CoordinateResolutionAdapter('native-13x13');
    const s13=thirteen.computeAtlasSlotMetrics(0.25,0.25,2,0.5,0.5);
    expect([s13.spriteWidthTexels,s13.spriteHeightTexels]).toEqual([13,13]);
    expect([s13.slotStrideWidthTexels,s13.pivotInSlotX,s13.pivotInSlotY]).toEqual([17,8,8]);
    const thirtyFour=new CoordinateResolutionAdapter('native-34x34');
    const s34=thirtyFour.computeAtlasSlotMetrics(0.25,0.5,1,0.5,1);
    expect([s34.spriteWidthTexels,s34.spriteHeightTexels]).toEqual([34,68]);
    expect([s34.slotStrideWidthTexels,s34.slotStrideHeightTexels]).toEqual([36,70]);
    const thirtySix=new CoordinateResolutionAdapter('native-36x36');
    const s36=thirtySix.computeAtlasSlotMetrics(0.25,0.25,2,0.5,0.5);
    expect([s36.spriteWidthTexels,s36.spriteHeightTexels]).toEqual([36,36]);
    expect(s36.pivotInSlotX).toBe(20); // (36 - 1)/2 = 17.5 => 18, plus 2 texels of padding
    expect(s36.innerMarginTexels).toBe(2);
  });

  it('handles euclidean division and modulo for negative integers and rejects invalids',()=>{
    expect(euclideanFloorDiv(-1,48)).toBe(-1);
    expect(euclideanModulo(-1,48)).toBe(47);
    expect(euclideanFloorDiv(-48,48)).toBe(-1);
    expect(euclideanModulo(-48,48)).toBe(0);
    expect(()=>euclideanFloorDiv(0,0)).toThrow();
    expect(()=>euclideanModulo(0,-3)).toThrow();
    expect(()=>new CoordinateResolutionAdapter(13,0)).toThrow();
    expect(()=>new CoordinateResolutionAdapter(13).resolveWorldTexelAddress(1.2,0)).toThrow();
    expect(()=>new CoordinateResolutionAdapter(13).resolveLogicalWorldPoint(Infinity,0)).toThrow();
    expect(()=>new CoordinateResolutionAdapter(13).computeAtlasSlotMetrics(1,1,1,-0.4)).toThrow();
  });

  it('keeps eight-connected diagonal traces and removes redundant L elbows',()=>{
    const raw=tracePixelPerfectLine(0,0,10,7,false);
    const clean=tracePixelPerfectLine(0,0,10,7,true);
    expect(clean[0]).toEqual({x:0,y:0});
    expect(clean[clean.length-1]).toEqual({x:10,y:7});
    expect(clean.length).toBeLessThanOrEqual(raw.length);
    for(let i=1;i<clean.length;i++){
      const dx=Math.abs(clean[i].x-clean[i-1].x);
      const dy=Math.abs(clean[i].y-clean[i-1].y);
      expect(Math.max(dx,dy)).toBe(1);
    }
    const buf=new Uint8ClampedArray(12*12*4);
    expect(drawPixelPerfectLine(buf,12,12,0,0,10,7,WOOD.outlineColor)).toBeGreaterThan(9);
    expect([...buf].filter((_,i)=>i%4===3).every(a=>a===0||a===255)).toBe(true);
  });

  it('tapers from thick trunk to thin branch tip without alpha interpolation',()=>{
    const width=32,height=32,rgba=new Uint8ClampedArray(width*height*4);
    drawPixelPerfectTaperedSegment(rgba,width,height,'detailed-32x32',{
      x0:16,y0:28,x1:16,y1:4,
      radiusStartTexels:5,radiusEndTexels:1,ramp:WOOD,seed:99
    });
    const row=(y:number):number=>{
      let n=0;for(let x=0;x<width;x++)if(rgba[(y*width+x)*4+3])n++;
      return n;
    };
    expect(row(26)).toBeGreaterThan(row(16));
    expect(row(16)).toBeGreaterThan(row(5));
    expect(row(5)).toBeGreaterThanOrEqual(1);
    for(let i=3;i<rgba.length;i+=4)expect([0,255]).toContain(rgba[i]);
    const copy=new Uint8ClampedArray(width*height*4);
    drawPixelPerfectTaperedSegment(copy,width,height,'detailed-32x32',{
      x0:16,y0:28,x1:16,y1:4,
      radiusStartTexels:5,radiusEndTexels:1,ramp:WOOD,seed:99
    });
    expect(copy).toEqual(rgba);
  });

  it('fills concave polygons deterministically without semitransparent pixels',()=>{
    const verts=[{x:12,y:2},{x:21,y:11},{x:18,y:21},
      {x:6,y:21},{x:3,y:11}] as const;
    const a=new Uint8ClampedArray(24*24*4),b=new Uint8ClampedArray(24*24*4);
    for(const image of [a,b])
      fillClusteredPolygon(image,24,24,'native-24x24',verts,WOOD,{
        seed:42,drawOutline:true
      });
    expect(a).toEqual(b);
    expect([...a].filter((_,i)=>i%4===3&&a[i]===255).length).toBeGreaterThan(80);
    for(let i=3;i<a.length;i+=4)expect([0,255]).toContain(a[i]);
    expect(()=>fillClusteredPolygon(new Uint8ClampedArray(12),24,24,24,verts,WOOD)).toThrow();
  });

  it('flags radial pillow shading as a probable defect, not a conclusive diagnosis',()=>{
    const bad=new Uint8ClampedArray(24*24*4);
    for(let y=0;y<24;y++)for(let x=0;x<24;x++){
      const r=Math.hypot(x-11.5,y-11.5);
      if(r>9.5)continue;
      const value=Math.round((1-r/9.5)*200)+30,i=(y*24+x)*4;
      bad[i]=value;bad[i+1]=value;bad[i+2]=value;bad[i+3]=255;
    }
    const report=auditPillowShadingAndBlobGeometry(bad,24,24);
    expect(report.hasPillowShadingDefect).toBe(true);
    expect(report.concentricSymmetryRatio).toBeGreaterThan(0.86);
    expect(report.radialLuminanceCorrelation).toBeGreaterThan(0.65);
    expect(report.summary).toContain('Probable');
    const flat=new Uint8ClampedArray(24*24*4);flat.fill(255);
    const flatReport=auditPillowShadingAndBlobGeometry(flat,24,24);
    expect(flatReport.hasPillowShadingDefect).toBe(false);
  });

  it('does not misclassify a directionally lit SDF dome as radial pillow shading',()=>{
    const surface=new SurfaceClusterRasterizer();
    const p:readonly SurfaceVolumePrimitive[]=[{
      id:'sphere',kind:'ellipsoid',materialId:'wood',
      x0:0.5,y0:0.5,radius0:0.4,radius1:0.4,zBase:0.2
    }];
    const res=surface.renderSurface({
      profile:24,seed:1234,primitives:p,materials:{wood:WOOD},
      light:{dirX:-0.65,dirY:-0.65,dirZ:0.38}
    });
    const report=auditPillowShadingAndBlobGeometry(res.rgba,res.width,res.height);
    expect(report.hasPillowShadingDefect).toBe(false);
    expect(report.directionalAsymmetryScore).toBeGreaterThan(0.12);
  });

  it('preserves the actual public native API without duplicate barrel declarations',()=>{
    const adapter=new CoordinateResolutionAdapter('hybrid-24');
    expect(adapter.spec.integratedInLegacyGenerators).toBe(true);
    const newAdapter=new CoordinateResolutionAdapter('native-13x13');
    expect(newAdapter.spec.integratedInLegacyGenerators).toBe(false);
  });
});
