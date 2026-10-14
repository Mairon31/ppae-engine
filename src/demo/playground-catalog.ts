import {
  CREATURE_SPECIES_CATALOG,
  DEFAULT_CHARACTER_CLIPS,
  DEFAULT_CREATURE_CLIPS,
  DEFAULT_STRUCTURE_CATALOG,
  TREE_SPECIES_CATALOG,
  FLORA_SPECIES_CATALOG,
  GEOLOGICAL_ARCHETYPE_CATALOG,
  CROP_SPECIES_CATALOG,
  VFX_EMITTER_PRESETS,
  TERRAIN_MATERIALS,
  DEFAULT_WEATHER_STATES, TREE_MORPHOLOGY_ARCHETYPES, MATERIAL_TIER_PALETTES,
  DEFAULT_STYLE_PROFILES, PaletteManager
} from '../index';
import { AVATAR_VARIANTS } from './avatar-lab';
import { tr } from './i18n';

export const PLAYGROUND_SECTIONS = [
  { id: 'world', label: 'Procedural World', group: 'Worlds', description: 'Deterministic chunks, biomes, props, water, and depth' },
  { id: 'characters', label: 'Character Creator', group: 'Entities', description: '32 avatars with anatomical features, equipment, and customizable colors' },
  { id: 'character-actions', label: 'Character Actions', group: 'Entities', description: '28 actions, equipment, and eight directions' },
  { id: 'npcs', label: 'NPCs & Professions', group: 'Entities', description: 'Eight deterministic profession archetypes' },
  { id: 'npc-variants', label: 'NPC Diversity', group: 'Entities', description: '64 residents with eight seeded variations per profession' },
  { id: 'creatures', label: 'Bestiary', group: 'Entities', description: '16 species, ten anatomy families, 12 actions' },
  { id: 'creature-variants', label: 'Creature Variants', group: 'Entities', description: 'Species combined with age and physical condition' },
  { id: 'bosses', label: 'Bosses', group: 'Entities', description: 'Crystal colossus, treant lord, and segmented anatomy' },
  { id: 'trees', label: 'Trees', group: 'Nature', description: '12 botanical families with lifecycle stages' },
  { id: 'tree-lifecycle', label: 'Tree Lifecycles', group: 'Nature', description: 'All 12 lifecycle stages across botanical families' },
  { id: 'tree-archetypes', label: 'Tree Archetypes', group: 'Nature', description: 'Every structural morphology for all 12 families' },
  { id: 'flora', label: 'Secondary Flora', group: 'Nature', description: '17 botanical morphologies' },
  { id: 'geology', label: 'Geology', group: 'Nature', description: '17 formations and geological deposits' },
  { id: 'terrain', label: 'Terrain Materials', group: 'World', description: 'Authentic terrain textures and material transitions' },
  { id: 'terrain-variants', label: 'Seamless Variants', group: 'World', description: '16 tileable variations for each material' },
  { id: 'autotiling', label: '8-Neighbor Autotiling', group: 'World', description: 'Terrain connection masks, edges, and corners' },
  { id: 'liquids', label: 'Animated Liquids', group: 'World', description: 'Shallow water, deep water, lava, and motion' },
  { id: 'structures', label: 'Structures', group: 'World', description: 'Buildings, bridges, roofs, and portals' },
  { id: 'interiors', label: 'Interiors', group: 'World', description: 'Rooms, furniture, and collision geometry' },
  { id: 'caves', label: 'Caves', group: 'World', description: 'Crystal chambers and lava' },
  { id: 'farming', label: 'Farming', group: 'World', description: 'Crops, soil, and growth stages' },
  { id: 'crop-lifecycle', label: 'Crop Lifecycles', group: 'World', description: 'Every crop species and growth stage' },
  { id: 'equipment', label: 'Equipment Icons', group: 'Systems', description: 'Procedural equipment materials and wear' },
  { id: 'equipment-materials', label: 'Equipment Materials', group: 'Systems', description: 'Six material tiers across tools, weapons, and armor' },
  { id: 'hud', label: 'HUD & Nine-slice', group: 'Systems', description: 'Pixel-perfect panels and parameterized progress bars' },
  { id: 'particles', label: 'Particles & VFX', group: 'Systems', description: '16 emitters, four particle shapes, and object pooling' },
  { id: 'weather', label: 'Weather & Wind', group: 'Systems', description: '11 weather states, branched lightning, and layered fog' },
  { id: 'lighting', label: 'Lighting', group: 'Systems', description: 'Solar cast shadows, day phases, and light maps' },
  { id: 'palettes', label: 'Engine Palettes', group: 'Art Diagnostics', description: 'Real palette ramps across biomes and seasons' },
  { id: 'resolution-profiles', label: 'Resolution Comparison', group: 'Art Diagnostics', description: 'One species rendered natively at 4, 6, 8, 16, and 32' }
] as const;

export type PlaygroundSectionId = (typeof PLAYGROUND_SECTIONS)[number]['id'];

export const NPC_PROFESSIONS = [
  'villager_farmer', 'blacksmith_artisan', 'town_guard', 'wandering_mage',
  'forest_ranger', 'merchant_trader', 'elder_scholar', 'miner_prospector'
] as const;

export const BOSS_IDS = ['ancient_crystal_colossus', 'corrupted_forest_treant_lord'] as const;
export const TREE_STAGES = [
  'seed', 'sprout', 'sapling', 'young', 'immature', 'mature',
  'ancient', 'damaged', 'dead', 'burned', 'stump', 'fallen_log'
] as const;
export const CROP_STAGES = ['seed', 'sprout', 'growing', 'mature', 'withered'] as const;
export const MATERIAL_TIERS = ['wood', 'iron', 'gold', 'crystal'] as const;
export const ITEM_TYPES = ['weapon_sword', 'tool_axe', 'tool_pickaxe', 'armor_chest', 'shield'] as const;

export const CHARACTER_ACTIONS = Object.keys(DEFAULT_CHARACTER_CLIPS);
export const CREATURE_ACTIONS = Object.keys(DEFAULT_CREATURE_CLIPS);
export const EIGHT_DIRECTIONS = ['S','SE','E','NE','N','NW','W','SW'] as const;

export const TREE_ARCHETYPE_OPTIONS = Object.entries(TREE_MORPHOLOGY_ARCHETYPES)
  .flatMap(([family, entries]) => entries.map(entry => family + ':' + entry.archetypeId));
export const AUTOTILE_MASKS = Array.from({ length: 256 }, (_, i) => String(i));
export const NPC_VARIANTS = NPC_PROFESSIONS.flatMap(id =>
  Array.from({ length: 8 }, (_, index) => id + ':' + (index + 1)));
export const CREATURE_VARIANTS = Object.keys(CREATURE_SPECIES_CATALOG).flatMap(id =>
  ['juvenile','adult','alpha_elder'].flatMap(age =>
    ['healthy','wounded','corrupted'].map(health => id + ':' + age + ':' + health)));
export const TREE_LIFECYCLE_VARIANTS = Object.keys(TREE_SPECIES_CATALOG)
  .flatMap(id => TREE_STAGES.map(stage => id + ':' + stage));
export const CROP_LIFECYCLE_VARIANTS = Object.keys(CROP_SPECIES_CATALOG)
  .flatMap(id => CROP_STAGES.map(stage => id + ':' + stage));
export const TERRAIN_VARIANTS = Object.keys(TERRAIN_MATERIALS)
  .flatMap(id => Array.from({ length: 16 }, (_, i) => id + ':' + String(i)));
export const PALETTE_OPTIONS = new PaletteManager().listPalettes().map(item => item.id);
export const RESOLUTION_OPTIONS = Object.keys(DEFAULT_STYLE_PROFILES)
  .filter(id => id !== 'adaptive-auto');
export const MATERIAL_VARIANTS = Object.keys(MATERIAL_TIER_PALETTES)
  .flatMap(tier => ['weapon_sword','tool_axe','armor_helmet'].map(category => tier + ':' + category));
export const PLAYGROUND_OPTIONS: Readonly<Record<PlaygroundSectionId, readonly string[]>> = {
  world: ['world_overview', 'world_wildlife', 'world_village'],
  characters: AVATAR_VARIANTS,
  'character-actions': CHARACTER_ACTIONS,
  npcs: NPC_PROFESSIONS,
  'npc-variants': NPC_VARIANTS,
  creatures: Object.keys(CREATURE_SPECIES_CATALOG),
  'creature-variants': CREATURE_VARIANTS,
  bosses: BOSS_IDS,
  trees: Object.keys(TREE_SPECIES_CATALOG),
  'tree-lifecycle': TREE_LIFECYCLE_VARIANTS,
  'tree-archetypes': TREE_ARCHETYPE_OPTIONS,
  flora: Object.keys(FLORA_SPECIES_CATALOG),
  geology: Object.keys(GEOLOGICAL_ARCHETYPE_CATALOG),
  terrain: Object.keys(TERRAIN_MATERIALS),
  'terrain-variants': TERRAIN_VARIANTS,
  autotiling: AUTOTILE_MASKS,
  liquids: ['shallow_water','deep_water','lava_magma'],
  structures: Object.keys(DEFAULT_STRUCTURE_CATALOG),
  interiors: ['cottage_interior', 'forge_interior', 'alchemy_interior'],
  caves: ['crystal_cavern'],
  farming: Object.keys(CROP_SPECIES_CATALOG),
  'crop-lifecycle': CROP_LIFECYCLE_VARIANTS,
  equipment: ITEM_TYPES,
  'equipment-materials': MATERIAL_VARIANTS,
  hud: ['hud_panel','health_bar','mana_bar','stamina_bar'],
  particles: Object.keys(VFX_EMITTER_PRESETS),
  weather: Object.keys(DEFAULT_WEATHER_STATES),
  lighting: ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night', 'underground_dark'],
  palettes: PALETTE_OPTIONS,
  'resolution-profiles': RESOLUTION_OPTIONS
};

const LABELS: Record<string, string> = {
  hero: 'Default avatar',
  shallow_water: 'Shallow Water', deep_water: 'Deep Water',
  hud_panel: 'Nine-slice Panel', health_bar: 'Health', mana_bar: 'Mana', stamina_bar: 'Stamina',
  world_overview: 'Procedural Overview', world_wildlife: 'Wildlife Habitat',
  world_village: 'Village & Residents',
  forge_interior: 'Blacksmith Workshop', alchemy_interior: 'Alchemy Laboratory',
  cottage_interior: 'Cottage Interior',
  village_cottage_01: 'Village Cottage', blacksmith_forge_01: 'Blacksmith Forge',
  thatched_peasant_hut_01: 'Thatched Peasant Hut', blue_slate_manor_01: 'Blue Slate Manor',
  farm_timber_barn_01: 'Timber Farm Barn', grain_windmill_01: 'Grain Windmill',
  village_stone_well_01: 'Village Stone Well', ancient_mossy_ruins_01: 'Ancient Mossy Ruins',
  north_mine_cave_mouth: 'Mine Entrance', river_wooden_bridge: 'Wooden Bridge',
  ancient_crystal_colossus: 'Crystal Colossus',
  corrupted_forest_treant_lord: 'Corrupted Treant Lord',
  villager_farmer: 'Farmer', blacksmith_artisan: 'Blacksmith',
  town_guard: 'Guard', wandering_mage: 'Wandering Mage',
  poison_bubbles: 'Poison Bubbles', frost_shards: 'Frost Shards',
  blood_hit_droplets: 'Blood Hit Droplets', arcane_burst: 'Arcane Burst',
  lava_magma_sparks: 'Lava & Magma Sparks', torch_dancing_embers: 'Torch Dancing Embers',
  forest_ranger: 'Forest Ranger', merchant_trader: 'Merchant',
  elder_scholar: 'Elder Scholar', miner_prospector: 'Miner',
  dawn: 'Dawn', morning: 'Morning', noon: 'Noon',
  afternoon: 'Afternoon', dusk: 'Dusk', night: 'Night',
  underground_dark: 'Underground Darkness',
  idle: 'Idle', move: 'Move', sprint_flee: 'Sprint / Flee',
  jump_pounce: 'Jump / Pounce', special_ability: 'Special Ability',
  rest_graze: 'Rest / Graze', eat_feed: 'Eat / Feed', sleep: 'Sleep',
  attack: 'Attack', hurt: 'Hurt', death: 'Death',
  weapon_sword: 'Sword', tool_axe: 'Axe',
  tool_pickaxe: 'Pickaxe', armor_chest: 'Chest Armor', shield: 'Shield'
};

export function formatPlaygroundLabel(id: string): string {
  if (id.startsWith('avatar_')) return 'Avatar ' + id.slice(-2);
  if (id.includes(':')) return id.split(':').map(part => tr(LABELS[part] ?? part.replace(/[_-]/g, ' '))).join(' · ');
  if (/^\d+$/.test(id)) return tr('Mask ') + id.padStart(3, '0');
  return tr(LABELS[id] ?? id.replace(/[_-]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()));
}

export function getPlaygroundSection(id: PlaygroundSectionId) {
  return PLAYGROUND_SECTIONS.find(s => s.id === id)!;
}
