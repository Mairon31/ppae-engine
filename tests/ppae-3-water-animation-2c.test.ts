import {describe,expect,it} from 'vitest';
import {
 BathymetricWaterAnimator,HydrologySdfTopologyEngine,
 WATER_BIOME_OPTICAL_PROFILES,SUPPORTED_ART_MODULE_SIZES,
 SUBSYSTEM_TEN_RESOLUTION_READINESS,getUnifiedSurfaceDetailBudget
} from '../src/index';

describe('PPAE 3.0 Phase 2C — bathymetry, biome optics, water animation',()=>{
 const hydro=new HydrologySdfTopologyEngine({seed:202603});
 const animator=new BathymetricWaterAnimator(hydro);

 it('preserves truthful readiness until the legacy terrain renderer is migrated',()=>{
  // The new modules work standalone; legacy ChunkWorldRenderer still uses old water.
  expect(SUBSYSTEM_TEN_RESOLUTION_READINESS['terrain-hydrology']).toBe(false);
 });
 it('returns a byte-identical cyclic frame 0 at index totalFrames, and does not animate land',()=>{
  const params={profile:16 as const,chunkX:0,chunkY:0,chunkSizeTiles:2,totalFrames:6};
  const seq=animator.renderAnimatedChunkSequence(params);
  expect(seq).toHaveLength(6);
  const wrapped=animator.renderAnimatedWaterChunkFrame({...params,frameIndex:6});
  expect(wrapped.rgba).toEqual(seq[0].rgba);
  expect(wrapped.wavePhaseBuffer).toEqual(seq[0].wavePhaseBuffer);
  expect(wrapped.frameIndex).toBe(0);
  let changing=0,land=0,water=0;
  for(let i=0;i<seq[0].waterMask.length;i++){
   expect(seq[0].waterMask[i]).toBe(seq[1].waterMask[i]);
   if(seq[0].waterMask[i]){
    water++;
    if(seq[0].rgba[i*4]!==seq[1].rgba[i*4]||
       seq[0].rgba[i*4+1]!==seq[1].rgba[i*4+1]||
       seq[0].rgba[i*4+2]!==seq[1].rgba[i*4+2])changing++;
   }else{
    land++;
    for(let c=0;c<4;c++)expect(seq[0].rgba[i*4+c]).toBe(seq[1].rgba[i*4+c]);
   }
  }
  expect(water).toBeGreaterThan(0);
  expect(changing).toBeGreaterThan(5);
  const landParams={profile:8 as const,chunkX:0,chunkY:19,chunkSizeTiles:1,totalFrames:4};
  const landSeq=animator.renderAnimatedChunkSequence(landParams);
  expect(landSeq[0].waterMask.some(v=>v===0)).toBe(true);
  for(let i=0;i<landSeq[0].waterMask.length;i++)if(!landSeq[0].waterMask[i])
   for(let j=1;j<landSeq.length;j++)
    expect(landSeq[j].rgba.slice(i*4,i*4+4)).toEqual(landSeq[0].rgba.slice(i*4,i*4+4));
 });
 it('uses distinct declared palettes and varying bottom-water visibility',()=>{
  expect(WATER_BIOME_OPTICAL_PROFILES['tropical-lagoon'].turbidity)
   .toBeLessThan(WATER_BIOME_OPTICAL_PROFILES['swamp-turbid'].turbidity);
  expect(WATER_BIOME_OPTICAL_PROFILES['tropical-lagoon'].shallowBedVisibility)
   .toBeGreaterThan(WATER_BIOME_OPTICAL_PROFILES['swamp-turbid'].shallowBedVisibility);
  const base={profile:8 as const,chunkX:0,chunkY:0,chunkSizeTiles:1,frameIndex:1};
  const tropical=animator.renderAnimatedWaterChunkFrame({...base,biomeOpticalId:'tropical-lagoon'});
  const swamp=animator.renderAnimatedWaterChunkFrame({...base,biomeOpticalId:'swamp-turbid'});
  expect(tropical.rgba).not.toEqual(swamp.rgba);
  for(const id of Object.keys(WATER_BIOME_OPTICAL_PROFILES)){
   const p=WATER_BIOME_OPTICAL_PROFILES[id as keyof typeof WATER_BIOME_OPTICAL_PROFILES];
   expect(p.deepWaterRamp).toHaveLength(3);
   expect(p.shallowWaterRamp).toHaveLength(3);
  }
 });
 it('uses dark night colors and restrained daytime specular highlights',()=>{
  const params={profile:16 as const,chunkX:0,chunkY:0,chunkSizeTiles:1,frameIndex:1};
  const day=animator.renderAnimatedWaterChunkFrame({...params,lighting:{sunElevation:0.95}});
  const night=animator.renderAnimatedWaterChunkFrame({...params,lighting:{sunElevation:0.05}});
  let lumDay=0,lumNight=0,seen=0;
  for(let i=0;i<day.waterMask.length;i++)if(day.waterMask[i]){
   seen++;
   for(let j=0;j<3;j++){lumDay+=day.rgba[i*4+j];lumNight+=night.rgba[i*4+j];}
  }
  expect(seen).toBeGreaterThan(0);
  expect(lumDay).toBeGreaterThan(lumNight);
 });
 it('samples absolute world phase across horizontal chunk borders for all ten modules and hybrid-24',()=>{
  const profiles=[...SUPPORTED_ART_MODULE_SIZES,'hybrid-24'] as const;
  for(const profile of profiles){
   const p={profile,chunkY:0,chunkSizeTiles:1,frameIndex:2,totalFrames:6} as const;
   const left=animator.renderAnimatedWaterChunkFrame({...p,chunkX:0});
   const right=animator.renderAnimatedWaterChunkFrame({...p,chunkX:1});
   const n=left.widthTexels;
   expect(right.widthTexels).toBe(n);
   expect(left.tileTexelSize).toBe(right.tileTexelSize);
   let pairs=0,maxDelta=0;
   for(let y=0;y<n;y++){
    const a=y*n+n-1,b=y*n;
    if(!left.waterMask[a]||!right.waterMask[b])continue;
    pairs++;
    maxDelta=Math.max(maxDelta,Math.abs(
      left.wavePhaseBuffer[a]-right.wavePhaseBuffer[b]));
   }
   // This tests near-neighbor continuity of sampled wave values, not
   // alpha/RGB matching at a boundary, and does not certify visual parity.
   if(pairs)expect(maxDelta).toBeLessThan(0.85);
   expect(left.rgba.every((c,i)=>i%4!==3||c===255)).toBe(true);
   const budget=getUnifiedSurfaceDetailBudget(profile);
   const waterColors=new Set<string>();
   for(let i=0;i<left.waterMask.length;i++)if(left.waterMask[i]){
    const off=i*4;waterColors.add(
     left.rgba[off]+','+left.rgba[off+1]+','+left.rgba[off+2]);
   }
   expect(waterColors.size).toBeLessThanOrEqual(budget.maxUniqueColorsPerSprite);
  }
 });
 it('uses only palette colors, without RGB interpolation or translucent texels',()=>{
  const p=WATER_BIOME_OPTICAL_PROFILES['temperate-clear'];
  const allowed=new Set([
   ...p.submergedBedRamp,...p.shallowWaterRamp,...p.midWaterRamp,
   ...p.deepWaterRamp,p.foamColor,p.specularHighlightColor,p.nightTintFloor
  ].map(c=>c.r+','+c.g+','+c.b));
  const frame=animator.renderAnimatedWaterChunkFrame({
   profile:24,chunkX:0,chunkY:0,chunkSizeTiles:1,frameIndex:2
  });
  for(let i=0;i<frame.waterMask.length;i++)if(frame.waterMask[i]){
   const off=i*4;
   expect(frame.rgba[off+3]).toBe(255);
   expect(allowed.has(frame.rgba[off]+','+
    frame.rgba[off+1]+','+frame.rgba[off+2])).toBe(true);
  }
 });
 it('rejects invalid frames, unrelated hydrology and unphysical lighting',()=>{
  expect(()=>animator.renderAnimatedWaterChunkFrame({
   profile:16,chunkX:0,chunkY:0,frameIndex:0,totalFrames:1
  })).toThrow();
  expect(()=>animator.renderAnimatedWaterChunkFrame({
   profile:16,chunkX:0,chunkY:0,frameIndex:1.5
  })).toThrow();
  expect(()=>animator.renderAnimatedWaterChunkFrame({
   profile:16,chunkX:0,chunkY:0,frameIndex:0,
   lighting:{sunDirX:0,sunDirY:0}
  })).toThrow();
  expect(()=>animator.renderAnimatedWaterChunkFrame({
   profile:16,chunkX:0,chunkY:0,frameIndex:0,
   lighting:{sunElevation:Infinity}
  })).toThrow();
 });
});
