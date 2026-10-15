import { describe, expect, it } from 'vitest';
import {
  AnatomicalSpeciesId,
  EIGHT_DIRECTIONS_CLOCKWISE,
  EightDirectionProjectionEngine,
  SUPPORTED_ART_MODULE_SIZES,
  SpeciesAnatomicalSkeletonEngine,
} from '../src/core/ppae-3-phase1-barrel';

describe('PPAE 3.0 Phase 3B — Eight-Direction 2.5D Projection & Occlusion Engine', () => {
  const skeletonEngine = new SpeciesAnatomicalSkeletonEngine();
  const projector = new EightDirectionProjectionEngine(34);

  it('projects all 8 directions (N, NE, E, SE, S, SW, W, NW) with realistic torso foreshortening for quadrupeds', () => {
    const speciesList: readonly AnatomicalSpeciesId[] = [
      'bovine-cow',
      'ovine-sheep',
      'canine-wolf',
    ];

    for (const speciesId of speciesList) {
      const rig = skeletonEngine.buildRig({ speciesId, seed: 3030 });
      const views = projector.projectAllEightDirections(rig);
      const continuity = projector.auditEightDirectionContinuity(rig);

      expect(Object.keys(views)).toEqual([...EIGHT_DIRECTIONS_CLOCKWISE]);
      expect(continuity.allDirectionsValid).toBe(true);

      // Lateral profile torso width (E/W) must be wider than diagonal (SE/SW), which is wider than frontal/back (S/N)
      expect(views.E.apparentTorsoWidthNormalized).toBeGreaterThan(
        views.SE.apparentTorsoWidthNormalized
      );
      expect(views.SE.apparentTorsoWidthNormalized).toBeGreaterThan(
        views.S.apparentTorsoWidthNormalized
      );
      expect(continuity.lateralToFrontalForeshorteningRatio).toBeGreaterThan(1.3);
    }
  });

  it('enforces explicit visibility & occlusion rules for eyes, muzzle, tail, and far-side limbs across directions', () => {
    const cowRig = skeletonEngine.buildRig({ speciesId: 'bovine-cow', seed: 1122 });
    const views = projector.projectAllEightDirections(cowRig);

    // South (front view): 2 visible eyes, muzzle visible in front of cranium
    const visibleEyesS = views.S.eyeMarkers.filter((e) => e.visible);
    expect(visibleEyesS.length).toBe(2);
    expect(views.S.hiddenSegmentIds).not.toContain('jaw-muzzle');
    expect(views.S.anchors.muzzle_front.isOccludedByBody).toBe(false);

    // North (back view): 0 visible eyes, muzzle culled/occluded behind cranium, tail in front of pelvis
    const visibleEyesN = views.N.eyeMarkers.filter((e) => e.visible);
    expect(visibleEyesN.length).toBe(0);
    expect(views.N.hiddenSegmentIds).toContain('jaw-muzzle');
    expect(views.N.anchors.muzzle_front.isOccludedByBody).toBe(true);

    // East vs West: exactly 1 visible eye on the camera-facing side
    const visibleEyesE = views.E.eyeMarkers.filter((e) => e.visible);
    const visibleEyesW = views.W.eyeMarkers.filter((e) => e.visible);
    expect(visibleEyesE.length).toBe(1);
    expect(visibleEyesE[0].side).toBe('right');
    expect(visibleEyesW.length).toBe(1);
    expect(visibleEyesW[0].side).toBe('left');

    // Far-side limbs are identified and depth-recessed behind near-side limbs
    const farLimbsSE = views.SE.visiblePrimitives.filter((p) => p.isFarSideLimb);
    const nearLimbsSE = views.SE.visiblePrimitives.filter(
      (p) => p.role === 'limb-lower' && !p.isFarSideLimb
    );
    expect(farLimbsSE.length).toBeGreaterThan(0);
    expect(nearLimbsSE.length).toBeGreaterThan(0);
    expect(farLimbsSE[0].zBase).toBeLessThan(nearLimbsSE[0].zBase);
  });

  it('does not produce East/West views by simple horizontal mirroring under directional lighting', () => {
    const wolfRig = skeletonEngine.buildRig({
      speciesId: 'canine-wolf',
      locomotionPhase: 0.2,
      seed: 9001,
    });

    const eastRender = projector.renderDirectionalCreatureSprite({
      rig: wolfRig,
      direction: 'E',
      profile: 'standard-16x16',
      light: { dirX: -0.65, dirY: -0.55, dirZ: 0.52 },
    });

    const westRender = projector.renderDirectionalCreatureSprite({
      rig: wolfRig,
      direction: 'W',
      profile: 'standard-16x16',
      light: { dirX: -0.65, dirY: -0.55, dirZ: 0.52 },
    });

    const W = eastRender.rasterResult.width;
    const H = eastRender.rasterResult.height;

    // Horizontally flip the East RGBA buffer and compare against West:
    // Because lighting comes from top-left (-X) and gait phase is asymmetric between left/right legs,
    // West is a true 3D rotation rather than a naive horizontal flip of East.
    let differencesFromMirrored = 0;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const idxE = (y * W + (W - 1 - x)) * 4;
        const idxW = (y * W + x) * 4;
        if (
          eastRender.rasterResult.rgba[idxE] !== westRender.rasterResult.rgba[idxW] ||
          eastRender.rasterResult.rgba[idxE + 1] !== westRender.rasterResult.rgba[idxW + 1] ||
          eastRender.rasterResult.rgba[idxE + 2] !== westRender.rasterResult.rgba[idxW + 2]
        ) {
          differencesFromMirrored += 1;
        }
      }
    }
    expect(differencesFromMirrored).toBeGreaterThan(8);
  });

  it('renders valid 8-direction sprites across all 10 native resolutions (4..36)', () => {
    const sheepRig = skeletonEngine.buildRig({ speciesId: 'ovine-sheep', seed: 777 });

    for (const modSize of SUPPORTED_ART_MODULE_SIZES) {
      const southSprite = projector.renderDirectionalCreatureSprite({
        rig: sheepRig,
        direction: 'S',
        profile: modSize,
      });
      const southEastSprite = projector.renderDirectionalCreatureSprite({
        rig: sheepRig,
        direction: 'SE',
        profile: modSize,
      });

      expect(southSprite.rasterResult.width).toBe(modSize);
      expect(southEastSprite.rasterResult.width).toBe(modSize);

      let opaqueS = 0;
      for (let i = 3; i < southSprite.rasterResult.rgba.length; i += 4) {
        if (southSprite.rasterResult.rgba[i] === 255) opaqueS += 1;
      }
      expect(opaqueS).toBeGreaterThan(0);
    }
  });

  it('keeps painter order, anatomical anchors and stance contacts stable across all species and headings', () => {
    const speciesList: readonly AnatomicalSpeciesId[] = [
      'bovine-cow', 'ovine-sheep', 'canine-wolf',
      'avian-chicken', 'humanoid-biped', 'amorphous-corrupt',
    ];
    for (const speciesId of speciesList) {
      const rig = skeletonEngine.buildRig({ speciesId, seed: 481, locomotionPhase: 0.25 });
      const views = projector.projectAllEightDirections(rig);
      for (const direction of EIGHT_DIRECTIONS_CLOCKWISE) {
        const view = views[direction];
        expect(view.primitives.length).toBeGreaterThan(0);
        expect(view.supportPoints.length).toBe(rig.supportContacts.length);
        expect(Object.keys(view.anchors).length).toBe(Object.keys(rig.anchors).length);
        expect(new Set(view.primitives.map((p) => p.id)).size).toBe(view.primitives.length);
        for (let index = 1; index < view.primitives.length; index += 1) {
          expect(view.primitives[index].depthSortKey).toBeGreaterThanOrEqual(view.primitives[index - 1].depthSortKey);
        }
        for (const point of view.supportPoints) {
          expect(Number.isFinite(point.normalizedX)).toBe(true);
          expect(Number.isFinite(point.normalizedY)).toBe(true);
          expect(Number.isFinite(point.depthSortKey)).toBe(true);
        }
        for (const anchor of Object.values(view.anchors)) {
          expect(Number.isFinite(anchor.normalizedX)).toBe(true);
          expect(Number.isFinite(anchor.normalizedY)).toBe(true);
          expect(Number.isFinite(anchor.depthSortKey)).toBe(true);
        }
      }
    }
  });

  it('preserves deterministic pixel output and binary alpha for native resolution and morphology variants', () => {
    for (const speciesId of ['bovine-cow', 'canine-wolf', 'humanoid-biped'] as const) {
      const rig = skeletonEngine.buildRig({
        speciesId, seed: 4007, lifeStage: 'juvenile', condition: 'robust', locomotionPhase: 0.125,
      });
      for (const direction of ['S', 'SE', 'E', 'N'] as const) {
        const first = projector.renderDirectionalCreatureSprite({ rig, direction, profile: 'native-24x24' });
        const second = projector.renderDirectionalCreatureSprite({ rig, direction, profile: 'native-24x24' });
        expect(first.rasterResult.width).toBe(24);
        expect(first.rasterResult.rgba).toEqual(second.rasterResult.rgba);
        const alphas = new Set<number>();
        for (let index = 3; index < first.rasterResult.rgba.length; index += 4) {
          alphas.add(first.rasterResult.rgba[index]);
        }
        expect([...alphas].every((value) => value === 0 || value === 255)).toBe(true);
        expect(alphas.has(255)).toBe(true);
      }
    }
  });
});
