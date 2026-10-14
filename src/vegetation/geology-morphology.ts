import type {
  ArtStyleProfile,
  GeologicalArchetypeDefinition,
  GeologicalFacetPlane,
  GeologicalFractureLine,
  GeologicalMorphologyDescriptor,
  GeologicalPolygonVertex,
  GeologicalResourceKind,
  MineralInclusionCluster,
  RockSubFragment
} from '../core/contracts';
import { PPAE_SCHEMA_VERSION } from '../core/contracts';
import { fnv1aHash32, SeededRNG } from '../core/deterministic';

/**
 * Geology 2A: seventeen independent structural and geological classes.
 * The seven historical GeologicalResourceKind identifiers remain unchanged.
 */
export const GEOLOGICAL_ARCHETYPE_CATALOG: Readonly<
  Record<GeologicalResourceKind, GeologicalArchetypeDefinition>
> = {
  surface_pebbles: {
    kind: 'surface_pebbles', lithology: 'limestone', geometryClass: 'pebble_scatter',
    widthModulesRange: [4,5], heightModulesRange: [3,4],
    fragmentCountRange: [4,7], angularity: 0.25,
    flatnessRatio: 0.55, burialDepthRatio: 0.1, fractureDensity: 0,
    mossAffinity: 0.1, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#1e242b', deepShadowHex: '#475361',
      midtoneHex: '#738294', highlightHex: '#a3b1c2', accentHex: '#cbd5e1'
    }
  },
  angular_boulder: {
    kind: 'angular_boulder', lithology: 'granite', geometryClass: 'angular_polyhedron',
    widthModulesRange: [5,7], heightModulesRange: [4,6],
    fragmentCountRange: [1,2], angularity: 0.88,
    flatnessRatio: 0.85, burialDepthRatio: 0.15, fractureDensity: 0.35,
    mossAffinity: 0.15, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#181c24', deepShadowHex: '#3b4454',
      midtoneHex: '#637085', highlightHex: '#94a3b8', accentHex: '#cbd5e1'
    }
  },
  rounded_riverstone: {
    kind: 'rounded_riverstone', lithology: 'quartzite', geometryClass: 'rounded_boulder',
    widthModulesRange: [5,6], heightModulesRange: [4,5],
    fragmentCountRange: [2,3], angularity: 0.12,
    flatnessRatio: 0.72, burialDepthRatio: 0.2, fractureDensity: 0.05,
    mossAffinity: 0.25, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#1c252c', deepShadowHex: '#3e505e',
      midtoneHex: '#647d8f', highlightHex: '#96b0c2', accentHex: '#d0e1ed'
    }
  },
  fractured_monolith: {
    kind: 'fractured_monolith', lithology: 'slate', geometryClass: 'split_monolith',
    widthModulesRange: [5,7], heightModulesRange: [6,8],
    fragmentCountRange: [2,3], angularity: 0.92,
    flatnessRatio: 1.35, burialDepthRatio: 0.18, fractureDensity: 0.85,
    mossAffinity: 0.2, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#131720', deepShadowHex: '#2d3548',
      midtoneHex: '#4c5870', highlightHex: '#7a88a1', accentHex: '#a8b5cc'
    }
  },
  flat_slab: {
    kind: 'flat_slab', lithology: 'slate', geometryClass: 'layered_slab',
    widthModulesRange: [6,8], heightModulesRange: [3,4],
    fragmentCountRange: [2,3], angularity: 0.75,
    flatnessRatio: 0.38, burialDepthRatio: 0.25, fractureDensity: 0.4,
    mossAffinity: 0.3, hasStrataBands: true,
    stonePalette: {
      outlineHex: '#1b2028', deepShadowHex: '#3d4654',
      midtoneHex: '#5e6b7d', highlightHex: '#8c9bb0', accentHex: '#b8c5d6'
    }
  },
  sunken_half_buried: {
    kind: 'sunken_half_buried', lithology: 'granite', geometryClass: 'sunken_embed',
    widthModulesRange: [5,7], heightModulesRange: [3,4],
    fragmentCountRange: [1,2], angularity: 0.55,
    flatnessRatio: 0.5, burialDepthRatio: 0.52, fractureDensity: 0.25,
    mossAffinity: 0.45, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#1c2026', deepShadowHex: '#3f4752',
      midtoneHex: '#636e7d', highlightHex: '#8d99ab', accentHex: '#b6c2d1'
    }
  },
  jagged_outcrop: {
    kind: 'jagged_outcrop', lithology: 'slate', geometryClass: 'jagged_spires',
    widthModulesRange: [6,8], heightModulesRange: [5,7],
    fragmentCountRange: [3,4], angularity: 0.95,
    flatnessRatio: 1.2, burialDepthRatio: 0.2, fractureDensity: 0.6,
    mossAffinity: 0.15, hasStrataBands: true,
    stonePalette: {
      outlineHex: '#141821', deepShadowHex: '#2f384a',
      midtoneHex: '#515f78', highlightHex: '#7d8da6', accentHex: '#aebcd1'
    }
  },
  stacked_cairn: {
    kind: 'stacked_cairn', lithology: 'limestone', geometryClass: 'stacked_stones',
    widthModulesRange: [4,6], heightModulesRange: [5,7],
    fragmentCountRange: [3,4], angularity: 0.48,
    flatnessRatio: 0.6, burialDepthRatio: 0.08, fractureDensity: 0.15,
    mossAffinity: 0.25, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#1e2229', deepShadowHex: '#464f5e',
      midtoneHex: '#6f7c91', highlightHex: '#9eabbf', accentHex: '#cdd6e3'
    }
  },
  mossy_boulder: {
    kind: 'mossy_boulder', lithology: 'granite', geometryClass: 'angular_polyhedron',
    widthModulesRange: [5,7], heightModulesRange: [4,6],
    fragmentCountRange: [1,2], angularity: 0.62,
    flatnessRatio: 0.82, burialDepthRatio: 0.22, fractureDensity: 0.3,
    mossAffinity: 0.85, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#18221f', deepShadowHex: '#3b4a47',
      midtoneHex: '#5e706c', highlightHex: '#899e99', accentHex: '#4d8a42'
    }
  },
  eroded_sandstone: {
    kind: 'eroded_sandstone', lithology: 'sandstone', geometryClass: 'layered_slab',
    widthModulesRange: [6,8], heightModulesRange: [5,7],
    fragmentCountRange: [2,3], angularity: 0.58,
    flatnessRatio: 0.9, burialDepthRatio: 0.15, fractureDensity: 0.35,
    mossAffinity: 0, hasStrataBands: true,
    stonePalette: {
      outlineHex: '#2e1b10', deepShadowHex: '#6e4226',
      midtoneHex: '#a6683c', highlightHex: '#d4945d', accentHex: '#f0be8a'
    }
  },
  volcanic_basalt: {
    kind: 'volcanic_basalt', lithology: 'basalt', geometryClass: 'columnar_basalt',
    widthModulesRange: [5,7], heightModulesRange: [5,7],
    fragmentCountRange: [3,5], angularity: 0.96,
    flatnessRatio: 1.25, burialDepthRatio: 0.15, fractureDensity: 0.7,
    mossAffinity: 0, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#0b0c10', deepShadowHex: '#1c1f29',
      midtoneHex: '#323747', highlightHex: '#50576e', accentHex: '#ea580c'
    }
  },
  crag_cliff_boulder: {
    kind: 'crag_cliff_boulder', lithology: 'granite', geometryClass: 'jagged_spires',
    widthModulesRange: [7,9], heightModulesRange: [6,8],
    fragmentCountRange: [3,4], angularity: 0.9,
    flatnessRatio: 1.15, burialDepthRatio: 0.15, fractureDensity: 0.65,
    mossAffinity: 0.25, hasStrataBands: true,
    stonePalette: {
      outlineHex: '#141820', deepShadowHex: '#333c4d',
      midtoneHex: '#56637a', highlightHex: '#8493ab', accentHex: '#b3c1d6'
    }
  },
  coal_deposit: {
    kind: 'coal_deposit', lithology: 'slate', geometryClass: 'angular_polyhedron',
    widthModulesRange: [5,6], heightModulesRange: [4,5],
    fragmentCountRange: [1,2], angularity: 0.85,
    flatnessRatio: 0.85, burialDepthRatio: 0.18, fractureDensity: 0.65,
    mossAffinity: 0.05, hasStrataBands: true,
    stonePalette: {
      outlineHex: '#14171f', deepShadowHex: '#343b4a',
      midtoneHex: '#586378', highlightHex: '#8290a8', accentHex: '#a8b5cc'
    },
    mineralPalette: {
      veinShadowHex: '#090b10', veinMidtoneHex: '#181b24',
      veinHighlightHex: '#333947', veinCoreHex: '#525b70'
    }
  },
  copper_vein: {
    kind: 'copper_vein', lithology: 'granite', geometryClass: 'angular_polyhedron',
    widthModulesRange: [5,6], heightModulesRange: [4,5],
    fragmentCountRange: [1,2], angularity: 0.82,
    flatnessRatio: 0.88, burialDepthRatio: 0.15, fractureDensity: 0.6,
    mossAffinity: 0.1, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#1b1d24', deepShadowHex: '#424754',
      midtoneHex: '#697182', highlightHex: '#96a0b3', accentHex: '#c2cbd9'
    },
    mineralPalette: {
      veinShadowHex: '#7c2d12', veinMidtoneHex: '#c2410c',
      veinHighlightHex: '#fb923c', veinCoreHex: '#2dd4bf'
    }
  },
  iron_vein: {
    kind: 'iron_vein', lithology: 'granite', geometryClass: 'angular_polyhedron',
    widthModulesRange: [5,7], heightModulesRange: [4,6],
    fragmentCountRange: [1,2], angularity: 0.86,
    flatnessRatio: 0.9, burialDepthRatio: 0.15, fractureDensity: 0.65,
    mossAffinity: 0.08, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#191d26', deepShadowHex: '#3b4354',
      midtoneHex: '#616d82', highlightHex: '#8e9cb3', accentHex: '#bdcadb'
    },
    mineralPalette: {
      veinShadowHex: '#5c2b1d', veinMidtoneHex: '#9a4a32',
      veinHighlightHex: '#d97757', veinCoreHex: '#f5b895'
    }
  },
  gold_vein: {
    kind: 'gold_vein', lithology: 'quartzite', geometryClass: 'angular_polyhedron',
    widthModulesRange: [5,7], heightModulesRange: [4,6],
    fragmentCountRange: [1,2], angularity: 0.88,
    flatnessRatio: 0.92, burialDepthRatio: 0.15, fractureDensity: 0.7,
    mossAffinity: 0.05, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#1b202b', deepShadowHex: '#404a5e',
      midtoneHex: '#697791', highlightHex: '#9baabf', accentHex: '#d2dceb'
    },
    mineralPalette: {
      veinShadowHex: '#854d0e', veinMidtoneHex: '#eab308',
      veinHighlightHex: '#fde047', veinCoreHex: '#ffffff'
    }
  },
  crystal_geode: {
    kind: 'crystal_geode', lithology: 'obsidian', geometryClass: 'crystal_cluster_geode',
    widthModulesRange: [5,7], heightModulesRange: [5,6],
    fragmentCountRange: [1,2], angularity: 0.94,
    flatnessRatio: 0.95, burialDepthRatio: 0.15, fractureDensity: 0.5,
    mossAffinity: 0, hasStrataBands: false,
    stonePalette: {
      outlineHex: '#111625', deepShadowHex: '#26304a',
      midtoneHex: '#435175', highlightHex: '#6c7ea6', accentHex: '#9cb0d6'
    },
    mineralPalette: {
      veinShadowHex: '#0369a1', veinMidtoneHex: '#0ea5e9',
      veinHighlightHex: '#7dd3fc', veinCoreHex: '#f0f9ff'
    }
  }
};


interface FragmentLayout {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly zOrder: number;
}

/** Resolves faceted geology deterministically without invoking a rasterizer. */
export class GeologicalMorphologyResolver {
  public resolveGeologicalMorphology(
    kind: GeologicalResourceKind,
    profile: ArtStyleProfile,
    seed: number | string
  ): GeologicalMorphologyDescriptor {
    const resolvedSeed = typeof seed === 'number'
      ? seed >>> 0
      : fnv1aHash32(`${seed}::geology_morph::${kind}`);
    const archetype = GEOLOGICAL_ARCHETYPE_CATALOG[kind];
    if (!archetype) throw new Error(`Unknown geological formation: ${kind}`);
    const rng = new SeededRNG(resolvedSeed);
    const mod = profile.moduleSize;
    const canvasWidthModules = rng.nextInt(...archetype.widthModulesRange);
    const canvasHeightModules = rng.nextInt(...archetype.heightModulesRange);
    const canvasWidthTexels = canvasWidthModules * mod;
    const canvasHeightTexels = canvasHeightModules * mod;
    const pivotX = Math.floor(canvasWidthTexels / 2);
    const pivotY = canvasHeightTexels - Math.max(2, Math.floor(mod * 0.5));
    const fragments = this.buildRockFragments(
      archetype, canvasWidthTexels, canvasHeightTexels, pivotX, pivotY, profile, rng
    );
    const mineralInclusions = this.buildMineralInclusions(archetype, fragments, profile, rng);
    const totalFacetCount = fragments.reduce((sum, frag) => sum + frag.facets.length, 0);
    const fractureCount = fragments.reduce((sum, frag) => sum + frag.fractures.length, 0);
    return {
      schemaVersion: PPAE_SCHEMA_VERSION,
      seed: resolvedSeed,
      kind, lithology: archetype.lithology, geometryClass: archetype.geometryClass,
      canvasWidthModules, canvasHeightModules, canvasWidthTexels, canvasHeightTexels,
      pivotTexel: [pivotX, pivotY],
      fragments, mineralInclusions,
      metrics: {
        fragmentCount: fragments.length, totalFacetCount, fractureCount,
        inclusionCount: mineralInclusions.length,
        aspectRatio: Number((canvasWidthTexels / canvasHeightTexels).toFixed(3)),
        angularityScore: archetype.angularity
      }
    };
  }

  public computeGeologicalDissimilarity(
    a: GeologicalMorphologyDescriptor,
    b: GeologicalMorphologyDescriptor
  ): number {
    const classDiff = a.geometryClass !== b.geometryClass ? 1 : 0;
    const fragmentsDiff = Math.min(1, Math.abs(a.metrics.fragmentCount - b.metrics.fragmentCount) / 4);
    const aspectDiff = Math.min(1, Math.abs(a.metrics.aspectRatio - b.metrics.aspectRatio) / 0.8);
    const angularDiff = Math.min(1, Math.abs(a.metrics.angularityScore - b.metrics.angularityScore));
    const vertexA = a.fragments[0]?.hullVertices[0] ?? { x: 0, y: 0 };
    const vertexB = b.fragments[0]?.hullVertices[0] ?? { x: 0, y: 0 };
    const vertexDrift = Math.min(1, Math.hypot(vertexA.x - vertexB.x, vertexA.y - vertexB.y) / 8);
    return Number((
      classDiff * 0.3 + fragmentsDiff * 0.2 + aspectDiff * 0.2 +
      angularDiff * 0.15 + vertexDrift * 0.15
    ).toFixed(3));
  }

  private buildRockFragments(
    archetype: GeologicalArchetypeDefinition,
    widthPx: number, heightPx: number, pivotX: number, pivotY: number,
    profile: ArtStyleProfile, rng: SeededRNG
  ): RockSubFragment[] {
    const count = rng.nextInt(...archetype.fragmentCountRange);
    const fragments: RockSubFragment[] = [];
    for (let i = 0; i < count; i++) {
      const layout = this.computeFragmentLayout(
        archetype, i, count, widthPx, heightPx, pivotX, pivotY, rng
      );
      const hullVertices = this.buildPolygonHull(
        layout.cx, layout.cy, layout.rx, layout.ry,
        archetype.angularity, archetype.burialDepthRatio, rng
      );
      const id = `frag_${i}`;
      const facets = this.buildFacetPlanes(
        id, layout.cx, layout.cy, hullVertices,
        archetype.angularity, profile.lightDirectionVector, rng
      );
      const fractures = this.buildFractureLines(
        id, layout.cx, layout.cy, layout.rx, layout.ry,
        archetype.fractureDensity, !!archetype.mineralPalette, rng
      );
      fragments.push({
        fragmentId: id, centerX: layout.cx, centerY: layout.cy,
        radiusX: layout.rx, radiusY: layout.ry, zOrder: layout.zOrder,
        hullVertices, facets, fractures,
        mossCoverageRatio: archetype.mossAffinity > 0
          ? Number(Math.min(1, archetype.mossAffinity * rng.nextRange(.75, 1.15)).toFixed(2))
          : 0,
        strataLineSpacingPx: archetype.hasStrataBands
          ? Math.max(2, Math.floor(profile.moduleSize * .65))
          : undefined
      });
    }
    // Preserve the painter's back-to-front order while keeping stable fragment IDs.
    return fragments.sort((a, b) => a.zOrder - b.zOrder);
  }

  private computeFragmentLayout(
    archetype: GeologicalArchetypeDefinition,
    index: number, total: number, widthPx: number, heightPx: number,
    pivotX: number, pivotY: number, rng: SeededRNG
  ): FragmentLayout {
    const kind = archetype.geometryClass;
    if (kind === 'pebble_scatter') {
      const angle = index / total * Math.PI * 2 + rng.nextRange(-.3, .3);
      const distance = rng.nextRange(2, Math.max(3, widthPx * .28));
      const rx = rng.nextInt(2, Math.max(3, Math.floor(widthPx * .14)));
      const ry = Math.max(2, Math.round(rx * .75));
      const cx = Math.max(rx + 1,
        Math.min(widthPx - rx - 2, Math.round(pivotX + Math.cos(angle) * distance)));
      const cy = Math.max(ry + 2, Math.min(pivotY - 1,
        Math.round(pivotY - heightPx * .25 + Math.sin(angle) * distance * .6)));
      return { cx, cy, rx, ry, zOrder: cy };
    }
    if (kind === 'stacked_stones') {
      const ratio = index / Math.max(1, total - 1);
      const rx = Math.max(3, Math.round(widthPx * (.34 - ratio * .14) + rng.nextRange(-1, 1)));
      const ry = Math.max(2, Math.round(heightPx * .16));
      const cx = pivotX + rng.nextInt(-1, 1);
      const cy = Math.max(ry + 2, Math.round(pivotY - ry - index * ry * 1.45));
      return { cx, cy, rx, ry, zOrder: index + 10 };
    }
    if (kind === 'jagged_spires' || kind === 'columnar_basalt' || kind === 'split_monolith') {
      const side = index === 0 ? 0 : index % 2 === 1 ? -1 : 1;
      const spreadX = Math.round(side * widthPx * .18 + rng.nextInt(-1, 1));
      const scale = index === 0 ? 1 : rng.nextRange(.58, .78);
      const rx = Math.max(3, Math.round(widthPx * .24 * scale));
      const ry = Math.max(4, Math.round(heightPx * .36 * archetype.flatnessRatio * scale));
      const cx = Math.max(rx + 2, Math.min(widthPx - rx - 2, pivotX + spreadX));
      const cy = Math.max(ry + 2, pivotY - ry + (index === 0 ? 0 : 2));
      return { cx, cy, rx, ry, zOrder: cy + index };
    }
    if (index === 0) {
      const rx = Math.max(4, Math.round(widthPx * rng.nextRange(.32, .40)));
      const ry = Math.max(3, Math.round(heightPx *
        rng.nextRange(.28, .36) * archetype.flatnessRatio));
      const cx = pivotX + rng.nextInt(-2, 2);
      const cy = Math.max(ry + 2, pivotY - ry);
      return { cx, cy, rx, ry, zOrder: cy };
    }
    const side = index % 2 === 1 ? 1 : -1;
    const rx = Math.max(3, Math.round(widthPx * rng.nextRange(.18, .24)));
    const ry = Math.max(2, Math.round(heightPx * rng.nextRange(.16, .22)));
    const cx = Math.max(rx + 1, Math.min(widthPx - rx - 2,
      pivotX + side * Math.round(widthPx * .2)));
    const cy = Math.max(ry + 2, pivotY - ry + 1);
    return { cx, cy, rx, ry, zOrder: cy + 5 };
  }

  /** Discrete clockwise hull, irregular radial vertices, and a flattened ground face. */
  private buildPolygonHull(
    cx: number, cy: number, rx: number, ry: number,
    angularity: number, burial: number, rng: SeededRNG
  ): GeologicalPolygonVertex[] {
    const count = angularity > .75 ? rng.nextInt(6, 8) : rng.nextInt(8, 11);
    const vertices: GeologicalPolygonVertex[] = [];
    const flatBottomY = cy + Math.max(1, Math.round(ry * (1 - burial * .45)));
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 - Math.PI / 2 +
        (rng.nextFloat() - .5) * angularity * .42;
      const radial = 1 + (rng.nextFloat() - .5) * (.18 + angularity * .28);
      const x = Math.round(cx + Math.cos(angle) * rx * radial);
      const y = Math.min(flatBottomY, Math.round(cy + Math.sin(angle) * ry * radial));
      vertices.push({ x, y });
    }
    return vertices;
  }

  /**
   * Approximate planar facet normals, normalized to unit length.
   * Radial face slope gives the lateral direction; positive z is the raised
   * crest. The light vector contains a zenith component to model 3/4 lighting.
   */
  private buildFacetPlanes(
    fragmentId: string, cx: number, cy: number,
    hull: readonly GeologicalPolygonVertex[],
    angularity: number, light2D: readonly [number, number],
    rng: SeededRNG
  ): GeologicalFacetPlane[] {
    const apexX = cx + rng.nextInt(-1, 1);
    const apexY = cy - Math.max(1, Math.round(angularity * 2));
    const lightLength = Math.max(1e-6,
      Math.hypot(-light2D[0], -light2D[1], .55));
    const lx = -light2D[0] / lightLength;
    const ly = -light2D[1] / lightLength;
    const lz = .55 / lightLength;
    const facets: GeologicalFacetPlane[] = [];
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length];
      const dx = (a.x + b.x + apexX) / 3 - apexX;
      const dy = (a.y + b.y + apexY) / 3 - apexY;
      // Constant ridge altitude is a simple 3D prism approximation.
      const len = Math.max(1e-6, Math.hypot(dx, dy, 2.75));
      const nx = dx / len, ny = dy / len, nz = 2.75 / len;
      const lightScore = Math.max(-1, Math.min(1, nx * lx + ny * ly + nz * lz));
      const toneBand: GeologicalFacetPlane['toneBand'] =
        lightScore > .52 ? 'highlight' : lightScore > .18 ? 'midtone' : 'shadow';
      facets.push({
        facetId: `${fragmentId}_facet_${i}`,
        vertices: [{ x: apexX, y: apexY }, a, b],
        normalVector3D: [nx, ny, nz].map(n => Number(n.toFixed(3))) as [number, number, number],
        faceLightScore: Number(lightScore.toFixed(3)),
        toneBand
      });
    }
    return facets;
  }

  private buildFractureLines(
    fragmentId: string, cx: number, cy: number,
    rx: number, ry: number, density: number,
    containsMinerals: boolean, rng: SeededRNG
  ): GeologicalFractureLine[] {
    if (density <= .05 || rx < 3) return [];
    const count = Math.max(1, Math.round(density * 3));
    const fractures: GeologicalFractureLine[] = [];
    for (let i = 0; i < count; i++) {
      const sx = cx + rng.nextInt(-Math.floor(rx * .5), Math.floor(rx * .5));
      const midX = sx + rng.nextInt(-2, 2);
      const midY = cy + rng.nextInt(-1, 1);
      const endX = midX + rng.nextInt(-2, 2);
      fractures.push({
        fractureId: `${fragmentId}_frac_${i}`,
        points: [
          { x: sx, y: cy - Math.floor(ry * .6) },
          { x: midX, y: midY },
          { x: endX, y: cy + Math.floor(ry * .55) }
        ],
        widthPx: density > .75 && i === 0 ? 2 : 1,
        depthShadow: true,
        hostsMineralVein: containsMinerals && i === 0
      });
    }
    return fractures;
  }

  private buildMineralInclusions(
    archetype: GeologicalArchetypeDefinition,
    fragments: readonly RockSubFragment[],
    profile: ArtStyleProfile, rng: SeededRNG
  ): MineralInclusionCluster[] {
    if (!archetype.mineralPalette || fragments.length === 0) return [];
    const primary = fragments.find(f => f.fragmentId === 'frag_0') ?? fragments[0];
    const pal = archetype.mineralPalette;
    const crystal = archetype.geometryClass === 'crystal_cluster_geode';
    const count = crystal ? rng.nextInt(4, 6) : rng.nextInt(3, 5);
    const inclusions: MineralInclusionCluster[] = [];
    for (let i = 0; i < count; i++) {
      const tilt = (i / count * Math.PI - Math.PI * .85) * .45;
      const ox = primary.centerX + rng.nextInt(
        -Math.max(2, Math.floor(primary.radiusX * .55)),
        Math.max(2, Math.floor(primary.radiusX * .55))
      );
      const oy = primary.centerY + rng.nextInt(
        -Math.max(2, Math.floor(primary.radiusY * .55)),
        Math.max(1, Math.floor(primary.radiusY * .35))
      );
      inclusions.push({
        inclusionId: `inc_${i}`,
        shape: crystal ? (i === 0 ? 'geode_cavity' : 'hex_crystal_spire')
          : i % 2 === 0 ? 'embedded_vein' : 'ore_nodule',
        centerX: ox, centerY: oy,
        lengthPx: crystal
          ? rng.nextInt(profile.moduleSize, profile.moduleSize * 2)
          : rng.nextInt(3, profile.moduleSize + 2),
        widthPx: crystal ? rng.nextInt(2, 3) : 2,
        tiltAngleRad: Number(tilt.toFixed(3)),
        primaryHex: pal.veinMidtoneHex,
        highlightHex: pal.veinHighlightHex,
        coreGlowHex: pal.veinCoreHex
      });
    }
    return inclusions;
  }
}
