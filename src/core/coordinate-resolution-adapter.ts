/**
 * PPAE Engine 3.0 / Phase 1B.2 — resolution-aware coordinate / atlas math.
 *
 * Existing engine contract: ONE world tile = SIXTEEN logical world units.
 * A tile is not an art module: micro-4x4 is 4/24, native-24x24 is 24/96,
 * hybrid-24 is 4/48 (art module size / canonical tile texel size).
 *
 * Seam verification here proves integer address continuity, not matching
 * procedural terrain colors: the terrain seam rules belong to Phase 2.
 */
import {
  getResolutionSpaceSpec,
  type AnyGranularityProfileInput, type ArtModuleSize30,
  type ResolutionSpaceSeparationSpec, type UnifiedGranularityProfileId
} from './resolution-contract-bridge';

export interface WorldChunkTexelAddress {
  readonly profileId: UnifiedGranularityProfileId;
  readonly chunkX:number;readonly chunkY:number;
  readonly tileInChunkX:number;readonly tileInChunkY:number;
  readonly texelInTileX:number;readonly texelInTileY:number;
  readonly texelInChunkX:number;readonly texelInChunkY:number;
  readonly worldTexelX:number;readonly worldTexelY:number;
  /** Absolute artistic module indices; divide by artModuleSize, not raster pixel step. */
  readonly artModuleIndexX:number;readonly artModuleIndexY:number;
  /** Snapping quantum for a raster texel; 4 in hybrid-24, 1 otherwise. */
  readonly texelStepSizeInModule:number;
  /** 16 logical world units per tile, sampled at texel center. */
  readonly logicalWorldX:number;readonly logicalWorldY:number;
}
export interface AtlasSlotPackingMetrics {
  readonly profileId:UnifiedGranularityProfileId;
  readonly artModuleSize:ArtModuleSize30;
  readonly canonicalTileTexelSize:number;
  readonly spriteWidthTexels:number;readonly spriteHeightTexels:number;
  readonly extrudePaddingTexels:number;readonly innerMarginTexels:number;
  readonly slotStrideWidthTexels:number;readonly slotStrideHeightTexels:number;
  readonly contentOffsetX:number;readonly contentOffsetY:number;
  readonly pivotInSlotX:number;readonly pivotInSlotY:number;
}
export interface CrossChunkContinuityReport {
  readonly profileId:UnifiedGranularityProfileId;
  readonly canonicalTileTexelSize:number;
  readonly chunkSizeTiles:number;readonly chunkSizeTexels:number;
  /** Integer address discontinuity, expected exactly zero. */
  readonly horizontalTexelGap:number;
  readonly verticalTexelGap:number;
  readonly diagonalTexelGap:number;
  /** Floating logical-coordinate drift; subject to machine rounding. */
  readonly horizontalSeamMaxDrift:number;
  readonly verticalSeamMaxDrift:number;
  readonly diagonalCornerMaxDrift:number;
  readonly isSeamless:boolean;
}
function safeInt(value:number,label:string):void {
  if(!Number.isSafeInteger(value))throw new RangeError(label+' must be a safe integer');
}
function positiveInt(value:number,label:string):void {
  safeInt(value,label);
  if(value<1)throw new RangeError(label+' must be positive');
}
function finitePositive(value:number,label:string):void {
  if(!Number.isFinite(value)||value<=0)throw new RangeError(label+' must be positive and finite');
}
function normalized(value:number,label:string):void {
  if(!Number.isFinite(value)||value<0||value>1)
    throw new RangeError(label+' must be a normalized number in [0,1]');
}
export function euclideanFloorDiv(a:number,b:number):number {
  safeInt(a,'dividend');positiveInt(b,'divisor');
  return Math.floor(a/b);
}
export function euclideanModulo(a:number,b:number):number {
  safeInt(a,'dividend');positiveInt(b,'divisor');
  return ((a%b)+b)%b;
}
function quantize(value:number,scale:number):number {
  if(!Number.isFinite(value))throw new RangeError('World coordinate must be finite');
  const scaled=value*scale;
  if(!Number.isFinite(scaled)||!Number.isSafeInteger(Math.round(scaled)))
    throw new RangeError('World texel coordinate exceeds safe integer range');
  const nearest=Math.round(scaled);
  return Math.abs(scaled-nearest)<=1e-10?nearest:Math.floor(scaled);
}
export class CoordinateResolutionAdapter {
  public readonly spec:ResolutionSpaceSeparationSpec;
  public readonly chunkSizeTiles:number;
  public readonly chunkSizeTexels:number;
  /** Quantum for raster art, not artModuleSize itself. */
  public readonly moduleStepTexels:number;

  constructor(profileInput:AnyGranularityProfileInput,chunkSizeTiles=16){
    positiveInt(chunkSizeTiles,'chunkSizeTiles');
    this.spec=getResolutionSpaceSpec(profileInput);
    this.chunkSizeTiles=chunkSizeTiles;
    this.chunkSizeTexels=this.spec.canonicalTileTexelSize*chunkSizeTiles;
    safeInt(this.chunkSizeTexels,'chunkSizeTexels');
    this.moduleStepTexels=this.spec.isHybridCompositeGrid?this.spec.artModuleSize:1;
  }
  public resolveWorldTexelAddress(x:number,y:number):WorldChunkTexelAddress {
    safeInt(x,'worldTexelX');safeInt(y,'worldTexelY');
    const t=this.spec.canonicalTileTexelSize,n=this.chunkSizeTexels;
    const cx=euclideanFloorDiv(x,n),cy=euclideanFloorDiv(y,n);
    const lx=euclideanModulo(x,n),ly=euclideanModulo(y,n);
    const tx=euclideanFloorDiv(lx,t),ty=euclideanFloorDiv(ly,t);
    return {
      profileId:this.spec.profileId,
      chunkX:cx,chunkY:cy,tileInChunkX:tx,tileInChunkY:ty,
      texelInTileX:euclideanModulo(lx,t),
      texelInTileY:euclideanModulo(ly,t),
      texelInChunkX:lx,texelInChunkY:ly,
      worldTexelX:x,worldTexelY:y,
      artModuleIndexX:euclideanFloorDiv(x,this.spec.artModuleSize),
      artModuleIndexY:euclideanFloorDiv(y,this.spec.artModuleSize),
      texelStepSizeInModule:this.moduleStepTexels,
      logicalWorldX:(x+0.5)*16/t,
      logicalWorldY:(y+0.5)*16/t
    };
  }
  /** Input is in established engine units: 16 world units per tile. */
  public resolveLogicalWorldPoint(x:number,y:number):WorldChunkTexelAddress {
    const texelsPerWorldUnit=this.spec.texelsPerLogicalWorldUnit;
    return this.resolveWorldTexelAddress(
      quantize(x,texelsPerWorldUnit),quantize(y,texelsPerWorldUnit)
    );
  }
  /**
   * Snap a raster pixel. In hybrid mode align to 4-texel composite modules.
   * In native modes keep the 1-texel raster grid. Use artModuleIndex for
   * art-module-addressing semantics in every profile.
   */
  public snapTexelToArtModuleGrid(x:number):number {
    if(!Number.isFinite(x))throw new RangeError('texel coordinate must be finite');
    const snapped=Math.round(x);
    safeInt(snapped,'snapped texel');
    return euclideanFloorDiv(snapped,this.moduleStepTexels)*this.moduleStepTexels;
  }
  public computeAtlasSlotMetrics(
    logicalWidthTiles=1,logicalHeightTiles=1,
    extrudePaddingTexels=1,pivotX=0.5,pivotY=1
  ):AtlasSlotPackingMetrics {
    finitePositive(logicalWidthTiles,'sprite width in tiles');
    finitePositive(logicalHeightTiles,'sprite height in tiles');
    safeInt(extrudePaddingTexels,'atlas padding');
    if(extrudePaddingTexels<0)throw new RangeError('atlas padding must be nonnegative');
    normalized(pivotX,'pivotX');normalized(pivotY,'pivotY');
    const scale=this.spec.canonicalTileTexelSize;
    const w=Math.round(logicalWidthTiles*scale),h=Math.round(logicalHeightTiles*scale);
    positiveInt(w,'sprite width in texels');positiveInt(h,'sprite height in texels');
    const strideW=w+2*extrudePaddingTexels,strideH=h+2*extrudePaddingTexels;
    positiveInt(strideW,'atlas slot stride width');
    positiveInt(strideH,'atlas slot stride height');
    if(strideW*strideH>67_108_864)
      throw new RangeError('Atlas slot exceeds 64 million texels');
    const q=(v:number,n:number)=>Math.max(0,Math.min(n-1,Math.round(v*(n-1))));
    return {
      profileId:this.spec.profileId,artModuleSize:this.spec.artModuleSize,
      canonicalTileTexelSize:scale,
      spriteWidthTexels:w,spriteHeightTexels:h,
      extrudePaddingTexels,
      innerMarginTexels:this.spec.safeMarginTexels,
      slotStrideWidthTexels:strideW,slotStrideHeightTexels:strideH,
      contentOffsetX:extrudePaddingTexels,
      contentOffsetY:extrudePaddingTexels,
      pivotInSlotX:extrudePaddingTexels+q(pivotX,w),
      pivotInSlotY:extrudePaddingTexels+q(pivotY,h)
    };
  }
  /**
   * Check four adjacent chunks, including negative-world boundaries.
   * Integer equality is exact. World logical samples use an epsilon because
   * 16 / canonicalTileTexels need not have an exact binary representation.
   */
  public verifyCrossChunkTexelContinuity(
    baseChunkX=-1,baseChunkY=-1
  ):CrossChunkContinuityReport {
    safeInt(baseChunkX,'baseChunkX');safeInt(baseChunkY,'baseChunkY');
    const N=this.chunkSizeTexels,scale=this.spec.canonicalTileTexelSize;
    const ex=16/scale;
    let hg=0,vg=0,hd=0,vd=0;
    for(let p=0;p<N;p++){
      const a=this.resolveWorldTexelAddress(baseChunkX*N+N-1,baseChunkY*N+p);
      const b=this.resolveWorldTexelAddress((baseChunkX+1)*N,baseChunkY*N+p);
      const c=this.resolveWorldTexelAddress(baseChunkX*N+p,baseChunkY*N+N-1);
      const d=this.resolveWorldTexelAddress(baseChunkX*N+p,(baseChunkY+1)*N);
      hg=Math.max(hg,Math.abs(b.worldTexelX-a.worldTexelX-1));
      vg=Math.max(vg,Math.abs(d.worldTexelY-c.worldTexelY-1));
      hd=Math.max(hd,Math.abs(b.logicalWorldX-a.logicalWorldX-ex));
      vd=Math.max(vd,Math.abs(d.logicalWorldY-c.logicalWorldY-ex));
    }
    const a=this.resolveWorldTexelAddress(baseChunkX*N+N-1,baseChunkY*N+N-1);
    const d=this.resolveWorldTexelAddress((baseChunkX+1)*N,(baseChunkY+1)*N);
    const diagGap=Math.max(Math.abs(d.worldTexelX-a.worldTexelX-1),
      Math.abs(d.worldTexelY-a.worldTexelY-1));
    const logicalDiag=Math.abs(Math.hypot(
      d.logicalWorldX-a.logicalWorldX,d.logicalWorldY-a.logicalWorldY
    )-Math.SQRT2*ex);
    return {
      profileId:this.spec.profileId,canonicalTileTexelSize:scale,
      chunkSizeTiles:this.chunkSizeTiles,chunkSizeTexels:N,
      horizontalTexelGap:hg,verticalTexelGap:vg,diagonalTexelGap:diagGap,
      horizontalSeamMaxDrift:hd,verticalSeamMaxDrift:vd,
      diagonalCornerMaxDrift:logicalDiag,
      isSeamless:hg===0&&vg===0&&diagGap===0&&hd<1e-10&&vd<1e-10&&logicalDiag<1e-10
    };
  }
}
