import { describe, expect, it } from 'vitest';
import {
  ALL_DIRECTIONS_8,
  AnimationStateMachine,
  CharacterAvatarGenerator,
  DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT,
  DEFAULT_STYLE_PROFILES,
  ProceduralCharacterRig,
  resolveDirection8FromVector,
  SpritesheetCompiler
} from '../src/index';

describe('PPAE Phase 3 — Character Anatomy, 8-Direction Rigging, ASM & Spritesheet Compiler', () => {
  it('resolves all 8 cardinal and diagonal directions accurately from movement vectors', () => {
    expect(resolveDirection8FromVector(0, 1)).toBe('S');
    expect(resolveDirection8FromVector(1, 1)).toBe('SE');
    expect(resolveDirection8FromVector(1, 0)).toBe('E');
    expect(resolveDirection8FromVector(1, -1)).toBe('NE');
    expect(resolveDirection8FromVector(0, -1)).toBe('N');
    expect(resolveDirection8FromVector(-1, -1)).toBe('NW');
    expect(resolveDirection8FromVector(-1, 0)).toBe('W');
    expect(resolveDirection8FromVector(-1, 1)).toBe('SW');
  });

  it('preserves anatomical asymmetry across East and West directions instead of blindly flipping bitmaps', () => {
    const rig = new ProceduralCharacterRig();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const poseEast = rig.evaluatePose(DEFAULT_HERO_APPEARANCE, 'idle', 'E', 0, 4, profile);
    const poseWest = rig.evaluatePose(DEFAULT_HERO_APPEARANCE, 'idle', 'W', 0, 4, profile);

    // En vista Este (mirando a +X), el brazo derecho anatómico está más cerca de la cámara (+Y -> mayor zOrder)
    expect(poseEast.joints.hand_r.zOrder).toBeGreaterThan(poseEast.joints.hand_l.zOrder);

    // En vista Oeste (mirando a -X), el brazo derecho anatómico pasa detrás del torso (menor zOrder que el brazo izquierdo)
    expect(poseWest.joints.hand_r.zOrder).toBeLessThan(poseWest.joints.hand_l.zOrder);

    // En vista Sur vs Norte, la posición horizontal del brazo derecho se invierte correctamente en pantalla
    const poseSouth = rig.evaluatePose(DEFAULT_HERO_APPEARANCE, 'idle', 'S', 0, 4, profile);
    const poseNorth = rig.evaluatePose(DEFAULT_HERO_APPEARANCE, 'idle', 'N', 0, 4, profile);
    expect(poseSouth.joints.hand_r.x).toBeLessThan(0);
    expect(poseNorth.joints.hand_r.x).toBeGreaterThan(0);
  });

  it('enforces state priorities, non-interruptible combat clips, and emits frame events in ASM', () => {
    const asm = new AnimationStateMachine();
    const emittedEvents: string[] = [];
    asm.onEvent((ev) => emittedEvents.push(ev.eventId));

    // Transición de idle a walk (permitida)
    expect(asm.requestState('walk')).toBe(true);
    expect(asm.getSnapshot().action).toBe('walk');

    // Iniciar ataque (prioridad 50 > walk 20, no interrumpible)
    expect(asm.requestState('attack')).toBe(true);
    expect(asm.getSnapshot().action).toBe('attack');

    // Intentar volver a walk en mitad del ataque debe ser rechazado por prioridad/no-interrumpibilidad
    expect(asm.requestState('walk')).toBe(false);
    expect(asm.getSnapshot().action).toBe('attack');

    // Avanzar el tiempo durante todo el clip de ataque (5 frames * 90ms = 450ms)
    asm.update(500);

    // Debe haber emitido el evento de impacto ('attack_hit') en el frame 2 y 'clip_complete' al terminar
    expect(emittedEvents).toContain('attack_hit');
    expect(emittedEvents).toContain('clip_complete');

    // Al finalizar el ataque, retorna automáticamente al estado de locomoción previo ('walk')
    expect(asm.getSnapshot().action).toBe('walk');

    // Un evento de muerte (prioridad 100) interrumpe cualquier estado y bloquea el frame final
    expect(asm.requestState('death')).toBe(true);
    asm.update(1000);
    expect(asm.getSnapshot().isFinished).toBe(true);
    expect(emittedEvents).toContain('death_collapse');
  });

  it('compiles 8-directional spritesheets with padding, valid anchors, and deterministic pixels', () => {
    const compiler = new SpritesheetCompiler();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const sheetA = compiler.compileCharacterSheet(
      DEFAULT_HERO_APPEARANCE,
      DEFAULT_HERO_EQUIPMENT,
      profile,
      ['idle', 'attack'],
      ALL_DIRECTIONS_8
    );

    const sheetB = compiler.compileCharacterSheet(
      DEFAULT_HERO_APPEARANCE,
      DEFAULT_HERO_EQUIPMENT,
      profile,
      ['idle', 'attack'],
      ALL_DIRECTIONS_8
    );

    // Determinismo exacto del atlas compilado
    expect(Array.from(sheetA.atlasBuffer.data)).toEqual(Array.from(sheetB.atlasBuffer.data));

    // 2 acciones * 8 direcciones = 16 secuencias registradas
    expect(Object.keys(sheetA.metadata.sequenceOrder).length).toBe(16);

    // (4 frames de idle + 5 frames de attack) * 8 direcciones = 72 frames totales en metadatos
    expect(Object.keys(sheetA.metadata.frames).length).toBe(72);

    // Verificar que el frame de impacto de ataque contiene el evento 'attack_hit' y anchors válidos
    const strikeFrameKey = `${DEFAULT_HERO_APPEARANCE.entityId}::attack::SE::f2`;
    const strikeMeta = sheetA.metadata.frames[strikeFrameKey];
    expect(strikeMeta).toBeDefined();
    expect(strikeMeta.events).toContain('attack_hit');
    expect(strikeMeta.anchors.main_hand).toBeDefined();
    expect(strikeMeta.anchors.ground_pivot).toBeDefined();
  });

  it('updates character equipment layer without altering anatomical anchors', () => {
    const gen = new CharacterAvatarGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-6x6'];

    const swordRender = gen.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,
      DEFAULT_HERO_EQUIPMENT,
      'idle',
      'S',
      0,
      4,
      profile
    );

    const axeRender = gen.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,
      { ...DEFAULT_HERO_EQUIPMENT, mainHand: 'woodcutter_axe', helmet: 'knight_helm' },
      'idle',
      'S',
      0,
      4,
      profile
    );

    // Los píxeles cambian al equipar casco y hacha, pero los anchors anatómicos permanecen idénticos
    expect(Array.from(swordRender.buffer.data)).not.toEqual(Array.from(axeRender.buffer.data));
    expect(swordRender.anchors.main_hand).toEqual(axeRender.anchors.main_hand);
    expect(swordRender.pivotTexel).toEqual(axeRender.pivotTexel);
  });
});
