import {
  AutotileMask8,
  BiomeId,
  PPAE_SCHEMA_VERSION,
  TerrainMaterialDefinition,
  TerrainMaterialId,
  TreeLifecycleStage,
  TreeSpeciesId,
  WorldTileSample
} from '../core/contracts';
import { fnv1aHash32 } from '../core/deterministic';

export const TERRAIN_MATERIALS: Readonly<Record<TerrainMaterialId, TerrainMaterialDefinition>> = {
  deep_water: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'deep_water',
    layerPriority: 10,
    isLiquid: true,
    walkable: false,
    baseColorHex: '#1d4ed8',
    shadowColorHex: '#1e3a8a',
    highlightColorHex: '#3b82f6',
    accentColorHex: '#93c5fd',
    transitionBorderHex: '#172554',
    patternType: 'liquid_wave'
  },
  shallow_water: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'shallow_water',
    layerPriority: 20,
    isLiquid: true,
    walkable: true,
    baseColorHex: '#0284c7',
    shadowColorHex: '#0369a1',
    highlightColorHex: '#38bdf8',
    accentColorHex: '#e0f2fe',
    transitionBorderHex: '#bae6fd',
    patternType: 'liquid_wave'
  },
  lava_magma: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'lava_magma',
    layerPriority: 25,
    isLiquid: true,
    walkable: false,
    baseColorHex: '#ea580c',
    shadowColorHex: '#9a3412',
    highlightColorHex: '#f97316',
    accentColorHex: '#fef08a',
    transitionBorderHex: '#431407',
    patternType: 'liquid_wave'
  },
  sand_beach: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'sand_beach',
    layerPriority: 30,
    isLiquid: false,
    walkable: true,
    baseColorHex: '#d4a359',
    shadowColorHex: '#b5833d',
    highlightColorHex: '#e8be76',
    accentColorHex: '#f5d79c',
    transitionBorderHex: '#8c6229',
    patternType: 'granular_sand'
  },
  dirt_soil: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'dirt_soil',
    layerPriority: 40,
    isLiquid: false,
    walkable: true,
    baseColorHex: '#784f33',
    shadowColorHex: '#593822',
    highlightColorHex: '#946544',
    accentColorHex: '#b07d59',
    transitionBorderHex: '#3d2516',
    patternType: 'granular_sand'
  },
  desert_dune: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'desert_dune',
    layerPriority: 45,
    isLiquid: false,
    walkable: true,
    baseColorHex: '#d99b4e',
    shadowColorHex: '#b87b33',
    highlightColorHex: '#edb468',
    accentColorHex: '#fae',
    transitionBorderHex: '#8f5b1e',
    patternType: 'granular_sand'
  },
  meadow_grass: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'meadow_grass',
    layerPriority: 50,
    isLiquid: false,
    walkable: true,
    baseColorHex: '#4d8046',
    shadowColorHex: '#396333',
    highlightColorHex: '#689e5b',
    accentColorHex: '#8cc276',
    transitionBorderHex: '#284724',
    patternType: 'organic_tuft'
  },
  forest_moss: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'forest_moss',
    layerPriority: 60,
    isLiquid: false,
    walkable: true,
    baseColorHex: '#2f5e3b',
    shadowColorHex: '#1f4228',
    highlightColorHex: '#427850',
    accentColorHex: '#639c72',
    transitionBorderHex: '#142e1b',
    patternType: 'organic_tuft'
  },
  rock_cliff: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'rock_cliff',
    layerPriority: 70,
    isLiquid: false,
    walkable: true,
    baseColorHex: '#647082',
    shadowColorHex: '#475161',
    highlightColorHex: '#8491a6',
    accentColorHex: '#a8b5c9',
    transitionBorderHex: '#2c333d',
    patternType: 'cracked_stone'
  },
  volcanic_ash: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'volcanic_ash',
    layerPriority: 75,
    isLiquid: false,
    walkable: true,
    baseColorHex: '#3f3b47',
    shadowColorHex: '#292630',
    highlightColorHex: '#595463',
    accentColorHex: '#787185',
    transitionBorderHex: '#1a181f',
    patternType: 'cracked_stone'
  },
  snow_frost: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    id: 'snow_frost',
    layerPriority: 80,
    isLiquid: false,
    walkable: true,
    baseColorHex: '#cbd9e8',
    shadowColorHex: '#9fb4cc',
    highlightColorHex: '#e6eff7',
    accentColorHex: '#ffffff',
    transitionBorderHex: '#738ca6',
    patternType: 'frost_crystalline'
  }
};

export interface TileOverrideRecord {
  material?: TerrainMaterialId;
  treeStageOverride?: TreeLifecycleStage | 'removed';
}

/**
 * Campo espacial determinista O(1) libre de estado de carga de chunks.
 * Permite consultar cualquier coordenada (tileX, tileY) del mundo infinito y garantiza
 * continuidad exacta entre bordes de chunks y ríos que atraviesan múltiples regiones.
 */
export class DeterministicWorldField {
  private readonly seedNum: number;
  private readonly overrides = new Map<string, TileOverrideRecord>();

  constructor(public readonly worldSeed: string | number) {
    this.seedNum = typeof worldSeed === 'number' ? worldSeed >>> 0 : fnv1aHash32(String(worldSeed));
  }

  private tileKey(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
  }

  /**
   * Registra una mutación de terreno (ej. excavar camino) o estado vegetal (ej. talar árbol a tocón)
   * y retorna la lista de coordenadas de tiles que deben invalidarse localmente (dirty region 3x3).
   */
  public applyTileModification(
    tileX: number,
    tileY: number,
    override: TileOverrideRecord
  ): Array<{ tileX: number; tileY: number }> {
    const key = this.tileKey(tileX, tileY);
    const current = this.overrides.get(key) ?? {};
    this.overrides.set(key, { ...current, ...override });

    // Si cambia el material del terreno, los 8 vecinos inmediatos también actualizan su máscara de autotiling
    const dirtyTiles: Array<{ tileX: number; tileY: number }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        dirtyTiles.push({ tileX: tileX + dx, tileY: tileY + dy });
      }
    }
    return dirtyTiles;
  }

  public clearModifications(): void {
    this.overrides.clear();
  }

  /**
   * Ruido de valor 2D continuo con interpolación Hermite cúbica, 100% determinista en CPU
   */
  public valueNoise2D(x: number, y: number, scale: number, salt: number): number {
    const sx = x / scale;
    const sy = y / scale;
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const fx = sx - x0;
    const fy = sy - y0;

    // Suavizado Hermite: 3t^2 - 2t^3
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const n00 = this.latticeHash(x0, y0, salt);
    const n10 = this.latticeHash(x0 + 1, y0, salt);
    const n01 = this.latticeHash(x0, y0 + 1, salt);
    const n11 = this.latticeHash(x0 + 1, y0 + 1, salt);

    const nx0 = n00 + ux * (n10 - n00);
    const nx1 = n01 + ux * (n11 - n01);
    return nx0 + uy * (nx1 - nx0);
  }

  /**
   * Ruido fractal multi-octava (fBm) en rango [0, 1]
   */
  public fbm2D(x: number, y: number, baseScale: number, octaves: number, salt: number): number {
    let total = 0;
    let amplitude = 1;
    let maxAmplitude = 0;
    let scale = baseScale;

    for (let i = 0; i < octaves; i++) {
      total += this.valueNoise2D(x, y, scale, salt + i * 1013) * amplitude;
      maxAmplitude += amplitude;
      amplitude *= 0.5;
      scale = Math.max(1.5, scale * 0.5);
    }
    return total / maxAmplitude;
  }

  private latticeHash(ix: number, iy: number, salt: number): number {
    let h = (this.seedNum ^ Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(salt, 1442695041)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /**
   * Determina únicamente el material base de un tile (usado por vecinos durante autotiling)
   */
  public sampleMaterialOnly(tileX: number, tileY: number): {
    material: TerrainMaterialId;
    biome: BiomeId;
    elevation: number;
    moisture: number;
    temperature: number;
  } {
    const override = this.overrides.get(this.tileKey(tileX, tileY));
    const elevationRaw = this.fbm2D(tileX, tileY, 18, 3, 11) * 2 - 1; // [-1, 1]
    const moisture = this.fbm2D(tileX, tileY, 22, 2, 29);
    const temperature = this.fbm2D(tileX, tileY, 28, 2, 47);

    // Canal de río sinuoso continuo a través de todos los chunks
    const riverWave = Math.sin(tileX * 0.14 + this.valueNoise2D(tileX, tileY, 12, 73) * 2.8) * 5.5;
    const distToRiverCenter = Math.abs((tileY % 32) - (16 + riverWave));
    const isRiverChannel = distToRiverCenter < 1.65 && elevationRaw < 0.45;

    let biome: BiomeId = 'meadow';
    if (temperature < 0.28) {
      biome = 'tundra';
    } else if (temperature > 0.72 && moisture < 0.42) {
      biome = 'desert';
    } else if (moisture > 0.58) {
      biome = 'forest';
    }

    let material: TerrainMaterialId;
    if (override?.material) {
      material = override.material;
    } else if (isRiverChannel) {
      material = distToRiverCenter < 0.75 ? 'deep_water' : 'shallow_water';
    } else if (elevationRaw < -0.38) {
      material = 'deep_water';
    } else if (elevationRaw < -0.22) {
      material = 'shallow_water';
    } else if (elevationRaw < -0.12 || (distToRiverCenter < 2.65 && elevationRaw < 0.45)) {
      material = biome === 'tundra' ? 'snow_frost' : 'sand_beach';
    } else if (elevationRaw > 0.52) {
      material = biome === 'tundra' ? 'snow_frost' : 'rock_cliff';
    } else {
      switch (biome) {
        case 'tundra':
          material = 'snow_frost';
          break;
        case 'desert':
          material = 'desert_dune';
          break;
        case 'forest':
          material = 'forest_moss';
          break;
        default:
          material = 'meadow_grass';
          break;
      }
    }

    return { material, biome, elevation: elevationRaw, moisture, temperature };
  }

  /**
   * Calcula la máscara de autotiling de 8 vecinos con Diagonal Corner Gating (47-blob)
   * y detecta el material vecino de menor prioridad para superponer bordes orgánicos.
   */
  public computeAutotileMaskAndTransition(
    tileX: number,
    tileY: number,
    centerMaterial: TerrainMaterialId
  ): {
    mask: AutotileMask8;
    transitionNeighborMaterial?: TerrainMaterialId;
  } {
    const centerPriority = TERRAIN_MATERIALS[centerMaterial].layerPriority;
    let transitionNeighborMaterial: TerrainMaterialId | undefined;
    let highestLowerPriority = -1;

    const isSameOrHigherGroup = (dx: number, dy: number): boolean => {
      const neighbor = this.sampleMaterialOnly(tileX + dx, tileY + dy).material;
      if (neighbor === centerMaterial) return true;
      // Agua profunda y somera comparten continuidad de familia líquida
      if (centerMaterial === 'shallow_water' && neighbor === 'deep_water') return true;

      const nPrio = TERRAIN_MATERIALS[neighbor].layerPriority;
      if (nPrio < centerPriority && nPrio > highestLowerPriority) {
        highestLowerPriority = nPrio;
        transitionNeighborMaterial = neighbor;
      }
      return false;
    };

    const n = isSameOrHigherGroup(0, -1);
    const e = isSameOrHigherGroup(1, 0);
    const s = isSameOrHigherGroup(0, 1);
    const w = isSameOrHigherGroup(-1, 0);

    // Diagonal Corner Gating: la esquina diagonal sólo cuenta si ambos cardinales adyacentes están presentes
    const ne = n && e && isSameOrHigherGroup(1, -1);
    const se = s && e && isSameOrHigherGroup(1, 1);
    const sw = s && w && isSameOrHigherGroup(-1, 1);
    const nw = n && w && isSameOrHigherGroup(-1, -1);

    const mask =
      (n ? 1 : 0) |
      (ne ? 2 : 0) |
      (e ? 4 : 0) |
      (se ? 8 : 0) |
      (s ? 16 : 0) |
      (sw ? 32 : 0) |
      (w ? 64 : 0) |
      (nw ? 128 : 0);

    return { mask, transitionNeighborMaterial };
  }

  /**
   * Muestra completa de un tile del mundo (terreno + autotiling + vegetación/geología determinista)
   */
  public sampleWorldTile(tileX: number, tileY: number): WorldTileSample {
    const base = this.sampleMaterialOnly(tileX, tileY);
    const { mask, transitionNeighborMaterial } = this.computeAutotileMaskAndTransition(
      tileX,
      tileY,
      base.material
    );

    const override = this.overrides.get(this.tileKey(tileX, tileY));
    const matDef = TERRAIN_MATERIALS[base.material];
    let propSpawn: WorldTileSample['propSpawn'];

    // Sólo colocar árboles, flora o rocas en tiles terrestres interiores (mask === 255 evita bordes de costa)
    if (!matDef.isLiquid && mask === 255 && override?.treeStageOverride !== 'removed') {
      const spawnRoll = this.latticeHash(tileX, tileY, 901);
      const speciesRoll = this.latticeHash(tileX, tileY, 937);
      const stageRoll = this.latticeHash(tileX, tileY, 971);
      const variantSeed = fnv1aHash32(`${this.seedNum}::prop::${tileX},${tileY}`);

      if (base.material === 'rock_cliff' && spawnRoll < 0.22) {
        const subType = spawnRoll < 0.06 ? 'crystal_geode' : spawnRoll < 0.14 ? 'iron_vein' : 'mossy_boulder';
        propSpawn = { kind: 'mineral', subType, variantSeed };
      } else if (
        (base.material === 'meadow_grass' || base.material === 'forest_moss' || base.material === 'snow_frost') &&
        spawnRoll < (base.biome === 'forest' ? 0.16 : 0.08)
      ) {
        const nearWater = this.isNearWater(tileX, tileY, base.moisture);
        const species = this.selectEcologicalTreeSpecies(
          base.biome, base.moisture, base.temperature, speciesRoll, nearWater
        );
        const defaultStage = this.selectEcologicalTreeStage(stageRoll);
        propSpawn = {
          kind: 'tree',
          subType: species,
          stage: override?.treeStageOverride ?? defaultStage,
          variantSeed
        };
      } else if (base.material === 'sand_beach' && spawnRoll < 0.04) {
        propSpawn = {
          kind: 'tree',
          subType: base.moisture > 0.65 && speciesRoll < 0.35 ? 'mangrove' : 'palm',
          stage: override?.treeStageOverride ?? this.selectEcologicalTreeStage(stageRoll),
          variantSeed
        };
      } else if (base.material === 'desert_dune' && spawnRoll < 0.06) {
        propSpawn = { kind: 'flora', subType: 'desert_cactus', variantSeed };
      } else if (
        (base.material === 'meadow_grass' || base.material === 'forest_moss') &&
        spawnRoll >= 0.2 &&
        spawnRoll < 0.34
      ) {
        const subType = spawnRoll < 0.25 ? 'wild_flower' : spawnRoll < 0.3 ? 'tall_grass' : 'mushroom_cluster';
        propSpawn = { kind: 'flora', subType, variantSeed };
      }
    }

    return {
      tileX,
      tileY,
      elevation: base.elevation,
      moisture: base.moisture,
      temperature: base.temperature,
      biome: base.biome,
      material: base.material,
      autotileMask: mask,
      transitionNeighborMaterial,
      propSpawn
    };
  }
  /** Approximate riparian proximity at fixed offsets without chunk state. */
  private isNearWater(tileX: number, tileY: number, moisture: number): boolean {
    if (moisture < 0.58) return false;
    for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) {
      const material = this.sampleMaterialOnly(tileX + dx, tileY + dy).material;
      if (material === 'shallow_water' || material === 'deep_water') return true;
    }
    return false;
  }

  /** Habitat-weighted families. Roll is independent of spawn and stage rolls. */
  private selectEcologicalTreeSpecies(
    biome: BiomeId,
    moisture: number,
    temperature: number,
    speciesRoll: number,
    nearWater: boolean
  ): TreeSpeciesId {
    if (biome === 'corrupted') return speciesRoll < 0.8 ? 'corrupted_thorn' : 'dead_tree';
    if (biome === 'volcanic') return speciesRoll < 0.65 ? 'dead_tree' : 'corrupted_thorn';
    if (biome === 'tundra') {
      if (speciesRoll < 0.12) return 'dead_tree';
      if (speciesRoll < 0.4) return 'birch';
      return 'pine';
    }
    if (biome === 'forest') {
      // Rare fantasy or blighted individuals never dominate otherwise healthy habitat.
      if (speciesRoll > 0.992) return 'fantasy_lumin';
      if (speciesRoll > 0.982 && moisture < 0.7) return 'corrupted_thorn';
      if (nearWater && moisture > 0.65 && speciesRoll < 0.35) {
        return temperature > 0.61 ? 'mangrove' : 'willow';
      }
      if (temperature > 0.65 && moisture > 0.60 && speciesRoll < 0.48) {
        return speciesRoll < 0.26 ? 'tropical' : 'bamboo';
      }
      if (speciesRoll < 0.25) return 'pine';
      if (speciesRoll < 0.49) return 'birch';
      if (speciesRoll < 0.55) return 'dead_tree';
      if (speciesRoll < 0.68) return 'fruit_tree';
      return 'oak';
    }
    if (biome === 'desert') return speciesRoll > 0.8 ? 'dead_tree' : 'palm';
    if (nearWater && moisture > 0.64 && speciesRoll < 0.28) return 'willow';
    if (speciesRoll > 0.995 && moisture > 0.62) return 'fantasy_lumin';
    if (speciesRoll < 0.23) return 'fruit_tree';
    if (speciesRoll < 0.51) return 'birch';
    if (speciesRoll < 0.61 && temperature < 0.4) return 'pine';
    return 'oak';
  }

  /** Age and damage are independent of tree species and spawn placement. */
  private selectEcologicalTreeStage(stageRoll: number): TreeLifecycleStage {
    if (stageRoll < 0.008) return 'seed';
    if (stageRoll < 0.04) return 'sprout';
    if (stageRoll < 0.12) return 'sapling';
    if (stageRoll < 0.24) return 'young';
    if (stageRoll < 0.4) return 'immature';
    if (stageRoll < 0.76) return 'mature';
    if (stageRoll < 0.88) return 'ancient';
    if (stageRoll < 0.93) return 'damaged';
    if (stageRoll < 0.96) return 'dead';
    if (stageRoll < 0.985) return 'stump';
    return 'fallen_log';
  }

}
