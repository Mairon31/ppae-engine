import { describe, expect, it } from 'vitest';
import {
  CaveDungeonGenerator,
  DEFAULT_COTTAGE_INTERIOR,
  DEFAULT_CRYSTAL_CAVERN,
  DEFAULT_STRUCTURE_CATALOG,
  DEFAULT_STYLE_PROFILES,
  InteriorGenerator,
  StructureGenerator
} from '../src/index';

describe('PPAE 2.0 Phase 9 — Procedural Architecture, Roof & Wall Grammars, Interiors & Caves', () => {
  const structureGen = new StructureGenerator();
  const interiorGen = new InteriorGenerator();
  const caveGen = new CaveDungeonGenerator();
  const profile4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
  const profile6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('renders structurally distinct walls and roofs across cottages, thatched huts, slate manors, barns, windmills, wells, and ruins', () => {
    const catalogKeys = Object.keys(DEFAULT_STRUCTURE_CATALOG);
    expect(catalogKeys.length).toBeGreaterThanOrEqual(10);

    const cottage = structureGen.generateStructure(
      DEFAULT_STRUCTURE_CATALOG.village_cottage_01,
      profile4,
      false
    );
    const thatched = structureGen.generateStructure(
      DEFAULT_STRUCTURE_CATALOG.thatched_peasant_hut_01,
      profile4,
      false
    );
    const slateManor = structureGen.generateStructure(
      DEFAULT_STRUCTURE_CATALOG.blue_slate_manor_01,
      profile4,
      false
    );
    const windmill = structureGen.generateStructure(
      DEFAULT_STRUCTURE_CATALOG.grain_windmill_01,
      profile4,
      false
    );
    const well = structureGen.generateStructure(
      DEFAULT_STRUCTURE_CATALOG.village_stone_well_01,
      profile4,
      false
    );
    const ruins = structureGen.generateStructure(
      DEFAULT_STRUCTURE_CATALOG.ancient_mossy_ruins_01,
      profile4,
      true
    );

    // Aunque village_cottage_01, thatched_peasant_hut_01 y blue_slate_manor_01 tienen 5x4 tiles,
    // sus buffers de muros y de tejados poseen geometrías y patrones distintos
    expect(Array.from(cottage.baseAndWallsBuffer.data)).not.toEqual(
      Array.from(thatched.baseAndWallsBuffer.data)
    );
    expect(Array.from(cottage.roofOverlayBuffer.data)).not.toEqual(
      Array.from(thatched.roofOverlayBuffer.data)
    );
    expect(Array.from(cottage.roofOverlayBuffer.data)).not.toEqual(
      Array.from(slateManor.roofOverlayBuffer.data)
    );

    expect(windmill.roofOverlayBuffer.countUniqueOpaqueColors()).toBeGreaterThan(3);
    expect(well.baseAndWallsBuffer.countUniqueOpaqueColors()).toBeGreaterThan(3);
    expect(ruins.baseAndWallsBuffer.countUniqueOpaqueColors()).toBeGreaterThan(2);
  });

  it('renders enriched interior furniture (anvil, alchemy bench, barrel, potted plant, chair) with valid walkability and collisions', () => {
    const customInterior = {
      ...DEFAULT_COTTAGE_INTERIOR,
      furniture: [
        ...DEFAULT_COTTAGE_INTERIOR.furniture,
        {
          id: 'forge_anvil',
          kind: 'anvil_station' as const,
          tileX: 5,
          tileY: 2,
          widthTiles: 1,
          heightTiles: 1,
          collidable: true
        },
        {
          id: 'alch_bench',
          kind: 'alchemy_bench' as const,
          tileX: 1,
          tileY: 4,
          widthTiles: 2,
          heightTiles: 1,
          collidable: true
        },
        {
          id: 'corner_barrel',
          kind: 'wooden_barrel' as const,
          tileX: 6,
          tileY: 5,
          widthTiles: 1,
          heightTiles: 1,
          collidable: true
        },
        {
          id: 'entry_plant',
          kind: 'potted_plant' as const,
          tileX: 3,
          tileY: 5,
          widthTiles: 1,
          heightTiles: 1,
          collidable: false
        }
      ]
    };

    const rendered = interiorGen.renderInterior(customInterior, profile6);
    expect(rendered.walkabilityGrid[2][5]).toBe(false); // Celda del yunque bloqueada
    expect(rendered.walkabilityGrid[4][1]).toBe(false); // Celda del banco de alquimia bloqueada
    expect(rendered.walkabilityGrid[5][3]).toBe(true);  // Planta decorativa no bloquea paso
    expect(rendered.roomBuffer.countUniqueOpaqueColors()).toBeGreaterThan(8);
  });

  it('generates cave chambers with northern stalactites, lava pools, and bioluminescent nodes', () => {
    const chamber = caveGen.generateChamber(DEFAULT_CRYSTAL_CAVERN, profile6);
    expect(chamber.chamberBuffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(6);
    expect(chamber.bioluminescentNodes.length).toBeGreaterThan(0);
  });
});
