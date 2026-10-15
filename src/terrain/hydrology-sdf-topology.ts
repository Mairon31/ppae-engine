/**
 * PPAE Engine 3.0 — Phase 2A: seed-stable continuous hydrology topology.
 *
 * These coordinates are WORLD TILE COORDINATES (the existing engine defines
 * one tile as 16 logical world units). The chunk sampler converts from the
 * legacy 16-units-per-tile system, so shapes DO NOT change with art resolution.
 *
 * This is a topological field, not a replacement for the existing world-field,
 * autotiler, liquid renderer, or the interactive Playground (Phases 2B/2C).
 * "SDF" here denotes a signed implicit shoreline *field*; smooth unions,
 * warped axes, and normalized river offsets are not globally exact Euclidean
 * distance-to-boundary metrics. Never use these outputs for rigid-body physics.
 */
import type { AnyGranularityProfileInput, UnifiedGranularityProfileId } from '../core/resolution-contract-bridge';
import { CoordinateResolutionAdapter } from '../core/coordinate-resolution-adapter';

export type WaterBodyClassification =
  'none'|'river-main'|'river-tributary'|'river-confluence'|'river-delta'|
  'lake-basin'|'ocean-coastal'|'ocean-pelagic';
export type HydrologicalZoneId =
  'deep-water'|'mid-water'|'shallow-water'|'shore-foam'|
  'wet-sandbank'|'dry-sandbank'|'riparian-wetland'|'upland-ground'|'island-ground';

export interface HydrologyWorldConfig {
  readonly seed:number;
  readonly oceanCoastlineWorldX?:number;
  readonly primaryRiverHalfWidthTiles?:number;
  readonly lakeCenterWorldX?:number;
  readonly lakeCenterWorldY?:number;
  readonly lakeRadiusTiles?:number;
  readonly enableLakeIsland?:boolean;
  readonly baseSandbankWidthTiles?:number;
  readonly wetlandBeltWidthTiles?:number;
  readonly cliffWaterfallWorldX?:number;
}
export interface HydrologyFieldSample {
  /** Absolute coordinates in terrain tiles, not engine's 16-unit world space. */
  readonly worldLogicalX:number;readonly worldLogicalY:number;
  /** Signed implicit shoreline field in tile units; negative means water. */
  readonly signedShoreDistanceTiles:number;
  readonly normalizedDepth:number;
  readonly terrainElevation:number;
  readonly waterBody:WaterBodyClassification;
  readonly zone:HydrologicalZoneId;
  readonly isWater:boolean;readonly isSandbank:boolean;
  readonly isWetZone:boolean;readonly isNaturalIsland:boolean;
  readonly isWaterfall:boolean;
  readonly meanderCurvatureAsymmetry:number;
  readonly localSandbankWidthTiles:number;
  readonly flowDirX:number;readonly flowDirY:number;
  readonly flowSpeed:number;readonly foamIntensity:number;
}
export interface ChunkHydrologyFieldGrid {
  readonly profileId:UnifiedGranularityProfileId;
  readonly chunkX:number;readonly chunkY:number;readonly chunkSizeTiles:number;
  readonly widthTexels:number;readonly heightTexels:number;
  readonly samples:readonly HydrologyFieldSample[];
}
export interface RiverSpineSample {
  readonly centerY:number;
  readonly slopeDyDx:number;
  readonly curvatureD2yDx2:number;
  readonly halfWidthTiles:number;
}
const clamp=(v:number,min:number,max:number):number=>Math.max(min,Math.min(max,v));
function smoothstep(a:number,b:number,x:number):number {
  if(a===b)return x<a?0:1;
  const t=clamp((x-a)/(b-a),0,1);
  return t*t*(3-2*t);
}
export function smoothUnionSdf(d1:number,d2:number,k:number):number {
  if(k<=1e-6)return Math.min(d1,d2);
  const h=clamp(0.5+0.5*(d2-d1)/k,0,1);
  return d2*(1-h)+d1*h-k*h*(1-h);
}
function hash2D(seed:number,ix:number,iy:number):number {
  let h=(seed^Math.imul(ix,374761393)^Math.imul(iy,668265263))>>>0;
  h=Math.imul(h^(h>>>13),1274126177)>>>0;
  return ((h^(h>>>16))>>>0)/4294967295;
}
export function sampleContinuousNoise2D(seed:number,x:number,y:number):number {
  if(!Number.isFinite(x)||!Number.isFinite(y))
    throw new RangeError('Continuous-noise coordinates must be finite');
  const ix=Math.floor(x),iy=Math.floor(y);
  const fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash2D(seed,ix,iy)+(hash2D(seed,ix+1,iy)-hash2D(seed,ix,iy))*u;
  const b=hash2D(seed,ix,iy+1)+(hash2D(seed,ix+1,iy+1)-hash2D(seed,ix,iy+1))*u;
  return (a+(b-a)*v)*2-1;
}
export function sampleFbm2D(seed:number,x:number,y:number,octaves=3):number {
  if(!Number.isInteger(octaves)||octaves<1||octaves>8)
    throw new RangeError('fBm octaves must be 1..8');
  let sum=0,amplitude=0.5,frequency=1,normalizer=0;
  for(let i=0;i<octaves;i++){
    sum+=amplitude*sampleContinuousNoise2D(seed+i*97,x*frequency,y*frequency);
    normalizer+=amplitude;amplitude*=0.5;frequency*=2.03;
  }
  return sum/normalizer;
}
function validateConfig(raw:HydrologyWorldConfig):Required<HydrologyWorldConfig> {
  if(!Number.isSafeInteger(raw.seed))throw new RangeError('seed must be a safe integer');
  const c:Required<HydrologyWorldConfig>={
    seed:raw.seed>>>0,oceanCoastlineWorldX:raw.oceanCoastlineWorldX??28,
    primaryRiverHalfWidthTiles:raw.primaryRiverHalfWidthTiles??2.2,
    lakeCenterWorldX:raw.lakeCenterWorldX??4,
    lakeCenterWorldY:raw.lakeCenterWorldY??0,
    lakeRadiusTiles:raw.lakeRadiusTiles??7.5,
    enableLakeIsland:raw.enableLakeIsland??true,
    baseSandbankWidthTiles:raw.baseSandbankWidthTiles??1.35,
    wetlandBeltWidthTiles:raw.wetlandBeltWidthTiles??1.8,
    cliffWaterfallWorldX:raw.cliffWaterfallWorldX??-8
  };
  for(const [key,value] of Object.entries(c)){
    if(typeof value==='number'&&!Number.isFinite(value))
      throw new RangeError('Non-finite hydrology config: '+key);
  }
  for(const [key,value] of [
    ['primaryRiverHalfWidthTiles',c.primaryRiverHalfWidthTiles],
    ['lakeRadiusTiles',c.lakeRadiusTiles],
    ['baseSandbankWidthTiles',c.baseSandbankWidthTiles],
    ['wetlandBeltWidthTiles',c.wetlandBeltWidthTiles]
  ] as const)if(value<=0)throw new RangeError(key+' must be positive');
  return Object.freeze(c);
}

export class HydrologySdfTopologyEngine {
  public readonly config:Required<HydrologyWorldConfig>;
  constructor(config:HydrologyWorldConfig){this.config=validateConfig(config);}

  public evaluatePrimaryRiverSpine(worldX:number):RiverSpineSample {
    if(!Number.isFinite(worldX))throw new RangeError('river x must be finite');
    const c=this.config,s=c.seed;
    const p1=(s%1000)*0.00628,p2=((s>>>10)%1000)*0.00628;
    const a=4.2,k=0.14,b=2.6,m=0.065;
    const warp=sampleFbm2D(s+17,worldX*0.05,1.3,2)*1.4;
    const centerY=a*Math.sin(worldX*k+p1)+b*Math.cos(worldX*m+p2)+warp;
    // The warp affects actual slope and curvature; finite differences keep
    // tangent and curvature consistent with the rendered centerline.
    const centerAt=(x:number):number=>
      a*Math.sin(x*k+p1)+b*Math.cos(x*m+p2)+
      sampleFbm2D(s+17,x*0.05,1.3,2)*1.4;
    const eps=0.1;
    const forward=centerAt(worldX+eps),backward=centerAt(worldX-eps);
    const slopeDyDx=(forward-backward)/(2*eps);
    const curvatureD2yDx2=(forward-2*centerY+backward)/(eps*eps);
    const widthMod=1+
      0.28*sampleContinuousNoise2D(s+53,worldX*0.11,-2.7)+
      0.35*smoothstep(c.oceanCoastlineWorldX-12,c.oceanCoastlineWorldX,worldX);
    return {
      centerY,slopeDyDx,curvatureD2yDx2,
      halfWidthTiles:Math.max(0.85,c.primaryRiverHalfWidthTiles*widthMod)
    };
  }

  public sampleWorldHydrology(wx:number,wy:number):HydrologyFieldSample {
    if(!Number.isFinite(wx)||!Number.isFinite(wy))
      throw new RangeError('hydrology world tile coordinates must be finite');
    const c=this.config,s=c.seed,coastX=c.oceanCoastlineWorldX;
    const spine=this.evaluatePrimaryRiverSpine(wx);
    const signedOffset=(wy-spine.centerY)/Math.hypot(1,spine.slopeDyDx);
    const dRiver=Math.abs(signedOffset)-spine.halfWidthTiles;

    // Tributary joins the main river near x=-2, approaching from the north.
    // Width tapers to zero south of its junction; never produce a stray
    // infinitely long water stripe on the far side of the main channel.
    const joinX=-2,joinY=this.evaluatePrimaryRiverSpine(joinX).centerY;
    const tribProgress=wy-joinY;
    const tribActive=smoothstep(-1,1.5,tribProgress);
    const tribX=joinX-0.18*Math.max(0,tribProgress)+
      0.3*Math.sin(0.36*tribProgress);
    const dTrib=tribActive<=0?1e6:
      Math.abs(wx-tribX)-
      1.25*tribActive;
    // Delta arms emerge only close to the ocean; gradually reconnect via
    // smooth union with the main channel rather than crossing elsewhere.
    const deltaFactor=smoothstep(coastX-9,coastX-1.5,wx);
    const spread=Math.max(0,wx-(coastX-9))*0.52*deltaFactor;
    const branchR=spine.halfWidthTiles*0.62;
    const dDelta=deltaFactor>0?
      Math.min(Math.abs(wy-(spine.centerY+spread)),
        Math.abs(wy-(spine.centerY-spread)))-branchR:1e6;

    const lx=wx-c.lakeCenterWorldX,ly=wy-c.lakeCenterWorldY;
    const theta=Math.atan2(ly,lx);
    const deform=sampleFbm2D(s+211,Math.cos(theta)*1.3,
      Math.sin(theta)*1.3,3)*1.65;
    const dLakeOuter=Math.hypot(lx*0.92,ly*1.08)-(c.lakeRadiusTiles+deform);
    let dIsland=1e6;
    if(c.enableLakeIsland){
      dIsland=Math.hypot(lx-0.6,ly+0.4)-
        (2.15+sampleContinuousNoise2D(s+307,wx*0.4,wy*0.4)*0.45);
    }
    const insideLake=dLakeOuter<0;
    const isNaturalIsland=c.enableLakeIsland&&dIsland<0&&insideLake;
    const coastWarp=sampleFbm2D(s+409,wx*0.04,wy*0.09,3)*3.8+
      1.5*Math.sin(wy*0.12);
    const dOcean=coastX+coastWarp-wx;

    const dRiverAndTrib=smoothUnionSdf(dRiver,dTrib,1.35);
    const dRiverDelta=deltaFactor>0?
      smoothUnionSdf(dRiverAndTrib,dDelta,1.1):dRiverAndTrib;
    const dLake=c.enableLakeIsland?
      Math.max(dLakeOuter,-dIsland):dLakeOuter;
    const dInland=smoothUnionSdf(dRiverDelta,dLake,1.6);
    // Topologically subtract the emergent island after the inland-water
    // union. Otherwise the main river floods the lake's island at its center.
    const withoutIsland=c.enableLakeIsland&&insideLake?
      Math.max(dInland,-dIsland):dInland;
    const dWater=smoothUnionSdf(withoutIsland,dOcean,2);
    const isWater=dWater<0;

    let waterBody:WaterBodyClassification='none';
    if(isWater){
      if(dOcean<-4.5)waterBody='ocean-pelagic';
      else if(dOcean<0.5)
        waterBody=deltaFactor>0.35&&dRiverDelta<1.2?'river-delta':'ocean-coastal';
      else if(dLake<=dRiverDelta-0.3)waterBody='lake-basin';
      else if(deltaFactor>0.3&&dDelta<dRiver)
        waterBody='river-delta';
      else if(Math.abs(dRiver-dTrib)<1.1&&dTrib<0.8)
        waterBody='river-confluence';
      else if(dTrib<dRiver)waterBody='river-tributary';
      else waterBody='river-main';
    }

    const asym=clamp(
      -spine.curvatureD2yDx2*Math.sign(signedOffset||1)*14+
      sampleFbm2D(s+521,wx*0.22,wy*0.22,2)*0.25,-1,1
    );
    const shoreWidth=Math.max(0.35,c.baseSandbankWidthTiles*
      (dOcean<3.5?1.45:1)*(1+0.55*asym));

    const cliffX=c.cliffWaterfallWorldX;
    const cliffDrop=1-0.42*smoothstep(cliffX-1.1,cliffX+1.1,wx);
    const regional=clamp(0.75-wx/(coastX+20)*0.45,0.05,1);
    const elevation=clamp(
      regional*cliffDrop+Math.max(0,dWater)*0.04+
      sampleFbm2D(s+613,wx*0.08,wy*0.08,2)*0.06,0,1
    );
    const waterfall=isWater&&
      (waterBody==='river-main'||waterBody==='river-tributary'||
       waterBody==='river-confluence')&&Math.abs(wx-cliffX)<=1.15;
    const reference=waterBody==='ocean-pelagic'?8:
      waterBody==='lake-basin'?4.5:spine.halfWidthTiles*1.15;
    const depth=isWater?clamp(-dWater/Math.max(0.8,reference),0.02,1):0;
    const obstacle=sampleContinuousNoise2D(s+733,wx*0.85,wy*0.85);
    const rapid=isWater&&depth<0.65&&obstacle>0.72;
    const foamBand=0.28+(dOcean<1.5?0.18:0);
    const wetLimit=shoreWidth*0.48;
    const wetlandLimit=shoreWidth+c.wetlandBeltWidthTiles;
    let zone:HydrologicalZoneId;
    if(isWater){
      zone=(-dWater<=foamBand||waterfall||rapid)?'shore-foam':
        depth<0.38?'shallow-water':
        depth<0.74?'mid-water':'deep-water';
    }else if(isNaturalIsland&&dWater>shoreWidth){
      zone='island-ground';
    }else if(dWater<=wetLimit)zone='wet-sandbank';
    else if(dWater<=shoreWidth)zone='dry-sandbank';
    else if(dWater<=wetlandLimit)zone='riparian-wetland';
    else zone='upland-ground';

    let vx=1,vy=spine.slopeDyDx;
    if(waterBody==='river-tributary'){vx=0.18;vy=-1;}
    else if(waterBody==='lake-basin'){vx=0.35;vy=-ly*0.08;}
    else if(waterBody==='ocean-pelagic'||waterBody==='ocean-coastal'){
      vx=-0.65;vy=0.25*Math.cos(wy*0.2);
    }
    const vlen=Math.hypot(vx,vy)||1;
    const flowX=isWater?vx/vlen:0,flowY=isWater?vy/vlen:0;
    const constriction=clamp(2.2/Math.max(0.9,spine.halfWidthTiles),0.6,1.5);
    const speed=isWater?clamp(
      (waterBody==='lake-basin'?0.22:0.58*constriction)+
      (waterfall?0.4:0)+(rapid?0.2:0),0.08,1):0;
    const shorelineFoam=isWater?clamp(1+dWater/foamBand,0,1):0;
    const waterfallFoam=waterfall?
      clamp(1-Math.abs(wx-cliffX)/1.15,0.4,1):0;
    const rapidFoam=rapid?clamp((obstacle-0.72)/0.28,0.35,0.95):0;
    const foam=isWater?Math.max(shorelineFoam,waterfallFoam,rapidFoam):0;
    return {
      worldLogicalX:wx,worldLogicalY:wy,
      signedShoreDistanceTiles:dWater,normalizedDepth:depth,
      terrainElevation:isWater?Math.max(0,elevation-depth*0.35):elevation,
      waterBody,zone,isWater,
      isSandbank:zone==='wet-sandbank'||zone==='dry-sandbank',
      isWetZone:isWater||zone==='wet-sandbank'||zone==='riparian-wetland',
      isNaturalIsland,isWaterfall:waterfall,
      meanderCurvatureAsymmetry:asym,localSandbankWidthTiles:shoreWidth,
      flowDirX:flowX,flowDirY:flowY,flowSpeed:speed,foamIntensity:foam
    };
  }

  /**
   * Deterministic texel-center sampling in world tile coordinates. A sample
   * at a world position does not depend on which chunk is being rendered.
   * Each profile uses its actual canonical tile texel size, not module size.
   * Cap output size; callers can request more/smaller chunks as needed.
   */
  public sampleChunkHydrologyTexelGrid(
    profile:AnyGranularityProfileInput,
    chunkX:number,chunkY:number,chunkSizeTiles=8
  ):ChunkHydrologyFieldGrid {
    for(const [name,value] of Object.entries({chunkX,chunkY,chunkSizeTiles}))
      if(!Number.isSafeInteger(value))throw new RangeError(name+' must be safe integer');
    if(chunkSizeTiles<1)throw new RangeError('chunkSizeTiles must be positive');
    const adapter=new CoordinateResolutionAdapter(profile,chunkSizeTiles);
    const w=adapter.chunkSizeTexels,h=w;
    if(w*h>262_144)
      throw new RangeError('Hydrology chunk exceeds 262144 sampled texels');
    const startX=chunkX*w,startY=chunkY*h;
    const tileTexels=adapter.spec.canonicalTileTexelSize;
    const samples:HydrologyFieldSample[]=new Array(w*h);
    // Direct absolute texel indexing yields exactly the same world coordinates
    // for a point regardless of its parent chunk, including negative chunks.
    for(let y=0;y<h;y++){
      const worldY=(startY+y+0.5)/tileTexels;
      for(let x=0;x<w;x++){
        const worldX=(startX+x+0.5)/tileTexels;
        samples[y*w+x]=this.sampleWorldHydrology(worldX,worldY);
      }
    }
    return {
      profileId:adapter.spec.profileId,chunkX,chunkY,chunkSizeTiles,
      widthTexels:w,heightTexels:h,samples
    };
  }
}
