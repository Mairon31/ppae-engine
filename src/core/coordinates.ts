import { ArtStyleProfile, GranularityProfileId } from './contracts';

/**
 * Perfiles artísticos canónicos preconfigurados.
 * Resuelven la divisibilidad entre 4x4, 6x6 y la celda lógica 16x16 usando una
 * retícula visual canónica de 24 texels por tile (6 módulos de 4x4 ó 4 módulos de 6x6).
 */
export const DEFAULT_STYLE_PROFILES: Readonly<Record<GranularityProfileId, ArtStyleProfile>> = {
  'micro-4x4': {
    schemaVersion: '1.0.0',
    id: 'micro-4x4',
    moduleSize: 4,
    canonicalTileTexels: 24, // 6x6 módulos de 4x4 texels
    logicalTileUnits: 16,
    outlineMode: 'selective-dark',
    shadingSteps: 3,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: false,
    extrudePaddingPx: 1
  },
  'micro-6x6': {
    schemaVersion: '1.0.0',
    id: 'micro-6x6',
    moduleSize: 6,
    canonicalTileTexels: 24, // 4x4 módulos de 6x6 texels
    logicalTileUnits: 16,
    outlineMode: 'selective-dark',
    shadingSteps: 3,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: false,
    extrudePaddingPx: 1
  },
  'hybrid-24': {
    schemaVersion: '1.0.0',
    id: 'hybrid-24',
    moduleSize: 4,
    canonicalTileTexels: 48, // Alta densidad divisible entre 4, 6 y 16
    logicalTileUnits: 16,
    outlineMode: 'selective-dark',
    shadingSteps: 4,
    lightDirectionVector: [-0.7071, -0.7071],
    allowDithering: true,
    extrudePaddingPx: 2
  }
};

export interface WorldCoordinate {
  readonly worldX: number; // En unidades lógicas (1 tile = 16 unidades)
  readonly worldY: number;
}

export interface ScreenProjection {
  readonly screenX: number;
  readonly screenY: number;
  readonly integerScale: number;
  readonly depthSortKey: number;
}

export class CoordinateSystem {
  constructor(private readonly profile: ArtStyleProfile) {}

  /**
   * Convierte dimensiones en módulos a dimensiones exactas en texels
   */
  public modulesToTexels(modulesWidth: number, modulesHeight: number): { width: number; height: number } {
    return {
      width: Math.round(modulesWidth * this.profile.moduleSize),
      height: Math.round(modulesHeight * this.profile.moduleSize)
    };
  }

  /**
   * Convierte coordenadas lógicas del mundo (base 16) a texels del mundo visual canónico (base 24/48)
   * sin alterar jamás la posición física ni el hitbox lógico.
   */
  public logicalToVisualTexel(logicalUnits: number): number {
    const ratio = this.profile.canonicalTileTexels / this.profile.logicalTileUnits;
    return Math.round(logicalUnits * ratio);
  }

  /**
   * Calcula el factor de escala entero (Integer Scaling) libre de pixel shimmering
   */
  public computePixelPerfectZoom(requestedZoom: number, minScale = 1, maxScale = 8): number {
    const clamped = Math.max(minScale, Math.min(maxScale, Math.round(requestedZoom)));
    return clamped;
  }

  /**
   * Proyecta una entidad desde coordenadas lógicas de mundo hacia coordenadas de pantalla pixel-snapped
   */
  public projectWorldToViewport(
    pos: WorldCoordinate,
    cameraWorldX: number,
    cameraWorldY: number,
    requestedZoom: number,
    elevationLogical = 0
  ): ScreenProjection {
    const integerScale = this.computePixelPerfectZoom(requestedZoom);

    const visualX = this.logicalToVisualTexel(pos.worldX);
    const visualY = this.logicalToVisualTexel(pos.worldY);
    const camVisualX = this.logicalToVisualTexel(cameraWorldX);
    const camVisualY = this.logicalToVisualTexel(cameraWorldY);

    // Pixel snapping estricto antes de multiplicar por la escala entera
    const screenX = (visualX - camVisualX) * integerScale;
    const screenY = (visualY - camVisualY) * integerScale;

    // Clave de ordenamiento de profundidad (Y-sorting por punto de apoyo + elevación)
    const depthSortKey = pos.worldY * 1000 + elevationLogical * 10 + (pos.worldX % 10) * 0.01;

    return {
      screenX,
      screenY,
      integerScale,
      depthSortKey
    };
  }
}
