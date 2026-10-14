import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_PROFILES,
  DEFAULT_WEATHER_STATES,
  PixelBuffer,
  PixelParticleEngine,
  PixelPerfectLightingEngine,
  PPAE_SCHEMA_VERSION,
  WeatherAndWindSystem
} from '../src/index';

describe('PPAE Phase 6 — Quantized 2D Lighting, Wall Shadows, Day/Night, Weather & Particle Pooling', () => {
  it('culls off-screen lights and enforces maxActiveLightsBudget by priority', () => {
    const lighting = new PixelPerfectLightingEngine(2); // Presupuesto máximo de 2 luces activas

    lighting.registerLight({
      schemaVersion: PPAE_SCHEMA_VERSION,
      lightId: 'low_prio_visible',
      kind: 'torch',
      worldX: 32,
      worldY: 32,
      radiusLogical: 32,
      colorHex: '#facc15',
      intensity: 1.0,
      priority: 10,
      flickerSpeed: 0,
      flickerAmplitude: 0,
      castsShadows: false,
      enabled: true
    });

    lighting.registerLight({
      schemaVersion: PPAE_SCHEMA_VERSION,
      lightId: 'high_prio_visible_1',
      kind: 'campfire',
      worldX: 40,
      worldY: 40,
      radiusLogical: 48,
      colorHex: '#f97316',
      intensity: 1.0,
      priority: 90,
      flickerSpeed: 0,
      flickerAmplitude: 0,
      castsShadows: true,
      enabled: true
    });

    lighting.registerLight({
      schemaVersion: PPAE_SCHEMA_VERSION,
      lightId: 'high_prio_visible_2',
      kind: 'bioluminescent_crystal',
      worldX: 60,
      worldY: 60,
      radiusLogical: 40,
      colorHex: '#38bdf8',
      intensity: 1.0,
      priority: 80,
      flickerSpeed: 0,
      flickerAmplitude: 0,
      castsShadows: false,
      enabled: true
    });

    lighting.registerLight({
      schemaVersion: PPAE_SCHEMA_VERSION,
      lightId: 'far_offscreen_light',
      kind: 'torch',
      worldX: 2500,
      worldY: 2500,
      radiusLogical: 32,
      colorHex: '#ffffff',
      intensity: 1.0,
      priority: 100,
      flickerSpeed: 0,
      flickerAmplitude: 0,
      castsShadows: false,
      enabled: true
    });

    const result = lighting.cullAndPrioritizeLights({ x: 0, y: 0, width: 160, height: 160 });

    expect(result.telemetry.registeredLightsCount).toBe(4);
    expect(result.telemetry.culledLightsCount).toBe(1); // La luz en (2500, 2500) fue descartada
    expect(result.telemetry.visibleLightsAfterCulling).toBe(3);
    expect(result.telemetry.activeLightsEvaluated).toBe(2); // Respetó el presupuesto de 2 luces
    expect(result.activeLights.map((l) => l.lightId)).toEqual([
      'high_prio_visible_1',
      'high_prio_visible_2'
    ]);
  });

  it('occludes light behind solid wall rectangles using discrete 2D shadow raycasting', () => {
    const lighting = new PixelPerfectLightingEngine(8);
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];
    const baseScene = new PixelBuffer(48, 48);
    baseScene.fillRect(0, 0, 48, 48, { r: 200, g: 200, b: 200, a: 255 });

    lighting.registerLight({
      schemaVersion: PPAE_SCHEMA_VERSION,
      lightId: 'shadow_caster',
      kind: 'campfire',
      worldX: 8,
      worldY: 16,
      radiusLogical: 32,
      colorHex: '#ffffff',
      intensity: 1.2,
      priority: 100,
      flickerSpeed: 0,
      flickerAmplitude: 0,
      castsShadows: true,
      enabled: true
    });

    const nightAmbient = lighting.resolveAmbientProfileFromHour(23.0, false);

    // Sin muro oclusor
    const unoccluded = lighting.applyLightingToScene(
      baseScene,
      { x: 0, y: 0, width: 32, height: 32 },
      nightAmbient,
      profile,
      []
    );

    // Con muro vertical interpuesto en x = 14..18
    const occluded = lighting.applyLightingToScene(
      baseScene,
      { x: 0, y: 0, width: 32, height: 32 },
      nightAmbient,
      profile,
      [{ x: 14, y: 0, width: 4, height: 32 }]
    );

    // El texel en el lado opuesto del muro (x=32, y=24) debe recibir mucha menos luz cuando el muro existe
    const litPixelUnoccluded = unoccluded.litBuffer.getPixel(32, 24);
    const litPixelOccluded = occluded.litBuffer.getPixel(32, 24);
    expect(litPixelOccluded.r).toBeLessThan(litPixelUnoccluded.r);
  });

  it('suppresses rain precipitation inside sheltered roof footprints and indoor spaces', () => {
    const weather = new WeatherAndWindSystem();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];
    weather.setWeatherState(DEFAULT_WEATHER_STATES.thunderstorm);

    // 1. En un espacio interior completo, cero gotas deben ser generadas
    const indoorRain = weather.renderWeatherOverlay(
      96,
      96,
      { x: 0, y: 0, width: 64, height: 64 },
      profile,
      1.0,
      [],
      true
    );
    expect(indoorRain.spawnedDropsCount).toBe(0);

    // 2. En el exterior con un edificio que cubre la mitad del mapa, las gotas sobre el techo son suprimidas
    const roofRect = { x: 0, y: 0, width: 48, height: 64 };
    const outdoorWithRoof = weather.renderWeatherOverlay(
      96,
      96,
      { x: 0, y: 0, width: 64, height: 64 },
      profile,
      1.0,
      [roofRect],
      false
    );
    expect(outdoorWithRoof.suppressedByRoofCount).toBeGreaterThan(0);
    expect(outdoorWithRoof.spawnedDropsCount).toBeGreaterThan(0);
  });

  it('reuses pre-allocated ParticleSlot objects from the pool without exceeding capacity', () => {
    const poolCapacity = 32;
    const vfx = new PixelParticleEngine(poolCapacity);
    const wind = { vx: 0.3, vy: 0.1, strength: 0.4, canopyPixelShiftX: 1, canopyPixelShiftY: 0 };

    // Emitir 20 partículas (quedan 12 libres)
    vfx.emitBurst('wood_chop_chips', 24, 24, 101, 20);
    expect(vfx.getTelemetry().activeParticlesCount).toBe(20);
    expect(vfx.getTelemetry().availableFreeSlots).toBe(12);

    // Avanzar el tiempo 2000ms para que todas expiren y regresen a la pila libre
    vfx.update(2000, wind);
    expect(vfx.getTelemetry().activeParticlesCount).toBe(0);
    expect(vfx.getTelemetry().availableFreeSlots).toBe(poolCapacity);

    // Emitir 50 partículas sobre un pool de 32 recicla los slots más antiguos sin desbordar memoria
    vfx.emitBurst('combat_hit_sparks', 24, 24, 202, 50);
    expect(vfx.getTelemetry().activeParticlesCount).toBe(poolCapacity);
    expect(vfx.getTelemetry().recycledOverflowsCount).toBe(18);
  });
});
