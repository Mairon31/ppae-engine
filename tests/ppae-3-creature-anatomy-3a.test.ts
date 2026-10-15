import { describe, expect, it } from 'vitest';
import {
  AnatomicalSpeciesId,
  SpeciesAnatomicalSkeletonEngine,
} from '../src/core/ppae-3-phase1-barrel';

describe('PPAE 3.0 Phase 3A — Species-Specific 2.5D Anatomical Skeletons & Life Stages', () => {
  const engine = new SpeciesAnatomicalSkeletonEngine();

  it('constructs distinct anatomical skeletons and proportions for cow, sheep, wolf, chicken, humanoid, and corrupt gel', () => {
    const cow = engine.buildRig({ speciesId: 'bovine-cow', seed: 100 });
    const sheep = engine.buildRig({ speciesId: 'ovine-sheep', seed: 100 });
    const wolf = engine.buildRig({ speciesId: 'canine-wolf', seed: 100 });
    const chicken = engine.buildRig({ speciesId: 'avian-chicken', seed: 100 });
    const humanoid = engine.buildRig({ speciesId: 'humanoid-biped', seed: 100 });
    const corrupt = engine.buildRig({ speciesId: 'amorphous-corrupt', seed: 100 });

    // Quadrupeds have 4 ground support contacts; chicken and humanoid have 2
    expect(cow.supportContacts.length).toBe(4);
    expect(sheep.supportContacts.length).toBe(4);
    expect(wolf.supportContacts.length).toBe(4);
    expect(chicken.supportContacts.length).toBe(2);
    expect(humanoid.supportContacts.length).toBe(2);
    expect(corrupt.supportContacts.length).toBe(2);

    // Wolf has an athletic tucked waist (thoraxToAbdomenRatio > 1.3), whereas cow & sheep have wide barrels/fleece (< 1.0)
    expect(wolf.proportions.thoraxToAbdomenRatio).toBeGreaterThan(1.35);
    expect(cow.proportions.thoraxToAbdomenRatio).toBeLessThan(1.0);
    expect(sheep.proportions.thoraxToAbdomenRatio).toBeLessThan(1.0);

    // Adult dairy cow has horns and udder; standard adult sheep has wool-fleece and no udder
    expect(cow.segments.some((s) => s.role === 'horn-or-crest')).toBe(true);
    expect(cow.segments.some((s) => s.id === 'udder')).toBe(true);
    expect(sheep.segments.some((s) => s.material === 'wool-fleece')).toBe(true);
    expect(chicken.segments.some((s) => s.role === 'wing')).toBe(true);
  });

  it('enforces authentic biological neoteny in offspring/juveniles rather than uniform adult downscaling', () => {
    const speciesList: readonly AnatomicalSpeciesId[] = [
      'bovine-cow',
      'ovine-sheep',
      'canine-wolf',
      'avian-chicken',
    ];

    for (const speciesId of speciesList) {
      const offspring = engine.buildRig({ speciesId, lifeStage: 'offspring', seed: 42 });
      const juvenile = engine.buildRig({ speciesId, lifeStage: 'juvenile', seed: 42 });
      const adult = engine.buildRig({ speciesId, lifeStage: 'adult', seed: 42 });

      // Overall standing height increases from offspring -> juvenile -> adult
      expect(offspring.proportions.standingHeightZ).toBeLessThan(
        juvenile.proportions.standingHeightZ
      );
      expect(juvenile.proportions.standingHeightZ).toBeLessThan(
        adult.proportions.standingHeightZ
      );

      // Authentic neoteny: head-to-torso volume ratio is substantially higher in offspring than in adults
      // (If offspring were just a uniformly scaled adult, headToTorsoRatio would be identical)
      expect(offspring.proportions.headToTorsoRatio).toBeGreaterThan(
        adult.proportions.headToTorsoRatio * 1.65
      );
      expect(juvenile.proportions.headToTorsoRatio).toBeGreaterThan(
        adult.proportions.headToTorsoRatio * 1.15
      );
    }
  });

  it('enforces non-uniform anatomical hypertrophy in alpha specimens rather than simple adult upscaling', () => {
    const adultWolf = engine.buildRig({
      speciesId: 'canine-wolf',
      lifeStage: 'adult',
      seed: 77,
    });
    const alphaWolf = engine.buildRig({
      speciesId: 'canine-wolf',
      lifeStage: 'alpha',
      seed: 77,
    });

    expect(alphaWolf.proportions.standingHeightZ).toBeGreaterThan(
      adultWolf.proportions.standingHeightZ
    );
    // Alpha wolf has a more dominant chest-to-waist ratio than a standard adult wolf
    expect(alphaWolf.proportions.thoraxToAbdomenRatio).toBeGreaterThan(
      adultWolf.proportions.thoraxToAbdomenRatio * 1.2
    );

    const adultCow = engine.buildRig({
      speciesId: 'bovine-cow',
      lifeStage: 'adult',
      seed: 77,
    });
    const alphaCow = engine.buildRig({
      speciesId: 'bovine-cow',
      lifeStage: 'alpha',
      seed: 77,
    });
    expect(alphaCow.proportions.hornOrCrestLength).toBeGreaterThan(
      adultCow.proportions.hornOrCrestLength * 1.5
    );
  });

  it('modifies anatomy across body conditions (robust, slender, sick, wounded, corrupted, mutated) and animates locomotion phases', () => {
    const robustCow = engine.buildRig({
      speciesId: 'bovine-cow',
      condition: 'robust',
      seed: 55,
    });
    const slenderCow = engine.buildRig({
      speciesId: 'bovine-cow',
      condition: 'slender',
      seed: 55,
    });
    const mutatedWolf = engine.buildRig({
      speciesId: 'canine-wolf',
      condition: 'mutated',
      seed: 55,
    });

    expect(robustCow.proportions.torsoVolume).toBeGreaterThan(
      slenderCow.proportions.torsoVolume * 1.8
    );
    expect(mutatedWolf.segments.some((s) => s.role === 'mutation-growth')).toBe(true);

    // Locomotion phase changes limb support positions deterministically
    const phase0 = engine.buildRig({
      speciesId: 'canine-wolf',
      locomotionPhase: 0.0,
      seed: 55,
    });
    const phaseQuarter = engine.buildRig({
      speciesId: 'canine-wolf',
      locomotionPhase: 0.25,
      seed: 55,
    });

    expect(phase0.supportContacts[0].position.x).not.toBeCloseTo(
      phaseQuarter.supportContacts[0].position.x,
      3
    );
    expect(phase0.anchors.head_top.position.z).toBeGreaterThan(0);
    expect(phase0.supportPolygon.length).toBeGreaterThanOrEqual(2);
  });
  it('maintains valid segment ancestry, anchors, support hulls, finite metrics and seeded repeatability', () => {
    const speciesList: readonly AnatomicalSpeciesId[] = [
      'bovine-cow', 'ovine-sheep', 'canine-wolf',
      'avian-chicken', 'humanoid-biped', 'amorphous-corrupt',
    ];
    for (const speciesId of speciesList) {
      const rig = engine.buildRig({ speciesId, seed: 312, locomotionPhase: 0.35 });
      expect(engine.buildRig({ speciesId, seed: 312, locomotionPhase: 0.35 })).toEqual(rig);
      const ids = new Set(rig.segments.map((segment) => segment.id));
      expect(ids.size).toBe(rig.segments.length);
      for (const segment of rig.segments) {
        if (segment.parentId !== null) expect(ids.has(segment.parentId)).toBe(true);
        expect(segment.radiusStart).toBeGreaterThan(0);
        expect(segment.radiusEnd).toBeGreaterThan(0);
      }
      for (const anchor of Object.values(rig.anchors)) {
        expect(ids.has(anchor.attachedSegmentId)).toBe(true);
      }
      expect(rig.supportPolygon.length).toBeGreaterThan(0);
      for (const vertex of rig.supportPolygon) expect(vertex.z).toBe(0);
      for (const value of Object.values(rig.proportions)) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });
});
