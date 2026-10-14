import type {
  AnchorPoint,
  ArtStyleProfile,
  GeologicalFacetPlane,
  GeologicalFractureLine,
  GeologicalMorphologyDescriptor,
  MineralInclusionCluster,
  RGBAColor,
  RockSubFragment
} from '../core/contracts';
import { fnv1aHash32 } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { GEOLOGICAL_ARCHETYPE_CATALOG } from './geology-morphology';

export type GeologicalRenderState = 'intact' | 'damaged' | 'snowy' | 'wind_sway';

export interface RenderedGeologicalArtifact {
  readonly buffer: PixelBuffer;
  readonly pivotTexel: readonly [number, number];
  readonly anchors: Readonly<Record<string, AnchorPoint>>;
  readonly descriptor: GeologicalMorphologyDescriptor;
  readonly opaquePixelCount: number;
  readonly mineralPixelCount: number;
}

interface StoneColorSet {
  readonly outline: RGBAColor;
  readonly deepShadow: RGBAColor;
  readonly midtone: RGBAColor;
  readonly highlight: RGBAColor;
  readonly accent: RGBAColor;
  readonly mossMid: RGBAColor;
  readonly mossHigh: RGBAColor;
}

/**
 * Phase 2B — pixel-perfect faceted geological formations.
 * Polygon faces and cracks use the 2A topology, never concentric stone ellipses.
 */
export class GeologicalFormationRasterizer {
  public renderGeologicalFormation(
    descriptor: GeologicalMorphologyDescriptor,
    profile: ArtStyleProfile,
    stateTag: GeologicalRenderState = 'intact'
  ): RenderedGeologicalArtifact {
    const w = descriptor.canvasWidthTexels;
    const h = descriptor.canvasHeightTexels;
    const buffer = new PixelBuffer(w, h);
    const archetype = GEOLOGICAL_ARCHETYPE_CATALOG[descriptor.kind];
    if (!archetype) throw new Error('Unknown geological kind: ' + descriptor.kind);
    const colors = this.resolveStoneColors(archetype, stateTag);
    const [pivotX, pivotY] = descriptor.pivotTexel;
    // Contact shadows remain beneath each rock fragment.
    for (const frag of descriptor.fragments) {
      const y = Math.min(h - 1, frag.centerY + frag.radiusY);
      buffer.fillEllipse(frag.centerX, y, Math.max(2, frag.radiusX + 1),
        Math.max(1, Math.floor(frag.radiusY * 0.38)),
        { r: 15, g: 23, b: 42, a: 105 });
    }
    for (const fragment of [...descriptor.fragments].sort((a,b) => a.zOrder-b.zOrder)) {
      this.rasterizeRockFragment(buffer, fragment, descriptor, colors, stateTag);
    }
    const mineralMask = new Set<number>();
    // Count distinct mineral texels, not an estimated rectangle area.
    for (const inclusion of descriptor.mineralInclusions) {
      this.rasterizeMineralInclusion(buffer, inclusion, colors.outline, stateTag, mineralMask);
    }
    if (profile.outlineMode !== 'none') buffer.applySelectiveOutline(colors.outline);
    return {
      buffer, pivotTexel: [pivotX,pivotY],
      anchors: {
        base_pivot: {
          id: 'base_pivot', texelX: pivotX, texelY: pivotY,
          normalizedX: pivotX / w, normalizedY: pivotY / h
        }
      },
      descriptor, opaquePixelCount: this.countOpaquePixels(buffer),
      mineralPixelCount: mineralMask.size
    };
  }

  private resolveStoneColors(
    archetype: (typeof GEOLOGICAL_ARCHETYPE_CATALOG)[keyof typeof GEOLOGICAL_ARCHETYPE_CATALOG],
    state: GeologicalRenderState
  ): StoneColorSet {
    const stone = archetype.stonePalette;
    return {
      outline: hexToRgba(stone.outlineHex),
      deepShadow: hexToRgba(stone.deepShadowHex),
      midtone: hexToRgba(stone.midtoneHex),
      highlight: hexToRgba(stone.highlightHex),
      accent: hexToRgba(state === 'snowy' ? '#eef6fa' : stone.accentHex),
      mossMid: hexToRgba(state === 'snowy' ? '#cbd5e1' : '#3f7d44'),
      mossHigh: hexToRgba(state === 'snowy' ? '#f8fafc' : '#6eb856')
    };
  }

  private rasterizeRockFragment(
    buf: PixelBuffer, frag: RockSubFragment, descriptor: GeologicalMorphologyDescriptor,
    colors: StoneColorSet, state: GeologicalRenderState
  ): void {
    for (const facet of frag.facets) {
      this.rasterizeFacetTriangle(buf, facet, frag, descriptor.metrics.angularityScore, colors, state);
    }
    const archetype = GEOLOGICAL_ARCHETYPE_CATALOG[descriptor.kind];
    const veinTone = archetype.mineralPalette
      ? hexToRgba(archetype.mineralPalette.veinMidtoneHex)
      : descriptor.kind === 'volcanic_basalt' ? colors.accent : colors.deepShadow;
    for (const fracture of frag.fractures) {
      this.rasterizeFractureLine(buf, fracture, colors, veinTone);
    }
    if (frag.mossCoverageRatio > 0.15 || state === 'snowy') {
      const coverage = state === 'snowy' ? .65 : frag.mossCoverageRatio;
      const minX = Math.max(1,frag.centerX-frag.radiusX);
      const maxX = Math.min(buf.width-2,frag.centerX+frag.radiusX);
      const minY = Math.max(1,frag.centerY-frag.radiusY);
      const maxY = Math.min(buf.height-2,
        frag.centerY-Math.floor(frag.radiusY*(1-coverage*.85)));
      for (let y=minY;y<=maxY;y++) {
        for (let x=minX;x<=maxX;x++) {
          if (!buf.isOpaque(x,y)) continue;
          // Spatially hashed patches, stable across draw order.
          const patch = (fnv1aHash32(`${descriptor.seed}::moss::${frag.fragmentId}::${x},${y}`) & 255)/255;
          if (patch <= coverage) {
            buf.setPixel(x,y, y===minY || patch<coverage*.45
              ? colors.mossHigh : colors.mossMid);
          }
        }
      }
    }
  }

  /** Barycentric triangle fill using integer texel centers and discrete tones. */
  private rasterizeFacetTriangle(
    buf: PixelBuffer, facet: GeologicalFacetPlane, frag: RockSubFragment,
    angularity: number, colors: StoneColorSet, state: GeologicalRenderState
  ): void {
    const [a,b,c] = facet.vertices;
    const minX = Math.max(0,Math.min(a.x,b.x,c.x));
    const maxX = Math.min(buf.width-1,Math.max(a.x,b.x,c.x));
    const minY = Math.max(0,Math.min(a.y,b.y,c.y));
    const maxY = Math.min(buf.height-1,Math.max(a.y,b.y,c.y));
    const denom = (b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
    if (Math.abs(denom)<1e-5) return;
    const tone = facet.toneBand === 'highlight' ? colors.highlight
      : facet.toneBand === 'midtone' ? colors.midtone
      : facet.toneBand === 'rim_accent' ? colors.accent : colors.deepShadow;
    for(let y=minY;y<=maxY;y++) {
      for(let x=minX;x<=maxX;x++) {
        const w0=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/denom;
        const w1=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/denom;
        const w2=1-w0-w1;
        if(w0<-.04 || w1<-.04 || w2<-.04) continue;
        let color=tone;
        if(angularity>.65 && (w1<.16 || w2<.16) && w0>.2 && facet.faceLightScore>.2) {
          color=colors.accent;
        }
        if(frag.strataLineSpacingPx && (y+Math.floor(x*.25))%frag.strataLineSpacingPx===0){
          color=facet.toneBand === 'shadow' ? colors.outline : colors.deepShadow;
        }
        if(state==='damaged' && ((x*13+y*29)&15)===0) color=colors.outline;
        buf.setPixel(x,y,color);
      }
    }
  }

  /** Inlaid cracks with a bevel and ore traces, clipped to existing rock surfaces. */
  private rasterizeFractureLine(
    buf: PixelBuffer, fracture: GeologicalFractureLine,
    colors: StoneColorSet, veinTone: RGBAColor
  ): void {
    for(let i=0;i<fracture.points.length-1;i++){
      const a=fracture.points[i], b=fracture.points[i+1];
      const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*2));
      for(let s=0;s<=steps;s++){
        const t=s/steps;
        const x=Math.round(a.x+(b.x-a.x)*t);
        const y=Math.round(a.y+(b.y-a.y)*t);
        if(!buf.isOpaque(x,y))continue;
        buf.setPixel(x,y,fracture.hostsMineralVein ? veinTone : colors.outline);
        if(buf.isOpaque(x,y+1)){
          buf.setPixel(x,y+1, fracture.hostsMineralVein ? colors.accent : colors.highlight);
        }
      }
    }
  }

  /**
   * Geode cavities, faceted emergent prisms, embedded branching veins and
   * ore nodules. Return a precise set of modified in-bounds mineral pixels.
   */
  private rasterizeMineralInclusion(
    buf: PixelBuffer,
    inc: MineralInclusionCluster,
    outline: RGBAColor,
    state: GeologicalRenderState,
    mineralMask: Set<number>
  ): void {
    const mid=hexToRgba(inc.primaryHex);
    const highlight=hexToRgba(inc.highlightHex);
    const glow=hexToRgba(inc.coreGlowHex);
    const paint=(x:number,y:number,c:RGBAColor,requiresRock=false):void=>{
      if(x<0||x>=buf.width||y<0||y>=buf.height)return;
      if(requiresRock&&!buf.isOpaque(x,y))return;
      buf.setPixel(x,y,c);
      mineralMask.add(y*buf.width+x);
    };
    if(inc.shape==='geode_cavity'){
      const rx=Math.max(2,inc.widthPx+1);
      const ry=Math.max(2,Math.floor(inc.lengthPx*.55));
      // The cavity is cut out of the host rock rather than a floating square.
      for(let dy=-ry-1;dy<=ry+1;dy++){
        for(let dx=-rx-1;dx<=rx+1;dx++){
          const n=(dx*dx)/((rx+1)*(rx+1))+(dy*dy)/((ry+1)*(ry+1));
          if(n>1)continue;
          const inside=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry);
          paint(inc.centerX+dx,inc.centerY+dy,
            inside<.44 ? outline : inside<.77 ? mid : highlight);
        }
      }
      paint(inc.centerX-1,inc.centerY-1,glow);
      return;
    }
    if(inc.shape==='hex_crystal_spire'){
      const len=state==='damaged'?Math.max(2,inc.lengthPx-2):inc.lengthPx;
      const directionX=Math.sin(inc.tiltAngleRad);
      const directionY=-Math.cos(inc.tiltAngleRad);
      for(let s=0;s<=len;s++){
        const cx=Math.round(inc.centerX+directionX*s);
        const cy=Math.round(inc.centerY+directionY*s);
        const half=s>=len-1?0:Math.max(1,Math.floor(inc.widthPx*.5));
        for(let dx=-half;dx<=half;dx++){
          const tone=s===len?glow:dx<0?highlight:dx===0?mid:outline;
          paint(cx+dx,cy,tone);
        }
      }
      return;
    }
    if(inc.shape==='embedded_vein'){
      const vx=Math.cos(inc.tiltAngleRad);
      const vy=Math.sin(inc.tiltAngleRad);
      for(let s=0;s<inc.lengthPx;s++){
        const x=Math.round(inc.centerX+vx*s);
        const y=Math.round(inc.centerY+vy*s);
        if(!buf.isOpaque(x,y))continue;
        paint(x,y,s===Math.floor(inc.lengthPx/2)?glow:mid,true);
        if(s%2===0)paint(x,y-1,highlight,true);
      }
      return;
    }
    for(let dy=-1;dy<=1;dy++){
      for(let dx=-1;dx<=1;dx++){
        paint(inc.centerX+dx,inc.centerY+dy,
          dx<0&&dy<0?glow:dx<=0?highlight:mid,true);
      }
    }
  }

  private countOpaquePixels(buf:PixelBuffer):number{
    let n=0;
    for(let i=3;i<buf.data.length;i+=4)if(buf.data[i]>0)n++;
    return n;
  }
}
