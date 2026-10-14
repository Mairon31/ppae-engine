import { describe, expect, it } from 'vitest';
import {
  ALL_DIRECTIONS_8,
  AnimationStateMachine,
  CharacterActionId,
  CharacterAvatarGenerator,
  DEFAULT_CHARACTER_CLIPS,
  DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT,
  DEFAULT_STYLE_PROFILES,
  ProceduralCharacterRig,
  SpritesheetCompiler
} from '../src/index';

describe('PPAE 2.0 Phase 6A — 28-action animation library and 8-direction rig', () => {
  const avatar = new CharacterAvatarGenerator();
  const rig = new ProceduralCharacterRig();
  const compiler = new SpritesheetCompiler();
  const p4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
  const p6 = DEFAULT_STYLE_PROFILES['micro-6x6'];
  const ACTIONS: readonly CharacterActionId[] = [
    'idle','walk','run','sprint','sneak','attack','heavy_attack','block',
    'dodge','use_tool','mining','chopping','harvesting','fishing',
    'farming','digging','building','crafting','healing','eating',
    'drinking','swimming','sleeping','sitting','casting_spells',
    'carrying_objects','hurt','death'
  ];

  it('registers exactly 28 clips with valid event indices and deterministic frames for all directions', () => {
    expect(Object.keys(DEFAULT_CHARACTER_CLIPS)).toHaveLength(28);
    expect(new Set(ACTIONS).size).toBe(28);
    for (const action of ACTIONS) {
      const clip = DEFAULT_CHARACTER_CLIPS[action];
      expect(clip.action).toBe(action);
      expect(clip.frameCount).toBeGreaterThanOrEqual(3);
      expect(clip.frameDurationMs).toBeGreaterThan(0);
      for (const event of clip.events) {
        expect(event.frameIndex).toBeGreaterThanOrEqual(0);
        expect(event.frameIndex).toBeLessThan(clip.frameCount);
      }
      const mid = Math.floor(clip.frameCount / 2);
      for (const direction of ALL_DIRECTIONS_8) {
        const args = [
          DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, action,
          direction, mid, clip.frameCount, p4
        ] as const;
        const a = avatar.renderCharacterFrame(...args);
        const b = avatar.renderCharacterFrame(...args);
        expect(a.buffer.countUniqueOpaqueColors()).toBeGreaterThan(3);
        expect(Array.from(a.buffer.data)).toEqual(Array.from(b.buffer.data));
        for (const joint of Object.values(a.pose.joints)) {
          expect(Number.isFinite(joint.x)).toBe(true);
          expect(Number.isFinite(joint.y)).toBe(true);
        }
      }
    }
  });

  it('distinguishes heavy combat, mining, farming, swimming, carrying, and sleeping from idle', () => {
    const frame = (action: CharacterActionId, f: number, count: number) =>
      avatar.renderCharacterFrame(DEFAULT_HERO_APPEARANCE,
        DEFAULT_HERO_EQUIPMENT, action, 'S', f, count, p6);
    const idle = frame('idle', 1, 4);
    for (const [action, idx, count] of [
      ['heavy_attack',3,6],['mining',2,5],['farming',2,5],
      ['swimming',2,6],['carrying_objects',1,6],['healing',3,5],
      ['casting_spells',3,5],['eating',2,4],['drinking',2,4],
      ['sleeping',1,4]
    ] as const) {
      const changed = frame(action, idx, count);
      expect(Array.from(changed.buffer.data)).not.toEqual(Array.from(idle.buffer.data));
    }
    expect(frame('sleeping',1,4).pose.isCollapsedOnGround).toBe(true);
  });

  it('moves both arm joints for block and carrying poses and differentiates locomotion stride', () => {
    const pose = (action: CharacterActionId, f: number, n: number) =>
      rig.evaluatePose(DEFAULT_HERO_APPEARANCE, action, 'S', f, n, p6);
    const idle = pose('idle',1,4), block = pose('block',1,4);
    const carrying = pose('carrying_objects',1,6);
    expect(block.joints.hand_l.y).not.toBe(idle.joints.hand_l.y);
    expect(carrying.joints.hand_l.y).not.toBe(idle.joints.hand_l.y);
    expect(carrying.joints.hand_r.y).not.toBe(idle.joints.hand_r.y);
    // Facing South projects forward stride onto the screen Y axis, not X.
    expect(pose('sprint',1,6).joints.foot_r.y).not.toBe(
      pose('sneak',1,6).joints.foot_r.y);
  });

  it('emits frame-specific profession, combat and magical events and returns to sprint', () => {
    const asm = new AnimationStateMachine();
    const events: string[] = [];
    asm.onEvent(e => events.push(e.eventId));
    expect(asm.requestState('sprint')).toBe(true);
    expect(asm.requestState('heavy_attack')).toBe(true);
    asm.update(700);
    expect(events).toContain('heavy_attack_cleave');
    expect(asm.getSnapshot().action).toBe('sprint');
    expect(asm.requestState('mining')).toBe(true);
    asm.update(600);
    expect(events).toContain('mine_pick_impact');
    expect(asm.requestState('casting_spells')).toBe(true);
    asm.update(600);
    expect(events).toContain('spell_cast_release');
    expect(asm.getSnapshot().action).toBe('sprint');
    expect(asm.requestState('dodge')).toBe(true);
    expect(events).toContain('dodge_iframe_start');
  });

  it('retains legacy animation events and non-interruptible priorities', () => {
    const asm = new AnimationStateMachine();
    const events: string[] = [];
    asm.onEvent(e => events.push(e.eventId));
    expect(asm.requestState('walk')).toBe(true);
    expect(asm.requestState('attack')).toBe(true);
    expect(asm.requestState('walk')).toBe(false);
    asm.update(500);
    expect(events).toContain('attack_hit');
    expect(asm.getSnapshot().action).toBe('walk');
  });

  it('compiles mixed survival and combat spritesheets with exact action event metadata', () => {
    const sheet = compiler.compileCharacterSheet(
      DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, p4,
      ['sprint','heavy_attack','mining','swimming'], ['S','E','N','W']);
    expect(Object.keys(sheet.metadata.sequenceOrder)).toHaveLength(16);
    const key = DEFAULT_HERO_APPEARANCE.entityId + '::heavy_attack::S::f3';
    expect(sheet.metadata.frames[key].events).toContain('heavy_attack_cleave');
    const swim = DEFAULT_HERO_APPEARANCE.entityId + '::swimming::E::f1';
    expect(sheet.metadata.frames[swim].events).toContain('swim_stroke');
  });
});
