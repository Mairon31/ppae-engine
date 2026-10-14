import { NineSliceConfig, PPAE_SCHEMA_VERSION, RGBAColor } from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export const DEFAULT_HUD_PANEL_CONFIG: NineSliceConfig = {
  schemaVersion: PPAE_SCHEMA_VERSION,
  frameId: 'hud_panel_wood',
  sourceWidthTexels: 24,
  sourceHeightTexels: 24,
  cornerSizePx: 6
};

/**
 * Renderizador Nine-Slice adaptado a pixel art.
 * Las 4 esquinas se copian sin estiramiento bilineal, los bordes cardinales se repiten
 * por mosaico entero y el centro se rellena de forma sólida.
 */
export class PixelNineSliceLibrary {
  public renderNineSlicePanel(
    config: NineSliceConfig,
    destWidthPx: number,
    destHeightPx: number,
    backgroundColor: RGBAColor,
    borderColor: RGBAColor
  ): PixelBuffer {
    const out = new PixelBuffer(destWidthPx, destHeightPx);
    const c = config.cornerSizePx;
    const w = destWidthPx;
    const h = destHeightPx;

    // 1. Relleno interior sólido
    out.fillRect(c, c, w - c * 2, h - c * 2, backgroundColor);

    // 2. Esquinas (4 esquinas copiadas exactas 1:1)
    // Esquina Superior-Izquierda
    out.fillRect(0, 0, c, c, borderColor);
    // Esquina Superior-Derecha
    out.fillRect(w - c, 0, c, c, borderColor);
    // Esquina Inferior-Izquierda
    out.fillRect(0, h - c, c, c, borderColor);
    // Esquina Inferior-Derecha
    out.fillRect(w - c, h - c, c, c, borderColor);

    // 3. Bordes cardinales (repetición por mosaico entero)
    for (let x = c; x < w - c; x += c) {
      const segW = Math.min(c, w - c - x);
      out.fillRect(x, 0, segW, 2, borderColor); // Borde Superior
      out.fillRect(x, h - 2, segW, 2, borderColor); // Borde Inferior
    }
    for (let y = c; y < h - c; y += c) {
      const segH = Math.min(c, h - c - y);
      out.fillRect(0, y, 2, segH, borderColor); // Borde Izquierdo
      out.fillRect(w - 2, y, 2, segH, borderColor); // Borde Derecho
    }

    return out;
  }

  public renderProgressBar(
    current: number,
    max: number,
    widthPx: number,
    heightPx: number,
    fillHex: string,
    bgHex: string
  ): PixelBuffer {
    const buf = new PixelBuffer(widthPx, heightPx);
    const fillCol = hexToRgba(fillHex);
    const bgCol = hexToRgba(bgHex);

    buf.fillRect(0, 0, widthPx, heightPx, bgCol);
    const ratio = Math.max(0, Math.min(1, current / Math.max(1, max)));
    const fillW = Math.round((widthPx - 2) * ratio);

    if (fillW > 0) {
      buf.fillRect(1, 1, fillW, heightPx - 2, fillCol);
    }
    buf.applySelectiveOutline(hexToRgba('#090d16'));
    return buf;
  }
}
