import type {
  ArtStyleProfile,
  BotanicalFamilyId,
  TreeBranchSegment,
  TreeFoliageMassNode,
  TreeLifecycleStage,
  TreeMorphologyArchetype,
  TreeMorphologyDescriptor,
  TreeRootTendril,
  TreeSilhouetteMetrics,
  TreeSkeletonNode,
  TreeSpeciesDefinition,
  TreeStructuralSkeleton
} from '../core/contracts';
import { PPAE_SCHEMA_VERSION } from '../core/contracts';
import { fnv1aHash32, SeededRNG } from '../core/deterministic';

/** Nivel A: doce familias botánicas con paletas propias. */
function species(
  speciesId: BotanicalFamilyId,
  canopyShape: TreeSpeciesDefinition['canopyShape'],
  trunkWidthModules: number,
  baseHeightModules: number,
  wood: readonly [string,string,string,string],
  foliage: readonly [string,string,string,string,string?]
): TreeSpeciesDefinition {
  return {
    schemaVersion: PPAE_SCHEMA_VERSION, speciesId, canopyShape, trunkWidthModules, baseHeightModules,
    woodColors: { outline: wood[0], shadow: wood[1], midtone: wood[2], highlight: wood[3] },
    foliageColors: { outline: foliage[0], shadow: foliage[1], midtone: foliage[2], highlight: foliage[3], ...(foliage[4] ? { fruitOrAccent: foliage[4] } : {}) }
  };
}

export const BOTANICAL_SPECIES_DEFINITIONS: Readonly<Record<BotanicalFamilyId, TreeSpeciesDefinition>> = {
  oak: species('oak','spreading_dome',2,8,['#24140d','#4a291a','#73422b','#9c5f41'],['#142619','#234d2e','#3b7842','#68b554','#d9384a']),
  pine: species('pine','layered_tiers',1,9,['#1f120e','#3b231b','#5c392d','#7d5243'],['#0f2124','#1b3d40','#2b6163','#4c918e']),
  birch: species('birch','columnar_spire',1,8,['#27272c','#858691','#c9ccd6','#f1f3f9'],['#202b14','#4d6624','#7c9939','#b1cc5c']),
  palm: species('palm','radial_fronds',1,8,['#291a10','#5c3d24','#875c3a','#b08054'],['#192b12','#385e21','#5b8f34','#89c24e','#4f321c']),
  tropical: species('tropical','umbrella_canopy',2,9,['#261710','#4f3122','#784d36','#a36e51'],['#0d2618','#195432','#28854e','#52bf76','#f43f5e']),
  mangrove: species('mangrove','fragmented_open',2,7,['#1f1612','#423027','#63493c','#876756'],['#162617','#2c4f2e','#467848','#70a86f']),
  willow: species('willow','weeping_cascade',2,8,['#211811','#453324','#694e38','#8c6b50'],['#192918','#345932','#56874d','#88b876']),
  fruit_tree: species('fruit_tree','spreading_dome',1,7,['#26160f','#4f2e20','#754632','#9c6248'],['#172919','#29542e','#428246','#6fb86a','#ef4444']),
  bamboo: species('bamboo','segmented_culms',1,9,['#1b2914','#3f612d','#65944a','#96c474'],['#152410','#2f5222','#4d8038','#7cb55e']),
  dead_tree: species('dead_tree','gnarled_bare',2,7,['#1c1917','#38322e','#574e47','#786c63'],['#1c1917','#38322e','#574e47','#786c63']),
  fantasy_lumin: species('fantasy_lumin','umbrella_canopy',2,8,['#131c31','#233559','#385285','#597ab8'],['#0c2938','#155e75','#06b6d4','#67e8f9','#fef08a']),
  corrupted_thorn: species('corrupted_thorn','windswept_asymmetric',2,8,['#1a1126','#32204a','#4d3270','#6e499c'],['#260d29','#591c61','#8f2e9c','#c85ce0'])
};

/**
 * Nivel B: catálogo completo de arquetipos. Se mantiene el modelado de Gemini,
 * representado como tuplas tipadas para evitar duplicar propiedades estáticas.
 */
type Range = readonly [number, number];
type ArchetypeSpec = readonly [
  id: string, name: string,
  crown: TreeMorphologyArchetype['crownArchitecture'],
  posture: TreeMorphologyArchetype['trunkPosture'],
  root: TreeMorphologyArchetype['rootStructure'],
  foliage: TreeMorphologyArchetype['foliageDistribution'],
  width: Range, height: Range, trunkRatio: Range, slenderness: Range,
  lean: number, asymmetry: Range, primaryBranches: Range, secondaryBranches: Range,
  openness: number, exposed: number, fruit: boolean
];
function archetype(familyId: BotanicalFamilyId, spec: ArchetypeSpec): TreeMorphologyArchetype {
  const [archetypeId, displayName, crownArchitecture, trunkPosture, rootStructure, foliageDistribution,
    widthModulesRange, heightModulesRange, trunkHeightRatioRange, trunkSlendernessRange,
    maxLeanAngleRad, asymmetryBiasRange, primaryBranchCountRange, secondaryBranchCountRange,
    canopyOpenness, exposedBranchRatio, allowsFruitOrBlossom] = spec;
  return {
    archetypeId, familyId, displayName, crownArchitecture, trunkPosture, rootStructure,
    foliageDistribution, widthModulesRange, heightModulesRange, trunkHeightRatioRange,
    trunkSlendernessRange, maxLeanAngleRad, asymmetryBiasRange, primaryBranchCountRange,
    secondaryBranchCountRange, canopyOpenness, exposedBranchRatio, allowsFruitOrBlossom
  };
}
const ARCHETYPE_SPECS: Record<BotanicalFamilyId, readonly ArchetypeSpec[]> = {
  oak: [
    ['oak_spreading_monarch','Roble Monarca de Copa Extendida','spreading_dome','forked_twin','spreading_surface','dense_billowing',[8,10],[7,9],[.34,.44],[.14,.19],.16,[-.35,.35],[3,5],[4,7],.28,.25,true],
    ['oak_tall_forest','Roble Alto de Bosque','fragmented_open','leaning','compact_flare','dense_billowing',[6,8],[8,10],[.46,.56],[.11,.15],.24,[-.45,.45],[3,4],[3,6],.48,.4,false],
    ['oak_gnarled_veteran','Roble Veterano Nudoso','windswept_asymmetric','gnarled_twisted','buttress_ridges','sparse_tufts',[7,9],[7,8],[.38,.48],[.16,.22],.32,[-.6,.6],[4,5],[5,8],.55,.55,false]
  ],
  pine: [
    ['pine_alpine_spire','Pino Aguja Alpina','layered_tiers','upright','compact_flare','stratified_pads',[5,7],[9,11],[.22,.32],[.09,.13],.08,[-.15,.15],[4,6],[4,6],.3,.2,false],
    ['pine_windswept_crag','Pino de Risco Barrido por el Viento','windswept_asymmetric','curved_s','spreading_surface','stratified_pads',[6,8],[7,9],[.38,.5],[.11,.15],.38,[.35,.75],[3,5],[3,5],.52,.45,false]
  ],
  birch: [
    ['birch_slender_column','Abedul Esbelto de Corteza Blanca','columnar_spire','leaning','compact_flare','sparse_tufts',[5,6],[8,10],[.42,.55],[.07,.1],.2,[-.3,.3],[3,5],[4,6],.58,.5,false],
    ['birch_twin_clump','Abedul Bifurcado de Doble Fuste','fragmented_open','forked_twin','spreading_surface','sparse_tufts',[6,8],[8,9],[.36,.48],[.08,.11],.28,[-.45,.45],[4,6],[4,7],.54,.48,false]
  ],
  palm: [
    ['palm_coastal_curved','Palmera Costera Curvada','radial_fronds','curved_s','sunken','pendulous_fronds',[7,9],[8,10],[.68,.78],[.08,.11],.42,[-.55,.55],[5,7],[0,2],.6,.1,true]
  ],
  tropical: [
    ['tropical_emergent_umbrella','Árbol Emergente de Dosel Tropical','umbrella_canopy','buttressed_wide','buttress_ridges','stratified_pads',[9,11],[8,10],[.48,.6],[.15,.2],.15,[-.35,.35],[4,6],[4,8],.35,.3,true]
  ],
  mangrove: [
    ['mangrove_stilt_cluster','Manglar de Raíces Zanco','fragmented_open','multi_stemmed','aerial_prop','dense_billowing',[7,9],[7,8],[.45,.56],[.1,.14],.25,[-.45,.45],[3,5],[4,6],.42,.35,false]
  ],
  willow: [
    ['willow_weeping_cascade','Sauce Llorón de Ribera','weeping_cascade','leaning','spreading_surface','pendulous_fronds',[8,10],[7,9],[.35,.45],[.14,.18],.28,[-.4,.4],[4,6],[6,10],.32,.22,false]
  ],
  fruit_tree: [
    ['fruit_orchard_pruned','Manzano de Huerto de Copa Abierta','spreading_dome','forked_twin','compact_flare','dense_billowing',[6,8],[6,8],[.36,.44],[.12,.15],.18,[-.25,.25],[3,4],[3,5],.34,.25,true]
  ],
  bamboo: [
    ['bamboo_culm_stand','Cañaveral de Bambú Segmentado','segmented_culms','multi_stemmed','compact_flare','vertical_plumes',[5,7],[8,11],[.55,.7],[.06,.08],.18,[-.3,.3],[3,5],[3,6],.62,.6,false]
  ],
  dead_tree: [
    ['dead_snag_gnarled','Árbol Seco Desramado','gnarled_bare','gnarled_twisted','spreading_surface','none',[6,8],[7,9],[.42,.55],[.13,.18],.32,[-.5,.5],[3,5],[4,7],1,1,false]
  ],
  fantasy_lumin: [
    ['fantasy_lumin_arch','Árbol Bioluminiscente de Dosel Etéreo','umbrella_canopy','curved_s','buttress_ridges','stratified_pads',[8,10],[8,10],[.42,.54],[.12,.16],.25,[-.4,.4],[4,5],[4,7],.4,.35,true]
  ],
  corrupted_thorn: [
    ['corrupted_Contorted_spire','Espino Corrupto Retorcido','windswept_asymmetric','gnarled_twisted','spreading_surface','sparse_tufts',[6,8],[7,9],[.4,.52],[.12,.16],.36,[-.65,.65],[4,6],[5,8],.64,.65,false]
  ]
};
export const TREE_MORPHOLOGY_ARCHETYPES: Readonly<Record<BotanicalFamilyId, readonly TreeMorphologyArchetype[]>> = {
  oak: ARCHETYPE_SPECS.oak.map((spec) => archetype('oak', spec)),
  pine: ARCHETYPE_SPECS.pine.map((spec) => archetype('pine', spec)),
  birch: ARCHETYPE_SPECS.birch.map((spec) => archetype('birch', spec)),
  palm: ARCHETYPE_SPECS.palm.map((spec) => archetype('palm', spec)),
  tropical: ARCHETYPE_SPECS.tropical.map((spec) => archetype('tropical', spec)),
  mangrove: ARCHETYPE_SPECS.mangrove.map((spec) => archetype('mangrove', spec)),
  willow: ARCHETYPE_SPECS.willow.map((spec) => archetype('willow', spec)),
  fruit_tree: ARCHETYPE_SPECS.fruit_tree.map((spec) => archetype('fruit_tree', spec)),
  bamboo: ARCHETYPE_SPECS.bamboo.map((spec) => archetype('bamboo', spec)),
  dead_tree: ARCHETYPE_SPECS.dead_tree.map((spec) => archetype('dead_tree', spec)),
  fantasy_lumin: ARCHETYPE_SPECS.fantasy_lumin.map((spec) => archetype('fantasy_lumin', spec)),
  corrupted_thorn: ARCHETYPE_SPECS.corrupted_thorn.map((spec) => archetype('corrupted_thorn', spec))
};

interface StageScaleRule {
  readonly widthFactor: number;
  readonly heightFactor: number;
  readonly trunkRadiusFactor: number;
  readonly branchOrderLimit: 0 | 1 | 2;
  readonly foliageDensityFactor: number;
}

/** Ciclo de vida: doce etapas con dimensiones y orden de ramificación específicos. */
const LIFECYCLE_STAGE_RULES: Readonly<Record<TreeLifecycleStage, StageScaleRule>> = {
  seed:       { widthFactor: .3, heightFactor: .25, trunkRadiusFactor: .3, branchOrderLimit: 0, foliageDensityFactor: 0 },
  sprout:     { widthFactor: .38, heightFactor: .35, trunkRadiusFactor: .35, branchOrderLimit: 0, foliageDensityFactor: .35 },
  sapling:    { widthFactor: .52, heightFactor: .5, trunkRadiusFactor: .45, branchOrderLimit: 1, foliageDensityFactor: .55 },
  young:      { widthFactor: .68, heightFactor: .68, trunkRadiusFactor: .62, branchOrderLimit: 1, foliageDensityFactor: .72 },
  immature:   { widthFactor: .84, heightFactor: .84, trunkRadiusFactor: .8, branchOrderLimit: 2, foliageDensityFactor: .86 },
  mature:     { widthFactor: 1, heightFactor: 1, trunkRadiusFactor: 1, branchOrderLimit: 2, foliageDensityFactor: 1 },
  ancient:    { widthFactor: 1.25, heightFactor: 1.18, trunkRadiusFactor: 1.38, branchOrderLimit: 2, foliageDensityFactor: 1.05 },
  damaged:    { widthFactor: .95, heightFactor: .92, trunkRadiusFactor: 1, branchOrderLimit: 2, foliageDensityFactor: .52 },
  dead:       { widthFactor: .9, heightFactor: .92, trunkRadiusFactor: .95, branchOrderLimit: 2, foliageDensityFactor: 0 },
  burned:     { widthFactor: .82, heightFactor: .85, trunkRadiusFactor: .9, branchOrderLimit: 1, foliageDensityFactor: 0 },
  stump:      { widthFactor: .55, heightFactor: .35, trunkRadiusFactor: 1.05, branchOrderLimit: 0, foliageDensityFactor: 0 },
  fallen_log: { widthFactor: 1.15, heightFactor: .4, trunkRadiusFactor: 1, branchOrderLimit: 0, foliageDensityFactor: .15 }
};

/**
 * Fits the *existing* procedural skeleton into its actual raster footprint.
 * The initial archetype canvas controls botanical proportions, not clipping.
 * Additional module-aligned space is only added where roots, lobes, silhouettes
 * or wind would escape the sprite. Geometry, deterministic seeds and attachment
 * relationships remain unchanged; coordinates and ground pivot translate together.
 */
function fitTreeRasterFootprint(
  skeleton: TreeStructuralSkeleton, distribution: TreeMorphologyArchetype['foliageDistribution'],
  crown: TreeMorphologyArchetype['crownArchitecture'],
  width: number, height: number, moduleSize: number, requestedWind: number
): { skeleton: TreeStructuralSkeleton; width: number; height: number } {
  const border = Math.max(3, Math.ceil(moduleSize * 0.15));
  const wind = Math.max(2, Math.ceil(moduleSize / 4), Math.abs(requestedWind));
  let minX = skeleton.pivotX, maxX = skeleton.pivotX;
  let minY = skeleton.pivotY, maxY = skeleton.pivotY;
  const include = (x: number, y: number, extentX = 0, extentY = extentX): void => {
    minX = Math.min(minX, x - extentX);
    maxX = Math.max(maxX, x + extentX);
    minY = Math.min(minY, y - extentY);
    maxY = Math.max(maxY, y + extentY);
  };

  // The main trunk, exposed branch ends, roots and the contact shadow also
  // need room for line thickness, bark outlines and sway.
  for (const node of skeleton.nodes) include(node.x, node.y, node.radiusPx + wind + 2, node.radiusPx + 2);
  for (const segment of skeleton.segments) {
    const radius = Math.max(segment.startRadiusPx, segment.endRadiusPx) + 3;
    include(segment.startX, segment.startY, radius + wind, radius);
    include(segment.controlX, segment.controlY, radius + wind, radius);
    include(segment.endX, segment.endY, radius + wind, radius);
  }
  for (const root of skeleton.roots) {
    include(root.startX, root.startY, root.thicknessPx + 3);
    include(root.endX, root.endY, root.thicknessPx + 3);
  }
  include(skeleton.pivotX, skeleton.pivotY + 1, Math.ceil(width * 0.22) + 2,
    Math.ceil(moduleSize * 0.45) + 2);

  for (const mass of skeleton.foliageMasses) {
    let rx: number, ry: number;
    switch (distribution) {
      case 'stratified_pads':
        rx = mass.radiusX * 1.25 + 3;
        ry = mass.radiusY * 0.65 + 4;
        break;
      case 'pendulous_fronds':
        rx = mass.radiusX + 4;
        ry = Math.max(mass.radiusY + 3, (mass.dropLengthPx ?? 8) + 5);
        break;
      case 'sparse_tufts':
        rx = mass.radiusX + 4;
        ry = mass.radiusY + 4;
        break;
      case 'vertical_plumes':
        rx = Math.max(mass.radiusX + 3, 9);
        ry = Math.max(mass.radiusY + 3, 9);
        break;
      default:
        // Dense billowing consists of orbiting ellipsoids. Each lobe reaches
        // ~0.5*radius from the mass centre plus up to 0.78*radius itself.
        rx = mass.radiusX * 1.4 + 5;
        ry = mass.radiusY * 1.4 + 5;
        break;
    }
    include(mass.centerX, mass.centerY, rx + wind * 1.5, ry);
  }
  if (crown === 'radial_fronds') {
    const hub = skeleton.nodes.find(node => node.nodeId === 'crown_hub');
    if (hub) include(hub.x, hub.y, moduleSize * 3.1 + wind * 1.5 + 3, moduleSize * 3.2 + 4);
  }

  const left = Math.max(0, Math.ceil((border - minX) / moduleSize));
  const right = Math.max(0, Math.ceil((maxX + border - (width - 1)) / moduleSize));
  const top = Math.max(0, Math.ceil((border - minY) / moduleSize));
  const bottom = Math.max(0, Math.ceil((maxY + border - (height - 1)) / moduleSize));
  if (left + right + top + bottom === 0) return { skeleton, width, height };

  const dx = left * moduleSize;
  const dy = top * moduleSize;
  return {
    width: width + (left + right) * moduleSize,
    height: height + (top + bottom) * moduleSize,
    skeleton: {
      pivotX: skeleton.pivotX + dx,
      pivotY: skeleton.pivotY + dy,
      nodes: skeleton.nodes.map(node => ({ ...node, x: node.x + dx, y: node.y + dy })),
      segments: skeleton.segments.map(seg => ({
        ...seg,
        startX: seg.startX + dx, startY: seg.startY + dy,
        controlX: seg.controlX + dx, controlY: seg.controlY + dy,
        endX: seg.endX + dx, endY: seg.endY + dy
      })),
      roots: skeleton.roots.map(root => ({
        ...root, startX: root.startX + dx, startY: root.startY + dy,
        endX: root.endX + dx, endY: root.endY + dy
      })),
      foliageMasses: skeleton.foliageMasses.map(mass => ({
        ...mass, centerX: mass.centerX + dx, centerY: mass.centerY + dy
      }))
    }
  };
}

/**
 * Resolución determinista de los cuatro niveles: familia, arquetipo, individuo
 * estructural y masas de follaje. No modifica el rasterizador existente (fase 1B).
 */
export class TreeMorphologyResolver {
  public resolveTreeMorphology(
    familyId: BotanicalFamilyId,
    stage: TreeLifecycleStage,
    profile: ArtStyleProfile,
    seed: number | string,
    archetypeIdOverride?: string,
    windShiftTexels = 0
  ): TreeMorphologyDescriptor {
    const resolvedSeed = typeof seed === 'number'
      ? seed >>> 0
      : fnv1aHash32(`${seed}::tree_morph::${familyId}::${stage}`);
    const rng = new SeededRNG(resolvedSeed);
    const archetypes = TREE_MORPHOLOGY_ARCHETYPES[familyId];
    if (!archetypes || archetypes.length === 0) throw new Error(`Unknown botanical family: ${familyId}`);
    const archetype = (archetypeIdOverride
      ? archetypes.find((item) => item.archetypeId === archetypeIdOverride)
      : undefined) ?? rng.pick(archetypes);
    const stageRule = LIFECYCLE_STAGE_RULES[stage];
    if (!stageRule) throw new Error(`Unknown tree lifecycle stage: ${stage}`);
    const mod = profile.moduleSize;

    const rawWidth = rng.nextInt(archetype.widthModulesRange[0], archetype.widthModulesRange[1]);
    const rawHeight = rng.nextInt(archetype.heightModulesRange[0], archetype.heightModulesRange[1]);
    const canvasWidthModules = Math.max(3, Math.round(rawWidth * stageRule.widthFactor));
    const canvasHeightModules = Math.max(3, Math.round(rawHeight * stageRule.heightFactor));
    const canvasWidthTexels = canvasWidthModules * mod;
    const canvasHeightTexels = canvasHeightModules * mod;
    const initialSkeleton = this.buildStructuralSkeleton(
      archetype, stage, stageRule, canvasWidthTexels, canvasHeightTexels, mod, rng
    );
    // Keep species metrics based on the original morphology, not on transparent
    // safety padding, so width/asymmetry scoring and ecology remain comparable.
    const metrics = this.computeSilhouetteMetrics(
      initialSkeleton, archetype, canvasWidthTexels, canvasHeightTexels
    );
    const fitted = fitTreeRasterFootprint(initialSkeleton,
      archetype.foliageDistribution, archetype.crownArchitecture,
      canvasWidthTexels, canvasHeightTexels, mod, windShiftTexels);
    const skeleton = fitted.skeleton;
    return {
      schemaVersion: PPAE_SCHEMA_VERSION, seed: resolvedSeed, familyId,
      archetypeId: archetype.archetypeId, stage, crownArchitecture: archetype.crownArchitecture,
      trunkPosture: archetype.trunkPosture, rootStructure: archetype.rootStructure,
      foliageDistribution: stageRule.foliageDensityFactor === 0 ? 'none' : archetype.foliageDistribution,
      canvasWidthModules: fitted.width / mod, canvasHeightModules: fitted.height / mod,
      canvasWidthTexels: fitted.width, canvasHeightTexels: fitted.height,
      skeleton, metrics
    };
  }

  /** Índice [0,1], simétrico y determinista, de disimilitud estructural. */
  public computeStructuralDissimilarity(
    a: TreeMorphologyDescriptor, b: TreeMorphologyDescriptor
  ): number {
    const aspectDiff = Math.min(1, Math.abs(a.metrics.aspectRatio - b.metrics.aspectRatio) / .8);
    const asymDiff = Math.min(1, Math.abs(a.metrics.horizontalAsymmetry - b.metrics.horizontalAsymmetry) / .8);
    const spanDiff = Math.min(1,
      Math.abs(a.metrics.branchSpreadSpanPx - b.metrics.branchSpreadSpanPx) /
      Math.max(8, a.canvasWidthTexels * .5, b.canvasWidthTexels * .5)
    );
    const architectureDiff = a.crownArchitecture !== b.crownArchitecture ? 1 : 0;
    const postureDiff = a.trunkPosture !== b.trunkPosture ? 1 : 0;
    return Number((aspectDiff * .25 + asymDiff * .2 + spanDiff * .25 +
      architectureDiff * .18 + postureDiff * .12).toFixed(3));
  }

  private buildStructuralSkeleton(
    archetype: TreeMorphologyArchetype,
    stage: TreeLifecycleStage,
    stageRule: StageScaleRule,
    widthPx: number,
    heightPx: number,
    mod: number,
    rng: SeededRNG
  ): TreeStructuralSkeleton {
    const pivotX = Math.floor(widthPx / 2);
    const pivotY = heightPx - 2;
    const nodes: TreeSkeletonNode[] = [];
    const segments: TreeBranchSegment[] = [];
    const roots: TreeRootTendril[] = [];
    const foliageMasses: TreeFoliageMassNode[] = [];
    const slenderness = rng.nextRange(...archetype.trunkSlendernessRange);
    const baseRadiusPx = Math.max(1,
      Math.round(widthPx * slenderness * .5 * stageRule.trunkRadiusFactor)
    );
    const rootNode: TreeSkeletonNode = {
      nodeId: 'trunk_base', x: pivotX, y: pivotY, radiusPx: baseRadiusPx, depthOrder: 0
    };
    nodes.push(rootNode);
    if (stage !== 'seed' && stage !== 'sprout' && archetype.rootStructure !== 'sunken') {
      const rootCount = archetype.rootStructure === 'aerial_prop'
        ? rng.nextInt(4, 6)
        : archetype.rootStructure === 'buttress_ridges' ? 3 : 2;
      for (let r = 0; r < rootCount; r++) {
        const dir = r % 2 === 0 ? -1 : 1;
        const spread = rng.nextInt(baseRadiusPx + 2, Math.max(baseRadiusPx + 4, mod * 2));
        const startY = archetype.rootStructure === 'aerial_prop'
          ? pivotY - rng.nextInt(mod, mod * 2)
          : pivotY - Math.max(2, Math.floor(mod * .6));
        roots.push({
          rootId: `root_${r}`,
          startX: pivotX + dir * Math.max(1, Math.floor(baseRadiusPx * .5)),
          startY, endX: pivotX + dir * spread, endY: pivotY,
          thicknessPx: Math.max(1, Math.floor(baseRadiusPx * .55)),
          isAerialProp: archetype.rootStructure === 'aerial_prop'
        });
      }
    }

    if (stage === 'stump' || stage === 'seed' || stage === 'fallen_log') {
      const topY = Math.max(2, pivotY - Math.floor(heightPx * .55));
      const topNode: TreeSkeletonNode = {
        nodeId: 'trunk_top', x: pivotX, y: topY, radiusPx: baseRadiusPx, depthOrder: 0
      };
      nodes.push(topNode);
      segments.push({
        segmentId: 'seg_trunk_0', fromNodeId: rootNode.nodeId, toNodeId: topNode.nodeId,
        startX: pivotX, startY: pivotY, controlX: pivotX,
        controlY: Math.floor((pivotY + topY) / 2), endX: pivotX, endY: topY,
        startRadiusPx: baseRadiusPx, endRadiusPx: baseRadiusPx, order: 0,
        isExposedDeadwood: stage !== 'seed'
      });
      return { pivotX, pivotY, nodes, segments, roots, foliageMasses };
    }

    const asymmetryBias = rng.nextRange(...archetype.asymmetryBiasRange);
    const leanSign = asymmetryBias >= 0 ? 1 : -1;
    const leanAngle = leanSign * rng.nextRange(
      archetype.maxLeanAngleRad * .25, archetype.maxLeanAngleRad
    );
    const trunkHeightRatio = rng.nextRange(...archetype.trunkHeightRatioRange);
    const trunkLengthPx = Math.max(mod, Math.floor(heightPx * trunkHeightRatio));
    const crownHubX = Math.max(mod,
      Math.min(widthPx - mod, Math.round(pivotX + Math.sin(leanAngle) * trunkLengthPx))
    );
    const crownHubY = Math.max(mod,
      pivotY - Math.round(Math.cos(leanAngle) * trunkLengthPx)
    );
    const midControlOffset = archetype.trunkPosture === 'curved_s' ||
      archetype.trunkPosture === 'gnarled_twisted'
      ? -leanSign * rng.nextInt(2, Math.max(3, mod))
      : Math.round((crownHubX - pivotX) * .4);
    const hubRadiusPx = Math.max(1, Math.round(baseRadiusPx * .68));
    const hubNode: TreeSkeletonNode = {
      nodeId: 'crown_hub', x: crownHubX, y: crownHubY, radiusPx: hubRadiusPx, depthOrder: 0
    };
    nodes.push(hubNode);
    segments.push({
      segmentId: 'seg_trunk_main',
      fromNodeId: rootNode.nodeId, toNodeId: hubNode.nodeId,
      startX: rootNode.x, startY: rootNode.y,
      controlX: Math.floor((rootNode.x + hubNode.x) / 2) + midControlOffset,
      controlY: Math.floor((rootNode.y + hubNode.y) / 2),
      endX: hubNode.x, endY: hubNode.y,
      startRadiusPx: baseRadiusPx, endRadiusPx: hubRadiusPx,
      order: 0, isExposedDeadwood: stage === 'dead' || stage === 'burned'
    });

    // Fuste gemelo: dividir el tronco en una horquilla topológicamente conectada.
    // El tramo de base termina en fork_junction y desde allí surgen dos ejes de orden 0.
    if (archetype.trunkPosture === 'forked_twin' && stageRule.branchOrderLimit >= 1) {
      const forkId = 'fork_junction';
      const forkX = Math.round(pivotX + (crownHubX - pivotX) * 0.43);
      const forkY = Math.round(pivotY + (crownHubY - pivotY) * 0.43);
      const forkRadius = Math.max(1, Math.round(baseRadiusPx * 0.81));
      const oppositeSide = crownHubX >= pivotX ? -1 : 1;
      const twinX = Math.max(mod, Math.min(widthPx - mod,
        crownHubX + oppositeSide * Math.max(mod, Math.round(widthPx * 0.18))));
      const twinY = Math.max(2, Math.min(pivotY - mod, crownHubY + rng.nextInt(-mod, mod)));
      const twinId = 'crown_hub_twin';
      nodes.push({ nodeId: forkId, x: forkX, y: forkY, radiusPx: forkRadius, depthOrder: 0 });
      nodes.push({
        nodeId: twinId, x: twinX, y: twinY,
        radiusPx: Math.max(1, Math.round(hubRadiusPx * 0.8)), depthOrder: 0
      });
      const main = segments.find((segment) => segment.segmentId === 'seg_trunk_main');
      if (main) {
        const mainIndex = segments.indexOf(main);
        segments.splice(mainIndex, 1,
          {
            ...main, segmentId: 'seg_trunk_lower', toNodeId: forkId,
            controlX: Math.round((pivotX + forkX) * 0.5),
            controlY: Math.round((pivotY + forkY) * 0.5),
            endX: forkX, endY: forkY, endRadiusPx: forkRadius
          },
          {
            ...main, segmentId: 'seg_trunk_upper', fromNodeId: forkId,
            startX: forkX, startY: forkY,
            controlX: Math.round((forkX + crownHubX) * 0.5),
            controlY: Math.min(forkY, crownHubY) + 1,
            startRadiusPx: forkRadius
          },
          {
            ...main, segmentId: 'seg_trunk_twin', fromNodeId: forkId, toNodeId: twinId,
            startX: forkX, startY: forkY,
            controlX: Math.round((forkX + twinX) * 0.5) + oppositeSide * mod,
            controlY: Math.round((forkY + twinY) * 0.5),
            endX: twinX, endY: twinY, startRadiusPx: forkRadius,
            endRadiusPx: Math.max(1, Math.round(hubRadiusPx * 0.8))
          }
        );
      }
      if (stageRule.foliageDensityFactor > 0 && archetype.foliageDistribution !== 'none') {
        foliageMasses.push({
          massId: 'foliage_twin_hub', attachedNodeId: twinId,
          centerX: twinX, centerY: twinY,
          radiusX: Math.max(2, Math.round(mod * 1.1)),
          radiusY: Math.max(2, Math.round(mod * 0.9)),
          lobeCount: 3, angleTiltRad: oppositeSide * 0.16,
          density: Math.min(1, stageRule.foliageDensityFactor * 0.8),
          layerDepth: 'back'
        });
      }
    }

    // Manglares y bambú: raíces y cañas laterales físicamente ancladas a sus propios nodos.
    if (archetype.trunkPosture === 'multi_stemmed' && stageRule.branchOrderLimit >= 1) {
      for (const side of [-1, 1]) {
        const sideId = side < 0 ? 'l' : 'r';
        const stemBaseX = Math.max(1, Math.min(widthPx - 2,
          pivotX + side * Math.max(2, Math.round(mod * 0.75))));
        const stemTopX = Math.max(2, Math.min(widthPx - 3,
          crownHubX + side * Math.max(3, Math.round(mod * 1.35))));
        const stemTopY = Math.max(2, Math.min(pivotY - mod,
          crownHubY + rng.nextInt(-2, 3)));
        const stemRadius = Math.max(1, Math.round(baseRadiusPx * 0.72));
        const stemBaseId = `culm_base_${sideId}`;
        const stemTopId = `culm_stem_${sideId}`;
        nodes.push({
          nodeId: stemBaseId, x: stemBaseX, y: pivotY,
          radiusPx: stemRadius, depthOrder: 0
        });
        nodes.push({
          nodeId: stemTopId, x: stemTopX, y: stemTopY,
          radiusPx: Math.max(1, stemRadius - 1), depthOrder: 0
        });
        segments.push({
          segmentId: `seg_${stemTopId}`, fromNodeId: stemBaseId, toNodeId: stemTopId,
          startX: stemBaseX, startY: pivotY,
          controlX: Math.round((stemBaseX + stemTopX) * 0.5) + side,
          controlY: Math.round((pivotY + stemTopY) * 0.5),
          endX: stemTopX, endY: stemTopY,
          startRadiusPx: stemRadius, endRadiusPx: Math.max(1, stemRadius - 1),
          order: 0, isExposedDeadwood: stage === 'dead' || stage === 'burned'
        });
        if (stageRule.foliageDensityFactor > 0 && archetype.foliageDistribution !== 'none') {
          foliageMasses.push({
            massId: `foliage_stem_${sideId}`, attachedNodeId: stemTopId,
            centerX: stemTopX, centerY: stemTopY,
            radiusX: Math.max(2, mod), radiusY: Math.max(2, mod),
            lobeCount: 3, angleTiltRad: side * 0.12,
            density: Math.min(1, stageRule.foliageDensityFactor * 0.75),
            layerDepth: side < 0 ? 'back' : 'front'
          });
        }
      }
    }

    const primaryCount = stageRule.branchOrderLimit >= 1
      ? rng.nextInt(...archetype.primaryBranchCountRange) : 1;
    for (let i = 0; i < primaryCount; i++) {
      const t = primaryCount === 1 ? .5 : i / (primaryCount - 1);
      // Una copa orgánica necesita ramas a ambos lados del tronco:
      // sin(t) del parche original mantenía todas las ramas a la izquierda.
      const dir = i % 2 === 0 ? -1 : 1;
      const reachX = rng.nextRange(widthPx * .22, widthPx * .42);
      const reachY = rng.nextRange(heightPx * .18, heightPx * .34);
      const verticalFactor = .38 + .55 * (1 - Math.abs(2 * t - 1));
      const branchEndX = Math.max(3,
        Math.min(widthPx - 4, Math.round(crownHubX + dir * reachX + asymmetryBias * widthPx * .1))
      );
      const branchEndY = Math.max(3,
        Math.min(pivotY - 4, Math.round(crownHubY - reachY * verticalFactor))
      );
      const branchNodeId = `branch_p_${i}`;
      const branchRadius = Math.max(1, Math.floor(hubRadiusPx * .65));
      nodes.push({
        nodeId: branchNodeId, x: branchEndX, y: branchEndY,
        radiusPx: branchRadius, depthOrder: 1
      });
      const isDeadBranch = stage === 'dead' || stage === 'burned' ||
        (stage === 'damaged' && i === primaryCount - 1) ||
        rng.chance(archetype.exposedBranchRatio * .35);
      segments.push({
        segmentId: `seg_p_${i}`, fromNodeId: hubNode.nodeId, toNodeId: branchNodeId,
        startX: hubNode.x, startY: hubNode.y,
        controlX: Math.round((hubNode.x + branchEndX) * .5),
        controlY: Math.round((hubNode.y + branchEndY) * .5) - rng.nextInt(1, 3),
        endX: branchEndX, endY: branchEndY,
        startRadiusPx: hubRadiusPx, endRadiusPx: branchRadius, order: 1,
        isExposedDeadwood: isDeadBranch
      });
      if (stageRule.foliageDensityFactor > 0 &&
        archetype.foliageDistribution !== 'none' && !isDeadBranch) {
        const radiusX = Math.max(2, Math.round(mod *
          (archetype.crownArchitecture === 'umbrella_canopy' ||
            archetype.crownArchitecture === 'spreading_dome' ? 1.55 : 1.15)
        ));
        const radiusY = Math.max(2, Math.round(mod *
          (archetype.crownArchitecture === 'layered_tiers' ||
            archetype.crownArchitecture === 'umbrella_canopy' ? .72 : 1.05)
        ));
        foliageMasses.push({
          massId: `foliage_p_${i}`, attachedNodeId: branchNodeId,
          centerX: branchEndX, centerY: branchEndY,
          radiusX, radiusY, lobeCount: rng.nextInt(3, 5),
          angleTiltRad: (t - .5) * .4,
          density: Math.min(1, Number((stageRule.foliageDensityFactor *
            (1 - archetype.canopyOpenness * .35)).toFixed(2))),
          layerDepth: i % 3 === 0 ? 'back' : i % 3 === 1 ? 'mid' : 'front',
          dropLengthPx: archetype.crownArchitecture === 'weeping_cascade'
            ? rng.nextInt(mod * 2, mod * 3) : undefined
        });
      }

      // Orden 2: ramificaciones reales con topología enlazada al nodo principal.
      if (stageRule.branchOrderLimit >= 2) {
        const secondaryCount = rng.nextInt(...archetype.secondaryBranchCountRange);
        for (let j = 0; j < secondaryCount; j++) {
          const length = rng.nextRange(mod * .7, Math.max(mod * 1.2, widthPx * .13));
          const subDir = j % 2 === 0 ? dir : -dir;
          const endX = Math.max(2, Math.min(widthPx - 3,
            Math.round(branchEndX + subDir * length)));
          const endY = Math.max(2, Math.min(pivotY - 3,
            Math.round(branchEndY - rng.nextRange(mod * .4, mod * 1.3))));
          const secondaryNodeId = `branch_s_${i}_${j}`;
          nodes.push({
            nodeId: secondaryNodeId, x: endX, y: endY,
            radiusPx: 1, depthOrder: 2
          });
          const isSecondaryExposed = isDeadBranch ||
            rng.chance(archetype.exposedBranchRatio * 0.15);
          segments.push({
            segmentId: `seg_s_${i}_${j}`,
            fromNodeId: branchNodeId, toNodeId: secondaryNodeId,
            startX: branchEndX, startY: branchEndY,
            controlX: Math.round((branchEndX + endX) / 2),
            controlY: Math.min(branchEndY, endY),
            endX, endY, startRadiusPx: branchRadius, endRadiusPx: 1,
            order: 2, isExposedDeadwood: isSecondaryExposed
          });
          if (stageRule.foliageDensityFactor > 0 && !isSecondaryExposed &&
            archetype.foliageDistribution !== 'none') {
            foliageMasses.push({
              massId: `foliage_s_${i}_${j}`, attachedNodeId: secondaryNodeId,
              centerX: endX, centerY: endY,
              radiusX: Math.max(2, Math.round(mod * 0.95)),
              radiusY: Math.max(2, Math.round(mod * 0.8)),
              lobeCount: rng.nextInt(2, 4),
              angleTiltRad: (j % 2 === 0 ? -1 : 1) * 0.18,
              density: Math.min(1, Number((stageRule.foliageDensityFactor * 0.85).toFixed(2))),
              layerDepth: j % 2 === 0 ? 'front' : 'back',
              dropLengthPx: archetype.crownArchitecture === 'weeping_cascade'
                ? rng.nextInt(mod * 2, mod * 3) : undefined
            });
          }
        }
      }
    }
    return { pivotX, pivotY, nodes, segments, roots, foliageMasses };
  }

  private computeSilhouetteMetrics(
    skeleton: TreeStructuralSkeleton, archetype: TreeMorphologyArchetype,
    widthPx: number, heightPx: number
  ): TreeSilhouetteMetrics {
    let minX = skeleton.pivotX;
    let maxX = skeleton.pivotX;
    for (const node of skeleton.nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
    }
    for (const mass of skeleton.foliageMasses) {
      minX = Math.min(minX, mass.centerX - mass.radiusX);
      maxX = Math.max(maxX, mass.centerX + mass.radiusX);
    }
    const leftSpan = Math.max(1, skeleton.pivotX - minX);
    const rightSpan = Math.max(1, maxX - skeleton.pivotX);
    const branchSpreadSpanPx = leftSpan + rightSpan;
    const horizontalAsymmetry = Number(
      ((rightSpan - leftSpan) / Math.max(1, branchSpreadSpanPx)).toFixed(3)
    );
    const hub = skeleton.nodes.find((n) => n.nodeId === 'crown_hub') ?? skeleton.nodes[0];
    const trunkHeightPx = Math.max(1, skeleton.pivotY - hub.y);
    return {
      aspectRatio: Number((widthPx / Math.max(1, heightPx)).toFixed(3)),
      canopyWidthToHeightRatio: Number((branchSpreadSpanPx / Math.max(1, heightPx)).toFixed(3)),
      trunkToTotalHeightRatio: Number((trunkHeightPx / Math.max(1, heightPx)).toFixed(3)),
      horizontalAsymmetry, branchSpreadSpanPx,
      foliageMassCount: skeleton.foliageMasses.length,
      canopyOpennessScore: archetype.canopyOpenness
    };
  }
}
