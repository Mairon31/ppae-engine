import { describe, expect, it } from 'vitest';
import {
  ChunkWorldRenderer,
  DEFAULT_STYLE_PROFILES,
  DeterministicWorldField,
  DirectionalRoadRenderer,
  LiquidTileGenerator,
  normalizeAutotileMask47,
  TerrainAutotiler
} from '../src/index';

describe('PPAE 2.0 Phase 4B — Road Junctions, Curves and Rounded Liquid Shores',()=>{
  const autotiler=new TerrainAutotiler();
  const road=new DirectionalRoadRenderer();
  const water=new LiquidTileGenerator();
  const p4=DEFAULT_STYLE_PROFILES['micro-4x4'];
  const p6=DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('maintains connected edges through straight, curved, T and cross junctions',()=>{
    const substrate=autotiler.generateSeamlessBaseTile('meadow_grass',p4,0);
    const straight=road.renderRoadTile('dirt_soil',68,p4,substrate,0);
    const corner=road.renderRoadTile('dirt_soil',65,p4,substrate,0);
    const tj=road.renderRoadTile('dirt_soil',1|4|64,p4,substrate,0);
    const cross=road.renderRoadTile('dirt_soil',1|4|16|64,p4,substrate,0);
    expect(straight.metrics.roadPixelCount).toBeGreaterThan(150);
    expect(straight.metrics.substratePixelCount).toBeGreaterThan(100);
    expect(tj.metrics.roadPixelCount).toBeGreaterThan(straight.metrics.roadPixelCount);
    expect(cross.metrics.roadPixelCount).toBeGreaterThan(tj.metrics.roadPixelCount);
    const mid=Math.floor(p4.canonicalTileTexels/2);
    expect(straight.buffer.getPixel(23,mid)).not.toEqual(substrate.getPixel(23,mid));
    expect(corner.buffer.getPixel(0,mid)).not.toEqual(substrate.getPixel(0,mid));
    expect(corner.buffer.getPixel(22,22)).toEqual(substrate.getPixel(22,22));
    expect(corner.metrics.connectedEdges).toEqual({
      north:true,east:false,south:false,west:true
    });
  });

  it('renders road boundary pixels identically at shared edges for matching variants',()=>{
    const substrate=autotiler.generateSeamlessBaseTile('meadow_grass',p6,0);
    const ew=road.renderRoadTile('dirt_soil',68,p6,substrate,0).buffer;
    const nw=road.renderRoadTile('dirt_soil',65,p6,substrate,0).buffer;
    const size=ew.width;
    const center=Math.floor(size/2);
    for(let y=center-3;y<=center+3;y++){
      expect(ew.getPixel(size-1,y)).toEqual(nw.getPixel(0,y));
    }
  });

  it('sets road mask by road connectivity and resolves dominant grass substrate',()=>{
    const field=new DeterministicWorldField('road-network-test-2026');
    for(let y=8;y<=14;y++)for(let x=8;x<=14;x++){
      field.applyTileModification(x,y,{material:'meadow_grass'});
    }
    for(const [x,y] of [[10,10],[10,11],[11,11]]){
      field.applyTileModification(x,y,{material:'dirt_soil'});
    }
    const elbow=field.sampleWorldTile(10,11);
    expect(elbow.autotileMask).toBe(5);
    expect(elbow.transitionNeighborMaterial).toBe('meadow_grass');
    const rendered=autotiler.composeAutotiledSurface(
      elbow.material,elbow.autotileMask,p4,elbow.transitionNeighborMaterial,0);
    const meadow=autotiler.generateSeamlessBaseTile('meadow_grass',p4,0);
    expect(rendered.getPixel(2,21)).toEqual(meadow.getPixel(2,21));
    const adjacent=field.sampleWorldTile(9,11);
    expect(adjacent.transitionNeighborMaterial).toBe('dirt_soil');
    expect(Array.from(autotiler.composeAutotiledSurface(
      adjacent.material,adjacent.autotileMask,p4,adjacent.transitionNeighborMaterial,0
    ).data)).toEqual(Array.from(meadow.data));
  });

  it('keeps isolated/end-cap road tiles as natural round shapes with no squares',()=>{
    const substrate=autotiler.generateSeamlessBaseTile('forest_moss',p4,3);
    for(const mask of [0,1,4,16,64]){
      const rendered=road.renderRoadTile('dirt_soil',mask,p4,substrate,3);
      expect(rendered.metrics.roadPixelCount).toBeGreaterThan(20);
      expect(rendered.metrics.substratePixelCount).toBeGreaterThan(20);
      if(mask===0){
        expect(rendered.buffer.getPixel(0,0)).toEqual(substrate.getPixel(0,0));
        expect(rendered.buffer.getPixel(23,23)).toEqual(substrate.getPixel(23,23));
      }
    }
  });

  it('renders diagonal concave foam without changing opposite water corner',()=>{
    const corner=water.generateAnimatedFrame('shallow_water',0,4,127,p4);
    const full=water.generateAnimatedFrame('shallow_water',0,4,255,p4);
    expect(corner.getPixel(1,1)).not.toEqual(full.getPixel(1,1));
    expect(corner.getPixel(22,22)).toEqual(full.getPixel(22,22));
    expect(normalizeAutotileMask47(127)).toBe(127);
    const loop=water.generateAnimatedFrame('shallow_water',4,4,127,p4);
    expect(Array.from(corner.data)).toEqual(Array.from(loop.data));
  });

  it('rounds exposed convex shores and preserves full-water animation',()=>{
    const full=water.generateAnimatedFrame('shallow_water',0,4,255,p6);
    const exposed=water.generateAnimatedFrame('shallow_water',0,4,28,p6);
    expect(exposed.getPixel(0,18)).not.toEqual(full.getPixel(0,18));
    expect(exposed.getPixel(18,0)).not.toEqual(full.getPixel(18,0));
    expect(exposed.getPixel(20,20)).toEqual(full.getPixel(20,20));
    const frame1=water.generateAnimatedFrame('shallow_water',1,4,255,p6);
    expect(Array.from(full.data)).not.toEqual(Array.from(frame1.data));
  });

  it('preserves byte-for-byte chunk determinism with road terrain overrides',()=>{
    const create=()=>{
      const field=new DeterministicWorldField('phase4b-cross-chunk-roads');
      for(let y=4;y<=12;y++)for(let x=6;x<=10;x++)
        field.applyTileModification(x,y,{material:'meadow_grass'});
      for(let x=6;x<=10;x++)field.applyTileModification(x,8,{material:'dirt_soil'});
      for(let y=5;y<=11;y++)field.applyTileModification(8,y,{material:'dirt_soil'});
      return new ChunkWorldRenderer(field);
    };
    const a=create(),b=create();
    const direct=a.renderChunk(1,1,p4,0,4,8);
    b.renderChunk(0,0,p4,0,4,8);
    b.renderChunk(0,1,p4,0,4,8);
    const after=b.renderChunk(1,1,p4,0,4,8);
    expect(Array.from(direct.terrainBuffer.data))
      .toEqual(Array.from(after.terrainBuffer.data));
  });
});
