import {
  AnchorPoint,
  ArtStyleProfile,
  CharacterActionId,
  CharacterRigPose,
  Direction8,
  EntityAppearance,
  EquipmentLoadout,
  PPAE_SCHEMA_VERSION,
  RGBAColor,
  VisualStatusEffect
} from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { direction8ToUnitVector, ProceduralCharacterRig } from './character-rig';

export const DEFAULT_HERO_APPEARANCE: EntityAppearance = {
  schemaVersion: PPAE_SCHEMA_VERSION,
  entityId: 'hero_wanderer',
  seed: 2026,
  bodyBuild: 'standard',
  heightScale: 1.0,
  skinColorHex: '#f2c29b',
  skinShadowHex: '#c98e63',
  eyeColorHex: '#1d4ed8',
  hairStyle: 'long_adventure',
  hairColorHex: '#5c3317',
  hairShadowHex: '#361b09',
  beardStyle: 'none',
  hasFacialScar: true,
  scarSide: 'right'
};

export const DEFAULT_HERO_EQUIPMENT: EquipmentLoadout = {
  helmet: 'none',
  helmetPrimaryHex: '#94a3b8',
  armor: 'leather_vest',
  armorPrimaryHex: '#2563eb',
  armorSecondaryHex: '#92400e',
  hasCape: true,
  capeColorHex: '#b91c1c',
  bootsColorHex: '#451a03',
  glovesColorHex: '#78350f',
  mainHand: 'iron_sword',
  offHand: 'wooden_shield'
};

export interface RenderedCharacterFrame {
  readonly buffer: PixelBuffer;
  readonly pose: CharacterRigPose;
  readonly pivotTexel: readonly [number, number];
  readonly anchors: Readonly<Record<string, AnchorPoint>>;
}

interface LayerDrawTask {
  readonly layerId: string;
  readonly zOrder: number;
  readonly draw: (buf: PixelBuffer) => void;
}

/**
 * Rasterizador composicional de personajes 2D.
 * Ordena dinámicamente las capas anatómicas y de equipamiento según la dirección de la cámara.
 */
export class CharacterAvatarGenerator {
  private readonly rig = new ProceduralCharacterRig();

  public renderCharacterFrame(
    appearance: EntityAppearance,
    equipment: EquipmentLoadout,
    action: CharacterActionId,
    direction: Direction8,
    frameIndex: number,
    totalFrames: number,
    profile: ArtStyleProfile,
    statusEffect: VisualStatusEffect = 'none'
  ): RenderedCharacterFrame {
    const mod = profile.moduleSize;
    const width = 6 * mod;  // 24px en 4x4, 36px en 6x6
    const height = 8 * mod; // 32px en 4x4, 48px en 6x6
    const buf = new PixelBuffer(width, height);

    const pivotX = Math.floor(width / 2);
    const pivotY = height - Math.max(3, Math.floor(mod * 0.8));

    const pose = this.rig.evaluatePose(
      appearance,
      action,
      direction,
      frameIndex,
      totalFrames,
      profile
    );

    const [fx, fy] = direction8ToUnitVector(direction);
    const isFacingNorth = fy < -0.2;
    const isFacingSouth = fy > 0.2;
    const u = mod === 6 ? 1.5 : 1.0;

    // Colores resueltos
    const skin = hexToRgba(appearance.skinColorHex);
    const skinShad = hexToRgba(appearance.skinShadowHex);
    const eyeCol = hexToRgba(appearance.eyeColorHex);
    const hair = hexToRgba(appearance.hairColorHex);
    const hairShad = hexToRgba(appearance.hairShadowHex);
    const armorMain = hexToRgba(equipment.armorPrimaryHex);
    const armorSec = hexToRgba(equipment.armorSecondaryHex);
    const capeCol = hexToRgba(equipment.capeColorHex);
    const bootsCol = hexToRgba(equipment.bootsColorHex);
    const glovesCol = hexToRgba(equipment.glovesColorHex);
    const outlineCol = hexToRgba('#141821');

    // Sombra elíptica de contacto sobre el suelo
    buf.fillEllipse(
      pivotX,
      pivotY + 1,
      Math.round(5 * u),
      Math.round(2 * u),
      { r: 15, g: 23, b: 42, a: 115 }
    );

    const j = pose.joints;
    const toScreenX = (jx: number) => pivotX + jx;
    const toScreenY = (jy: number) => pivotY + jy;

    const layers: LayerDrawTask[] = [];

    // 1. Capa / Mochila (detrás del torso cuando mira al Sur/Este/Oeste, delante cuando mira al Norte)
    if (equipment.hasCape) {
      layers.push({
        layerId: 'cape',
        zOrder: isFacingNorth ? 28 : 8,
        draw: (b) => {
          const tx = toScreenX(j.torso.x) - Math.round(fx * 2 * u);
          const ty = toScreenY(j.torso.y);
          const capeW = Math.round(7 * u);
          const capeH = Math.round(9 * u);
          b.fillRect(
            tx - Math.floor(capeW / 2),
            ty,
            capeW,
            capeH,
            capeCol
          );
        }
      });
    }

    // 2. Pierna y Bota Derecha
    layers.push({
      layerId: 'leg_r',
      zOrder: j.foot_r.zOrder,
      draw: (b) => {
        const px = toScreenX(j.pelvis.x + (j.foot_r.x > 0 ? 1 : -1));
        const py = toScreenY(j.pelvis.y);
        const fxScreen = toScreenX(j.foot_r.x);
        const fyScreen = toScreenY(j.foot_r.y);
        b.drawLine(px, py, fxScreen, fyScreen, armorSec, Math.max(2, Math.round(2 * u)));
        b.fillRect(fxScreen - 1, fyScreen - Math.round(2 * u), Math.round(3 * u), Math.round(2.5 * u), bootsCol);
      }
    });

    // 3. Pierna y Bota Izquierda
    layers.push({
      layerId: 'leg_l',
      zOrder: j.foot_l.zOrder,
      draw: (b) => {
        const px = toScreenX(j.pelvis.x + (j.foot_l.x > 0 ? 1 : -1));
        const py = toScreenY(j.pelvis.y);
        const fxScreen = toScreenX(j.foot_l.x);
        const fyScreen = toScreenY(j.foot_l.y);
        b.drawLine(px, py, fxScreen, fyScreen, armorSec, Math.max(2, Math.round(2 * u)));
        b.fillRect(fxScreen - 1, fyScreen - Math.round(2 * u), Math.round(3 * u), Math.round(2.5 * u), bootsCol);
      }
    });

    // 4. Torso y Armadura/Túnica
    layers.push({
      layerId: 'torso_armor',
      zOrder: j.torso.zOrder,
      draw: (b) => {
        const tx = toScreenX(j.torso.x);
        const ty = toScreenY(j.torso.y);
        const torsoRx =
          Math.round((appearance.bodyBuild === 'sturdy' ? 4.5 : appearance.bodyBuild === 'slim' ? 3.2 : 3.8) * u);
        const torsoRy = Math.round(4.5 * u);

        b.fillEllipse(tx, ty + Math.round(2 * u), torsoRx, torsoRy, armorMain);
        // Cinturón o detalle secundario de armadura
        b.fillRect(
          tx - torsoRx + 1,
          ty + Math.round(3.5 * u),
          torsoRx * 2 - 2,
          Math.max(1, Math.round(1.4 * u)),
          armorSec
        );
      }
    });

    // 5. Brazo, Mano y Arma/Herramienta Derecha (Main Hand)
    layers.push({
      layerId: 'arm_and_weapon_r',
      zOrder: j.hand_r.zOrder,
      draw: (b) => {
        const sx = toScreenX(j.shoulder_r.x);
        const sy = toScreenY(j.shoulder_r.y);
        const hx = toScreenX(j.hand_r.x);
        const hy = toScreenY(j.hand_r.y);

        b.drawLine(sx, sy, hx, hy, armorMain, Math.max(2, Math.round(2 * u)));
        b.fillRect(hx - 1, hy - 1, Math.round(2.2 * u), Math.round(2.2 * u), glovesCol);

        if (equipment.mainHand !== 'none') {
          const wx = toScreenX(j.weapon_tip.x);
          const wy = toScreenY(j.weapon_tip.y);
          const bladeColor =
            equipment.mainHand === 'oak_staff'
              ? hexToRgba('#92400e')
              : hexToRgba('#cbd5e1');
          const bladeHighlight =
            equipment.mainHand === 'oak_staff'
              ? hexToRgba('#38bdf8')
              : hexToRgba('#f8fafc');

          b.drawLine(hx, hy, wx, wy, bladeColor, Math.max(2, Math.round(1.8 * u)));
          b.setPixel(wx, wy, bladeHighlight);

          if (equipment.mainHand === 'woodcutter_axe' || equipment.mainHand === 'mining_pickaxe') {
            b.fillRect(wx - 2, wy - 1, Math.round(3.5 * u), Math.round(2.5 * u), hexToRgba('#94a3b8'));
          }
        }
      }
    });

    // 6. Brazo, Mano y Escudo/Accesorio Izquierdo (Off Hand)
    layers.push({
      layerId: 'arm_and_offhand_l',
      zOrder: j.hand_l.zOrder,
      draw: (b) => {
        const sx = toScreenX(j.shoulder_l.x);
        const sy = toScreenY(j.shoulder_l.y);
        const hx = toScreenX(j.hand_l.x);
        const hy = toScreenY(j.hand_l.y);

        b.drawLine(sx, sy, hx, hy, armorMain, Math.max(2, Math.round(2 * u)));
        b.fillRect(hx - 1, hy - 1, Math.round(2.2 * u), Math.round(2.2 * u), glovesCol);

        if (equipment.offHand === 'wooden_shield' || equipment.offHand === 'knight_kite_shield') {
          const shieldFill =
            equipment.offHand === 'knight_kite_shield'
              ? hexToRgba('#3b82f6')
              : hexToRgba('#854d0e');
          const shieldRim = hexToRgba('#cbd5e1');
          const rShield = Math.round(2.6 * u);
          b.fillEllipse(hx, hy, rShield, rShield + 1, shieldRim);
          b.fillEllipse(hx, hy, Math.max(1, rShield - 1), rShield, shieldFill);
        } else if (equipment.offHand === 'lantern') {
          b.fillRect(hx - 1, hy + 1, Math.round(2.2 * u), Math.round(3 * u), hexToRgba('#facc15'));
        }
      }
    });

    // 7. Cabeza, Rostro, Ojos, Cicatriz Asimétrica, Barba y Cabello/Casco
    layers.push({
      layerId: 'head_and_features',
      zOrder: j.head.zOrder,
      draw: (b) => {
        const hx = toScreenX(j.head.x);
        const hy = toScreenY(j.head.y);
        const headRx = Math.round(3.6 * u);
        const headRy = Math.round(3.8 * u);

        // Cráneo base
        b.fillEllipse(hx, hy + 1, headRx, headRy, skinShad);
        b.fillEllipse(hx, hy, headRx, headRy - 1, skin);

        // Si no mira hacia el Norte, dibujar ojos, barba y cicatriz en la dirección correcta
        if (!isFacingNorth) {
          const eyeShiftX = Math.round(fx * 1.6 * u);
          const eyeY = hy + (isFacingSouth ? 1 : 0);

          if (Math.abs(fx) > 0.85) {
            // Vista de perfil (E o W): un solo ojo visible hacia el frente
            b.setPixel(hx + eyeShiftX, eyeY, eyeCol);
          } else {
            // Vista frontal o 3/4 (S, SE, SW): dos ojos visibles
            b.setPixel(hx + eyeShiftX - Math.round(1.4 * u), eyeY, eyeCol);
            b.setPixel(hx + eyeShiftX + Math.round(1.4 * u), eyeY, eyeCol);
          }

          // Cicatriz facial asimétrica (preserva el lado anatómico real)
          if (appearance.hasFacialScar) {
            const rxCheek = -fy; // Vector del pómulo derecho
            const scarDirSign = appearance.scarSide === 'right' ? 1 : -1;
            const cheekScreenOffset = rxCheek * scarDirSign;
            if (cheekScreenOffset >= -0.2) {
              const sx = hx + Math.round(cheekScreenOffset * 2 * u);
              b.setPixel(sx, eyeY + 1, hexToRgba('#991b1b'));
              b.setPixel(sx, eyeY + 2, hexToRgba('#991b1b'));
            }
          }

          // Barba / Bigote
          if (appearance.beardStyle !== 'none') {
            const beardW = Math.round(3.2 * u);
            const beardH = appearance.beardStyle === 'full_beard' ? Math.round(2.5 * u) : 1;
            b.fillRect(hx + eyeShiftX - Math.floor(beardW / 2), eyeY + 2, beardW, beardH, hairShad);
          }
        }

        // Cabello o Casco
        if (equipment.helmet !== 'none') {
          const helmCol = hexToRgba(equipment.helmetPrimaryHex);
          b.fillEllipse(hx, hy - Math.round(1.5 * u), headRx + 1, Math.round(2.6 * u), helmCol);
        } else if (appearance.hairStyle !== 'bald') {
          b.fillEllipse(hx, hy - Math.round(1.6 * u), headRx, Math.round(2.4 * u), hair);
          if (isFacingNorth || appearance.hairStyle === 'long_adventure') {
            // Cabello posterior cubriendo nuca cuando mira al Norte o lleva cabello largo
            const backHairX = hx - Math.round(fx * 1.5 * u);
            b.fillRect(
              backHairX - headRx + 1,
              hy - 1,
              headRx * 2 - 2,
              Math.round((isFacingNorth ? 4.2 : 2.5) * u),
              hairShad
            );
          }
        }
      }
    });

    // Ordenar capas estrictamente por zOrder y rasterizar
    layers.sort((a, b) => a.zOrder - b.zOrder);
    for (const layer of layers) {
      layer.draw(buf);
    }

    // Contorno selectivo exterior
    if (profile.outlineMode !== 'none') {
      buf.applySelectiveOutline(outlineCol);
    }

    // Tintes de estado de gameplay (daño, veneno, congelación, quemadura)
    if (statusEffect !== 'none') {
      this.applyStatusTint(buf, statusEffect);
    }

    return {
      buffer: buf,
      pose,
      pivotTexel: [pivotX, pivotY],
      anchors: {
        ground_pivot: {
          id: 'ground_pivot',
          texelX: pivotX,
          texelY: pivotY,
          normalizedX: pivotX / width,
          normalizedY: pivotY / height
        },
        main_hand: {
          id: 'main_hand',
          texelX: toScreenX(j.hand_r.x),
          texelY: toScreenY(j.hand_r.y),
          normalizedX: toScreenX(j.hand_r.x) / width,
          normalizedY: toScreenY(j.hand_r.y) / height
        },
        off_hand: {
          id: 'off_hand',
          texelX: toScreenX(j.hand_l.x),
          texelY: toScreenY(j.hand_l.y),
          normalizedX: toScreenX(j.hand_l.x) / width,
          normalizedY: toScreenY(j.hand_l.y) / height
        },
        head_top: {
          id: 'head_top',
          texelX: toScreenX(j.head.x),
          texelY: toScreenY(j.head.y) - Math.round(4 * u),
          normalizedX: toScreenX(j.head.x) / width,
          normalizedY: (toScreenY(j.head.y) - Math.round(4 * u)) / height
        }
      }
    };
  }

  private applyStatusTint(buf: PixelBuffer, status: VisualStatusEffect): void {
    if (status === 'none') return;
    const tintMap: Record<Exclude<VisualStatusEffect, 'none'>, RGBAColor> = {
      hurt_flash: { r: 255, g: 245, b: 245, a: 255 },
      poisoned: { r: 74, g: 222, b: 128, a: 255 },
      frozen: { r: 125, g: 211, b: 252, a: 255 },
      burning: { r: 251, g: 146, b: 60, a: 255 }
    };
    const tint = tintMap[status];
    const mix = status === 'hurt_flash' ? 0.65 : 0.4;

    for (let i = 0; i < buf.data.length; i += 4) {
      if (buf.data[i + 3] === 0) continue;
      buf.data[i] = Math.round(buf.data[i] * (1 - mix) + tint.r * mix);
      buf.data[i + 1] = Math.round(buf.data[i + 1] * (1 - mix) + tint.g * mix);
      buf.data[i + 2] = Math.round(buf.data[i + 2] * (1 - mix) + tint.b * mix);
    }
  }
}
