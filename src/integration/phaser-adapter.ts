import { GeneratedAssetArtifact, PPAE_SCHEMA_VERSION } from '../core/contracts';

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
  constructor(private readonly textureManager: any) {}

  public registerArtifactAsPhaserCanvasTexture(
    textureKey: string,
    artifact: GeneratedAssetArtifact
  ): PhaserTextureRegistrationResult {
    if (!this.textureManager || typeof this.textureManager.createCanvas !== 'function') {
      return { textureKey, success: false };
    }

    const { texelWidth, texelHeight } = artifact.metadata;
    const canvasTexture = this.textureManager.createCanvas(textureKey, texelWidth, texelHeight);
    if (!canvasTexture || !canvasTexture.canvas) {
      return { textureKey, success: false };
    }

    const ctx = canvasTexture.canvas.getContext('2d');
    if (!ctx) {
      return { textureKey, success: false };
    }

    const imgData = ctx.createImageData(texelWidth, texelHeight);
    imgData.data.set(artifact.pixels);
    ctx.putImageData(imgData, 0, 0);

    canvasTexture.refresh();
    return { textureKey, success: true };
  }

  public static getAdapterMetadata(): { schemaVersion: string; engine: string } {
    return {
      schemaVersion: PPAE_SCHEMA_VERSION,
      engine: 'Phaser 3 PPAE Adapter'
    };
  }
}
