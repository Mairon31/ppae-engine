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
  readonly artifact: GeneratedAssetArtifact;
  refCount: number;
  lastAccessedTick: number;
}

export class BoundedTextureCache {
  private readonly store = new Map<string, CacheNode>();
  private readonly generationTimesMs: number[] = [];
  private currentMemoryBytes = 0;
  private accessTick = 0;
  private hits = 0;
  private misses = 0;
  private evictedCount = 0;

  constructor(public readonly maxMemoryBudgetBytes = 16 * 1024 * 1024) {} // 16 MB por defecto

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
    const existing = this.store.get(key);
    if (existing) {
      this.currentMemoryBytes -= existing.artifact.metadata.memoryBytes;
      this.store.delete(key);
    }

    const incomingBytes = artifact.metadata.memoryBytes;
    this.evictIfNeeded(incomingBytes);

    this.store.set(key, {
      key,
      artifact,
      refCount: 1,
      lastAccessedTick: ++this.accessTick
    });
    this.currentMemoryBytes += incomingBytes;
    this.generationTimesMs.push(artifact.metadata.generationTimeMs);
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
      if (k.startsWith(prefix)) {
        this.currentMemoryBytes -= node.artifact.metadata.memoryBytes;
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
      totalGeneratedCount: this.generationTimesMs.length,
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

  private evictIfNeeded(requiredBytes: number): void {
    while (
      this.currentMemoryBytes + requiredBytes > this.maxMemoryBudgetBytes &&
      this.store.size > 0
    ) {
      let oldestKey: string | undefined;
      let oldestTick = Infinity;

      for (const [key, node] of this.store.entries()) {
        if (node.lastAccessedTick < oldestTick) {
          oldestTick = node.lastAccessedTick;
          oldestKey = key;
        }
      }

      if (!oldestKey) break;
      const victim = this.store.get(oldestKey)!;
      this.currentMemoryBytes -= victim.artifact.metadata.memoryBytes;
      this.store.delete(oldestKey);
      this.evictedCount++;
    }
  }
}
