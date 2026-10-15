/**
 * PPAE Engine 3.0 — Phase 1A: resolution math and grid diagnostics.
 *
 * This module is intentionally NOT wired into the legacy ArtStyleProfile and
 * generator APIs until Phase 1B. Declaring a profile here does not make all
 * existing generators support that profile.
 *
 * IMPORTANT: one art module is not one world tile. Native module size and
 * canonical tile texel size are independent. The legacy hybrid-24 uses a
 * 4-texel art module and a 48-texel canonical tile, NOT a 24-texel module.
 */
export const NATIVE_MODULE_SIZES = [4, 6, 8, 10, 13, 16, 24, 32, 34, 36] as const;
export type NativeModuleSize = (typeof NATIVE_MODULE_SIZES)[number];

export type ResolutionDetailTier = 'iconic-low' | 'structured-mid' | 'detailed-high' | 'master-ultra';
export type ArchitecturalDetailLevel = 'macro' | 'meso' | 'micro';
export type OutlinePolicy = 'none-contrast' | 'selective-dark' | 'adaptive-clustered' | 'double-weighted';

type ProfileSpec = Readonly<{
  id: string;
  label: string;
  moduleSize: NativeModuleSize;
  canonicalTileTexels: number;
  legacyHybrid?: boolean;
}>;

/**
 * The five pre-existing native profiles and the hybrid copy actual values
 * from DEFAULT_STYLE_PROFILES (Phase 7). New native profiles propose four art
 * modules per canonical tile. These proposals must be integrated and tested
 * against all world generators in Phase 1B before being publicly selectable.
 */
const PROFILE_SPECS = [
  { id: 'micro-4x4', label: '4x4 Micro Native', moduleSize: 4, canonicalTileTexels: 24 },
  { id: 'micro-6x6', label: '6x6 Micro Native', moduleSize: 6, canonicalTileTexels: 24 },
  { id: 'classic-8x8', label: '8x8 Classic Native', moduleSize: 8, canonicalTileTexels: 32 },
  { id: 'native-10x10', label: '10x10 Compact Native', moduleSize: 10, canonicalTileTexels: 40 },
  { id: 'native-13x13', label: '13x13 Odd Native', moduleSize: 13, canonicalTileTexels: 52 },
  { id: 'standard-16x16', label: '16x16 Standard Native', moduleSize: 16, canonicalTileTexels: 64 },
  { id: 'native-24x24', label: '24x24 Native', moduleSize: 24, canonicalTileTexels: 96 },
  { id: 'detailed-32x32', label: '32x32 Detailed Native', moduleSize: 32, canonicalTileTexels: 128 },
  { id: 'native-34x34', label: '34x34 Native', moduleSize: 34, canonicalTileTexels: 136 },
  { id: 'native-36x36', label: '36x36 Native', moduleSize: 36, canonicalTileTexels: 144 },
  { id: 'hybrid-24', label: 'Legacy Hybrid (4 module / 48 tile)', moduleSize: 4, canonicalTileTexels: 48, legacyHybrid: true }
] as const satisfies readonly ProfileSpec[];

export type NativeGranularityProfileId = (typeof PROFILE_SPECS)[number]['id'];

export interface NativeArtisticDetailBudget {
  readonly profileId: NativeGranularityProfileId;
  readonly moduleSize: NativeModuleSize;
  readonly detailTier: ResolutionDetailTier;
  readonly architecturalLevel: ArchitecturalDetailLevel;
  readonly maxColorsPerMaterialRamp: number;
  readonly maxTotalPaletteColorsPerSprite: number;
  readonly minClusterPixelArea: number;
  readonly minStrokeWidthTexels: number;
  readonly maxTreeBranchOrders: number;
  readonly minTerminalBranchTexelDiameter: number;
  readonly maxSubFoliageClusters: number;
  readonly enableSecondaryAnatomy: boolean;
  readonly enableTertiarySurfaceTexture: boolean;
  readonly enableFacialFeatures: boolean;
  readonly enableClothFolds: boolean;
  readonly enableIndividualRoofTiles: boolean;
  readonly outlinePolicy: OutlinePolicy;
}

export interface NativeResolutionProfile {
  readonly id: NativeGranularityProfileId;
  readonly label: string;
  readonly moduleSize: NativeModuleSize;
  readonly canonicalTileTexels: number;
  readonly logicalTileUnits: 16;
  readonly subGridDivisions: readonly number[];
  readonly hasExactCenterTexel: boolean;
  readonly centerTexelIndex: number;
  readonly isLegacyHybrid: boolean;
  readonly isAvailableInLegacyGenerators: boolean;
  readonly budget: NativeArtisticDetailBudget;
}

export interface Point2D { readonly x: number; readonly y: number }
export interface Rect2D extends Point2D { readonly width: number; readonly height: number }
export interface PivotAnchorSpec { readonly normalizedX: number; readonly normalizedY: number }

export interface ResolvedSpriteMetrics {
  readonly profileId: NativeGranularityProfileId;
  readonly moduleSize: NativeModuleSize;
  readonly widthInModules: number;
  readonly heightInModules: number;
  readonly canvasWidthTexels: number;
  readonly canvasHeightTexels: number;
  readonly pivotTexelX: number;
  readonly pivotTexelY: number;
  readonly colliderRectTexels: Rect2D;
}

export type NativeUpscaleClassification = 'empty' | 'suspected_upscale' | 'inconclusive';
export interface NativeUpscaleAuditResult {
  readonly width: number;
  readonly height: number;
  readonly targetModuleSize: NativeModuleSize;
  readonly classification: NativeUpscaleClassification;
  readonly detectedConstantBlockFactor: number;
  readonly nonEmptyPixelCount: number;
  readonly distinctRgbaColors: number;
  readonly reason: string;
}

export function computeSubGridDivisions(moduleSize: number): readonly number[] {
  if (!Number.isSafeInteger(moduleSize) || moduleSize < 1)
    throw new RangeError('moduleSize must be a positive safe integer');
  const factors: number[] = [];
  for (let i = 2; i <= moduleSize; i++) {
    if (moduleSize % i === 0) factors.push(i);
  }
  return Object.freeze(factors);
}

export function isNativeModuleSize(value: number): value is NativeModuleSize {
  return (NATIVE_MODULE_SIZES as readonly number[]).includes(value);
}

function budgetFor(
  profileId: NativeGranularityProfileId, n: NativeModuleSize,
  legacyHybrid: boolean
): NativeArtisticDetailBudget {
  const effective = legacyHybrid ? 8 : n;
  const tier: ResolutionDetailTier = effective <= 8 ? 'iconic-low' :
    effective <= 16 ? 'structured-mid' : effective <= 34 ? 'detailed-high' : 'master-ultra';
  const architecture: ArchitecturalDetailLevel = effective <= 8 ? 'macro' :
    effective <= 16 ? 'meso' : 'micro';
  const rank = effective <= 4 ? 0 : effective <= 6 ? 1 : effective <= 8 ? 2 :
    effective <= 10 ? 3 : effective <= 13 ? 4 : effective <= 16 ? 5 :
    effective <= 24 ? 6 : effective <= 32 ? 7 : effective <= 34 ? 8 : 9;
  return Object.freeze({
    profileId, moduleSize: n, detailTier: tier, architecturalLevel: architecture,
    maxColorsPerMaterialRamp: Math.min(8, 2 + rank),
    maxTotalPaletteColorsPerSprite: [8, 10, 12, 14, 16, 18, 22, 26, 28, 30][rank],
    minClusterPixelArea: effective < 10 ? 1 : effective < 16 ? 2 : effective < 24 ? 3 : 4,
    minStrokeWidthTexels: 1,
    maxTreeBranchOrders: [1, 2, 2, 2, 3, 3, 4, 4, 4, 5][rank],
    minTerminalBranchTexelDiameter: 1,
    maxSubFoliageClusters: [2, 3, 4, 5, 6, 8, 12, 16, 18, 20][rank],
    enableSecondaryAnatomy: effective >= 10,
    enableTertiarySurfaceTexture: effective >= 24,
    enableFacialFeatures: effective >= 8,
    enableClothFolds: effective >= 16,
    enableIndividualRoofTiles: effective >= 24,
    outlinePolicy: effective <= 4 ? 'none-contrast' :
      effective <= 10 ? 'selective-dark' :
      effective <= 32 ? 'adaptive-clustered' : 'double-weighted'
  });
}

const entries = PROFILE_SPECS.map(spec => {
  const isLegacyHybrid = 'legacyHybrid' in spec && spec.legacyHybrid === true;
  const isAvailableInLegacyGenerators = [
    'micro-4x4', 'micro-6x6', 'classic-8x8', 'standard-16x16',
    'detailed-32x32', 'hybrid-24'
  ].includes(spec.id);
  const profile: NativeResolutionProfile = Object.freeze({
    id: spec.id, label: spec.label, moduleSize: spec.moduleSize,
    canonicalTileTexels: spec.canonicalTileTexels, logicalTileUnits: 16,
    subGridDivisions: computeSubGridDivisions(spec.moduleSize),
    hasExactCenterTexel: spec.moduleSize % 2 === 1,
    centerTexelIndex: Math.floor(spec.moduleSize / 2),
    isLegacyHybrid, isAvailableInLegacyGenerators,
    budget: budgetFor(spec.id, spec.moduleSize, isLegacyHybrid)
  });
  return [spec.id, profile] as const;
});

export const NATIVE_RESOLUTION_PROFILES: Readonly<Record<NativeGranularityProfileId, NativeResolutionProfile>> =
  Object.freeze(Object.fromEntries(entries)) as Readonly<Record<NativeGranularityProfileId, NativeResolutionProfile>>;

export const NATIVE_ARTISTIC_DETAIL_BUDGETS: Readonly<Record<NativeGranularityProfileId, NativeArtisticDetailBudget>> =
  Object.freeze(Object.fromEntries(entries.map(([id, profile]) => [id, profile.budget]))) as
    Readonly<Record<NativeGranularityProfileId, NativeArtisticDetailBudget>>;

export const MODULE_SIZE_TO_NATIVE_PROFILE_ID: Readonly<Record<NativeModuleSize, NativeGranularityProfileId>> =
  Object.freeze({
    4: 'micro-4x4', 6: 'micro-6x6', 8: 'classic-8x8', 10: 'native-10x10',
    13: 'native-13x13', 16: 'standard-16x16', 24: 'native-24x24',
    32: 'detailed-32x32', 34: 'native-34x34', 36: 'native-36x36'
  });

export function resolveNativeResolutionProfile(
  profileOrModule: NativeGranularityProfileId | NativeModuleSize
): NativeResolutionProfile {
  if (typeof profileOrModule === 'number') {
    if (!isNativeModuleSize(profileOrModule))
      throw new RangeError('Unsupported native module size: ' + profileOrModule);
    return NATIVE_RESOLUTION_PROFILES[MODULE_SIZE_TO_NATIVE_PROFILE_ID[profileOrModule]];
  }
  const profile = NATIVE_RESOLUTION_PROFILES[profileOrModule];
  if (!profile) throw new RangeError('Unknown native resolution profile: ' + String(profileOrModule));
  return profile;
}

/**
 * Conversion convention:
 * - art modules: n texels per module (n = native module size)
 * - world tiles: canonicalTileTexels texels per tile, 16 logical world units
 * - chunk width: chunkSizeTiles * canonicalTileTexels
 *
 * This preserves the established 4x4/6x6/8x8/16x16/32x32 and hybrid
 * coordinate semantics. Neither a new module size nor a registry entry alone
 * guarantees full renderer support.
 */
export class NativeCoordinateGrid {
  public readonly profile: NativeResolutionProfile;
  public readonly moduleSize: NativeModuleSize;
  public readonly canonicalTileTexels: number;
  public readonly chunkSizeTiles: number;
  public readonly chunkSizeTexels: number;

  constructor(profileOrModule: NativeGranularityProfileId | NativeModuleSize, chunkSizeTiles = 16) {
    if (!Number.isSafeInteger(chunkSizeTiles) || chunkSizeTiles < 1)
      throw new RangeError('chunkSizeTiles must be a positive integer');
    this.profile = resolveNativeResolutionProfile(profileOrModule);
    this.moduleSize = this.profile.moduleSize;
    this.canonicalTileTexels = this.profile.canonicalTileTexels;
    this.chunkSizeTiles = chunkSizeTiles;
    this.chunkSizeTexels = this.canonicalTileTexels * chunkSizeTiles;
    if (!Number.isSafeInteger(this.chunkSizeTexels))
      throw new RangeError('chunkSizeTexels exceeds safe integer range');
  }

  private quantize(x: number, scale: number): number {
    if (!Number.isFinite(x)) throw new RangeError('Coordinate must be finite');
    const scaled = x * scale;
    if (!Number.isSafeInteger(Math.round(scaled)))
      throw new RangeError('Projected coordinate exceeds safe integer range');
    const nearest = Math.round(scaled);
    return Math.abs(scaled - nearest) <= 1e-10 ? nearest : Math.floor(scaled);
  }

  public modulesToTexels(coord: number): number { return this.quantize(coord, this.moduleSize); }
  public tilesToTexels(coord: number): number { return this.quantize(coord, this.canonicalTileTexels); }
  public logicalWorldUnitsToTexels(coord: number): number {
    return this.quantize(coord, this.canonicalTileTexels / 16);
  }
  public texelToTile(texel: number, atCenter = false): number {
    if (!Number.isSafeInteger(texel)) throw new RangeError('Texel must be an integer');
    return (texel + (atCenter ? 0.5 : 0)) / this.canonicalTileTexels;
  }
  public logicalTilePointToTexel(point: Point2D): Point2D {
    return { x: this.tilesToTexels(point.x), y: this.tilesToTexels(point.y) };
  }
  public texelPointToLogicalTile(point: Point2D, atCenter = true): Point2D {
    return { x: this.texelToTile(point.x, atCenter), y: this.texelToTile(point.y, atCenter) };
  }

  public chunkLocalTexelToWorldTexel(cx: number, cy: number, x: number, y: number): Point2D {
    if (![cx, cy, x, y].every(Number.isSafeInteger))
      throw new RangeError('Chunk and local coordinates must be safe integers');
    if (x < 0 || y < 0 || x >= this.chunkSizeTexels || y >= this.chunkSizeTexels)
      throw new RangeError('Local texel outside chunk bounds');
    const wx = cx * this.chunkSizeTexels + x;
    const wy = cy * this.chunkSizeTexels + y;
    if (!Number.isSafeInteger(wx) || !Number.isSafeInteger(wy))
      throw new RangeError('World texel exceeds safe integer range');
    return { x: wx, y: wy };
  }

  public sampleWorldTileAtChunkTexel(cx: number, cy: number, x: number, y: number): Point2D {
    const p = this.chunkLocalTexelToWorldTexel(cx, cy, x, y);
    return this.texelPointToLogicalTile(p);
  }

  public resolveSpriteMetrics(
    widthInModules: number, heightInModules: number,
    pivot: PivotAnchorSpec = { normalizedX: 0.5, normalizedY: 1 },
    normalizedCollider: Rect2D = { x: 0.15, y: 0.6, width: 0.7, height: 0.4 }
  ): ResolvedSpriteMetrics {
    if (![widthInModules, heightInModules].every(n => Number.isFinite(n) && n > 0))
      throw new RangeError('Module dimensions must be positive and finite');
    const w = Math.round(widthInModules * this.moduleSize);
    const h = Math.round(heightInModules * this.moduleSize);
    if (!Number.isSafeInteger(w) || !Number.isSafeInteger(h) || w < 1 || h < 1)
      throw new RangeError('Invalid sprite dimensions');
    if (![pivot.normalizedX, pivot.normalizedY].every(n => Number.isFinite(n) && n >= 0 && n <= 1))
      throw new RangeError('Pivot must be normalized to [0,1]');
    if (![normalizedCollider.x, normalizedCollider.y, normalizedCollider.width, normalizedCollider.height]
      .every(Number.isFinite) || normalizedCollider.width <= 0 || normalizedCollider.height <= 0)
      throw new RangeError('Invalid normalized collider');
    const clamp = (n: number, limit: number) => Math.max(0, Math.min(limit, Math.round(n)));
    const x = clamp(normalizedCollider.x * w, w - 1);
    const y = clamp(normalizedCollider.y * h, h - 1);
    const width = Math.max(1, Math.min(w - x, Math.round(normalizedCollider.width * w)));
    const height = Math.max(1, Math.min(h - y, Math.round(normalizedCollider.height * h)));
    return {
      profileId: this.profile.id, moduleSize: this.moduleSize,
      widthInModules, heightInModules,
      canvasWidthTexels: w, canvasHeightTexels: h,
      pivotTexelX: clamp(pivot.normalizedX * (w - 1), w - 1),
      pivotTexelY: clamp(pivot.normalizedY * (h - 1), h - 1),
      colliderRectTexels: { x, y, width, height }
    };
  }
}

/**
 * A raster-only heuristic: exact k-by-k block repetition is evidence of
 * nearest-neighbor enlargement, but native sprites can legitimately be blocky.
 * Conversely, changing ONE pixel of an enlarged sprite does not establish that
 * the generator drew at native resolution. The absence of a block pattern is
 * therefore INCONCLUSIVE, not proof of true native synthesis.
 */
export function verifyTrueNativeResolutionBuffer(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number, height: number, targetModuleSize: NativeModuleSize
): NativeUpscaleAuditResult {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width <= 0 || height <= 0 || rgba.length !== width * height * 4 ||
      !isNativeModuleSize(targetModuleSize))
    throw new RangeError('Invalid dimensions, buffer length, or target native module');
  let opaque = 0;
  const distinct = new Set<number>();
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a !== 0) opaque++;
    distinct.add((rgba[i] * 0x1000000 + rgba[i + 1] * 0x10000 +
      rgba[i + 2] * 0x100 + a) >>> 0);
  }
  const common = {
    width, height, targetModuleSize,
    nonEmptyPixelCount: opaque, distinctRgbaColors: distinct.size
  };
  if (!opaque) return {
    ...common, classification: 'empty', detectedConstantBlockFactor: 0,
    reason: 'Fully transparent image cannot demonstrate native detail.'
  };
  // Constant images and uncomplicated large color clusters can be perfectly
  // valid native art. Avoid claiming they are conclusive evidence of upscaling.
  if (distinct.size < 4) return {
    ...common, classification: 'inconclusive', detectedConstantBlockFactor: 1,
    reason: 'Too few distinct pixel values to distinguish native art from scaling.'
  };

  let largest = 1;
  const max = Math.min(width, height, targetModuleSize);
  for (let k = 2; k <= max; k++) {
    if (width % k || height % k) continue;
    let uniform = true;
    for (let by = 0; by < height && uniform; by += k) {
      for (let bx = 0; bx < width && uniform; bx += k) {
        const i0 = (by * width + bx) * 4;
        for (let dy = 0; dy < k && uniform; dy++) {
          for (let dx = 0; dx < k; dx++) {
            const i = ((by + dy) * width + bx + dx) * 4;
            if (rgba[i] !== rgba[i0] || rgba[i+1] !== rgba[i0+1] ||
                rgba[i+2] !== rgba[i0+2] || rgba[i+3] !== rgba[i0+3]) {
              uniform = false; break;
            }
          }
        }
      }
    }
    if (uniform) largest = k;
  }
  return largest > 1 ? {
    ...common, classification: 'suspected_upscale',
    detectedConstantBlockFactor: largest,
    reason: 'Exact aligned blocks of size ' + largest + ' suggest pixel duplication; verify provenance.'
  } : {
    ...common, classification: 'inconclusive', detectedConstantBlockFactor: 1,
    reason: 'No exact aligned upscale detected; this is NOT proof of native synthesis.'
  };
}
