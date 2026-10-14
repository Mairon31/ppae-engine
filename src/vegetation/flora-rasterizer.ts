import type {
  AnchorPoint, ArtStyleProfile, FloraBlossomHead, FloraLeafBlade,
  FloraMorphologyDescriptor, FloraStemSegment, FungalCapNode, RGBAColor
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { FLORA_SPECIES_CATALOG } from './flora-morphology';

export interface RenderedFloraArtifact {
  readonly buffer: PixelBuffer;
  readonly pivotTexel: readonly [number, number];
  readonly anchors: Readonly<Record<string, AnchorPoint>>;
  readonly descriptor: FloraMorphologyDescriptor;
  readonly opaquePixelCount: number;
  readonly floralPixelCount: number;
}
interface FoliageColorSet {
  readonly outline: RGBAColor;
  readonly shadow: RGBAColor;
  readonly midtone: RGBAColor;
  readonly highlight: RGBAColor;
}

/** Phase 3B: deterministic pixel-art botanical anatomy, without uniform five-stem combs. */
export class FloraBotanicalRasterizer {
  public renderFlora(
    descriptor: FloraMorphologyDescriptor,
    profile: ArtStyleProfile,
    windShiftTexels = 0
  ): RenderedFloraArtifact {
    const w = descriptor.canvasWidthTexels;
    const h = descriptor.canvasHeightTexels;
    const buffer = new PixelBuffer(w,h);
    const archetype = FLORA_SPECIES_CATALOG[descriptor.kind];
    if(!archetype)throw new Error('Unknown flora kind: '+descriptor.kind);
    const colors: FoliageColorSet = {
      outline: hexToRgba(archetype.foliagePalette.outlineHex),
      shadow: hexToRgba(archetype.foliagePalette.shadowHex),
      midtone: hexToRgba(archetype.foliagePalette.midtoneHex),
      highlight: hexToRgba(archetype.foliagePalette.highlightHex)
    };
    const [pivotX,pivotY]=descriptor.pivotTexel;
    const rng=new SeededRNG(descriptor.seed ^ 0x3c91a4f2);
    if(descriptor.growthHabit!=='moss_carpet' && descriptor.growthHabit!=='floating_aquatic'){
      buffer.fillEllipse(pivotX,pivotY+1,Math.max(2,Math.floor(w*.25)),1,
        {r:15,g:23,b:42,a:90});
    }
    if(descriptor.growthHabit==='mycelium_colony'){
      this.renderMushroomColony(buffer,descriptor.fungalCaps,colors);
    }else if(descriptor.growthHabit==='moss_carpet'){
      this.renderMossCarpet(buffer,descriptor,colors,rng);
    }else if(descriptor.growthHabit==='floating_aquatic'){
      this.renderWaterLilyPads(buffer,descriptor,colors,windShiftTexels);
    }else if(descriptor.growthHabit==='spiny_succulent'){
      this.renderSpinySucculentCactus(buffer,descriptor,colors,profile.moduleSize);
    }else{
      // Woody twigs remain partially visible between the leaf cushions.
      if(descriptor.growthHabit==='woody_cushion'){
        for(const stem of descriptor.stems){
          buffer.drawLine(pivotX,pivotY,stem.tipX,stem.tipY+2,colors.shadow,2);
        }
        this.renderShrubCushionMass(buffer,descriptor,colors,windShiftTexels,rng);
      }
      for(let i=0;i<descriptor.stems.length;i++){
        const stem=descriptor.stems[i];
        this.rasterizeCurvedStem(buffer,stem,pivotY,h,
          i%2===0?colors.midtone:colors.shadow,colors.highlight,windShiftTexels);
      }
      for(const leaf of descriptor.leaves){
        this.rasterizeLeafBlade(buffer,leaf,pivotY,h,colors,windShiftTexels);
      }
    }
    // Capture the actual newly-painted floral texels; never estimate by a bounding rectangle.
    const floralCells=new Set<number>();
    for(const blossom of descriptor.blossoms){
      this.rasterizeBlossomHead(buffer,blossom,pivotY,h,windShiftTexels,floralCells);
    }
    if(profile.outlineMode!=='none')buffer.applySelectiveOutline(colors.outline);
    return {
      buffer,pivotTexel:[pivotX,pivotY],
      anchors:{base_pivot:{
        id:'base_pivot',texelX:pivotX,texelY:pivotY,
        normalizedX:pivotX/w,normalizedY:pivotY/h
      }},
      descriptor,opaquePixelCount:this.countOpaquePixels(buffer),
      floralPixelCount:floralCells.size
    };
  }

  /** Quadratic Bézier stems with base-anchored wind sway and species-specific thorns. */
  private rasterizeCurvedStem(
    buf:PixelBuffer,stem:FloraStemSegment,pivotY:number,canvasH:number,
    stemColor:RGBAColor,highlight:RGBAColor,wind:number
  ):void{
    const length=Math.hypot(stem.controlX-stem.baseX,stem.controlY-stem.baseY)+
      Math.hypot(stem.tipX-stem.controlX,stem.tipY-stem.controlY);
    const steps=Math.max(6,Math.ceil(length*1.8));
    for(let s=0;s<=steps;s++){
      const t=s/steps,inv=1-t;
      const rawX=inv*inv*stem.baseX+2*inv*t*stem.controlX+t*t*stem.tipX;
      const rawY=inv*inv*stem.baseY+2*inv*t*stem.controlY+t*t*stem.tipY;
      const heightRatio=Math.max(0,(pivotY-rawY)/Math.max(1,canvasH));
      const px=Math.round(rawX)+Math.round(heightRatio*wind);
      const py=Math.round(rawY);
      buf.setPixel(px,py,t>.72?highlight:stemColor);
      if(stem.thicknessPx>1)buf.setPixel(px+1,py,stemColor);
      if(stem.hasThorns && s>1 && s<steps && s%3===0){
        buf.setPixel(px+((Math.floor(s/3)%2===0)?-1:1),py,highlight);
      }
    }
  }

  /** Seven shapes: grass, lanceolate, fern, shrub, tropical, floating and thorn leaves. */
  private rasterizeLeafBlade(
    buf:PixelBuffer,leaf:FloraLeafBlade,pivotY:number,canvasH:number,
    colors:FoliageColorSet,wind:number
  ):void{
    const sx=Math.round(Math.max(0,(pivotY-leaf.attachY)/Math.max(1,canvasH))*wind);
    const ax=leaf.attachX+sx,ay=leaf.attachY;
    const tx=leaf.tipX+sx,ty=leaf.tipY;
    const tone=leaf.toneBand==='highlight'?colors.highlight:
      leaf.toneBand==='midtone'?colors.midtone:colors.shadow;
    if(leaf.shape==='serrated_fern'){
      buf.drawLine(ax,ay,tx,ty,colors.midtone,1);
      const steps=Math.max(2,Math.ceil(Math.hypot(tx-ax,ty-ay)));
      for(let s=1;s<=steps;s+=2){
        const t=s/steps,px=Math.round(ax+(tx-ax)*t),py=Math.round(ay+(ty-ay)*t);
        buf.setPixel(px,py-1,colors.highlight);
        buf.setPixel(px,py+1,colors.shadow);
      }
      return;
    }
    if(leaf.shape==='broad_tropical'||leaf.shape==='ovate_shrub'){
      const cx=Math.round((ax+tx)*.5),cy=Math.round((ay+ty)*.5);
      const rx=leaf.shape==='broad_tropical'?Math.max(2,leaf.widthPx+1):
        Math.max(2,leaf.widthPx);
      buf.fillEllipse(cx,cy,rx,leaf.shape==='broad_tropical'?3:2,tone);
      buf.drawLine(ax,ay,tx,ty,colors.highlight,1);
      return;
    }
    if(leaf.shape==='floating_pad'){
      const cx=Math.round((ax+tx)*.5),cy=Math.round((ay+ty)*.5);
      buf.fillEllipse(cx,cy,Math.max(2,leaf.widthPx+1),2,tone);
      buf.setPixel(cx+leaf.widthPx,cy,{r:0,g:0,b:0,a:0});
      return;
    }
    if(leaf.shape==='thorn_stem'){
      buf.drawLine(ax,ay,tx,ty,colors.shadow,1);
      buf.setPixel(tx,ty-1,colors.highlight);
      return;
    }
    buf.drawLine(ax,ay,tx,ty,tone,1);
    if(leaf.shape==='lanceolate'){
      buf.setPixel(Math.round((ax+tx)*.5),Math.round((ay+ty)*.5)-1,colors.highlight);
    }
    if(leaf.shape==='linear_grass'){
      const mx=Math.round(ax*.45+tx*.55),my=Math.round(ay*.45+ty*.55);
      buf.setPixel(mx,my,colors.highlight);
    }
  }

  /** Local cushions vary by geometry and foliage stamp instead of 3 fixed ovals. */
  private renderShrubCushionMass(
    buf:PixelBuffer,desc:FloraMorphologyDescriptor,
    colors:FoliageColorSet,wind:number,rng:SeededRNG
  ):void{
    for(const stem of desc.stems){
      const cx=stem.tipX+Math.round((desc.pivotTexel[1]-stem.tipY)/desc.canvasHeightTexels*wind);
      const cy=stem.tipY+1;
      const rx=rng.nextInt(2,4),ry=rng.nextInt(2,3);
      buf.fillEllipse(cx,cy+1,rx,ry,colors.shadow);
      buf.fillEllipse(cx-1,cy,Math.max(1,rx-1),Math.max(1,ry-1),colors.midtone);
      buf.setPixel(cx-1,cy-1,colors.highlight);
    }
  }

  private renderMossCarpet(
    buf:PixelBuffer,desc:FloraMorphologyDescriptor,
    colors:FoliageColorSet,rng:SeededRNG
  ):void{
    const [px,py]=desc.pivotTexel;
    for(let i=0;i<desc.stems.length+3;i++){
      const x=px+rng.nextInt(-Math.floor(buf.width*.32),Math.floor(buf.width*.32));
      const y=py-rng.nextInt(1,3);
      buf.fillEllipse(x,y,3,2,colors.shadow);
      buf.fillEllipse(x,y-1,2,1,colors.midtone);
      buf.setPixel(x-1,y-1,colors.highlight);
    }
  }

  private renderWaterLilyPads(
    buf:PixelBuffer,desc:FloraMorphologyDescriptor,
    colors:FoliageColorSet,wind:number
  ):void{
    for(let i=0;i<desc.stems.length;i++){
      const s=desc.stems[i],rx=i===0?4:3,ry=i===0?3:2;
      const cx=s.baseX+Math.round(wind*.15),cy=s.baseY-2;
      buf.fillEllipse(cx,cy+1,rx,ry,colors.shadow);
      buf.fillEllipse(cx,cy,rx,ry,colors.midtone);
      buf.fillEllipse(cx-1,cy-1,Math.max(1,rx-2),Math.max(1,ry-1),colors.highlight);
      // Characteristic slit from edge toward the petiole.
      buf.setPixel(cx+rx,cy,{r:0,g:0,b:0,a:0});
      buf.setPixel(cx+rx-1,cy,{r:0,g:0,b:0,a:0});
    }
  }

  private renderSpinySucculentCactus(
    buf:PixelBuffer,desc:FloraMorphologyDescriptor,
    colors:FoliageColorSet,mod:number
  ):void{
    const [cx,base]=desc.pivotTexel;
    const height=Math.max(6,Math.floor(buf.height*.68)),top=base-height;
    buf.fillRect(cx-2,top,5,height,colors.midtone);
    buf.drawLine(cx-1,top+1,cx-1,base-1,colors.highlight,1);
    buf.drawLine(cx+2,top+1,cx+2,base-1,colors.shadow,1);
    const left=base-Math.floor(height*.55);
    buf.fillRect(cx-5,left,3,2,colors.midtone);
    buf.fillRect(cx-5,left-Math.max(3,mod-1),2,Math.max(3,mod-1),colors.highlight);
    if(desc.stems.length>=2){
      const right=base-Math.floor(height*.42);
      buf.fillRect(cx+3,right,3,2,colors.shadow);
      buf.fillRect(cx+4,right-Math.max(2,mod-2),2,Math.max(2,mod-2),colors.midtone);
    }
    for(let y=top+3;y<base-1;y+=3){
      buf.setPixel(cx-3,y,colors.highlight);
      buf.setPixel(cx+3,y+1,colors.shadow);
    }
  }

  private renderMushroomColony(
    buf:PixelBuffer,caps:readonly FungalCapNode[],colors:FoliageColorSet
  ):void{
    for(const node of caps){
      const stem=hexToRgba(node.stemColorHex),
        cap=hexToRgba(node.capColorHex),spot=hexToRgba(node.spotColorHex);
      buf.drawLine(node.stemBaseX,node.stemBaseY,
        node.capCenterX,node.capCenterY+1,stem,2);
      buf.drawLine(node.capCenterX-node.capRadiusX+1,node.capCenterY+1,
        node.capCenterX+node.capRadiusX-1,node.capCenterY+1,colors.shadow,1);
      buf.fillEllipse(node.capCenterX,node.capCenterY,
        node.capRadiusX,node.capRadiusY,cap);
      if(node.hasSpots){
        buf.setPixel(node.capCenterX-1,node.capCenterY-1,spot);
        if(node.capRadiusX>=3)buf.setPixel(node.capCenterX+1,node.capCenterY,spot);
      }
    }
  }

  /**
   * Five anatomical corolla families. Unique pixel masks count actual
   * in-bounds flower texels independently from overlap or petal collision.
   */
  private rasterizeBlossomHead(
    buf:PixelBuffer,blossom:FloraBlossomHead,pivotY:number,canvasH:number,
    wind:number,floralCells:Set<number>
  ):void{
    const shift=Math.round(Math.max(0,(pivotY-blossom.centerY)/Math.max(1,canvasH))*wind);
    const cx=blossom.centerX+shift,cy=blossom.centerY;
    const petal=hexToRgba(blossom.petalPrimaryHex);
    const highlight=hexToRgba(blossom.petalHighlightHex);
    const disk=hexToRgba(blossom.centerDiskHex);
    const paint=(x:number,y:number,c:RGBAColor)=>{
      if(x<0||x>=buf.width||y<0||y>=buf.height)return;
      buf.setPixel(x,y,c);
      floralCells.add(y*buf.width+x);
    };
    const rect=(x:number,y:number,w:number,h:number,c:RGBAColor)=>{
      for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)paint(xx,yy,c);
    };
    if(blossom.symmetry==='bell_campanula'){
      rect(cx-1,cy,3,2,highlight);
      rect(cx-2,cy+2,5,2,petal);
      paint(cx-2,cy+4,petal);paint(cx,cy+4,disk);paint(cx+2,cy+4,petal);
      return;
    }
    if(blossom.symmetry==='spike_inflorescence'){
      const height=Math.max(3,blossom.petalRadiusPx*2);
      for(let dy=0;dy<height;dy++){
        paint(cx,cy-dy,dy%2===0?highlight:petal);
        paint(cx-1,cy-dy,petal);
        if(dy===height-1)paint(cx,cy-dy-1,disk);
      }
      return;
    }
    if(blossom.symmetry==='cup_tulip'){
      rect(cx-2,cy-1,5,2,petal);
      paint(cx-2,cy-2,highlight);
      paint(cx,cy-2,disk);
      paint(cx+2,cy-2,highlight);
      return;
    }
    if(blossom.symmetry==='none')return;
    const count=Math.max(4,blossom.petalCount);
    const radius=Math.max(1,blossom.petalRadiusPx);
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+blossom.orientationAngleRad;
      const x=Math.round(cx+Math.cos(a)*radius),y=Math.round(cy+Math.sin(a)*radius);
      paint(x,y,y<=cy?highlight:petal);
      if(blossom.symmetry==='umbel_cluster'){
        paint(x+Math.sign(Math.cos(a)),y,petal);
      }
    }
    paint(cx,cy,disk);
  }

  private countOpaquePixels(buf:PixelBuffer):number{
    let count=0;
    for(let i=3;i<buf.data.length;i+=4)if(buf.data[i]>0)count++;
    return count;
  }
}
