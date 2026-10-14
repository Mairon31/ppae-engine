import type {
  ArtStyleProfile,
  AutotileMask8,
  AutotileMaskClassification,
  AutotileTopologyKind,
  RGBAColor,
  TerrainMaterialId
} from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { DirectionalRoadRenderer } from './road-renderer';
import { TERRAIN_MATERIALS } from './world-field';

/** Clockwise bit layout N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128. */
export const CANONICAL_47_AUTOTILE_MASKS: readonly AutotileMask8[] = (() => {
  const valid: number[] = [];
  for (let mask=0;mask<256;mask++) {
    const n=!!(mask&1),e=!!(mask&4),s=!!(mask&16),w=!!(mask&64);
    if ((mask&2)&&(!n||!e))continue;
    if ((mask&8)&&(!e||!s))continue;
    if ((mask&32)&&(!s||!w))continue;
    if ((mask&128)&&(!w||!n))continue;
    valid.push(mask);
  }
  return valid;
})();
const CANONICAL_47_SET: ReadonlySet<number> = new Set(CANONICAL_47_AUTOTILE_MASKS);

/** Project the full 256-case bit space onto the 47 valid blob autotile states. */
export function normalizeAutotileMask47(rawMask: number): AutotileMask8 {
  const bits = rawMask & 255;
  const n=!!(bits&1),e=!!(bits&4),s=!!(bits&16),w=!!(bits&64);
  return (n?1:0) | (e?4:0) | (s?16:0) | (w?64:0) |
    (n&&e&&(bits&2)?2:0) |
    (e&&s&&(bits&8)?8:0) |
    (s&&w&&(bits&32)?32:0) |
    (w&&n&&(bits&128)?128:0);
}

/** Semantic topology, plus whether the supplied mask was already canonical. */
export function classifyAutotileMask47(mask: AutotileMask8): AutotileMaskClassification {
  const norm=normalizeAutotileMask47(mask);
  const n=!!(norm&1),e=!!(norm&4),s=!!(norm&16),w=!!(norm&64);
  const cardinals=[n,e,s,w].filter(Boolean).length;
  const diagonals=[2,8,32,128].filter(bit=>(norm&bit)!==0).length;
  let topology:AutotileTopologyKind='complex_blend';
  if(norm===255)topology='interior_full';
  else if(cardinals===0)topology='isolated_island';
  else if(cardinals===1)topology='end_cap';
  else if(cardinals===2)topology=(n&&s)||(e&&w)?'corridor_bridge':'outer_corner';
  else if(cardinals===3)topology=diagonals===2?'straight_edge':'t_junction';
  else if(cardinals===4)topology=diagonals===0?'cross_junction':'inner_corner';
  return {mask:norm,isCanonical47:CANONICAL_47_SET.has(mask),
    topology,cardinalCount:cardinals,diagonalCount:diagonals};
}

/**
 * Seamless source texture synthesis and immutable-mask 47-state compositing.
 * Distances/coverage are derived from a separate exposure field; no pixel in
 * the output buffer is ever used to decide whether another pixel is an edge.
 */
export class TerrainAutotiler {
  private readonly roadRenderer = new DirectionalRoadRenderer();
  /**
   * Produce 16 deterministic organic variants. Every cluster wraps toroidally;
   * opposite edges are matched after synthesis to avoid edge pinholes.
   */
  public generateSeamlessBaseTile(
    materialId: TerrainMaterialId,
    profile: ArtStyleProfile,
    variantIndex=0
  ):PixelBuffer{
    const size=profile.canonicalTileTexels;
    const mat=TERRAIN_MATERIALS[materialId];
    const buf=new PixelBuffer(size,size);
    const base=hexToRgba(mat.baseColorHex);
    const shadow=hexToRgba(mat.shadowColorHex);
    const high=hexToRgba(mat.highlightColorHex);
    const accent=hexToRgba(mat.accentColorHex);
    buf.fillRect(0,0,size,size,base);
    const variant=(variantIndex&15);
    const freq=2*Math.PI/(size-1);
    const phase=variant*Math.PI/4;
    const wrap=(x:number)=>(x%size+size)%size;
    const stamp=(x:number,y:number,c:RGBAColor)=>{
      buf.setPixel(wrap(x),wrap(y),c);
    };
    // Directional but periodic tonal patches: no per-module dot lattice.
    for(let y=0;y<size;y++){
      for(let x=0;x<size;x++){
        const wave=Math.sin(x*freq+phase)*Math.cos(y*freq-phase)+
          Math.sin((x+y)*freq);
        const hash=((x*37+y*73+variant*19)&15)/15;
        if(mat.patternType==='organic_tuft'){
          if(wave< -1.15&&hash<.35)buf.setPixel(x,y,shadow);
          else if(wave>1.25&&hash<.25)buf.setPixel(x,y,high);
        }else if(mat.patternType==='granular_sand'){
          const ripple=Math.sin(y*freq*2+Math.sin(x*freq)*1.2+phase);
          if(ripple>.86&&hash<.3)buf.setPixel(x,y,high);
          else if(ripple<-.86&&hash<.25)buf.setPixel(x,y,shadow);
        }
      }
    }
    const modules=Math.floor(size/profile.moduleSize);
    for(let my=0;my<modules;my++){
      for(let mx=0;mx<modules;mx++){
        const h=((mx*73856093)^(my*19349663)^((variant+1)*83492791))>>>0;
        // Sparse irregular micro-clusters; independent of chunk loading order.
        if((h&7)<3)continue;
        const ox=mx*profile.moduleSize+(h%profile.moduleSize);
        const oy=my*profile.moduleSize+((h>>>4)%profile.moduleSize);
        if(mat.patternType==='organic_tuft'){
          if((h&3)===0){
            stamp(ox,oy,shadow);stamp(ox-1,oy-1,high);
            stamp(ox+1,oy-1,high);
            if(h&16)stamp(ox+1,oy-2,accent);
          }else if((h&7)===1){
            stamp(ox,oy,accent);stamp(ox+1,oy,high);
          }
        }else if(mat.patternType==='granular_sand'){
          if((h&3)===0){stamp(ox,oy,high);stamp(ox+1,oy,shadow);}
          else if((h&7)===2)stamp(ox,oy,accent);
        }else if(mat.patternType==='cracked_stone'){
          if((h&3)===0){stamp(ox,oy,shadow);stamp(ox+1,oy,shadow);
            stamp(ox,oy+1,high);}
        }else if(mat.patternType==='frost_crystalline'){
          if((h&3)===0){stamp(ox,oy,high);stamp(ox+1,oy,accent);}
        }
      }
    }
    // Enforce exact opposite-edge equality for any repeating variant.
    // Base tones stay opaque and canonical dimension stays unchanged.
    for(let x=0;x<size;x++)buf.setPixel(x,size-1,buf.getPixel(x,0));
    for(let y=0;y<size;y++)buf.setPixel(size-1,y,buf.getPixel(0,y));
    return buf;
  }

  /** Compose terrestrial borders and coastal wet sand without flood-fill. */
  public composeAutotiledSurface(
    primaryMaterial: TerrainMaterialId,
    mask: AutotileMask8,
    profile: ArtStyleProfile,
    underlayMaterial?: TerrainMaterialId,
    variantIndex=0
  ):PixelBuffer{
    const norm=normalizeAutotileMask47(mask);
    const primary=this.generateSeamlessBaseTile(primaryMaterial,profile,variantIndex);

    // Paths are not terrain overlays sorted by layerPriority. Their topology
    // is resolved against neighboring path cells and rendered over natural soil.
    if(primaryMaterial==='dirt_soil'){
      const substrate=(underlayMaterial && underlayMaterial!=='dirt_soil' &&
        !TERRAIN_MATERIALS[underlayMaterial].isLiquid)
          ? underlayMaterial:'meadow_grass';
      const substrateTile=this.generateSeamlessBaseTile(substrate,profile,variantIndex);
      return this.roadRenderer.renderRoadTile(
        primaryMaterial,norm,profile,substrateTile,variantIndex
      ).buffer;
    }

    if(norm===255||!underlayMaterial||underlayMaterial===primaryMaterial)return primary;

    // Natural tiles bordering a road must not cut out their own square trench.
    // The road tile paints its two eroded shoulders over the shared substrate.
    if(underlayMaterial==='dirt_soil')return primary;
    const underlay=this.generateSeamlessBaseTile(underlayMaterial,profile,variantIndex);
    const size=profile.canonicalTileTexels;
    const out=new PixelBuffer(size,size);
    const n=!!(norm&1),ne=!!(norm&2),e=!!(norm&4),se=!!(norm&8);
    const s=!!(norm&16),sw=!!(norm&32),w=!!(norm&64),nw=!!(norm&128);
    const margin=profile.moduleSize;
    const cornerRadius=margin+1;
    // Stage 1: all underlay exposure is calculated and frozen before painting.
    const exposed=new Uint8Array(size*size);
    for(let y=0;y<size;y++){
      const yn=y/(size-1);
      const waveY=Math.round(Math.sin(yn*Math.PI)*
        Math.sin(yn*3*Math.PI+variantIndex*1.3)*1.25);
      for(let x=0;x<size;x++){
        const xn=x/(size-1);
        const waveX=Math.round(Math.sin(xn*Math.PI)*
          Math.cos(xn*3*Math.PI-variantIndex*1.1)*1.25);
        let show=false;
        if(!n&&y<margin+waveX)show=true;
        if(!s&&y>=size-margin-waveX)show=true;
        if(!w&&x<margin+waveY)show=true;
        if(!e&&x>=size-margin-waveY)show=true;
        // Convex exposed corners: Euclidean distance, not Manhattan diamonds.
        if(!n&&!w&&x<margin+2&&y<margin+2&&
          Math.hypot(margin+2-x,margin+2-y)>2.35)show=true;
        if(!n&&!e&&x>=size-margin-2&&y<margin+2&&
          Math.hypot(x-(size-1-margin-2),margin+2-y)>2.35)show=true;
        if(!s&&!w&&x<margin+2&&y>=size-margin-2&&
          Math.hypot(margin+2-x,y-(size-1-margin-2))>2.35)show=true;
        if(!s&&!e&&x>=size-margin-2&&y>=size-margin-2&&
          Math.hypot(x-(size-1-margin-2),y-(size-1-margin-2))>2.35)show=true;
        // Concave notches when the two cardinal neighbors exist but their diagonal does not.
        if(n&&w&&!nw&&Math.hypot(x,y)<cornerRadius)show=true;
        if(n&&e&&!ne&&Math.hypot(size-1-x,y)<cornerRadius)show=true;
        if(s&&w&&!sw&&Math.hypot(x,size-1-y)<cornerRadius)show=true;
        if(s&&e&&!se&&Math.hypot(size-1-x,size-1-y)<cornerRadius)show=true;
        exposed[y*size+x]=show?1:0;
      }
    }

    // Stage 2: proximity to the immutable exposure mask, never to painted output.
    const primaryDef=TERRAIN_MATERIALS[primaryMaterial];
    const coastal=primaryMaterial==='sand_beach'&&
      TERRAIN_MATERIALS[underlayMaterial].isLiquid;
    const dark=hexToRgba(primaryDef.transitionBorderHex);
    const shadow=hexToRgba(primaryDef.shadowColorHex);
    const wetOuter=hexToRgba('#9c6d2e');
    const wetInner=hexToRgba('#b5833d');
    const foam=hexToRgba('#bae6fd');
    const distanceTo=(x:number,y:number,target:0|1):number=>{
      let best=Infinity;
      for(let dy=-3;dy<=3;dy++){
        const py=y+dy;if(py<0||py>=size)continue;
        for(let dx=-3;dx<=3;dx++){
          const px=x+dx;if(px<0||px>=size)continue;
          if(exposed[py*size+px]!==target)continue;
          const distance=Math.hypot(dx,dy);
          if(distance<best)best=distance;
        }
      }
      return best;
    };
    for(let y=0;y<size;y++){
      for(let x=0;x<size;x++){
        const show=exposed[y*size+x]===1;
        if(show){
          if(coastal&&distanceTo(x,y,0)<=1){
            out.setPixel(x,y,foam);
          }else{
            out.setPixel(x,y,underlay.getPixel(x,y));
          }
        }else{
          const d=distanceTo(x,y,1);
          if(coastal){
            if(d<=1)out.setPixel(x,y,wetOuter);
            else if(d<=3)out.setPixel(x,y,wetInner);
            else out.setPixel(x,y,primary.getPixel(x,y));
          }else{
            if(d<=1)out.setPixel(x,y,((x+y)&1)?shadow:dark);
            else if(d<=2&&((x*7+y*13)&3)===0)out.setPixel(x,y,shadow);
            else out.setPixel(x,y,primary.getPixel(x,y));
          }
        }
      }
    }
    return out;
  }
}
