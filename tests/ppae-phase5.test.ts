import { describe, expect, it } from 'vitest';
import {
  CaveDungeonGenerator,
  DEFAULT_COTTAGE_INTERIOR,
  DEFAULT_CRYSTAL_CAVERN,
  DEFAULT_STRUCTURE_CATALOG,
  DEFAULT_STYLE_PROFILES,
  InteriorGenerator,
  PortalAndOcclusionManager,
  PPAE_SCHEMA_VERSION,
  StructureGenerator
} from '../src/index';

describe('PPAE Phase 5 — Modular Structures, Interiors, Formal Portals, Roof Occlusion & Caves', () => {
  it('separates building walls/foundation buffer from occludable roof overlay buffer and updates door pixels on open/close', () => {
    const gen = new StructureGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];
    const def = DEFAULT_STRUCTURE_CATALOG.village_cottage_01;

    const closedHouse = gen.generateStructure(def, profile, false);
    const openHouse = gen.generateStructure(def, profile, true);

    // Ambos buffers existen con idénticas dimensiones y píxeles opacos independientes
    expect(closedHouse.baseAndWallsBuffer.countUniqueOpaqueColors()).toBeGreaterThan(2);
    expect(closedHouse.roofOverlayBuffer.countUniqueOpaqueColors()).toBeGreaterThan(1);

    // Abrir la puerta modifica el buffer de muros pero deja intacto el buffer del tejado
    expect(Array.from(closedHouse.baseAndWallsBuffer.data)).not.toEqual(
      Array.from(openHouse.baseAndWallsBuffer.data)
    );
    expect(Array.from(closedHouse.roofOverlayBuffer.data)).toEqual(
      Array.from(openHouse.roofOverlayBuffer.data)
    );
  });

  it('prevents infinite re-entry loops via safeSpawn validation and hysteresis lock across exterior/interior portals', () => {
    const mgr = new PortalAndOcclusionManager();
    const interiorGen = new InteriorGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];
    const renderedInterior = interiorGen.renderInterior(DEFAULT_COTTAGE_INTERIOR, profile);

    mgr.registerPortal(
      {
        schemaVersion: PPAE_SCHEMA_VERSION,
        portalId: 'cottage_door',
        structureId: 'village_cottage_01',
        doorId: 'front_door',
        isOpen: true,
        isLocked: false,
        sideA: {
          spaceKind: 'exterior_overworld',
          spaceId: 'overworld',
          triggerRect: { x: 32, y: 48, width: 16, height: 16 },
          safeSpawnPoint: { worldX: 40, worldY: 72, facingDirection: 'S' }
        },
        sideB: {
          spaceKind: 'building_interior',
          spaceId: 'interior_cottage_01',
          triggerRect: { x: 64, y: 96, width: 16, height: 16 },
          safeSpawnPoint: { worldX: 72, worldY: 76, facingDirection: 'N' }
        }
      },
      [],
      renderedInterior.collisionRects
    );

    // 1. El jugador entra al umbral exterior (36, 52) -> transiciona al interior en (72, 76)
    const stepIn = mgr.evaluateEntityPortalStep({
      entityId: 'player_1',
      spaceKind: 'exterior_overworld',
      spaceId: 'overworld',
      worldX: 36,
      worldY: 52,
      facingDirection: 'N'
    });

    expect(stepIn.transitioned).toBe(true);
    expect(stepIn.nextState.spaceKind).toBe('building_interior');
    expect(stepIn.nextState.worldX).toBe(72);
    expect(stepIn.nextState.worldY).toBe(76);

    // 2. Evaluar un paso inmediatamente en el punto de aparición seguro (72, 76) NO dispara reentrada
    const stepOnArrival = mgr.evaluateEntityPortalStep(stepIn.nextState);
    expect(stepOnArrival.transitioned).toBe(false);
    expect(stepOnArrival.nextState.spaceKind).toBe('building_interior');

    // 3. Si la puerta se cierra desde dentro o fuera, intentar cruzar el umbral interior queda bloqueado
    mgr.setDoorState('cottage_door', { isOpen: false });
    const blockedExit = mgr.evaluateEntityPortalStep({
      ...stepIn.nextState,
      worldX: 68,
      worldY: 100
    });
    expect(blockedExit.transitioned).toBe(false);
    expect(blockedExit.blockedReason).toBe('door_closed');
  });

  it('rejects portal registration if safeSpawnPoint overlaps its own triggerRect or a furniture obstacle', () => {
    const mgr = new PortalAndOcclusionManager();

    expect(() =>
      mgr.registerPortal({
        schemaVersion: PPAE_SCHEMA_VERSION,
        portalId: 'bad_portal',
        structureId: 'house',
        doorId: 'd1',
        isOpen: true,
        isLocked: false,
        sideA: {
          spaceKind: 'exterior_overworld',
          spaceId: 'overworld',
          triggerRect: { x: 16, y: 16, width: 16, height: 16 },
          // Error intencional: safeSpawnPoint cae dentro de triggerRect (20, 20)
          safeSpawnPoint: { worldX: 20, worldY: 20, facingDirection: 'S' }
        },
        sideB: {
          spaceKind: 'building_interior',
          spaceId: 'room',
          triggerRect: { x: 16, y: 80, width: 16, height: 16 },
          safeSpawnPoint: { worldX: 20, worldY: 56, facingDirection: 'N' }
        }
      })
    ).toThrowError(/overlaps its own triggerRect/);
  });

  it('computes roof occlusion accurately across exterior normal, roof eaves cutaway, and full interior states', () => {
    const mgr = new PortalAndOcclusionManager();
    const footprint = { x: 0, y: 0, width: 80, height: 48 };

    const normal = mgr.resolveRoofOcclusionState('village_cottage_01', 100, 100, footprint, {
      entityId: 'p1',
      spaceKind: 'exterior_overworld',
      spaceId: 'overworld',
      worldX: 140,
      worldY: 180,
      facingDirection: 'N'
    });
    expect(normal.mode).toBe('opaque');
    expect(normal.opacity).toBe(1.0);

    const underEaves = mgr.resolveRoofOcclusionState('village_cottage_01', 100, 100, footprint, {
      entityId: 'p1',
      spaceKind: 'exterior_overworld',
      spaceId: 'overworld',
      worldX: 120,
      worldY: 120,
      facingDirection: 'N'
    });
    expect(underEaves.mode).toBe('cutaway');
    expect(underEaves.opacity).toBeLessThan(1.0);

    const insideBuilding = mgr.resolveRoofOcclusionState('village_cottage_01', 100, 100, footprint, {
      entityId: 'p1',
      spaceKind: 'building_interior',
      spaceId: 'interior_village_cottage_01',
      worldX: 40,
      worldY: 40,
      facingDirection: 'N'
    });
    expect(insideBuilding.mode).toBe('hidden');
    expect(insideBuilding.opacity).toBe(0.0);
  });

  it('generates underground cave chambers with bioluminescent crystal nodes and perimeter wall collisions', () => {
    const caveGen = new CaveDungeonGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-6x6'];
    const chamber = caveGen.generateChamber(DEFAULT_CRYSTAL_CAVERN, profile);

    expect(chamber.chamberBuffer.width).toBe(DEFAULT_CRYSTAL_CAVERN.widthInTiles * profile.canonicalTileTexels);
    expect(chamber.collisionRects.length).toBeGreaterThan(20);
    expect(chamber.bioluminescentNodes.length).toBeGreaterThan(0);
  });
});
