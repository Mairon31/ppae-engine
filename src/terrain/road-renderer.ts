import type { ArtStyleProfile, AutotileMask8, TerrainMaterialId } from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { normalizeAutotileMask47 } from './autotiler';
import { TERRAIN_MATERIALS } from './world-field';

export interface RoadTileMetrics {
  readonly mask: AutotileMask8;
  readonly roadPixelCount: number;
  readonly substratePixelCount: number;
  readonly pebblePixelCount: number;
  readonly connectedEdges: {
    readonly north: boolean;
    readonly east: boolean;
    readonly south: boolean;
    readonly west: boolean;
  };
}

/**
 * Signed-distance-inspired directional road rasterizer. It operates on the
 * connected cardinal arms of the 47-blob topology and never punches square
 * holes into an adjacent meadow/forest tile.
 */
export class DirectionalRoadRenderer {
  public renderRoadTile(
    roadMaterial: TerrainMaterialId,
    connectivityMask: AutotileMask8,
    profile: ArtStyleProfile,
    substrateTile: PixelBuffer,
    variantIndex=0
  ): { readonly buffer: PixelBuffer; readonly metrics: RoadTileMetrics } {
    const size=profile.canonicalTileTexels;
    if(substrateTile.width!==size||substrateTile.height!==size){
      throw new Error('Road substrate dimensions must match canonical tile size');
    }
    const mask=normalizeAutotileMask47(connectivityMask);
    const n=(mask&1)!==0,ne=(mask&2)!==0,e=(mask&4)!==0,se=(mask&8)!==0;
    const s=(mask&16)!==0,sw=(mask&32)!==0,w=(mask&64)!==0,nw=(mask&128)!==0;
    const roadDef=TERRAIN_MATERIALS[roadMaterial]??TERRAIN_MATERIALS.dirt_soil;
    const base=hexToRgba(roadDef.baseColorHex);
    const rut=hexToRgba(roadDef.shadowColorHex);
    const crown=hexToRgba(roadDef.highlightColorHex);
    const edge=hexToRgba(roadDef.transitionBorderHex);
    const pebbleLight=hexToRgba('#94a3b8');
    const pebbleDark=hexToRgba('#475569');
    const center=(size-1)*.5;
    const halfWidth=Math.max(5,Math.round(size*.31));
    const rutOffset=Math.max(2,Math.round(halfWidth*.46));
    const out=new PixelBuffer(size,size);
    let roadPixelCount=0,substratePixelCount=0,pebblePixelCount=0;
    for(let y=0;y<size;y++){
      for(let x=0;x<size;x++){
        const dist=this.distanceToRoad(
          x,y,size,center,n,ne,e,se,s,sw,w,nw
        );
        // Fade all seed-specific noise to zero at every inter-tile endpoint.
        const fade=Math.max(0,Math.min(
          Math.sin(x/(size-1)*Math.PI),Math.sin(y/(size-1)*Math.PI)));
        const h=((x*43+y*97+variantIndex*53)&15)/15;
        const radius=halfWidth+(h-.5)*2.2*fade;
        if(dist>radius+.8){
          out.setPixel(x,y,substrateTile.getPixel(x,y));
          substratePixelCount++;
          continue;
        }
        roadPixelCount++;
        if(dist>radius-.85){
          // One-pixel eroded shoulders; no second trench on neighboring grass.
          out.setPixel(x,y,(x+y+variantIndex)%2&&fade>.1?rut:edge);
          continue;
        }
        const onShoulder=dist>=radius-2.4&&dist<=radius-1;
        const pebbleHash=((x*73)^(y*131)^(variantIndex*19))&31;
        if(fade>.15&&onShoulder&&(pebbleHash===0||pebbleHash===1)){
          out.setPixel(x,y,pebbleHash===0?pebbleLight:pebbleDark);
          pebblePixelCount++;
          continue;
        }
        // Two compacted wheel ruts, continuous at the seam. Remove dashes
        // and avoid choosing a different border color for each tile variant.
        if(Math.abs(dist-rutOffset)<=.95){
          out.setPixel(x,y,rut);
        }else if(dist<rutOffset*.55){
          out.setPixel(x,y,fade>.15&&((x*17+y*31+variantIndex)&3)===0
            ?crown:base);
        }else{
          out.setPixel(x,y,fade>.15&&((x*29+y*11+variantIndex)&7)===0
            ?crown:base);
        }
      }
    }
    return {
      buffer:out,
      metrics:{
        mask,roadPixelCount,substratePixelCount,pebblePixelCount,
        connectedEdges:{north:n,east:e,south:s,west:w}
      }
    };
  }

  /**
   * Euclidean distance to an actual road medial axis. Adjacent arms bend
   * along a quarter-circle with an exact seam endpoint at the middle of each
   * relevant border. Opposite arms retain their straight alignment.
   */
  private distanceToRoad(
    x:number,y:number,size:number,center:number,
    n:boolean,ne:boolean,e:boolean,se:boolean,
    s:boolean,sw:boolean,w:boolean,nw:boolean
  ):number{
    const count=Number(n)+Number(e)+Number(s)+Number(w);
    if(count===0)return Math.hypot(x-center,y-center);
    // L-bends run along a quarter-circle; the exterior corner stays substrate.
    if(count===2){
      if(n&&e){
        return Math.abs(Math.hypot(x-(size-1),y)-center);
      }
      if(e&&s){
        return Math.abs(Math.hypot(x-(size-1),y-(size-1))-center);
      }
      if(s&&w){
        return Math.abs(Math.hypot(x,y-(size-1))-center);
      }
      if(w&&n){
        return Math.abs(Math.hypot(x,y)-center);
      }
    }
    let min=Math.hypot(x-center,y-center);
    if(n&&y<=center)min=Math.min(min,Math.abs(x-center));
    if(s&&y>=center)min=Math.min(min,Math.abs(x-center));
    if(e&&x>=center)min=Math.min(min,Math.abs(y-center));
    if(w&&x<=center)min=Math.min(min,Math.abs(y-center));
    // Curved internal fillets for junctions, only in the quadrant being joined.
    if(n&&e&&x>=center&&y<=center){
      min=Math.min(min,Math.abs(Math.hypot(x-(size-1),y)-center));
    }
    if(e&&s&&x>=center&&y>=center){
      min=Math.min(min,Math.abs(Math.hypot(x-(size-1),y-(size-1))-center));
    }
    if(s&&w&&x<=center&&y>=center){
      min=Math.min(min,Math.abs(Math.hypot(x,y-(size-1))-center));
    }
    if(w&&n&&x<=center&&y<=center){
      min=Math.min(min,Math.abs(Math.hypot(x,y)-center));
    }
    // The gated diagonals influence corner topology via the normalized mask.
    // They do not create an extra square-filled road quadrant.
    void ne;void se;void sw;void nw;
    return min;
  }
}
