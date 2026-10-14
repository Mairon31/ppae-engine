import { ArtStyleProfile, AutotileMask8 } from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
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

    // Espuma de orilla reactiva a los lados donde el líquido toca tierra firme (según autotileMask)
    const hasN = (autotileMask & 1) !== 0;
    const hasE = (autotileMask & 4) !== 0;
    const hasS = (autotileMask & 16) !== 0;
    const hasW = (autotileMask & 64) !== 0;
    const pulse = frameIndex % 2;

    if (!hasN) {
      for (let x = 0; x < size; x++) {
        buf.setPixel(x, 0, foamColor);
        if ((x + pulse) % 2 === 0) buf.setPixel(x, 1, foamColor);
        buf.setPixel(x, 2 + pulse, highlightColor);
      }
    }
    if (!hasS) {
      for (let x = 0; x < size; x++) {
        buf.setPixel(x, size - 1, foamColor);
        if ((x + pulse) % 2 === 0) buf.setPixel(x, size - 2, foamColor);
      }
    }
    if (!hasW) {
      for (let y = 0; y < size; y++) {
        buf.setPixel(0, y, foamColor);
        if ((y + pulse) % 2 === 0) buf.setPixel(1, y, foamColor);
      }
    }
    if (!hasE) {
      for (let y = 0; y < size; y++) {
        buf.setPixel(size - 1, y, foamColor);
        if ((y + pulse) % 2 === 0) buf.setPixel(size - 2, y, foamColor);
      }
    }

    return buf;
  }
}
