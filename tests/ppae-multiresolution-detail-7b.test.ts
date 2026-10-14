import { describe, expect, it } from 'vitest';
import {
  ALL_DIRECTIONS_8,
  CharacterAvatarGenerator,
  CharacterCustomizationService,
  DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT,
  DEFAULT_STYLE_PROFILES,
  GranularityProfileId,
  NatureGenerator,
  ProceduralCharacterRig,
  TreeDiversityController
} from '../src/index';

describe('PPAE 2.0 Phase 7B — native multi-resolution character, canopy and geology detail', () => {
  const avatar = new CharacterAvatarGenerator();
  const audit = new CharacterCustomizationService();
  const nature = new NatureGenerator();
  const silhouettes = new TreeDiversityController();
  const rig = new ProceduralCharacterRig();

  const profiles: readonly Exclude<GranularityProfileId, 'hybrid-24' | 'adaptive-auto'>[] = [
    'micro-4x4', 'micro-6x6', 'classic-8x8',
    'standard-16x16', 'detailed-32x32'
  ];

  it('scales 16-joint anatomy, keeps the ground pivot and passes 8-direction continuity at every tier', () => {
    let previousHeight = 0;
    for (const id of profiles) {
      const profile = DEFAULT_STYLE_PROFILES[id];
      const frame = avatar.renderCharacterFrame(
        DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, 'idle', 'S', 0, 4, profile
      );
      const sil = silhouettes.analyzeRasterSilhouette(frame.buffer);
      expect(sil.boundingBox.height).toBeGreaterThan(previousHeight);
      previousHeight = sil.boundingBox.height;
      expect(frame.pivotTexel[1]).toBeLessThan(frame.buffer.height);
      const result = audit.auditCharacterAnatomicalContinuity(
        DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, profile, 'idle'
      );
      expect(result.passedAllDirections).toBe(true);
    }
  });

  it('increases facial shading, foliar subdivision and geological mineral detail at 16x16 and 32x32', () => {
    const p4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
    const p16 = DEFAULT_STYLE_PROFILES['standard-16x16'];
    const p32 = DEFAULT_STYLE_PROFILES['detailed-32x32'];
    const hero4 = avatar.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, 'idle', 'S', 0, 4, p4
    );
    const hero16 = avatar.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, 'idle', 'S', 0, 4, p16
    );
    const hero32 = avatar.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, 'idle', 'S', 0, 4, p32
    );
    expect(hero16.buffer.countUniqueOpaqueColors()).toBeGreaterThan(
      hero4.buffer.countUniqueOpaqueColors()
    );
    expect(hero32.buffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(
      hero16.buffer.countUniqueOpaqueColors()
    );
    const oak4 = nature.generateTreeStage('oak', 'mature', p4, 2026);
    const oak16 = nature.generateTreeStage('oak', 'mature', p16, 2026);
    const rock4 = nature.generateGeologicalResource('crystal_geode', p4, 2026);
    const rock16 = nature.generateGeologicalResource('crystal_geode', p16, 2026);
    expect(oak16.buffer.countUniqueOpaqueColors()).toBeGreaterThan(
      oak4.buffer.countUniqueOpaqueColors()
    );
    expect(rock16.buffer.countUniqueOpaqueColors()).toBeGreaterThanOrEqual(
      rock4.buffer.countUniqueOpaqueColors()
    );
  });

  it('preserves deterministic native geometry and proportions in all eight directions', () => {
    for (const id of profiles) {
      const profile = DEFAULT_STYLE_PROFILES[id];
      const action = 'walk';
      for (const dir of ALL_DIRECTIONS_8) {
        const a = avatar.renderCharacterFrame(
          DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, action, dir, 1, 6, profile
        );
        const b = avatar.renderCharacterFrame(
          DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, action, dir, 1, 6, profile
        );
        expect(Array.from(a.buffer.data)).toEqual(Array.from(b.buffer.data));
        expect(a.pose.joints.head.y).toBeLessThan(a.pose.joints.torso.y);
      }
    }
  });

  it('applies exact moduleSize / 4 scaling without changing logical joint hierarchy', () => {
    const span = (id: GranularityProfileId) => {
      const p = DEFAULT_STYLE_PROFILES[id];
      const pose = rig.evaluatePose(DEFAULT_HERO_APPEARANCE, 'idle', 'S', 0, 4, p);
      return pose.joints.torso.y - pose.joints.pelvis.y;
    };
    const base = span('micro-4x4');
    expect(Math.abs(span('classic-8x8'))).toBeCloseTo(Math.abs(base * 2), 0);
    expect(Math.abs(span('standard-16x16'))).toBeCloseTo(Math.abs(base * 4), 0);
    expect(Math.abs(span('detailed-32x32'))).toBeCloseTo(Math.abs(base * 8), 0);
  });
});
