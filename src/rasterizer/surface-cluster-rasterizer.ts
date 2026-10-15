/**
 * PPAE 3.0 / Phase 1B.1
 * Deterministic, binary-alpha 2.5D surface synthesis over a union of geometric
 * parts. This standalone renderer is deliberately not substituted for any
 * existing creature/tree renderer until dedicated visual integration tests.
 */
import type { RGBAColor } from '../core/contracts';
import { PixelBuffer } from './pixel-buffer';
import {
  getUnifiedSurfaceDetailBudget, getResolutionSpaceSpec, resolveTileAndAnchorLayout,
  type AnyGranularityProfileInput, type ResolvedTileAndAnchorLayout,
  type UnifiedSurfaceDetailBudget
} from '../core/resolution-contract-bridge';

export interface MaterialColorRamp30 {
  readonly materialId:string;
  /** Darkest to lightest; all alpha values must be 255. */
  readonly tones:readonly RGBAColor[];
  readonly outlineColor:RGBAColor;
  readonly specularThreshold?:number;
}
export type VolumePrimitiveKind='tapered-capsule'|'rounded-box'|'ellipsoid';
export interface SurfaceVolumePrimitive {
  readonly id:string;
  readonly kind:VolumePrimitiveKind;
  readonly materialId:string;
  /** Normalized coordinates in the safe content region. */
  readonly x0:number; readonly y0:number;
  readonly x1?:number; readonly y1?:number;
  readonly radius0:number; readonly radius1?:number;
  /** Higher zBase is visually closer to the camera. */
  readonly zBase:number;
  readonly blendSmoothness?:number;
  readonly surfaceClusterFrequency?:number;
  readonly surfaceClusterAmplitude?:number;
}
export interface DirectionalLightSpec {
  readonly dirX:number;readonly dirY:number;readonly dirZ:number;
  readonly ambientFloor:number;
}
export interface SurfaceRasterizationResult {
  readonly rgba:Uint8ClampedArray;
  readonly pixelBuffer:PixelBuffer;
  readonly width:number;readonly height:number;
  readonly layout:ResolvedTileAndAnchorLayout;
  readonly budget:UnifiedSurfaceDetailBudget;
  readonly toneIndexBuffer:Int16Array;
  readonly materialIndexBuffer:Int16Array;
  readonly normalXBuffer:Float32Array;
  readonly normalYBuffer:Float32Array;
  readonly normalZBuffer:Float32Array;
}

const DEFAULT_LIGHT:DirectionalLightSpec={
  dirX:-0.48,dirY:-0.58,dirZ:0.66,ambientFloor:0.18
};
const clamp=(v:number,a:number,b:number):number=>Math.min(b,Math.max(a,v));
const lerp=(a:number,b:number,t:number):number=>a+(b-a)*t;

export function hashDeterministicTexel(seed:number,x:number,y:number,salt=0):number {
  let h=(seed ^ Math.imul(x,374761393) ^
    Math.imul(y,668265263) ^ Math.imul(salt,1442695041))>>>0;
  h=Math.imul(h^(h>>>13),1274126177)>>>0;
  return ((h^(h>>>16))>>>0)/4294967295;
}

function clusterNoise(seed:number,x:number,y:number,cell:number):number {
  const gx=Math.floor(x/cell),gy=Math.floor(y/cell);
  const fx=(x-gx*cell)/cell,fy=(y-gy*cell)/cell;
  const smooth=(t:number)=>t*t*(3-2*t);
  const u=smooth(fx),v=smooth(fy);
  const a=lerp(hashDeterministicTexel(seed,gx,gy,101),
               hashDeterministicTexel(seed,gx+1,gy,101),u);
  const b=lerp(hashDeterministicTexel(seed,gx,gy+1,101),
               hashDeterministicTexel(seed,gx+1,gy+1,101),u);
  return 2*lerp(a,b,v)-1;
}

type Sample={sdf:number;radius:number;h:number};
type Box=Readonly<{x:number;y:number;width:number;height:number}>;
/** SDF is in texels, while height is pseudo-Z in texels. */
function samplePrimitive(p:SurfaceVolumePrimitive,x:number,y:number,b:Box):Sample {
  const dim=Math.min(b.width,b.height);
  const ax=b.x+p.x0*b.width,ay=b.y+p.y0*b.height;
  const r0=Math.max(0.5,p.radius0*dim);
  let sdf:number,radius:number;
  if(p.kind==='tapered-capsule'){
    const bx=b.x+(p.x1??p.x0)*b.width;
    const by=b.y+(p.y1??p.y0)*b.height;
    const vx=bx-ax,vy=by-ay;
    const t=clamp(((x-ax)*vx+(y-ay)*vy)/Math.max(1e-9,vx*vx+vy*vy),0,1);
    const cx=ax+t*vx,cy=ay+t*vy;
    radius=Math.max(0.4,lerp(r0,Math.max(0.4,(p.radius1??p.radius0)*dim),t));
    sdf=Math.hypot(x-cx,y-cy)-radius;
  }else if(p.kind==='rounded-box'){
    const x1=b.x+(p.x1??p.x0+0.2)*b.width;
    const y1=b.y+(p.y1??p.y0+0.2)*b.height;
    const cx=(ax+x1)/2,cy=(ay+y1)/2;
    const hx=Math.max(0.5,Math.abs(x1-ax)/2);
    const hy=Math.max(0.5,Math.abs(y1-ay)/2);
    const corner=Math.min(r0,hx,hy)*0.45;
    const qx=Math.abs(x-cx)-hx+corner;
    const qy=Math.abs(y-cy)-hy+corner;
    sdf=Math.hypot(Math.max(0,qx),Math.max(0,qy))+
      Math.min(0,Math.max(qx,qy))-corner;
    radius=Math.max(hx,hy);
  }else{
    const rx=Math.max(0.5,p.radius0*b.width);
    const ry=Math.max(0.5,(p.radius1??p.radius0)*b.height);
    radius=Math.sqrt(rx*ry);
    sdf=(Math.hypot((x-ax)/rx,(y-ay)/ry)-1)*Math.min(rx,ry);
  }
  const depth=clamp(-sdf/Math.max(0.5,radius),0,1);
  const h=p.zBase*dim+radius*Math.sqrt(Math.max(0,depth*(2-depth)));
  return {sdf,radius,h};
}
function smoothMin(a:number,b:number,k:number):number {
  if(k<=1e-6)return Math.min(a,b);
  const h=clamp(0.5+0.5*(b-a)/k,0,1);
  return lerp(b,a,h)-k*h*(1-h);
}
function checkFinite(label:string,n:number):void {
  if(!Number.isFinite(n))throw new RangeError(label+' must be finite');
}
function checkColor(c:RGBAColor):void {
  for(const k of ['r','g','b','a'] as const){
    if(!Number.isInteger(c[k])||c[k]<0||c[k]>255)
      throw new RangeError('Invalid RGBA channel '+k);
  }
  if(c.a!==255)throw new RangeError('Material color ramps require opaque tones');
}
function validateGeometry(
  primitives:readonly SurfaceVolumePrimitive[],
  materials:Readonly<Record<string,MaterialColorRamp30>>,
  budget:UnifiedSurfaceDetailBudget
):string[]{
  const keys=Object.keys(materials);
  if(!keys.length||keys.length>32766)throw new RangeError('Invalid material count');
  for(const key of keys){
    const m=materials[key];
    if(m.materialId!==key||!m.tones.length)
      throw new RangeError('Missing, empty or mismatched material ramp: '+key);
    m.tones.forEach(checkColor);checkColor(m.outlineColor);
    if(m.tones.length>256)throw new RangeError('Ramp has too many tones: '+key);
  }
  if(primitives.length>1024)throw new RangeError('Too many surface primitives');
  for(const p of primitives){
    if(!materials[p.materialId])throw new RangeError('Unregistered material: '+p.materialId);
    for(const [name,value] of Object.entries({
      x0:p.x0,y0:p.y0,x1:p.x1??p.x0,y1:p.y1??p.y0,
      radius0:p.radius0,radius1:p.radius1??p.radius0,
      zBase:p.zBase,blendSmoothness:p.blendSmoothness??0,
      surfaceClusterAmplitude:p.surfaceClusterAmplitude??0,
      surfaceClusterFrequency:p.surfaceClusterFrequency??1
    }))checkFinite(p.id+'.'+name,value);
    if(!p.id||p.radius0<=0||(p.radius1!==undefined&&p.radius1<=0)||
      (p.blendSmoothness??0)<0||(p.surfaceClusterFrequency??1)<=0 ||
      (p.surfaceClusterAmplitude??0)<0)
      throw new RangeError('Invalid primitive: '+p.id);
  }
  // A budget governs output tones; it is intentionally not a requirement
  // that every supplied ramp have that many entries.
  if(budget.maxRampTonesPerMaterial<1)throw new RangeError('Invalid palette budget');
  return keys;
}

/**
 * Static API: seeded surface and indexed structural buffers. Native synthesis
 * occurs in a MODULE-sized canvas by default, independent of tile dimensions.
 * To rasterize a full world tile, explicitly pass logicalWidthUnits=1,
 * logicalHeightUnits=1. Arguments are measured in logical WORLD TILES.
 */
export class SurfaceClusterRasterizer {
  public renderSurface(input:{
    readonly profile:AnyGranularityProfileInput;
    readonly seed:number;
    readonly logicalWidthUnits?:number;
    readonly logicalHeightUnits?:number;
    readonly primitives:readonly SurfaceVolumePrimitive[];
    readonly materials:Readonly<Record<string,MaterialColorRamp30>>;
    readonly light?:Partial<DirectionalLightSpec>;
  }):SurfaceRasterizationResult {
    if(!Number.isSafeInteger(input.seed))throw new RangeError('Seed must be a safe integer');
    const space=getResolutionSpaceSpec(input.profile);
    const defaultExtent=space.artModuleSize/space.canonicalTileTexelSize;
    const layout=resolveTileAndAnchorLayout(
      input.profile,input.logicalWidthUnits??defaultExtent,
      input.logicalHeightUnits??defaultExtent
    );
    const budget=getUnifiedSurfaceDetailBudget(input.profile);
    const w=layout.widthTexels,h=layout.heightTexels,size=w*h;
    if(size>1_048_576)throw new RangeError('Surface raster exceeds one million texels');
    const materials=validateGeometry(input.primitives,input.materials,budget);
    const source=[...input.primitives].sort((a,b)=>a.zBase-b.zBase||a.id.localeCompare(b.id));
    const light={...DEFAULT_LIGHT,...input.light};
    for(const [key,value] of Object.entries(light))checkFinite('light.'+key,value);
    if(light.ambientFloor<0||light.ambientFloor>1)
      throw new RangeError('Ambient floor must be in [0,1]');
    const len=Math.hypot(light.dirX,light.dirY,light.dirZ);
    if(len<1e-6)throw new RangeError('Light direction must be nonzero');
    const lx=light.dirX/len,ly=light.dirY/len,lz=light.dirZ/len;
    const box=layout.safeContentBoxTexels;
    const minDim=Math.min(box.width,box.height);

    const mask=new Int16Array(size).fill(-1);
    const tone=new Int16Array(size).fill(-1);
    const heights=new Float32Array(size);
    const noise=new Float32Array(size);
    const nx=new Float32Array(size),ny=new Float32Array(size),nz=new Float32Array(size);
    const ambient=new Float32Array(size).fill(1);

    // Pass 1: seamless SDF union for the silhouette and higher-Z material
    // assignment. Blending adjacent same-material segments connects branches.
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,px=x+0.5,py=y+0.5;
      let distance=Infinity,owner=-1,nearest=Infinity,height=-Infinity,crease=0,texNoise=0;
      for(let j=0;j<source.length;j++){
        const p=source[j],s=samplePrimitive(p,px,py,box);
        const mat=materials.indexOf(p.materialId);
        const blend=(p.blendSmoothness??0)*minDim;
        if(owner===mat&&Number.isFinite(distance))
          distance=smoothMin(distance,s.sdf,blend);
        else distance=Math.min(distance,s.sdf);
        // Distinct overlapping materials are occluded by the closest Z plane,
        // not accidentally selected by whichever array entry came last.
        if(s.sdf<nearest)nearest=s.sdf;
        if(s.sdf<=0&&(s.h>height || (s.h===height&&mat>owner))){
          if(height>-Infinity&&mat!==owner)
            crease=Math.max(crease,budget.ambientOcclusionStrength);
          height=s.h;owner=mat;
          const scale=Math.max(1,Math.round(
            Math.sqrt(budget.minClusterAreaTexels)/(p.surfaceClusterFrequency??1)));
          texNoise=budget.enableSurfaceClusters
            ?clusterNoise(input.seed^Math.imul(j+1,7907),x,y,scale)*
              (p.surfaceClusterAmplitude??0):0;
        }
      }
      if(distance<=0){
        // Smooth-union bridges may lie outside either source mask. Assign
        // the nearest source deterministically instead of cutting a hole.
        if(owner<0){
          let closest=Infinity;
          for(const p of source){
            const s=samplePrimitive(p,px,py,box);
            if(s.sdf<closest){closest=s.sdf;owner=materials.indexOf(p.materialId);height=s.h;}
          }
        }
        if(owner>=0){
          mask[i]=owner;heights[i]=height;
          ambient[i]=1-crease;noise[i]=texNoise;
        }
      }
    }

    // Pass 2: silhouette-aware finite differences in height, normalized
    // directional light and material-local color ramp quantization.
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,m=mask[i];
      if(m<0)continue;
      const center=heights[i];
      const left=x>0&&mask[i-1]>=0?heights[i-1]:center-1;
      const right=x<w-1&&mask[i+1]>=0?heights[i+1]:center-1;
      const up=y>0&&mask[i-w]>=0?heights[i-w]:center-1;
      const down=y<h-1&&mask[i+w]>=0?heights[i+w]:center-1;
      const gx=-(right-left)*0.5,gy=-(down-up)*0.5,gz=1.25;
      const n=Math.hypot(gx,gy,gz)||1;
      nx[i]=gx/n;ny[i]=gy/n;nz[i]=gz/n;
      const lit=Math.max(0,nx[i]*lx+ny[i]*ly+nz[i]*lz);
      const intensity=clamp(
        (light.ambientFloor+(1-light.ambientFloor)*lit)*
        budget.directionalContrastBoost*ambient[i]+noise[i],0,1);
      const ramp=input.materials[materials[m]].tones;
      const steps=Math.min(ramp.length,budget.maxRampTonesPerMaterial);
      tone[i]=Math.min(steps-1,Math.floor(intensity*steps));
    }

    // Pass 3: suppress isolated tone pixels INSIDE the same material. Do not
    // alter the alpha mask or blur material boundaries.
    if(budget.minClusterAreaTexels>=2){
      const original=new Int16Array(tone);
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const i=y*w+x,m=mask[i];if(m<0)continue;
        const ns=[i-1,i+1,i-w,i+w].filter(j=>mask[j]===m);
        if(ns.length<3)continue;
        const counts=new Map<number,number>();
        ns.forEach(j=>counts.set(original[j],(counts.get(original[j])??0)+1));
        let best=original[i],votes=0;
        for(const [t,count] of counts)if(count>votes){best=t;votes=count;}
        if(votes>=3&&best!==original[i])tone[i]=best;
      }
    }

    // Pass 4: exact palette writes; transparent/opaque only.
    const rgba=new Uint8ClampedArray(size*4);
    for(let i=0;i<size;i++){
      const m=mask[i];if(m<0)continue;
      const ramp=input.materials[materials[m]].tones;
      const steps=Math.min(ramp.length,budget.maxRampTonesPerMaterial);
      const index=steps<=1?0:Math.round(tone[i]*(ramp.length-1)/(steps-1));
      const c=ramp[index],o=i*4;
      rgba[o]=c.r;rgba[o+1]=c.g;rgba[o+2]=c.b;rgba[o+3]=255;
    }

    // Pass 5: silhouette border (inside the shape; never detached external
    // outlines). Miter only suppresses double-thick stair elbow pixels.
    if(budget.outlineMode!=='none'){
      const edge=new Uint8Array(size);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const i=y*w+x;if(mask[i]<0)continue;
        if(x===0||y===0||x===w-1||y===h-1||
          mask[i-1]<0||mask[i+1]<0||mask[i-w]<0||mask[i+w]<0)
          edge[i]=1;
      }
      const old=new Uint8Array(edge);
      if(budget.miterOutlineCorners)
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const i=y*w+x;if(!old[i])continue;
        const u=old[i-w],d=old[i+w],l=old[i-1],r=old[i+1];
        const support=[i-1,i+1,i-w,i+w].filter(j=>mask[j]>=0).length;
        if(support>=3&&((u&&l&&!d&&!r)||(u&&r&&!d&&!l)||
          (d&&l&&!u&&!r)||(d&&r&&!u&&!l)))edge[i]=0;
      }
      for(let i=0;i<size;i++){
        if(!edge[i])continue;
        const m=mask[i],ramp=input.materials[materials[m]];
        const facing=nx[i]*lx+ny[i]*ly+nz[i]*lz;
        const c=budget.outlineMode==='selective-dark'&&facing>0.35
          ?ramp.tones[0]:ramp.outlineColor;
        rgba[i*4]=c.r;rgba[i*4+1]=c.g;rgba[i*4+2]=c.b;rgba[i*4+3]=255;
      }
    }
    const pixelBuffer=new PixelBuffer(w,h);
    pixelBuffer.data.set(rgba);
    return {
      rgba,pixelBuffer,width:w,height:h,layout,budget,
      toneIndexBuffer:tone,materialIndexBuffer:mask,
      normalXBuffer:nx,normalYBuffer:ny,normalZBuffer:nz
    };
  }
}
