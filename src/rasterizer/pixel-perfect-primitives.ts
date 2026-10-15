/**
 * PPAE 3.0 / Phase 1B.2 — isolated pixel-perfect geometry primitives.
 * Binary alpha is deliberate. This code does not replace the existing
 * entity/tree rasterizers until their respective migration phases.
 */
import type { RGBAColor } from '../core/contracts';
import {
  getUnifiedSurfaceDetailBudget, type AnyGranularityProfileInput
} from '../core/resolution-contract-bridge';
import {
  hashDeterministicTexel, type MaterialColorRamp30
} from './surface-cluster-rasterizer';

export interface IntegerPoint2D { readonly x:number;readonly y:number }
export interface TaperedSegmentSpec {
  readonly x0:number;readonly y0:number;readonly x1:number;readonly y1:number;
  readonly radiusStartTexels:number;readonly radiusEndTexels:number;
  readonly taperExponent?:number;
  readonly ramp:MaterialColorRamp30;
  readonly lightDirX?:number;readonly lightDirY?:number;
  readonly seed?:number;
}
export interface PillowShadingAuditReport {
  readonly width:number;readonly height:number;
  readonly opaquePixelCount:number;
  readonly directionalAsymmetryScore:number;
  readonly concentricSymmetryRatio:number;
  /** Positive radial-luminance correlation is a prerequisite for this heuristic. */
  readonly radialLuminanceCorrelation:number;
  readonly hasPillowShadingDefect:boolean;
  readonly summary:string;
}
const clamp=(v:number,lo:number,hi:number):number=>Math.min(hi,Math.max(lo,v));
function finite(v:number,label:string):void {
  if(!Number.isFinite(v))throw new RangeError(label+' must be finite');
}
function validateBuffer(b:Uint8ClampedArray|Uint8Array,w:number,h:number):void {
  if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||
     w*h>16_777_216||b.length!==w*h*4)
    throw new RangeError('Invalid dimensions or RGBA length');
}
function checkColor(c:RGBAColor):void {
  for(const k of ['r','g','b','a'] as const)
    if(!Number.isSafeInteger(c[k])||c[k]<0||c[k]>255)
      throw new RangeError('Invalid color channel '+k);
  if(c.a!==255)throw new RangeError('Pixel-perfect primitives require opaque source colors');
}
function checkRamp(ramp:MaterialColorRamp30):void {
  if(!ramp.tones.length)throw new RangeError('Material ramp must not be empty');
  ramp.tones.forEach(checkColor);checkColor(ramp.outlineColor);
}
function setOpaque(b:Uint8ClampedArray,w:number,h:number,x:number,y:number,c:RGBAColor):void {
  if(x<0||y<0||x>=w||y>=h)return;
  const i=(y*w+x)*4;
  b[i]=c.r;b[i+1]=c.g;b[i+2]=c.b;b[i+3]=255;
}
/**
 * Eight-connected Bresenham trace. Corner cleanup removes only a redundant
 * orthogonal elbow connecting two diagonal neighbors; it never drops endpoints.
 */
export function tracePixelPerfectLine(
  x0:number,y0:number,x1:number,y1:number,removeLCorners=true
):readonly IntegerPoint2D[] {
  for(const [name,v] of Object.entries({x0,y0,x1,y1}))finite(v,name);
  let x=Math.round(x0),y=Math.round(y0);
  const tx=Math.round(x1),ty=Math.round(y1);
  if(![x,y,tx,ty].every(Number.isSafeInteger))
    throw new RangeError('Line endpoint out of safe integer range');
  const dx=Math.abs(tx-x),dy=Math.abs(ty-y);
  if(dx+dy>1_000_000)throw new RangeError('Excessively long pixel-perfect line');
  const sx=x<tx?1:-1,sy=y<ty?1:-1;
  let err=dx-dy;
  const pts:IntegerPoint2D[]=[];
  while(true){
    pts.push({x,y});
    if(x===tx&&y===ty)break;
    const e2=2*err;
    if(e2>-dy){err-=dy;x+=sx;}
    if(e2<dx){err+=dx;y+=sy;}
  }
  if(!removeLCorners||pts.length<3)return pts;
  const filtered:IntegerPoint2D[]=[pts[0]];
  for(let i=1;i<pts.length-1;i++){
    const prev=filtered[filtered.length-1],cur=pts[i],next=pts[i+1];
    const diag=Math.abs(next.x-prev.x)===1&&Math.abs(next.y-prev.y)===1;
    const elbow=(cur.x===prev.x&&cur.y===next.y)||
      (cur.y===prev.y&&cur.x===next.x);
    if(!diag||!elbow)filtered.push(cur);
  }
  filtered.push(pts[pts.length-1]);
  return filtered;
}
export function drawPixelPerfectLine(
  rgba:Uint8ClampedArray,width:number,height:number,
  x0:number,y0:number,x1:number,y1:number,color:RGBAColor,
  removeLCorners=true
):number {
  validateBuffer(rgba,width,height);checkColor(color);
  let count=0;
  for(const p of tracePixelPerfectLine(x0,y0,x1,y1,removeLCorners)){
    if(p.x>=0&&p.y>=0&&p.x<width&&p.y<height){
      setOpaque(rgba,width,height,p.x,p.y,color);count++;
    }
  }
  return count;
}
/**
 * Tapered stroke, interpolated across a segment. Pixel centers are sampled
 * without alpha blending. Lighting follows segment cross-section normals,
 * rather than concentric tone rings centered around the sprite bounding box.
 */
export function drawPixelPerfectTaperedSegment(
  rgba:Uint8ClampedArray,width:number,height:number,
  profile:AnyGranularityProfileInput,s:TaperedSegmentSpec
):void {
  validateBuffer(rgba,width,height);checkRamp(s.ramp);
  for(const [name,v] of Object.entries({
    x0:s.x0,y0:s.y0,x1:s.x1,y1:s.y1,
    radiusStart:s.radiusStartTexels,radiusEnd:s.radiusEndTexels,
    taper:s.taperExponent??1,lightX:s.lightDirX??-0.55,lightY:s.lightDirY??-0.55
  }))finite(v,name);
  if(s.radiusStartTexels<=0||s.radiusEndTexels<=0||
     (s.taperExponent??1)<=0)
    throw new RangeError('Taper radius and exponent must be positive');
  const b=getUnifiedSurfaceDetailBudget(profile);
  const allowed=Math.min(s.ramp.tones.length,b.maxRampTonesPerMaterial);
  const gamma=s.taperExponent??1;
  const dx=s.x1-s.x0,dy=s.y1-s.y0,lenSq=dx*dx+dy*dy,len=Math.sqrt(lenSq);
  if(len<1e-6){
    setOpaque(rgba,width,height,Math.round(s.x0),Math.round(s.y0),
      s.ramp.tones[Math.floor(allowed/2)]);return;
  }
  const px=-dy/len,py=dx/len;
  const rawLx=s.lightDirX??-0.55,rawLy=s.lightDirY??-0.55;
  const lightLen=Math.hypot(rawLx,rawLy,0.62);
  const lx=rawLx/lightLen,ly=rawLy/lightLen,lz=0.62/lightLen;
  const reach=Math.ceil(Math.max(s.radiusStartTexels,s.radiusEndTexels))+1;
  const fromX=Math.max(0,Math.floor(Math.min(s.x0,s.x1)-reach));
  const toX=Math.min(width-1,Math.ceil(Math.max(s.x0,s.x1)+reach));
  const fromY=Math.max(0,Math.floor(Math.min(s.y0,s.y1)-reach));
  const toY=Math.min(height-1,Math.ceil(Math.max(s.y0,s.y1)+reach));
  for(let y=fromY;y<=toY;y++)for(let x=fromX;x<=toX;x++){
    const cx=x+0.5,cy=y+0.5;
    const t=clamp(((cx-s.x0)*dx+(cy-s.y0)*dy)/lenSq,0,1);
    const taper=Math.pow(1-t,gamma);
    const radius=s.radiusEndTexels+
      (s.radiusStartTexels-s.radiusEndTexels)*taper;
    const ox=cx-(s.x0+dx*t),oy=cy-(s.y0+dy*t);
    const dist=Math.hypot(ox,oy);
    if(dist>radius)continue;
    const lateral=clamp((ox*px+oy*py)/Math.max(0.5,radius),-1,1);
    const sx=px*lateral,sy=py*lateral;
    const sz=Math.sqrt(Math.max(0,1-lateral*lateral));
    const illumination=Math.max(0,sx*lx+sy*ly+sz*lz);
    // Cluster-sized texel coordinates, avoiding a single-pixel white-noise
    // field in the detailed profiles.
    const cell=Math.max(1,Math.ceil(Math.sqrt(b.minClusterAreaTexels)));
    const texture=b.enableSurfaceClusters&&s.seed!==undefined
      ?(hashDeterministicTexel(s.seed,Math.floor(x/cell),Math.floor(y/cell),17)-0.5)*0.10:0;
    const lum=clamp(0.18+0.82*illumination+texture,0,0.999);
    const tone=Math.min(allowed-1,Math.floor(lum*allowed));
    const idx=allowed===1?0:Math.round(tone*(s.ramp.tones.length-1)/(allowed-1));
    const outline=radius>=1.5&&dist>=radius-0.8&&
      illumination<0.35&&b.outlineMode!=='none';
    setOpaque(rgba,width,height,x,y,
      outline?s.ramp.outlineColor:s.ramp.tones[idx]);
  }
}

/**
 * Scanline pixel-center fill for simple, even-odd polygons, concave allowed.
 * Material tonal clusters align with integer lattice cells. No smoothing.
 */
export function fillClusteredPolygon(
  rgba:Uint8ClampedArray,width:number,height:number,
  profile:AnyGranularityProfileInput,
  vertices:readonly IntegerPoint2D[],ramp:MaterialColorRamp30,
  options?:{readonly seed?:number;readonly gradientDirX?:number;
    readonly gradientDirY?:number;readonly drawOutline?:boolean}
):void {
  validateBuffer(rgba,width,height);checkRamp(ramp);
  if(vertices.length<3)return;
  if(vertices.length>4096)throw new RangeError('Polygon has too many vertices');
  for(const v of vertices){finite(v.x,'vertex.x');finite(v.y,'vertex.y');}
  const b=getUnifiedSurfaceDetailBudget(profile);
  const allowed=Math.min(ramp.tones.length,b.maxRampTonesPerMaterial);
  const gdx=options?.gradientDirX??-0.5,gdy=options?.gradientDirY??-0.7;
  finite(gdx,'gradientDirX');finite(gdy,'gradientDirY');
  const seed=options?.seed??101;
  if(!Number.isSafeInteger(seed))throw new RangeError('Polygon seed must be integer');
  const minX=Math.min(...vertices.map(v=>v.x));
  const maxX=Math.max(...vertices.map(v=>v.x));
  const minY=Math.min(...vertices.map(v=>v.y));
  const maxY=Math.max(...vertices.map(v=>v.y));
  const startY=Math.max(0,Math.ceil(minY-0.5));
  const endY=Math.min(height-1,Math.floor(maxY-0.5));
  const spanX=Math.max(1,maxX-minX),spanY=Math.max(1,maxY-minY);
  const cell=Math.max(1,Math.round(Math.sqrt(b.minClusterAreaTexels)));
  for(let y=startY;y<=endY;y++){
    const py=y+0.5,ints:number[]=[];
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],z=vertices[(i+1)%vertices.length];
      if((a.y<=py&&z.y>py)||(z.y<=py&&a.y>py))
        ints.push(a.x+(py-a.y)*(z.x-a.x)/(z.y-a.y));
    }
    ints.sort((a,z)=>a-z);
    for(let pair=0;pair+1<ints.length;pair+=2){
      const left=Math.max(0,Math.ceil(ints[pair]-0.5));
      const right=Math.min(width-1,Math.floor(ints[pair+1]-0.5));
      for(let x=left;x<=right;x++){
        const u=(x+0.5-minX)/spanX-0.5,v=(y+0.5-minY)/spanY-0.5;
        const noise=b.enableSurfaceClusters
          ?(hashDeterministicTexel(seed,Math.floor(x/cell),Math.floor(y/cell),43)-0.5)*0.16:0;
        const lum=clamp(0.55+(u*gdx+v*gdy)*0.65+noise,0,0.999);
        const tone=Math.min(allowed-1,Math.floor(lum*allowed));
        const idx=allowed===1?0:Math.round(tone*(ramp.tones.length-1)/(allowed-1));
        setOpaque(rgba,width,height,x,y,ramp.tones[idx]);
      }
    }
  }
  if(options?.drawOutline??b.outlineMode!=='none'){
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],z=vertices[(i+1)%vertices.length];
      drawPixelPerfectLine(rgba,width,height,a.x,a.y,z.x,z.y,
        ramp.outlineColor,b.miterOutlineCorners);
    }
  }
}
function luminosity(buf:Uint8Array|Uint8ClampedArray,i:number):number {
  return (buf[i]*0.299+buf[i+1]*0.587+buf[i+2]*0.114)/255;
}
/**
 * Heuristic for *probable* radial pillow shading, not an artistic certificate.
 * Requires (a) mirror-symmetric brightness and (b) brightness positively
 * correlated with inward radial proximity. Solid flat sprites are inconclusive.
 * No metric can prove correct lighting from RGBA pixels alone.
 */
export function auditPillowShadingAndBlobGeometry(
  rgba:Uint8ClampedArray|Uint8Array,width:number,height:number
):PillowShadingAuditReport {
  validateBuffer(rgba,width,height);
  let count=0,cx=0,cy=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(rgba[(y*width+x)*4+3]){
      count++;cx+=x;cy+=y;
    }
  }
  const basic=(summary:string):PillowShadingAuditReport=>({
    width,height,opaquePixelCount:count,
    directionalAsymmetryScore:0,concentricSymmetryRatio:0,
    radialLuminanceCorrelation:0,hasPillowShadingDefect:false,summary
  });
  if(count<16)return basic('Not enough occupied texels for radial shading diagnosis.');
  cx/=count;cy/=count;
  let n=0,sym=0,difference=0;
  let sd=0,sl=0,sdd=0,sll=0,sdl=0;
  const intensities=new Set<number>();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    if(!rgba[i+3])continue;
    const lum=luminosity(rgba,i);
    intensities.add(Math.round(lum*255));
    const radius=Math.hypot(x-cx,y-cy);
    // Inward distance is high near the center. Positive covariance
    // suggests radial bright-center bands (typical pillow shading).
    const depth=-radius;
    sd+=depth;sl+=lum;sdd+=depth*depth;
    sll+=lum*lum;sdl+=depth*lum;
    const mx=Math.round(2*cx-x),my=Math.round(2*cy-y);
    if(mx<0||my<0||mx>=width||my>=height||Math.abs(mx-x)+Math.abs(my-y)<2)
      continue;
    const j=(my*width+mx)*4;
    if(!rgba[j+3])continue;
    const delta=Math.abs(lum-luminosity(rgba,j));
    difference+=delta;n++;
    if(delta<0.02)sym++;
  }
  if(!n||intensities.size<3)
    return basic('Flat or low-variation image; pixel colors cannot diagnose pillow shading.');
  const covariance=count*sdl-sd*sl;
  const denom=Math.sqrt(Math.max(0,(count*sdd-sd*sd)*(count*sll-sl*sl)));
  const radial=denom>1e-10?covariance/denom:0;
  const ratio=sym/n,asym=clamp(6*difference/n,0,1);
  const defect=ratio>0.86&&asym<0.12&&radial>0.65;
  return {
    width,height,opaquePixelCount:count,
    directionalAsymmetryScore:asym,concentricSymmetryRatio:ratio,
    radialLuminanceCorrelation:radial,hasPillowShadingDefect:defect,
    summary:defect
      ?'Probable symmetric bright-center shading detected; inspect sprite manually.'
      :'No strong radial pillow-shading signature; visual review still required.'
  };
}
