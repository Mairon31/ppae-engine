import {
  DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, PPAE_SCHEMA_VERSION,
  fnv1aHash32, SeededRNG
} from '../index';
import type {
  BodyBuildType, HairStyleId, BeardStyleId, FacialExpressionId,
  CharacterAgeGroup, CharacterEarStyle, CharacterHornStyle, FaceMarkingStyle,
  HelmetStyleId, ArmorStyleId, MainHandItemId, OffHandItemId, BackpackStyleId,
  EntityAppearance, EquipmentLoadout, VisualStatusEffect
} from '../index';

export const AVATAR_VARIANTS = [
  'hero', ...Array.from({ length: 31 }, (_, i) => 'avatar_' + String(i + 1).padStart(2, '0'))
];

export const AVATAR_FIELDS = {
  bodyBuild: ['slim','standard','sturdy'] as readonly BodyBuildType[],
  hairStyle: ['short_crop','long_adventure','ponytail','mohawk','wavy_shoulder','braided_crown','curly_afro','bald'] as readonly HairStyleId[],
  beardStyle: ['none','stubble','full_beard','mustache'] as readonly BeardStyleId[],
  expression: ['neutral','determined','happy','surprised','blink'] as readonly FacialExpressionId[],
  ageGroup: ['youth','adult','elder'] as readonly CharacterAgeGroup[],
  earStyle: ['human_round','elf_pointed','fae_long'] as readonly CharacterEarStyle[],
  hornStyle: ['none','small_oni','curved_ram'] as readonly CharacterHornStyle[],
  faceMarking: ['none','freckles','war_paint','arcane_rune'] as readonly FaceMarkingStyle[],
  scarSide: ['left','right'] as const,
  helmet: ['none','knight_helm','ranger_hood','straw_hat','crown','miner_hardhat','wizard_pointed_hat','bandana'] as readonly HelmetStyleId[],
  armor: ['cloth_tunic','leather_vest','iron_plate','mage_robe','farmer_overalls','blacksmith_apron','noble_coat'] as readonly ArmorStyleId[],
  mainHand: ['none','iron_sword','woodcutter_axe','mining_pickaxe','oak_staff','wooden_hoe','fishing_rod','smith_hammer','hunting_bow'] as readonly MainHandItemId[],
  offHand: ['none','wooden_shield','knight_kite_shield','lantern','spell_tome','harvest_basket'] as readonly OffHandItemId[],
  backpack: ['none','travel_pack','miner_basket','herbalist_satchel','quiver'] as readonly BackpackStyleId[],
  status: ['none','hurt_flash','poisoned','frozen','burning'] as readonly VisualStatusEffect[]
} as const;

export const AVATAR_SKIN_PALETTES = [
  ['#f5d0b5','#cfa07e'], ['#f2c29b','#c98e63'], ['#d99b66','#a66d3f'],
  ['#a66a44','#754427'], ['#6e4228','#472816']
] as const;
export const AVATAR_HAIR_PALETTES = [
  ['#27272a','#09090b'], ['#5c3317','#361b09'], ['#9a3412','#5c1d08'],
  ['#ca8a04','#854d0e'], ['#cbd5e1','#64748b'], ['#eef2ff','#94a3b8']
] as const;
export const AVATAR_CLOTHING_COLORS = [
  '#2563eb','#15803d','#991b1b','#7c3aed','#c2410c','#64748b','#a16207','#0891b2'
] as const;

export interface AvatarPreset {
  appearance: EntityAppearance;
  equipment: EquipmentLoadout;
}

export function shadeHex(hex: string, multiplier = .72): string {
  const value = hex.replace('#','');
  if (!/^[a-f0-9]{6}$/i.test(value)) return '#27272a';
  const rgb = [0,2,4].map(start => Math.round(parseInt(value.slice(start,start+2),16) * multiplier));
  return '#' + rgb.map(c => c.toString(16).padStart(2,'0')).join('');
}

/** Every card renders the real CharacterAvatarGenerator with a seeded appearance. */
export function generateAvatarPreset(seed: string, id: string, variation = 0): AvatarPreset {
  if (id === 'hero' && variation === 0) return {
    appearance: { ...DEFAULT_HERO_APPEARANCE },
    equipment: { ...DEFAULT_HERO_EQUIPMENT }
  };
  const numericSeed = fnv1aHash32(seed + ':avatar:' + id + ':' + variation);
  const rng = new SeededRNG(numericSeed);
  const skin = rng.pick(AVATAR_SKIN_PALETTES);
  const hair = rng.pick(AVATAR_HAIR_PALETTES);
  const armorColor = rng.pick(AVATAR_CLOTHING_COLORS);
  const capeColor = rng.pick(AVATAR_CLOTHING_COLORS);
  return {
    appearance: {
      ...DEFAULT_HERO_APPEARANCE,
      schemaVersion: PPAE_SCHEMA_VERSION,
      entityId: 'generated_' + id + '_' + numericSeed.toString(16),
      seed: numericSeed,
      bodyBuild: rng.pick(AVATAR_FIELDS.bodyBuild),
      heightScale: Number(rng.nextRange(.9, 1.1).toFixed(2)),
      skinColorHex: skin[0], skinShadowHex: skin[1],
      eyeColorHex: rng.pick(['#1d4ed8','#15803d','#78350f','#6d28d9','#0f766e']),
      hairStyle: rng.pick(AVATAR_FIELDS.hairStyle),
      hairColorHex: hair[0], hairShadowHex: hair[1],
      beardStyle: rng.pick(AVATAR_FIELDS.beardStyle),
      hasFacialScar: rng.chance(.3),
      scarSide: rng.chance(.5) ? 'left' : 'right',
      expression: rng.pick(AVATAR_FIELDS.expression),
      ageGroup: rng.pick(AVATAR_FIELDS.ageGroup),
      earStyle: rng.pick(AVATAR_FIELDS.earStyle),
      hornStyle: rng.pick(AVATAR_FIELDS.hornStyle),
      faceMarking: rng.pick(AVATAR_FIELDS.faceMarking)
    },
    equipment: {
      ...DEFAULT_HERO_EQUIPMENT,
      helmet: rng.pick(AVATAR_FIELDS.helmet),
      armor: rng.pick(AVATAR_FIELDS.armor),
      mainHand: rng.pick(AVATAR_FIELDS.mainHand),
      offHand: rng.pick(AVATAR_FIELDS.offHand),
      backpack: rng.pick(AVATAR_FIELDS.backpack),
      hasCape: rng.chance(.5),
      helmetPrimaryHex: rng.pick(AVATAR_CLOTHING_COLORS),
      armorPrimaryHex: armorColor,
      armorSecondaryHex: shadeHex(armorColor),
      capeColorHex: capeColor,
      bootsColorHex: '#451a03', glovesColorHex: '#78350f',
      backpackColorHex: rng.pick(AVATAR_CLOTHING_COLORS)
    }
  };
}
