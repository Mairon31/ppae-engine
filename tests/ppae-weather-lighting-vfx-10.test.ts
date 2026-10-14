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

  it('rasterizes the shadow silhouette without cumulative self-overdraw black bands', () => {
    const scene = new PixelBuffer(160, 128);
    scene.fillRect(0, 0, 160, 128, { r: 200, g: 200, b: 200, a: 255 });
    const result = lighting.renderDirectionalCastShadows(
      scene, [{ casterId: 'single_oak', worldX: 40, worldY: 40,
        baseRadiusTexels: 7, heightTexels: 30 }],
      { x: 0, y: 0, width: 160, height: 128 }, 6, profile4
    );
    expect(result.renderedShadowPixels).toBeGreaterThan(40);
    let darkest = 255, unchanged = 0;
    for (let y = 0; y < scene.height; y++) {
      for (let x = 0; x < scene.width; x++) {
        const r = scene.getPixel(x, y).r;
        darkest = Math.min(darkest, r);
        if (r === 200) unchanged++;
      }
    }
    expect(darkest).toBeGreaterThanOrEqual(120);
    expect(darkest).toBeLessThan(200);
    expect(unchanged).toBeGreaterThan(17000);
  });

  it('generates deterministic layered fog without turning every pixel into an opaque grid', () => {
    weather.setWeatherState(DEFAULT_WEATHER_STATES.dense_fog);
    const render = () => weather.renderWeatherOverlay(
      96, 64, { x: 0, y: 0, width: 64, height: 64 }, profile4,
      2.25, [], false, 91
    ).overlayBuffer;
    const first = render(), again = render();
    expect(Array.from(first.data)).toEqual(Array.from(again.data));
    let fogPixels = 0;
    for (let i = 3; i < first.data.length; i += 4) {
      if (first.data[i] > 0) fogPixels++;
    }
    expect(fogPixels).toBeGreaterThan(100);
    expect(fogPixels).toBeLessThan(96 * 64);
    // Stratified banks: rows through both layers are denser than exposed sky.
    const coveredRow = (row: number) => {
      let count = 0;
      for (let x = 0; x < first.width; x++) {
        if (first.getPixel(x, row).a > 0) count++;
      }
      return count;
    };
    expect(coveredRow(20)).toBeGreaterThan(coveredRow(0));
    expect(coveredRow(44)).toBeGreaterThan(coveredRow(0));
    expect(weather.generateLightningBolt(96, 64, 77))
      .toEqual(weather.generateLightningBolt(96, 64, 77));
    expect(weather.generateLightningBolt(96, 64, 77))
      .not.toEqual(weather.generateLightningBolt(96, 64, 78));
  });

});
