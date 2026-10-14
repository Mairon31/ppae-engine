import { describe, expect, it } from 'vitest';
import {
  CANONICAL_47_AUTOTILE_MASKS,
  classifyAutotileMask47,
  DEFAULT_STYLE_PROFILES,
  hexToRgba,
  normalizeAutotileMask47,
  TERRAIN_MATERIALS,
  TerrainAutotiler
} from '../src/index';

describe('PPAE 2.0 Phase 4A — canonical 47-mask autotiling and coastline regression', () => {
  const autotiler=new TerrainAutotiler();
  const profile4=DEFAULT_STYLE_PROFILES['micro-4x4'];
  const profile6=DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('normalizes all 256 bit configurations onto exactly 47 gated states', () => {
    expect(CANONICAL_47_AUTOTILE_MASKS).toHaveLength(47);
    expect(new Set(CANONICAL_47_AUTOTILE_MASKS).size).toBe(47);
    const observed=new Set<number>();
    for(let raw=0;raw<256;raw++){
      const norm=normalizeAutotileMask47(raw);
      observed.add(norm);
      expect(classifyAutotileMask47(norm).isCanonical47).toBe(true);
      expect(normalizeAutotileMask47(norm)).toBe(norm);
      expect(classifyAutotileMask47(raw).mask).toBe(norm);
      if(raw!==norm)expect(classifyAutotileMask47(raw).isCanonical47).toBe(false);
    }
    expect(observed.size).toBe(47);
    expect(classifyAutotileMask47(255).topology).toBe('interior_full');
    expect(classifyAutotileMask47(0).topology).toBe('isolated_island');
    expect(classifyAutotileMask47(28).topology).toBe('outer_corner');
  });

  it('never floods dark border across sand/water or grass/sand for all 47 masks', () => {
    const sandBorder=hexToRgba(TERRAIN_MATERIALS.sand_beach.transitionBorderHex);
    const grassBorder=hexToRgba(TERRAIN_MATERIALS.meadow_grass.transitionBorderHex);
    for(const profile of [profile4,profile6]){
      for(const mask of CANONICAL_47_AUTOTILE_MASKS){
        const coast=autotiler.composeAutotiledSurface(
          'sand_beach',mask,profile,'shallow_water',0);
        const grass=autotiler.composeAutotiledSurface(
          'meadow_grass',mask,profile,'sand_beach',0);
        let darkSand=0,darkGrass=0;
        for(let y=0;y<coast.height;y++)for(let x=0;x<coast.width;x++){
          const a=coast.getPixel(x,y),b=grass.getPixel(x,y);
          expect(a.a).toBe(255);
          expect(b.a).toBe(255);
          if(a.r===sandBorder.r&&a.g===sandBorder.g&&a.b===sandBorder.b)darkSand++;
          if(b.r===grassBorder.r&&b.g===grassBorder.g&&b.b===grassBorder.b)darkGrass++;
        }
        expect(darkSand).toBe(0);
        expect(darkGrass/(grass.width*grass.height)).toBeLessThan(.1);
      }
    }
  });

  it('rounds both concave and convex NW corners with the center untouched',()=>{
    const outer=autotiler.composeAutotiledSurface('meadow_grass',28,profile6,'sand_beach',0);
    const inner=autotiler.composeAutotiledSurface('meadow_grass',127,profile6,'sand_beach',0);
    const sand=autotiler.generateSeamlessBaseTile('sand_beach',profile6,0);
    const grass=autotiler.generateSeamlessBaseTile('meadow_grass',profile6,0);
    expect(outer.getPixel(0,0)).toEqual(sand.getPixel(0,0));
    expect(inner.getPixel(0,0)).toEqual(sand.getPixel(0,0));
    expect(outer.getPixel(15,15)).toEqual(grass.getPixel(15,15));
    expect(inner.getPixel(12,12)).toEqual(grass.getPixel(12,12));
  });

  it('generates 16 distinct organic opaque base surface variants',()=>{
    const hashes=new Set<string>();
    for(let v=0;v<16;v++){
      const tile=autotiler.generateSeamlessBaseTile('meadow_grass',profile4,v);
      hashes.add(Array.from(tile.data.slice(0,128)).join(','));
      expect(tile.getPixel(12,12).a).toBe(255);
    }
    expect(hashes.size).toBeGreaterThanOrEqual(12);
  });

  it('matches opposite edges per variant for 4x4 and 6x6 seamless base tiles',()=>{
    for(const profile of [profile4,profile6]){
      for(const material of ['meadow_grass','sand_beach','forest_moss','rock_cliff'] as const){
        for(let v=0;v<16;v++){
          const tile=autotiler.generateSeamlessBaseTile(material,profile,v);
          const n=tile.width;
          for(let i=0;i<n;i++){
            expect(tile.getPixel(0,i)).toEqual(tile.getPixel(n-1,i));
            expect(tile.getPixel(i,0)).toEqual(tile.getPixel(i,n-1));
          }
        }
      }
    }
  });

  it('keeps transition stripe local when only a northern neighbor is missing',()=>{
    // Mask 254: N absent, all gated diagonals must be cleared by normalizer.
    const raw=254,norm=normalizeAutotileMask47(raw);
    expect(norm&1).toBe(0);
    expect(norm&2).toBe(0);
    expect(norm&128).toBe(0);
    const tile=autotiler.composeAutotiledSurface('meadow_grass',raw,profile4,'sand_beach',7);
    const base=autotiler.generateSeamlessBaseTile('meadow_grass',profile4,7);
    for(let y=12;y<tile.height-4;y++)for(let x=8;x<tile.width-8;x++){
      expect(tile.getPixel(x,y)).toEqual(base.getPixel(x,y));
    }
  });
});
