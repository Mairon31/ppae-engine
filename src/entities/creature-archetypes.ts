import {
  AnchorPoint,
  ArtStyleProfile,
  CreatureActionId,
  CreatureMorphVariantOptions,
  CreatureSpeciesId,
  CreatureSpeciesProfile,
  Direction8,
  PPAE_SCHEMA_VERSION
} from '../core/contracts';
import { resolveDetailBudgetForProfile } from '../core/coordinates';
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
  },
  forest_stag: {
    schemaVersion: PPAE_SCHEMA_VERSION, speciesId: 'forest_stag',
    family: 'quadruped', isHostile: false,
    widthModules: 7, heightModules: 7,
    primaryHex: '#9a5b32',
    shadowHex: '#6b3d1e',
    highlightHex: '#c47d4e',
    secondaryHex: '#fef3c7',
    accentHex: '#d6c7b2',
    outlineHex: '#26150b',
    features: {"hasAntlers":true,"hasSpots":true,"legPairs":2},
    logicalHitbox: { offsetX: -9, offsetY: -5, width: 18, height: 10, collidable: true }
  },
  wild_boar: {
    schemaVersion: PPAE_SCHEMA_VERSION, speciesId: 'wild_boar',
    family: 'quadruped', isHostile: true,
    widthModules: 6, heightModules: 5,
    primaryHex: '#574133',
    shadowHex: '#38281e',
    highlightHex: '#785b48',
    secondaryHex: '#291d16',
    accentHex: '#f8fafc',
    outlineHex: '#17100b',
    features: {"hasTusks":true,"legPairs":2},
    logicalHitbox: { offsetX: -8, offsetY: -5, width: 16, height: 10, collidable: true }
  },
  brown_bear: {
    schemaVersion: PPAE_SCHEMA_VERSION, speciesId: 'brown_bear',
    family: 'quadruped', isHostile: true,
    widthModules: 8, heightModules: 6,
    primaryHex: '#6b4226',
    shadowHex: '#452815',
    highlightHex: '#8f5b38',
    secondaryHex: '#331d0e',
    accentHex: '#ef4444',
    outlineHex: '#1a0f07',
    features: {"hasPointedEars":true,"legPairs":2},
    logicalHitbox: { offsetX: -11, offsetY: -6, width: 22, height: 12, collidable: true }
  },
  desert_viper: {
    schemaVersion: PPAE_SCHEMA_VERSION, speciesId: 'desert_viper',
    family: 'serpentine_reptile', isHostile: true,
    widthModules: 6, heightModules: 4,
    primaryHex: '#ca8a04',
    shadowHex: '#854d0e',
    highlightHex: '#facc15',
    secondaryHex: '#451a03',
    accentHex: '#ef4444',
    outlineHex: '#1c1008',
    features: {"legPairs":0},
    logicalHitbox: { offsetX: -7, offsetY: -4, width: 14, height: 8, collidable: true }
  },
  horned_beetle: {
    schemaVersion: PPAE_SCHEMA_VERSION, speciesId: 'horned_beetle',
    family: 'insectoid', isHostile: true,
    widthModules: 6, heightModules: 5,
    primaryHex: '#1e3a8a',
    shadowHex: '#172554',
    highlightHex: '#3b82f6',
    secondaryHex: '#0f172a',
    accentHex: '#93c5fd',
    outlineHex: '#090d16',
    features: {"hasCarapaceHorn":true,"legPairs":3},
    logicalHitbox: { offsetX: -7, offsetY: -5, width: 14, height: 10, collidable: true }
  },
  skeleton_warrior: {
    schemaVersion: PPAE_SCHEMA_VERSION, speciesId: 'skeleton_warrior',
    family: 'undead_biped', isHostile: true,
    widthModules: 6, heightModules: 7,
    primaryHex: '#e2e8f0',
    shadowHex: '#94a3b8',
    highlightHex: '#ffffff',
    secondaryHex: '#475569',
    accentHex: '#38bdf8',
    outlineHex: '#0f172a',
    features: {"hasExposedRibcage":true,"legPairs":1},
    logicalHitbox: { offsetX: -6, offsetY: -4, width: 12, height: 8, collidable: true }
  },
  forest_goblin: {
    schemaVersion: PPAE_SCHEMA_VERSION, speciesId: 'forest_goblin',
    family: 'undead_biped', isHostile: true,
    widthModules: 5, heightModules: 6,
    primaryHex: '#4d7c0f',
    shadowHex: '#365314',
    highlightHex: '#84cc16',
    secondaryHex: '#78350f',
    accentHex: '#facc15',
    outlineHex: '#142605',
    features: {"hasPointedEars":true,"legPairs":1},
    logicalHitbox: { offsetX: -5, offsetY: -4, width: 10, height: 8, collidable: true }
  },
  stone_golem: {
    schemaVersion: PPAE_SCHEMA_VERSION, speciesId: 'stone_golem',
    family: 'elemental_golem', isHostile: true,
    widthModules: 8, heightModules: 8,
    primaryHex: '#64748b',
    shadowHex: '#334155',
    highlightHex: '#94a3b8',
    secondaryHex: '#1e293b',
    accentHex: '#38bdf8',
    outlineHex: '#090d16',
    features: {"legPairs":1},
    logicalHitbox: { offsetX: -10, offsetY: -6, width: 20, height: 12, collidable: true }
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
    variantSeed = 101,
    morphOptions?: CreatureMorphVariantOptions
  ): RenderedCreatureFrame {
    const spec = CREATURE_SPECIES_CATALOG[speciesId];
    const mod = profile.moduleSize;
    const ageFactor = morphOptions?.ageStage === 'juvenile' ? .78
      : morphOptions?.ageStage === 'alpha_elder' ? 1.2 : 1;
    const requestedScale = morphOptions?.sizeScaleMultiplier ?? 1;
    const customScale = Number.isFinite(requestedScale)
      ? Math.max(.75, Math.min(1.35, requestedScale)) : 1;
    const scale = ageFactor * customScale;
    const width = Math.max(8, Math.round(spec.widthModules * mod * scale));
    const height = Math.max(8, Math.round(spec.heightModules * mod * scale));
    const buf = new PixelBuffer(width, height);
    const rng = new SeededRNG(variantSeed);
    const u = (mod / 4) * scale;
    const pivotX = Math.floor(width / 2);
    const pivotY = height - Math.max(2, Math.floor(mod * .65 * scale));
    let result: RenderedCreatureFrame;

    switch (spec.family) {
      case 'quadruped':
        result = this.solveQuadruped(buf, spec, action, direction, frameIndex, totalFrames, u, rng, pivotX, pivotY);
        break;
      case 'avian_biped':
        result = this.solveAvianBiped(buf, spec, action, direction, frameIndex, totalFrames, u, pivotX, pivotY);
        break;
      case 'gelatinous_slime':
        result = this.solveGelatinousSlime(buf, spec, action, direction, frameIndex, totalFrames, u, pivotX, pivotY);
        break;
      case 'arachnid':
        result = this.solveArachnid(buf, spec, action, direction, frameIndex, totalFrames, u, pivotX, pivotY);
        break;
      case 'flying_winged':
        result = this.solveFlyingWinged(buf, spec, action, direction, frameIndex, totalFrames, u, pivotX, pivotY);
        break;
      case 'aquatic_swimmer':
        result = this.solveAquaticSwimmer(buf, spec, action, direction, frameIndex, totalFrames, u, pivotX, pivotY);
        break;
      case 'serpentine_reptile':
        result = this.solveSerpentineReptile(buf, spec, action, direction, frameIndex, totalFrames, u, pivotX, pivotY);
        break;
      case 'insectoid':
        result = this.solveInsectoid(buf, spec, action, direction, frameIndex, totalFrames, u, pivotX, pivotY);
        break;
      case 'elemental_golem':
        result = this.solveElementalGolem(buf, spec, action, direction, frameIndex, totalFrames, u, pivotX, pivotY);
        break;
      case 'undead_biped':
        result = this.solveUndeadBiped(buf, spec, action, direction, frameIndex, totalFrames, u, pivotX, pivotY);
        break;
    }

    const budget = resolveDetailBudgetForProfile(profile);
    if (budget.shadingSteps >= 4) {
      this.applyNativeMaterialDetail(result.buffer, spec, budget.barkAndFacetMicroDetailLevel, pivotY);
    }
    if (morphOptions?.healthState === 'corrupted') {
      this.applyCorruptionOverlay(result.buffer);
    } else if (morphOptions?.healthState === 'wounded') {
      this.applyWoundedMarks(result.buffer, pivotX, pivotY - Math.round(4 * u));
    }
    return result;
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
    u: number,
    rng: SeededRNG,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
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
    if (spec.features.hasAntlers) {
      for (const side of [-1, 1]) {
        const rootX = headX + side * Math.round(1.6 * u);
        const rootY = headY - headRy + 1;
        const branchX = rootX + side * Math.round(2.7 * u);
        const branchY = rootY - Math.round(2.9 * u);
        buf.drawLine(rootX, rootY, branchX, branchY, cAcc, Math.max(1, Math.round(.7 * u)));
        buf.drawLine(branchX, branchY, branchX + side * Math.round(1.4 * u),
          branchY - Math.round(1.4 * u), cAcc);
        buf.drawLine(branchX - side * Math.round(.5 * u), branchY + 1,
          branchX + side * Math.round(.6 * u), branchY - Math.round(1.7 * u), cAcc);
      }
    }
    if (spec.features.hasTusks && fy >= -.3) {
      const muzzleX = headX + Math.round(fx * 2 * u);
      buf.drawLine(muzzleX - Math.round(1.5 * u), headY + 1,
        muzzleX - Math.round(1.5 * u), headY - Math.round(.8 * u), cAcc);
      buf.drawLine(muzzleX + Math.round(1.5 * u), headY + 1,
        muzzleX + Math.round(1.5 * u), headY - Math.round(.8 * u), cAcc);
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
    u: number,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
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
    u: number,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
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
    u: number,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
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
    u: number,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
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
    u: number,
    pivotX: number,
    pivotY: number
  ): RenderedCreatureFrame {
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


  /** A continuous sinuous spine with articulated dorsal markings and attack hood. */
  private solveSerpentineReptile(
    buf: PixelBuffer, spec: CreatureSpeciesProfile, action: CreatureActionId,
    direction: Direction8, frameIndex: number, totalFrames: number,
    u: number, pivotX: number, pivotY: number
  ): RenderedCreatureFrame {
    const [fx, fy] = direction8ToUnitVector(direction);
    const phase = (frameIndex / Math.max(1, totalFrames)) * Math.PI * 2;
    const main = hexToRgba(spec.primaryHex), shad = hexToRgba(spec.shadowHex);
    const high = hexToRgba(spec.highlightHex), marking = hexToRgba(spec.secondaryHex);
    const accent = hexToRgba(spec.accentHex), out = hexToRgba(spec.outlineHex);
    const active = action === 'move' || action === 'sprint_flee' || action === 'swim';
    const amplitude = active ? (action === 'sprint_flee' ? 2.5 : 1.7) : .55;
    const crouch = action === 'death' || action === 'sleep';
    const rise = action === 'jump_pounce'
      ? Math.round(Math.sin(Math.PI * frameIndex / Math.max(1, totalFrames - 1)) * 2.5 * u) : 0;
    let previous: readonly [number, number] | undefined;
    let headX = pivotX, headY = pivotY - Math.round(3 * u);
    const segments = 10;
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      const along = (t - .5) * 8 * u;
      const wave = Math.sin(phase + t * Math.PI * 2) * amplitude * u;
      const lift = crouch ? 0 : t > .65 ? (t - .65) * 8 * u : 0;
      const x = Math.round(pivotX + along * fx - fy * wave);
      const y = Math.round(pivotY - 2 * u + along * fy * .38 + fx * wave * .38 - lift - rise);
      const thickness = Math.max(1, Math.round((.8 + Math.sin(Math.PI * t) * 1.5) * u));
      if (previous) buf.drawLine(previous[0], previous[1], x, y, shad, thickness * 2 + 1);
      buf.fillEllipse(x, y, thickness, Math.max(1, thickness - 1), i % 3 === 0 ? marking : main);
      if (i % 2 === 0) buf.setPixel(x, y - 1, high);
      previous = [x, y];
      if (i === segments - 1) { headX = x; headY = y; }
    }
    const headRx = Math.max(2, Math.round(2.3 * u));
    buf.fillEllipse(headX, headY, headRx, Math.max(1, Math.round(1.6 * u)), main);
    if (action === 'attack' || action === 'special_ability') {
      const targetX = headX + Math.round(fx * 4 * u);
      const targetY = headY + Math.round(fy * 2.2 * u);
      buf.drawLine(headX, headY, targetX, targetY, accent);
      buf.setPixel(targetX - 1, targetY + 1, accent);
      buf.setPixel(targetX + 1, targetY + 1, accent);
      buf.fillEllipse(headX, headY - 1, headRx + 1, Math.max(2, Math.round(1.9 * u)), shad);
      buf.fillEllipse(headX, headY, headRx, Math.max(1, Math.round(1.1 * u)), main);
    }
    if (fy >= -.25) buf.setPixel(headX + Math.round(fx * u), headY - 1, accent);
    buf.applySelectiveOutline(out);
    if (action === 'hurt') this.flashBuffer(buf);
    return this.makeNewFamilyFrame(buf, spec, action, direction, frameIndex, pivotX, pivotY,
      { head_mount: [headX, headY] });
  }

  /** Hexapod: alternating-tripod gait, separate thorax, split elytra and horn. */
  private solveInsectoid(
    buf: PixelBuffer, spec: CreatureSpeciesProfile, action: CreatureActionId,
    direction: Direction8, frameIndex: number, totalFrames: number,
    u: number, pivotX: number, pivotY: number
  ): RenderedCreatureFrame {
    const [fx, fy] = direction8ToUnitVector(direction);
    const phase = (frameIndex / Math.max(1, totalFrames)) * Math.PI * 2;
    const main = hexToRgba(spec.primaryHex), shad = hexToRgba(spec.shadowHex);
    const high = hexToRgba(spec.highlightHex), sec = hexToRgba(spec.secondaryHex);
    const shine = hexToRgba(spec.accentHex), out = hexToRgba(spec.outlineHex);
    const lift = action === 'jump_pounce'
      ? Math.max(0, Math.round(Math.sin(Math.PI * frameIndex / Math.max(1, totalFrames - 1)) * 3 * u)) : 0;
    const bodyY = pivotY - Math.round((action === 'sleep' || action === 'death' ? 2.5 : 4.5) * u) - lift;
    for (let pair = 0; pair < 3; pair++) {
      const along = (pair - 1) * 2 * u;
      const ax = pivotX + Math.round(fx * along);
      const ay = bodyY + Math.round(fy * along * .4);
      for (const side of [-1, 1]) {
        const tripod = (pair + (side > 0 ? 1 : 0)) & 1;
        const gait = action === 'move' || action === 'sprint_flee'
          ? Math.sin(phase + tripod * Math.PI) * (action === 'sprint_flee' ? 2.5 : 1.6) * u : 0;
        const kneeX = ax + Math.round(side * 3.5 * u);
        const kneeY = ay - Math.round((1 + Math.abs(gait) * .3) * u);
        const tipX = kneeX + Math.round(side * 2 * u + fx * gait);
        const tipY = pivotY - Math.max(0, Math.round(gait));
        buf.drawLine(ax, ay, kneeX, kneeY, sec, Math.max(1, Math.round(.7 * u)));
        buf.drawLine(kneeX, kneeY, tipX, tipY, shad, Math.max(1, Math.round(.7 * u)));
      }
    }
    const shellRx = Math.max(3, Math.round(4.5 * u));
    const shellRy = Math.max(2, Math.round(3.3 * u));
    buf.fillEllipse(pivotX, bodyY + 1, shellRx, shellRy, shad);
    buf.fillEllipse(pivotX, bodyY, shellRx - 1, shellRy - 1, main);
    buf.fillEllipse(pivotX - Math.round(.9 * u), bodyY - Math.round(1.1 * u),
      Math.max(2, shellRx - Math.round(1.4 * u)),
      Math.max(1, shellRy - Math.round(1.3 * u)), high);
    buf.drawLine(pivotX, bodyY - shellRy + 1, pivotX, bodyY + shellRy - 1, sec);
    buf.setPixel(pivotX - Math.round(1.5 * u), bodyY - Math.round(1.7 * u), shine);
    const headX = pivotX + Math.round(fx * 3.5 * u);
    const headY = bodyY + Math.round(fy * 1.5 * u);
    buf.fillEllipse(headX, headY, Math.max(2, Math.round(2.2 * u)),
      Math.max(1, Math.round(1.6 * u)), main);
    if (spec.features.hasCarapaceHorn) {
      buf.drawLine(headX, headY - 1, headX + Math.round(fx * 2.8 * u),
        headY - Math.round(3.7 * u), high, Math.max(1, Math.round(.8 * u)));
    }
    if (action === 'special_ability') buf.setPixel(headX, headY - 2, shine);
    if (fy >= -.25) buf.setPixel(headX + Math.round(fx * u), headY, shine);
    buf.applySelectiveOutline(out);
    if (action === 'hurt') this.flashBuffer(buf);
    return this.makeNewFamilyFrame(buf, spec, action, direction, frameIndex, pivotX, pivotY,
      { head_mount: [headX, headY] });
  }

  /** Multiblock stone anatomy: articulated crushers, floating rune core. */
  private solveElementalGolem(
    buf: PixelBuffer, spec: CreatureSpeciesProfile, action: CreatureActionId,
    direction: Direction8, frameIndex: number, totalFrames: number,
    u: number, pivotX: number, pivotY: number
  ): RenderedCreatureFrame {
    const [fx, fy] = direction8ToUnitVector(direction);
    const phase = (frameIndex / Math.max(1, totalFrames)) * Math.PI * 2;
    const main = hexToRgba(spec.primaryHex), shad = hexToRgba(spec.shadowHex);
    const high = hexToRgba(spec.highlightHex), sec = hexToRgba(spec.secondaryHex);
    const rune = hexToRgba(spec.accentHex), out = hexToRgba(spec.outlineHex);
    const fall = action === 'death' ? Math.round(4 * u) : 0;
    const rest = action === 'sleep' ? Math.round(2 * u) : 0;
    const pulse = (action === 'attack' || action === 'special_ability')
      ? Math.round(Math.sin(phase) * 3 * u) : 0;
    const step = action === 'move' ? Math.round(Math.sin(phase) * 1.8 * u) : 0;
    const ty = pivotY - Math.round(9 * u) + fall + rest;
    const tw = Math.max(4, Math.round(8 * u)), th = Math.max(4, Math.round(6.5 * u));
    const legW = Math.max(2, Math.round(2.5 * u));
    for (const side of [-1, 1]) {
      const lx = pivotX + Math.round(side * 2.1 * u);
      buf.fillRect(lx - Math.floor(legW / 2) + side * step,
        ty + th - 1, legW, Math.max(2, Math.round(3 * u)), side < 0 ? shad : main);
    }
    buf.fillRect(pivotX - Math.floor(tw / 2), ty, tw, th, shad);
    buf.fillRect(pivotX - Math.floor(tw / 2) + 1, ty + 1, tw - 2, th - 2, main);
    buf.fillRect(pivotX - Math.floor(tw / 2) + 1, ty + 1, tw - 3,
      Math.max(1, Math.round(1.5 * u)), high);
    const leftX = pivotX - Math.round(6 * u), rightX = pivotX + Math.round(6 * u);
    const fistW = Math.max(2, Math.round(2.8 * u));
    const fistH = Math.max(3, Math.round(5 * u));
    buf.fillRect(leftX - Math.floor(fistW / 2), ty + Math.round(2 * u) + pulse,
      fistW, fistH, high);
    buf.fillRect(rightX - Math.floor(fistW / 2), ty + Math.round(2 * u) - pulse,
      fistW, fistH, shad);
    const runeY = ty + Math.round(3 * u);
    buf.fillEllipse(pivotX, runeY, Math.max(1, Math.round(1.2 * u)),
      Math.max(1, Math.round(1.2 * u)), rune);
    if (action === 'special_ability') {
      buf.drawLine(pivotX - Math.round(2 * u), runeY,
        pivotX + Math.round(2 * u), runeY, rune);
    }
    const hx = pivotX + Math.round(fx * u), hy = ty - Math.round(2 * u);
    buf.fillRect(hx - Math.round(2 * u), hy,
      Math.max(3, Math.round(4 * u)), Math.max(2, Math.round(2.7 * u)), high);
    if (fy >= -.25) {
      buf.setPixel(hx - Math.round(.8 * u), hy + 1, rune);
      buf.setPixel(hx + Math.round(.8 * u), hy + 1, rune);
    }
    if (th >= 5) buf.drawLine(pivotX - Math.round(2 * u), ty + th - 2,
      pivotX + Math.round(2 * u), ty + 1, sec);
    buf.applySelectiveOutline(out);
    if (action === 'hurt') this.flashBuffer(buf);
    return this.makeNewFamilyFrame(buf, spec, action, direction, frameIndex, pivotX, pivotY,
      { head_mount: [hx, hy], core: [pivotX, runeY] });
  }

  /** Bipedal rib cage / goblin vest, articulated legs and hand-mounted sword. */
  private solveUndeadBiped(
    buf: PixelBuffer, spec: CreatureSpeciesProfile, action: CreatureActionId,
    direction: Direction8, frameIndex: number, totalFrames: number,
    u: number, pivotX: number, pivotY: number
  ): RenderedCreatureFrame {
    const [fx, fy] = direction8ToUnitVector(direction);
    const phase = (frameIndex / Math.max(1, totalFrames)) * Math.PI * 2;
    const main = hexToRgba(spec.primaryHex), shad = hexToRgba(spec.shadowHex);
    const high = hexToRgba(spec.highlightHex), sec = hexToRgba(spec.secondaryHex);
    const eye = hexToRgba(spec.accentHex), out = hexToRgba(spec.outlineHex);
    const stride = action === 'move' || action === 'sprint_flee'
      ? Math.round(Math.sin(phase) * (action === 'sprint_flee' ? 3.3 : 2.1) * u) : 0;
    const fall = action === 'death' ? Math.round(7 * u)
      : action === 'sleep' ? Math.round(4 * u) : 0;
    const pelvisY = pivotY - Math.round(4.5 * u) + fall;
    const torsoY = pelvisY - Math.round(4.8 * u);
    const headY = torsoY - Math.round(3.6 * u);
    const legThick = Math.max(1, Math.round(1.4 * u));
    for (const side of [-1, 1]) {
      const hipX = pivotX + Math.round(side * 1.2 * u);
      const footX = hipX + side * stride;
      buf.drawLine(hipX, pelvisY, hipX + Math.round((footX - hipX) * .45),
        pivotY - Math.round(2 * u), shad, legThick);
      buf.drawLine(hipX + Math.round((footX - hipX) * .45), pivotY - Math.round(2 * u),
        footX, pivotY, main, legThick);
    }
    const half = Math.max(2, Math.round(2.7 * u));
    buf.fillRect(pivotX - half, torsoY, half * 2 + 1, Math.max(3, Math.round(4.8 * u)),
      spec.features.hasExposedRibcage ? shad : main);
    if (spec.features.hasExposedRibcage) {
      for (let dy = Math.max(1, Math.round(.9 * u));
        dy < Math.round(4 * u); dy += Math.max(1, Math.round(.9 * u))) {
        buf.drawLine(pivotX - half + 1, torsoY + dy,
          pivotX + half - 1, torsoY + dy, high);
        buf.setPixel(pivotX, torsoY + dy + 1, sec);
      }
    } else {
      buf.fillRect(pivotX - half, pelvisY - Math.round(1.2 * u),
        half * 2 + 1, Math.max(1, Math.round(1.2 * u)), sec);
      buf.drawLine(pivotX - half, torsoY + 1,
        pivotX + half, pelvisY - 1, sec);
    }
    const hx = pivotX + Math.round(fx * .8 * u);
    buf.fillEllipse(hx, headY, Math.max(2, Math.round(2.7 * u)),
      Math.max(2, Math.round(2.5 * u)), main);
    if (spec.features.hasPointedEars) {
      const ear = Math.round(4.7 * u);
      buf.drawLine(hx - Math.round(2.6 * u), headY,
        hx - ear, headY - Math.round(1.1 * u), high);
      buf.drawLine(hx + Math.round(2.6 * u), headY,
        hx + ear, headY - Math.round(1.1 * u), high);
    }
    if (fy >= -.25) {
      buf.setPixel(hx - Math.round(u), headY, eye);
      buf.setPixel(hx + Math.round(u), headY, eye);
    }
    const swing = action === 'attack' || action === 'jump_pounce'
      ? Math.round(Math.sin(phase) * 3 * u) : 0;
    const handX = pivotX + half + Math.round(fx * 1.6 * u);
    const handY = torsoY + Math.round(3 * u) + swing;
    buf.drawLine(pivotX + half - 1, torsoY + 1, handX, handY, main, legThick);
    buf.drawLine(handX, handY, handX + Math.round(fx * 3.5 * u),
      handY - Math.round(3.8 * u) + swing, high, Math.max(1, Math.round(.7 * u)));
    buf.drawLine(pivotX - half + 1, torsoY + 1,
      pivotX - half - Math.round(fx * 1.4 * u), torsoY + Math.round(3.6 * u),
      shad, legThick);
    buf.applySelectiveOutline(out);
    if (action === 'hurt') this.flashBuffer(buf);
    return this.makeNewFamilyFrame(buf, spec, action, direction, frameIndex, pivotX, pivotY,
      { head_mount: [hx, headY], weapon_hand: [handX, handY] });
  }

  private makeNewFamilyFrame(
    buffer: PixelBuffer, spec: CreatureSpeciesProfile,
    action: CreatureActionId, direction: Direction8,
    frameIndex: number, pivotX: number, pivotY: number,
    extra: Readonly<Record<string, readonly [number, number]>> = {}
  ): RenderedCreatureFrame {
    const anchors: Record<string, AnchorPoint> = {};
    for (const [id, [x, y]] of Object.entries({
      ground_pivot: [pivotX, pivotY] as readonly [number, number], ...extra
    })) {
      anchors[id] = {
        id, texelX: x, texelY: y,
        normalizedX: x / buffer.width, normalizedY: y / buffer.height
      };
    }
    return {
      speciesId: spec.speciesId, family: spec.family, action, direction,
      frameIndex, buffer, pivotTexel: [pivotX, pivotY], anchors
    };
  }

  /** Additional surface tones are generated on native texels, not by enlarging a low-res raster. */
  private applyNativeMaterialDetail(
    buf: PixelBuffer, spec: CreatureSpeciesProfile,
    level: 1 | 2 | 3 | 4, groundY: number
  ): void {
    const highlight = hexToRgba(spec.highlightHex);
    const shadow = hexToRgba(spec.shadowHex);
    for (let y = 1; y < Math.min(groundY - 1, buf.height - 1); y++) {
      for (let x = 1; x < buf.width - 1; x++) {
        const offset = (y * buf.width + x) * 4;
        if (buf.data[offset + 3] < 200) continue;
        const grain = ((x * 37) ^ (y * 59) ^ (spec.widthModules * 17)) & 63;
        if (grain === 1 && level >= 2) buf.setPixel(x, y, highlight);
        else if (grain === 11 && level >= 3) buf.setPixel(x, y, shadow);
      }
    }
  }

  private applyCorruptionOverlay(buf: PixelBuffer): void {
    for (let i = 0; i < buf.data.length; i += 4) {
      if (buf.data[i + 3] < 200) continue;
      buf.data[i] = Math.round(buf.data[i] * .55 + 147 * .45);
      buf.data[i + 1] = Math.round(buf.data[i + 1] * .55 + 51 * .45);
      buf.data[i + 2] = Math.round(buf.data[i + 2] * .55 + 234 * .45);
    }
  }

  private applyWoundedMarks(buf: PixelBuffer, cx: number, cy: number): void {
    const red = hexToRgba('#dc2626');
    // Find an actual body pixel near the chest; never produce a detached wound.
    for (let radius = 0; radius <= 6; radius++) {
      for (const [dx, dy] of [[0, 0], [-radius, 0], [radius, 0], [0, -radius], [0, radius]]) {
        if (buf.isOpaque(cx + dx, cy + dy)) {
          buf.setPixel(cx + dx, cy + dy, red);
          if (buf.isOpaque(cx + dx + 1, cy + dy + 1)) {
            buf.setPixel(cx + dx + 1, cy + dy + 1, red);
          }
          return;
        }
      }
    }
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
