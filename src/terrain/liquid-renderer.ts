import { ArtStyleProfile, AutotileMask8 } from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { normalizeAutotileMask47 } from './autotiler';
import { TERRAIN_MATERIALS } from './world-field';

export type LiquidKind = 'shallow_water' | 'deep_water' | 'lava_magma';

/**
 * Generador de líquidos animados cuyos fotogramas son simultáneamente:
 * 1. Espacialmente tileables (sin costuras entre tiles ni entre bordes de chunks).
 * 2. Temporalmente cíclicos (loop perfecto en N fotogramas).
 */
export class LiquidTileGenerator {
  public generateAnimatedFrame(
    kind: LiquidKind,
    frameIndex: number,
    totalFrames: number,
    autotileMask: AutotileMask8,
    profile: ArtStyleProfile
  ): PixelBuffer {
    const size = profile.canonicalTileTexels;
    const mat = TERRAIN_MATERIALS[kind];
    const buf = new PixelBuffer(size, size);
    const mask = normalizeAutotileMask47(autotileMask);

    const baseColor = hexToRgba(mat.baseColorHex);
    const shadowColor = hexToRgba(mat.shadowColorHex);
    const highlightColor = hexToRgba(mat.highlightColorHex);
    const foamColor = hexToRgba(mat.accentColorHex);

    buf.fillRect(0, 0, size, size, baseColor);

    // Fase temporal periódica exacta en [0, 2*PI)
    const phase = ((frameIndex % totalFrames) / totalFrames) * Math.PI * 2;
    const freqX = (Math.PI * 2) / size;
    const freqY = (Math.PI * 4) / size;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Onda periódica 2D que envuelve exactamente en x=0..size y y=0..size
        const waveA = Math.sin(x * freqX + phase + Math.sin(y * freqY) * 0.8);
        const waveB = Math.cos(y * freqX - phase + Math.cos(x * freqX) * 0.7);
        const combined = (waveA + waveB) * 0.5;

        if (combined > 0.62) {
          buf.setPixel(x, y, highlightColor);
        } else if (combined > 0.82) {
          buf.setPixel(x, y, foamColor);
        } else if (combined < -0.58) {
          buf.setPixel(x, y, shadowColor);
        }
      }
    }

    // A full water neighborhood has no shoreline: keep the animated wave.
    if(mask===255)return buf;

    const n=!!(mask&1),ne=!!(mask&2),e=!!(mask&4),se=!!(mask&8);
    const s=!!(mask&16),sw=!!(mask&32),w=!!(mask&64),nw=!!(mask&128);
    const pulse=((frameIndex%totalFrames)+totalFrames)%totalFrames%2;
    const radius=Math.max(4,profile.moduleSize);

    // One immutable distance field (no rectangular bars or mutating neighbor
    // reads). Concave missing diagonals get quarter-circle foam; convex pairs
    // of exposed cardinal edges withdraw the foam from the outermost corner.
    for(let y=0;y<size;y++){
      for(let x=0;x<size;x++){
        let d=Infinity;
        if(!n)d=Math.min(d,y);
        if(!e)d=Math.min(d,size-1-x);
        if(!s)d=Math.min(d,size-1-y);
        if(!w)d=Math.min(d,x);

        // Exterior rounded bends: Euclidean radius intersects exposed edges
        // at precisely their natural edge endpoints.
        if(!n&&!w&&x<radius&&y<radius){
          d=Math.max(d,Math.hypot(radius-x,radius-y)-radius);
        }
        if(!n&&!e&&x>=size-radius&&y<radius){
          d=Math.max(d,Math.hypot(x-(size-1-radius),radius-y)-radius);
        }
        if(!s&&!w&&x<radius&&y>=size-radius){
          d=Math.max(d,Math.hypot(radius-x,y-(size-1-radius))-radius);
        }
        if(!s&&!e&&x>=size-radius&&y>=size-radius){
          d=Math.max(d,Math.hypot(x-(size-1-radius),y-(size-1-radius))-radius);
        }

        // Interior concave shoreline arcs, missing diagonals despite the
        // cardinal water cells being connected.
        if(n&&w&&!nw)d=Math.min(d,Math.hypot(x,y));
        if(n&&e&&!ne)d=Math.min(d,Math.hypot(size-1-x,y));
        if(s&&w&&!sw)d=Math.min(d,Math.hypot(x,size-1-y));
        if(s&&e&&!se)d=Math.min(d,Math.hypot(size-1-x,size-1-y));

        if(d<1.15){
          buf.setPixel(x,y,foamColor);
        }else if(d<2.2&&((x+y+pulse)&1)===0){
          buf.setPixel(x,y,foamColor);
        }else if(d>=2.2+pulse*.5&&d<3.4+pulse*.5){
          buf.setPixel(x,y,highlightColor);
        }
      }
    }

    return buf;
  }
}
