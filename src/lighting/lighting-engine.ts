import {
  AmbientLightProfile,
  ArtStyleProfile,
  LightSourceDefinition,
  LogicalRect,
  RGBAColor,
  TimeOfDayPhase
} from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

/**
 * Matriz ordenada de Bayer 4x4 normalizada en [-0.5, 0.5] para dithering pixel-art opcional
 */
const BAYER_4X4: readonly (readonly number[])[] = [
  [-0.4375, 0.0625, -0.3125, 0.1875],
  [0.3125, -0.1875, 0.4375, -0.0625],
  [-0.25, 0.25, -0.375, 0.125],
  [0.5, 0.0, 0.375, -0.125]
];

export const AMBIENT_PROFILES_BY_PHASE: Readonly<Record<TimeOfDayPhase, AmbientLightProfile>> = {
  dawn: {
    phase: 'dawn',
    ambientColorHex: '#fdba74',
    ambientIntensity: 0.58,
    shadowLengthMultiplier: 1.6
  },
  morning: {
    phase: 'morning',
    ambientColorHex: '#fef9c3',
    ambientIntensity: 0.85,
    shadowLengthMultiplier: 1.15
  },
  noon: {
    phase: 'noon',
    ambientColorHex: '#ffffff',
    ambientIntensity: 1.0,
    shadowLengthMultiplier: 0.65
  },
  afternoon: {
    phase: 'afternoon',
    ambientColorHex: '#fef08a',
    ambientIntensity: 0.88,
    shadowLengthMultiplier: 1.1
  },
  dusk: {
    phase: 'dusk',
    ambientColorHex: '#f97316',
    ambientIntensity: 0.52,
    shadowLengthMultiplier: 1.75
  },
  night: {
    phase: 'night',
    ambientColorHex: '#1e3a8a',
    ambientIntensity: 0.22,
    shadowLengthMultiplier: 0.4
  },
  underground_dark: {
    phase: 'underground_dark',
    ambientColorHex: '#0f172a',
    ambientIntensity: 0.12,
    shadowLengthMultiplier: 0.3
  }
};

export interface LightingEvaluationTelemetry {
  readonly registeredLightsCount: number;
  readonly visibleLightsAfterCulling: number;
  readonly activeLightsEvaluated: number;
  readonly culledLightsCount: number;
  readonly ambientIntensity: number;
}

/**
 * Subsistema de iluminación 2D pixel-perfect con:
 * - Cuantización por bandas discretas y dithering Bayer 4x4.
 * - Oclusión de luz por paredes mediante raycasting discreto 2D.
 * - Culling espacial por frustum de cámara y presupuesto máximo de luces.
 */
export class PixelPerfectLightingEngine {
  private readonly lights = new Map<string, LightSourceDefinition>();

  constructor(public maxActiveLightsBudget = 16) {}

  public registerLight(light: LightSourceDefinition): void {
    this.lights.set(light.lightId, light);
  }

  public removeLight(lightId: string): boolean {
    return this.lights.delete(lightId);
  }

  public clearLights(): void {
    this.lights.clear();
  }

  public getRegisteredLights(): LightSourceDefinition[] {
    return Array.from(this.lights.values());
  }

  /**
   * Resuelve el perfil ambiental a partir de una hora del día en formato [0.0 a 24.0)
   * o fuerza oscuridad subterránea cuando `isUnderground = true`.
   */
  public resolveAmbientProfileFromHour(hour24: number, isUnderground = false): AmbientLightProfile {
    if (isUnderground) {
      return AMBIENT_PROFILES_BY_PHASE.underground_dark;
    }
    const h = ((hour24 % 24) + 24) % 24;
    if (h >= 5 && h < 7) return AMBIENT_PROFILES_BY_PHASE.dawn;
    if (h >= 7 && h < 11) return AMBIENT_PROFILES_BY_PHASE.morning;
    if (h >= 11 && h < 15) return AMBIENT_PROFILES_BY_PHASE.noon;
    if (h >= 15 && h < 18) return AMBIENT_PROFILES_BY_PHASE.afternoon;
    if (h >= 18 && h < 20.5) return AMBIENT_PROFILES_BY_PHASE.dusk;
    return AMBIENT_PROFILES_BY_PHASE.night;
  }

  /**
   * Filtra luces fuera de cámara (Frustum Culling) y aplica el presupuesto `maxActiveLightsBudget`
   */
  public cullAndPrioritizeLights(cameraWorldRect: LogicalRect): {
    activeLights: LightSourceDefinition[];
    telemetry: Omit<LightingEvaluationTelemetry, 'ambientIntensity'>;
  } {
    const all = Array.from(this.lights.values()).filter((l) => l.enabled && l.intensity > 0);
    const visible: LightSourceDefinition[] = [];

    for (const light of all) {
      const r = light.radiusLogical;
      const inFrustum =
        light.worldX + r >= cameraWorldRect.x &&
        light.worldX - r <= cameraWorldRect.x + cameraWorldRect.width &&
        light.worldY + r >= cameraWorldRect.y &&
        light.worldY - r <= cameraWorldRect.y + cameraWorldRect.height;

      if (inFrustum) {
        visible.push(light);
      }
    }

    // Ordenar por prioridad descendente y luego por cercanía al centro de cámara
    const camCenterX = cameraWorldRect.x + cameraWorldRect.width * 0.5;
    const camCenterY = cameraWorldRect.y + cameraWorldRect.height * 0.5;

    visible.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const distA = Math.hypot(a.worldX - camCenterX, a.worldY - camCenterY);
      const distB = Math.hypot(b.worldX - camCenterX, b.worldY - camCenterY);
      return distA - distB;
    });

    const activeLights = visible.slice(0, this.maxActiveLightsBudget);

    return {
      activeLights,
      telemetry: {
        registeredLightsCount: all.length,
        visibleLightsAfterCulling: visible.length,
        activeLightsEvaluated: activeLights.length,
        culledLightsCount: all.length - visible.length
      }
    };
  }

  /**
   * Compone la iluminación cuantizada y las sombras ocluidas directamente sobre una copia
   * del buffer de escena, devolviendo el resultado iluminado y su telemetría.
   */
  public applyLightingToScene(
    sceneBuffer: PixelBuffer,
    cameraWorldRect: LogicalRect,
    ambient: AmbientLightProfile,
    profile: ArtStyleProfile,
    occluderRectsLogical: readonly LogicalRect[] = [],
    timeSeconds = 0,
    weatherDarkeningFactor = 0,
    lightningFlash = 0
  ): {
    litBuffer: PixelBuffer;
    lightmapBuffer: PixelBuffer;
    telemetry: LightingEvaluationTelemetry;
  } {
    const w = sceneBuffer.width;
    const h = sceneBuffer.height;
    const litBuffer = new PixelBuffer(w, h);
    const lightmapBuffer = new PixelBuffer(w, h);

    const { activeLights, telemetry } = this.cullAndPrioritizeLights(cameraWorldRect);
    const texelsPerLogical = profile.canonicalTileTexels / profile.logicalTileUnits;

    // Color e intensidad ambiental base modulados por clima y relámpagos
    const ambColor = hexToRgba(ambient.ambientColorHex);
    const baseAmbIntensity = Math.max(
      0.08,
      Math.min(1.0, ambient.ambientIntensity * (1 - weatherDarkeningFactor * 0.35) + lightningFlash * 0.75)
    );

    // Precalcular fuentes de luz en coordenadas de texel de pantalla
    const preparedLights = activeLights.map((l) => {
      const flicker =
        l.flickerAmplitude > 0
          ? Math.sin(timeSeconds * l.flickerSpeed + l.worldX * 0.3) * l.flickerAmplitude
          : 0;
      return {
        def: l,
        screenX: Math.round((l.worldX - cameraWorldRect.x) * texelsPerLogical),
        screenY: Math.round((l.worldY - cameraWorldRect.y) * texelsPerLogical),
        radiusTexels: Math.max(4, Math.round(l.radiusLogical * texelsPerLogical * (1 + flicker * 0.25))),
        effectiveIntensity: Math.max(0, l.intensity + flicker),
        rgb: hexToRgba(l.colorHex)
      };
    });

    // Convertir rectángulos oclusores de paredes a espacio de texels de pantalla
    const screenOccluders = occluderRectsLogical.map((r) => ({
      x0: Math.floor((r.x - cameraWorldRect.x) * texelsPerLogical),
      y0: Math.floor((r.y - cameraWorldRect.y) * texelsPerLogical),
      x1: Math.ceil((r.x + r.width - cameraWorldRect.x) * texelsPerLogical),
      y1: Math.ceil((r.y + r.height - cameraWorldRect.y) * texelsPerLogical)
    }));

    const bands = Math.max(3, profile.shadingSteps + 1);

    for (let y = 0; y < h; y++) {
      const bayerRow = BAYER_4X4[y & 3];
      for (let x = 0; x < w; x++) {
        let totalR = (ambColor.r / 255) * baseAmbIntensity;
        let totalG = (ambColor.g / 255) * baseAmbIntensity;
        let totalB = (ambColor.b / 255) * baseAmbIntensity;

        const ditherOffset = profile.allowDithering ? bayerRow[x & 3] * (0.65 / bands) : 0;

        for (const pl of preparedLights) {
          const dx = x - pl.screenX;
          const dy = y - pl.screenY;
          const distSq = dx * dx + dy * dy;
          const rSq = pl.radiusTexels * pl.radiusTexels;
          if (distSq >= rSq) continue;

          // Verificar oclusión de pared si la luz proyecta sombras
          if (
            pl.def.castsShadows &&
            screenOccluders.length > 0 &&
            this.isRayOccluded(pl.screenX, pl.screenY, x, y, screenOccluders)
          ) {
            continue;
          }

          const dist = Math.sqrt(distSq);
          const rawFalloff = 1.0 - dist / pl.radiusTexels;

          // Cuantización discreta por escalones (sin degradados continuos)
          const quantizedBand = Math.max(
            0,
            Math.min(1, Math.floor((rawFalloff + ditherOffset) * bands) / (bands - 1))
          );

          const contrib = quantizedBand * pl.effectiveIntensity;
          totalR += (pl.rgb.r / 255) * contrib;
          totalG += (pl.rgb.g / 255) * contrib;
          totalB += (pl.rgb.b / 255) * contrib;
        }

        const clampedR = Math.min(1.35, totalR);
        const clampedG = Math.min(1.35, totalG);
        const clampedB = Math.min(1.35, totalB);

        const lmColor: RGBAColor = {
          r: Math.min(255, Math.round(clampedR * 200)),
          g: Math.min(255, Math.round(clampedG * 200)),
          b: Math.min(255, Math.round(clampedB * 200)),
          a: 255
        };
        lightmapBuffer.setPixel(x, y, lmColor);

        const basePx = sceneBuffer.getPixel(x, y);
        litBuffer.setPixel(x, y, {
          r: Math.min(255, Math.round(basePx.r * clampedR)),
          g: Math.min(255, Math.round(basePx.g * clampedG)),
          b: Math.min(255, Math.round(basePx.b * clampedB)),
          a: basePx.a
        });
      }
    }

    return {
      litBuffer,
      lightmapBuffer,
      telemetry: {
        ...telemetry,
        ambientIntensity: Number(baseAmbIntensity.toFixed(2))
      }
    };
  }

  /**
   * Comprueba si el segmento entre la fuente de luz `(lx, ly)` y el texel destino `(tx, ty)`
   * atraviesa algún rectángulo oclusor de pared.
   */
  private isRayOccluded(
    lx: number,
    ly: number,
    tx: number,
    ty: number,
    occluders: ReadonlyArray<{ x0: number; y0: number; x1: number; y1: number }>
  ): boolean {
    const steps = Math.max(Math.abs(tx - lx), Math.abs(ty - ly));
    if (steps <= 2) return false;

    // Muestreo cada 2 texels a lo largo del rayo para alto rendimiento
    const stride = 2;
    for (let s = stride; s < steps - 1; s += stride) {
      const t = s / steps;
      const sx = Math.round(lx + (tx - lx) * t);
      const sy = Math.round(ly + (ty - ly) * t);

      for (const occ of occluders) {
        if (sx >= occ.x0 && sx < occ.x1 && sy >= occ.y0 && sy < occ.y1) {
          return true;
        }
      }
    }
    return false;
  }
}
