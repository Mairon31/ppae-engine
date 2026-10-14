import {
  AnatomicalJointId,
  ArtStyleProfile,
  CharacterActionId,
  CharacterRigPose,
  Direction8,
  EntityAppearance,
  JointTransform2D
} from '../core/contracts';

/**
 * Convierte un vector (dx, dy) en una de las 8 direcciones canónicas del motor.
 * Convención de pantalla/mundo top-down: +X = Este, -X = Oeste, +Y = Sur, -Y = Norte.
 */
export function resolveDirection8FromVector(vx: number, vy: number, fallback: Direction8 = 'S'): Direction8 {
  if (Math.abs(vx) < 1e-5 && Math.abs(vy) < 1e-5) {
    return fallback;
  }
  const angle = Math.atan2(vy, vx); // [-PI, PI], 0 = E, PI/2 = S, -PI/2 = N
  const octant = Math.round((angle / (Math.PI * 2)) * 8);
  const normalized = ((octant % 8) + 8) % 8;

  const map: readonly Direction8[] = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  return map[normalized];
}

/**
 * Retorna el vector unitario 2D asociado a cada una de las 8 direcciones.
 */
export function direction8ToUnitVector(dir: Direction8): readonly [number, number] {
  const invSqrt2 = 0.70710678;
  switch (dir) {
    case 'N':
      return [0, -1];
    case 'NE':
      return [invSqrt2, -invSqrt2];
    case 'E':
      return [1, 0];
    case 'SE':
      return [invSqrt2, invSqrt2];
    case 'S':
      return [0, 1];
    case 'SW':
      return [-invSqrt2, invSqrt2];
    case 'W':
      return [-1, 0];
    case 'NW':
      return [-invSqrt2, -invSqrt2];
  }
}

/**
 * Solver de esqueleto 2D en perspectiva 3/4 para las 8 direcciones.
 * Preserva la asimetría real entre el lado derecho (arma/herramienta) y el izquierdo (escudo).
 */
export class ProceduralCharacterRig {
  public evaluatePose(
    appearance: EntityAppearance,
    action: CharacterActionId,
    direction: Direction8,
    frameIndex: number,
    totalFrames: number,
    profile: ArtStyleProfile
  ): CharacterRigPose {
    const scaleUnit = profile.moduleSize === 6 ? 1.5 : 1.0;
    const hScale = Math.max(0.9, Math.min(1.1, appearance.heightScale));
    const phase = ((frameIndex % Math.max(1, totalFrames)) / Math.max(1, totalFrames)) * Math.PI * 2;

    // 1. Vector de mirada (forward) y vector lateral derecho anatómico del personaje (rightVec)
    // Si el personaje mira al Sur (0, +1), su brazo derecho está hacia el Oeste de la pantalla (-1, 0).
    // Si mira al Norte (0, -1), su brazo derecho está hacia el Este de la pantalla (+1, 0).
    const [fx, fy] = direction8ToUnitVector(direction);
    const rx = -fy; // Vector perpendicular derecho en espacio de mundo
    const ry = fx;

    const shoulderSpan =
      (appearance.bodyBuild === 'sturdy' ? 5 : appearance.bodyBuild === 'slim' ? 3.5 : 4.2) *
      scaleUnit;
    const hipSpan = Math.max(2, shoulderSpan * 0.55);

    const legLen = Math.round(6 * scaleUnit * hScale);
    const torsoLen = Math.round(7 * scaleUnit * hScale);
    const headOffset = Math.round(5 * scaleUnit * hScale);

    // 2. Cinemática discreta según la acción activa
    let bobY = 0;
    let torsoLeanX = 0;
    let torsoLeanY = 0;
    let rightStride = 0;
    let leftStride = 0;
    let rightFootLift = 0;
    let leftFootLift = 0;
    let rightArmForward = 0;
    let leftArmForward = 0;
    let rightArmRaiseY = 0;
    let weaponSwingAngleDeg = 0;
    let isCollapsedOnGround = false;

    switch (action) {
      case 'idle': {
        bobY = Math.round(Math.sin(phase) * 1.0);
        break;
      }
      case 'walk': {
        const s = Math.sin(phase);
        bobY = Math.abs(Math.round(Math.cos(phase * 2) * 1.2));
        rightStride = s * 3.2 * scaleUnit;
        leftStride = -s * 3.2 * scaleUnit;
        rightFootLift = s > 0 ? Math.round(s * 2 * scaleUnit) : 0;
        leftFootLift = -s > 0 ? Math.round(-s * 2 * scaleUnit) : 0;
        rightArmForward = -s * 2.5 * scaleUnit;
        leftArmForward = s * 2.5 * scaleUnit;
        break;
      }
      case 'run': {
        const s = Math.sin(phase);
        bobY = Math.abs(Math.round(Math.cos(phase * 2) * 2.0));
        torsoLeanX = Math.round(fx * 2.0 * scaleUnit);
        torsoLeanY = Math.round(fy * 1.5 * scaleUnit);
        rightStride = s * 4.8 * scaleUnit;
        leftStride = -s * 4.8 * scaleUnit;
        rightFootLift = s > 0 ? Math.round(s * 3.2 * scaleUnit) : 0;
        leftFootLift = -s > 0 ? Math.round(-s * 3.2 * scaleUnit) : 0;
        rightArmForward = -s * 4.0 * scaleUnit;
        leftArmForward = s * 4.0 * scaleUnit;
        break;
      }
      case 'attack':
      case 'use_tool': {
        // Secuencia: preparación (wind-up) -> impacto (strike) -> recuperación (recover)
        const progress = frameIndex / Math.max(1, totalFrames - 1);
        if (progress < 0.34) {
          // Wind-up: brazo derecho se eleva hacia atrás
          rightArmRaiseY = -Math.round(5 * scaleUnit);
          rightArmForward = -2.5 * scaleUnit;
          weaponSwingAngleDeg = -55;
        } else if (progress < 0.68) {
          // Strike frame: golpe contundente hacia adelante
          torsoLeanX = Math.round(fx * 2.2 * scaleUnit);
          torsoLeanY = Math.round(fy * 1.6 * scaleUnit);
          rightArmRaiseY = Math.round(1.5 * scaleUnit);
          rightArmForward = 5.5 * scaleUnit;
          weaponSwingAngleDeg = 45;
        } else {
          // Recuperación
          rightArmRaiseY = -Math.round(1.5 * scaleUnit);
          rightArmForward = 2.0 * scaleUnit;
          weaponSwingAngleDeg = 15;
        }
        break;
      }
      case 'hurt': {
        // Retroceso por impacto en sentido opuesto a la mirada
        const recoil = Math.sin((frameIndex / Math.max(1, totalFrames)) * Math.PI);
        torsoLeanX = Math.round(-fx * 2.8 * recoil * scaleUnit);
        torsoLeanY = Math.round(-fy * 2.0 * recoil * scaleUnit);
        bobY = -Math.round(recoil * 1.5 * scaleUnit);
        rightArmRaiseY = -Math.round(2 * recoil * scaleUnit);
        break;
      }
      case 'death': {
        const fallProgress = Math.min(1, frameIndex / Math.max(1, totalFrames - 1));
        bobY = Math.round(fallProgress * (legLen + torsoLen * 0.55));
        torsoLeanX = Math.round(rx * fallProgress * 4 * scaleUnit);
        isCollapsedOnGround = fallProgress >= 0.75;
        weaponSwingAngleDeg = 85;
        break;
      }
    }

    // 3. Construcción de posiciones 2D y orden de profundidad (zOrder) por articulación
    const pelvisY = -legLen + bobY;
    const torsoX = torsoLeanX;
    const torsoY = pelvisY - torsoLen + torsoLeanY;
    const headX = torsoX + Math.round(fx * 0.8);
    const headY = torsoY - headOffset;

    const shoulderRX = torsoX + Math.round(rx * shoulderSpan);
    const shoulderRY = torsoY + 1 + Math.round(ry * 1.4);
    const shoulderLX = torsoX - Math.round(rx * shoulderSpan);
    const shoulderLY = torsoY + 1 - Math.round(ry * 1.4);

    const handRX =
      shoulderRX + Math.round(fx * rightArmForward + rx * 1.0);
    const handRY =
      shoulderRY + Math.round(3.5 * scaleUnit + fy * rightArmForward * 0.6 + rightArmRaiseY);

    const handLX =
      shoulderLX + Math.round(fx * leftArmForward - rx * 1.0);
    const handLY =
      shoulderLY + Math.round(3.5 * scaleUnit + fy * leftArmForward * 0.6);

    const footRX = Math.round(rx * hipSpan + fx * rightStride);
    const footRY = Math.min(0, Math.round(ry * 1.2 + fy * rightStride * 0.45 - rightFootLift));

    const footLX = Math.round(-rx * hipSpan + fx * leftStride);
    const footLY = Math.min(0, Math.round(-ry * 1.2 + fy * leftStride * 0.45 - leftFootLift));

    // Profundidad relativa a la cámara (el eje +Y apunta hacia la cámara en vista top-down 3/4)
    const rightSideDepth = ry * 12 + (rightArmForward > 0 ? fy * 4 : 0);
    const leftSideDepth = -ry * 12 + (leftArmForward > 0 ? fy * 4 : 0);

    const weaponReach = Math.round(6 * scaleUnit);
    const radSwing = ((weaponSwingAngleDeg - 20) * Math.PI) / 180;
    const weaponTipX = handRX + Math.round((fx * Math.cos(radSwing) + rx * 0.35) * weaponReach);
    const weaponTipY = handRY + Math.round((fy * Math.cos(radSwing) + Math.sin(radSwing)) * weaponReach);

    const joints: Record<AnatomicalJointId, JointTransform2D> = {
      root: { jointId: 'root', x: 0, y: 0, zOrder: 0 },
      pelvis: { jointId: 'pelvis', x: 0, y: pelvisY, zOrder: 15 },
      foot_r: { jointId: 'foot_r', x: footRX, y: footRY, zOrder: 10 + Math.round(ry * 5) },
      foot_l: { jointId: 'foot_l', x: footLX, y: footLY, zOrder: 10 - Math.round(ry * 5) },
      torso: { jointId: 'torso', x: torsoX, y: torsoY, zOrder: 20 },
      shoulder_r: {
        jointId: 'shoulder_r',
        x: shoulderRX,
        y: shoulderRY,
        zOrder: 20 + Math.round(rightSideDepth)
      },
      shoulder_l: {
        jointId: 'shoulder_l',
        x: shoulderLX,
        y: shoulderLY,
        zOrder: 20 + Math.round(leftSideDepth)
      },
      hand_r: {
        jointId: 'hand_r',
        x: handRX,
        y: handRY,
        zOrder: 24 + Math.round(rightSideDepth)
      },
      hand_l: {
        jointId: 'hand_l',
        x: handLX,
        y: handLY,
        zOrder: 24 + Math.round(leftSideDepth)
      },
      head: { jointId: 'head', x: headX, y: headY, zOrder: 30 },
      weapon_tip: {
        jointId: 'weapon_tip',
        x: weaponTipX,
        y: weaponTipY,
        zOrder: 26 + Math.round(rightSideDepth)
      }
    };

    return {
      action,
      direction,
      frameIndex,
      totalFrames,
      isCollapsedOnGround,
      weaponSwingAngleDeg,
      joints
    };
  }
}
