import {
  ArtStyleProfile,
  ParticleEmitterDefinition,
  ParticleShapeKind,
  PPAE_SCHEMA_VERSION,
  RGBAColor,
  VFXPresetId,
  WindVectorSample
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export const VFX_EMITTER_PRESETS: Readonly<Record<VFXPresetId, ParticleEmitterDefinition>> = {
  campfire_flames: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'campfire_flames',
    spawnCount: 10,
    minLifetimeMs: 350,
    maxLifetimeMs: 750,
    minSpeedTexelsPerSec: 8,
    maxSpeedTexelsPerSec: 18,
    gravityTexelsPerSec2: -14, // Asciende por convección térmica
    windInfluence: 0.45,
    sizeTexels: 2,
    colorRampHex: ['#fef08a', '#f97316', '#991b1b'],
    collidesWithFloor: false
  },
  ember_smoke: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'ember_smoke',
    spawnCount: 8,
    minLifetimeMs: 600,
    maxLifetimeMs: 1200,
    minSpeedTexelsPerSec: 5,
    maxSpeedTexelsPerSec: 12,
    gravityTexelsPerSec2: -8,
    windInfluence: 0.85,
    sizeTexels: 2,
    colorRampHex: ['#94a3b8', '#64748b', '#334155'],
    collidesWithFloor: false
  },
  wood_chop_chips: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'wood_chop_chips',
    spawnCount: 12,
    minLifetimeMs: 280,
    maxLifetimeMs: 550,
    minSpeedTexelsPerSec: 16,
    maxSpeedTexelsPerSec: 34,
    gravityTexelsPerSec2: 48,
    windInfluence: 0.15,
    sizeTexels: 2,
    colorRampHex: ['#d6c7b2', '#92400e', '#451a03'],
    collidesWithFloor: true
  },
  stone_mine_sparks: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'stone_mine_sparks',
    spawnCount: 14,
    minLifetimeMs: 220,
    maxLifetimeMs: 480,
    minSpeedTexelsPerSec: 20,
    maxSpeedTexelsPerSec: 42,
    gravityTexelsPerSec2: 55,
    windInfluence: 0.1,
    sizeTexels: 1,
    colorRampHex: ['#fef9c3', '#38bdf8', '#475569'],
    collidesWithFloor: true
  },
  falling_leaves: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'falling_leaves',
    spawnCount: 8,
    minLifetimeMs: 900,
    maxLifetimeMs: 1600,
    minSpeedTexelsPerSec: 4,
    maxSpeedTexelsPerSec: 10,
    gravityTexelsPerSec2: 6,
    windInfluence: 0.95,
    sizeTexels: 2,
    colorRampHex: ['#86efac', '#4ade80', '#15803d'],
    collidesWithFloor: true
  },
  rain_splash: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'rain_splash',
    spawnCount: 6,
    minLifetimeMs: 140,
    maxLifetimeMs: 260,
    minSpeedTexelsPerSec: 8,
    maxSpeedTexelsPerSec: 16,
    gravityTexelsPerSec2: 35,
    windInfluence: 0.2,
    sizeTexels: 1,
    colorRampHex: ['#e0f2fe', '#7dd3fc', '#0284c7'],
    collidesWithFloor: true,
    particleShape: 'streak_line'
  },
  water_ripple: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'water_ripple',
    spawnCount: 4,
    minLifetimeMs: 300,
    maxLifetimeMs: 600,
    minSpeedTexelsPerSec: 2,
    maxSpeedTexelsPerSec: 5,
    gravityTexelsPerSec2: 0,
    windInfluence: 0.05,
    sizeTexels: 2,
    colorRampHex: ['#e0f2fe', '#38bdf8', '#0369a1'],
    collidesWithFloor: false,
    particleShape: 'hollow_ring'
  },
  combat_hit_sparks: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'combat_hit_sparks',
    spawnCount: 15,
    minLifetimeMs: 180,
    maxLifetimeMs: 380,
    minSpeedTexelsPerSec: 24,
    maxSpeedTexelsPerSec: 48,
    gravityTexelsPerSec2: 30,
    windInfluence: 0.05,
    sizeTexels: 2,
    colorRampHex: ['#ffffff', '#facc15', '#ef4444'],
    collidesWithFloor: false,
    particleShape: 'cross_spark'
  },
  healing_aura: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'healing_aura',
    spawnCount: 10,
    minLifetimeMs: 500,
    maxLifetimeMs: 950,
    minSpeedTexelsPerSec: 6,
    maxSpeedTexelsPerSec: 14,
    gravityTexelsPerSec2: -18,
    windInfluence: 0.1,
    sizeTexels: 2,
    colorRampHex: ['#bbf7d0', '#4ade80', '#16a34a'],
    collidesWithFloor: false,
    particleShape: 'cross_spark'
  },
  forest_fireflies: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'forest_fireflies',
    spawnCount: 6,
    minLifetimeMs: 1000,
    maxLifetimeMs: 2200,
    minSpeedTexelsPerSec: 2,
    maxSpeedTexelsPerSec: 6,
    gravityTexelsPerSec2: -1,
    windInfluence: 0.3,
    sizeTexels: 1,
    colorRampHex: ['#fef08a', '#a3e635', '#65a30d'],
    collidesWithFloor: false
  },
  poison_bubbles: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'poison_bubbles',
    spawnCount: 9,
    minLifetimeMs: 420,
    maxLifetimeMs: 850,
    minSpeedTexelsPerSec: 5,
    maxSpeedTexelsPerSec: 12,
    gravityTexelsPerSec2: -12,
    windInfluence: 0.2,
    sizeTexels: 2,
    colorRampHex: ['#d9f99d', '#4ade80', '#15803d'],
    collidesWithFloor: false,
    particleShape: 'hollow_ring'
  },
  frost_shards: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'frost_shards',
    spawnCount: 12,
    minLifetimeMs: 260,
    maxLifetimeMs: 540,
    minSpeedTexelsPerSec: 14,
    maxSpeedTexelsPerSec: 30,
    gravityTexelsPerSec2: 22,
    windInfluence: 0.15,
    sizeTexels: 2,
    colorRampHex: ['#ffffff', '#7dd3fc', '#0284c7'],
    collidesWithFloor: true,
    particleShape: 'cross_spark'
  },
  blood_hit_droplets: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'blood_hit_droplets',
    spawnCount: 10,
    minLifetimeMs: 220,
    maxLifetimeMs: 460,
    minSpeedTexelsPerSec: 16,
    maxSpeedTexelsPerSec: 32,
    gravityTexelsPerSec2: 52,
    windInfluence: 0.05,
    sizeTexels: 2,
    colorRampHex: ['#f87171', '#dc2626', '#7f1d1d'],
    collidesWithFloor: true,
    particleShape: 'pixel_square'
  },
  arcane_burst: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'arcane_burst',
    spawnCount: 14,
    minLifetimeMs: 300,
    maxLifetimeMs: 650,
    minSpeedTexelsPerSec: 18,
    maxSpeedTexelsPerSec: 38,
    gravityTexelsPerSec2: -4,
    windInfluence: 0.1,
    sizeTexels: 2,
    colorRampHex: ['#f5d0fe', '#c084fc', '#6b21a8'],
    collidesWithFloor: false,
    particleShape: 'cross_spark'
  },
  lava_magma_sparks: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'lava_magma_sparks',
    spawnCount: 11,
    minLifetimeMs: 320,
    maxLifetimeMs: 700,
    minSpeedTexelsPerSec: 15,
    maxSpeedTexelsPerSec: 34,
    gravityTexelsPerSec2: 36,
    windInfluence: 0.25,
    sizeTexels: 2,
    colorRampHex: ['#fef08a', '#f97316', '#7c2d12'],
    collidesWithFloor: true,
    particleShape: 'streak_line'
  },
  torch_dancing_embers: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    presetId: 'torch_dancing_embers',
    spawnCount: 6,
    minLifetimeMs: 400,
    maxLifetimeMs: 820,
    minSpeedTexelsPerSec: 6,
    maxSpeedTexelsPerSec: 14,
    gravityTexelsPerSec2: -16,
    windInfluence: 0.5,
    sizeTexels: 1,
    colorRampHex: ['#fef9c3', '#fb923c', '#9a3412'],
    collidesWithFloor: false,
    particleShape: 'pixel_square'
  }
};

interface ParticleSlot {
  active: boolean;
  presetId: VFXPresetId;
  shape: ParticleShapeKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  windInfluence: number;
  floorY: number;
  collidesWithFloor: boolean;
  ageMs: number;
  lifetimeMs: number;
  sizeTexels: 1 | 2 | 3;
  colors: readonly [RGBAColor, RGBAColor, RGBAColor];
}

export interface ParticlePoolTelemetry {
  readonly poolCapacity: number;
  readonly activeParticlesCount: number;
  readonly availableFreeSlots: number;
  readonly totalSpawnsServed: number;
  readonly recycledOverflowsCount: number;
}

/**
 * Motor de partículas orientado a pixel art con Object Pooling estricto.
 * Todos los objetos `ParticleSlot` se preasignan una única vez en el constructor,
 * garantizando 0 asignaciones de objetos por fotograma durante la simulación.
 */
export class PixelParticleEngine {
  private readonly pool: ParticleSlot[];
  private readonly freeIndices: number[];
  private totalSpawnsServed = 0;
  private recycledOverflowsCount = 0;

  constructor(public readonly maxPoolCapacity = 512) {
    this.pool = Array.from({ length: maxPoolCapacity }, () => ({
      active: false,
      presetId: 'campfire_flames',
      shape: 'pixel_square',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gravity: 0,
      windInfluence: 0,
      floorY: 0,
      collidesWithFloor: false,
      ageMs: 0,
      lifetimeMs: 1000,
      sizeTexels: 1,
      colors: [
        { r: 255, g: 255, b: 255, a: 255 },
        { r: 255, g: 255, b: 255, a: 255 },
        { r: 255, g: 255, b: 255, a: 255 }
      ]
    }));

    this.freeIndices = [];
    for (let i = maxPoolCapacity - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
  }

  /**
   * Emite una ráfaga de partículas desde el pool preasignado usando una semilla determinista.
   */
  public emitBurst(
    presetId: VFXPresetId,
    originTexelX: number,
    originTexelY: number,
    seed = 2026,
    customCount?: number
  ): number {
    const def = VFX_EMITTER_PRESETS[presetId];
    const rng = new SeededRNG(seed);
    const count = customCount ?? def.spawnCount;
    const ramp: readonly [RGBAColor, RGBAColor, RGBAColor] = [
      hexToRgba(def.colorRampHex[0]),
      hexToRgba(def.colorRampHex[1]),
      hexToRgba(def.colorRampHex[2])
    ];

    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const slotIndex = this.acquireSlotIndex();
      const slot = this.pool[slotIndex];

      const angle = rng.nextRange(-Math.PI, 0); // Semiesfera superior por defecto
      const speed = rng.nextRange(def.minSpeedTexelsPerSec, def.maxSpeedTexelsPerSec);

      slot.active = true;
      slot.presetId = presetId;
      slot.shape = def.particleShape ?? 'pixel_square';
      slot.x = originTexelX + rng.nextInt(-2, 2);
      slot.y = originTexelY + rng.nextInt(-2, 1);
      slot.vx = Math.cos(angle) * speed;
      slot.vy = Math.sin(angle) * speed;
      slot.gravity = def.gravityTexelsPerSec2;
      slot.windInfluence = def.windInfluence;
      slot.floorY = originTexelY + rng.nextInt(2, 6);
      slot.collidesWithFloor = def.collidesWithFloor;
      slot.ageMs = 0;
      slot.lifetimeMs = rng.nextInt(def.minLifetimeMs, def.maxLifetimeMs);
      slot.sizeTexels = def.sizeTexels;
      slot.colors = ramp;

      this.totalSpawnsServed++;
      spawned++;
    }

    return spawned;
  }

  /**
   * Avanza la simulación física aproximada con deltaTime e influencia del viento.
   */
  public update(deltaMs: number, wind: WindVectorSample): void {
    const dtSec = Math.max(0, deltaMs) / 1000;

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.ageMs += deltaMs;
      if (p.ageMs >= p.lifetimeMs) {
        p.active = false;
        this.freeIndices.push(i);
        continue;
      }

      p.vy += p.gravity * dtSec;
      p.x += (p.vx + wind.vx * 18 * p.windInfluence) * dtSec;
      p.y += (p.vy + wind.vy * 8 * p.windInfluence) * dtSec;

      // Rebote amortiguado contra el suelo visual cuando está habilitado
      if (p.collidesWithFloor && p.y >= p.floorY && p.vy > 0) {
        p.y = p.floorY;
        p.vy = -p.vy * 0.35;
        p.vx *= 0.65;
      }
    }
  }

  /**
   * Rasteriza las partículas activas en el `PixelBuffer` destino realizando pixel-snapping.
   */
  public renderParticles(targetBuffer: PixelBuffer, _profile: ArtStyleProfile): number {
    let drawnCount = 0;

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      const progress = p.ageMs / Math.max(1, p.lifetimeMs);
      const color =
        progress < 0.33 ? p.colors[0] : progress < 0.72 ? p.colors[1] : p.colors[2];

      const snapX = Math.round(p.x);
      const snapY = Math.round(p.y);

      if (snapX >= 0 && snapX < targetBuffer.width && snapY >= 0 && snapY < targetBuffer.height) {
        if (p.shape === 'cross_spark' && p.sizeTexels >= 2) {
          targetBuffer.setPixel(snapX, snapY, p.colors[0]);
          targetBuffer.setPixel(snapX - 1, snapY, color);
          targetBuffer.setPixel(snapX + 1, snapY, color);
          targetBuffer.setPixel(snapX, snapY - 1, color);
          targetBuffer.setPixel(snapX, snapY + 1, color);
        } else if (p.shape === 'hollow_ring') {
          const radius = progress > 0.5 ? 2 : 1;
          targetBuffer.setPixel(snapX - radius, snapY, color);
          targetBuffer.setPixel(snapX + radius, snapY, color);
          targetBuffer.setPixel(snapX, snapY - radius, color);
          targetBuffer.setPixel(snapX, snapY + radius, color);
        } else if (p.shape === 'streak_line') {
          const tailX = snapX - Math.sign(Math.round(p.vx));
          const tailY = snapY - Math.sign(Math.round(p.vy));
          targetBuffer.drawLine(tailX, tailY, snapX, snapY, color, 1);
        } else {
          targetBuffer.fillRect(snapX, snapY, p.sizeTexels, p.sizeTexels, color);
        }
        drawnCount++;
      }
    }

    return drawnCount;
  }

  public getTelemetry(): ParticlePoolTelemetry {
    const activeCount = this.maxPoolCapacity - this.freeIndices.length;
    return {
      poolCapacity: this.maxPoolCapacity,
      activeParticlesCount: activeCount,
      availableFreeSlots: this.freeIndices.length,
      totalSpawnsServed: this.totalSpawnsServed,
      recycledOverflowsCount: this.recycledOverflowsCount
    };
  }

  private acquireSlotIndex(): number {
    const popped = this.freeIndices.pop();
    if (popped !== undefined) {
      return popped;
    }
    // Si el pool alcanza su límite presupuestado, reciclar el slot con mayor edad relativa
    this.recycledOverflowsCount++;
    let oldestIdx = 0;
    let oldestAge = -1;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].ageMs > oldestAge) {
        oldestAge = this.pool[i].ageMs;
        oldestIdx = i;
      }
    }
    return oldestIdx;
  }
}
