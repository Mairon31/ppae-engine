import { describe, expect, it } from 'vitest';
import {
  ChunkWorldRenderer,
  DEFAULT_STYLE_PROFILES,
  DeterministicWorldField,
  GEOLOGICAL_ARCHETYPE_CATALOG,
  GeologicalFormationRasterizer,
  GeologicalMorphologyResolver,
  NatureGenerator,
  PHASE1_DEFAULT_ASSETS,
  PPAEEngine,
  TreeDiversityController
} from '../src/index';
import type { GeologicalResourceKind } from '../src/index';

describe('PPAE 2.0 Phase 2B — Faceted Geological Rasterization & World Rock Diversity', () => {
  const generator = new NatureGenerator();
  const silhouettes = new TreeDiversityController();
  const resolver = new GeologicalMorphologyResolver();
  const rasterizer = new GeologicalFormationRasterizer();
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('renders all 17 geological kinds deterministically with facets and valid pivots', () => {
    const allKinds = Object.keys(GEOLOGICAL_ARCHETYPE_CATALOG) as GeologicalResourceKind[];
    expect(allKinds).toHaveLength(17);
    for(const kind of allKinds) {
      const a = generator.generateGeologicalResource(kind, profile6, 2026);
      const b = generator.generateGeologicalResource(kind, profile6, 2026);
      expect(a.buffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(4);
      expect(a.geology?.kind).toBe(kind);
      expect(a.pivotTexel).toEqual(a.geology?.pivotTexel);
      expect(a.anchors?.base_pivot.texelX).toBe(a.pivotTexel[0]);
      expect(Array.from(a.buffer.data)).toEqual(Array.from(b.buffer.data));
    }
  });

  it('differentiates silhouettes of pebbles, slabs, monoliths, cairns and geodes', () => {
    const kinds: GeologicalResourceKind[] = [
      'surface_pebbles', 'flat_slab', 'fractured_monolith',
      'stacked_cairn', 'mossy_boulder', 'crystal_geode'
    ];
    const desc = kinds.map(kind => silhouettes.analyzeRasterSilhouette(
      generator.generateGeologicalResource(kind, profile6, 901).buffer));
    for(let i=0;i<desc.length;i++){
      expect(desc[i].opaquePixelCount).toBeGreaterThan(20);
      for(let j=i+1;j<desc.length;j++){
        expect(silhouettes.computeRasterSilhouetteDistance(desc[i],desc[j])).toBeGreaterThan(.05);
      }
    }
  });

  it('fits crystal_ore_node into its palette, dimension budget and contrast contract', () => {
    const engine=new PPAEEngine();
    const palette=engine.paletteManager.getPalette('meadow-summer');
    const artifact=engine.generateAsset({
      worldSeed:'phase2b-crystal-check',
      assetDefinition:PHASE1_DEFAULT_ASSETS.crystal_ore_node,
      styleProfile:profile6,palette,stateTag:'intact'
    });
    expect(artifact.metadata.uniqueColorCount).toBeGreaterThanOrEqual(4);
    expect(artifact.metadata.uniqueColorCount).toBeLessThanOrEqual(palette.maxColorsPerAsset);
    expect(artifact.metadata.innerWidth).toBe(
      PHASE1_DEFAULT_ASSETS.crystal_ore_node.widthInModules*profile6.moduleSize);
    expect(artifact.metadata.innerHeight).toBe(
      PHASE1_DEFAULT_ASSETS.crystal_ore_node.heightInModules*profile6.moduleSize);
    expect(artifact.metadata.contrastRatioAgainstBiome).toBeGreaterThanOrEqual(palette.minContrastRatio);
  });

  it('spawns more than six geological rock types throughout the multi-biome world', () => {
    const field = new DeterministicWorldField('geology-world-diversity-2026');
    const kinds = new Set<string>();
    for(let y=-24;y<24;y++){
      for(let x=-24;x<24;x++){
        const s=field.sampleWorldTile(x,y);
        if(s.propSpawn?.kind==='mineral')kinds.add(s.propSpawn.subType);
      }
    }
    expect(kinds.size).toBeGreaterThanOrEqual(6);
  });

  it('exposes physical minerals and seasonal/damaged geology', () => {
    const d=resolver.resolveGeologicalMorphology('crystal_geode',profile6,'crystals-2026');
    const normal=rasterizer.renderGeologicalFormation(d,profile6,'intact');
    const damaged=rasterizer.renderGeologicalFormation(d,profile6,'damaged');
    expect(normal.mineralPixelCount).toBeGreaterThan(10);
    expect(normal.opaquePixelCount).toBeGreaterThan(normal.mineralPixelCount);
    expect(Array.from(normal.buffer.data)).not.toEqual(Array.from(damaged.buffer.data));
    const rock=resolver.resolveGeologicalMorphology('mossy_boulder',profile6,'snowy-rock');
    const clear=rasterizer.renderGeologicalFormation(rock,profile6,'intact');
    const snowy=rasterizer.renderGeologicalFormation(rock,profile6,'snowy');
    expect(Array.from(clear.buffer.data)).not.toEqual(Array.from(snowy.buffer.data));
  });

  it('keeps mineral rendering deterministic regardless of chunk traversal order', () => {
    const a = new ChunkWorldRenderer(new DeterministicWorldField('phase2b-order'));
    const b = new ChunkWorldRenderer(new DeterministicWorldField('phase2b-order'));
    const isolated = a.renderChunk(1, 0, profile6, 0, 4, 8);
    b.renderChunk(0,0,profile6,0,4,8);
    const after = b.renderChunk(1,0,profile6,0,4,8);
    expect(isolated.sortedProps).toHaveLength(after.sortedProps.length);
    for(let i=0;i<isolated.sortedProps.length;i++){
      expect(Array.from(isolated.sortedProps[i].buffer.data))
        .toEqual(Array.from(after.sortedProps[i].buffer.data));
    }
  });
});
