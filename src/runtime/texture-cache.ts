import {
  EngineTelemetrySnapshot,
  GeneratedAssetArtifact,
  PPAE_SCHEMA_VERSION,
  TextureAtlasEntry,
  TextureAtlasMetadata
} from '../core/contracts';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

interface CacheNode {
  readonly key: string;
  artifact: GeneratedAssetArtifact;
  memoryBytes: number;
  refCount: number;
  lastAccessedTick: number;
}

export class BoundedTextureCache {
  private static readonly GENERATION_TIME_HISTORY_LIMIT = 256;
  private readonly store = new Map<string, CacheNode>();
  private readonly generationTimesMs: number[] = [];
  private generationTimeCursor = 0;
  private totalGeneratedCount = 0;
  private currentMemoryBytes = 0;
  private accessTick = 0;
  private hits = 0;
  private misses = 0;
  private evictedCount = 0;

  constructor(public readonly maxMemoryBudgetBytes = 16 * 1024 * 1024) {
    if (!Number.isSafeInteger(maxMemoryBudgetBytes) || maxMemoryBudgetBytes < 0) {
      throw new RangeError(`Invalid texture cache memory budget: ${maxMemoryBudgetBytes}`);
    }
  } // 16 MB por defecto

  public get(key: string): GeneratedAssetArtifact | undefined {
    const node = this.store.get(key);
    if (!node) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    node.lastAccessedTick = ++this.accessTick;
    return node.artifact;
  }

  public put(key: string, artifact: GeneratedAssetArtifact): void {
    const incomingBytes = this.validateArtifact(key, artifact);
    this.recordGenerationTime(artifact.metadata.generationTimeMs);

    // A cache is optional for generation; skip artifacts that cannot fit on their own.
    if (incomingBytes > this.maxMemoryBudgetBytes) return;

    const existing = this.store.get(key);
    // A retained key is a live handle. Keep its artifact stable until the owner
    // releases it; replacing it would make the referenced memory unaccounted.
    if (existing && existing.refCount > 0 && existing.artifact !== artifact) return;
    const memoryAfterReplacement = this.currentMemoryBytes - (existing?.memoryBytes ?? 0) + incomingBytes;
    const bytesToFree = Math.max(0, memoryAfterReplacement - this.maxMemoryBudgetBytes);
    const victims = this.findEvictionCandidates(key, bytesToFree);
    if (victims === undefined) return;

    for (const victim of victims) {
      this.store.delete(victim.key);
      this.currentMemoryBytes -= victim.memoryBytes;
      this.evictedCount++;
    }

    if (existing) {
      this.currentMemoryBytes -= existing.memoryBytes;
      existing.artifact = artifact;
      existing.memoryBytes = incomingBytes;
      existing.lastAccessedTick = ++this.accessTick;
    } else {
      this.store.set(key, {
        key,
        artifact,
        memoryBytes: incomingBytes,
        refCount: 0,
        lastAccessedTick: ++this.accessTick
      });
    }
    this.currentMemoryBytes += incomingBytes;
  }

  public retain(key: string): void {
    const node = this.store.get(key);
    if (node) {
      node.refCount++;
      node.lastAccessedTick = ++this.accessTick;
    }
  }

  public release(key: string): void {
    const node = this.store.get(key);
    if (node && node.refCount > 0) {
      node.refCount--;
    }
  }

  public invalidateByPrefix(prefix: string): number {
    let removed = 0;
    for (const [k, node] of this.store.entries()) {
      if (k.startsWith(prefix) && node.refCount === 0) {
        this.currentMemoryBytes -= node.memoryBytes;
        this.store.delete(k);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Empaqueta las texturas actuales en un Atlas en memoria con metadatos JSON
   */
  public compileShelfAtlas(atlasId: string, maxWidth = 512): {
    atlasBuffer: PixelBuffer;
    metadata: TextureAtlasMetadata;
  } {
    const items = Array.from(this.store.values()).map((n) => n.artifact);
    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    const placements: Array<{ x: number; y: number; artifact: GeneratedAssetArtifact }> = [];

    for (const artifact of items) {
      const w = artifact.metadata.texelWidth;
      const h = artifact.metadata.texelHeight;
      if (cursorX + w > maxWidth) {
        cursorX = 0;
        cursorY += rowHeight;
        rowHeight = 0;
      }
      placements.push({ x: cursorX, y: cursorY, artifact });
      cursorX += w;
      rowHeight = Math.max(rowHeight, h);
    }

    const totalHeight = Math.max(64, cursorY + rowHeight);
    const atlasBuffer = new PixelBuffer(maxWidth, totalHeight);
    const entries: Record<string, TextureAtlasEntry> = {};

    for (const p of placements) {
      const { texelWidth, texelHeight, cacheKey } = p.artifact.metadata;
      for (let y = 0; y < texelHeight; y++) {
        for (let x = 0; x < texelWidth; x++) {
          const idx = (y * texelWidth + x) * 4;
          atlasBuffer.setPixel(p.x + x, p.y + y, {
            r: p.artifact.pixels[idx],
            g: p.artifact.pixels[idx + 1],
            b: p.artifact.pixels[idx + 2],
            a: p.artifact.pixels[idx + 3]
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
        width: maxWidth,
        height: totalHeight,
        entries
      }
    };
  }

  public getTelemetrySnapshot(): EngineTelemetrySnapshot {
    const totalRequests = this.hits + this.misses;
    const sortedTimes = [...this.generationTimesMs].sort((a, b) => a - b);
    const percentile = (p: number): number => {
      if (sortedTimes.length === 0) return 0;
      const idx = Math.min(sortedTimes.length - 1, Math.floor(sortedTimes.length * p));
      return Number(sortedTimes[idx].toFixed(3));
    };

    return {
      totalGeneratedCount: this.totalGeneratedCount,
      cacheHits: this.hits,
      cacheMisses: this.misses,
      cacheHitRate: totalRequests > 0 ? Number((this.hits / totalRequests).toFixed(3)) : 0,
      activeCacheEntries: this.store.size,
      memoryUsedBytes: this.currentMemoryBytes,
      memoryBudgetBytes: this.maxMemoryBudgetBytes,
      evictedEntriesCount: this.evictedCount,
      genTimeP50Ms: percentile(0.5),
      genTimeP95Ms: percentile(0.95),
      genTimeP99Ms: percentile(0.99)
    };
  }

  private validateArtifact(key: string, artifact: GeneratedAssetArtifact): number {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new TypeError('Texture cache key must be a non-empty string');
    }
    if (!artifact || typeof artifact !== 'object' || !artifact.metadata || typeof artifact.metadata !== 'object') {
      throw new TypeError('Texture cache artifact metadata is required');
    }
    if (!(artifact.pixels instanceof Uint8ClampedArray)) {
      throw new TypeError('Texture cache artifact pixels must be a Uint8ClampedArray');
    }
    if (artifact.pixels.byteOffset !== 0 || artifact.pixels.byteLength !== artifact.pixels.buffer.byteLength) {
      throw new TypeError('Texture cache artifact pixels must own their complete backing buffer');
    }

    const metadata = artifact.metadata;
    const isPositiveSafeInteger = (value: number): boolean => Number.isSafeInteger(value) && value > 0;
    if (typeof metadata.cacheKey !== 'string' || metadata.cacheKey.trim().length === 0) {
      throw new TypeError('Texture cache artifact cacheKey must be a non-empty string');
    }
    if (metadata.cacheKey !== key) {
      throw new TypeError('Texture cache key must match artifact metadata.cacheKey');
    }
    if (
      !isPositiveSafeInteger(metadata.texelWidth) ||
      !isPositiveSafeInteger(metadata.texelHeight) ||
      !isPositiveSafeInteger(metadata.innerWidth) ||
      !isPositiveSafeInteger(metadata.innerHeight) ||
      !Number.isSafeInteger(metadata.paddingPx) ||
      metadata.paddingPx < 0 ||
      metadata.texelWidth !== metadata.innerWidth + metadata.paddingPx * 2 ||
      metadata.texelHeight !== metadata.innerHeight + metadata.paddingPx * 2
    ) {
      throw new TypeError('Texture cache artifact dimensions or padding are invalid');
    }

    const expectedBytes = metadata.texelWidth * metadata.texelHeight * 4;
    if (
      !Number.isSafeInteger(expectedBytes) ||
      artifact.pixels.byteLength !== expectedBytes ||
      !Number.isSafeInteger(metadata.memoryBytes) ||
      metadata.memoryBytes !== artifact.pixels.byteLength
    ) {
      throw new TypeError('Texture cache artifact memory metadata does not match its pixel buffer');
    }
    if (!Number.isFinite(metadata.generationTimeMs) || metadata.generationTimeMs < 0) {
      throw new TypeError('Texture cache artifact generation time must be finite and non-negative');
    }

    return artifact.pixels.buffer.byteLength;
  }

  private recordGenerationTime(generationTimeMs: number): void {
    this.totalGeneratedCount++;
    const historyLimit = BoundedTextureCache.GENERATION_TIME_HISTORY_LIMIT;
    if (this.generationTimesMs.length < historyLimit) {
      this.generationTimesMs.push(generationTimeMs);
      return;
    }

    this.generationTimesMs[this.generationTimeCursor] = generationTimeMs;
    this.generationTimeCursor = (this.generationTimeCursor + 1) % historyLimit;
  }

  private findEvictionCandidates(key: string, bytesToFree: number): CacheNode[] | undefined {
    if (bytesToFree === 0) return [];

    const candidates = Array.from(this.store.values())
      .filter((node) => node.key !== key && node.refCount === 0)
      .sort((a, b) => a.lastAccessedTick - b.lastAccessedTick);
    const victims: CacheNode[] = [];
    let availableBytes = 0;

    for (const candidate of candidates) {
      victims.push(candidate);
      availableBytes += candidate.memoryBytes;
      if (availableBytes >= bytesToFree) return victims;
    }

    return undefined;
  }
}
