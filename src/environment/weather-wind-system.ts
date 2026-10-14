import {
  ArtStyleProfile,
  LightningBoltBranch,
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

const BAYER_FOG_4X4 = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
] as const;

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
   * Genera la geometría quebrada de un relámpago ramificado pixel-art de forma determinista.
   */
  public generateLightningBolt(
    widthTexels: number,
    heightTexels: number,
    seed: number
  ): LightningBoltBranch[] {
    const rng = new SeededRNG(seed ^ 0x9e3779b9);
    const branches: LightningBoltBranch[] = [];

    let curX = rng.nextInt(Math.floor(widthTexels * 0.2), Math.floor(widthTexels * 0.8));
    let curY = 0;
    const segments = 6;
    const stepY = Math.max(4, Math.floor((heightTexels * 0.78) / segments));

    for (let i = 0; i < segments; i++) {
      const nextX = Math.max(4, Math.min(widthTexels - 5, curX + rng.nextInt(-8, 8)));
      const nextY = Math.min(heightTexels - 2, curY + stepY);

      branches.push({
        x0: curX,
        y0: curY,
        x1: nextX,
        y1: nextY,
        isMainTrunk: true
      });

      // Ramificaciones secundarias laterales
      if (i >= 1 && i <= segments - 2 && rng.chance(0.65)) {
        const side = i % 2 === 0 ? 1 : -1;
        const forkX = Math.max(2, Math.min(widthTexels - 3, nextX + side * rng.nextInt(5, 11)));
        const forkY = Math.min(heightTexels - 2, nextY + Math.floor(stepY * 0.8));
        branches.push({
          x0: nextX,
          y0: nextY,
          x1: forkX,
          y1: forkY,
          isMainTrunk: false
        });
      }

      curX = nextX;
      curY = nextY;
    }

    return branches;
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
    lightningBranchesCount: number;
  } {
    const overlayBuffer = new PixelBuffer(widthTexels, heightTexels);
    if (isIndoorSpace) {
      return {
        overlayBuffer,
        spawnedDropsCount: 0,
        suppressedByRoofCount: 0,
        lightningBranchesCount: 0
      };
    }

    const state = this.currentState;
    const rng = new SeededRNG(seed ^ Math.floor(timeSeconds * 12));
    const logicalPerTexel = profile.logicalTileUnits / profile.canonicalTileTexels;
    const wind = this.sampleWindField(cameraWorldRect.x, cameraWorldRect.y, timeSeconds);

    let spawnedDropsCount = 0;
    let suppressedByRoofCount = 0;
    let lightningBranchesCount = 0;

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

    // Two independently drifting, stratified fog banks. Generate each bank's
    // curved centerline and thickness per x; this costs O(width) trig calls,
    // not O(width * height). Bayer dithering softens ONLY the pixelated banks'
    // feathered edges, rather than turning the whole screen into a dot grid.
    if (state.fogDensity > 0.05) {
      const fogColor = state.condition === 'sandstorm' ? hexToRgba('#d97706') :
        state.condition === 'volcanic_ash' ? hexToRgba('#64748b') :
        hexToRgba('#cbd5e1');
      const farCenter = new Float32Array(widthTexels);
      const nearCenter = new Float32Array(widthTexels);
      const farThickness = new Float32Array(widthTexels);
      const nearThickness = new Float32Array(widthTexels);
      const farDrift = timeSeconds * 3.4;
      const nearDrift = timeSeconds * 7.2;
      for (let x = 0; x < widthTexels; x++) {
        farCenter[x] = heightTexels * 0.29 +
          Math.sin((x + farDrift) * 0.038) * heightTexels * 0.075 +
          Math.sin((x - farDrift * 0.6) * 0.11) * heightTexels * 0.025;
        nearCenter[x] = heightTexels * 0.73 +
          Math.sin((x - nearDrift) * 0.027) * heightTexels * 0.085 +
          Math.cos((x + nearDrift * 0.5) * 0.093) * heightTexels * 0.03;
        farThickness[x] = heightTexels * (0.08 + state.fogDensity * 0.115) +
          Math.cos((x + farDrift) * 0.047) * heightTexels * 0.012;
        nearThickness[x] = heightTexels * (0.09 + state.fogDensity * 0.135) +
          Math.sin((x - nearDrift) * 0.041) * heightTexels * 0.017;
      }
      for (let y = 0; y < heightTexels; y++) {
        for (let x = 0; x < widthTexels; x++) {
          const farDistance = Math.abs(y - farCenter[x]);
          const nearDistance = Math.abs(y - nearCenter[x]);
          const farWeight = Math.max(0, Math.min(1, (farThickness[x] - farDistance) /
            Math.max(2, farThickness[x] * 0.33)));
          const nearWeight = Math.max(0, Math.min(1, (nearThickness[x] - nearDistance) /
            Math.max(2, nearThickness[x] * 0.38)));
          const isNear = nearWeight * 1.2 >= farWeight;
          const feather = isNear ? nearWeight : farWeight;
          if (feather <= 0) continue;
          if (feather < 1 && feather < (BAYER_FOG_4X4[y & 3][x & 3] + 0.5) / 16) continue;
          if (overlayBuffer.getPixel(x, y).a !== 0) continue;
          overlayBuffer.setPixel(x, y, {
            r: fogColor.r, g: fogColor.g, b: fogColor.b,
            a: Math.min(215, Math.round(state.fogDensity * (isNear ? 174 : 110) *
              (0.78 + feather * 0.22)))
          });
        }
      }
    }

    // 3. Relámpagos ramificados en tormenta eléctrica
    if (state.condition === 'thunderstorm' && state.lightningFlashIntensity > 0.3) {
      const branches = this.generateLightningBolt(
        widthTexels,
        heightTexels,
        seed ^ Math.floor(timeSeconds * 5)
      );
      const coreCol = hexToRgba('#ffffff', 255);
      const glowCol = hexToRgba('#7dd3fc', 225);

      for (const b of branches) {
        if (b.isMainTrunk) {
          overlayBuffer.drawLine(b.x0, b.y0, b.x1, b.y1, glowCol, 4);
          overlayBuffer.drawLine(b.x0, b.y0, b.x1, b.y1, coreCol, 2);
        } else {
          overlayBuffer.drawLine(b.x0, b.y0, b.x1, b.y1, glowCol, 2);
        }
      }
      lightningBranchesCount = branches.length;
    }

    return {
      overlayBuffer,
      spawnedDropsCount,
      suppressedByRoofCount,
      lightningBranchesCount
    };
  }
}
