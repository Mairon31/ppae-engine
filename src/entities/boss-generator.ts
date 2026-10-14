import {
  AnchorPoint,
  ArtStyleProfile,
  BossPhaseId,
  BossSegmentId,
  BossSegmentIntegrity,
  BossVisualState,
  PPAE_SCHEMA_VERSION
} from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export interface RenderedBossArtifact {
  readonly buffer: PixelBuffer;
  readonly telegraphOverlayBuffer: PixelBuffer;
  readonly pivotTexel: readonly [number, number];
  readonly segmentAnchors: Readonly<Record<BossSegmentId, AnchorPoint>>;
  readonly activeWeakPointExposed: boolean;
  readonly intactSegmentCount: number;
}

/**
 * Crea el estado inicial canónico del primer jefe multisegmento:
 * "Coloso de Obsidiana y Cristal" (Ancient Crystal Colossus).
 */
export function createDefaultColossusBossState(seed = 2026): BossVisualState {
  return {
    schemaVersion: PPAE_SCHEMA_VERSION,
    bossId: 'ancient_crystal_colossus',
    seed,
    phase: 'phase_1_dormant',
    action: 'idle_float',
    direction: 'S',
    frameIndex: 0,
    totalFrames: 6,
    deathStage: 'alive',
    telegraphKind: 'none',
    telegraphProgress: 0,
    segments: {
      core_monolith: {
        segmentId: 'core_monolith',
        integrity: 'intact',
        isWeakPoint: false,
        localHitbox: { offsetX: -16, offsetY: -18, width: 32, height: 28, collidable: true }
      },
      dorsal_weakpoint_crystal: {
        segmentId: 'dorsal_weakpoint_crystal',
        integrity: 'intact',
        isWeakPoint: true,
        localHitbox: { offsetX: -8, offsetY: -34, width: 16, height: 14, collidable: true }
      },
      left_bastion_shield_arm: {
        segmentId: 'left_bastion_shield_arm',
        integrity: 'intact',
        isWeakPoint: false,
        localHitbox: { offsetX: -34, offsetY: -16, width: 14, height: 22, collidable: true }
      },
      right_crusher_hammer_arm: {
        segmentId: 'right_crusher_hammer_arm',
        integrity: 'intact',
        isWeakPoint: false,
        localHitbox: { offsetX: 20, offsetY: -16, width: 14, height: 22, collidable: true }
      }
    }
  };
}

/**
 * Segundo arquetipo. Reutiliza los contratos de destrucción por segmento,
 * pero su silueta combina tronco, cornamenta de ramas y garras radicales.
 */
export function createCorruptedTreantBossState(seed = 2026): BossVisualState {
  const base = createDefaultColossusBossState(seed);
  return { ...base, bossId: 'corrupted_forest_treant_lord' };
}

/**
 * Renderizador de Jefes Multisegmento:
 * - Cada segmento se articula y destruye de forma independiente.
 * - La paleta de energía cambia dinámicamente según la fase (`phase_1`, `phase_2`, `phase_3`).
 * - Genera un buffer separado de telegrafía en suelo para avisos de ataque.
 */
export class MultiSegmentBossRenderer {
  public renderBoss(state: BossVisualState, profile: ArtStyleProfile): RenderedBossArtifact {
    const mod = profile.moduleSize;
    const width = 16 * mod;  // 64px en 4x4, 96px en 6x6
    const height = 14 * mod; // 56px en 4x4, 84px en 6x6
    const buf = new PixelBuffer(width, height);
    const telegraphBuf = new PixelBuffer(width, height);

    const u = mod / 4;
    const isTreantLord = state.bossId === 'corrupted_forest_treant_lord';
    const pivotX = Math.floor(width / 2);
    const pivotY = height - Math.round(6 * u);

    const phaseAngle = ((state.frameIndex % Math.max(1, state.totalFrames)) / Math.max(1, state.totalFrames)) * Math.PI * 2;
    const speedFactor = state.phase === 'phase_3_critical' ? 2.0 : state.phase === 'phase_2_enraged' ? 1.4 : 1.0;
    const hoverY =
      state.deathStage === 'stage_3_monolith_collapse'
        ? Math.round(6 * u)
        : Math.round(Math.sin(phaseAngle * speedFactor) * 2.5 * u);

    // Paleta cromática de energía reactiva a la fase del jefe
    const energyColors = this.resolvePhaseColors(state.phase, isTreantLord);
    const stoneDark = hexToRgba(isTreantLord ? '#26150e' : '#1e293b');
    const stoneMid = hexToRgba(isTreantLord ? '#4d2b1b' : '#334155');
    const stoneHigh = hexToRgba(isTreantLord ? '#784730' : '#64748b');
    const outlineCol = hexToRgba('#090d16');

    // 1. Renderizar indicador telegráfico de ataque en la capa de suelo (si está activo)
    if (state.telegraphKind !== 'none' && state.telegraphProgress > 0) {
      this.renderTelegraphZone(telegraphBuf, pivotX, pivotY, state.telegraphKind, state.telegraphProgress, u);
    }

    // Sombra masiva en suelo
    buf.fillEllipse(pivotX, pivotY + 2, Math.round(18 * u), Math.round(5 * u), { r: 10, g: 15, b: 30, a: 135 });

    const coreCenterX = pivotX;
    const coreCenterY = pivotY - Math.round(18 * u) + hoverY;

    // 2. Segmento 1: Monolito Central (`core_monolith`)
    const coreRx = Math.round(10 * u);
    const coreRy = Math.round(12 * u);
    buf.fillEllipse(coreCenterX, coreCenterY + 1, coreRx, coreRy, stoneDark);
    buf.fillEllipse(coreCenterX, coreCenterY, coreRx - 2, coreRy - 2, stoneMid);
    buf.fillRect(
      coreCenterX - Math.round(5 * u),
      coreCenterY - Math.round(7 * u),
      Math.round(10 * u),
      Math.round(4 * u),
      stoneHigh
    );

    // Runas luminosas y grietas según integridad y fase
    buf.fillRect(
      coreCenterX - Math.round(3 * u),
      coreCenterY - Math.round(2 * u),
      Math.round(6 * u),
      Math.round(3 * u),
      energyColors.glow
    );
    if (state.segments.core_monolith.integrity !== 'intact' || state.phase === 'phase_3_critical') {
      buf.drawLine(
        coreCenterX - Math.round(6 * u),
        coreCenterY - Math.round(6 * u),
        coreCenterX + Math.round(5 * u),
        coreCenterY + Math.round(6 * u),
        energyColors.core,
        2
      );
    }

    // 3. Segmento 2: Aguja Dorsal de Cristal — Punto Débil (`dorsal_weakpoint_crystal`)
    const crystalSeg = state.segments.dorsal_weakpoint_crystal;
    const crystalX = coreCenterX;
    const crystalY = coreCenterY - coreRy - Math.round(3 * u);

    if (crystalSeg.integrity !== 'destroyed' && state.deathStage !== 'stage_3_monolith_collapse') {
      const spireW = Math.round(4.5 * u);
      const spireH = crystalSeg.integrity === 'cracked' ? Math.round(5 * u) : Math.round(8 * u);
      buf.fillEllipse(crystalX, crystalY, spireW, spireH, energyColors.mid);
      buf.fillEllipse(crystalX - 1, crystalY - 1, Math.max(2, spireW - 2), Math.max(2, spireH - 2), energyColors.glow);
      buf.setPixel(crystalX, crystalY - spireH + 1, energyColors.core);
    } else {
      // Base rota humeante cuando se destruye el cristal
      buf.fillRect(crystalX - Math.round(3 * u), crystalY + 2, Math.round(6 * u), Math.round(2 * u), stoneDark);
    }

    // 4. Segmento 3: Brazo Escudo Bastión Izquierdo (`left_bastion_shield_arm`)
    const leftArmSeg = state.segments.left_bastion_shield_arm;
    const leftArmX = coreCenterX - Math.round(16 * u);
    const leftArmY =
      coreCenterY +
      Math.round(2 * u) +
      Math.round(Math.cos(phaseAngle) * 2 * u);

    this.drawBossArmSegment(
      buf,
      leftArmX,
      leftArmY,
      leftArmSeg.integrity,
      state.deathStage,
      'shield',
      u,
      stoneDark,
      stoneMid,
      stoneHigh,
      energyColors.mid
    );

    // 5. Segmento 4: Brazo Martillo Triturador Derecho (`right_crusher_hammer_arm`)
    const rightArmSeg = state.segments.right_crusher_hammer_arm;
    const slamOffset =
      state.action === 'crusher_slam'
        ? Math.round(Math.sin(phaseAngle) * 8 * u)
        : Math.round(-Math.cos(phaseAngle) * 2 * u);
    const rightArmX = coreCenterX + Math.round(16 * u);
    const rightArmY = coreCenterY + Math.round(2 * u) + slamOffset;

    this.drawBossArmSegment(
      buf,
      rightArmX,
      rightArmY,
      rightArmSeg.integrity,
      state.deathStage,
      'hammer',
      u,
      stoneDark,
      stoneMid,
      stoneHigh,
      energyColors.mid
    );

    if (isTreantLord) {
      this.drawTreantAnatomy(buf, state, coreCenterX, coreCenterY,
        coreRx, coreRy, leftArmX, leftArmY, rightArmX, rightArmY,
        pivotY, u, stoneDark, stoneMid, stoneHigh, energyColors.glow);
    }

    buf.applySelectiveOutline(outlineCol);

    // Contar segmentos intactos y exponer punto débil cuando al menos un brazo cae o está en fase 2/3
    const intactSegmentCount = Object.values(state.segments).filter(
      (s) => s.integrity !== 'destroyed'
    ).length;

    const activeWeakPointExposed =
      crystalSeg.integrity !== 'destroyed' &&
      (leftArmSeg.integrity === 'destroyed' ||
        rightArmSeg.integrity === 'destroyed' ||
        state.phase !== 'phase_1_dormant');

    return {
      buffer: buf,
      telegraphOverlayBuffer: telegraphBuf,
      pivotTexel: [pivotX, pivotY],
      activeWeakPointExposed,
      intactSegmentCount,
      segmentAnchors: {
        core_monolith: {
          id: 'core_monolith',
          texelX: coreCenterX,
          texelY: coreCenterY,
          normalizedX: coreCenterX / width,
          normalizedY: coreCenterY / height
        },
        dorsal_weakpoint_crystal: {
          id: 'dorsal_weakpoint_crystal',
          texelX: crystalX,
          texelY: crystalY,
          normalizedX: crystalX / width,
          normalizedY: crystalY / height
        },
        left_bastion_shield_arm: {
          id: 'left_bastion_shield_arm',
          texelX: leftArmX,
          texelY: leftArmY,
          normalizedX: leftArmX / width,
          normalizedY: leftArmY / height
        },
        right_crusher_hammer_arm: {
          id: 'right_crusher_hammer_arm',
          texelX: rightArmX,
          texelY: rightArmY,
          normalizedX: rightArmX / width,
          normalizedY: rightArmY / height
        }
      }
    };
  }

  /**
   * Corrupted Treant silhouette: bark striations, twisted boughs, thorn tips
   * and split root claws. Respect segment health so destroyed arms remain absent.
   */
  private drawTreantAnatomy(
    buf: PixelBuffer, state: BossVisualState,
    cx: number, cy: number, rx: number, ry: number,
    leftX: number, leftY: number, rightX: number, rightY: number,
    groundY: number, u: number,
    barkDark: ReturnType<typeof hexToRgba>,
    barkMid: ReturnType<typeof hexToRgba>,
    barkHigh: ReturnType<typeof hexToRgba>,
    corruptedLight: ReturnType<typeof hexToRgba>
  ): void {
    const th = Math.max(1, Math.round(1.2 * u));
    // Roots remain attached to the standing core and fork toward the ground.
    if (state.deathStage !== 'stage_3_monolith_collapse') {
      for (const side of [-1, 1]) {
        const x0 = cx + side * Math.round(rx * .4);
        const x1 = cx + side * Math.round(8 * u);
        const y0 = cy + Math.round(7 * u);
        const y1 = groundY - Math.round(2 * u);
        buf.drawLine(x0, y0, x1, y1, barkMid, Math.max(2, Math.round(2 * u)));
        buf.drawLine(x1, y1, x1 + side * Math.round(5 * u), groundY, barkDark, th);
        buf.drawLine(x1, y1, x1 - side * Math.round(2 * u), groundY, barkHigh, th);
      }
      // A split-vine crest, deliberately unlike the Colossus crystal needle.
      for (const side of [-1, 1]) {
        const rootX = cx + side * Math.round(4 * u);
        const baseY = cy - Math.round(7 * u);
        const forkX = cx + side * Math.round(12 * u);
        const forkY = cy - ry - Math.round(5 * u);
        buf.drawLine(rootX, baseY, forkX, forkY, barkDark, Math.max(1, Math.round(1.8 * u)));
        buf.drawLine(forkX, forkY, forkX + side * Math.round(3 * u),
          forkY - Math.round(4 * u), barkMid, th);
        buf.drawLine(forkX, forkY, forkX - side * Math.round(2 * u),
          forkY - Math.round(5 * u), barkHigh, th);
      }
    }
    // Creased bark follows the monolith and exposes the purple core.
    for (let strip = -2; strip <= 2; strip++) {
      const x = cx + strip * Math.round(2 * u);
      buf.drawLine(x, cy - Math.round(7 * u),
        x + Math.round(Math.sin(strip * 2) * u),
        cy + Math.round(6 * u), strip % 2 ? barkDark : barkHigh, th);
    }
    buf.fillEllipse(cx, cy, Math.max(1, Math.round(2.2 * u)),
      Math.max(1, Math.round(2 * u)), corruptedLight);
    // When arms survive, branch thorns and hooked claws are attached to them.
    for (const [id, ax, ay, side] of [
      ['left_bastion_shield_arm', leftX, leftY, -1],
      ['right_crusher_hammer_arm', rightX, rightY, 1]
    ] as const) {
      if (state.segments[id].integrity === 'destroyed') continue;
      if (state.deathStage !== 'alive') continue;
      const upperY = ay - Math.round(5 * u);
      buf.drawLine(ax, upperY, ax + side * Math.round(4 * u),
        upperY - Math.round(4 * u), barkHigh, th);
      buf.drawLine(ax, ay + Math.round(4 * u), ax + side * Math.round(3 * u),
        ay + Math.round(8 * u), barkDark, th);
      buf.drawLine(ax, ay + Math.round(4 * u), ax - side * Math.round(2 * u),
        ay + Math.round(8 * u), barkDark, th);
    }
  }

  private drawBossArmSegment(
    buf: PixelBuffer,
    cx: number,
    cy: number,
    integrity: BossSegmentIntegrity,
    deathStage: BossVisualState['deathStage'],
    armKind: 'shield' | 'hammer',
    u: number,
    stoneDark: ReturnType<typeof hexToRgba>,
    stoneMid: ReturnType<typeof hexToRgba>,
    stoneHigh: ReturnType<typeof hexToRgba>,
    energyColor: ReturnType<typeof hexToRgba>
  ): void {
    if (
      integrity === 'destroyed' ||
      deathStage === 'stage_1_arms_shatter' ||
      deathStage === 'stage_2_core_overload' ||
      deathStage === 'stage_3_monolith_collapse'
    ) {
      // Hombro fracturado residual (muñón de piedra)
      buf.fillEllipse(cx, cy - Math.round(4 * u), Math.round(3 * u), Math.round(2.5 * u), stoneDark);
      return;
    }

    const armW = armKind === 'shield' ? Math.round(7 * u) : Math.round(6 * u);
    const armH = armKind === 'shield' ? Math.round(14 * u) : Math.round(12 * u);

    buf.fillRect(cx - Math.floor(armW / 2), cy - Math.floor(armH / 2), armW, armH, stoneDark);
    buf.fillRect(cx - Math.floor(armW / 2) + 1, cy - Math.floor(armH / 2) + 1, armW - 2, armH - 2, stoneMid);
    buf.fillRect(cx - Math.floor(armW / 2) + 1, cy - Math.floor(armH / 2) + 1, armW - 3, Math.round(3 * u), stoneHigh);

    // Núcleo energético del brazo
    buf.fillRect(cx - 1, cy - 1, Math.round(2.5 * u), Math.round(3 * u), energyColor);

    if (integrity === 'cracked') {
      buf.drawLine(cx - 2, cy - 4, cx + 2, cy + 4, energyColor, 1);
    }
  }

  private renderTelegraphZone(
    telegraphBuf: PixelBuffer,
    pivotX: number,
    pivotY: number,
    kind: BossVisualState['telegraphKind'],
    progress: number,
    u: number
  ): void {
    const clamped = Math.max(0, Math.min(1, progress));
    const borderCol = hexToRgba('#ef4444', 230);
    const fillCol = hexToRgba('#f97316', 110);

    if (kind === 'radial_slam') {
      const maxRx = Math.round(24 * u);
      const maxRy = Math.round(8 * u);
      const curRx = Math.max(2, Math.round(maxRx * clamped));
      const curRy = Math.max(1, Math.round(maxRy * clamped));
      telegraphBuf.fillEllipse(pivotX, pivotY, maxRx, maxRy, fillCol);
      telegraphBuf.fillEllipse(pivotX, pivotY, curRx, curRy, borderCol);
    } else if (kind === 'frontal_cleave') {
      const boxW = Math.round(36 * u);
      const boxH = Math.round(10 * u);
      telegraphBuf.fillRect(pivotX - Math.floor(boxW / 2), pivotY - 2, boxW, boxH, fillCol);
      telegraphBuf.fillRect(
        pivotX - Math.floor((boxW * clamped) / 2),
        pivotY,
        Math.round(boxW * clamped),
        Math.round(3 * u),
        borderCol
      );
    } else if (kind === 'cross_laser') {
      telegraphBuf.drawLine(4, pivotY, telegraphBuf.width - 4, pivotY, borderCol, Math.max(2, Math.round(2 * u)));
      telegraphBuf.drawLine(pivotX, 8, pivotX, telegraphBuf.height - 4, borderCol, Math.max(2, Math.round(2 * u)));
    }
  }

  private resolvePhaseColors(phase: BossPhaseId, isTreantLord = false) {
    if (isTreantLord) {
      if (phase === 'phase_1_dormant') {
        return { mid: hexToRgba('#7e22ce'), glow: hexToRgba('#c084fc'), core: hexToRgba('#f3e8ff') };
      }
      if (phase === 'phase_2_enraged') {
        return { mid: hexToRgba('#a21caf'), glow: hexToRgba('#f0abfc'), core: hexToRgba('#fdf4ff') };
      }
      return { mid: hexToRgba('#be123c'), glow: hexToRgba('#fb7185'), core: hexToRgba('#ffe4e6') };
    }
    switch (phase) {
      case 'phase_1_dormant':
        return {
          mid: hexToRgba('#0284c7'),
          glow: hexToRgba('#38bdf8'),
          core: hexToRgba('#e0f2fe')
        };
      case 'phase_2_enraged':
        return {
          mid: hexToRgba('#d97706'),
          glow: hexToRgba('#fbbf24'),
          core: hexToRgba('#fef9c3')
        };
      case 'phase_3_critical':
        return {
          mid: hexToRgba('#be123c'),
          glow: hexToRgba('#fb7185'),
          core: hexToRgba('#ffe4e6')
        };
    }
  }
}
