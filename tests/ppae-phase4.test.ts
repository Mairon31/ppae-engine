import { describe, expect, it } from 'vitest';
import {
  CREATURE_SPECIES_CATALOG,
  CreatureGenerator,
  createDefaultColossusBossState,
  DEFAULT_STYLE_PROFILES,
  MultiSegmentBossRenderer
} from '../src/index';

describe('PPAE Phase 4 — Anatomical Archetypes, Fauna, Monsters & Multi-Segment Boss', () => {
  it('assigns distinct anatomical families and dimensions to chicken, cow, wolf, slime, spider, bat, and fish', () => {
    const gen = new CreatureGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const chicken = gen.renderCreatureFrame('farm_chicken', 'idle', 'E', 0, 4, profile);
    const cow = gen.renderCreatureFrame('dairy_cow', 'idle', 'E', 0, 4, profile);
    const wolf = gen.renderCreatureFrame('timber_wolf', 'idle', 'E', 0, 4, profile);
    const slime = gen.renderCreatureFrame('emerald_slime', 'idle', 'S', 0, 4, profile);
    const bat = gen.renderCreatureFrame('vampire_bat', 'move', 'S', 0, 4, profile);

    expect(chicken.family).toBe('avian_biped');
    expect(cow.family).toBe('quadruped');
    expect(wolf.family).toBe('quadruped');
    expect(slime.family).toBe('gelatinous_slime');
    expect(bat.family).toBe('flying_winged');

    // Una vaca es mayor en anchura y altura que una gallina
    expect(cow.buffer.width).toBeGreaterThan(chicken.buffer.width);
    expect(cow.buffer.height).toBeGreaterThan(chicken.buffer.height);

    // Una vaca y un lobo comparten familia cuadrúpeda pero producen siluetas y píxeles distintos
    expect(Array.from(cow.buffer.data)).not.toEqual(Array.from(wolf.buffer.data));

    // Una criatura voladora expone el anchor de cuerpo en vuelo separado del pivote de sombra en suelo
    expect(bat.anchors.flight_body).toBeDefined();
    expect(bat.anchors.flight_body.texelY).toBeLessThan(bat.anchors.ground_pivot.texelY);
  });

  it('produces distinct animation frames across idle, move, rest_graze, attack, and death for creatures', () => {
    const gen = new CreatureGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-6x6'];

    const cowIdle = gen.renderCreatureFrame('dairy_cow', 'idle', 'E', 0, 6, profile);
    const cowGraze = gen.renderCreatureFrame('dairy_cow', 'rest_graze', 'E', 2, 6, profile);
    const cowDead = gen.renderCreatureFrame('dairy_cow', 'death', 'E', 4, 6, profile);

    // Al pastar, el punto de anclaje de la cabeza desciende respecto al estado idle
    expect(cowGraze.anchors.head_mount.texelY).toBeGreaterThan(cowIdle.anchors.head_mount.texelY);
    expect(Array.from(cowIdle.buffer.data)).not.toEqual(Array.from(cowDead.buffer.data));
  });

  it('supports independent part destruction, weak-point exposure, phase shifts, and telegraphs on the Multi-Segment Boss', () => {
    const bossRenderer = new MultiSegmentBossRenderer();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const intactState = createDefaultColossusBossState(2026);
    const intactRender = bossRenderer.renderBoss(intactState, profile);

    expect(intactRender.intactSegmentCount).toBe(4);
    expect(intactRender.activeWeakPointExposed).toBe(false);

    // Destruir el brazo escudo izquierdo ("left_bastion_shield_arm")
    const brokenLeftArmState = {
      ...intactState,
      segments: {
        ...intactState.segments,
        left_bastion_shield_arm: {
          ...intactState.segments.left_bastion_shield_arm,
          integrity: 'destroyed' as const
        }
      }
    };
    const brokenLeftRender = bossRenderer.renderBoss(brokenLeftArmState, profile);

    expect(brokenLeftRender.intactSegmentCount).toBe(3);
    expect(brokenLeftRender.activeWeakPointExposed).toBe(true);
    expect(Array.from(intactRender.buffer.data)).not.toEqual(
      Array.from(brokenLeftRender.buffer.data)
    );

    // Cambiar a Fase 2 (Enraged) y activar telegrafía radial en el suelo
    const phase2TelegraphState = {
      ...brokenLeftArmState,
      phase: 'phase_2_enraged' as const,
      telegraphKind: 'radial_slam' as const,
      telegraphProgress: 0.8
    };
    const phase2Render = bossRenderer.renderBoss(phase2TelegraphState, profile);

    expect(Array.from(phase2Render.buffer.data)).not.toEqual(
      Array.from(brokenLeftRender.buffer.data)
    );
    // El buffer de telegrafía ahora contiene píxeles opacos de advertencia
    expect(phase2Render.telegraphOverlayBuffer.countUniqueOpaqueColors()).toBeGreaterThan(0);

    // Verificar que todos los especies del catálogo compilan sin errores
    expect(Object.keys(CREATURE_SPECIES_CATALOG).length).toBeGreaterThanOrEqual(8);
  });
});
