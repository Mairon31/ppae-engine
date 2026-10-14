import {
  ALL_DIRECTIONS_8,
  ArtStyleProfile,
  CharacterActionId,
  CharacterAnatomicalAuditReport,
  CharacterDirectionContinuityMetrics,
  Direction8,
  EntityAppearance,
  EquipmentLoadout,
  HairStyleId,
  NpcProfessionArchetypeId,
  PPAE_SCHEMA_VERSION
} from '../core/contracts';
import { fnv1aHash32, SeededRNG } from '../core/deterministic';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { CharacterAvatarGenerator, RenderedCharacterFrame } from './character-generator';

export interface GeneratedCharacterPreset {
  readonly profession: NpcProfessionArchetypeId;
  readonly appearance: EntityAppearance;
  readonly equipment: EquipmentLoadout;
}

const SKIN: readonly { readonly main: string; readonly shadow: string }[] = [
  { main: '#f5d0b5', shadow: '#cfa07e' },
  { main: '#f2c29b', shadow: '#c98e63' },
  { main: '#d99b66', shadow: '#a66d3f' },
  { main: '#a66a44', shadow: '#754427' },
  { main: '#6e4228', shadow: '#472816' }
];
const HAIR: readonly { readonly main: string; readonly shadow: string }[] = [
  { main: '#27272a', shadow: '#09090b' },
  { main: '#5c3317', shadow: '#361b09' },
  { main: '#9a3412', shadow: '#5c1d08' },
  { main: '#ca8a04', shadow: '#854d0e' },
  { main: '#cbd5e1', shadow: '#64748b' }
];

/**
 * Generates deterministic vocation-specific NPCs and audits raster continuity,
 * without changing the existing anatomy/animation and spritesheet APIs.
 */
export class CharacterCustomizationService {
  private readonly avatar = new CharacterAvatarGenerator();

  public generateNpcPreset(
    profession: NpcProfessionArchetypeId,
    seed: string | number
  ): GeneratedCharacterPreset {
    const resolvedSeed = typeof seed === 'number' ? seed >>> 0 :
      fnv1aHash32(String(seed) + '::npc_preset::' + profession);
    const rng = new SeededRNG(resolvedSeed);
    const skin = rng.pick(SKIN);
    const hair = profession === 'elder_scholar' ?
      { main: '#e2e8f0', shadow: '#94a3b8' } : rng.pick(HAIR);
    const hairStyles: readonly HairStyleId[] = [
      'short_crop', 'long_adventure', 'ponytail',
      'wavy_shoulder', 'braided_crown', 'curly_afro'
    ];
    const appearance: EntityAppearance = {
      schemaVersion: PPAE_SCHEMA_VERSION,
      entityId: 'npc_' + profession + '_' + resolvedSeed.toString(16),
      seed: resolvedSeed,
      bodyBuild: profession === 'blacksmith_artisan' || profession === 'town_guard'
        ? 'sturdy' : profession === 'wandering_mage' || profession === 'forest_ranger'
        ? 'slim' : 'standard',
      heightScale: Number(rng.nextRange(.95, 1.06).toFixed(2)),
      skinColorHex: skin.main,
      skinShadowHex: skin.shadow,
      eyeColorHex: rng.pick(['#1d4ed8','#15803d','#78350f','#0f766e','#6d28d9']),
      hairStyle: rng.pick(hairStyles),
      hairColorHex: hair.main,
      hairShadowHex: hair.shadow,
      beardStyle: profession === 'blacksmith_artisan' || profession === 'elder_scholar'
        ? 'full_beard' : profession === 'miner_prospector' ? 'mustache' : 'none',
      hasFacialScar: profession === 'town_guard',
      scarSide: rng.chance(.5) ? 'left' : 'right',
      expression: 'neutral',
      ageGroup: profession === 'elder_scholar' ? 'elder' : 'adult',
      earStyle: profession === 'forest_ranger' ? 'elf_pointed' : 'human_round',
      hornStyle: 'none',
      faceMarking: profession === 'wandering_mage' ? 'arcane_rune' : 'none'
    };

    return { profession, appearance, equipment: this.equipmentForProfession(profession) };
  }

  /**
   * Pixel BFS over alpha >= 200 ignores the translucent ground shadow and
   * computes real 8-connected component labels and their sizes.
   * The head, neck, torso and both feet must belong to the largest component.
   * This is stronger than merely checking vertical bounding boxes.
   */
  public auditCharacterAnatomicalContinuity(
    appearance: EntityAppearance,
    equipment: EquipmentLoadout,
    profile: ArtStyleProfile,
    action: CharacterActionId = 'idle',
    frameIndex = 0,
    totalFrames = 4
  ): CharacterAnatomicalAuditReport {
    const metrics = {} as Record<Direction8, CharacterDirectionContinuityMetrics>;
    let passed = true;
    for (const direction of ALL_DIRECTIONS_8) {
      const rendered = this.avatar.renderCharacterFrame(
        appearance, equipment, action, direction,
        frameIndex, totalFrames, profile
      );
      const report = this.auditFrame(rendered, direction);
      metrics[direction] = report;
      if (report.bodyOpaquePixelCount === 0 ||
          report.largestComponentRatio < .92 ||
          !report.headConnectedToTorso ||
          !report.feetAnchoredToGround) passed = false;
    }
    return {
      entityId: appearance.entityId,
      action,
      passedAllDirections: passed,
      directionMetrics: metrics
    };
  }

  private auditFrame(
    rendered: RenderedCharacterFrame,
    direction: Direction8
  ): CharacterDirectionContinuityMetrics {
    const buf: PixelBuffer = rendered.buffer;
    const w = buf.width, h = buf.height;
    const { data } = buf;
    const labels = new Int32Array(w * h);
    const components: number[] = [0];
    const queue = new Int32Array(w * h);
    let opaqueCount = 0;

    for (let i = 0; i < labels.length; i++) {
      if (data[i * 4 + 3] >= 200) opaqueCount++;
    }

    const deltas: readonly (readonly [number, number])[] = [
      [-1,-1], [0,-1], [1,-1], [-1,0], [1,0], [-1,1], [0,1], [1,1]
    ];
    let maxSize = 0, largestId = 0;

    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const pixel = y * w + x;
      if (labels[pixel] || data[pixel * 4 + 3] < 200) continue;
      const id = components.length;
      let front = 0, back = 1;
      queue[0] = pixel;
      labels[pixel] = id;
      while (front < back) {
        const p = queue[front++];
        const px = p % w, py = Math.floor(p / w);
        for (const [dx,dy] of deltas) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const neighbor = ny * w + nx;
          if (labels[neighbor] || data[neighbor * 4 + 3] < 200) continue;
          labels[neighbor] = id;
          queue[back++] = neighbor;
        }
      }
      const size = back;
      components.push(size);
      if (size > maxSize) { maxSize = size; largestId = id; }
    }

    const [pivotX, pivotY] = rendered.pivotTexel;
    const joint = rendered.pose.joints;
    const sampledLabel = (x: number, y: number, radius = 2): number => {
      let nearest = 9999, chosen = 0;
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const xx = Math.round(x) + dx, yy = Math.round(y) + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const component = labels[yy * w + xx];
        if (!component) continue;
        const distance = dx * dx + dy * dy;
        if (distance < nearest || (distance === nearest && component === largestId)) {
          nearest = distance; chosen = component;
        }
      }
      return chosen;
    };
    const labelJoint = (id: 'head' | 'neck' | 'torso' | 'foot_r' | 'foot_l',
      yOffset = 0): number => {
      const j = joint[id];
      return sampledLabel(pivotX + j.x, pivotY + j.y + yOffset);
    };
    const connectedHead = largestId !== 0 &&
      labelJoint('head') === largestId &&
      labelJoint('neck') === largestId &&
      labelJoint('torso', 2) === largestId;
    const feetGrounded = largestId !== 0 &&
      labelJoint('foot_r', -1) === largestId &&
      labelJoint('foot_l', -1) === largestId &&
      Math.max(joint.foot_r.y, joint.foot_l.y) >= -4;

    return {
      direction,
      bodyOpaquePixelCount: opaqueCount,
      connectedComponentCount: components.length - 1,
      largestComponentRatio: opaqueCount
        ? Number((maxSize / opaqueCount).toFixed(3)) : 0,
      headConnectedToTorso: connectedHead,
      feetAnchoredToGround: feetGrounded
    };
  }

  private equipmentForProfession(profession: NpcProfessionArchetypeId): EquipmentLoadout {
    const base: EquipmentLoadout = {
      helmet: 'none', helmetPrimaryHex: '#94a3b8',
      armor: 'cloth_tunic', armorPrimaryHex: '#64748b',
      armorSecondaryHex: '#78350f', hasCape: false,
      capeColorHex: '#78350f', bootsColorHex: '#451a03',
      glovesColorHex: '#78350f', mainHand: 'none', offHand: 'none',
      backpack: 'none'
    };
    switch (profession) {
      case 'villager_farmer':
        return { ...base, helmet:'straw_hat', helmetPrimaryHex:'#eab308',
          armor:'farmer_overalls', armorPrimaryHex:'#1d4ed8',
          armorSecondaryHex:'#16a34a', mainHand:'wooden_hoe',
          offHand:'harvest_basket' };
      case 'blacksmith_artisan':
        return { ...base, helmet:'bandana', helmetPrimaryHex:'#991b1b',
          armor:'blacksmith_apron', armorPrimaryHex:'#57534e',
          armorSecondaryHex:'#451a03', bootsColorHex:'#1c1917',
          glovesColorHex:'#292524', mainHand:'smith_hammer' };
      case 'town_guard':
        return { ...base, helmet:'knight_helm', helmetPrimaryHex:'#94a3b8',
          armor:'iron_plate', armorPrimaryHex:'#64748b',
          armorSecondaryHex:'#1e3a8a', hasCape:true,
          capeColorHex:'#1d4ed8', bootsColorHex:'#334155',
          mainHand:'iron_sword', offHand:'knight_kite_shield' };
      case 'wandering_mage':
        return { ...base, helmet:'wizard_pointed_hat', helmetPrimaryHex:'#4c1d95',
          armor:'mage_robe', armorPrimaryHex:'#5b21b6',
          armorSecondaryHex:'#eab308', hasCape:true,
          capeColorHex:'#3b0764', mainHand:'oak_staff',
          offHand:'spell_tome', backpack:'herbalist_satchel',
          backpackColorHex:'#78350f' };
      case 'forest_ranger':
        return { ...base, helmet:'ranger_hood', helmetPrimaryHex:'#166534',
          armor:'leather_vest', armorPrimaryHex:'#15803d',
          armorSecondaryHex:'#78350f', hasCape:true,
          capeColorHex:'#14532d', mainHand:'hunting_bow',
          backpack:'quiver', backpackColorHex:'#854d0e' };
      case 'merchant_trader':
        return { ...base, armor:'noble_coat', armorPrimaryHex:'#991b1b',
          armorSecondaryHex:'#ca8a04', offHand:'lantern',
          backpack:'travel_pack', backpackColorHex:'#a16207' };
      case 'elder_scholar':
        return { ...base, helmet:'crown', helmetPrimaryHex:'#facc15',
          armor:'mage_robe', armorPrimaryHex:'#1e3a8a',
          armorSecondaryHex:'#cbd5e1', hasCape:true,
          capeColorHex:'#172554', mainHand:'oak_staff',
          offHand:'spell_tome' };
      case 'miner_prospector':
        return { ...base, helmet:'miner_hardhat', helmetPrimaryHex:'#eab308',
          armor:'leather_vest', armorPrimaryHex:'#78350f',
          armorSecondaryHex:'#451a03', bootsColorHex:'#292524',
          glovesColorHex:'#44403c', mainHand:'mining_pickaxe',
          offHand:'lantern', backpack:'miner_basket',
          backpackColorHex:'#92400e' };
    }
  }
}
