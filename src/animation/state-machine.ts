import {
  AnimationClipDefinition,
  AnimationEventId,
  CharacterActionId,
  Direction8,
  PPAE_SCHEMA_VERSION
} from '../core/contracts';

export const DEFAULT_CHARACTER_CLIPS: Readonly<Record<CharacterActionId, AnimationClipDefinition>> = {
  idle: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    action: 'idle',
    frameCount: 4,
    frameDurationMs: 220,
    loop: true,
    priority: 10,
    interruptible: true,
    events: []
  },
  walk: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    action: 'walk',
    frameCount: 6,
    frameDurationMs: 120,
    loop: true,
    priority: 20,
    interruptible: true,
    events: [
      { frameIndex: 1, eventId: 'footstep_right' },
      { frameIndex: 4, eventId: 'footstep_left' }
    ]
  },
  run: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    action: 'run',
    frameCount: 6,
    frameDurationMs: 85,
    loop: true,
    priority: 30,
    interruptible: true,
    events: [
      { frameIndex: 1, eventId: 'footstep_right' },
      { frameIndex: 4, eventId: 'footstep_left' }
    ]
  },
  attack: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    action: 'attack',
    frameCount: 5,
    frameDurationMs: 90,
    loop: false,
    priority: 50,
    interruptible: false,
    events: [{ frameIndex: 2, eventId: 'attack_hit', payload: { hitboxActive: true } }]
  },
  use_tool: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    action: 'use_tool',
    frameCount: 5,
    frameDurationMs: 100,
    loop: false,
    priority: 45,
    interruptible: false,
    events: [{ frameIndex: 2, eventId: 'tool_strike', payload: { harvestTrigger: true } }]
  },
  hurt: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    action: 'hurt',
    frameCount: 3,
    frameDurationMs: 95,
    loop: false,
    priority: 80,
    interruptible: false,
    events: [{ frameIndex: 0, eventId: 'hurt_impact' }]
  },
  death: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    action: 'death',
    frameCount: 5,
    frameDurationMs: 140,
    loop: false,
    priority: 100,
    interruptible: false,
    events: [{ frameIndex: 3, eventId: 'death_collapse' }]
  }
};

export interface DispatchedAnimationEvent {
  readonly action: CharacterActionId;
  readonly direction: Direction8;
  readonly frameIndex: number;
  readonly eventId: AnimationEventId;
  readonly payload?: Readonly<Record<string, string | number | boolean>>;
}

export type AnimationEventListener = (event: DispatchedAnimationEvent) => void;

/**
 * Máquina de estados de animación determinista con control de prioridades,
 * interrupciones, retorno automático a idle y emisión de eventos por fotograma.
 */
export class AnimationStateMachine {
  private currentAction: CharacterActionId = 'idle';
  private fallbackAction: CharacterActionId = 'idle';
  private currentDirection: Direction8 = 'S';
  private currentFrameIndex = 0;
  private elapsedInFrameMs = 0;
  private speedMultiplier = 1.0;
  private isFinished = false;
  private readonly listeners = new Set<AnimationEventListener>();

  constructor(
    private readonly clips: Readonly<Record<CharacterActionId, AnimationClipDefinition>> = DEFAULT_CHARACTER_CLIPS
  ) {}

  public onEvent(listener: AnimationEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setDirection(direction: Direction8): void {
    this.currentDirection = direction;
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(4.0, multiplier));
  }

  /**
   * Solicita una transición de estado respetando prioridades e interrumpibilidad.
   */
  public requestState(nextAction: CharacterActionId, force = false): boolean {
    if (this.currentAction === nextAction && !this.isFinished) {
      return false;
    }

    const currentClip = this.clips[this.currentAction];
    const nextClip = this.clips[nextAction];

    // No interrumpir una acción no interrumpible en curso salvo que la nueva tenga mayor prioridad o force=true
    if (
      !force &&
      !this.isFinished &&
      !currentClip.interruptible &&
      nextClip.priority <= currentClip.priority
    ) {
      return false;
    }

    // Si es un estado de locomoción, recordarlo como estado de retorno al terminar un ataque/herramienta
    if (nextAction === 'idle' || nextAction === 'walk' || nextAction === 'run') {
      this.fallbackAction = nextAction;
    }

    this.currentAction = nextAction;
    this.currentFrameIndex = 0;
    this.elapsedInFrameMs = 0;
    this.isFinished = false;
    this.emitEventsForFrame(0);
    return true;
  }

  /**
   * Cancela de manera segura la acción actual y restaura el estado base (`idle`).
   */
  public cancelToIdle(): void {
    this.currentAction = 'idle';
    this.fallbackAction = 'idle';
    this.currentFrameIndex = 0;
    this.elapsedInFrameMs = 0;
    this.isFinished = false;
  }

  /**
   * Avanza la simulación temporal de la animación en `deltaMs` milisegundos.
   */
  public update(deltaMs: number): void {
    if (this.isFinished) return;

    const clip = this.clips[this.currentAction];
    const effectiveFrameDuration = clip.frameDurationMs / this.speedMultiplier;
    this.elapsedInFrameMs += Math.max(0, deltaMs);

    while (this.elapsedInFrameMs >= effectiveFrameDuration && !this.isFinished) {
      this.elapsedInFrameMs -= effectiveFrameDuration;
      const nextFrame = this.currentFrameIndex + 1;

      if (nextFrame < clip.frameCount) {
        this.currentFrameIndex = nextFrame;
        this.emitEventsForFrame(this.currentFrameIndex);
      } else if (clip.loop) {
        this.currentFrameIndex = 0;
        this.emitEventsForFrame(0);
      } else {
        // Acción finita completada
        this.emitEvent('clip_complete');
        if (this.currentAction === 'death') {
          this.currentFrameIndex = clip.frameCount - 1;
          this.isFinished = true;
        } else {
          // Retorno automático a locomoción previa (idle / walk / run)
          this.currentAction = this.fallbackAction;
          this.currentFrameIndex = 0;
          this.elapsedInFrameMs = 0;
          this.emitEventsForFrame(0);
        }
      }
    }
  }

  public getSnapshot(): {
    readonly action: CharacterActionId;
    readonly direction: Direction8;
    readonly frameIndex: number;
    readonly totalFrames: number;
    readonly isFinished: boolean;
  } {
    const clip = this.clips[this.currentAction];
    return {
      action: this.currentAction,
      direction: this.currentDirection,
      frameIndex: this.currentFrameIndex,
      totalFrames: clip.frameCount,
      isFinished: this.isFinished
    };
  }

  private emitEventsForFrame(frameIndex: number): void {
    const clip = this.clips[this.currentAction];
    for (const ev of clip.events) {
      if (ev.frameIndex === frameIndex) {
        this.emitEvent(ev.eventId, ev.payload);
      }
    }
  }

  private emitEvent(
    eventId: AnimationEventId,
    payload?: Readonly<Record<string, string | number | boolean>>
  ): void {
    const dispatched: DispatchedAnimationEvent = {
      action: this.currentAction,
      direction: this.currentDirection,
      frameIndex: this.currentFrameIndex,
      eventId,
      payload
    };
    for (const listener of this.listeners) {
      listener(dispatched);
    }
  }
}
