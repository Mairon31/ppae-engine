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

/** Shift an already-resolved RGBA color without changing opacity. */
function adjustColorBrightness(color: RGBAColor, delta: number): RGBAColor {
  const channel = (c: number) => Math.max(0, Math.min(255, Math.round(c + delta)));
  return { r: channel(color.r), g: channel(color.g), b: channel(color.b), a: color.a };
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
    const isProfileSide = Math.abs(fx) > 0.85;
    const u = mod === 6 ? 1.5 : 1.0;

    // Colores resueltos
    const skin = hexToRgba(appearance.skinColorHex);
    const skinShad = hexToRgba(appearance.skinShadowHex);
    const skinHigh = adjustColorBrightness(skin, 18);
    const eyeCol = hexToRgba(appearance.eyeColorHex);
    const hair = hexToRgba(appearance.hairColorHex);
    const hairShad = hexToRgba(appearance.hairShadowHex);
    const hairHigh = adjustColorBrightness(hair, 24);
    const armorMain = hexToRgba(equipment.armorPrimaryHex);
    const armorShad = adjustColorBrightness(armorMain, -32);
    const armorHigh = adjustColorBrightness(armorMain, 26);
    const armorSec = hexToRgba(equipment.armorSecondaryHex);
    const capeCol = hexToRgba(equipment.capeColorHex);
    const capeShad = adjustColorBrightness(capeCol, -35);
    const bootsCol = hexToRgba(equipment.bootsColorHex);
    const bootsHigh = adjustColorBrightness(bootsCol, 22);
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

    // A cape is always behind the body when facing forward. In rear views,
    // it covers the central back but never the face or the hands.
    if (equipment.hasCape) {
      layers.push({
        layerId: 'cape',
        zOrder: isFacingNorth ? 27 : 7,
        draw: (b) => {
          const tx = toScreenX(j.torso.x) - Math.round(fx * 1.5 * u);
          const ty = toScreenY(j.torso.y);
          const topW = Math.max(4, Math.round(5.5 * u));
          const lowerW = Math.max(6, Math.round(7.5 * u));
          const capeH = Math.round(9.5 * u);
          for (let dy = 0; dy < capeH; dy++) {
            const t = dy / Math.max(1, capeH - 1);
            const rowW = Math.round(topW * (1 - t) + lowerW * t);
            const leftX = tx - Math.floor(rowW / 2);
            for (let dx = 0; dx < rowW; dx++) {
              const fold = dx === 0 || dx === rowW - 1 || (dy > 2 && dx % 4 === 0);
              b.setPixel(leftX + dx, ty + dy, fold ? capeShad : capeCol);
            }
          }
        }
      });
    }

    // Profession packs sit behind the torso facing S and to the visible rear
    // of the torso facing N. Profile views shift them away from the chest.
    if (equipment.backpack && equipment.backpack !== 'none') {
      const packColor = hexToRgba(equipment.backpackColorHex ?? '#92400e');
      const packDark = adjustColorBrightness(packColor, -30);
      const packHigh = adjustColorBrightness(packColor, 24);
      const strapColor = hexToRgba('#451a03');
      layers.push({
        layerId: 'backpack',
        zOrder: isFacingNorth ? 28 : 9,
        draw: (b) => {
          const tx = toScreenX(j.torso.x) - Math.round(fx * 2.2 * u);
          const ty = toScreenY(j.torso.y);
          const packW = Math.max(4, Math.round(
            (isProfileSide ? 3.2 : equipment.backpack === 'quiver' ? 3 : 5.4) * u));
          const packH = Math.max(4, Math.round(
            (equipment.backpack === 'quiver' ? 6.5 : 5.2) * u));
          const px = tx - Math.floor(packW / 2);
          b.fillRect(px, ty, packW, packH, packDark);
          b.fillRect(px + 1, ty, Math.max(2, packW - 2), packH - 1, packColor);
          b.fillRect(px + 1, ty, Math.max(2, packW - 2),
            Math.max(1, Math.round(1.3 * u)), packHigh);
          b.drawLine(px, ty + packH - 1, px + packW - 1, ty + packH - 1, packDark);
          if (equipment.backpack === 'miner_basket') {
            for (let k = 0; k < Math.max(1, packW - 2); k += 2) {
              b.drawLine(px + 1 + k, ty + 1, px + 1 + k, ty + packH - 2, packDark);
            }
            b.setPixel(tx - 1, ty - 1, hexToRgba('#38bdf8'));
            b.setPixel(tx + 1, ty - 1, hexToRgba('#facc15'));
          } else if (equipment.backpack === 'quiver') {
            b.drawLine(tx, ty, tx + Math.round(2 * u), ty - Math.round(4 * u),
              hexToRgba('#e2e8f0'));
            b.setPixel(tx + Math.round(2 * u), ty - Math.round(4 * u),
              hexToRgba('#facc15'));
          } else if (equipment.backpack === 'herbalist_satchel') {
            b.drawLine(px, ty + 1, px + packW - 1, ty + packH - 2, strapColor);
            b.setPixel(tx, ty + Math.floor(packH / 2), hexToRgba('#facc15'));
          } else {
            b.fillRect(px + 1, ty + Math.floor(packH * .55),
              Math.max(2, packW - 2), 1, packDark);
            b.setPixel(tx, ty + Math.floor(packH * .55), hexToRgba('#facc15'));
          }
          // Straps must not override the front face; they live under the torso
          // when the avatar faces South.
          if (isFacingNorth) {
            b.setPixel(toScreenX(j.shoulder_l.x), toScreenY(j.shoulder_l.y), strapColor);
            b.setPixel(toScreenX(j.shoulder_r.x), toScreenY(j.shoulder_r.y), strapColor);
          }
        }
      });
    }

    // The back hair is an independent depth layer, never a foreground
    // rectangle painted after eyes and facial features.
    if (equipment.helmet === 'none' && appearance.hairStyle !== 'bald' &&
      (isFacingNorth || appearance.hairStyle === 'long_adventure' ||
        appearance.hairStyle === 'ponytail' ||
        appearance.hairStyle === 'wavy_shoulder' ||
        appearance.hairStyle === 'braided_crown')) {
      layers.push({
        layerId: 'hair_back',
        zOrder: isFacingNorth ? j.head.zOrder + 2 : j.neck.zOrder - 2,
        draw: (b) => {
          const hx = toScreenX(j.head.x);
          const hy = toScreenY(j.head.y);
          const rx = Math.max(3, Math.round(3.4 * u));
          if (appearance.hairStyle === 'ponytail') {
            const tailX = hx - Math.round(fx * 3 * u);
            b.fillEllipse(tailX, hy + Math.round(2 * u),
              Math.max(1, Math.round(1.6 * u)), Math.round(2.8 * u), hairShad);
            b.setPixel(tailX, hy + 1, hair);
          } else {
            const startY = isFacingNorth ? hy - Math.round(1.5 * u) : hy + 1;
            const drop = Math.round((isFacingNorth ? 4.8 : 4.2) * u);
            const leftX = hx - rx - Math.round(fx * 0.8 * u);
            b.fillRect(leftX, startY, rx * 2, drop, hairShad);
            if (isFacingNorth) {
              b.fillRect(leftX + 1, startY, rx * 2 - 2, Math.max(2, drop - 2), hair);
              b.setPixel(hx - 1, startY, hairHigh);
            }
          }
        }
      });
    }

    // Legs consist of thigh, knee, shin and directional boots, each using
    // the actual animation pose so the knee follows stride and lift.
    for (const side of ['r', 'l'] as const) {
      const knee = side === 'r' ? j.knee_r : j.knee_l;
      const foot = side === 'r' ? j.foot_r : j.foot_l;
      layers.push({
        layerId: `leg_${side}`,
        zOrder: foot.zOrder,
        draw: (b) => {
          const hipX = toScreenX(j.pelvis.x + (foot.x >= 0 ? 1 : -1));
          const hipY = toScreenY(j.pelvis.y);
          const kx = toScreenX(knee.x);
          const ky = toScreenY(knee.y);
          const fxScreen = toScreenX(foot.x);
          const fyScreen = toScreenY(foot.y);
          const thick = Math.max(2, Math.round(1.8 * u));
          b.drawLine(hipX, hipY, kx, ky, armorSec, thick);
          b.drawLine(kx, ky, fxScreen, fyScreen, armorShad, thick);
          b.setPixel(kx, ky, armorHigh);
          const toeShift = Math.round(fx * u);
          const bootW = Math.max(2, Math.round(2.8 * u));
          const bootH = Math.max(2, Math.round(2.2 * u));
          b.fillRect(fxScreen - 1 + Math.min(0, toeShift), fyScreen - bootH + 1,
            bootW, bootH, bootsCol);
          b.setPixel(fxScreen + toeShift, fyScreen - bootH + 1, bootsHigh);
        }
      });
    }

    // Trapezoidal shoulders/chest, tapered waist, banded belt and pelvic hem.
    layers.push({
      layerId: 'torso_armor',
      zOrder: j.torso.zOrder,
      draw: (b) => {
        const tx = toScreenX(j.torso.x);
        const ty = toScreenY(j.torso.y);
        const compression = isProfileSide ? 0.74 : Math.max(.82, 1 - Math.abs(fx) * .1);
        const chest = Math.max(2, Math.round(
          (appearance.bodyBuild === 'sturdy' ? 4.4 :
           appearance.bodyBuild === 'slim' ? 3 : 3.6) * u * compression));
        const waist = Math.max(2, chest - 1);
        const torsoH = Math.max(5, Math.round(6.8 * u));
        for (let dy = 0; dy < torsoH; dy++) {
          const half = dy >= Math.floor(torsoH * .62) ? waist : chest;
          for (let dx = -half; dx <= half; dx++) {
            const color = dy === 0 || (dx < -half * .25 && dy < torsoH * .55)
              ? armorHigh : dx > half * .3 || dy === torsoH - 1
              ? armorShad : armorMain;
            b.setPixel(tx + dx, ty + dy, color);
          }
        }
        if (!isFacingNorth) {
          b.setPixel(tx, ty, armorSec);
          b.setPixel(tx, ty + 1, skinShad);
        }
        const beltY = ty + Math.floor(torsoH * .72);
        b.fillRect(tx - waist, beltY, waist * 2 + 1,
          Math.max(1, Math.round(1.2 * u)), armorSec);
        b.setPixel(tx + Math.round(fx), beltY, hexToRgba('#eab308'));
        if (equipment.armor === 'mage_robe') {
          b.fillRect(tx - waist, beltY + 1, waist * 2 + 1, Math.round(3.5 * u), armorShad);
          b.drawLine(tx, ty + 2, tx, beltY - 1, armorSec);
        }

        // Outfit geometry and trims are structurally distinct even when the
        // primary material colors are exactly the same.
        if (equipment.armor === 'cloth_tunic') {
          b.drawLine(tx - waist, beltY - 1, tx - waist + 1, ty + 1, armorSec);
          b.setPixel(tx, ty + 2, armorHigh);
        } else if (equipment.armor === 'leather_vest') {
          if (!isFacingNorth) {
            b.drawLine(tx, ty + 1, tx, beltY - 1, armorSec);
            b.drawLine(tx - chest + 1, ty + 1, tx + chest - 1,
              beltY - 1, hexToRgba('#451a03'));
          }
        } else if (equipment.armor === 'iron_plate') {
          b.fillRect(tx - chest, ty, chest * 2 + 1, 1, armorHigh);
          b.drawLine(tx - 1, ty + 1, tx - 1, beltY - 1, hexToRgba('#f8fafc'));
          b.drawLine(tx + chest - 1, ty + 1, tx + chest - 1,
            beltY - 1, armorShad);
        } else if (equipment.armor === 'farmer_overalls') {
          b.fillRect(tx - chest, ty, chest * 2 + 1,
            Math.max(2, Math.floor(torsoH * .3)), armorSec);
          if (!isFacingNorth) {
            b.drawLine(tx - Math.max(1, Math.round(2 * u)), ty,
              tx - Math.max(1, Math.round(2 * u)), beltY, armorMain);
            b.drawLine(tx + Math.max(1, Math.round(2 * u)), ty,
              tx + Math.max(1, Math.round(2 * u)), beltY, armorMain);
            b.fillRect(tx - 2, beltY - 2, 5, 2, armorHigh);
          }
        } else if (equipment.armor === 'blacksmith_apron') {
          const apronW = Math.max(3, waist * 2 - 1);
          const apronX = tx - Math.floor(apronW / 2);
          b.fillRect(apronX, ty + 1, apronW,
            torsoH + Math.round(1.5 * u), armorSec);
          b.drawLine(apronX, ty + 1, apronX, ty + torsoH, armorShad);
          b.setPixel(tx, beltY + 1, hexToRgba('#b45309'));
        } else if (equipment.armor === 'noble_coat') {
          b.drawLine(tx - waist, ty + 1, tx - 1, beltY, armorSec);
          b.drawLine(tx + waist, ty + 1, tx + 1, beltY, armorSec);
          if (!isFacingNorth) {
            for (let py = ty + 1; py < ty + torsoH - 1; py += 2) {
              b.setPixel(tx, py, hexToRgba('#facc15'));
            }
          }
        }
      }
    });

    layers.push({
      layerId: 'neck_column',
      zOrder: j.neck.zOrder,
      draw: (b) => {
        const nx = toScreenX(j.neck.x);
        const ny = toScreenY(j.neck.y);
        const neckW = Math.max(2, Math.round(2.2 * u));
        const neckH = Math.max(2, Math.round(2 * u));
        b.fillRect(nx - Math.floor(neckW / 2), ny, neckW, neckH, skinShad);
        b.setPixel(nx - 1, ny, skin);
      }
    });

    // Forearms are independently articulated; left-hand and right-hand
    // equipment remain attached to the original hand/weapon_tip joints.
    layers.push({
      layerId: 'arm_and_weapon_r',
      zOrder: j.hand_r.zOrder,
      draw: (b) => {
        const sx = toScreenX(j.shoulder_r.x), sy = toScreenY(j.shoulder_r.y);
        const ex = toScreenX(j.elbow_r.x), ey = toScreenY(j.elbow_r.y);
        const hx = toScreenX(j.hand_r.x), hy = toScreenY(j.hand_r.y);
        const thickness = Math.max(2, Math.round(1.8 * u));
        b.fillRect(sx - 1, sy - 1, Math.max(2, Math.round(2.2 * u)),
          Math.max(2, Math.round(2 * u)), armorHigh);
        b.drawLine(sx, sy, ex, ey, armorMain, thickness);
        b.drawLine(ex, ey, hx, hy, skinShad, Math.max(1, thickness - 1));
        b.fillRect(hx - 1, hy - 1, Math.max(2, Math.round(2.2 * u)),
          Math.max(2, Math.round(2.2 * u)), glovesCol);
        b.setPixel(hx, hy - 1, skin);
        if (equipment.mainHand !== 'none') {
          const wx = toScreenX(j.weapon_tip.x), wy = toScreenY(j.weapon_tip.y);
          // Profession-specific tool silhouettes; all pivot at the real
          // anatomical main-hand joint (never a detached flat icon).
          const timber = hexToRgba('#92400e');
          const steel = hexToRgba('#cbd5e1');
          const gleam = hexToRgba('#f8fafc');
          if (equipment.mainHand === 'hunting_bow') {
            const tipX = hx + Math.round(fx * 2 * u);
            const topY = hy - Math.max(3, Math.round(4 * u));
            const botY = hy + Math.max(3, Math.round(4 * u));
            b.drawLine(tipX, topY, tipX + Math.round(2 * u), hy, timber);
            b.drawLine(tipX + Math.round(2 * u), hy, tipX, botY, timber);
            b.drawLine(tipX, topY, tipX, botY, gleam);
            b.drawLine(hx, hy, tipX + Math.round(2 * u), hy, timber);
          } else if (equipment.mainHand === 'fishing_rod') {
            b.drawLine(hx, hy, wx + 2, wy - 2, hexToRgba('#a16207'));
            b.drawLine(wx + 2, wy - 2, wx + 2, wy + 3, gleam);
            b.setPixel(wx + 2, wy + 3, hexToRgba('#ef4444'));
          } else {
            const isWood = equipment.mainHand === 'oak_staff' ||
              equipment.mainHand === 'wooden_hoe' ||
              equipment.mainHand === 'smith_hammer';
            b.drawLine(hx, hy, wx, wy, isWood ? timber : steel,
              Math.max(1, Math.round((isWood ? 1.4 : 1.8) * u)));
            b.setPixel(wx, wy, isWood ? hexToRgba('#38bdf8') : gleam);
            if (equipment.mainHand === 'woodcutter_axe' ||
                equipment.mainHand === 'mining_pickaxe' ||
                equipment.mainHand === 'smith_hammer') {
              const headColor = equipment.mainHand === 'smith_hammer'
                ? hexToRgba('#64748b') : hexToRgba('#94a3b8');
              b.fillRect(wx - Math.round(2 * u), wy - 1,
                Math.max(2, Math.round(3.5 * u)),
                Math.max(2, Math.round((equipment.mainHand === 'smith_hammer' ? 2.6 : 2.5) * u)),
                headColor);
              b.setPixel(wx - 1, wy - 1, gleam);
            } else if (equipment.mainHand === 'wooden_hoe') {
              b.drawLine(wx - Math.round(2.5 * u), wy,
                wx + Math.round(2.5 * u), wy, steel, 2);
              b.setPixel(wx - Math.round(2 * u), wy - 1, gleam);
            }
          }
        }
      }
    });

    layers.push({
      layerId: 'arm_and_offhand_l',
      zOrder: j.hand_l.zOrder,
      draw: (b) => {
        const sx = toScreenX(j.shoulder_l.x), sy = toScreenY(j.shoulder_l.y);
        const ex = toScreenX(j.elbow_l.x), ey = toScreenY(j.elbow_l.y);
        const hx = toScreenX(j.hand_l.x), hy = toScreenY(j.hand_l.y);
        const thickness = Math.max(2, Math.round(1.8 * u));
        b.fillRect(sx - 1, sy - 1, Math.max(2, Math.round(2 * u)),
          Math.max(2, Math.round(2 * u)), armorHigh);
        b.drawLine(sx, sy, ex, ey, armorShad, thickness);
        b.drawLine(ex, ey, hx, hy, skinShad, Math.max(1, thickness - 1));
        b.fillRect(hx - 1, hy - 1, Math.max(2, Math.round(2.2 * u)),
          Math.max(2, Math.round(2.2 * u)), glovesCol);
        if (equipment.offHand === 'wooden_shield' || equipment.offHand === 'knight_kite_shield') {
          const fill = hexToRgba(equipment.offHand === 'wooden_shield' ? '#854d0e' : '#3b82f6');
          const rim = hexToRgba('#cbd5e1');
          const r = Math.round(2.6 * u);
          b.fillEllipse(hx, hy, r, r + 1, rim);
          b.fillEllipse(hx, hy, Math.max(1, r - 1), r, fill);
        } else if (equipment.offHand === 'lantern') {
          b.fillRect(hx - 1, hy + 1, Math.max(2, Math.round(2.2 * u)),
            Math.max(2, Math.round(3 * u)), hexToRgba('#facc15'));
        } else if (equipment.offHand === 'spell_tome') {
          b.fillRect(hx - 2, hy - 2, Math.max(3, Math.round(2.8 * u)),
            Math.max(4, Math.round(3.4 * u)), hexToRgba('#7c3aed'));
          b.drawLine(hx, hy - 1, hx, hy + 2, hexToRgba('#c4b5fd'));
          b.setPixel(hx, hy, hexToRgba('#fde047'));
        } else if (equipment.offHand === 'harvest_basket') {
          const basket = hexToRgba('#b45309');
          b.fillEllipse(hx, hy + 1, Math.round(2.4 * u),
            Math.round(2 * u), basket);
          b.drawLine(hx - 2, hy, hx, hy - 2, hexToRgba('#92400e'));
          b.drawLine(hx, hy - 2, hx + 2, hy, hexToRgba('#92400e'));
          b.setPixel(hx, hy, hexToRgba('#ef4444'));
        }
      }
    });

    // The head is always on top of the background hair, so the eyes and
    // nose bridge cannot be overwritten by its long-hair rear silhouette.
    layers.push({
      layerId: 'head_and_features',
      zOrder: j.head.zOrder,
      draw: (b) => {
        const hx = toScreenX(j.head.x), hy = toScreenY(j.head.y);
        const headRx = Math.max(3, Math.round((isProfileSide ? 3 : 3.4) * u));
        const headRy = Math.max(3, Math.round(
          (appearance.ageGroup === 'youth' ? 3.45 : 3.6) * u));
        // Rounded cranium, cheekbones and a progressively narrowed jaw.
        for (let dy = -headRy; dy <= headRy; dy++) {
          const half = dy > 1
            ? Math.max(1, headRx - Math.ceil((dy - 1) * .75))
            : Math.max(1, Math.round(headRx *
                Math.sqrt(Math.max(.12, 1 - Math.pow((dy + 1) / (headRy + 2), 2)))));
          for (let dx = -half; dx <= half; dx++) {
            const tone = dy === headRy || dx > half * .45
              ? skinShad : dy < -1 && dx < 0 ? skinHigh : skin;
            b.setPixel(hx + dx, hy + dy, tone);
          }
        }

        // Fantasy cranial attributes anchored on the anatomical cranium.
        if (appearance.earStyle === 'elf_pointed' || appearance.earStyle === 'fae_long') {
          const reach = appearance.earStyle === 'fae_long'
            ? Math.round(3 * u) : Math.round(2 * u);
          b.drawLine(hx - headRx, hy, hx - headRx - reach, hy - 2, skinHigh);
          b.drawLine(hx + headRx, hy, hx + headRx + reach, hy - 2, skin);
        }
        if (appearance.hornStyle === 'small_oni') {
          const horn = hexToRgba('#e2e8f0');
          b.drawLine(hx - headRx + 1, hy - headRy + 1,
            hx - headRx, hy - headRy - Math.round(2 * u), horn);
          b.drawLine(hx + headRx - 1, hy - headRy + 1,
            hx + headRx, hy - headRy - Math.round(2 * u), horn);
        } else if (appearance.hornStyle === 'curved_ram') {
          const horn = hexToRgba('#cbd5e1');
          for (const side of [-1, 1]) {
            b.drawLine(hx + side * (headRx - 1), hy - headRy + 2,
              hx + side * (headRx + 2), hy - headRy, horn);
            b.drawLine(hx + side * (headRx + 2), hy - headRy,
              hx + side * (headRx + 1), hy - headRy - Math.round(2 * u), horn);
          }
        }

        if (!isFacingNorth) {
          const eyeShiftX = Math.round(fx * 1.4 * u);
          const eyeY = hy; // S-facing eyes remain at the established eye anchor.
          const expression = action === 'sleeping' ? 'blink' : (appearance.expression ?? 'neutral');
          const brow = appearance.ageGroup === 'elder'
            ? hexToRgba('#cbd5e1') : hairShad;
          if (isProfileSide) {
            const eyeX = hx + eyeShiftX;
            b.setPixel(eyeX, eyeY - 1, brow);
            if (expression !== 'blink') b.setPixel(eyeX, eyeY, eyeCol);
            else b.setPixel(eyeX, eyeY, brow);
            b.setPixel(hx + Math.round(fx * headRx), eyeY + 1, skinHigh);
          } else {
            const eyeSpan = Math.max(2, Math.round(1.6 * u));
            const lx = hx + eyeShiftX - eyeSpan;
            const rx = hx + eyeShiftX + eyeSpan;
            b.setPixel(lx, eyeY - 1, brow);
            b.setPixel(rx, eyeY - 1, brow);
            const eyeTone = expression === 'blink' ? brow : eyeCol;
            b.setPixel(lx, eyeY, eyeTone);
            b.setPixel(rx, eyeY, eyeTone);
            if (u >= 1.5 && expression !== 'blink') {
              b.setPixel(lx, eyeY + 1, eyeCol);
              b.setPixel(rx, eyeY + 1, eyeCol);
            }
            // Subtle nose and mouth below the actual eye line.
            b.setPixel(hx + eyeShiftX, eyeY + Math.max(2, Math.round(1.8 * u)),
              skinShad);
            if (expression === 'happy') {
              b.setPixel(hx + eyeShiftX - 1, eyeY + Math.round(3 * u), hairShad);
              b.setPixel(hx + eyeShiftX + 1, eyeY + Math.round(3 * u), hairShad);
            }
            if (expression === 'surprised') {
              b.setPixel(hx + eyeShiftX, eyeY + Math.round(3 * u), hairShad);
            }
          }
          // Marks are deliberately below/above the eye line, never on the pupils.
          if (appearance.faceMarking === 'freckles') {
            const freckle = hexToRgba('#a66d3f');
            b.setPixel(hx - headRx + 1, eyeY + 2, freckle);
            b.setPixel(hx + headRx - 1, eyeY + 2, freckle);
          } else if (appearance.faceMarking === 'war_paint') {
            const pigment = hexToRgba('#dc2626');
            b.drawLine(hx - headRx + 1, eyeY + 2,
              hx - headRx + 2, eyeY + 3, pigment);
            b.drawLine(hx + headRx - 1, eyeY + 2,
              hx + headRx - 2, eyeY + 3, pigment);
          } else if (appearance.faceMarking === 'arcane_rune') {
            b.setPixel(hx + eyeShiftX, hy - headRy + 2, hexToRgba('#38bdf8'));
          }
          if (appearance.ageGroup === 'elder') {
            const wrinkle = skinShad;
            b.setPixel(hx - headRx + 1, eyeY + 2, wrinkle);
            b.setPixel(hx + headRx - 1, eyeY + 2, wrinkle);
          }
          // Anatomical scar follows the visible cheek in each facing direction.
          if (appearance.hasFacialScar) {
            const cheekSide = -fy * (appearance.scarSide === 'right' ? 1 : -1);
            if (cheekSide >= -.2) {
              const sx = hx + Math.round(cheekSide * 2 * u);
              b.setPixel(sx, eyeY + 1, hexToRgba('#991b1b'));
              b.setPixel(sx, eyeY + 2, hexToRgba('#991b1b'));
            }
          }
          if (appearance.beardStyle !== 'none') {
            const jawY = eyeY + Math.max(2, Math.round(1.8 * u));
            const span = Math.max(1, headRx - 1);
            if (appearance.beardStyle === 'mustache') {
              b.fillRect(hx + eyeShiftX - 1, jawY, 3, 1, hairShad);
            } else if (appearance.beardStyle === 'stubble') {
              for (let dx = -span; dx <= span; dx += 2) {
                b.setPixel(hx + dx, hy + headRy - 1, hairShad);
              }
            } else {
              // U-shaped jaw beard: never at the height of the eyes.
              for (let dx = -span; dx <= span; dx++) {
                b.setPixel(hx + dx, jawY + (Math.abs(dx) < span ? 1 : 0),
                  Math.abs(dx) < span ? hairShad : hair);
              }
            }
          }
        }

        if (equipment.helmet !== 'none') {
          const helm = hexToRgba(equipment.helmetPrimaryHex);
          const helmDark = adjustColorBrightness(helm, -35);
          const helmHigh = adjustColorBrightness(helm, 30);
          if (equipment.helmet === 'straw_hat') {
            const straw = hexToRgba('#eab308');
            const brim = hexToRgba('#ca8a04');
            const band = hexToRgba('#991b1b');
            const hatHalf = headRx + Math.max(2, Math.round(2 * u));
            const crownTop = hy - headRy - Math.max(1, Math.round(1.2 * u));
            const brimY = hy - Math.max(1, Math.round(1.4 * u));
            b.fillEllipse(hx, crownTop + 2, headRx, Math.max(2, Math.round(2 * u)), straw);
            b.fillRect(hx - headRx + 1, brimY - 2, headRx * 2 - 1, 1, band);
            b.fillRect(hx - hatHalf, brimY, 2 * hatHalf + 1,
              Math.max(1, Math.round(1.2 * u)), brim);
            b.fillRect(hx - hatHalf + 1, brimY - 1, 2 * hatHalf - 1, 1, straw);
          } else if (equipment.helmet === 'knight_helm') {
            b.fillEllipse(hx, hy - Math.round(1.2 * u),
              headRx + 1, Math.round(2.8 * u), helm);
            b.setPixel(hx - 1, hy - headRy, helmHigh);
            b.fillRect(hx - headRx, hy - 1, 1, Math.round(2.5 * u), helmDark);
            b.fillRect(hx + headRx, hy - 1, 1, Math.round(2.5 * u), helmDark);
            if (!isFacingNorth) {
              b.fillRect(hx - headRx + 1, hy - 1, headRx * 2 - 1, 1, outlineCol);
            }
          } else if (equipment.helmet === 'crown') {
            const gold = hexToRgba('#facc15');
            const cy = hy - headRy;
            b.fillRect(hx - headRx + 1, cy, headRx * 2 - 1, 2, gold);
            b.setPixel(hx - headRx + 1, cy - 1, gold);
            b.setPixel(hx, cy - 2, gold);
            b.setPixel(hx + headRx - 1, cy - 1, gold);
            b.setPixel(hx, cy, hexToRgba('#ef4444'));
          } else if (equipment.helmet === 'miner_hardhat') {
            b.fillEllipse(hx, hy - Math.round(1.5 * u),
              headRx + 1, Math.round(2.2 * u), helm);
            b.drawLine(hx - headRx - 1, hy - 2, hx + headRx + 1, hy - 2, helmDark, 2);
            b.fillRect(hx - 1, hy - headRy, 3, 2, hexToRgba('#facc15'));
            b.setPixel(hx, hy - headRy, hexToRgba('#e0f2fe'));
          } else if (equipment.helmet === 'wizard_pointed_hat') {
            const brimRx = headRx + Math.max(2, Math.round(2 * u));
            const brimY = hy - Math.round(1.5 * u);
            b.fillRect(hx - brimRx, brimY, brimRx * 2 + 1, 2, helmDark);
            b.drawLine(hx - headRx + 1, brimY - 1,
              hx + 1, brimY - Math.round(4.5 * u), helm, Math.max(2, Math.round(2 * u)));
            b.setPixel(hx, brimY - Math.round(3 * u), helmHigh);
          } else if (equipment.helmet === 'bandana') {
            b.fillRect(hx - headRx, hy - headRy + 1, headRx * 2 + 1,
              Math.max(2, Math.round(1.6 * u)), helm);
            b.fillRect(hx - headRx, hy - headRy + 1, headRx * 2 + 1, 1, helmHigh);
            b.drawLine(hx + headRx, hy - headRy + 2,
              hx + headRx + 2, hy - headRy + 4, helmDark);
          } else {
            // Ranger hood with side drapes and face opening.
            b.fillEllipse(hx, hy - Math.round(1.2 * u),
              headRx + 1, Math.round(2.8 * u), helm);
            b.fillRect(hx - headRx, hy - 1, 1, Math.round(2.5 * u), helmDark);
            b.fillRect(hx + headRx, hy - 1, 1, Math.round(2.5 * u), helmDark);
          }
        } else if (appearance.hairStyle !== 'bald') {
          const crownY = hy - headRy;
          if (appearance.hairStyle === 'mohawk') {
            b.fillRect(hx - 1, crownY - 2, 3, headRy + 1, hair);
            b.setPixel(hx, crownY - 2, hairHigh);
          } else if (appearance.hairStyle === 'curly_afro') {
            b.fillEllipse(hx, crownY + 1, headRx + 1,
              Math.max(2, Math.round(2.6 * u)), hairShad);
            for (let offset = -headRx; offset <= headRx; offset += 2) {
              b.setPixel(hx + offset, crownY - (Math.abs(offset) % 3), hairHigh);
            }
            b.fillEllipse(hx, crownY + 1, headRx,
              Math.max(2, Math.round(1.8 * u)), hair);
          } else if (appearance.hairStyle === 'braided_crown') {
            b.fillEllipse(hx, crownY + 1, headRx,
              Math.max(2, Math.round(1.6 * u)), hairShad);
            for (let offset = -headRx + 1; offset <= headRx - 1; offset += 2) {
              b.setPixel(hx + offset, crownY, (offset & 2) ? hairHigh : hair);
            }
          } else {
            const hairDepth = Math.max(1, Math.round(
              (appearance.hairStyle === 'wavy_shoulder' ? 2.2 : 1.4) * u));
            for (let dy = -1; dy <= hairDepth; dy++) {
              const span = dy === -1 ? headRx - 1 : headRx;
              for (let dx = -span; dx <= span; dx++) {
                const tone = dy <= 0 && dx < 0 ? hairHigh
                  : dx > span * .45 ? hairShad : hair;
                b.setPixel(hx + dx, crownY + dy, tone);
              }
            }
            if (!isFacingNorth) {
              b.fillRect(hx - headRx, hy - 2, 1, Math.round(2.2 * u), hairShad);
              b.fillRect(hx + headRx, hy - 2, 1, Math.round(2.2 * u), hairShad);
            }
          }
        }
      }
    });

    // Ordenar capas estrictamente por zOrder y rasterizar
    layers.sort((a, b) => a.zOrder - b.zOrder);
    for (const layer of layers) {
      layer.draw(buf);
    }

    // Contextual overlays are composed after equipment. They do not change
    // joint positions or atlas cell dimensions.
    if (action === 'swimming') {
      // Waterline and interrupted ripples around the pelvis. Two offset
      // bands change subtly with the swim cycle, without antialiasing.
      const wave = frameIndex & 1;
      const waterY = toScreenY(j.pelvis.y) + Math.round(1.6 * u);
      const cyan = hexToRgba('#7dd3fc');
      const blue = hexToRgba('#0284c7');
      const span = Math.round(5.5 * u);
      {
        for (let dx = -span; dx <= span; dx++) {
          const px = pivotX + dx;
          if (((dx + frameIndex) & 3) !== 0) {
            buf.setPixel(px, waterY + (Math.abs(dx) % 3 === 0 ? wave : 0), cyan);
          } else {
            buf.setPixel(px, waterY + wave + 1, blue);
          }
        }
      }
    }

    if (action === 'healing' || action === 'casting_spells') {
      const glow = hexToRgba(action === 'healing' ? '#4ade80' : '#38bdf8');
      const glint = hexToRgba(action === 'healing' ? '#bbf7d0' : '#e0f2fe');
      const pulse = frameIndex % 2;
      for (const hand of [j.hand_r, j.hand_l]) {
        const hx = toScreenX(hand.x);
        const hy = toScreenY(hand.y);
        buf.setPixel(hx, hy - 2 - pulse, glint);
        buf.setPixel(hx - 1, hy - 1, glow);
        buf.setPixel(hx + 1, hy - 1, glow);
      }
    } else if (action === 'eating' || action === 'drinking') {
      const hx = toScreenX(j.hand_r.x), hy = toScreenY(j.hand_r.y);
      if (action === 'eating') {
        buf.fillEllipse(hx, hy - 1, Math.max(1, Math.round(1.3 * u)),
          Math.max(1, Math.round(1.2 * u)), hexToRgba('#ef4444'));
        buf.setPixel(hx, hy - 2, hexToRgba('#86efac'));
      } else {
        buf.fillRect(hx - 1, hy - 3, Math.max(2, Math.round(2 * u)),
          Math.max(3, Math.round(3 * u)), hexToRgba('#38bdf8'));
        buf.setPixel(hx, hy - 2, hexToRgba('#e0f2fe'));
      }
    } else if (action === 'carrying_objects') {
      // A single crate bridges both hands in front of the chest.
      const hx = Math.round((toScreenX(j.hand_r.x) + toScreenX(j.hand_l.x)) / 2);
      const hy = Math.round((toScreenY(j.hand_r.y) + toScreenY(j.hand_l.y)) / 2)
        - Math.round(1.6 * u);
      const crateW = Math.max(4, Math.round(5 * u));
      const crateH = Math.max(3, Math.round(3.5 * u));
      const wood = hexToRgba('#b45309'), dark = hexToRgba('#78350f');
      buf.fillRect(hx - Math.floor(crateW / 2), hy, crateW, crateH, wood);
      buf.drawLine(hx - Math.floor(crateW / 2), hy,
        hx + Math.floor(crateW / 2), hy + crateH - 1, dark);
      buf.drawLine(hx + Math.floor(crateW / 2), hy,
        hx - Math.floor(crateW / 2), hy + crateH - 1, dark);
      buf.setPixel(hx, hy + 1, hexToRgba('#fbbf24'));
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
