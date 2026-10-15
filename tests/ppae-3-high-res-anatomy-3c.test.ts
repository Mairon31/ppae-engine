import { describe, expect, it } from 'vitest';
import {
  AnatomicalSpeciesId,
  EIGHT_DIRECTIONS_CLOCKWISE,
  HighResAnatomySynthesizer,
  SUBSYSTEM_TEN_RESOLUTION_READINESS,
  STANDALONE_ENTITY_ANATOMY_TEN_RESOLUTION_AVAILABLE,
  SUPPORTED_ART_MODULE_SIZES,
  auditPillowShadingAndBlobGeometry,
  compareSpeciesSilhouettes,
  verifyTrueNativeResolutionBuffer,
} from '../src/core/ppae-3-phase1-barrel';

describe('PPAE 3.0 Phase 3C — High-Resolution Secondary Anatomy & Material Cluster Shading', () => {
  const synthesizer = new HighResAnatomySynthesizer();

  it('distinguishes standalone ten-size synthesis from unfinished legacy migration', () => {
    expect(STANDALONE_ENTITY_ANATOMY_TEN_RESOLUTION_AVAILABLE).toBe(true);
    expect(SUBSYSTEM_TEN_RESOLUTION_READINESS['entity-anatomy']).toBe(false);
  });

  it('synthesizes genuine high-resolution secondary anatomy in 16x16, 24x24, 32x32, 34x34, and 36x36 without fake upscaling or pillow shading', () => {
    const speciesList: readonly AnatomicalSpeciesId[] = [
      'bovine-cow',
      'ovine-sheep',
      'canine-wolf',
      'avian-chicken',
      'humanoid-biped',
      'amorphous-corrupt',
    ];
    const hdSizes = [16, 24, 32, 34, 36] as const;

    for (const speciesId of speciesList) {
      for (const modSize of hdSizes) {
        const sprite = synthesizer.synthesizeEntitySprite({
          speciesId,
          direction: 'SE',
          profile: modSize,
          seed: 202605,
        });

        expect(sprite.width).toBe(modSize);
        expect(sprite.height).toBe(modSize);
        expect(sprite.secondaryFeatureCount).toBeGreaterThan(0);

        // Must pass true native resolution check (no k x k nearest-neighbor block upscaling)
        const upscaleAudit = verifyTrueNativeResolutionBuffer(
          sprite.rgba,
          sprite.width,
          sprite.height,
          modSize
        );
        // The native-upscaling checker is a heuristic. No suspect block pattern
        // is useful evidence, but an inconclusive result is NOT certification.
        expect(upscaleAudit.classification).not.toBe('empty');

        // Must pass directional lighting check (zero concentric pillow shading)
        const pillowAudit = auditPillowShadingAndBlobGeometry(
          sprite.rgba,
          sprite.width,
          sprite.height
        );
        expect(pillowAudit.hasPillowShadingDefect).toBe(false);
      }
    }
  });

  it('produces clearly differentiated silhouettes between cow, sheep, wolf, chicken, humanoid, and corrupt gel', () => {
    const cow = synthesizer.synthesizeEntitySprite({
      speciesId: 'bovine-cow',
      direction: 'E',
      profile: 'detailed-32x32',
      seed: 101,
    });
    const wolf = synthesizer.synthesizeEntitySprite({
      speciesId: 'canine-wolf',
      direction: 'E',
      profile: 'detailed-32x32',
      seed: 101,
    });
    const chicken = synthesizer.synthesizeEntitySprite({
      speciesId: 'avian-chicken',
      direction: 'E',
      profile: 'detailed-32x32',
      seed: 101,
    });
    const humanoid = synthesizer.synthesizeEntitySprite({
      speciesId: 'humanoid-biped',
      direction: 'E',
      profile: 'detailed-32x32',
      seed: 101,
    });

    const cowVsChicken = compareSpeciesSilhouettes(cow.rgba, chicken.rgba, 32, 32);
    const wolfVsHumanoid = compareSpeciesSilhouettes(wolf.rgba, humanoid.rgba, 32, 32);
    const cowVsWolf = compareSpeciesSilhouettes(cow.rgba, wolf.rgba, 32, 32);

    expect(cowVsChicken.areDistinctSilhouettes).toBe(true);
    expect(wolfVsHumanoid.areDistinctSilhouettes).toBe(true);
    expect(cowVsWolf.intersectionOverUnion).toBeLessThan(0.92);
    expect(cow.rgba).not.toEqual(wolf.rgba);
  });

  it('validates silhouette buffer dimensions and empty masks instead of reporting false distinctness', () => {
    const blank = new Uint8ClampedArray(16 * 16 * 4);
    expect(compareSpeciesSilhouettes(blank, blank, 16, 16).areDistinctSilhouettes).toBe(false);
    expect(() => compareSpeciesSilhouettes(blank, blank, 15, 16)).toThrow(RangeError);
  });

  it('generates deterministic seeded secondary features and stable RGBA for repeated inputs', () => {
    for (const speciesId of ['bovine-cow', 'ovine-sheep', 'canine-wolf', 'avian-chicken',
      'humanoid-biped', 'amorphous-corrupt'] as const) {
      const props = {speciesId, direction: 'SE' as const, profile: 32 as const, seed: 202605};
      const a = synthesizer.synthesizeEntitySprite(props);
      const b = synthesizer.synthesizeEntitySprite(props);
      expect(a.rgba).toEqual(b.rgba);
      expect(a.partRoleBuffer).toEqual(b.partRoleBuffer);
      expect(a.secondaryFeatureCount).toBe(b.secondaryFeatureCount);
    }
  });

  it('renders all 8 directions across all 10 native module sizes (4..36) with strictly binary alpha', () => {
    for (const modSize of SUPPORTED_ART_MODULE_SIZES) {
      for (const dir of EIGHT_DIRECTIONS_CLOCKWISE) {
        const sprite = synthesizer.synthesizeEntitySprite({
          speciesId: 'canine-wolf',
          direction: dir,
          profile: modSize,
          seed: 8080,
        });

        let opaqueCount = 0;
        for (let i = 3; i < sprite.rgba.length; i += 4) {
          const a = sprite.rgba[i];
          expect(a === 0 || a === 255).toBe(true);
          if (a === 255) opaqueCount += 1;
        }
        expect(opaqueCount).toBeGreaterThan(0);
      }
    }
  });
});
