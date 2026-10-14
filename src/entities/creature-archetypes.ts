import {
  AnchorPoint,
  ArtStyleProfile,
  CreatureActionId,
  CreatureSpeciesId,
  CreatureSpeciesProfile,
  Direction8,
  PPAE_SCHEMA_VERSION
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { direction8ToUnitVector } from './character-rig';

export const CREATURE_SPECIES_CATALOG: Readonly<Record<CreatureSpeciesId, CreatureSpeciesProfile>> = {
  dairy_cow: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'dairy_cow',
    family: 'quadruped',
    isHostile: false,
    widthModules: 7,
    heightModules: 6,
    primaryHex: '#f1f5f9',
    shadowHex: '#cbd5e1',
    highlightHex: '#ffffff',
    secondaryHex: '#334155', // Manchas oscuras
    accentHex: '#f472b6',    // Morro y ubre rosada
    outlineHex: '#1e293b',
    features: {
      hasHorns: true,
      hasSpots: true,
      hasUdder: true,
      legPairs: 2
    },
    logicalHitbox: { offsetX: -10, offsetY: -6, width: 20, height: 12, collidable: true }
  },
  meadow_sheep: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'meadow_sheep',
    family: 'quadruped',
    isHostile: false,
    widthModules: 6,
    heightModules: 5,
    primaryHex: '#f8fafc',
    shadowHex: '#cbd5e1',
    highlightHex: '#ffffff',
    secondaryHex: '#475569',
    accentHex: '#94a3b8',
    outlineHex: '#1e293b',
    features: {
      hasHorns: false,
      hasSpots: false,
      legPairs: 2
    },
    logicalHitbox: { offsetX: -8, offsetY: -5, width: 16, height: 10, collidable: true }
  },
  timber_wolf: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'timber_wolf',
    family: 'quadruped',
    isHostile: true,
    widthModules: 7,
    heightModules: 5,
    primaryHex: '#64748b',
    shadowHex: '#334155',
    highlightHex: '#94a3b8',
    secondaryHex: '#cbd5e1',
    accentHex: '#ef4444', // Ojos de depredador
    outlineHex: '#0f172a',
    features: {
      hasPointedEars: true,
      hasBushyTail: true,
      legPairs: 2
    },
    logicalHitbox: { offsetX: -9, offsetY: -5, width: 18, height: 10, collidable: true }
  },
  farm_chicken: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'farm_chicken',
    family: 'avian_biped',
    isHostile: false,
    widthModules: 4,
    heightModules: 4,
    primaryHex: '#fef3c7',
    shadowHex: '#fde68a',
    highlightHex: '#ffffff',
    secondaryHex: '#dc2626', // Cresta roja
    accentHex: '#f59e0b',    // Pico y patas
    outlineHex: '#292524',
    features: {
      hasCombAndWattle: true,
      legPairs: 1
    },
    logicalHitbox: { offsetX: -4, offsetY: -3, width: 8, height: 6, collidable: true }
  },
  emerald_slime: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'emerald_slime',
    family: 'gelatinous_slime',
    isHostile: true,
    widthModules: 5,
    heightModules: 4,
    primaryHex: '#22c55e',
    shadowHex: '#15803d',
    highlightHex: '#86efac',
    secondaryHex: '#065f46', // Núcleo interno
    accentHex: '#f0fdf4',    // Brillo especular
    outlineHex: '#052e16',
    features: {
      hasTranslucentCore: true
    },
    logicalHitbox: { offsetX: -6, offsetY: -4, width: 12, height: 8, collidable: true }
  },
  cave_spider: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'cave_spider',
    family: 'arachnid',
    isHostile: true,
    widthModules: 6,
    heightModules: 5,
    primaryHex: '#312e81',
    shadowHex: '#1e1b4b',
    highlightHex: '#4f46e5',
    secondaryHex: '#dc2626', // Ojos múltiples y marcas dorsales
    accentHex: '#f8fafc',    // Quelíceros
    outlineHex: '#090d16',
    features: {
      legPairs: 4
    },
    logicalHitbox: { offsetX: -8, offsetY: -6, width: 16, height: 12, collidable: true }
  },
  vampire_bat: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'vampire_bat',
    family: 'flying_winged',
    isHostile: true,
    widthModules: 6,
    heightModules: 5,
    primaryHex: '#4c1d95',
    shadowHex: '#2e1065',
    highlightHex: '#7c3aed',
    secondaryHex: '#f43f5e',
    accentHex: '#fde047',
    outlineHex: '#170936',
    features: {
      defaultFlightAltitudeTexels: 8
    },
    logicalHitbox: { offsetX: -6, offsetY: -4, width: 12, height: 8, collidable: false }
  },
  river_trout: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    speciesId: 'river_trout',
    family: 'aquatic_swimmer',
    isHostile: false,
    widthModules: 5,
    heightModules: 4,
    primaryHex: '#0284c7',
    shadowHex: '#0369a1',
    highlightHex: '#7dd3fc',
    secondaryHex: '#f43f5e', // Línea lateral salmón
    accentHex: '#e0f2fe',
    outlineHex: '#0c4a6e',
    features: {},
    logicalHitbox: { offsetX: -5, offsetY: -3, width: 10, height: 6, collidable: false }
  }
};

export interface RenderedCreatureFrame {
  readonly speciesId: CreatureSpeciesId;
  readonly family: CreatureSpeciesProfile['family'];
  readonly action: CreatureActionId;
  readonly direction: Direction8;
  readonly frameIndex: number;
  readonly buffer: PixelBuffer;
  readonly pivotTexel: readonly [number, number];
  readonly anchors: Readonly<Record<string, AnchorPoint>>;
}

/**
 * Generador procedural de fauna y monstruos con rigs anatómicos diferenciados por familia.
 */
export class CreatureGenerator {
  public renderCreatureFrame(
    speciesId: CreatureSpeciesId,
    action: CreatureActionId,
    direction: Direction8,
    frameIndex: number,
    totalFrames: number,
    profile: ArtStyleProfile,
    variantSeed = 101
  ): RenderedCreatureFrame {
    const spec = CREATURE_SPECIES_CATALOG[speciesId];
    const mod = profile.moduleSize;
    const width = spec.widthModules * mod;
    const height = spec.heightModules * mod;
    const buf = new PixelBuffer(width, height);
    const rng = new SeededRNG(variantSeed);

    const pivotX = Math.floor(width / 2);
    const pivotY = height - Math.max(2, Math.floor(mod * 0.65));

    switch (spec.family) {
      case 'quadruped':
        return this.solveQuadruped(buf, spec, action, direction, frameIndex, totalFrames, profile, rng, pivotX, pivotY);
      case 'avian_biped':
        return this.solveAvianBiped(buf, spec, action, direction, frameIndex, totalFrames, profile, pivotX, pivotY);
      case 'gelatinous_slime':
        return this.solveGelatinousSlime(buf, spec, action, direction, frameIndex, totalFrames, profile, pivotX, pivotY);
      case 'arachnid':
        return this.solveArachnid(buf, spec, action, direction, frameIndex, totalFrames, profile, pivotX, pivotY);
      case 'flying_winged':
        return this.solveFlyingWinged(buf, spec, action, direction, frameIndex, totalFrames, profile, pivotX, pivotY);
      case 'aquatic_swimmer':
        return this.solveAquaticSwimmer(buf, spec, action, direction, frameIndex, totalFrames, profile, pivotX, pivotY);
    }
  }

  /**
   * 1. RIG CUADRÚPEDO (Vaca, Oveja, Lobo):
   * Columna horizontal orientada en 8 direcciones, 4 patas con paso diagonal alternado,
   * cuello/cabeza que desciende al pastar (`rest_graze`) o embiste en `attack`.
   */
  private solveQuadruped(
    buf: PixelBuffer,
    spec: CreatureSpeciesProfile,
    action: CreatureActionId,
    direction: Direction8,
    frameIndex: number,
    totalFrames: number,
    profile: ArtStyleProfile,
    rng: SeededRNG,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
    const u = profile.moduleSize === 6 ? 1.5 : 1.0;
    const [fx, fy] = direction8ToUnitVector(direction);
    const phase = ((frameIndex % Math.max(1, totalFrames)) / Math.max(1, totalFrames)) * Math.PI * 2;

    const cMain = hexToRgba(spec.primaryHex);
    const cShad = hexToRgba(spec.shadowHex);
    const cHigh = hexToRgba(spec.highlightHex);
    const cSec = hexToRgba(spec.secondaryHex);
    const cAcc = hexToRgba(spec.accentHex);
    const cOut = hexToRgba(spec.outlineHex);

    // Sombra de contacto en suelo
    buf.fillEllipse(pivotX, pivotY + 1, Math.round(8 * u), Math.round(3 * u), { r: 15, g: 23, b: 42, a: 110 });

    const isDead = action === 'death';
    const isSleeping = action === 'sleep';
    const isGrazing = action === 'rest_graze' || action === 'eat_feed';
    const isAttacking = action === 'attack' || action === 'special_ability';
    const isSprinting = action === 'sprint_flee';
    const isPouncing = action === 'jump_pounce';
    const stride = action === 'move' || action === 'swim'
      ? Math.sin(phase) * 3 * u
      : isSprinting ? Math.sin(phase) * 4.6 * u : isPouncing ? 3.8 * u : 0;
    const pounceProgress = frameIndex / Math.max(1, totalFrames - 1);
    const jumpY = isPouncing ? -Math.round(Math.sin(Math.PI * pounceProgress) * 5 * u) : 0;
    const lungeX = isAttacking ? Math.round(fx * 3.5 * u * Math.sin(phase)) : 0;
    const lungeY = isAttacking ? Math.round(fy * 2.5 * u * Math.sin(phase)) : 0;
    const bodyCollapseY = isDead || isSleeping ? Math.round(4 * u)
      : action === 'swim' ? Math.round(2 * u) : 0;
    const bodyCenterX = pivotX + lungeX;
    const bodyCenterY = pivotY - Math.round(7 * u) + lungeY + bodyCollapseY + jumpY;

    // Eje delantero (pecho) y trasero (grupa) según vector de dirección
    const spineHalfLen = Math.round(4.5 * u);
    const chestX = bodyCenterX + Math.round(fx * spineHalfLen);
    const chestY = bodyCenterY + Math.round(fy * spineHalfLen * 0.55);
    const crupperX = bodyCenterX - Math.round(fx * spineHalfLen);
    const crupperY = bodyCenterY - Math.round(fy * spineHalfLen * 0.55);

    // 4 patas con fase diagonal (Pata Delantera Derecha sincronizada con Trasera Izquierda)
    if (!isDead && !isSleeping) {
      const legLen = Math.round(5.5 * u);
      const liftA = Math.max(0, Math.round(Math.sin(phase) * 2 * u));
      const liftB = Math.max(0, Math.round(-Math.sin(phase) * 2 * u));

      // Patas traseras
      buf.drawLine(crupperX - 2, crupperY + 1, crupperX - 2 + Math.round(fx * stride), pivotY - liftA, cShad, Math.max(2, Math.round(2 * u)));
      buf.drawLine(crupperX + 2, crupperY + 1, crupperX + 2 - Math.round(fx * stride), pivotY - liftB, cMain, Math.max(2, Math.round(2 * u)));
      // Patas delanteras
      buf.drawLine(chestX - 2, chestY + 1, chestX - 2 - Math.round(fx * stride), pivotY - liftB, cShad, Math.max(2, Math.round(2 * u)));
      buf.drawLine(chestX + 2, chestY + 1, chestX + 2 + Math.round(fx * stride), pivotY - liftA, cMain, Math.max(2, Math.round(2 * u)));
      void legLen;
    }

    // Barriga/Ubre (si aplica a vaca lechera)
    if (spec.features.hasUdder && !isDead && !isSleeping) {
      buf.fillEllipse(crupperX, bodyCenterY + Math.round(3.5 * u), Math.round(2.5 * u), Math.round(1.8 * u), cAcc);
    }

    // Tronco cilíndrico compuesto (Grupa + Torso medio + Pecho)
    const torsoRx = Math.round((Math.abs(fx) > 0.5 ? 6.5 : 4.8) * u);
    const torsoRy = Math.round(4.2 * u);
    buf.fillEllipse(bodyCenterX, bodyCenterY + 1, torsoRx, torsoRy, cShad);
    buf.fillEllipse(bodyCenterX, bodyCenterY, torsoRx, torsoRy - 1, cMain);
    buf.fillEllipse(bodyCenterX - 1, bodyCenterY - 1, Math.max(2, torsoRx - 2), Math.max(2, torsoRy - 2), cHigh);

    // Manchas deterministas en el lomo (Vaca)
    if (spec.features.hasSpots) {
      for (let s = 0; s < 3; s++) {
        const sx = bodyCenterX + rng.nextInt(-Math.floor(torsoRx * 0.5), Math.floor(torsoRx * 0.5));
        const sy = bodyCenterY + rng.nextInt(-Math.floor(torsoRy * 0.4), Math.floor(torsoRy * 0.3));
        buf.fillEllipse(sx, sy, Math.round(2.2 * u), Math.round(1.6 * u), cSec);
      }
    }

    // Cola en la grupa
    const tailTipX = crupperX - Math.round(fx * 3.5 * u);
    const tailTipY = crupperY + Math.round((spec.features.hasBushyTail ? 1.5 : 3.0) * u);
    buf.drawLine(
      crupperX,
      crupperY,
      tailTipX,
      tailTipY,
      spec.features.hasBushyTail ? cShad : cSec,
      spec.features.hasBushyTail ? Math.max(2, Math.round(2.5 * u)) : 1
    );

    // Cabeza con descenso al pastar (`rest_graze`)
    const grazeDropY = isGrazing ? Math.round(4.5 * u)
      : action === 'special_ability' ? -Math.round(2.5 * u) : 0;
    const headX = chestX + Math.round(fx * 3.5 * u);
    const headY = chestY - Math.round(2.5 * u) + grazeDropY;
    const headRx = Math.round(3.2 * u);
    const headRy = Math.round(2.8 * u);

    buf.fillEllipse(headX, headY, headRx, headRy, cMain);

    // Cuernos (Vaca) u Orejas puntiagudas (Lobo)
    if (spec.features.hasHorns) {
      buf.setPixel(headX - headRx, headY - headRy, cAcc);
      buf.setPixel(headX + headRx, headY - headRy, cAcc);
    }
    if (spec.features.hasPointedEars) {
      buf.fillRect(headX - 2, headY - headRy - 1, 2, 2, cShad);
      buf.fillRect(headX + 1, headY - headRy - 1, 2, 2, cShad);
    }

    // Hocico y ojos
    if (fy >= -0.3) {
      const snoutX = headX + Math.round(fx * 2.0 * u);
      const snoutY = headY + 1;
      buf.fillRect(
        snoutX - 1,
        snoutY,
        Math.round(2.8 * u),
        Math.round(2 * u),
        spec.features.hasUdder ? cAcc : cShad
      );
      buf.setPixel(headX + Math.round(fx * 1.2 * u), headY - 1,
        isSleeping ? cShad : spec.isHostile ? cAcc : cOut);
    }

    buf.applySelectiveOutline(cOut);
    if (action === 'hurt') {
      this.flashBuffer(buf);
    }

    return {
      speciesId: spec.speciesId,
      family: spec.family,
      action,
      direction,
      frameIndex,
      buffer: buf,
      pivotTexel: [pivotX, pivotY],
      anchors: {
        ground_pivot: { id: 'ground_pivot', texelX: pivotX, texelY: pivotY, normalizedX: pivotX / buf.width, normalizedY: pivotY / buf.height },
        head_mount: { id: 'head_mount', texelX: headX, texelY: headY, normalizedX: headX / buf.width, normalizedY: headY / buf.height }
      }
    };
  }

  /**
   * 2. RIG BÍPEDO AVIAR (Gallina):
   * Cuerpo compacto en lágrima, cresta roja, pico cónico, aleteo y picoteo rápido al suelo.
   */
  private solveAvianBiped(
    buf: PixelBuffer,
    spec: CreatureSpeciesProfile,
    action: CreatureActionId,
    direction: Direction8,
    frameIndex: number,
    totalFrames: number,
    profile: ArtStyleProfile,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
    const u = profile.moduleSize === 6 ? 1.5 : 1.0;
    const [fx, fy] = direction8ToUnitVector(direction);
    const phase = ((frameIndex % Math.max(1, totalFrames)) / Math.max(1, totalFrames)) * Math.PI * 2;

    const cMain = hexToRgba(spec.primaryHex);
    const cShad = hexToRgba(spec.shadowHex);
    const cHigh = hexToRgba(spec.highlightHex);
    const cComb = hexToRgba(spec.secondaryHex);
    const cBeak = hexToRgba(spec.accentHex);
    const cOut = hexToRgba(spec.outlineHex);

    buf.fillEllipse(pivotX, pivotY + 1, Math.round(4 * u), Math.round(1.8 * u), { r: 15, g: 23, b: 42, a: 100 });

    const peckOffset = action === 'rest_graze' || action === 'eat_feed'
      ? Math.abs(Math.round(Math.sin(phase) * 4 * u)) : 0;
    const hopY = action === 'move'
      ? Math.abs(Math.round(Math.sin(phase * 2) * 1.5 * u))
      : action === 'sprint_flee' || action === 'jump_pounce' || action === 'special_ability'
      ? Math.abs(Math.round(Math.sin(phase) * 3.8 * u)) : 0;
    const bodyY = pivotY - Math.round(4.5 * u) - hopY
      + (action === 'death' || action === 'sleep' ? Math.round(2.5 * u) : 0);

    // 2 patas finas amarillas/naranjas
    if (action !== 'death' && action !== 'sleep') {
      const step = action === 'move' || action === 'sprint_flee'
        ? Math.round(Math.sin(phase) * 2.4 * u) : 0;
      buf.drawLine(pivotX - 1, bodyY + 2, pivotX - 1 + step, pivotY, cBeak, 1);
      buf.drawLine(pivotX + 1, bodyY + 2, pivotX + 1 - step, pivotY, cBeak, 1);
    }

    // Cuerpo rechoncho y ala lateral
    const bodyRx = Math.round(3.5 * u);
    const bodyRy = Math.round(2.8 * u);
    buf.fillEllipse(pivotX, bodyY + 1, bodyRx, bodyRy, cShad);
    buf.fillEllipse(pivotX, bodyY, bodyRx - 1, bodyRy - 1, cMain);
    buf.fillEllipse(pivotX, bodyY, Math.max(1, bodyRx - 2), Math.max(1, bodyRy - 2), cHigh);

    // Cabeza, cresta roja y pico
    const headX = pivotX + Math.round(fx * 2.5 * u);
    const headY = bodyY - Math.round(2.8 * u) + peckOffset;
    const headR = Math.round(2.2 * u);

    buf.fillEllipse(headX, headY, headR, headR, cMain);
    if (spec.features.hasCombAndWattle) {
      buf.fillRect(headX - 1, headY - headR - 1, Math.round(2.2 * u), Math.round(1.8 * u), cComb);
    }
    // Pico proyectado en la dirección de mirada
    const beakX = headX + Math.round(fx * (headR + 1));
    const beakY = headY + Math.round(fy * 1.2);
    buf.fillRect(beakX, beakY, Math.max(1, Math.round(1.6 * u)), Math.max(1, Math.round(1.4 * u)), cBeak);

    buf.applySelectiveOutline(cOut);
    if (action === 'hurt') this.flashBuffer(buf);

    return {
      speciesId: spec.speciesId,
      family: spec.family,
      action,
      direction,
      frameIndex,
      buffer: buf,
      pivotTexel: [pivotX, pivotY],
      anchors: {
        ground_pivot: { id: 'ground_pivot', texelX: pivotX, texelY: pivotY, normalizedX: pivotX / buf.width, normalizedY: pivotY / buf.height }
      }
    };
  }

  /**
   * 3. RIG GELATINOSO (Slime):
   * Deformación elástica conservando área (squash & stretch), salto parabólico y núcleo flotante visible.
   */
  private solveGelatinousSlime(
    buf: PixelBuffer,
    spec: CreatureSpeciesProfile,
    action: CreatureActionId,
    direction: Direction8,
    frameIndex: number,
    totalFrames: number,
    profile: ArtStyleProfile,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
    const u = profile.moduleSize === 6 ? 1.5 : 1.0;
    const [fx, fy] = direction8ToUnitVector(direction);
    const phase = ((frameIndex % Math.max(1, totalFrames)) / Math.max(1, totalFrames)) * Math.PI * 2;

    const cMain = hexToRgba(spec.primaryHex, 235);
    const cShad = hexToRgba(spec.shadowHex, 245);
    const cHigh = hexToRgba(spec.highlightHex, 245);
    const cCore = hexToRgba(spec.secondaryHex, 255);
    const cSpec = hexToRgba(spec.accentHex, 255);
    const cOut = hexToRgba(spec.outlineHex);

    const stretch =
      action === 'death' || action === 'sleep' ? -0.45
      : action === 'jump_pounce' ? Math.sin(phase) * 0.48
      : action === 'special_ability' ? -0.35 * Math.sin(phase)
      : action === 'move' || action === 'sprint_flee' || action === 'attack'
      ? Math.sin(phase) * 0.32 : Math.sin(phase) * 0.12;
    const progress = frameIndex / Math.max(1, totalFrames - 1);
    const jumpHeight = action === 'jump_pounce'
      ? Math.max(0, Math.round(Math.sin(Math.PI * progress) * 7.5 * u))
      : action === 'move' || action === 'sprint_flee' || action === 'attack'
      ? Math.max(0, Math.round(Math.sin(phase) * 4.5 * u)) : 0;

    // Conservación aproximada de volumen: cuando sube y se estira en Y, se estrecha en X
    const rx = Math.max(3, Math.round(5.5 * u * (1 - stretch * 0.65)));
    const ry = Math.max(2, Math.round(4.4 * u * (1 + stretch)));

    const centerY = pivotY - ry - jumpHeight;

    // Sombra en el suelo (se reduce cuando el slime salta alto)
    const shadowRx = Math.max(3, rx - Math.floor(jumpHeight * 0.35));
    buf.fillEllipse(pivotX, pivotY + 1, shadowRx, Math.round(2 * u), { r: 15, g: 23, b: 42, a: 110 });

    // Domo gelatinoso
    buf.fillEllipse(pivotX, centerY + 1, rx, ry, cShad);
    buf.fillEllipse(pivotX, centerY, rx - 1, ry - 1, cMain);

    // Núcleo interno suspendido con ligero desfase hacia la dirección de movimiento.
    // El anchor debe señalar el mismo centro que los píxeles visibles; la pose de
    // muerte no dibuja núcleo y, por tanto, tampoco expone un anchor de núcleo.
    const nucleus = spec.features.hasTranslucentCore && action !== 'death'
      ? {
          x: pivotX + Math.round(fx * 1.5 * u),
          y: centerY + Math.round(fy * 1.0 * u),
        }
      : undefined;
    if (nucleus) {
      buf.fillEllipse(
        nucleus.x,
        nucleus.y,
        Math.max(2, Math.round(2.0 * u)),
        Math.max(2, Math.round(1.8 * u)),
        cCore,
      );
    }

    // Brillo especular superior izquierdo
    buf.fillEllipse(
      pivotX - Math.round(rx * 0.35),
      centerY - Math.round(ry * 0.35),
      Math.max(1, Math.round(1.6 * u)),
      Math.max(1, Math.round(1.2 * u)),
      cHigh
    );
    buf.setPixel(pivotX - Math.round(rx * 0.4), centerY - Math.round(ry * 0.4), cSpec);

    buf.applySelectiveOutline(cOut);
    if (action === 'hurt') this.flashBuffer(buf);

    return {
      speciesId: spec.speciesId,
      family: spec.family,
      action,
      direction,
      frameIndex,
      buffer: buf,
      pivotTexel: [pivotX, pivotY],
      anchors: {
        ground_pivot: { id: 'ground_pivot', texelX: pivotX, texelY: pivotY, normalizedX: pivotX / buf.width, normalizedY: pivotY / buf.height },
        ...(nucleus ? {
          nucleus: {
            id: 'nucleus',
            texelX: nucleus.x,
            texelY: nucleus.y,
            normalizedX: nucleus.x / buf.width,
            normalizedY: nucleus.y / buf.height,
          },
        } : {}),
      }
    };
  }

  /**
   * 4. RIG ARÁCNIDO (Araña de Cueva):
   * Cefalotórax + abdomen abultado, 4 pares de patas articuladas con marcha tetrápoda y ojos múltiples.
   */
  private solveArachnid(
    buf: PixelBuffer,
    spec: CreatureSpeciesProfile,
    action: CreatureActionId,
    direction: Direction8,
    frameIndex: number,
    totalFrames: number,
    profile: ArtStyleProfile,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
    const u = profile.moduleSize === 6 ? 1.5 : 1.0;
    const [fx, fy] = direction8ToUnitVector(direction);
    const phase = ((frameIndex % Math.max(1, totalFrames)) / Math.max(1, totalFrames)) * Math.PI * 2;

    const cMain = hexToRgba(spec.primaryHex);
    const cShad = hexToRgba(spec.shadowHex);
    const cHigh = hexToRgba(spec.highlightHex);
    const cEye = hexToRgba(spec.secondaryHex);
    const cOut = hexToRgba(spec.outlineHex);

    const progress = frameIndex / Math.max(1, totalFrames - 1);
    const pounceLift = action === 'jump_pounce'
      ? Math.round(Math.sin(Math.PI * progress) * 4.5 * u) : 0;
    const bodyY = pivotY - Math.round(4 * u) - pounceLift
      + (action === 'sleep' || action === 'death' ? Math.round(2 * u) : 0);
    const abX = pivotX - Math.round(fx * 2.5 * u);
    const abY = bodyY - Math.round(fy * 2.0 * u);

    // 4 pares de patas articuladas (rodilla elevada -> punta en suelo)
    for (let pair = 0; pair < 4; pair++) {
      const pairAngleOffset = (pair - 1.5) * 2.2 * u;
      const gaitWave = action === 'move' || action === 'sprint_flee'
        ? Math.sin(phase + pair * Math.PI) * (action === 'sprint_flee' ? 2.8 : 1.8) * u : 0;

      // Lado izquierdo y derecho
      for (const side of [-1, 1]) {
        const kneeX = pivotX + side * Math.round(5.5 * u);
        const kneeY = bodyY - Math.round(2.5 * u) + Math.round(pairAngleOffset * 0.4);
        const tipX = pivotX + side * Math.round(8.0 * u) + Math.round(gaitWave * side);
        const tipY = pivotY - Math.round(pair * 1.2 * u);

        buf.drawLine(pivotX, bodyY, kneeX, kneeY, cShad, 1);
        buf.drawLine(kneeX, kneeY, tipX, tipY, cMain, 1);
      }
    }

    // Abdomen trasero con marca dorsal roja y cefalotórax delantero
    buf.fillEllipse(abX, abY, Math.round(4.2 * u), Math.round(3.4 * u), cShad);
    buf.fillEllipse(abX, abY - 1, Math.round(3.4 * u), Math.round(2.6 * u), cMain);
    buf.fillRect(abX - 1, abY - 1, 2, 2, cEye);

    const headX = pivotX + Math.round(fx * 2.2 * u);
    const headY = bodyY + Math.round(fy * 1.5 * u);
    buf.fillEllipse(headX, headY, Math.round(2.8 * u), Math.round(2.4 * u), cHigh);

    // Clúster de ojos arácnidos
    buf.setPixel(headX - 1, headY, cEye);
    buf.setPixel(headX + 1, headY, cEye);
    if (action === 'special_ability') {
      // A spun silk filament leaves the arachnid's chelicerae.
      buf.drawLine(headX, headY,
        headX + Math.round(fx * 5 * u),
        headY + Math.round(fy * 5 * u), hexToRgba('#f8fafc'), 1);
    }

    buf.applySelectiveOutline(cOut);
    if (action === 'hurt') this.flashBuffer(buf);

    return {
      speciesId: spec.speciesId,
      family: spec.family,
      action,
      direction,
      frameIndex,
      buffer: buf,
      pivotTexel: [pivotX, pivotY],
      anchors: {
        ground_pivot: { id: 'ground_pivot', texelX: pivotX, texelY: pivotY, normalizedX: pivotX / buf.width, normalizedY: pivotY / buf.height }
      }
    };
  }

  /**
   * 5. RIG VOLADOR (Murciélago):
   * Altitud suspendida sobre su sombra proyectada en suelo y ciclo de batido de alas.
   */
  private solveFlyingWinged(
    buf: PixelBuffer,
    spec: CreatureSpeciesProfile,
    action: CreatureActionId,
    direction: Direction8,
    frameIndex: number,
    totalFrames: number,
    profile: ArtStyleProfile,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
    const u = profile.moduleSize === 6 ? 1.5 : 1.0;
    const phase = ((frameIndex % Math.max(1, totalFrames)) / Math.max(1, totalFrames)) * Math.PI * 2;

    const cMain = hexToRgba(spec.primaryHex);
    const cShad = hexToRgba(spec.shadowHex);
    const cHigh = hexToRgba(spec.highlightHex);
    const cEye = hexToRgba(spec.secondaryHex);
    const cOut = hexToRgba(spec.outlineHex);

    // Sombra pequeña en el suelo (pivotY) mientras el cuerpo vuela arriba
    buf.fillEllipse(pivotX, pivotY, Math.round(3.5 * u), Math.round(1.5 * u), { r: 15, g: 23, b: 42, a: 95 });

    const altitude = action === 'death' || action === 'sleep'
      ? Math.round(2 * u)
      : Math.round((spec.features.defaultFlightAltitudeTexels ?? 8) * u);
    const flapY = action === 'death' || action === 'sleep' ? 0
      : Math.round(Math.sin(phase) * (action === 'sprint_flee' ? 5.2 : 4) * u);
    const progress = frameIndex / Math.max(1, totalFrames - 1);
    const diveDrop = action === 'jump_pounce' || action === 'attack'
      ? Math.round(Math.sin(Math.PI * progress) * 4 * u) : 0;
    const bodyY = pivotY - altitude + diveDrop
      + Math.round(Math.cos(phase) * (action === 'sleep' ? 0 : 1.2) * u);

    // Alas membranosas izquierda y derecha
    const wingSpan = Math.round(7.5 * u);
    buf.drawLine(pivotX, bodyY, pivotX - wingSpan, bodyY - flapY, cHigh, Math.max(2, Math.round(2 * u)));
    buf.drawLine(pivotX - wingSpan, bodyY - flapY, pivotX - Math.round(wingSpan * 0.5), bodyY + 2, cShad, 2);

    buf.drawLine(pivotX, bodyY, pivotX + wingSpan, bodyY - flapY, cHigh, Math.max(2, Math.round(2 * u)));
    buf.drawLine(pivotX + wingSpan, bodyY - flapY, pivotX + Math.round(wingSpan * 0.5), bodyY + 2, cShad, 2);

    // Cuerpo central y orejas
    buf.fillEllipse(pivotX, bodyY, Math.round(2.6 * u), Math.round(2.8 * u), cMain);
    buf.setPixel(pivotX - 1, bodyY, cEye);
    buf.setPixel(pivotX + 1, bodyY, cEye);

    buf.applySelectiveOutline(cOut);
    if (action === 'hurt') this.flashBuffer(buf);

    return {
      speciesId: spec.speciesId,
      family: spec.family,
      action,
      direction,
      frameIndex,
      buffer: buf,
      pivotTexel: [pivotX, pivotY],
      anchors: {
        ground_pivot: { id: 'ground_pivot', texelX: pivotX, texelY: pivotY, normalizedX: pivotX / buf.width, normalizedY: pivotY / buf.height },
        flight_body: { id: 'flight_body', texelX: pivotX, texelY: bodyY, normalizedX: pivotX / buf.width, normalizedY: bodyY / buf.height }
      }
    };
  }

  /**
   * 6. RIG ACUÁTICO (Pez / Trucha):
   * Ondulación sinusoidal en S de 3 segmentos (cabeza, torso, aleta caudal).
   */
  private solveAquaticSwimmer(
    buf: PixelBuffer,
    spec: CreatureSpeciesProfile,
    action: CreatureActionId,
    direction: Direction8,
    frameIndex: number,
    totalFrames: number,
    profile: ArtStyleProfile,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
    const u = profile.moduleSize === 6 ? 1.5 : 1.0;
    const [fx, fy] = direction8ToUnitVector(direction);
    const phase = ((frameIndex % Math.max(1, totalFrames)) / Math.max(1, totalFrames)) * Math.PI * 2;

    const cMain = hexToRgba(spec.primaryHex);
    const cHigh = hexToRgba(spec.highlightHex);
    const cStripe = hexToRgba(spec.secondaryHex);
    const cOut = hexToRgba(spec.outlineHex);

    const centerY = pivotY - Math.round(3.5 * u);
    const swayAmp = action === 'sprint_flee' || action === 'swim' ? 3.2
      : action === 'sleep' || action === 'death' ? 0.4 : 2;
    const sway = Math.round(Math.sin(phase) * swayAmp * u);

    const headX = pivotX + Math.round(fx * 3.5 * u);
    const headY = centerY + Math.round(fy * 2.0 * u);
    const tailX = pivotX - Math.round(fx * 4.5 * u) - fy * sway;
    const tailY = centerY - Math.round(fy * 2.5 * u) + fx * sway;

    buf.drawLine(tailX, tailY, headX, headY, cMain, Math.max(3, Math.round(3.5 * u)));
    buf.drawLine(tailX, tailY, headX, headY, cStripe, 1);
    buf.fillEllipse(headX, headY, Math.round(2.2 * u), Math.round(2.0 * u), cHigh);

    buf.applySelectiveOutline(cOut);

    return {
      speciesId: spec.speciesId,
      family: spec.family,
      action,
      direction,
      frameIndex,
      buffer: buf,
      pivotTexel: [pivotX, pivotY],
      anchors: {
        ground_pivot: { id: 'ground_pivot', texelX: pivotX, texelY: pivotY, normalizedX: pivotX / buf.width, normalizedY: pivotY / buf.height }
      }
    };
  }

  private flashBuffer(buf: PixelBuffer): void {
    for (let i = 0; i < buf.data.length; i += 4) {
      if (buf.data[i + 3] === 0) continue;
      buf.data[i] = Math.min(255, buf.data[i] + 95);
      buf.data[i + 1] = Math.min(255, buf.data[i + 1] + 55);
      buf.data[i + 2] = Math.min(255, buf.data[i + 2] + 55);
    }
  }
}
