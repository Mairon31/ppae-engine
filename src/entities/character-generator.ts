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

    // The back hair is an independent depth layer, never a foreground
    // rectangle painted after eyes and facial features.
    if (equipment.helmet === 'none' && appearance.hairStyle !== 'bald' &&
      (isFacingNorth || appearance.hairStyle === 'long_adventure' ||
        appearance.hairStyle === 'ponytail')) {
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
          const metal = equipment.mainHand !== 'oak_staff';
          b.drawLine(hx, hy, wx, wy,
            hexToRgba(metal ? '#cbd5e1' : '#92400e'), Math.max(2, Math.round(1.8 * u)));
          b.setPixel(wx, wy, hexToRgba(metal ? '#f8fafc' : '#38bdf8'));
          if (equipment.mainHand === 'woodcutter_axe' || equipment.mainHand === 'mining_pickaxe') {
            b.fillRect(wx - 2, wy - 1, Math.max(2, Math.round(3.5 * u)),
              Math.max(2, Math.round(2.5 * u)), hexToRgba('#94a3b8'));
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
        const headRy = Math.max(3, Math.round(3.6 * u));
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

        if (!isFacingNorth) {
          const eyeShiftX = Math.round(fx * 1.4 * u);
          const eyeY = hy; // S-facing eyes remain at the established eye anchor.
          const expression = appearance.expression ?? 'neutral';
          const brow = hairShad;
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
          } else {
            const hairDepth = Math.max(1, Math.round(1.4 * u));
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
