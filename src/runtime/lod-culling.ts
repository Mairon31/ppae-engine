import { CullingViewportRect, LevelOfDetailTier } from '../core/contracts';

export interface CullableEntity {
  readonly id: string;
  readonly worldX: number;
  readonly worldY: number;
}

/**
 * Gestor de Frustum Culling espacial y cálculo de Niveles de Detalle (LOD).
 */
export class LodAndChunkCuller {
  constructor(
    public readonly nearThresholdTiles = 12,
    public readonly farThresholdTiles = 28
  ) {}

  public evaluateLodTier(
    entityWorldX: number,
    entityWorldY: number,
    cameraWorldX: number,
    cameraWorldY: number
  ): LevelOfDetailTier {
    const tileUnits = 16;
    const distTiles = Math.hypot(
      (entityWorldX - cameraWorldX) / tileUnits,
      (entityWorldY - cameraWorldY) / tileUnits
    );

    if (distTiles <= this.nearThresholdTiles) {
      return 'near';
    }
    if (distTiles <= this.farThresholdTiles) {
      return 'mid';
    }
    return 'far';
  }

  public cullEntitiesByViewport<T extends CullableEntity>(
    entities: readonly T[],
    viewport: CullingViewportRect,
    marginTiles = 2
  ): T[] {
    const marginPx = marginTiles * 16;
    const minX = viewport.x - marginPx;
    const maxX = viewport.x + viewport.width + marginPx;
    const minY = viewport.y - marginPx;
    const maxY = viewport.y + viewport.height + marginPx;

    return entities.filter(
      (e) => e.worldX >= minX && e.worldX <= maxX && e.worldY >= minY && e.worldY <= maxY
    );
  }
}
