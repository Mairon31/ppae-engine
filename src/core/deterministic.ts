/**
 * PPAE Deterministic Hashing & Seeded PRNG Subsystem
 * Guarantees identical pixel output across platforms regardless of execution order.
 */

export type RandomDomain =
  | 'visual_archetype'
  | 'geometry_cluster'
  | 'palette_variation'
  | 'surface_pattern'
  | 'simulation'
  | 'temporal_vfx';

/**
 * Hash FNV-1a de 32 bits sin signo
 */
export function fnv1aHash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deriva una semilla de 32 bits inmutable a partir de múltiples coordenadas y dominios
 */
export function deriveDeterministicSeed(
  worldSeed: string | number,
  domain: RandomDomain,
  assetId: string,
  variantIndex = 0,
  generatorVersion = '1.0.0'
): number {
  const canonicalString = `${worldSeed}::${domain}::${assetId}::v${variantIndex}::ver_${generatorVersion}`;
  return fnv1aHash32(canonicalString);
}

/**
 * Deriva una semilla espacial para coordenadas de mundo o chunk sin depender del orden de carga
 */
export function deriveSpatialSeed(
  worldSeed: string | number,
  worldX: number,
  worldY: number,
  layerId: string
): number {
  return fnv1aHash32(`${worldSeed}::spatial::${layerId}::${worldX},${worldY}`);
}

/**
 * Generador Pseudoaleatorio Mulberry32 encapsulado (0 estado global)
 */
export class SeededRNG {
  private state: number;
  public readonly initialSeed: number;

  constructor(seed: number | string) {
    this.initialSeed = typeof seed === 'number' ? seed >>> 0 : fnv1aHash32(seed);
    this.state = this.initialSeed === 0 ? 0x6d2b79f5 : this.initialSeed;
  }

  /**
   * Retorna float en [0, 1)
   */
  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Retorna entero en [min, max] inclusivo
   */
  public nextInt(min: number, max: number): number {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return Math.floor(this.nextFloat() * (hi - lo + 1)) + lo;
  }

  /**
   * Retorna float en [min, max)
   */
  public nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  /**
   * Retorna true con probabilidad p (0 a 1)
   */
  public chance(probability: number): boolean {
    return this.nextFloat() < probability;
  }

  /**
   * Selecciona un elemento de un arreglo no vacío de manera determinista
   */
  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('[SeededRNG] Cannot pick from an empty array');
    }
    return items[this.nextInt(0, items.length - 1)];
  }

  /**
   * Bifurca un sub-generador independiente para una sub-rama geométrica
   */
  public fork(subKey: string): SeededRNG {
    const combined = fnv1aHash32(`${this.state}::${subKey}`);
    return new SeededRNG(combined);
  }

  /**
   * Ruido discreto determinista 2D en [0, 1) para coordenadas enteras (x, y)
   */
  public spatialNoise2D(x: number, y: number): number {
    let h = this.initialSeed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
}
