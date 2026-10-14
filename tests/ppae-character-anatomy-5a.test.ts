import { describe, expect, it } from 'vitest';
import {
  ALL_DIRECTIONS_8,
  CharacterAvatarGenerator,
  DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT,
  DEFAULT_STYLE_PROFILES,
  hexToRgba,
  ProceduralCharacterRig,
  SpritesheetCompiler
} from '../src/index';

describe('PPAE 2.0 Phase 5A — articulated anatomy and facial readability', () => {
  const rig = new ProceduralCharacterRig();
  const avatar = new CharacterAvatarGenerator();
  const p4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
  const p6 = DEFAULT_STYLE_PROFILES['micro-6x6'];

  it('supplies all sixteen named joints for every direction and all seven actions', () => {
    const names = [
      'root', 'pelvis', 'torso', 'neck', 'head', 'shoulder_r',
      'shoulder_l', 'elbow_r', 'elbow_l', 'hand_r', 'hand_l',
      'knee_r', 'knee_l', 'foot_r', 'foot_l', 'weapon_tip'
    ];
    for (const action of ['idle', 'walk', 'run', 'attack', 'use_tool', 'hurt', 'death'] as const) {
      for (const direction of ALL_DIRECTIONS_8) {
        const pose = rig.evaluatePose(
          DEFAULT_HERO_APPEARANCE, action, direction, 1, 6, p6);
        expect(Object.keys(pose.joints).sort()).toEqual([...names].sort());
        expect(pose.joints.head.y).toBeLessThan(pose.joints.neck.y);
        expect(pose.joints.neck.y).toBeLessThan(pose.joints.torso.y);
        expect(pose.joints.torso.y).toBeLessThan(pose.joints.pelvis.y);
        for (const joint of Object.values(pose.joints)) {
          expect(Number.isFinite(joint.x)).toBe(true);
          expect(Number.isFinite(joint.y)).toBe(true);
        }
      }
    }
  });

  it('compresses shoulder projection in side views and preserves anatomical depth', () => {
    const south = rig.evaluatePose(DEFAULT_HERO_APPEARANCE, 'idle', 'S', 0, 4, p6);
    const east = rig.evaluatePose(DEFAULT_HERO_APPEARANCE, 'idle', 'E', 0, 4, p6);
    const west = rig.evaluatePose(DEFAULT_HERO_APPEARANCE, 'idle', 'W', 0, 4, p6);
    expect(Math.abs(east.joints.shoulder_r.x - east.joints.shoulder_l.x))
      .toBeLessThan(Math.abs(south.joints.shoulder_r.x - south.joints.shoulder_l.x));
    expect(east.joints.hand_r.zOrder).toBeGreaterThan(east.joints.hand_l.zOrder);
    expect(west.joints.hand_r.zOrder).toBeLessThan(west.joints.hand_l.zOrder);
  });

  it('keeps south-facing eyes and nose visible beneath long back hair', () => {
    for (const profile of [p4, p6]) {
      const frame = avatar.renderCharacterFrame(
        DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, 'idle', 'S', 0, 4, profile);
      const hx = frame.pivotTexel[0] + frame.pose.joints.head.x;
      const hy = frame.pivotTexel[1] + frame.pose.joints.head.y;
      const eye = hexToRgba(DEFAULT_HERO_APPEARANCE.eyeColorHex);
      const skin = hexToRgba(DEFAULT_HERO_APPEARANCE.skinColorHex);
      const span = Math.max(2, Math.round(1.6 * (profile.moduleSize === 6 ? 1.5 : 1)));
      expect(frame.buffer.getPixel(hx - span, hy)).toEqual(eye);
      expect(frame.buffer.getPixel(hx + span, hy)).toEqual(eye);
      expect(frame.buffer.getPixel(hx, hy)).toEqual(skin);
    }
  });

  it('keeps beard below eyes, and allows a deliberately blinking expression', () => {
    const withBeard = avatar.renderCharacterFrame(
      {...DEFAULT_HERO_APPEARANCE, beardStyle:'full_beard'}, DEFAULT_HERO_EQUIPMENT,
      'idle', 'S', 0, 4, p4);
    const hx = withBeard.pivotTexel[0] + withBeard.pose.joints.head.x;
    const hy = withBeard.pivotTexel[1] + withBeard.pose.joints.head.y;
    expect(withBeard.buffer.getPixel(hx-2,hy)).toEqual(
      hexToRgba(DEFAULT_HERO_APPEARANCE.eyeColorHex));
    const blink = avatar.renderCharacterFrame(
      {...DEFAULT_HERO_APPEARANCE, expression:'blink'}, DEFAULT_HERO_EQUIPMENT,
      'idle', 'S', 0, 4, p4);
    expect(blink.buffer.getPixel(hx-2,hy)).not.toEqual(
      hexToRgba(DEFAULT_HERO_APPEARANCE.eyeColorHex));
  });

  it('differentiates four helmet and hat silhouettes with deterministic images', () => {
    const helmets = ['straw_hat', 'knight_helm', 'ranger_hood', 'crown'] as const;
    const renders = helmets.map(helmet => avatar.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,
      {...DEFAULT_HERO_EQUIPMENT, helmet},
      'idle', 'S', 0, 4, p6));
    for (let i = 0; i < renders.length; i++) {
      for (let j = i+1; j < renders.length; j++) {
        expect(Array.from(renders[i].buffer.data))
          .not.toEqual(Array.from(renders[j].buffer.data));
      }
    }
    expect(Array.from(renders[0].buffer.data))
      .toEqual(Array.from(avatar.renderCharacterFrame(
        DEFAULT_HERO_APPEARANCE,{...DEFAULT_HERO_EQUIPMENT, helmet:'straw_hat'},
        'idle','S',0,4,p6).buffer.data));
  });

  it('preserves main-hand, off-hand and ground anchors through equipment changes', () => {
    const normal = avatar.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,DEFAULT_HERO_EQUIPMENT,'idle','SE',0,4,p6);
    const equipped = avatar.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,
      {...DEFAULT_HERO_EQUIPMENT,helmet:'ranger_hood',mainHand:'mining_pickaxe'},
      'idle','SE',0,4,p6);
    expect(normal.anchors.ground_pivot).toEqual(equipped.anchors.ground_pivot);
    expect(normal.anchors.main_hand).toEqual(equipped.anchors.main_hand);
    expect(normal.anchors.off_hand).toEqual(equipped.anchors.off_hand);
    expect(normal.pivotTexel).toEqual(equipped.pivotTexel);
  });

  it('keeps existing directional spritesheet compilation deterministic', () => {
    const compiler = new SpritesheetCompiler();
    const sheetA = compiler.compileCharacterSheet(
      DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT,p4,['idle','walk'],ALL_DIRECTIONS_8);
    const sheetB = compiler.compileCharacterSheet(
      DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT,p4,['idle','walk'],ALL_DIRECTIONS_8);
    expect(Array.from(sheetA.atlasBuffer.data)).toEqual(Array.from(sheetB.atlasBuffer.data));
    expect(Object.keys(sheetA.metadata.sequenceOrder)).toHaveLength(16);
  });
});
