/**
 * PPAE Engine 3.0 — Phase 2C: deterministic bathymetric water optics and animation.
 *
 * This component is standalone: it uses Phase 2A continuous topology and
 * Phase 2B per-texel shore masks. It is not automatically installed in
 * legacy LiquidTileGenerator / ChunkWorldRenderer. A request to set global
 * terrain-hydrology readiness=true is deferred until those consumers and
 * visual QA are migrated, so no product readiness is falsely reported.
 */
import type { RGBAColor } from '../core/contracts';
import {
 type AnyGranularityProfileInput,type UnifiedGranularityProfileId,
 getUnifiedSurfaceDetailBudget
} from '../core/resolution-contract-bridge';
import { CoordinateResolutionAdapter } from '../core/coordinate-resolution-adapter';
import {hashDeterministicTexel} from '../rasterizer/surface-cluster-rasterizer';
import {HydrologySdfTopologyEngine} from './hydrology-sdf-topology';
import {ShorelineAutotiler47Engine} from './shoreline-autotiler-47';

export type WaterBiomeOpticalProfileId =
 'temperate-clear'|'swamp-turbid'|'tropical-lagoon'|
 'glacial-arctic'|'volcanic-thermal'|'corrupted-abyss';
export interface WaterBiomeOpticalProfile {
 readonly id:WaterBiomeOpticalProfileId;
 readonly turbidity:number;
 readonly shallowBedVisibility:number;
 readonly specularResponsiveness:number;
 readonly submergedBedRamp:readonly RGBAColor[];
 readonly shallowWaterRamp:readonly RGBAColor[];
 readonly midWaterRamp:readonly RGBAColor[];
 readonly deepWaterRamp:readonly RGBAColor[];
 readonly foamColor:RGBAColor;
 readonly specularHighlightColor:RGBAColor;
 readonly nightTintFloor:RGBAColor;
}
export interface WaterLightingContext {
 readonly sunDirX:number;readonly sunDirY:number;
 readonly sunElevation:number;readonly ambientIntensity:number;
}
export interface AnimatedWaterChunkFrame {
 readonly profileId:UnifiedGranularityProfileId;
 readonly biomeOpticalId:WaterBiomeOpticalProfileId;
 readonly chunkX:number;readonly chunkY:number;readonly chunkSizeTiles:number;
 readonly tileTexelSize:number;readonly widthTexels:number;readonly heightTexels:number;
 readonly frameIndex:number;readonly totalFrames:number;
 readonly rgba:Uint8ClampedArray;
 readonly waterMask:Uint8Array;
 readonly wavePhaseBuffer:Float32Array;
}
const color=(r:number,g:number,b:number):RGBAColor=>Object.freeze({r,g,b,a:255});
type Triplet=readonly [number,number,number];
type ProfileColors={
  readonly bed:readonly Triplet[];readonly shallow:readonly Triplet[];
  readonly mid:readonly Triplet[];readonly deep:readonly Triplet[];
  readonly foam:Triplet;readonly specular:Triplet;readonly night:Triplet;
};
function build(
  id:WaterBiomeOpticalProfileId,turbidity:number,visibility:number,
  specular:number,colors:ProfileColors
):WaterBiomeOpticalProfile {
 const ramp=(s:readonly Triplet[])=>Object.freeze(s.map(c=>color(...c)));
 return Object.freeze({
   id,turbidity,shallowBedVisibility:visibility,specularResponsiveness:specular,
   submergedBedRamp:ramp(colors.bed),shallowWaterRamp:ramp(colors.shallow),
   midWaterRamp:ramp(colors.mid),deepWaterRamp:ramp(colors.deep),
   foamColor:color(...colors.foam),specularHighlightColor:color(...colors.specular),
   nightTintFloor:color(...colors.night)
 });
}
export const WATER_BIOME_OPTICAL_PROFILES:
  Readonly<Record<WaterBiomeOpticalProfileId,WaterBiomeOpticalProfile>>=Object.freeze({
 'temperate-clear':build('temperate-clear',0.18,0.72,0.85,{
  bed:[[122,146,132],[138,162,144]],
  shallow:[[54,148,204],[68,166,214],[86,182,222]],
  mid:[[28,96,168],[34,112,184],[42,126,198]],
  deep:[[16,48,108],[20,60,126],[26,74,144]],
  foam:[222,244,252],specular:[244,252,255],night:[12,28,64]
 }),
 'swamp-turbid':build('swamp-turbid',0.88,0.12,0.35,{
  bed:[[74,82,52],[86,94,60]],
  shallow:[[62,98,64],[74,112,72],[88,124,80]],
  mid:[[44,76,54],[52,86,60],[60,96,66]],
  deep:[[26,48,38],[32,58,44],[38,68,50]],
  foam:[168,186,148],specular:[196,212,174],night:[16,28,22]
 }),
 'tropical-lagoon':build('tropical-lagoon',0.08,0.86,0.95,{
  bed:[[146,198,176],[168,214,192]],
  shallow:[[48,188,204],[64,206,218],[88,222,230]],
  mid:[[24,136,178],[32,154,192],[42,172,206]],
  deep:[[14,74,132],[18,92,148],[24,110,164]],
  foam:[232,250,255],specular:[250,255,255],night:[10,38,72]
 }),
 'glacial-arctic':build('glacial-arctic',0.22,0.55,0.9,{
  bed:[[132,164,188],[152,184,206]],
  shallow:[[92,168,216],[112,186,228],[134,204,238]],
  mid:[[48,114,176],[62,132,192],[76,150,206]],
  deep:[[22,58,112],[28,72,128],[36,88,146]],
  foam:[236,248,255],specular:[252,255,255],night:[14,32,68]
 }),
 'volcanic-thermal':build('volcanic-thermal',0.78,0.20,0.65,{
  bed:[[92,58,48],[112,72,56]],
  shallow:[[68,128,136],[84,148,152],[102,168,168]],
  mid:[[42,88,104],[52,104,118],[64,118,132]],
  deep:[[26,48,64],[32,60,78],[40,74,92]],
  foam:[212,228,224],specular:[242,248,236],night:[18,30,42]
 }),
 'corrupted-abyss':build('corrupted-abyss',0.82,0.16,0.55,{
  bed:[[78,52,96],[94,64,114]],
  shallow:[[96,64,142],[114,78,162],[132,94,182]],
  mid:[[64,40,108],[76,50,124],[88,60,138]],
  deep:[[36,20,68],[46,26,82],[56,34,96]],
  foam:[196,164,228],specular:[224,198,248],night:[22,12,44]
 })
});
const DEFAULT_LIGHT:WaterLightingContext={
 sunDirX:-0.55,sunDirY:-0.62,sunElevation:0.78,ambientIntensity:0.85
};
const clamp=(v:number,min:number,max:number):number=>Math.min(max,Math.max(min,v));
function sampleRamp(ramp:readonly RGBAColor[],lum:number,budget:number):RGBAColor {
 const steps=Math.min(ramp.length,budget);
 const index=Math.min(steps-1,Math.floor(clamp(lum,0,0.999)*steps));
 return ramp[steps<=1?0:Math.round(index*(ramp.length-1)/(steps-1))];
}
function checkNumeric(n:number,label:string):void {
 if(!Number.isFinite(n))throw new RangeError(label+' must be finite');
}
export class BathymetricWaterAnimator {
 readonly hydrology:HydrologySdfTopologyEngine;
 readonly shorelineAutotiler:ShorelineAutotiler47Engine;
 constructor(hydrology:HydrologySdfTopologyEngine,shoreline?:ShorelineAutotiler47Engine){
  if(shoreline&&shoreline.hydrology!==hydrology)
    throw new RangeError('Shoreline engine and animator must use the same hydrology');
  this.hydrology=hydrology;
  this.shorelineAutotiler=shoreline??new ShorelineAutotiler47Engine(hydrology);
 }
 public renderAnimatedWaterChunkFrame(params:{
  readonly profile:AnyGranularityProfileInput;
  readonly chunkX:number;readonly chunkY:number;readonly chunkSizeTiles?:number;
  readonly frameIndex:number;readonly totalFrames?:number;
  readonly biomeOpticalId?:WaterBiomeOpticalProfileId;
  readonly lighting?:Partial<WaterLightingContext>;
 }):AnimatedWaterChunkFrame {
  const count=params.totalFrames??6;
  if(!Number.isSafeInteger(count)||count<2||count>120)
    throw new RangeError('totalFrames must be an integer in [2,120]');
  if(!Number.isSafeInteger(params.frameIndex))
    throw new RangeError('frameIndex must be an integer');
  const frameIndex=((params.frameIndex%count)+count)%count;
  const profileId=params.biomeOpticalId??'temperate-clear';
  const optical=WATER_BIOME_OPTICAL_PROFILES[profileId];
  if(!optical)throw new RangeError('Unknown optical water biome: '+profileId);
  const light={...DEFAULT_LIGHT,...params.lighting};
  for(const [key,n] of Object.entries(light))checkNumeric(n,'light.'+key);
  if(light.sunElevation<0||light.sunElevation>1||
     light.ambientIntensity<0||light.ambientIntensity>1)
    throw new RangeError('Light elevation/intensity outside [0,1]');
  const sunMagnitude=Math.hypot(light.sunDirX,light.sunDirY);
  if(sunMagnitude<1e-6)throw new RangeError('Sun direction must be nonzero');
  const sunX=light.sunDirX/sunMagnitude,sunY=light.sunDirY/sunMagnitude;
  const budget=getUnifiedSurfaceDetailBudget(params.profile);
  const base=this.shorelineAutotiler.renderShorelineChunk(
    params.profile,params.chunkX,params.chunkY,params.chunkSizeTiles??8);
  const adapter=new CoordinateResolutionAdapter(params.profile,base.chunkSizeTiles);
  const width=base.widthTexels,height=base.heightTexels,phase=2*Math.PI*frameIndex/count;
  const rgba=new Uint8ClampedArray(base.rgba);
  const waterMask=new Uint8Array(width*height),wavePhaseBuffer=new Float32Array(width*height);
  const tile=adapter.spec.canonicalTileTexelSize,seed=this.hydrology.config.seed;
  const startX=params.chunkX*width,startY=params.chunkY*height;
  // At very low resolution, one fixed tone per depth band avoids excessive
  // palettes and false gradients. Water glints/foam/bed/night remain discrete.
  const maxTones=budget.maxRampTonesPerMaterial;
  const lowDetail=budget.maxUniqueColorsPerSprite<=10;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=y*width+x;
   if(base.stratumBuffer[i]!==0)continue;
   waterMask[i]=1;
   const tx=startX+x,ty=startY+y;
   // Raster coordinates are globally fixed; never reset phase at chunk edges.
   const worldX=(tx+0.5)/tile,worldY=(ty+0.5)/tile;
   const hydro=this.hydrology.sampleWorldHydrology(worldX,worldY);
   const cell=Math.max(1,Math.round(tile/24));
   const grain=hashDeterministicTexel(seed,Math.floor(tx/cell),Math.floor(ty/cell),73);
   const along=worldX*hydro.flowDirX+worldY*hydro.flowDirY;
   const cross=-worldX*hydro.flowDirY+worldY*hydro.flowDirX;
   // Space-time periodicity: no tile-local origin. The sine uses global
   // coordinates and wrapped frame phase, so frame 0 == frame N exactly.
   const frequency=hydro.isWaterfall?5.2:2.6+1.4*hydro.flowSpeed;
   const angle=along*frequency-phase+Math.sin(cross*1.8)*0.65;
   const crest=Math.sin(angle);
   const shoreLap=Math.cos(hydro.signedShoreDistanceTiles*7.5+phase+grain*0.35);
   wavePhaseBuffer[i]=crest;
   const shoreDepth=-hydro.signedShoreDistanceTiles;
   const animatedFoam=hydro.foamIntensity>0.15&&shoreDepth<0.50&&
     shoreLap>0.25-hydro.foamIntensity*0.55;
   const waterfallFoam=hydro.isWaterfall&&(crest>-0.20||grain>0.5);
   const rapidStreak=hydro.flowSpeed>0.46&&
     !hydro.isWaterfall&&crest>0.78&&shoreDepth>0.35;
   const sunMatch=-Math.cos(angle)*(hydro.flowDirX*sunX+hydro.flowDirY*sunY);
   const sparkle=light.sunElevation>0.25&&crest>0.69&&
     sunMatch>0.34&&grain>0.32&&optical.specularResponsiveness>0.3;
   const waveDelta=lowDetail?0:crest*0.022+(grain-0.5)*0.025;
   const depth=clamp(hydro.normalizedDepth+waveDelta,0,1);
   const visibility=optical.shallowBedVisibility*(1-optical.turbidity);
   let selected:RGBAColor;
   if(light.sunElevation<0.17){
     // Night remains within the declared palette; no interpolated RGB.
     if(depth>0.30)selected=optical.nightTintFloor;
     else selected=optical.shallowWaterRamp[0];
   }else if(waterfallFoam||animatedFoam){
     selected=optical.foamColor;
   }else if(sparkle){
     selected=optical.specularHighlightColor;
   }else if(depth<0.28&&grain<visibility){
     selected=sampleRamp(optical.submergedBedRamp,1-depth/0.28,
       lowDetail?1:maxTones);
   }else if(depth<0.38){
     selected=sampleRamp(optical.shallowWaterRamp,
       lowDetail?0.5:clamp(1-depth/0.38+crest*0.08,0,1),
       lowDetail?1:maxTones);
   }else if(depth<0.74){
     selected=sampleRamp(optical.midWaterRamp,
       lowDetail?0.5:clamp(1-(depth-0.38)/0.36+crest*0.07,0,1),
       lowDetail?1:maxTones);
   }else{
     selected=sampleRamp(optical.deepWaterRamp,
       lowDetail?0.5:clamp(1-(depth-0.74)/0.26+crest*0.05,0,1),
       lowDetail?1:maxTones);
   }
   // Current streaks use the SAME depth class. Never draw shallow cyan
   // through deep marine blue merely because a pixel is in a current.
   if(rapidStreak&&!waterfallFoam&&light.sunElevation>=0.17){
     if(depth<0.38)selected=optical.shallowWaterRamp[lowDetail?0:optical.shallowWaterRamp.length-1];
     else if(depth<0.74)selected=optical.midWaterRamp[lowDetail?0:optical.midWaterRamp.length-1];
     else selected=optical.deepWaterRamp[lowDetail?0:optical.deepWaterRamp.length-1];
   }
   const o=i*4;
   rgba[o]=selected.r;rgba[o+1]=selected.g;rgba[o+2]=selected.b;rgba[o+3]=255;
  }
  return {profileId:base.profileId,biomeOpticalId:profileId,
   chunkX:params.chunkX,chunkY:params.chunkY,chunkSizeTiles:base.chunkSizeTiles,
   tileTexelSize:tile,widthTexels:width,heightTexels:height,
   frameIndex,totalFrames:count,rgba,waterMask,wavePhaseBuffer};
 }
 public renderAnimatedChunkSequence(params:{
  readonly profile:AnyGranularityProfileInput;
  readonly chunkX:number;readonly chunkY:number;readonly chunkSizeTiles?:number;
  readonly totalFrames?:number;readonly biomeOpticalId?:WaterBiomeOpticalProfileId;
  readonly lighting?:Partial<WaterLightingContext>;
 }):readonly AnimatedWaterChunkFrame[] {
  const totalFrames=params.totalFrames??6;
  if(!Number.isSafeInteger(totalFrames)||totalFrames<2||totalFrames>120)
    throw new RangeError('Invalid cyclic sequence frame count');
  return Array.from({length:totalFrames},(_,frameIndex)=>
    this.renderAnimatedWaterChunkFrame({...params,frameIndex,totalFrames}));
 }
}
