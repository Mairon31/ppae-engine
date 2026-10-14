import {
  CreatureActionId,
  CreatureAnimationClipDefinition,
  CreatureFamilyId,
  CreatureSpeciesId,
  PPAE_SCHEMA_VERSION,
  SpeciesAnimationCapabilityProfile
} from '../core/contracts';
import { CREATURE_SPECIES_CATALOG } from '../entities/creature-archetypes';

/** Canonical frame-exact creature clips. Event payloads are gameplay-facing. */
export const DEFAULT_CREATURE_CLIPS: Readonly<Record<CreatureActionId, CreatureAnimationClipDefinition>> = {
  idle: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'idle', frameCount: 4,
    frameDurationMs: 220, loop: true, priority: 10,
    interruptible: true,
    events: []
  },
  move: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'move', frameCount: 6,
    frameDurationMs: 115, loop: true, priority: 20,
    interruptible: true,
    events: [{ frameIndex: 1, eventId: 'footstep_right' }, { frameIndex: 4, eventId: 'footstep_left' }]
  },
  sprint_flee: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'sprint_flee', frameCount: 6,
    frameDurationMs: 75, loop: true, priority: 32,
    interruptible: true,
    events: [{ frameIndex: 1, eventId: 'footstep_right' }, { frameIndex: 4, eventId: 'footstep_left' }]
  },
  rest_graze: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'rest_graze', frameCount: 6,
    frameDurationMs: 180, loop: true, priority: 15,
    interruptible: true,
    events: []
  },
  eat_feed: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'eat_feed', frameCount: 4,
    frameDurationMs: 150, loop: false, priority: 25,
    interruptible: true,
    events: [{ frameIndex: 2, eventId: 'consume_item_effect' }]
  },
  sleep: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'sleep', frameCount: 4,
    frameDurationMs: 320, loop: true, priority: 12,
    interruptible: true,
    events: []
  },
  jump_pounce: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'jump_pounce', frameCount: 5,
    frameDurationMs: 85, loop: false, priority: 48,
    interruptible: false,
    events: [{ frameIndex: 3, eventId: 'attack_hit', payload: {"pounce":true} }]
  },
  swim: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'swim', frameCount: 6,
    frameDurationMs: 120, loop: true, priority: 22,
    interruptible: true,
    events: [{ frameIndex: 1, eventId: 'swim_stroke' }, { frameIndex: 4, eventId: 'swim_stroke' }]
  },
  attack: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'attack', frameCount: 5,
    frameDurationMs: 90, loop: false, priority: 50,
    interruptible: false,
    events: [{ frameIndex: 2, eventId: 'attack_hit' }]
  },
  special_ability: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'special_ability', frameCount: 6,
    frameDurationMs: 95, loop: false, priority: 60,
    interruptible: false,
    events: [{ frameIndex: 3, eventId: 'spell_cast_release' }]
  },
  hurt: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'hurt', frameCount: 3,
    frameDurationMs: 95, loop: false, priority: 80,
    interruptible: false,
    events: [{ frameIndex: 0, eventId: 'hurt_impact' }]
  },
  death: {
    schemaVersion: PPAE_SCHEMA_VERSION, action: 'death', frameCount: 5,
    frameDurationMs: 140, loop: false, priority: 100,
    interruptible: false,
    events: [{ frameIndex: 3, eventId: 'death_collapse' }]
  }
};

/** Anatomical capabilities are family defaults; peaceful wildlife narrows them. */
export const FAMILY_ANIMATION_CAPABILITIES: Readonly<Record<CreatureFamilyId, SpeciesAnimationCapabilityProfile>> = {
  quadruped: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    family: 'quadruped',
    locomotionMedia: ['terrestrial', 'amphibious'],
    supportedActions: ['idle', 'move', 'sprint_flee', 'rest_graze', 'eat_feed', 'sleep', 'jump_pounce', 'swim', 'attack', 'special_ability', 'hurt', 'death'],
    fallbackActionMap: {}
  },
  avian_biped: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    family: 'avian_biped',
    locomotionMedia: ['terrestrial', 'aerial'],
    supportedActions: ['idle', 'move', 'sprint_flee', 'rest_graze', 'eat_feed', 'sleep', 'jump_pounce', 'attack', 'special_ability', 'hurt', 'death'],
    fallbackActionMap: {"swim":"move"}
  },
  gelatinous_slime: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    family: 'gelatinous_slime',
    locomotionMedia: ['terrestrial', 'amphibious'],
    supportedActions: ['idle', 'move', 'sprint_flee', 'sleep', 'jump_pounce', 'swim', 'attack', 'special_ability', 'hurt', 'death'],
    fallbackActionMap: {"rest_graze":"idle","eat_feed":"special_ability"}
  },
  arachnid: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    family: 'arachnid',
    locomotionMedia: ['terrestrial'],
    supportedActions: ['idle', 'move', 'sprint_flee', 'eat_feed', 'sleep', 'jump_pounce', 'attack', 'special_ability', 'hurt', 'death'],
    fallbackActionMap: {"rest_graze":"idle","swim":"move"}
  },
  flying_winged: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    family: 'flying_winged',
    locomotionMedia: ['aerial'],
    supportedActions: ['idle', 'move', 'sprint_flee', 'sleep', 'jump_pounce', 'attack', 'special_ability', 'hurt', 'death'],
    fallbackActionMap: {"rest_graze":"idle","eat_feed":"attack","swim":"move"}
  },
  aquatic_swimmer: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    family: 'aquatic_swimmer',
    locomotionMedia: ['aquatic'],
    supportedActions: ['idle', 'move', 'sprint_flee', 'eat_feed', 'sleep', 'swim', 'attack', 'hurt', 'death'],
    fallbackActionMap: {"rest_graze":"swim","jump_pounce":"sprint_flee","special_ability":"sprint_flee"}
  }
};

export class SpeciesAnimationCapabilityRegistry {
  public getFamilyCapabilities(family: CreatureFamilyId): SpeciesAnimationCapabilityProfile {
    return FAMILY_ANIMATION_CAPABILITIES[family];
  }

  public getSpeciesSupportedActions(speciesId: CreatureSpeciesId): readonly CreatureActionId[] {
    const spec = CREATURE_SPECIES_CATALOG[speciesId];
    const family = FAMILY_ANIMATION_CAPABILITIES[spec.family];
    // Non-hostile quadrupeds can flee, graze, sleep and defend themselves,
    // but have no predatory pounce or magical/area attack.
    if (!spec.isHostile && spec.family === 'quadruped') {
      return family.supportedActions.filter(action =>
        action !== 'jump_pounce' && action !== 'special_ability'
      );
    }
    return family.supportedActions;
  }

  public isActionSupportedBySpecies(speciesId: CreatureSpeciesId, action: CreatureActionId): boolean {
    return this.getSpeciesSupportedActions(speciesId).includes(action);
  }

  /**
   * Always produce a supported action; fallback chains are intentionally
   * bounded and resolve without depending on previous requests or state.
   */
  public resolveSupportedAction(
    speciesId: CreatureSpeciesId,
    requestedAction: CreatureActionId
  ): CreatureActionId {
    const actions = this.getSpeciesSupportedActions(speciesId);
    if (actions.includes(requestedAction)) return requestedAction;

    const spec = CREATURE_SPECIES_CATALOG[speciesId];
    const mapped = FAMILY_ANIMATION_CAPABILITIES[spec.family].fallbackActionMap[requestedAction];
    if (mapped && actions.includes(mapped)) return mapped;

    if (requestedAction === 'jump_pounce') {
      // Peaceful quadrupeds flee/move rather than performing predator attacks.
      if (!spec.isHostile && actions.includes('move')) return 'move';
      if (actions.includes('attack')) return 'attack';
    }
    if (requestedAction === 'special_ability') {
      if (!spec.isHostile && actions.includes('move')) return 'move';
      if (actions.includes('attack')) return 'attack';
    }
    if (requestedAction === 'swim' && actions.includes('move')) return 'move';
    if (requestedAction === 'rest_graze' && actions.includes('swim')) return 'swim';
    return actions.includes('idle') ? 'idle' : actions[0];
  }

  public getClipDefinition(action: CreatureActionId): CreatureAnimationClipDefinition {
    return DEFAULT_CREATURE_CLIPS[action];
  }
}
