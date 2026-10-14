import { RGBAColor } from '../core/contracts';

/**
 * Buffer de píxeles RGBA independiente de DOM/Canvas para rasterización determinista.
 * Garantiza 0% antialiasing y soporte nativo para módulos 4x4 y 6x6.
 */
export class PixelBuffer {
  public readonly width: number;
  public readonly height: number;
  public readonly data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)
      || width < 1 || height < 1 || width > 16_384 || height > 16_384
      || width * height * 4 > 256 * 1024 * 1024) {
      throw new RangeError(`Invalid PixelBuffer dimensions: ${width}x${height}`);
    }
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public setPixel(x: number, y: number, color: RGBAColor): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (!this.inBounds(ix, iy)) return;
    const offset = (iy * this.width + ix) * 4;
    this.data[offset] = color.r;
    this.data[offset + 1] = color.g;
    this.data[offset + 2] = color.b;
    this.data[offset + 3] = color.a;
  }

  public getPixel(x: number, y: number): RGBAColor {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (!this.inBounds(ix, iy)) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const offset = (iy * this.width + ix) * 4;
    return {
      r: this.data[offset],
      g: this.data[offset + 1],
      b: this.data[offset + 2],
      a: this.data[offset + 3]
    };
  }

  public isOpaque(x: number, y: number): boolean {
    return this.getPixel(x, y).a > 0;
  }

  /**
   * Rellena un rectángulo discreto en coordenadas de texel
   */
  public fillRect(x: number, y: number, w: number, h: number, color: RGBAColor): void {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.floor(x + w);
    const y1 = Math.floor(y + h);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        this.setPixel(px, py, color);
      }
    }
  }

  /**
   * Estampa un módulo de granularidad artística (4x4 o 6x6) usando una máscara binaria o de índices
   */
  public stampModulePattern(
    moduleGridX: number,
    moduleGridY: number,
    moduleSize: 4 | 6,
    pattern: readonly number[][],
    paletteMap: Readonly<Record<number, RGBAColor>>
  ): void {
    const baseX = moduleGridX * moduleSize;
    const baseY = moduleGridY * moduleSize;
    for (let my = 0; my < moduleSize; my++) {
      const row = pattern[my];
      if (!row) continue;
      for (let mx = 0; mx < moduleSize; mx++) {
        const key = row[mx];
        if (key !== undefined && key > 0 && paletteMap[key]) {
          this.setPixel(baseX + mx, baseY + my, paletteMap[key]);
        }
      }
    }
  }

  /**
   * Rellena una elipse discreta centrada sin antialiasing
   */
  public fillEllipse(cx: number, cy: number, rx: number, ry: number, color: RGBAColor): void {
    const minX = Math.floor(cx - rx);
    const maxX = Math.ceil(cx + rx);
    const minY = Math.floor(cy - ry);
    const maxY = Math.ceil(cy + ry);
    const rx2 = Math.max(1, rx * rx);
    const ry2 = Math.max(1, ry * ry);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1.0) {
          this.setPixel(x, y, color);
        }
      }
    }
  }

  /**
   * Algoritmo entero de Bresenham para trazos estructurales y hojas de armas
   */
  public drawLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: RGBAColor,
    thickness = 1
  ): void {
    let ix0 = Math.floor(x0);
    let iy0 = Math.floor(y0);
    const ix1 = Math.floor(x1);
    const iy1 = Math.floor(y1);

    const dx = Math.abs(ix1 - ix0);
    const dy = -Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx + dy;

    const half = Math.floor(thickness / 2);

    while (true) {
      this.fillRect(ix0 - half, iy0 - half, thickness, thickness, color);
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ix0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  /**
   * Aplica espejo vertical en una región para garantizar simetría controlada cuando aplica
   */
  public mirrorHorizontal(): void {
    const half = Math.floor(this.width / 2);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < half; x++) {
        const c = this.getPixel(x, y);
        if (c.a > 0) {
          this.setPixel(this.width - 1 - x, y, c);
        }
      }
    }
  }

  /**
   * Genera un contorno selectivo exterior de 1px respetando la estética pixel art
   */
  public applySelectiveOutline(outlineColor: RGBAColor): void {
    const toOutline: Array<[number, number]> = [];
    const dirs = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ];

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.isOpaque(x, y)) continue;
        for (const [dx, dy] of dirs) {
          if (this.isOpaque(x + dx, y + dy)) {
            toOutline.push([x, y]);
            break;
          }
        }
      }
    }

    for (const [x, y] of toOutline) {
      this.setPixel(x, y, outlineColor);
    }
  }

  /** Adds a transparent gutter. It does not alter pixels in the visible region. */
  public withPadding(paddingPx: number): PixelBuffer {
    return this.withBorder(paddingPx, false);
  }

  /** Repeats edge RGBA texels into the gutter to prevent atlas filtering bleed. */
  public withExtrudedPadding(paddingPx: number): PixelBuffer {
    return this.withBorder(paddingPx, true);
  }

  private withBorder(paddingPx: number, extrude: boolean): PixelBuffer {
    if (!Number.isSafeInteger(paddingPx) || paddingPx < 0 || paddingPx > 256) {
      throw new RangeError(`Invalid PixelBuffer padding: ${paddingPx}`);
    }
    if (paddingPx === 0) return this;
    const out = new PixelBuffer(this.width + paddingPx * 2, this.height + paddingPx * 2);
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        const sourceX = x - paddingPx;
        const sourceY = y - paddingPx;
        if (this.inBounds(sourceX, sourceY)) {
          out.setPixel(x, y, this.getPixel(sourceX, sourceY));
        } else if (extrude) {
          out.setPixel(x, y, this.getPixel(
            Math.max(0, Math.min(this.width - 1, sourceX)),
            Math.max(0, Math.min(this.height - 1, sourceY))
          ));
        }
      }
    }
    return out;
  }

  /**
   * Cuenta colores únicos opacos presentes en el sprite generado
   */
  public countUniqueOpaqueColors(): number {
    const seen = new Set<number>();
    for (let i = 0; i < this.data.length; i += 4) {
      const a = this.data[i + 3];
      if (a > 0) {
        const packed = (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2];
        seen.add(packed);
      }
    }
    return seen.size;
  }
}
