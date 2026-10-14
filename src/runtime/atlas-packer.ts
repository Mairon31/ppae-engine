import {
  GeneratedAssetArtifact,
  PPAE_SCHEMA_VERSION,
  TextureAtlasMetadata
} from '../core/contracts';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

const MAX_UINT8_ARRAY_LENGTH = 0xffff_ffff;

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function assertNonNegativeSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

function checkedAdd(left: number, right: number, description: string): number {
  const sum = left + right;
  if (!Number.isSafeInteger(sum)) {
    throw new RangeError(`${description} exceeds safe integer limits`);
  }
  return sum;
}

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
    assertPositiveSafeInteger(maxAtlasWidth, 'maxAtlasWidth');
    assertNonNegativeSafeInteger(paddingPx, 'paddingPx');

    const cacheKeys = new Set<string>();
    for (const artifact of artifacts) {
      if (!artifact?.metadata) {
        throw new TypeError('Each atlas artifact must include metadata');
      }

      const { cacheKey, texelWidth, texelHeight } = artifact.metadata;
      assertPositiveSafeInteger(texelWidth, `Artifact ${cacheKey} texelWidth`);
      assertPositiveSafeInteger(texelHeight, `Artifact ${cacheKey} texelHeight`);

      const pixelBufferLength = texelWidth * texelHeight * 4;
      if (!Number.isSafeInteger(pixelBufferLength)) {
        throw new RangeError(`Artifact ${cacheKey} pixel buffer size exceeds safe integer limits`);
      }
      if (artifact.pixels.length !== pixelBufferLength) {
        throw new RangeError(
          `Artifact ${cacheKey} pixel buffer length does not match its dimensions`
        );
      }
      if (cacheKeys.has(cacheKey)) {
        throw new Error(`Duplicate cache key "${cacheKey}" in atlas artifacts`);
      }
      cacheKeys.add(cacheKey);

      const paddedWidth = checkedAdd(
        checkedAdd(texelWidth, paddingPx, 'Artifact padded width'),
        paddingPx,
        'Artifact padded width'
      );
      if (paddedWidth > maxAtlasWidth) {
        throw new RangeError(
          `Artifact ${cacheKey} is wider than atlas ${maxAtlasWidth} with padding ${paddingPx}`
        );
      }
    }

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

      const rightWithPadding = checkedAdd(
        checkedAdd(cursorX, w, 'Atlas placement width'),
        paddingPx,
        'Atlas placement width'
      );
      if (rightWithPadding > maxAtlasWidth) {
        cursorX = paddingPx;
        cursorY = checkedAdd(
          cursorY,
          checkedAdd(shelfHeight, paddingPx, 'Atlas shelf height'),
          'Atlas placement height'
        );
        shelfHeight = 0;
      }

      const right = checkedAdd(cursorX, w, 'Atlas placement width');
      const bottom = checkedAdd(cursorY, h, 'Atlas placement height');
      if (cursorX < 0 || cursorY < 0 || right > maxAtlasWidth) {
        throw new RangeError(`Artifact ${art.metadata.cacheKey} exceeds atlas bounds`);
      }

      placements.push({ x: cursorX, y: cursorY, artifact: art });
      cursorX = checkedAdd(right, paddingPx, 'Atlas placement width');
      shelfHeight = Math.max(shelfHeight, h);

      // Validate the lower edge now, before any buffer is allocated or pixels are written.
      checkedAdd(bottom, paddingPx, 'Atlas placement height');
    }

    const requiredHeight = checkedAdd(
      checkedAdd(cursorY, shelfHeight, 'Atlas height'),
      paddingPx,
      'Atlas height'
    );
    const totalHeight = Math.max(128, requiredHeight);
    const atlasBufferLength = maxAtlasWidth * totalHeight * 4;
    if (
      !Number.isSafeInteger(atlasBufferLength) ||
      atlasBufferLength > MAX_UINT8_ARRAY_LENGTH
    ) {
      throw new RangeError(
        'Atlas buffer size must be a safe integer within Uint8ClampedArray limits'
      );
    }

    const atlasBuffer = new PixelBuffer(maxAtlasWidth, totalHeight);
    const entries: Record<string, TextureAtlasMetadata['entries'][string]> =
      Object.create(null);

    for (const p of placements) {
      const { texelWidth, texelHeight, cacheKey } = p.artifact.metadata;
      const right = p.x + texelWidth;
      const bottom = p.y + texelHeight;
      if (
        p.x < 0 ||
        p.y < 0 ||
        right > atlasBuffer.width ||
        bottom > atlasBuffer.height
      ) {
        throw new RangeError(`Artifact ${cacheKey} placement exceeds atlas buffer bounds`);
      }

      for (let y = 0; y < texelHeight; y++) {
        const rowLength = texelWidth * 4;
        const sourceOffset = y * rowLength;
        const targetOffset = ((p.y + y) * atlasBuffer.width + p.x) * 4;
        if (
          !Number.isSafeInteger(targetOffset) ||
          targetOffset < 0 ||
          targetOffset + rowLength > atlasBuffer.data.length
        ) {
          throw new RangeError(`Artifact ${cacheKey} row exceeds atlas buffer bounds`);
        }
        atlasBuffer.data.set(
          p.artifact.pixels.subarray(sourceOffset, sourceOffset + rowLength),
          targetOffset
        );
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
