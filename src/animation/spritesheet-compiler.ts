import {
  ALL_DIRECTIONS_8,
  ArtStyleProfile,
  CharacterActionId,
  CompiledCreatureSpritesheetMetadata,
  CompiledSpritesheetMetadata,
  CreatureActionId,
  CreatureSpeciesId,
  CreatureSpritesheetFrameMetadata,
  Direction8,
  EntityAppearance,
  EquipmentLoadout,
  LogicalHitbox,
  PPAE_SCHEMA_VERSION,
  SpritesheetFrameMetadata
} from '../core/contracts';
import { CharacterAvatarGenerator } from '../entities/character-generator';
import { CREATURE_SPECIES_CATALOG, CreatureGenerator } from '../entities/creature-archetypes';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { DEFAULT_CHARACTER_CLIPS } from './state-machine';
import { DEFAULT_CREATURE_CLIPS, SpeciesAnimationCapabilityRegistry } from './species-capabilities';

export interface SpritesheetCompilationResult {
  readonly atlasBuffer: PixelBuffer;
  readonly metadata: CompiledSpritesheetMetadata;
}

export interface CreatureSpritesheetCompilationResult {
  readonly atlasBuffer: PixelBuffer;
  readonly metadata: CompiledCreatureSpritesheetMetadata;
}

/**
 * Compila bajo demanda un conjunto de acciones y direcciones en un Spritesheet/Atlas
 * con padding anti-bleeding y metadatos JSON completos (pivotes, anchors, hitboxes, eventos).
 */
export class SpritesheetCompiler {
  private readonly avatarGen = new CharacterAvatarGenerator();
  private readonly creatureGen = new CreatureGenerator();
  private readonly capabilityRegistry = new SpeciesAnimationCapabilityRegistry();

  public compileCharacterSheet(
    appearance: EntityAppearance,
    equipment: EquipmentLoadout,
    profile: ArtStyleProfile,
    actions: readonly CharacterActionId[] = ['idle', 'walk', 'attack'],
    directions: readonly Direction8[] = ALL_DIRECTIONS_8
  ): SpritesheetCompilationResult {
    const pad = profile.extrudePaddingPx;
    const baseFrameW = 6 * profile.moduleSize;
    const baseFrameH = 8 * profile.moduleSize;
    const cellW = baseFrameW + pad * 2;
    const cellH = baseFrameH + pad * 2;

    // Calculamos el máximo de fotogramas por fila y el total de filas (acción × dirección)
    let maxCols = 1;
    for (const act of actions) {
      maxCols = Math.max(maxCols, DEFAULT_CHARACTER_CLIPS[act].frameCount);
    }
    const totalRows = actions.length * directions.length;

    const sheetWidth = maxCols * cellW;
    const sheetHeight = totalRows * cellH;
    const atlasBuffer = new PixelBuffer(sheetWidth, sheetHeight);

    const frames: Record<string, SpritesheetFrameMetadata> = {};
    const sequenceOrder: Record<string, readonly string[]> = {};

    const defaultHitbox: LogicalHitbox = {
      offsetX: -5,
      offsetY: -4,
      width: 10,
      height: 8,
      collidable: true
    };

    let currentRow = 0;

    for (const action of actions) {
      const clip = DEFAULT_CHARACTER_CLIPS[action];

      for (const direction of directions) {
        const seqKey = `${action}_${direction}`;
        const seqFrames: string[] = [];

        for (let f = 0; f < clip.frameCount; f++) {
          const rendered = this.avatarGen.renderCharacterFrame(
            appearance,
            equipment,
            action,
            direction,
            f,
            clip.frameCount,
            profile
          );

      const paddedFrame = rendered.buffer.withExtrudedPadding(pad);
          const atlasX = f * cellW;
          const atlasY = currentRow * cellH;

          // Copiar el fotograma con padding dentro del atlas global
          for (let py = 0; py < cellH; py++) {
            for (let px = 0; px < cellW; px++) {
              atlasBuffer.setPixel(atlasX + px, atlasY + py, paddedFrame.getPixel(px, py));
            }
          }

          const frameKey = `${appearance.entityId}::${action}::${direction}::f${f}`;
          seqFrames.push(frameKey);

          const frameEvents = clip.events
            .filter((ev) => ev.frameIndex === f)
            .map((ev) => ev.eventId);

          frames[frameKey] = {
            frameKey,
            action,
            direction,
            frameIndex: f,
            atlasX,
            atlasY,
            width: cellW,
            height: cellH,
            innerX: atlasX + pad,
            innerY: atlasY + pad,
            innerWidth: baseFrameW,
            innerHeight: baseFrameH,
            durationMs: clip.frameDurationMs,
            pivotTexel: [rendered.pivotTexel[0] + pad, rendered.pivotTexel[1] + pad],
            anchors: rendered.anchors,
            hitbox: defaultHitbox,
            events: frameEvents
          };
        }

        sequenceOrder[seqKey] = seqFrames;
        currentRow++;
      }
    }

    return {
      atlasBuffer,
      metadata: {
        schemaVersion: PPAE_SCHEMA_VERSION,
        entityId: appearance.entityId,
        profileId: profile.id,
        sheetWidth,
        sheetHeight,
        paddingPx: pad,
        directions,
        actions,
        frames,
        sequenceOrder
      }
    };
  }

  /**
   * Compile 8-directional atlases for all six creature anatomies. Unsupported
   * actions are resolved through the same family/species capability registry
   * used by gameplay callers; duplicate fallbacks are emitted only once.
   */
  public compileCreatureSheet(
    speciesId: CreatureSpeciesId,
    profile: ArtStyleProfile,
    requestedActions: readonly CreatureActionId[] = ['idle', 'move', 'attack'],
    directions: readonly Direction8[] = ALL_DIRECTIONS_8,
    variantSeed = 2026
  ): CreatureSpritesheetCompilationResult {
    const species = CREATURE_SPECIES_CATALOG[speciesId];
    const pad = profile.extrudePaddingPx;
    const frameW = species.widthModules * profile.moduleSize;
    const frameH = species.heightModules * profile.moduleSize;
    const cellW = frameW + pad * 2;
    const cellH = frameH + pad * 2;

    const validActions = [...new Set(
      (requestedActions.length > 0 ? requestedActions : ['idle'] as CreatureActionId[])
        .map(a => this.capabilityRegistry.resolveSupportedAction(speciesId, a))
    )];
    const maxCols = Math.max(...validActions.map(a => DEFAULT_CREATURE_CLIPS[a].frameCount));
    const atlasBuffer = new PixelBuffer(
      maxCols * cellW,
      validActions.length * directions.length * cellH
    );
    const frames: Record<string, CreatureSpritesheetFrameMetadata> = {};
    const sequenceOrder: Record<string, readonly string[]> = {};
    let row = 0;

    for (const action of validActions) {
      const clip = DEFAULT_CREATURE_CLIPS[action];
      for (const direction of directions) {
        const sequenceKey = `${action}_${direction}`;
        const frameKeys: string[] = [];

        for (let frameIndex = 0; frameIndex < clip.frameCount; frameIndex++) {
          const rendered = this.creatureGen.renderCreatureFrame(
            speciesId, action, direction, frameIndex, clip.frameCount,
            profile, variantSeed
          );
          const padded = rendered.buffer.withExtrudedPadding(pad);
          const atlasX = frameIndex * cellW;
          const atlasY = row * cellH;
          for (let y = 0; y < cellH; y++) {
            for (let x = 0; x < cellW; x++) {
              atlasBuffer.setPixel(atlasX + x, atlasY + y, padded.getPixel(x, y));
            }
          }

          const key = `${speciesId}::${action}::${direction}::f${frameIndex}`;
          frameKeys.push(key);
          // Anchor coordinates are relative to their padded atlas cell, just
          // like the pivot; normalized coordinates match the padded cell too.
          const anchors = Object.fromEntries(
            Object.entries(rendered.anchors).map(([id, anchor]) => {
              const texelX = anchor.texelX + pad;
              const texelY = anchor.texelY + pad;
              return [id, {
                ...anchor,
                texelX,
                texelY,
                normalizedX: texelX / cellW,
                normalizedY: texelY / cellH
              }];
            })
          );

          frames[key] = {
            frameKey: key,
            speciesId,
            action,
            direction,
            frameIndex,
            atlasX, atlasY,
            width: cellW, height: cellH,
            innerX: atlasX + pad, innerY: atlasY + pad,
            innerWidth: frameW, innerHeight: frameH,
            durationMs: clip.frameDurationMs,
            pivotTexel: [rendered.pivotTexel[0] + pad, rendered.pivotTexel[1] + pad],
            anchors,
            hitbox: species.logicalHitbox,
            events: clip.events.filter(e => e.frameIndex === frameIndex).map(e => e.eventId)
          };
        }
        sequenceOrder[sequenceKey] = frameKeys;
        row++;
      }
    }

    return {
      atlasBuffer,
      metadata: {
        schemaVersion: PPAE_SCHEMA_VERSION,
        speciesId,
        family: species.family,
        profileId: profile.id,
        sheetWidth: atlasBuffer.width,
        sheetHeight: atlasBuffer.height,
        paddingPx: pad,
        directions,
        actions: validActions,
        frames,
        sequenceOrder
      }
    };
  }
}
