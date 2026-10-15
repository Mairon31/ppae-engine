/**
 * PPAE 3.0 Phase 2B — world-space 47-mask shoreline sampling.
 * Tile masks are metadata, not square stencils: shoreline and banks are
 * sampled per texel from the continuous Phase 2A field. This standalone
 * renderer does not yet replace legacy ChunkWorldRenderer.
 */
import {normalizeAutotileMask47,CANONICAL_47_AUTOTILE_MASKS} from './autotiler';
import type {AnyGranularityProfileInput,UnifiedGranularityProfileId} from '../core/resolution-contract-bridge';
import {CoordinateResolutionAdapter} from '../core/coordinate-resolution-adapter';
import {HydrologySdfTopologyEngine} from './hydrology-sdf-topology';
export const SHORELINE_47_MASKS=CANONICAL_47_AUTOTILE_MASKS;
export interface RenderedShorelineChunk {
 readonly profileId:UnifiedGranularityProfileId;
 readonly chunkX:number;readonly chunkY:number;readonly chunkSizeTiles:number;
 readonly tileTexelSize:number;readonly widthTexels:number;readonly heightTexels:number;
 readonly rgba:Uint8ClampedArray;
 /** 0 water, 1 wet sand, 2 dry sand, 3 wetland, 4 upland, 5 island. */
 readonly stratumBuffer:Uint8Array;
 readonly signedDistanceBuffer:Float32Array;
 /** One canonical 47-mask per tile, clockwise N,NE,E,SE,S,SW,W,NW. */
 readonly tileMask47Buffer:Uint8Array;
}
const COLORS=[
 [[31,101,162],[42,134,181],[64,174,204]],
 [[137,110,65],[158,128,78],[172,141,88]],
 [[191,157,96],[210,173,111],[220,187,126]],
 [[76,113,73],[88,127,82],[101,137,91]],
 [[70,114,66],[83,129,74],[97,140,81]],
 [[91,123,73],[103,136,82],[118,150,96]]
] as const;
function valid(n:number,label:string):void {
 if(!Number.isSafeInteger(n))throw new RangeError(label+' must be a safe integer');
}
function hash(seed:number,x:number,y:number):number {
 let k=(seed^Math.imul(x,374761393)^Math.imul(y,668265263))>>>0;
 k=Math.imul(k^(k>>>13),1274126177)>>>0;
 return ((k^(k>>>16))>>>0)/4294967295;
}
const directions=[
 [0,-1,1],[1,-1,2],[1,0,4],[1,1,8],
 [0,1,16],[-1,1,32],[-1,0,64],[-1,-1,128]
] as const;
export class ShorelineAutotiler47Engine {
 constructor(public readonly hydrology:HydrologySdfTopologyEngine){}
 public getTileMask47(tileX:number,tileY:number):number {
  valid(tileX,'tileX');valid(tileY,'tileY');
  let bits=0;
  for(const [dx,dy,bit] of directions)
    if(this.hydrology.sampleWorldHydrology(tileX+dx+0.5,tileY+dy+0.5).isWater)bits|=bit;
  return normalizeAutotileMask47(bits);
 }
 public renderShorelineChunk(
  profile:AnyGranularityProfileInput,chunkX:number,chunkY:number,chunkSizeTiles=8
 ):RenderedShorelineChunk {
  valid(chunkX,'chunkX');valid(chunkY,'chunkY');valid(chunkSizeTiles,'chunkSizeTiles');
  if(chunkSizeTiles<1)throw new RangeError('chunkSizeTiles must be positive');
  const adapter=new CoordinateResolutionAdapter(profile,chunkSizeTiles);
  const n=adapter.chunkSizeTexels,scale=adapter.spec.canonicalTileTexelSize,total=n*n;
  if(!Number.isSafeInteger(total)||total>262144)throw new RangeError('Chunk too large');
  if(!Number.isSafeInteger(chunkX*n)||!Number.isSafeInteger(chunkY*n))
    throw new RangeError('Chunk origin too large');
  const rgba=new Uint8ClampedArray(total*4),stratumBuffer=new Uint8Array(total);
  const signedDistanceBuffer=new Float32Array(total);
  const tileMask47Buffer=new Uint8Array(chunkSizeTiles*chunkSizeTiles);
  for(let ty=0;ty<chunkSizeTiles;ty++)for(let tx=0;tx<chunkSizeTiles;tx++)
    tileMask47Buffer[ty*chunkSizeTiles+tx]=this.getTileMask47(
      chunkX*chunkSizeTiles+tx,chunkY*chunkSizeTiles+ty);
  const ox=chunkX*n,oy=chunkY*n,seed=this.hydrology.config.seed;
  const cell=Math.max(1,Math.round(scale/14));
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const sample=this.hydrology.sampleWorldHydrology((ox+x+0.5)/scale,(oy+y+0.5)/scale);
   const zone=sample.zone;
   const kind=sample.isWater?0:zone==='wet-sandbank'?1:
     zone==='dry-sandbank'?2:zone==='riparian-wetland'?3:
     zone==='island-ground'?5:4;
   const i=y*n+x;
   stratumBuffer[i]=kind;
   signedDistanceBuffer[i]=sample.signedShoreDistanceTiles;
   const arr=COLORS[kind];
   const selector=hash(seed,Math.floor((ox+x)/cell),Math.floor((oy+y)/cell));
   const c=arr[Math.min(arr.length-1,Math.floor(selector*arr.length))];
   rgba[i*4]=c[0];rgba[i*4+1]=c[1];rgba[i*4+2]=c[2];rgba[i*4+3]=255;
  }
  return {profileId:adapter.spec.profileId,chunkX,chunkY,chunkSizeTiles,
    tileTexelSize:scale,widthTexels:n,heightTexels:n,rgba,
    stratumBuffer,signedDistanceBuffer,tileMask47Buffer};
 }
}
