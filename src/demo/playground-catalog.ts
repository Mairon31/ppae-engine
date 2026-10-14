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
  DEFAULT_WEATHER_STATES, TREE_MORPHOLOGY_ARCHETYPES, MATERIAL_TIER_PALETTES
} from '../index';
import { AVATAR_VARIANTS } from './avatar-lab';

export const PLAYGROUND_SECTIONS = [
  { id: 'world', label: 'Mundo procedural', group: 'Escenarios', description: 'Chunks, biomas, props, agua y profundidad' },
  { id: 'characters', label: 'Creador de personajes', group: 'Entidades', description: '32 avatares y personalización anatómica, rasgos, equipo y colores' },
  { id: 'character-actions', label: 'Acciones de personaje', group: 'Entidades', description: 'Las 28 animaciones con equipo y ocho direcciones' },
  { id: 'npcs', label: 'NPCs y oficios', group: 'Entidades', description: '8 arquetipos profesionales deterministas' },
  { id: 'creatures', label: 'Bestiario', group: 'Entidades', description: '16 especies, 10 familias, 12 acciones' },
  { id: 'bosses', label: 'Jefes', group: 'Entidades', description: 'Coloso, señor Ent y segmentos' },
  { id: 'trees', label: 'Árboles', group: 'Naturaleza', description: '12 familias botánicas y ciclos de vida' },
  { id: 'tree-archetypes', label: 'Arquetipos arbóreos', group: 'Naturaleza', description: 'Todas las morfologías estructurales de las 12 familias' },
  { id: 'flora', label: 'Vegetación menor', group: 'Naturaleza', description: '17 morfologías botánicas' },
  { id: 'geology', label: 'Geología', group: 'Naturaleza', description: '17 formaciones y depósitos' },
  { id: 'terrain', label: 'Materiales del terreno', group: 'Mundo', description: 'Texturas y transiciones de suelo auténticas' },
  { id: 'autotiling', label: 'Autotiling 8 vecinos', group: 'Mundo', description: 'Máscaras de conexión y esquinas de terreno' },
  { id: 'liquids', label: 'Líquidos animados', group: 'Mundo', description: 'Agua superficial, agua profunda, animación y flujo' },
  { id: 'structures', label: 'Arquitectura', group: 'Mundo', description: 'Edificios, puentes, tejados y portales' },
  { id: 'interiors', label: 'Interiores', group: 'Mundo', description: 'Habitaciones, mobiliario y colisiones' },
  { id: 'caves', label: 'Cuevas', group: 'Mundo', description: 'Cámara de cristal y lava' },
  { id: 'farming', label: 'Agricultura', group: 'Mundo', description: 'Cultivos, suelo y etapas de crecimiento' },
  { id: 'equipment', label: 'Iconos de equipamiento', group: 'Sistemas', description: 'Materiales y desgaste de ítems procedurales' },
  { id: 'equipment-materials', label: 'Herramientas por material', group: 'Sistemas', description: 'Seis grados de material, armas y armaduras' },
  { id: 'hud', label: 'HUD / Nine-slice', group: 'Sistemas', description: 'Paneles pixel-perfect y barras de progreso paramétricas' },
  { id: 'particles', label: 'Partículas', group: 'Sistemas', description: '10 emisores, gravedad y pooling' },
  { id: 'weather', label: 'Clima y viento', group: 'Sistemas', description: '11 estados meteorológicos' },
  { id: 'lighting', label: 'Iluminación', group: 'Sistemas', description: 'Fases del día y mapas de luz' }
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

export const TREE_ARCHETYPE_OPTIONS = Object.entries(TREE_MORPHOLOGY_ARCHETYPES)
  .flatMap(([family, entries]) => entries.map(entry => family + ':' + entry.archetypeId));
export const AUTOTILE_MASKS = Array.from({ length: 256 }, (_, i) => String(i));
export const MATERIAL_VARIANTS = Object.keys(MATERIAL_TIER_PALETTES)
  .flatMap(tier => ['weapon_sword','tool_axe','armor_helmet'].map(category => tier + ':' + category));
export const PLAYGROUND_OPTIONS: Readonly<Record<PlaygroundSectionId, readonly string[]>> = {
  world: ['world_overview', 'world_wildlife', 'world_village'],
  characters: AVATAR_VARIANTS,
  'character-actions': CHARACTER_ACTIONS,
  npcs: NPC_PROFESSIONS,
  creatures: Object.keys(CREATURE_SPECIES_CATALOG),
  bosses: BOSS_IDS,
  trees: Object.keys(TREE_SPECIES_CATALOG),
  'tree-archetypes': TREE_ARCHETYPE_OPTIONS,
  flora: Object.keys(FLORA_SPECIES_CATALOG),
  geology: Object.keys(GEOLOGICAL_ARCHETYPE_CATALOG),
  terrain: Object.keys(TERRAIN_MATERIALS),
  autotiling: AUTOTILE_MASKS,
  liquids: ['shallow_water','deep_water'],
  structures: Object.keys(DEFAULT_STRUCTURE_CATALOG),
  interiors: ['cottage_interior'],
  caves: ['crystal_cavern'],
  farming: Object.keys(CROP_SPECIES_CATALOG),
  equipment: ITEM_TYPES,
  'equipment-materials': MATERIAL_VARIANTS,
  hud: ['hud_panel','health_bar','mana_bar','stamina_bar'],
  particles: Object.keys(VFX_EMITTER_PRESETS),
  weather: Object.keys(DEFAULT_WEATHER_STATES),
  lighting: ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night', 'underground_dark']
};

export const CHARACTER_ACTIONS = Object.keys(DEFAULT_CHARACTER_CLIPS);
export const CREATURE_ACTIONS = Object.keys(DEFAULT_CREATURE_CLIPS);
export const EIGHT_DIRECTIONS = ['S','SE','E','NE','N','NW','W','SW'] as const;

const LABELS: Record<string, string> = {
  hero: 'Avatar original',
  shallow_water: 'Agua superficial', deep_water: 'Agua profunda',
  hud_panel: 'Panel nine-slice', health_bar: 'Salud', mana_bar: 'Maná', stamina_bar: 'Energía',
  world_overview: 'Panorámica procedural', world_wildlife: 'Hábitat y fauna',
  world_village: 'Pueblo y habitantes', hero: 'Héroe / jugador',
  village_cottage_01: 'Cabaña aldeana', blacksmith_forge_01: 'Forja',
  north_mine_cave_mouth: 'Entrada a mina', river_wooden_bridge: 'Puente de madera',
  ancient_crystal_colossus: 'Coloso de cristal',
  corrupted_forest_treant_lord: 'Señor Ent corrupto',
  villager_farmer: 'Granjero', blacksmith_artisan: 'Herrero',
  town_guard: 'Guardia', wandering_mage: 'Mago',
  forest_ranger: 'Explorador', merchant_trader: 'Mercader',
  elder_scholar: 'Sabio anciano', miner_prospector: 'Minero',
  dawn: 'Amanecer', morning: 'Mañana', noon: 'Mediodía',
  afternoon: 'Tarde', dusk: 'Atardecer', night: 'Noche',
  underground_dark: 'Oscuridad subterránea',
  idle: 'Reposo', move: 'Movimiento', sprint_flee: 'Huida / galope',
  jump_pounce: 'Salto / emboscada', special_ability: 'Habilidad especial',
  rest_graze: 'Pastoreo', eat_feed: 'Alimentación', sleep: 'Dormir',
  attack: 'Ataque', hurt: 'Herido', death: 'Muerte',
  weapon_sword: 'Espada', tool_axe: 'Hacha',
  tool_pickaxe: 'Pico', armor_chest: 'Coraza', shield: 'Escudo'
};

export function formatPlaygroundLabel(id: string): string {
  if (id.startsWith('avatar_')) return 'Avatar ' + id.slice(-2);
  if (id.includes(':')) return id.split(':').map(part => LABELS[part] ?? part.replace(/[_-]/g, ' ')).join(' · ');
  if (/^\d+$/.test(id)) return 'Máscara ' + id.padStart(3, '0');
  return LABELS[id] ?? id.replace(/[_-]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

export function getPlaygroundSection(id: PlaygroundSectionId) {
  return PLAYGROUND_SECTIONS.find(s => s.id === id)!;
}
