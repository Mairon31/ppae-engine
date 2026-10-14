import { describe, expect, it } from 'vitest';
import {
  ChunkWorldRenderer, DEFAULT_STYLE_PROFILES, DeterministicWorldField,
  FLORA_SPECIES_CATALOG, FloraBotanicalRasterizer, FloraMorphologyResolver,
  NatureGenerator, PHASE1_DEFAULT_ASSETS, PPAEEngine, TreeDiversityController
} from '../src/index';
import type { SecondaryFloraKind } from '../src/index';

describe('PPAE 2.0 Phase 3B — Botanical Rasterization and Ecological World Flora', () => {
  const generator = new NatureGenerator();
  const resolver = new FloraMorphologyResolver();
  const rasterizer = new FloraBotanicalRasterizer();
  const silhouette = new TreeDiversityController();
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('rasterizes all 17 flora kinds deterministically with valid pivots', () => {
    const kinds = Object.keys(FLORA_SPECIES_CATALOG) as SecondaryFloraKind[];
    expect(kinds.length).toBe(17);
    for (const kind of kinds) {
      const a = generator.generateSecondaryFlora(kind, profile6, 2026);
      const b = generator.generateSecondaryFlora(kind, profile6, 2026);
      expect(a.buffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(3);
      expect(a.flora?.kind).toBe(kind);
      expect(a.pivotTexel).toEqual(a.flora?.pivotTexel);
      expect(a.anchors?.base_pivot.texelX).toBe(a.pivotTexel[0]);
      expect(Array.from(a.buffer.data)).toEqual(Array.from(b.buffer.data));
    }
  });

  it('makes organic grass variants and distinguishes ferns, reeds and flowers', () => {
    const first = generator.generateSecondaryFlora('tall_grass',profile6,1001);
    const second = generator.generateSecondaryFlora('tall_grass',profile6,1002);
    const short = generator.generateSecondaryFlora('short_grass',profile6,1001);
    const fern = generator.generateSecondaryFlora('fern',profile6,1001);
    const flowers = generator.generateSecondaryFlora('flower_cluster',profile6,1001);
    const reeds = generator.generateSecondaryFlora('water_reed',profile6,1001);
    expect(Array.from(first.buffer.data)).not.toEqual(Array.from(second.buffer.data));
    const [a,b,c,d,e] = [short,first,fern,flowers,reeds].map(s=>silhouette.analyzeRasterSilhouette(s.buffer));
    expect(b.boundingBox.height).toBeGreaterThanOrEqual(a.boundingBox.height);
    expect(silhouette.computeRasterSilhouetteDistance(a,c)).toBeGreaterThan(.05);
    expect(silhouette.computeRasterSilhouetteDistance(c,e)).toBeGreaterThan(.05);
    expect(flowers.buffer.countUniqueOpaqueColors()).toBeGreaterThan(short.buffer.countUniqueOpaqueColors());
    expect(d.opaquePixelCount).toBeGreaterThan(15);
  });

  it('keeps procedural berry bush within palette colors and minimum contrast', () => {
    const engine = new PPAEEngine();
    const palette = engine.paletteManager.getPalette('meadow-summer');
    const result = engine.generateAsset({
      worldSeed:'phase3b-bush-check',
      assetDefinition:PHASE1_DEFAULT_ASSETS.berry_bush_wild,
      styleProfile:profile6, palette, stateTag:'intact'
    });
    expect(result.metadata.uniqueColorCount).toBeLessThanOrEqual(palette.maxColorsPerAsset);
    expect(result.metadata.contrastRatioAgainstBiome).toBeGreaterThanOrEqual(palette.minContrastRatio);
  });

  it('spawns more than seven ecologically clustered flora types in a multi-chunk area', () => {
    const field = new DeterministicWorldField('flora-world-diversity-2026');
    const found = new Set<string>();
    for(let y=-24;y<24;y++)for(let x=-24;x<24;x++){
      const tile=field.sampleWorldTile(x,y);
      if(tile.propSpawn?.kind==='flora')found.add(tile.propSpawn.subType);
    }
    expect(found.size).toBeGreaterThanOrEqual(7);
  });

  it('preserves deterministic sprites across wind and unchanged root anchors', () => {
    const desc=resolver.resolveFloraMorphology('water_reed',profile6,'windy-reeds');
    const normal=rasterizer.renderFlora(desc,profile6,0);
    const windy=rasterizer.renderFlora(desc,profile6,4);
    expect(normal.pivotTexel).toEqual(windy.pivotTexel);
    expect(normal.anchors.base_pivot).toEqual(windy.anchors.base_pivot);
    expect(Array.from(normal.buffer.data)).not.toEqual(Array.from(windy.buffer.data));
    expect(normal.floralPixelCount).toBeGreaterThan(0);
  });

  it('paints flower heads and differentiates water lilies, moss and mushrooms', () => {
    for (const kind of ['wild_flower','water_lily_pad','mushroom_cluster','ground_moss'] as const){
      const sprite=generator.generateSecondaryFlora(kind,profile6,2026);
      expect(silhouette.analyzeRasterSilhouette(sprite.buffer).opaquePixelCount).toBeGreaterThan(8);
    }
    const flower=resolver.resolveFloraMorphology('wild_flower',profile6,2026);
    expect(rasterizer.renderFlora(flower,profile6).floralPixelCount).toBeGreaterThan(0);
  });

  it('keeps world sprites stable regardless of chunk render order', () => {
    const a=new ChunkWorldRenderer(new DeterministicWorldField('phase3b-chunk-order'));
    const b=new ChunkWorldRenderer(new DeterministicWorldField('phase3b-chunk-order'));
    const direct=a.renderChunk(1,0,profile6,0,4,8);
    b.renderChunk(0,0,profile6,0,4,8);
    const after=b.renderChunk(1,0,profile6,0,4,8);
    expect(direct.sortedProps).toHaveLength(after.sortedProps.length);
    for(let i=0;i<direct.sortedProps.length;i++){
      expect(Array.from(direct.sortedProps[i].buffer.data))
        .toEqual(Array.from(after.sortedProps[i].buffer.data));
    }
  });
});
