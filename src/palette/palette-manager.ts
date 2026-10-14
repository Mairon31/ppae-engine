import {
  BiomeId,
  ColorRamp,
  PaletteDefinition,
  PPAE_SCHEMA_VERSION,
  RGBAColor,
  SeasonId
} from '../core/contracts';

export function hexToRgba(hex: string, alpha = 255): RGBAColor {
  const clean = hex.replace('#', '').trim();
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: alpha
  };
}

export function rgbaToHex(c: RGBAColor): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

/**
 * Calcula luminancia relativa según estándar WCAG 2.1
 */
export function computeRelativeLuminance(color: RGBAColor): number {
  const normalize = (channel: number): number => {
    const sRGB = channel / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };
  const r = normalize(color.r);
  const g = normalize(color.g);
  const b = normalize(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calcula la razón de contraste entre dos colores (rango 1.0 a 21.0)
 */
export function computeContrastRatio(a: RGBAColor, b: RGBAColor): number {
  const lumA = computeRelativeLuminance(a);
  const lumB = computeRelativeLuminance(b);
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return (brightest + 0.05) / (darkest + 0.05);
}

export class PaletteManager {
  private readonly palettes = new Map<string, PaletteDefinition>();

  constructor() {
    this.registerDefaultPalettes();
  }

  public registerPalette(palette: PaletteDefinition): void {
    this.palettes.set(palette.id, palette);
  }

  public getPalette(id: string): PaletteDefinition {
    const found = this.palettes.get(id);
    if (!found) {
      throw new Error(`[PaletteManager] Palette '${id}' not found`);
    }
    return found;
  }

  public listPalettes(): PaletteDefinition[] {
    return Array.from(this.palettes.values());
  }

  public resolvePaletteByBiomeAndSeason(biome: BiomeId, season: SeasonId): PaletteDefinition {
    for (const p of this.palettes.values()) {
      if (p.biome === biome && p.season === season) {
        return p;
      }
    }
    return this.getPalette('meadow-summer');
  }

  /**
   * Verifica que una rampa tenga el contraste mínimo exigido frente al suelo del bioma
   */
  public verifyRampContrast(ramp: ColorRamp, palette: PaletteDefinition): {
    passed: boolean;
    bestContrast: number;
  } {
    const cMid = computeContrastRatio(ramp.midtone, palette.backgroundReference);
    const cOut = computeContrastRatio(ramp.outline, palette.backgroundReference);
    const cHigh = computeContrastRatio(ramp.highlight, palette.backgroundReference);
    const bestContrast = Math.max(cMid, cOut, cHigh);
    return {
      passed: bestContrast >= palette.minContrastRatio,
      bestContrast: Number(bestContrast.toFixed(2))
    };
  }

  private registerDefaultPalettes(): void {
    const meadowSummer: PaletteDefinition = {
      schemaVersion: PPAE_SCHEMA_VERSION,
      id: 'meadow-summer',
      name: 'Pradera Templada (Verano)',
      biome: 'meadow',
      season: 'summer',
      maxColorsPerAsset: 12,
      minContrastRatio: 2.2,
      backgroundReference: hexToRgba('#4d8046'),
      ramps: {
        foliage: {
          id: 'foliage',
          outline: hexToRgba('#1b2e21'),
          shadow: hexToRgba('#285233'),
          midtone: hexToRgba('#3f7d44'),
          highlight: hexToRgba('#6eb856'),
          accent: hexToRgba('#a3d977')
        },
        wood: {
          id: 'wood',
          outline: hexToRgba('#291811'),
          shadow: hexToRgba('#4f2d1f'),
          midtone: hexToRgba('#7a4832'),
          highlight: hexToRgba('#a16547'),
          accent: hexToRgba('#c48866')
        },
        stone: {
          id: 'stone',
          outline: hexToRgba('#1f2229'),
          shadow: hexToRgba('#444b59'),
          midtone: hexToRgba('#6c768a'),
          highlight: hexToRgba('#9ba5b8'),
          accent: hexToRgba('#c7d0e0')
        },
        mineral_crystal: {
          id: 'mineral_crystal',
          outline: hexToRgba('#14243b'),
          shadow: hexToRgba('#22558c'),
          midtone: hexToRgba('#3898d4'),
          highlight: hexToRgba('#7ce0f5'),
          accent: hexToRgba('#e3fcff')
        },
        berry_accent: {
          id: 'berry_accent',
          outline: hexToRgba('#3b1219'),
          shadow: hexToRgba('#801b2c'),
          midtone: hexToRgba('#c92c46'),
          highlight: hexToRgba('#f26b7a'),
          accent: hexToRgba('#ffe082')
        }
      }
    };

    const meadowAutumn: PaletteDefinition = {
      schemaVersion: PPAE_SCHEMA_VERSION,
      id: 'meadow-autumn',
      name: 'Bosque Ámbar (Otoño)',
      biome: 'forest',
      season: 'autumn',
      maxColorsPerAsset: 12,
      minContrastRatio: 2.2,
      backgroundReference: hexToRgba('#6e5536'),
      ramps: {
        foliage: {
          id: 'foliage',
          outline: hexToRgba('#331710'),
          shadow: hexToRgba('#752918'),
          midtone: hexToRgba('#b84a24'),
          highlight: hexToRgba('#e38430'),
          accent: hexToRgba('#f7be4a')
        },
        wood: {
          id: 'wood',
          outline: hexToRgba('#24140e'),
          shadow: hexToRgba('#42251a'),
          midtone: hexToRgba('#663b2b'),
          highlight: hexToRgba('#8c553f'),
          accent: hexToRgba('#ad7259')
        },
        stone: meadowSummer.ramps.stone,
        mineral_crystal: {
          id: 'mineral_crystal',
          outline: hexToRgba('#2b1338'),
          shadow: hexToRgba('#5b237a'),
          midtone: hexToRgba('#9442bd'),
          highlight: hexToRgba('#c97ef0'),
          accent: hexToRgba('#f4d9ff')
        },
        berry_accent: {
          id: 'berry_accent',
          outline: hexToRgba('#2c1c0b'),
          shadow: hexToRgba('#784c16'),
          midtone: hexToRgba('#c78824'),
          highlight: hexToRgba('#f5c542'),
          accent: hexToRgba('#fff3b0')
        }
      }
    };

    const tundraWinter: PaletteDefinition = {
      schemaVersion: PPAE_SCHEMA_VERSION,
      id: 'tundra-winter',
      name: 'Tundra Boreal (Invierno)',
      biome: 'tundra',
      season: 'winter',
      maxColorsPerAsset: 12,
      minContrastRatio: 2.2,
      backgroundReference: hexToRgba('#b8c7d9'),
      ramps: {
        foliage: {
          id: 'foliage',
          outline: hexToRgba('#14242b'),
          shadow: hexToRgba('#24434f'),
          midtone: hexToRgba('#3b6978'),
          highlight: hexToRgba('#84a9b8'),
          accent: hexToRgba('#e8f4f8')
        },
        wood: {
          id: 'wood',
          outline: hexToRgba('#1f1918'),
          shadow: hexToRgba('#3d3230'),
          midtone: hexToRgba('#5e4e4b'),
          highlight: hexToRgba('#87736f'),
          accent: hexToRgba('#dce8f0')
        },
        stone: {
          id: 'stone',
          outline: hexToRgba('#19212e'),
          shadow: hexToRgba('#35445c'),
          midtone: hexToRgba('#576c8a'),
          highlight: hexToRgba('#8ba0bd'),
          accent: hexToRgba('#d7e6f5')
        },
        mineral_crystal: {
          id: 'mineral_crystal',
          outline: hexToRgba('#0e2923'),
          shadow: hexToRgba('#1b6653'),
          midtone: hexToRgba('#2eb895'),
          highlight: hexToRgba('#75f0d1'),
          accent: hexToRgba('#e6fff8')
        },
        berry_accent: meadowSummer.ramps.berry_accent
      }
    };

    this.registerPalette(meadowSummer);
    this.registerPalette(meadowAutumn);
    this.registerPalette(tundraWinter);
  }
}
