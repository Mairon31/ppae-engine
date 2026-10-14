import { ArtStyleProfile, AutotileMask8, TerrainMaterialId } from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { TERRAIN_MATERIALS } from './world-field';

/**
 * Sintetizador de tiles de terreno seamless y transiciones de autotiling de 47 estados.
 * Respeta la retícula canónica (24x24 o 48x48 texels) y los módulos 4x4 y 6x6.
 */
export class TerrainAutotiler {
  /**
   * Genera un tile base 100% seamless en los 4 lados (aritmética modular toroidal)
   */
  public generateSeamlessBaseTile(
    materialId: TerrainMaterialId,
    profile: ArtStyleProfile,
    variantIndex = 0
  ): PixelBuffer {
    const size = profile.canonicalTileTexels;
    const mat = TERRAIN_MATERIALS[materialId];
    const buf = new PixelBuffer(size, size);

    const baseColor = hexToRgba(mat.baseColorHex);
    const shadowColor = hexToRgba(mat.shadowColorHex);
    const highlightColor = hexToRgba(mat.highlightColorHex);
    const accentColor = hexToRgba(mat.accentColorHex);

    buf.fillRect(0, 0, size, size, baseColor);

    const wrap = (v: number): number => ((v % size) + size) % size;
    const setWrapped = (x: number, y: number, c: typeof baseColor): void => {
      buf.setPixel(wrap(x), wrap(y), c);
    };

    // Distribución periódica por módulos (4x4 o 6x6) para garantizar tileabilidad perfecta
    const modulesPerSide = Math.floor(size / profile.moduleSize);
    for (let my = 0; my < modulesPerSide; my++) {
      for (let mx = 0; mx < modulesPerSide; mx++) {
        // Hash periódico que depende de (mx % modulesPerSide, my % modulesPerSide)
        const h =
          ((mx * 73856093) ^ (my * 19349663) ^ (variantIndex * 83492791)) >>> 0;
        const ox = mx * profile.moduleSize + (h % profile.moduleSize);
        const oy = my * profile.moduleSize + ((h >>> 4) % profile.moduleSize);

        if (mat.patternType === 'organic_tuft') {
          if ((h & 3) === 0) {
            setWrapped(ox, oy, shadowColor);
            setWrapped(ox, oy - 1, highlightColor);
            setWrapped(ox + 1, oy - 1, highlightColor);
          } else if ((h & 7) === 1) {
            setWrapped(ox, oy, accentColor);
          }
        } else if (mat.patternType === 'granular_sand') {
          if ((h & 3) === 0) {
            setWrapped(ox, oy, highlightColor);
            setWrapped(ox + 1, oy, shadowColor);
          }
        } else if (mat.patternType === 'cracked_stone') {
          if ((h & 3) === 0) {
            setWrapped(ox, oy, shadowColor);
            setWrapped(ox + 1, oy, shadowColor);
            setWrapped(ox, oy + 1, highlightColor);
          }
        } else if (mat.patternType === 'frost_crystalline') {
          if ((h & 3) === 0) {
            setWrapped(ox, oy, highlightColor);
            setWrapped(ox + 1, oy, accentColor);
          }
        }
      }
    }

    return buf;
  }

  /**
   * Compone un tile con transición orgánica de autotiling (cardinal + esquinas internas/externas)
   * sobre el material vecino inferior sin usar blur.
   */
  public composeAutotiledSurface(
    primaryMaterial: TerrainMaterialId,
    mask: AutotileMask8,
    profile: ArtStyleProfile,
    underlayMaterial?: TerrainMaterialId,
    variantIndex = 0
  ): PixelBuffer {
    const primaryTile = this.generateSeamlessBaseTile(primaryMaterial, profile, variantIndex);
    if (mask === 255 || !underlayMaterial) {
      return primaryTile;
    }

    const underlayTile = this.generateSeamlessBaseTile(underlayMaterial, profile, variantIndex);
    const size = profile.canonicalTileTexels;
    const out = new PixelBuffer(size, size);

    const hasN = (mask & 1) !== 0;
    const hasNE = (mask & 2) !== 0;
    const hasE = (mask & 4) !== 0;
    const hasSE = (mask & 8) !== 0;
    const hasS = (mask & 16) !== 0;
    const hasSW = (mask & 32) !== 0;
    const hasW = (mask & 64) !== 0;
    const hasNW = (mask & 128) !== 0;

    const borderDepth = profile.moduleSize; // 4px o 6px de margen de transición
    const borderColor = hexToRgba(TERRAIN_MATERIALS[primaryMaterial].transitionBorderHex);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Dentado orgánico determinista de 1 texel para evitar líneas rectas artificiales
        const tooth = ((x * 13 + y * 29) & 3) === 0 ? 1 : 0;
        const limit = borderDepth + tooth;

        let exposeUnderlay = false;

        // Bordes cardinales
        if (!hasN && y < limit) exposeUnderlay = true;
        if (!hasS && y >= size - limit) exposeUnderlay = true;
        if (!hasW && x < limit) exposeUnderlay = true;
        if (!hasE && x >= size - limit) exposeUnderlay = true;

        // Redondeo de esquinas externas (cuando dos cardinales adyacentes faltan)
        if (!hasN && !hasW && x + y < borderDepth * 2 + 2) exposeUnderlay = true;
        if (!hasN && !hasE && size - 1 - x + y < borderDepth * 2 + 2) exposeUnderlay = true;
        if (!hasS && !hasW && x + (size - 1 - y) < borderDepth * 2 + 2) exposeUnderlay = true;
        if (!hasS && !hasE && size - 1 - x + (size - 1 - y) < borderDepth * 2 + 2) {
          exposeUnderlay = true;
        }

        // Esquinas internas (cuando ambos cardinales existen pero falta el vecino diagonal)
        if (hasN && hasW && !hasNW && x + y < borderDepth + 1) exposeUnderlay = true;
        if (hasN && hasE && !hasNE && size - 1 - x + y < borderDepth + 1) exposeUnderlay = true;
        if (hasS && hasW && !hasSW && x + (size - 1 - y) < borderDepth + 1) exposeUnderlay = true;
        if (hasS && hasE && !hasSE && size - 1 - x + (size - 1 - y) < borderDepth + 1) {
          exposeUnderlay = true;
        }

        if (exposeUnderlay) {
          out.setPixel(x, y, underlayTile.getPixel(x, y));
        } else {
          out.setPixel(x, y, primaryTile.getPixel(x, y));
        }
      }
    }

    // Labio de borde pixel-art de 1 texel en la frontera entre materiales
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const current = out.getPixel(x, y);
        const primaryRef = primaryTile.getPixel(x, y);
        const isPrimary =
          current.r === primaryRef.r && current.g === primaryRef.g && current.b === primaryRef.b;
        if (!isPrimary) continue;

        const checkNeighbor = (nx: number, ny: number): boolean => {
          const np = out.getPixel(nx, ny);
          const pref = primaryTile.getPixel(nx, ny);
          return np.r !== pref.r || np.g !== pref.g || np.b !== pref.b;
        };

        if (
          checkNeighbor(x, y - 1) ||
          checkNeighbor(x + 1, y) ||
          checkNeighbor(x, y + 1) ||
          checkNeighbor(x - 1, y)
        ) {
          out.setPixel(x, y, borderColor);
        }
      }
    }

    return out;
  }
}
