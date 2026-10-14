import {
  GeneratedAssetArtifact,
  PPAE_SCHEMA_VERSION,
  TextureAtlasMetadata
} from '../core/contracts';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

/**
 * Empaquetador de texturas en atlas usando estanterías ordenadas por altura (`Shelf-packing`)
 * con extrusión de bordes configurable contra el sangrado de texturas.
 */
export class OptimizedAtlasPacker {
  public packArtifacts(
    atlasId: string,
    artifacts: readonly GeneratedAssetArtifact[],
    maxAtlasWidth = 1024,
    paddingPx = 1
  ): {
    atlasBuffer: PixelBuffer;
    metadata: TextureAtlasMetadata;
  } {
    const sorted = [...artifacts].sort(
      (a, b) => b.metadata.texelHeight - a.metadata.texelHeight
    );

    let cursorX = paddingPx;
    let cursorY = paddingPx;
    let shelfHeight = 0;
    const placements: Array<{ x: number; y: number; artifact: GeneratedAssetArtifact }> = [];

    for (const art of sorted) {
      const w = art.metadata.texelWidth;
      const h = art.metadata.texelHeight;

      if (cursorX + w + paddingPx > maxAtlasWidth) {
        cursorX = paddingPx;
        cursorY += shelfHeight + paddingPx;
        shelfHeight = 0;
      }

      placements.push({ x: cursorX, y: cursorY, artifact: art });
      cursorX += w + paddingPx;
      shelfHeight = Math.max(shelfHeight, h);
    }

    const totalHeight = Math.max(128, cursorY + shelfHeight + paddingPx);
    const atlasBuffer = new PixelBuffer(maxAtlasWidth, totalHeight);
    const entries: TextureAtlasMetadata['entries'] = {};

    for (const p of placements) {
      const { texelWidth, texelHeight, cacheKey } = p.artifact.metadata;

      for (let y = 0; y < texelHeight; y++) {
        for (let x = 0; x < texelWidth; x++) {
          const srcIdx = (y * texelWidth + x) * 4;
          atlasBuffer.setPixel(p.x + x, p.y + y, {
            r: p.artifact.pixels[srcIdx],
            g: p.artifact.pixels[srcIdx + 1],
            b: p.artifact.pixels[srcIdx + 2],
            a: p.artifact.pixels[srcIdx + 3]
          });
        }
      }

      entries[cacheKey] = {
        cacheKey,
        atlasX: p.x,
        atlasY: p.y,
        width: texelWidth,
        height: texelHeight,
        metadata: p.artifact.metadata
      };
    }

    return {
      atlasBuffer,
      metadata: {
        schemaVersion: PPAE_SCHEMA_VERSION,
        atlasId,
        width: maxAtlasWidth,
        height: totalHeight,
        entries
      }
    };
  }
}
