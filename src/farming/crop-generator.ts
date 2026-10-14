import {
  ArtStyleProfile,
  CropGrowthStage,
  CropSpeciesId,
  CropSpeciesDefinition,
  PPAE_SCHEMA_VERSION
} from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export const CROP_SPECIES_CATALOG: Readonly<Record<CropSpeciesId, CropSpeciesDefinition>> = {
  wheat: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'wheat',
    totalGrowthStages: 5,
    daysToMature: 4,
    requiresWater: true,
    colorPaletteHex: ['#285233', '#689e5b', '#eab308', '#78350f']
  },
  tomato: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'tomato',
    totalGrowthStages: 5,
    daysToMature: 5,
    requiresWater: true,
    colorPaletteHex: ['#285233', '#38bdf8', '#dc2626', '#451a03']
  },
  pumpkin: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'pumpkin',
    totalGrowthStages: 5,
    daysToMature: 7,
    requiresWater: true,
    colorPaletteHex: ['#1e3a8a', '#15803d', '#f97316', '#7c2d12']
  },
  carrot: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'carrot',
    totalGrowthStages: 5,
    daysToMature: 3,
    requiresWater: true,
    colorPaletteHex: ['#334155', '#4ade80', '#fb923c', '#7c2d12']
  }
};

export interface RenderedCropArtifact {
  readonly speciesId: CropSpeciesId;
  readonly stage: CropGrowthStage;
  readonly isWatered: boolean;
  readonly buffer: PixelBuffer;
  readonly pivotTexel: readonly [number, number];
}

/**
 * Generador de tierra labrada (surcos secos vs regados) y morfología vegetal por etapas de crecimiento.
 */
export class FarmingAndCropGenerator {
  public renderTilledSoilTile(
    isWatered: boolean,
    profile: ArtStyleProfile
  ): PixelBuffer {
    const size = profile.canonicalTileTexels;
    const buf = new PixelBuffer(size, size);
    const soilCol = hexToRgba(isWatered ? '#451a03' : '#784f33');
    const furrowCol = hexToRgba(isWatered ? '#291304' : '#593822');

    buf.fillRect(0, 0, size, size, soilCol);

    // Surcos horizontales paralelos
    const furrowSpacing = Math.max(4, Math.floor(size / 4));
    for (let y = furrowSpacing; y < size; y += furrowSpacing) {
      buf.fillRect(2, y, size - 4, 2, furrowCol);
    }

    return buf;
  }

  public renderCropStage(
    speciesId: CropSpeciesId,
    stage: CropGrowthStage,
    isWatered: boolean,
    profile: ArtStyleProfile
  ): RenderedCropArtifact {
    const size = profile.canonicalTileTexels;
    const buf = new PixelBuffer(size, size);
    const cx = Math.floor(size / 2);
    const baseY = size - 3;

    const pal = CROP_SPECIES_CATALOG[speciesId].colorPaletteHex;
    const sproutCol = hexToRgba(pal[1]);
    const fruitCol = hexToRgba(pal[2]);
    const witherCol = hexToRgba(pal[3]);
    const outlineCol = hexToRgba('#141821');

    if (stage === 'seed') {
      buf.fillRect(cx - 1, baseY - 2, 2, 2, hexToRgba('#92400e'));
    } else if (stage === 'sprout') {
      buf.drawLine(cx, baseY, cx, baseY - Math.floor(size * 0.35), sproutCol, 1);
      buf.setPixel(cx - 1, baseY - Math.floor(size * 0.35), sproutCol);
    } else if (stage === 'growing') {
      buf.drawLine(cx, baseY, cx, baseY - Math.floor(size * 0.55), sproutCol, 2);
      buf.fillEllipse(cx, baseY - Math.floor(size * 0.6), Math.floor(size * 0.22), Math.floor(size * 0.18), sproutCol);
    } else if (stage === 'mature') {
      buf.drawLine(cx, baseY, cx, baseY - Math.floor(size * 0.7), sproutCol, 2);
      // Frutos o espigas características según especie
      if (speciesId === 'tomato' || speciesId === 'pumpkin') {
        buf.fillEllipse(cx - 2, baseY - Math.floor(size * 0.6), Math.floor(size * 0.28), Math.floor(size * 0.25), fruitCol);
        buf.fillEllipse(cx + 2, baseY - Math.floor(size * 0.5), Math.floor(size * 0.24), Math.floor(size * 0.22), fruitCol);
      } else {
        buf.fillRect(cx - 2, baseY - Math.floor(size * 0.75), 4, Math.floor(size * 0.4), fruitCol);
      }
    } else if (stage === 'withered') {
      buf.drawLine(cx, baseY, cx + 2, baseY - Math.floor(size * 0.35), witherCol, 1);
      buf.fillRect(cx - 2, baseY - Math.floor(size * 0.25), 4, 2, witherCol);
    }

    if (!isWatered && stage !== 'withered' && stage !== 'seed') {
      // Tinte seco opcional
    }

    buf.applySelectiveOutline(outlineCol);
    return {
      speciesId,
      stage,
      isWatered,
      buffer: buf,
      pivotTexel: [cx, baseY]
    };
  }
}
