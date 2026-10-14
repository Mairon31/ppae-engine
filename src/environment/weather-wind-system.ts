import {
  ArtStyleProfile,
  LogicalRect,
  PPAE_SCHEMA_VERSION,
  WeatherConditionId,
  WeatherVisualState,
  WindVectorSample
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { pointInLogicalRect } from '../interiors/portal-system';

export const DEFAULT_WEATHER_STATES: Readonly<Record<WeatherConditionId, WeatherVisualState>> = {
  clear: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'clear',
    intensity: 0.0,
    windAngleRad: 0.2,
    windSpeed: 0.25,
    fogDensity: 0.0,
    lightningFlashIntensity: 0.0
  },
  sunny: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'sunny',
    intensity: 0.2,
    windAngleRad: 0.15,
    windSpeed: 0.2,
    fogDensity: 0.0,
    lightningFlashIntensity: 0.0
  },
  overcast: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'overcast',
    intensity: 0.45,
    windAngleRad: 0.3,
    windSpeed: 0.4,
    fogDensity: 0.18,
    lightningFlashIntensity: 0.0
  },
  drizzle: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'drizzle',
    intensity: 0.35,
    windAngleRad: 0.35,
    windSpeed: 0.38,
    fogDensity: 0.15,
    lightningFlashIntensity: 0.0
  },
  rain: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'rain',
    intensity: 0.72,
    windAngleRad: 0.42,
    windSpeed: 0.65,
    fogDensity: 0.25,
    lightningFlashIntensity: 0.0
  },
  thunderstorm: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'thunderstorm',
    intensity: 1.0,
    windAngleRad: 0.55,
    windSpeed: 0.92,
    fogDensity: 0.35,
    lightningFlashIntensity: 0.85
  },
  snow: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'snow',
    intensity: 0.65,
    windAngleRad: 0.25,
    windSpeed: 0.4,
    fogDensity: 0.2,
    lightningFlashIntensity: 0.0
  },
  blizzard: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'blizzard',
    intensity: 0.95,
    windAngleRad: 0.6,
    windSpeed: 0.95,
    fogDensity: 0.55,
    lightningFlashIntensity: 0.0
  },
  dense_fog: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'dense_fog',
    intensity: 0.8,
    windAngleRad: 0.1,
    windSpeed: 0.15,
    fogDensity: 0.78,
    lightningFlashIntensity: 0.0
  },
  sandstorm: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'sandstorm',
    intensity: 0.9,
    windAngleRad: 0.08,
    windSpeed: 0.9,
    fogDensity: 0.65,
    lightningFlashIntensity: 0.0
  },
  volcanic_ash: {
    schemaVersion: PPAE_SCHEMA_VERSION,
    condition: 'volcanic_ash',
    intensity: 0.75,
    windAngleRad: 0.3,
    windSpeed: 0.5,
    fogDensity: 0.45,
    lightningFlashIntensity: 0.0
  }
};

/**
 * Motor de representación meteorológica y campo vectorial de viento.
 * Respeta oclusiones de techos e interiores para que la lluvia o nieve nunca caiga bajo techo.
 */
export class WeatherAndWindSystem {
  private currentState: WeatherVisualState = DEFAULT_WEATHER_STATES.clear;

  public setWeatherState(state: WeatherVisualState): void {
    this.currentState = state;
  }

  public getWeatherState(): WeatherVisualState {
    return this.currentState;
  }

  /**
   * Evalúa el campo vectorial de viento en `(worldX, worldY)` en el instante `timeSeconds`.
   * Devuelve la velocidad continua y el desplazamiento discreto en texels para copas y arbustos.
   */
  public sampleWindField(worldX: number, worldY: number, timeSeconds: number): WindVectorSample {
    const gustWave =
      Math.sin(timeSeconds * 2.2 + worldX * 0.08 + worldY * 0.05) * 0.35 +
      Math.cos(timeSeconds * 1.1 - worldX * 0.04) * 0.2;

    const strength = Math.max(0, Math.min(1, this.currentState.windSpeed + gustWave * this.currentState.windSpeed));
    const vx = Math.cos(this.currentState.windAngleRad) * strength;
    const vy = Math.sin(this.currentState.windAngleRad) * strength * 0.4;

    const canopyPixelShiftX = Math.round(vx * 2.4);
    const canopyPixelShiftY = Math.round(vy * 1.2);

    return {
      vx: Number(vx.toFixed(3)),
      vy: Number(vy.toFixed(3)),
      strength: Number(strength.toFixed(3)),
      canopyPixelShiftX,
      canopyPixelShiftY
    };
  }

  /**
   * Comprueba si una coordenada lógica del mundo está protegida de la precipitación
   * (bajo el techo de un edificio o dentro de una habitación interior/cueva).
   */
  public isPositionShelteredFromPrecipitation(
    worldX: number,
    worldY: number,
    shelteredRectsLogical: readonly LogicalRect[],
    isIndoorSpace = false
  ): boolean {
    if (isIndoorSpace) return true;
    for (const rect of shelteredRectsLogical) {
      if (pointInLogicalRect(worldX, worldY, rect)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Renderiza la capa atmosférica (lluvia con ángulo de viento, salpicaduras, nieve, ceniza y niebla por bandas)
   * respetando las zonas techadas `shelteredRectsLogical`.
   */
  public renderWeatherOverlay(
    widthTexels: number,
    heightTexels: number,
    cameraWorldRect: LogicalRect,
    profile: ArtStyleProfile,
    timeSeconds: number,
    shelteredRectsLogical: readonly LogicalRect[] = [],
    isIndoorSpace = false,
    seed = 2026
  ): {
    overlayBuffer: PixelBuffer;
    spawnedDropsCount: number;
    suppressedByRoofCount: number;
  } {
    const overlayBuffer = new PixelBuffer(widthTexels, heightTexels);
    if (isIndoorSpace) {
      return { overlayBuffer, spawnedDropsCount: 0, suppressedByRoofCount: 0 };
    }

    const state = this.currentState;
    const rng = new SeededRNG(seed ^ Math.floor(timeSeconds * 12));
    const logicalPerTexel = profile.logicalTileUnits / profile.canonicalTileTexels;
    const wind = this.sampleWindField(cameraWorldRect.x, cameraWorldRect.y, timeSeconds);

    let spawnedDropsCount = 0;
    let suppressedByRoofCount = 0;

    // 1. Precipitación (Lluvia, Llovizna, Tormenta, Nieve, Ventisca, Ceniza)
    const isRaining =
      state.condition === 'drizzle' ||
      state.condition === 'rain' ||
      state.condition === 'thunderstorm';
    const isSnowing = state.condition === 'snow' || state.condition === 'blizzard';
    const isAshOrSand = state.condition === 'volcanic_ash' || state.condition === 'sandstorm';

    if (isRaining || isSnowing || isAshOrSand) {
      const targetParticles = Math.floor(state.intensity * 75);

      for (let i = 0; i < targetParticles; i++) {
        const px = rng.nextInt(2, widthTexels - 3);
        const py = rng.nextInt(2, heightTexels - 3);

        const worldX = cameraWorldRect.x + px * logicalPerTexel;
        const worldY = cameraWorldRect.y + py * logicalPerTexel;

        if (this.isPositionShelteredFromPrecipitation(worldX, worldY, shelteredRectsLogical, isIndoorSpace)) {
          suppressedByRoofCount++;
          continue;
        }

        spawnedDropsCount++;

        if (isRaining) {
          const dropLen = state.condition === 'thunderstorm' ? 6 : 4;
          const slantX = Math.round(wind.vx * dropLen);
          const rainCol = hexToRgba('#7dd3fc', 210);
          const splashCol = hexToRgba('#e0f2fe', 235);

          overlayBuffer.drawLine(px, py, px + slantX, py + dropLen, rainCol, 1);

          // Salpicaduras y anillos de impacto al final de ciertas gotas
          if (i % 4 === 0) {
            overlayBuffer.setPixel(px + slantX - 1, py + dropLen, splashCol);
            overlayBuffer.setPixel(px + slantX + 1, py + dropLen, splashCol);
          }
        } else if (isSnowing) {
          const snowCol = hexToRgba('#f8fafc', 235);
          const flakeSize = state.condition === 'blizzard' && i % 2 === 0 ? 2 : 1;
          overlayBuffer.fillRect(px, py, flakeSize, flakeSize, snowCol);
        } else if (isAshOrSand) {
          const ashCol =
            state.condition === 'sandstorm'
              ? hexToRgba('#fde047', 195)
              : hexToRgba('#94a3b8', 210);
          overlayBuffer.fillRect(px, py, 2, 1, ashCol);
        }
      }
    }

    // 2. Niebla meteorológica por bandas discretas de píxeles (sin blur suave)
    if (state.fogDensity > 0.05) {
      const fogColor =
        state.condition === 'sandstorm'
          ? hexToRgba('#d97706')
          : hexToRgba('#cbd5e1');

      const bandHeight = profile.moduleSize * 2;
      const scrollX = Math.floor(timeSeconds * 8);

      for (let y = 0; y < heightTexels; y++) {
        const bandIndex = Math.floor(y / bandHeight);
        for (let x = 0; x < widthTexels; x++) {
          const pattern = ((x + scrollX + bandIndex * 7) & 3) === 0;
          if (pattern && (y % 2 === 0 || state.fogDensity > 0.6)) {
            const existing = overlayBuffer.getPixel(x, y);
            if (existing.a === 0) {
              overlayBuffer.setPixel(x, y, {
                r: fogColor.r,
                g: fogColor.g,
                b: fogColor.b,
                a: Math.min(220, Math.round(state.fogDensity * 180))
              });
            }
          }
        }
      }
    }

    return {
      overlayBuffer,
      spawnedDropsCount,
      suppressedByRoofCount
    };
  }
}
