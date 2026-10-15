import {describe,expect,it} from 'vitest';
import {ShorelineAutotiler47Engine,SHORELINE_47_MASKS,HydrologySdfTopologyEngine} from '../src/index';
import {normalizeAutotileMask47} from '../src/terrain/autotiler';
describe('Phase 2B — per-texel shore geometry prerequisite',()=>{
 it('keeps all 47 canonical masks consistent',()=>{
  expect(SHORELINE_47_MASKS).toHaveLength(47);
  const t=new ShorelineAutotiler47Engine(new HydrologySdfTopologyEngine({seed:44}));
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++){
   const m=t.getTileMask47(x,y);
   expect(m).toBe(normalizeAutotileMask47(m));
   expect(SHORELINE_47_MASKS).toContain(m);
  }
 });
 it('samples world-space banks with 0/255 RGBA and no tile-boundary lookup errors',()=>{
  const t=new ShorelineAutotiler47Engine(new HydrologySdfTopologyEngine({seed:31415}));
  for(const size of [4,13,24,36,'hybrid-24'] as const){
   const a=t.renderShorelineChunk(size,-1,0,1);
   const b=t.renderShorelineChunk(size,0,0,1);
   const n=a.widthTexels;
   expect(a.tileMask47Buffer).toHaveLength(1);
   for(let y=0;y<n;y++){
    const v1=a.signedDistanceBuffer[y*n+n-1],v2=b.signedDistanceBuffer[y*n];
    expect(Math.abs(v1-v2)).toBeLessThan(0.35);
   }
   expect(a.rgba.every((v,i)=>i%4!==3||v===255)).toBe(true);
  }
 });
 it('guards oversized buffers and invalid tile indices',()=>{
  const t=new ShorelineAutotiler47Engine(new HydrologySdfTopologyEngine({seed:3}));
  expect(()=>t.renderShorelineChunk(36,0,0,10)).toThrow();
  expect(()=>t.getTileMask47(0.2,1)).toThrow();
 });
});
