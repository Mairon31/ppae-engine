import {
  ContractValidationError,
  Direction8,
  LogicalRect,
  PortalDefinition,
  PortalEndpoint,
  WorldSpaceKind
} from '../core/contracts';

export interface EntitySpatialState {
  readonly entityId: string;
  readonly spaceKind: WorldSpaceKind;
  readonly spaceId: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly facingDirection: Direction8;
  readonly inventoryKeys?: readonly string[];
}

export interface PortalTransitionOutcome {
  readonly transitioned: boolean;
  readonly blockedReason?: 'door_closed' | 'door_locked' | 'hysteresis_disarmed' | 'no_portal_hit';
  readonly nextState: EntitySpatialState;
  readonly activePortalId?: string;
}

export function pointInLogicalRect(x: number, y: number, rect: LogicalRect): boolean {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}

export function rectsIntersect(a: LogicalRect, b: LogicalRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Gestor formal de portales exterior/interior/cueva y oclusión selectiva de techos.
 * Impide matemáticamente los bucles de reentrada inmediata y valida que los puntos
 * de aparición seguros no colisionen con umbrales ni con mobiliario.
 */
export class PortalAndOcclusionManager {
  private readonly portals = new Map<string, PortalDefinition>();
  /**
   * Mapa de histéresis: `entityId -> portalId` que acaba de depositar a la entidad.
   * Mientras la entidad no se aleje o cambie su estado de contacto, no puede reactivar involuntariamente el mismo portal en el fotograma de llegada.
   */
  private readonly disarmedPortalsByEntity = new Map<string, string>();

  public registerPortal(
    portal: PortalDefinition,
    obstacleRectsSideA: readonly LogicalRect[] = [],
    obstacleRectsSideB: readonly LogicalRect[] = []
  ): void {
    this.validatePortalSafety(portal, obstacleRectsSideA, obstacleRectsSideB);
    this.portals.set(portal.portalId, portal);
  }

  public getPortal(portalId: string): PortalDefinition {
    const p = this.portals.get(portalId);
    if (!p) {
      throw new Error(`[PortalAndOcclusionManager] Unknown portal '${portalId}'`);
    }
    return p;
  }

  public setDoorState(
    portalId: string,
    state: { isOpen?: boolean; isLocked?: boolean }
  ): PortalDefinition {
    const existing = this.getPortal(portalId);
    const updated: PortalDefinition = {
      ...existing,
      isOpen: state.isOpen ?? existing.isOpen,
      isLocked: state.isLocked ?? existing.isLocked
    };
    this.portals.set(portalId, updated);
    return updated;
  }

  /**
   * Valida que los puntos seguros de aparición (`safeSpawnPoint`) de ambos extremos:
   * 1. No caigan dentro de su propio `triggerRect` (evita teletransporte en bucle infinito).
   * 2. No caigan dentro de ningún muro o mueble sólido del espacio destino.
   */
  public validatePortalSafety(
    portal: PortalDefinition,
    obstaclesA: readonly LogicalRect[],
    obstaclesB: readonly LogicalRect[]
  ): void {
    const checkEndpoint = (
      label: string,
      endpoint: PortalEndpoint,
      obstacles: readonly LogicalRect[]
    ) => {
      const { worldX, worldY } = endpoint.safeSpawnPoint;
      if (pointInLogicalRect(worldX, worldY, endpoint.triggerRect)) {
        throw new ContractValidationError(
          `Portal '${portal.portalId}' (${label}) safeSpawnPoint (${worldX},${worldY}) overlaps its own triggerRect! This would cause an infinite re-entry loop.`
        );
      }
      for (const obs of obstacles) {
        if (pointInLogicalRect(worldX, worldY, obs)) {
          throw new ContractValidationError(
            `Portal '${portal.portalId}' (${label}) safeSpawnPoint (${worldX},${worldY}) collides with a solid wall or furniture obstacle!`
          );
        }
      }
    };

    checkEndpoint('sideA', portal.sideA, obstaclesA);
    checkEndpoint('sideB', portal.sideB, obstaclesB);
  }

  /**
   * Evalúa si una entidad en movimiento activa un portal y devuelve su nuevo estado espacial.
   */
  public evaluateEntityPortalStep(entity: EntitySpatialState): PortalTransitionOutcome {
    let hitAnyThreshold = false;

    for (const portal of this.portals.values()) {
      const hitA =
        entity.spaceKind === portal.sideA.spaceKind &&
        entity.spaceId === portal.sideA.spaceId &&
        pointInLogicalRect(entity.worldX, entity.worldY, portal.sideA.triggerRect);

      const hitB =
        entity.spaceKind === portal.sideB.spaceKind &&
        entity.spaceId === portal.sideB.spaceId &&
        pointInLogicalRect(entity.worldX, entity.worldY, portal.sideB.triggerRect);

      if (!hitA && !hitB) continue;
      hitAnyThreshold = true;

      // Verificar cerrojo de histéresis
      if (this.disarmedPortalsByEntity.get(entity.entityId) === portal.portalId) {
        return {
          transitioned: false,
          blockedReason: 'hysteresis_disarmed',
          nextState: entity,
          activePortalId: portal.portalId
        };
      }

      // Verificar si la puerta tiene cerradura activa
      if (portal.isLocked) {
        const hasKey =
          portal.requiredKeyId !== undefined &&
          (entity.inventoryKeys ?? []).includes(portal.requiredKeyId);
        if (!hasKey) {
          return {
            transitioned: false,
            blockedReason: 'door_locked',
            nextState: entity,
            activePortalId: portal.portalId
          };
        }
      }

      // Verificar si la puerta está abierta
      if (!portal.isOpen) {
        return {
          transitioned: false,
          blockedReason: 'door_closed',
          nextState: entity,
          activePortalId: portal.portalId
        };
      }

      const targetEndpoint = hitA ? portal.sideB : portal.sideA;
      this.disarmedPortalsByEntity.set(entity.entityId, portal.portalId);

      return {
        transitioned: true,
        activePortalId: portal.portalId,
        nextState: {
          ...entity,
          spaceKind: targetEndpoint.spaceKind,
          spaceId: targetEndpoint.spaceId,
          worldX: targetEndpoint.safeSpawnPoint.worldX,
          worldY: targetEndpoint.safeSpawnPoint.worldY,
          facingDirection: targetEndpoint.safeSpawnPoint.facingDirection
        }
      };
    }

    // Si la entidad no pisa ningún umbral, liberar cualquier cerrojo de histéresis previo
    if (!hitAnyThreshold) {
      this.disarmedPortalsByEntity.delete(entity.entityId);
    }

    return {
      transitioned: false,
      blockedReason: 'no_portal_hit',
      nextState: entity
    };
  }

  /**
   * Calcula el estado de oclusión del techo de un edificio:
   * - `hidden` (0.0) si el jugador está dentro del interior de ese edificio.
   * - `cutaway` (0.25) si el jugador camina detrás o bajo el alero (`roofOcclusionFootprint`) en el exterior.
   * - `opaque` (1.0) en caso normal.
   */
  public resolveRoofOcclusionState(
    structureId: string,
    structureWorldOriginX: number,
    structureWorldOriginY: number,
    localRoofFootprint: LogicalRect,
    playerState: EntitySpatialState
  ): {
    readonly mode: 'opaque' | 'cutaway' | 'hidden';
    readonly opacity: number;
  } {
    if (
      playerState.spaceKind === 'building_interior' &&
      playerState.spaceId.includes(structureId)
    ) {
      return { mode: 'hidden', opacity: 0.0 };
    }

    const worldFootprint: LogicalRect = {
      x: structureWorldOriginX + localRoofFootprint.x,
      y: structureWorldOriginY + localRoofFootprint.y,
      width: localRoofFootprint.width,
      height: localRoofFootprint.height
    };

    if (
      playerState.spaceKind === 'exterior_overworld' &&
      pointInLogicalRect(playerState.worldX, playerState.worldY, worldFootprint)
    ) {
      return { mode: 'cutaway', opacity: 0.25 };
    }

    return { mode: 'opaque', opacity: 1.0 };
  }
}
