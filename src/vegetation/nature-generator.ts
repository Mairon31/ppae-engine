import {
  ArtStyleProfile,
  GeologicalResourceKind,
  PPAE_SCHEMA_VERSION,
  SecondaryFloraKind,
  TreeLifecycleStage,
  TreeSpeciesDefinition,
  TreeSpeciesId
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export const TREE_SPECIES_CATALOG: Readonly<Record<TreeSpeciesId, TreeSpeciesDefinition>> = {
  oak: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'oak',
    canopyShape: 'rounded_clusters',
    trunkWidthModules: 1,
    baseHeightModules: 7,
    woodColors: {
      outline: '#26150e',
      shadow: '#4d2b1b',
      midtone: '#784730',
      highlight: '#9e6345'
    },
    foliageColors: {
      outline: '#16291c',
      shadow: '#265232',
      midtone: '#3f7d46',
      highlight: '#6cb858',
      fruitOrAccent: '#d9384a'
    }
  },
  pine: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'pine',
    canopyShape: 'conical_tiers',
    trunkWidthModules: 1,
    baseHeightModules: 8,
    woodColors: {
      outline: '#211410',
      shadow: '#3d251d',
      midtone: '#5e3c30',
      highlight: '#7d5446'
    },
    foliageColors: {
      outline: '#112426',
      shadow: '#1e4245',
      midtone: '#2e6669',
      highlight: '#4f9794'
    }
  },
  palm: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'palm',
    canopyShape: 'radial_fronds',
    trunkWidthModules: 1,
    baseHeightModules: 7,
    woodColors: {
      outline: '#2b1c12',
      shadow: '#614128',
      midtone: '#8c613e',
      highlight: '#b58459'
    },
    foliageColors: {
      outline: '#1c2e14',
      shadow: '#3c6324',
      midtone: '#609438',
      highlight: '#8ec752',
      fruitOrAccent: '#52341e'
    }
  },
  birch: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'birch',
    canopyShape: 'slender_column',
    trunkWidthModules: 1,
    baseHeightModules: 7,
    woodColors: {
      outline: '#2b2b30',
      shadow: '#8c8c96',
      midtone: '#cfd1d9',
      highlight: '#f2f4fa'
    },
    foliageColors: {
      outline: '#242e16',
      shadow: '#536b28',
      midtone: '#829e3e',
      highlight: '#b6cf61'
    }
  },
  corrupted_thorn: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'corrupted_thorn',
    canopyShape: 'twisted_branches',
    trunkWidthModules: 1,
    baseHeightModules: 7,
    woodColors: {
      outline: '#1a1126',
      shadow: '#32204a',
      midtone: '#4d3270',
      highlight: '#6e499c'
    },
    foliageColors: {
      outline: '#260d29',
      shadow: '#591c61',
      midtone: '#8f2e9c',
      highlight: '#c85ce0'
    }
  }
};

export interface NatureSpriteArtifact {
  readonly buffer: PixelBuffer;
  readonly pivotTexel: readonly [number, number];
  readonly stage: string;
}

/**
 * Generador morfológico de árboles por etapa de vida, vegetación secundaria y depósitos minerales
 */
export class NatureGenerator {
  public generateTreeStage(
    speciesId: TreeSpeciesId,
    stage: TreeLifecycleStage,
    profile: ArtStyleProfile,
    seed: number
  ): NatureSpriteArtifact {
    const spec = TREE_SPECIES_CATALOG[speciesId];
    const rng = new SeededRNG(seed);
    const mod = profile.moduleSize;

    const wObj = stage === 'fallen_log' ? 8 * mod : 6 * mod;
    const hObj =
      stage === 'stump'
        ? 3 * mod
        : stage === 'sapling'
        ? 4 * mod
        : stage === 'fallen_log'
        ? 3 * mod
        : spec.baseHeightModules * mod;

    const buf = new PixelBuffer(wObj, hObj);
    const cx = Math.floor(wObj / 2);
    const baseY = hObj - 2;

    const wOut = hexToRgba(spec.woodColors.outline);
    const wShad = hexToRgba(spec.woodColors.shadow);
    const wMid = hexToRgba(spec.woodColors.midtone);
    const wHigh = hexToRgba(spec.woodColors.highlight);

    const fOut = hexToRgba(spec.foliageColors.outline);
    const fShad = hexToRgba(spec.foliageColors.shadow);
    const fMid = hexToRgba(spec.foliageColors.midtone);
    const fHigh = hexToRgba(spec.foliageColors.highlight);

    // Caso 1: Tocón tras evento de tala
    if (stage === 'stump') {
      const rx = Math.max(3, Math.floor(mod * 0.9));
      buf.fillRect(cx - rx, baseY - mod, rx * 2 + 1, mod, wMid);
      buf.fillRect(cx - rx - 1, baseY - 1, rx * 2 + 3, 2, wShad);
      // Anillos de madera superior expuestos
      buf.fillEllipse(cx, baseY - mod, rx, 2, wHigh);
      buf.setPixel(cx, baseY - mod, wShad);
      buf.applySelectiveOutline(wOut);
      return { buffer: buf, pivotTexel: [cx, baseY], stage };
    }

    // Caso 2: Tronco caído horizontal
    if (stage === 'fallen_log') {
      const logLen = Math.floor(wObj * 0.72);
      const startX = Math.floor((wObj - logLen) / 2);
      const radius = Math.max(2, Math.floor(mod * 0.65));
      const cy = baseY - radius - 1;
      buf.fillRect(startX, cy - radius, logLen, radius * 2 + 1, wMid);
      buf.fillRect(startX, cy - radius, logLen, 2, wHigh);
      buf.fillRect(startX, cy + radius - 1, logLen, 2, wShad);
      buf.fillEllipse(startX, cy, 2, radius, wHigh);
      buf.applySelectiveOutline(wOut);
      return { buffer: buf, pivotTexel: [cx, baseY], stage };
    }

    // Caso 3: Retoño joven (Sapling)
    if (stage === 'sapling') {
      const stemH = Math.floor(hObj * 0.45);
      buf.drawLine(cx, baseY, cx, baseY - stemH, wMid, 2);
      buf.fillEllipse(cx, baseY - stemH - 2, mod, mod, fMid);
      buf.fillEllipse(cx - 1, baseY - stemH - 3, Math.max(2, mod - 2), Math.max(2, mod - 2), fHigh);
      buf.applySelectiveOutline(fOut);
      return { buffer: buf, pivotTexel: [cx, baseY], stage };
    }

    // Caso 4: Árboles completos (Mature, Ancient, Dead)
    const trunkH = Math.floor(hObj * 0.45);
    const trunkTopY = baseY - trunkH;
    const trunkRadius = stage === 'ancient' ? Math.max(3, mod - 1) : Math.max(2, Math.floor(mod * 0.6));

    for (let y = trunkTopY; y <= baseY; y++) {
      const curve = spec.canopyShape === 'radial_fronds' ? Math.round(Math.sin(((baseY - y) / trunkH) * 1.4) * 3) : 0;
      const rootFlare = y > baseY - 3 ? 1 : 0;
      const r = trunkRadius + rootFlare;
      for (let dx = -r; dx <= r; dx++) {
        const tone = dx < 0 ? wHigh : dx > 0 ? wShad : wMid;
        buf.setPixel(cx + dx + curve, y, tone);
      }
    }

    if (stage === 'dead' || stage === 'burned') {
      buf.drawLine(cx, trunkTopY + 3, cx - mod * 1.5, trunkTopY - mod, wShad, 2);
      buf.drawLine(cx, trunkTopY + 2, cx + mod * 1.5, trunkTopY - mod, wMid, 2);
      buf.applySelectiveOutline(wOut);
      return { buffer: buf, pivotTexel: [cx, baseY], stage };
    }

    // Copa según la morfología de la especie
    if (spec.canopyShape === 'conical_tiers') {
      const tiers = 3;
      for (let t = 0; t < tiers; t++) {
        const ty = Math.floor(hObj * 0.22) + t * Math.floor(mod * 1.3);
        const rx = Math.floor(mod * (1.1 + t * 0.55));
        const ry = Math.max(3, Math.floor(mod * 0.75));
        buf.fillEllipse(cx, ty + 1, rx, ry, fShad);
        buf.fillEllipse(cx, ty, rx - 1, ry - 1, fMid);
        buf.fillEllipse(cx - 1, ty - 1, Math.max(2, rx - 3), Math.max(2, ry - 2), fHigh);
      }
    } else if (spec.canopyShape === 'radial_fronds') {
      const crownX = cx + 3;
      const crownY = trunkTopY;
      const frondOffsets = [
        [-mod * 2, -2],
        [mod * 2, -2],
        [-mod * 1.6, mod],
        [mod * 1.6, mod],
        [0, -mod * 1.4]
      ];
      for (const [fx, fy] of frondOffsets) {
        buf.drawLine(crownX, crownY, crownX + fx, crownY + fy, fMid, 3);
        buf.drawLine(crownX, crownY - 1, crownX + fx * 0.7, crownY + fy * 0.7 - 1, fHigh, 2);
      }
    } else {
      const clusters = stage === 'ancient' ? 6 : 4;
      for (let c = 0; c < clusters; c++) {
        const ox = cx + rng.nextInt(-mod, mod);
        const oy = trunkTopY + rng.nextInt(-Math.floor(mod * 1.6), Math.floor(mod * 0.3));
        const rx = Math.floor(mod * 1.4);
        const ry = Math.floor(mod * 1.15);
        buf.fillEllipse(ox, oy + 1, rx, ry, fShad);
        buf.fillEllipse(ox, oy, rx - 1, ry - 1, fMid);
        buf.fillEllipse(ox - 2, oy - 2, Math.max(2, rx - 3), Math.max(2, ry - 3), fHigh);
      }
    }

    buf.applySelectiveOutline(fOut);
    return { buffer: buf, pivotTexel: [cx, baseY], stage };
  }

  public generateSecondaryFlora(
    kind: SecondaryFloraKind,
    profile: ArtStyleProfile,
    seed: number
  ): NatureSpriteArtifact {
    const mod = profile.moduleSize;
    const w = 3 * mod;
    const h = 3 * mod;
    const buf = new PixelBuffer(w, h);
    const rng = new SeededRNG(seed);
    const cx = Math.floor(w / 2);
    const baseY = h - 2;

    const greenMid = hexToRgba('#498a42');
    const greenHigh = hexToRgba('#78bd64');
    const outline = hexToRgba('#183018');

    if (kind === 'desert_cactus') {
      buf.fillRect(cx - 2, baseY - mod * 2, 4, mod * 2, greenMid);
      buf.fillRect(cx - 5, baseY - Math.floor(mod * 1.4), 3, 2, greenMid);
      buf.fillRect(cx - 5, baseY - Math.floor(mod * 1.9), 2, Math.floor(mod * 0.6), greenHigh);
      buf.fillRect(cx + 2, baseY - Math.floor(mod * 1.2), 3, 2, greenMid);
    } else if (kind === 'mushroom_cluster') {
      const stem = hexToRgba('#e2d9c8');
      const cap = hexToRgba('#d93b48');
      const spot = hexToRgba('#fff7e6');
      buf.fillRect(cx - 1, baseY - 4, 3, 4, stem);
      buf.fillEllipse(cx, baseY - 5, 4, 2, cap);
      buf.setPixel(cx - 1, baseY - 6, spot);
      buf.setPixel(cx + 2, baseY - 5, spot);
    } else {
      // Hierba alta o flores silvestres
      for (let i = -2; i <= 2; i++) {
        const bx = cx + i * 2;
        const bladeH = rng.nextInt(mod, mod * 2 - 1);
        buf.drawLine(bx, baseY, bx + (i < 0 ? -1 : 1), baseY - bladeH, i % 2 === 0 ? greenHigh : greenMid, 1);
        if (kind === 'wild_flower' && Math.abs(i) <= 1) {
          const petal = rng.chance(0.5) ? hexToRgba('#facc15') : hexToRgba('#f43f5e');
          buf.fillRect(bx - 1, baseY - bladeH - 1, 2, 2, petal);
        }
      }
    }

    buf.applySelectiveOutline(outline);
    return { buffer: buf, pivotTexel: [cx, baseY], stage: kind };
  }

  public generateGeologicalResource(
    kind: GeologicalResourceKind,
    profile: ArtStyleProfile,
    seed: number
  ): NatureSpriteArtifact {
    const mod = profile.moduleSize;
    const w = 4 * mod;
    const h = 3 * mod;
    const buf = new PixelBuffer(w, h);
    const rng = new SeededRNG(seed);
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h * 0.62);
    const rx = Math.floor(w * 0.34);
    const ry = Math.floor(h * 0.28);

    const stoneShad = hexToRgba('#424a59');
    const stoneMid = hexToRgba('#68748a');
    const stoneHigh = hexToRgba('#98a5bd');
    const stoneOut = hexToRgba('#1b2029');

    buf.fillEllipse(cx, cy + 1, rx, ry, stoneShad);
    buf.fillEllipse(cx, cy, rx - 1, ry - 1, stoneMid);
    buf.fillEllipse(cx - 2, cy - 2, Math.max(2, rx - 3), Math.max(2, ry - 3), stoneHigh);

    const veinColor =
      kind === 'gold_vein'
        ? hexToRgba('#facc15')
        : kind === 'iron_vein'
        ? hexToRgba('#d97757')
        : kind === 'crystal_geode'
        ? hexToRgba('#38bdf8')
        : stoneHigh;

    if (kind !== 'mossy_boulder' && kind !== 'surface_pebbles') {
      for (let i = 0; i < 4; i++) {
        const vx = cx + rng.nextInt(-rx + 3, rx - 3);
        const vy = cy + rng.nextInt(-ry + 2, ry - 2);
        buf.fillRect(vx, vy, 2, 2, veinColor);
      }
    }

    buf.applySelectiveOutline(stoneOut);
    return { buffer: buf, pivotTexel: [cx, cy + ry], stage: kind };
  }
}
