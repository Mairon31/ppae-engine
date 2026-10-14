import {
  ALL_DIRECTIONS_8,
  ArtStyleProfile,
  CharacterActionId,
  CompiledSpritesheetMetadata,
  Direction8,
  EntityAppearance,
  EquipmentLoadout,
  LogicalHitbox,
  PPAE_SCHEMA_VERSION,
  SpritesheetFrameMetadata
} from '../core/contracts';
import { CharacterAvatarGenerator } from '../entities/character-generator';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { DEFAULT_CHARACTER_CLIPS } from './state-machine';

export interface SpritesheetCompilationResult {
  readonly atlasBuffer: PixelBuffer;
  readonly metadata: CompiledSpritesheetMetadata;
}

/**
 * Compila bajo demanda un conjunto de acciones y direcciones en un Spritesheet/Atlas
 * con padding anti-bleeding y metadatos JSON completos (pivotes, anchors, hitboxes, eventos).
 */
export class SpritesheetCompiler {
  private readonly avatarGen = new CharacterAvatarGenerator();

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
}
