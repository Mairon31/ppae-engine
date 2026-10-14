import type {
  ArtStyleProfile,
  BiomeId,
  FloraBlossomHead,
  FloraLeafBlade,
  FloraMorphologyDescriptor,
  FloraSpeciesArchetype,
  FloraStemSegment,
  FungalCapNode,
  SecondaryFloraKind,
  TerrainMaterialId
} from '../core/contracts';
import { PPAE_SCHEMA_VERSION } from '../core/contracts';
import { fnv1aHash32, SeededRNG } from '../core/deterministic';

/**
 * All 17 botanical microflora families. Six legacy identifiers are preserved.
 * Each family defines a real botanical structure, not five fixed-width grass bars.
 */
export const FLORA_SPECIES_CATALOG: Readonly<Record<SecondaryFloraKind, FloraSpeciesArchetype>> = {
  short_grass: {
    kind: 'short_grass', growthHabit: 'tuft_graminoid',
    corollaSymmetry: 'none', leafShape: 'linear_grass',
    widthModulesRange: [3,4],
    heightModulesRange: [2,3],
    stemCountRange: [3,6],
    leafCountPerStemRange: [1,2],
    blossomCountRange: [0,0],
    maxStemCurvePx: 2,
    foliagePalette: {
      outlineHex: '#19301a', shadowHex: '#315c2b',
      midtoneHex: '#4c8740', highlightHex: '#76b863'
    }
  },
  tall_grass: {
    kind: 'tall_grass', growthHabit: 'tuft_graminoid',
    corollaSymmetry: 'none', leafShape: 'linear_grass',
    widthModulesRange: [3,5],
    heightModulesRange: [3,4],
    stemCountRange: [4,8],
    leafCountPerStemRange: [1,2],
    blossomCountRange: [0,0],
    maxStemCurvePx: 4,
    foliagePalette: {
      outlineHex: '#162b17', shadowHex: '#2b5427',
      midtoneHex: '#46823c', highlightHex: '#72b55e'
    }
  },
  wild_herb: {
    kind: 'wild_herb', growthHabit: 'basal_rosette',
    corollaSymmetry: 'none', leafShape: 'lanceolate',
    widthModulesRange: [3,4],
    heightModulesRange: [3,4],
    stemCountRange: [2,4],
    leafCountPerStemRange: [2,4],
    blossomCountRange: [0,0],
    maxStemCurvePx: 3,
    foliagePalette: {
      outlineHex: '#14291d', shadowHex: '#254f37',
      midtoneHex: '#3b7a54', highlightHex: '#63ad7d'
    }
  },
  weed_thistle: {
    kind: 'weed_thistle', growthHabit: 'erect_forb',
    corollaSymmetry: 'spike_inflorescence', leafShape: 'thorn_stem',
    widthModulesRange: [3,4],
    heightModulesRange: [3,4],
    stemCountRange: [2,3],
    leafCountPerStemRange: [2,3],
    blossomCountRange: [1,2],
    maxStemCurvePx: 2,
    foliagePalette: {
      outlineHex: '#1b2618', shadowHex: '#354a2e',
      midtoneHex: '#526e47', highlightHex: '#759466'
    },
    floralPalettes: [
      { petalPrimaryHex: '#9333ea', petalHighlightHex: '#d8b4fe', centerDiskHex: '#581c87' }
    ]
  },
  low_shrub: {
    kind: 'low_shrub', growthHabit: 'woody_cushion',
    corollaSymmetry: 'none', leafShape: 'ovate_shrub',
    widthModulesRange: [4,5],
    heightModulesRange: [3,4],
    stemCountRange: [3,5],
    leafCountPerStemRange: [3,5],
    blossomCountRange: [0,0],
    maxStemCurvePx: 3,
    foliagePalette: {
      outlineHex: '#15291a', shadowHex: '#264f2f',
      midtoneHex: '#3d7a47', highlightHex: '#68ab6e'
    }
  },
  flowering_shrub: {
    kind: 'flowering_shrub', growthHabit: 'woody_cushion',
    corollaSymmetry: 'radial_daisy', leafShape: 'ovate_shrub',
    widthModulesRange: [4,5],
    heightModulesRange: [3,4],
    stemCountRange: [3,5],
    leafCountPerStemRange: [3,4],
    blossomCountRange: [3,5],
    maxStemCurvePx: 3,
    foliagePalette: {
      outlineHex: '#16291b', shadowHex: '#285231',
      midtoneHex: '#3f7d48', highlightHex: '#6cb370'
    },
    floralPalettes: [
      { petalPrimaryHex: '#ec4899', petalHighlightHex: '#fbcfe8', centerDiskHex: '#facc15' },
      { petalPrimaryHex: '#f43f5e', petalHighlightHex: '#fecdd3', centerDiskHex: '#fef08a' }
    ]
  },
  wild_flower: {
    kind: 'wild_flower', growthHabit: 'erect_forb',
    corollaSymmetry: 'radial_daisy', leafShape: 'lanceolate',
    widthModulesRange: [3,4],
    heightModulesRange: [3,4],
    stemCountRange: [1,3],
    leafCountPerStemRange: [2,3],
    blossomCountRange: [1,3],
    maxStemCurvePx: 3,
    foliagePalette: {
      outlineHex: '#172b18', shadowHex: '#2d572c',
      midtoneHex: '#488543', highlightHex: '#74b567'
    },
    floralPalettes: [
      { petalPrimaryHex: '#e2e8f0', petalHighlightHex: '#ffffff', centerDiskHex: '#eab308' },
      { petalPrimaryHex: '#f59e0b', petalHighlightHex: '#fde047', centerDiskHex: '#78350f' },
      { petalPrimaryHex: '#6366f1', petalHighlightHex: '#a5b4fc', centerDiskHex: '#fef08a' }
    ]
  },
  flower_cluster: {
    kind: 'flower_cluster', growthHabit: 'erect_forb',
    corollaSymmetry: 'bell_campanula', leafShape: 'lanceolate',
    widthModulesRange: [4,5],
    heightModulesRange: [3,5],
    stemCountRange: [3,5],
    leafCountPerStemRange: [2,3],
    blossomCountRange: [3,6],
    maxStemCurvePx: 4,
    foliagePalette: {
      outlineHex: '#162b19', shadowHex: '#2b542f',
      midtoneHex: '#438046', highlightHex: '#6db06b'
    },
    floralPalettes: [
      { petalPrimaryHex: '#7c3aed', petalHighlightHex: '#c4b5fd', centerDiskHex: '#fde047' },
      { petalPrimaryHex: '#3b82f6', petalHighlightHex: '#93c5fd', centerDiskHex: '#fef9c3' },
      { petalPrimaryHex: '#f43f5e', petalHighlightHex: '#fda4af', centerDiskHex: '#fde047' }
    ]
  },
  fern: {
    kind: 'fern', growthHabit: 'frond_arch',
    corollaSymmetry: 'none', leafShape: 'serrated_fern',
    widthModulesRange: [4,5],
    heightModulesRange: [3,4],
    stemCountRange: [4,6],
    leafCountPerStemRange: [4,6],
    blossomCountRange: [0,0],
    maxStemCurvePx: 5,
    foliagePalette: {
      outlineHex: '#112618', shadowHex: '#1f4d2e',
      midtoneHex: '#347848', highlightHex: '#5ea86f'
    }
  },
  ground_moss: {
    kind: 'ground_moss', growthHabit: 'moss_carpet',
    corollaSymmetry: 'none', leafShape: 'ovate_shrub',
    widthModulesRange: [3,5],
    heightModulesRange: [2,2],
    stemCountRange: [3,5],
    leafCountPerStemRange: [2,3],
    blossomCountRange: [0,0],
    maxStemCurvePx: 1,
    foliagePalette: {
      outlineHex: '#162916', shadowHex: '#2c5426',
      midtoneHex: '#4b853b', highlightHex: '#7ec25e'
    }
  },
  mushroom_cluster: {
    kind: 'mushroom_cluster', growthHabit: 'mycelium_colony',
    corollaSymmetry: 'none', leafShape: 'ovate_shrub',
    widthModulesRange: [3,4],
    heightModulesRange: [3,3],
    stemCountRange: [2,4],
    leafCountPerStemRange: [0,0],
    blossomCountRange: [0,0],
    maxStemCurvePx: 2,
    foliagePalette: {
      outlineHex: '#261714', shadowHex: '#991b1b',
      midtoneHex: '#dc2626', highlightHex: '#f87171'
    }
  },
  water_lily_pad: {
    kind: 'water_lily_pad', growthHabit: 'floating_aquatic',
    corollaSymmetry: 'cup_tulip', leafShape: 'floating_pad',
    widthModulesRange: [3,5],
    heightModulesRange: [2,3],
    stemCountRange: [1,3],
    leafCountPerStemRange: [1,2],
    blossomCountRange: [0,1],
    maxStemCurvePx: 1,
    foliagePalette: {
      outlineHex: '#11291f', shadowHex: '#1e523b',
      midtoneHex: '#317d58', highlightHex: '#5bb082'
    },
    floralPalettes: [
      { petalPrimaryHex: '#f472b6', petalHighlightHex: '#fce7f3', centerDiskHex: '#facc15' }
    ]
  },
  water_reed: {
    kind: 'water_reed', growthHabit: 'emergent_reed',
    corollaSymmetry: 'spike_inflorescence', leafShape: 'linear_grass',
    widthModulesRange: [3,4],
    heightModulesRange: [4,5],
    stemCountRange: [3,6],
    leafCountPerStemRange: [2,3],
    blossomCountRange: [1,3],
    maxStemCurvePx: 3,
    foliagePalette: {
      outlineHex: '#182917', shadowHex: '#30522b',
      midtoneHex: '#4c7a40', highlightHex: '#77a862'
    },
    floralPalettes: [
      { petalPrimaryHex: '#5c3a21', petalHighlightHex: '#855836', centerDiskHex: '#3d2514' }
    ]
  },
  creeping_vine: {
    kind: 'creeping_vine', growthHabit: 'trailing_vine',
    corollaSymmetry: 'none', leafShape: 'lanceolate',
    widthModulesRange: [4,5],
    heightModulesRange: [2,3],
    stemCountRange: [2,4],
    leafCountPerStemRange: [3,5],
    blossomCountRange: [0,0],
    maxStemCurvePx: 4,
    foliagePalette: {
      outlineHex: '#132618', shadowHex: '#234a2d',
      midtoneHex: '#387346', highlightHex: '#5c9e69'
    }
  },
  thorny_bramble: {
    kind: 'thorny_bramble', growthHabit: 'trailing_vine',
    corollaSymmetry: 'none', leafShape: 'thorn_stem',
    widthModulesRange: [4,5],
    heightModulesRange: [3,4],
    stemCountRange: [3,5],
    leafCountPerStemRange: [2,4],
    blossomCountRange: [0,0],
    maxStemCurvePx: 5,
    foliagePalette: {
      outlineHex: '#21181c', shadowHex: '#3d2c33',
      midtoneHex: '#59424a', highlightHex: '#7d6069'
    }
  },
  tropical_broadleaf: {
    kind: 'tropical_broadleaf', growthHabit: 'tropical_rosette',
    corollaSymmetry: 'spike_inflorescence', leafShape: 'broad_tropical',
    widthModulesRange: [4,6],
    heightModulesRange: [4,5],
    stemCountRange: [3,5],
    leafCountPerStemRange: [3,5],
    blossomCountRange: [0,1],
    maxStemCurvePx: 4,
    foliagePalette: {
      outlineHex: '#0c2617', shadowHex: '#16522e',
      midtoneHex: '#248248', highlightHex: '#4dbd72'
    },
    floralPalettes: [
      { petalPrimaryHex: '#f97316', petalHighlightHex: '#fde047', centerDiskHex: '#dc2626' }
    ]
  },
  desert_cactus: {
    kind: 'desert_cactus', growthHabit: 'spiny_succulent',
    corollaSymmetry: 'cup_tulip', leafShape: 'thorn_stem',
    widthModulesRange: [3,4],
    heightModulesRange: [3,5],
    stemCountRange: [1,3],
    leafCountPerStemRange: [0,0],
    blossomCountRange: [0,1],
    maxStemCurvePx: 2,
    foliagePalette: {
      outlineHex: '#142918', shadowHex: '#25542d',
      midtoneHex: '#3b8246', highlightHex: '#68b570'
    },
    floralPalettes: [
      { petalPrimaryHex: '#f43f5e', petalHighlightHex: '#fda4af', centerDiskHex: '#fef08a' }
    ]
  }
};

export interface EcologicalFloraChoice {
  readonly kind: SecondaryFloraKind;
  readonly variantSeed: number;
}

/**
 * Phase 3A — deterministically resolves botanical anatomy and spatial patches.
 * Stateless with respect to world/chunk traversal, so negative coordinates,
 * revisits and different chunk-load orders produce the same output.
 */
export class FloraMorphologyResolver {
  public resolveFloraMorphology(
    kind: SecondaryFloraKind,
    profile: ArtStyleProfile,
    seed: number | string
  ): FloraMorphologyDescriptor {
    const resolvedSeed = typeof seed === 'number'
      ? seed >>> 0
      : fnv1aHash32(`${seed}::flora_morph::${kind}`);
    const archetype = FLORA_SPECIES_CATALOG[kind];
    if (!archetype) throw new Error(`Unknown botanical kind: ${kind}`);
    const rng = new SeededRNG(resolvedSeed);
    const mod = profile.moduleSize;
    const canvasWidthModules = rng.nextInt(...archetype.widthModulesRange);
    const canvasHeightModules = rng.nextInt(...archetype.heightModulesRange);
    const canvasWidthTexels = canvasWidthModules * mod;
    const canvasHeightTexels = canvasHeightModules * mod;
    const pivotX = Math.floor(canvasWidthTexels / 2);
    const pivotY = canvasHeightTexels - 2;
    const stems: FloraStemSegment[] = [];
    const leaves: FloraLeafBlade[] = [];
    const blossoms: FloraBlossomHead[] = [];
    const fungalCaps: FungalCapNode[] = [];

    if (archetype.growthHabit === 'mycelium_colony') {
      this.buildMushroomColony(
        fungalCaps, archetype, canvasWidthTexels, canvasHeightTexels,
        pivotX, pivotY, mod, rng
      );
    } else {
      this.buildStemsLeavesAndBlossoms(
        archetype, stems, leaves, blossoms,
        canvasWidthTexels, canvasHeightTexels, pivotX, pivotY, mod, rng
      );
    }

    return {
      schemaVersion: PPAE_SCHEMA_VERSION,
      seed: resolvedSeed, kind,
      growthHabit: archetype.growthHabit,
      corollaSymmetry: archetype.corollaSymmetry,
      canvasWidthModules, canvasHeightModules,
      canvasWidthTexels, canvasHeightTexels,
      pivotTexel: [pivotX, pivotY],
      stems, leaves, blossoms, fungalCaps,
      metrics: this.computeFloraMetrics(stems, leaves, blossoms, fungalCaps, pivotY)
    };
  }

  /**
   * Deterministic medium-frequency ecological clusters: one shared guild is
   * preferred across 3x3 tiles, while per-tile variance prevents cloned stems.
   * Habitat rules override the shared patch guild at shores and arid terrain.
   */
  public selectEcologicalFloraKind(
    worldSeed: number | string,
    tileX: number,
    tileY: number,
    biome: BiomeId,
    material: TerrainMaterialId,
    moisture: number,
    temperature: number,
    isNearWaterShore: boolean
  ): EcologicalFloraChoice {
    const baseSeed = typeof worldSeed === 'number'
      ? worldSeed >>> 0 : fnv1aHash32(String(worldSeed));
    const patchX = Math.floor(tileX / 3);
    const patchY = Math.floor(tileY / 3);
    const patchHash = fnv1aHash32(
      `${baseSeed}::eco_patch::${patchX},${patchY}`
    );
    const localHash = fnv1aHash32(
      `${baseSeed}::eco_local::${tileX},${tileY}`
    );
    const patchRoll = (patchHash % 1000) / 1000;
    const localRoll = (localHash % 1000) / 1000;
    let kind: SecondaryFloraKind;

    if (material === 'desert_dune') {
      kind = localRoll < .65 ? 'desert_cactus' : 'thorny_bramble';
    } else if (material === 'shallow_water') {
      kind = localRoll < .7 ? 'water_lily_pad' : 'water_reed';
    } else if (isNearWaterShore) {
      kind = localRoll < .6 ? 'water_reed'
        : localRoll < .85 ? 'fern' : 'ground_moss';
    } else if (biome === 'forest') {
      if (moisture > .68) {
        if (temperature > .62) {
          kind = localRoll < .55 ? 'tropical_broadleaf' : 'fern';
        } else {
          kind = patchRoll < .38 ? 'fern'
            : patchRoll < .68 ? 'mushroom_cluster' : 'ground_moss';
        }
      } else {
        kind = patchRoll < .35 ? 'low_shrub'
          : patchRoll < .65 ? 'wild_herb'
          : localRoll < .5 ? 'creeping_vine' : 'tall_grass';
      }
    } else if (biome === 'tundra') {
      kind = localRoll < .45 ? 'ground_moss'
        : localRoll < .78 ? 'short_grass' : 'thorny_bramble';
    } else {
      if (patchRoll < .32) {
        kind = localRoll < .62 ? 'short_grass' : 'tall_grass';
      } else if (patchRoll < .62) {
        kind = localRoll < .48 ? 'wild_flower'
          : localRoll < .82 ? 'flower_cluster' : 'flowering_shrub';
      } else if (patchRoll < .84) {
        kind = localRoll < .55 ? 'wild_herb' : 'low_shrub';
      } else {
        kind = localRoll < .5 ? 'weed_thistle' : 'tall_grass';
      }
    }

    const variantSeed = fnv1aHash32(
      `${localHash}::kind_${kind}::dx_${tileX & 3}::dy_${tileY & 3}`
    );
    return { kind, variantSeed };
  }

  /**
   * Geometry only: asymmetric seeds, quadratic control points, attached leaves,
   * individual flower heads. The rasterizer will consume these in phase 3B.
   */
  private buildStemsLeavesAndBlossoms(
    archetype: FloraSpeciesArchetype,
    stems: FloraStemSegment[],
    leaves: FloraLeafBlade[],
    blossoms: FloraBlossomHead[],
    widthPx: number,
    heightPx: number,
    pivotX: number,
    pivotY: number,
    mod: number,
    rng: SeededRNG
  ): void {
    const stemCount = rng.nextInt(...archetype.stemCountRange);
    const maxSpread = Math.max(2, Math.floor(widthPx * .34));
    for (let i = 0; i < stemCount; i++) {
      const norm = stemCount === 1 ? 0 : i / (stemCount - 1) * 2 - 1;
      const jitter = rng.nextInt(-2, 2);
      const baseX = Math.max(2,
        Math.min(widthPx - 3, Math.round(pivotX + norm * maxSpread * .72 + jitter))
      );
      const baseY = pivotY - rng.nextInt(0, 1);
      // Short and tall graminoids occupy non-overlapping height bands so the
      // category remains recognizable even with adversarial variation seeds.
      const heightRange = archetype.kind === 'short_grass'
        ? [0.30, 0.46] as const
        : archetype.kind === 'tall_grass'
          ? [0.72, 0.86] as const
          : [0.45, 0.84] as const;
      const stemHeight = Math.max(3,
        Math.round(heightPx * rng.nextRange(heightRange[0], heightRange[1]))
      );
      const archCurve = Math.round(norm * archetype.maxStemCurvePx) +
        rng.nextInt(-archetype.maxStemCurvePx, archetype.maxStemCurvePx);
      const tipX = Math.max(2, Math.min(widthPx - 3, baseX + archCurve));
      const tipY = Math.max(2, baseY - stemHeight);
      const controlX = Math.round((baseX + tipX) * .5 + archCurve * .35);
      const controlY = Math.round((baseY + tipY) * .5 - 1);
      const stemId = `stem_${i}`;
      stems.push({
        stemId, baseX, baseY, controlX, controlY, tipX, tipY,
        thicknessPx: archetype.growthHabit === 'spiny_succulent' ||
          archetype.growthHabit === 'woody_cushion' ? 2 : 1,
        hasThorns: archetype.leafShape === 'thorn_stem'
      });

      const leafCount = rng.nextInt(...archetype.leafCountPerStemRange);
      for (let l = 0; l < leafCount; l++) {
        const t = (l + 1) / (leafCount + 1);
        // Leaves originate along the same quadratic curve as their host stem.
        const it = 1 - t;
        const attachX = Math.round(it * it * baseX +
          2 * it * t * controlX + t * t * tipX);
        const attachY = Math.round(it * it * baseY +
          2 * it * t * controlY + t * t * tipY);
        const side = (i + l) % 2 === 0 ? -1 : 1;
        const leafSpanX = archetype.leafShape === 'broad_tropical' ||
          archetype.leafShape === 'serrated_fern'
          ? rng.nextInt(3, Math.max(4, mod + 1))
          : rng.nextInt(2, Math.max(3, mod - 1));
        const leafDropY = archetype.growthHabit === 'frond_arch'
          ? rng.nextInt(0, 2)
          : rng.nextInt(-2, 1);
        leaves.push({
          leafId: `${stemId}_leaf_${l}`, parentStemId: stemId,
          attachX, attachY,
          tipX: Math.max(1, Math.min(widthPx - 2, attachX + side * leafSpanX)),
          tipY: Math.max(1, Math.min(pivotY, attachY + leafDropY)),
          widthPx: archetype.leafShape === 'broad_tropical' ||
            archetype.leafShape === 'floating_pad' ? 2 : 1,
          shape: archetype.leafShape,
          toneBand: l % 2 === 0 ? 'highlight' : 'midtone'
        });
      }
    }

    if (archetype.corollaSymmetry !== 'none' &&
      archetype.floralPalettes && archetype.floralPalettes.length > 0) {
      const palette = rng.pick(archetype.floralPalettes);
      const blossomCount = Math.min(stems.length,
        rng.nextInt(...archetype.blossomCountRange));
      for (let b = 0; b < blossomCount; b++) {
        const host = stems[b % stems.length];
        blossoms.push({
          blossomId: `blossom_${b}`, parentStemId: host.stemId,
          centerX: host.tipX, centerY: host.tipY,
          symmetry: archetype.corollaSymmetry,
          petalCount: archetype.corollaSymmetry === 'radial_daisy'
            ? rng.nextInt(4, 6) : 3,
          petalRadiusPx: Math.max(2, Math.round(mod * .45)),
          centerDiskRadiusPx: 1,
          orientationAngleRad: Number(rng.nextRange(-.4, .4).toFixed(3)),
          petalPrimaryHex: palette.petalPrimaryHex,
          petalHighlightHex: palette.petalHighlightHex,
          centerDiskHex: palette.centerDiskHex
        });
      }
    }
  }

  private buildMushroomColony(
    fungi: FungalCapNode[],
    archetype: FloraSpeciesArchetype,
    widthPx: number,
    heightPx: number,
    pivotX: number,
    pivotY: number,
    mod: number,
    rng: SeededRNG
  ): void {
    const count = rng.nextInt(...archetype.stemCountRange);
    const colors = [
      { cap: '#dc2626', spot: '#fff7ed', stem: '#e7e5e4' },
      { cap: '#d97706', spot: '#fef3c7', stem: '#d6d3d1' },
      { cap: '#7c3aed', spot: '#ddd6fe', stem: '#cbd5e1' }
    ];
    const chosen = rng.pick(colors);
    for (let i = 0; i < count; i++) {
      const norm = count === 1 ? 0 : i / (count - 1) * 2 - 1;
      const stemBaseX = Math.max(3,
        Math.min(widthPx - 4, Math.round(pivotX + norm * mod * .85))
      );
      const stemBaseY = pivotY - i % 2;
      const height = i === 0 ? Math.max(3, Math.floor(heightPx * .48))
        : Math.max(2, Math.floor(heightPx * .32));
      fungi.push({
        capId: `fungi_${i}`, stemBaseX, stemBaseY,
        capCenterX: stemBaseX + rng.nextInt(-1, 1),
        capCenterY: stemBaseY - height,
        capRadiusX: i === 0 ? Math.max(3, Math.floor(mod * .75))
          : Math.max(2, Math.floor(mod * .5)),
        capRadiusY: i === 0 ? 3 : 2, hasSpots: true,
        capColorHex: chosen.cap, spotColorHex: chosen.spot,
        stemColorHex: chosen.stem
      });
    }
  }

  private computeFloraMetrics(
    stems: readonly FloraStemSegment[],
    leaves: readonly FloraLeafBlade[],
    blossoms: readonly FloraBlossomHead[],
    fungi: readonly FungalCapNode[],
    pivotY: number
  ): FloraMorphologyDescriptor['metrics'] {
    if (fungi.length > 0) {
      const xs = fungi.map(f => f.capCenterX);
      const upper = Math.min(...fungi.map(f => f.capCenterY - f.capRadiusY));
      return {
        stemCount: fungi.length, leafCount: 0, blossomCount: 0,
        horizontalSpreadPx: Math.max(4, Math.max(...xs) - Math.min(...xs) + 4),
        maxHeightPx: Math.max(3, pivotY - upper), stemSpacingVariance: 1.2
      };
    }
    if (stems.length === 0) {
      return {
        stemCount: 0, leafCount: 0, blossomCount: 0,
        horizontalSpreadPx: 0, maxHeightPx: 0, stemSpacingVariance: 0
      };
    }
    const xs = stems.flatMap(s => [s.baseX, s.tipX]);
    const topY = Math.min(...stems.map(s => s.tipY));
    const tips = stems.map(s => s.tipX).sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < tips.length; i++) gaps.push(tips[i] - tips[i-1]);
    const meanGap = gaps.length ? gaps.reduce((a,b) => a + b, 0) / gaps.length : 0;
    const variation = gaps.length
      ? gaps.reduce((total, gap) => total + Math.abs(gap - meanGap), 0) / gaps.length
      : 0;
    return {
      stemCount: stems.length, leafCount: leaves.length,
      blossomCount: blossoms.length,
      horizontalSpreadPx: Math.max(1, Math.max(...xs) - Math.min(...xs)),
      maxHeightPx: Math.max(1, pivotY - topY),
      stemSpacingVariance: Number(variation.toFixed(3))
    };
  }
}
