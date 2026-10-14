import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_PROFILES,
  DEFAULT_WEATHER_STATES,
  PixelBuffer,
  PixelParticleEngine,
  PixelPerfectLightingEngine,
  VFX_EMITTER_PRESETS,
  VFXPresetId,
  WeatherAndWindSystem
} from '../src/index';

describe('PPAE 2.0 Phase 10 — Directional Solar Shadows, Branched Lightning, Fog & Elemental VFX', () => {
  const lighting = new PixelPerfectLightingEngine(12);
  const weather = new WeatherAndWindSystem();
  const profile4 = DEFAULT_STYLE_PROFILES['micro-4x4'];

  it('computes solar shadow vectors that swing from West (dawn) to short North (noon) to East (dusk)', () => {
    const dawnVec = lighting.resolveSolarShadowVector(6.0, false);
    const noonVec = lighting.resolveSolarShadowVector(12.5, false);
    const duskVec = lighting.resolveSolarShadowVector(19.5, false);
    const caveVec = lighting.resolveSolarShadowVector(12.0, true);

    // Al amanecer la sombra apunta al Oeste (dirX < 0); al atardecer apunta al Este (dirX > 0)
    expect(dawnVec.dirX).toBeLessThan(-0.5);
    expect(duskVec.dirX).toBeGreaterThan(0.5);
    expect(Math.abs(noonVec.dirX)).toBeLessThan(0.3);

    // Las sombras de amanecer/atardecer son más largas que la sombra de mediodía
    expect(dawnVec.lengthMultiplier).toBeGreaterThan(noonVec.lengthMultiplier);
    expect(duskVec.lengthMultiplier).toBeGreaterThan(noonVec.lengthMultiplier);
    expect(caveVec.phase).toBe('underground_dark');
  });

  it('projects directional cast shadows onto the scene buffer with Bayer penumbra dithering', () => {
    const scene = new PixelBuffer(64, 64);
    scene.fillRect(0, 0, 64, 64, { r: 120, g: 180, b: 100, a: 255 });

    const casters = [
      {
        casterId: 'oak_1',
        worldX: 20,
        worldY: 20,
        baseRadiusTexels: 5,
        heightTexels: 28
      }
    ];

    const res = lighting.renderDirectionalCastShadows(
      scene,
      casters,
      { x: 0, y: 0, width: 64, height: 64 },
      19.0, // Atardecer (sombra larga hacia el Este)
      profile4,
      false
    );

    expect(res.renderedShadowPixels).toBeGreaterThan(20);
    // El píxel base no sombreado tiene r=120; al Este del caster se oscurece
    const eastShadowPx = scene.getPixel(34, 28);
    expect(eastShadowPx.r).toBeLessThan(120);
  });

  it('generates and rasterizes branched pixel-art lightning bolts during thunderstorms', () => {
    weather.setWeatherState(DEFAULT_WEATHER_STATES.thunderstorm);

    const stormOverlay = weather.renderWeatherOverlay(
      96,
      96,
      { x: 0, y: 0, width: 64, height: 64 },
      profile4,
      1.5,
      [],
      false,
      2026
    );

    expect(stormOverlay.lightningBranchesCount).toBeGreaterThanOrEqual(6);
    expect(stormOverlay.overlayBuffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(3);
  });

  it('supports all 16 VFX emitter presets and renders shaped particles (cross_spark, hollow_ring, streak_line)', () => {
    const allPresets = Object.keys(VFX_EMITTER_PRESETS) as VFXPresetId[];
    expect(allPresets.length).toBe(16);

    const vfx = new PixelParticleEngine(128);
    const buf = new PixelBuffer(64, 64);
    const calmWind = {
      vx: 0,
      vy: 0,
      strength: 0,
      canopyPixelShiftX: 0,
      canopyPixelShiftY: 0
    };

    for (const preset of [
      'poison_bubbles',
      'frost_shards',
      'blood_hit_droplets',
      'arcane_burst',
      'lava_magma_sparks',
      'torch_dancing_embers'
    ] as const) {
      const spawned = vfx.emitBurst(preset, 32, 32, 404, 4);
      expect(spawned).toBe(4);
    }

    vfx.update(50, calmWind);
    const drawn = vfx.renderParticles(buf, profile4);
    expect(drawn).toBeGreaterThan(10);
    expect(buf.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(4);
  });
});
