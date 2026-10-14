import { GeneratedAssetArtifact, PPAE_SCHEMA_VERSION } from '../core/contracts';

interface PhaserCanvasTextureLike {
  readonly canvas?: HTMLCanvasElement;
  refresh?: () => unknown;
}

interface PhaserTextureManagerLike {
  createCanvas: (key: string, width: number, height: number) => PhaserCanvasTextureLike | null;
  exists?: (key: string) => boolean;
  remove?: (key: string) => unknown;
}

const registeredArtifacts = new WeakMap<PhaserTextureManagerLike, Map<string, GeneratedAssetArtifact>>();

function haveSamePixelData(left: Uint8ClampedArray, right: Uint8ClampedArray): boolean {
  if (left === right) return true;
  if (left.byteLength !== right.byteLength) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

export interface PhaserTextureRegistrationResult {
  readonly textureKey: string;
  readonly success: boolean;
}

/**
 * Adaptador oficial desacoplado para Phaser 3.
 * Convierte artefactos rasterizados en memoria de PPAE en texturas nativas de Phaser
 * listas para usarse en GameObjects de Sprites y Tilemaps.
 */
export class PhaserPPAEAdapter {
  constructor(private readonly textureManager: PhaserTextureManagerLike | null | undefined) {}

  public registerArtifactAsPhaserCanvasTexture(
    textureKey: string,
    artifact: GeneratedAssetArtifact
  ): PhaserTextureRegistrationResult {
    if (!this.textureManager || typeof this.textureManager.createCanvas !== 'function'
      || typeof textureKey !== 'string' || !textureKey.trim()
      || !artifact || typeof artifact !== 'object' || !artifact.metadata
      || !(artifact.pixels instanceof Uint8ClampedArray)) {
      return { textureKey, success: false };
    }

    const { texelWidth, texelHeight } = artifact.metadata;
    const pixelBytes = texelWidth * texelHeight * 4;
    if (!Number.isSafeInteger(texelWidth) || !Number.isSafeInteger(texelHeight)
      || texelWidth < 1 || texelHeight < 1
      || !Number.isSafeInteger(pixelBytes) || artifact.pixels.byteLength !== pixelBytes) {
      return { textureKey, success: false };
    }

    if (this.textureManager.exists?.(textureKey)) {
      const registered = registeredArtifacts.get(this.textureManager)?.get(textureKey);
      const sameArtifact = registered === artifact || (
        registered?.metadata.cacheKey === artifact.metadata.cacheKey
        && registered.metadata.texelWidth === texelWidth
        && registered.metadata.texelHeight === texelHeight
        && haveSamePixelData(registered.pixels, artifact.pixels)
      );
      return { textureKey, success: sameArtifact };
    }

    try {
      const canvasTexture = this.textureManager.createCanvas(textureKey, texelWidth, texelHeight);
      const canvas = canvasTexture?.canvas;
      const ctx = canvas?.getContext('2d');
      if (!canvasTexture || !ctx || !canvasTexture.refresh) {
        this.textureManager.remove?.(textureKey);
        return { textureKey, success: false };
      }

      const imgData = ctx.createImageData(texelWidth, texelHeight);
      imgData.data.set(artifact.pixels);
      ctx.putImageData(imgData, 0, 0);
      canvasTexture.refresh();
      let managerArtifacts = registeredArtifacts.get(this.textureManager);
      if (!managerArtifacts) {
        managerArtifacts = new Map();
        registeredArtifacts.set(this.textureManager, managerArtifacts);
      }
      managerArtifacts.set(textureKey, artifact);
      return { textureKey, success: true };
    } catch {
      this.textureManager.remove?.(textureKey);
      registeredArtifacts.get(this.textureManager)?.delete(textureKey);
      return { textureKey, success: false };
    }
  }

  public removeTexture(textureKey: string): void {
    this.textureManager?.remove?.(textureKey);
    if (this.textureManager) registeredArtifacts.get(this.textureManager)?.delete(textureKey);
  }

  public static getAdapterMetadata(): { schemaVersion: string; engine: string } {
    return {
      schemaVersion: PPAE_SCHEMA_VERSION,
      engine: 'Phaser 3 PPAE Adapter'
    };
  }
}
