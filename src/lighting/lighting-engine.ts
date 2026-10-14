import {
  AmbientLightProfile,
  ArtStyleProfile,
  LightSourceDefinition,
  LogicalRect,
  RGBAColor,
  SolarShadowCaster,
  SolarShadowVector,
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
   * Calcula el vector de dirección, longitud y opacidad de las sombras proyectadas
   * por el sol o la luna según la hora del día [0.0 a 24.0).
   */
  public resolveSolarShadowVector(hour24: number, isUnderground = false): SolarShadowVector {
    const ambient = this.resolveAmbientProfileFromHour(hour24, isUnderground);
    if (isUnderground) {
      return {
        phase: ambient.phase,
        dirX: 0,
        dirY: -0.25,
        lengthMultiplier: ambient.shadowLengthMultiplier,
        shadowAlpha: 55
      };
    }

    const h = ((hour24 % 24) + 24) % 24;
    // Entre las 06:00 y las 20:00 el sol recorre de Este a Oeste:
    // 06:00 -> sombra proyectada al Oeste (dirX = -1.25)
    // 13:00 -> sombra corta hacia el Norte (dirX = 0.0)
    // 20:00 -> sombra proyectada al Este (dirX = +1.35)
    if (h >= 5 && h <= 20.5) {
      const dayProgress = (h - 5) / 15.5; // [0.0 a 1.0]
      const dirX = Number(((dayProgress - 0.5) * 2.4).toFixed(3));
      const dirY = Number((-0.35 - (1 - Math.abs(dayProgress - 0.5) * 2) * 0.25).toFixed(3));
      const shadowAlpha =
        ambient.phase === 'noon'
          ? 115
          : ambient.phase === 'dawn' || ambient.phase === 'dusk'
          ? 95
          : 105;

      return {
        phase: ambient.phase,
        dirX,
        dirY,
        lengthMultiplier: ambient.shadowLengthMultiplier,
        shadowAlpha
      };
    }

    // Noche: sombra lunar tenue ligeramente inclinada
    return {
      phase: ambient.phase,
      dirX: -0.35,
      dirY: -0.3,
      lengthMultiplier: ambient.shadowLengthMultiplier,
      shadowAlpha: 65
    };
  }

  /**
   * Proyecta sombras direccionales pixel-art sobre el buffer de escena para una lista de
   * entidades/árboles/estructuras (`casters`), utilizando dithering Bayer en la penumbra.
   */
  public renderDirectionalCastShadows(
    sceneBuffer: PixelBuffer,
    casters: readonly SolarShadowCaster[],
    cameraWorldRect: LogicalRect,
    hour24: number,
    profile: ArtStyleProfile,
    isUnderground = false
  ): {
    readonly shadowVector: SolarShadowVector;
    readonly renderedShadowPixels: number;
  } {
    const shadowVector = this.resolveSolarShadowVector(hour24, isUnderground);
    const texelsPerLogical = profile.canonicalTileTexels / profile.logicalTileUnits;
    const darkenFactor = 1 - shadowVector.shadowAlpha / 255;
    let renderedShadowPixels = 0;

    // Rasterize a swept, tapered silhouette once per pixel/caster. Repeatedly
    // darkening overlapping line strokes produced near-black stripes.
    for (const caster of casters) {
      if (!Number.isFinite(caster.worldX) || !Number.isFinite(caster.worldY) ||
          !Number.isFinite(caster.baseRadiusTexels) || !Number.isFinite(caster.heightTexels) ||
          caster.baseRadiusTexels <= 0 || caster.heightTexels <= 0) continue;
      const bx = Math.round((caster.worldX - cameraWorldRect.x) * texelsPerLogical);
      const by = Math.round((caster.worldY - cameraWorldRect.y) * texelsPerLogical);
      const length = Math.max(2, Math.round(caster.heightTexels * 0.55 *
        shadowVector.lengthMultiplier));
      const vx = shadowVector.dirX * length;
      const vy = shadowVector.dirY * length;
      const lenSq = Math.max(0.001, vx * vx + vy * vy);
      const ex = bx + vx, ey = by + vy;
      const spread = Math.max(2, caster.baseRadiusTexels);
      const minX = Math.max(0, Math.floor(Math.min(bx, ex) - spread - 2));
      const maxX = Math.min(sceneBuffer.width - 1, Math.ceil(Math.max(bx, ex) + spread + 2));
      const minY = Math.max(0, Math.floor(Math.min(by, ey) - spread - 2));
      const maxY = Math.min(sceneBuffer.height - 1, Math.ceil(Math.max(by, ey) + spread + 2));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const rawT = ((x - bx) * vx + (y - by) * vy) / lenSq;
          // Cap the shadow at both ends; no artificial projected rectangles.
          if (rawT < -0.075 || rawT > 1.06) continue;
          const t = Math.max(0, Math.min(1, rawT));
          const nearX = bx + t * vx, nearY = by + t * vy;
          const radial = Math.hypot(x - nearX, y - nearY);
          const radius = spread * (1 - t * 0.4);
          if (radial > radius) continue;
          const edge = (radius - radial) / Math.max(1, radius * 0.35);
          const tail = t > 0.72 ? Math.max(0.15, (1 - t) / 0.28) : 1;
          const coverage = Math.min(1, edge) * tail;
          // Bayer table is normalized [-0.5, +0.5]; edge coverage is [0,1].
          if (coverage <= BAYER_4X4[y & 3][x & 3] + 0.5) continue;
          const orig = sceneBuffer.getPixel(x, y);
          if (orig.a === 0) continue;
          sceneBuffer.setPixel(x, y, {
            r: Math.round(orig.r * darkenFactor),
            g: Math.round(orig.g * darkenFactor),
            b: Math.round(orig.b * darkenFactor),
            a: orig.a
          });
          renderedShadowPixels++;
        }
      }
    }
    return { shadowVector, renderedShadowPixels };
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
