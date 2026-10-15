/**
 * PPAE 3.0 / Phase 1B.1 — bridge over Phase 1A, not a parallel source
 * of truth. Existing coordinates represent SIXTEEN logical world units
 * per terrain tile; a module and a tile are not synonymous.
 *
 * A registration here is NOT proof that any legacy generator supports the
 * new profile. Phase 1B.2 must connect the public engine contracts.
 */
import {
  NATIVE_MODULE_SIZES, NATIVE_RESOLUTION_PROFILES,
  NATIVE_ARTISTIC_DETAIL_BUDGETS, MODULE_SIZE_TO_NATIVE_PROFILE_ID,
  type NativeModuleSize, type NativeGranularityProfileId
} from './native-resolution';
import { DEFAULT_STYLE_PROFILES } from './coordinates';
import type { RGBAColor } from './contracts';

export const SUPPORTED_ART_MODULE_SIZES = NATIVE_MODULE_SIZES;
export type ArtModuleSize30 = NativeModuleSize;
export type LegacyGranularityProfileId =
  'micro-4x4' | 'micro-6x6' | 'classic-8x8' | 'standard-16x16' |
  'detailed-32x32' | 'hybrid-24' | 'adaptive-auto';
export type NativeAddedGranularityProfileId =
  'native-10x10' | 'native-13x13' | 'native-24x24' |
  'native-34x34' | 'native-36x36';
export type UnifiedGranularityProfileId =
  LegacyGranularityProfileId | NativeAddedGranularityProfileId;
export type GranularityProfileAliasId =
  'micro-4' | 'mini-6' | 'retro-8' | 'compact-10' | 'odd-13' |
  'classic-16' | 'native-24' | 'hd-32' | 'wide-34' | 'ultra-36';
export type AnyGranularityProfileInput =
  UnifiedGranularityProfileId | GranularityProfileAliasId | ArtModuleSize30;
export type SubsystemSupportStage =
  'core-coordinates' | 'surface-rasterizer' | 'terrain-hydrology' |
  'entity-anatomy' | 'vegetation-trees' | 'structures-interiors' |
  'farming-crops' | 'items-equipment' | 'hud-ui';

export interface ResolutionSpaceSeparationSpec {
  readonly profileId: UnifiedGranularityProfileId;
  readonly artModuleSize: ArtModuleSize30;
  readonly canonicalTileTexelSize: number;
  readonly modulesPerCanonicalTile: number;
  readonly logicalTileWorldSize: 16;
  readonly texelsPerLogicalWorldUnit: number;
  readonly isTrueNativeOneModulePerTile: boolean;
  readonly isHybridCompositeGrid: boolean;
  readonly isAdaptiveAuto: boolean;
  readonly hasOddAxialCenter: boolean;
  readonly axialCenterTexel: number;
  readonly safeMarginTexels: number;
  readonly activeInternalWidthTexels: number;
  readonly integratedInLegacyGenerators: boolean;
}
export interface UnifiedSurfaceDetailBudget {
  readonly profileId: UnifiedGranularityProfileId;
  readonly artModuleSize: ArtModuleSize30;
  readonly canonicalTileTexelSize: number;
  readonly maxRampTonesPerMaterial: number;
  readonly maxUniqueColorsPerSprite: number;
  readonly minClusterAreaTexels: number;
  readonly outlineMode: 'none' | 'selective-dark' | 'adaptive-clustered' | 'double-weighted';
  readonly miterOutlineCorners: boolean;
  readonly enableSecondaryAnatomy: boolean;
  readonly enableSurfaceClusters: boolean;
  readonly ambientOcclusionStrength: number;
  readonly directionalContrastBoost: number;
}
export interface ResolvedTileAndAnchorLayout {
  readonly profileId: UnifiedGranularityProfileId;
  readonly artModuleSize: ArtModuleSize30;
  readonly canonicalTileTexelSize: number;
  readonly logicalWidthUnits: number;
  readonly logicalHeightUnits: number;
  readonly widthTexels: number;
  readonly heightTexels: number;
  readonly safeContentBoxTexels: Readonly<{x:number;y:number;width:number;height:number}>;
  readonly pivotTexels: Readonly<{x:number;y:number}>;
  readonly gripAnchorTexels: Readonly<{x:number;y:number}>;
  readonly hitboxTexels: Readonly<{x:number;y:number;width:number;height:number}>;
}

/** Noncanonical short names; public legacy ids retain their exact spelling. */
const ALIASES: Readonly<Record<GranularityProfileAliasId, Exclude<NativeGranularityProfileId,'hybrid-24'>>> = Object.freeze({
  'micro-4':'micro-4x4','mini-6':'micro-6x6','retro-8':'classic-8x8',
  'compact-10':'native-10x10','odd-13':'native-13x13',
  'classic-16':'standard-16x16','native-24':'native-24x24',
  'hd-32':'detailed-32x32','wide-34':'native-34x34',
  'ultra-36':'native-36x36'
});

const LEGACY_IDS = [
  'micro-4x4','micro-6x6','classic-8x8','standard-16x16',
  'detailed-32x32','hybrid-24','adaptive-auto'
] as const;

/** Static fallback for adaptive-auto is the current engine default 8/32.
 * The actual active runtime profile remains selected by AdaptiveResolutionController.
 */
function profileOf(id: UnifiedGranularityProfileId) {
  if (id === 'adaptive-auto') return NATIVE_RESOLUTION_PROFILES['classic-8x8'];
  return NATIVE_RESOLUTION_PROFILES[id];
}
export function normalizeGranularityProfileId(
  input: AnyGranularityProfileInput,
  adaptiveTargetModuleSize: ArtModuleSize30 = 8
): UnifiedGranularityProfileId {
  if (typeof input === 'number') {
    const id = MODULE_SIZE_TO_NATIVE_PROFILE_ID[input];
    if (!id) throw new RangeError('Unsupported module: ' + input);
    return id;
  }
  if (input === 'adaptive-auto')
    return normalizeGranularityProfileId(adaptiveTargetModuleSize);
  if (Object.prototype.hasOwnProperty.call(NATIVE_RESOLUTION_PROFILES, input))
    return input as UnifiedGranularityProfileId;
  if (Object.prototype.hasOwnProperty.call(ALIASES, input))
    return ALIASES[input as GranularityProfileAliasId];
  throw new RangeError('Unknown profile: ' + input);
}

function isLegacy(id: UnifiedGranularityProfileId): boolean {
  return (LEGACY_IDS as readonly string[]).includes(id);
}
function buildSpace(id: UnifiedGranularityProfileId): ResolutionSpaceSeparationSpec {
  const p=profileOf(id);
  const tile=p.canonicalTileTexels, module=p.moduleSize;
  const margin=module<=8 ? 0 : module>=36 ? 2 : 1;
  return Object.freeze({
    profileId:id, artModuleSize:module, canonicalTileTexelSize:tile,
    modulesPerCanonicalTile:tile/module,
    logicalTileWorldSize:16, texelsPerLogicalWorldUnit:tile/16,
    isTrueNativeOneModulePerTile: tile===module && id!=='adaptive-auto',
    isHybridCompositeGrid:id==='hybrid-24', isAdaptiveAuto:id==='adaptive-auto',
    hasOddAxialCenter:module%2===1, axialCenterTexel:Math.floor(module/2),
    safeMarginTexels:margin, activeInternalWidthTexels:Math.max(1,module-2*margin),
    integratedInLegacyGenerators:isLegacy(id)
  });
}
export const RESOLUTION_SPACE_SEPARATION_REGISTRY:
  Readonly<Record<UnifiedGranularityProfileId,ResolutionSpaceSeparationSpec>> =
  Object.freeze(Object.fromEntries(
    [...Object.keys(NATIVE_RESOLUTION_PROFILES),'adaptive-auto'].map(id=>
      [id,buildSpace(id as UnifiedGranularityProfileId)])
  )) as Readonly<Record<UnifiedGranularityProfileId,ResolutionSpaceSeparationSpec>>;

function buildBudget(id:UnifiedGranularityProfileId):UnifiedSurfaceDetailBudget {
  const n=NATIVE_ARTISTIC_DETAIL_BUDGETS[
    id==='adaptive-auto'?'classic-8x8':id
  ];
  const spec=RESOLUTION_SPACE_SEPARATION_REGISTRY[id];
  return Object.freeze({
    profileId:id,artModuleSize:spec.artModuleSize,
    canonicalTileTexelSize:spec.canonicalTileTexelSize,
    maxRampTonesPerMaterial:n.maxColorsPerMaterialRamp,
    maxUniqueColorsPerSprite:n.maxTotalPaletteColorsPerSprite,
    minClusterAreaTexels:n.minClusterPixelArea,
    outlineMode:n.outlinePolicy==='none-contrast'?'none':n.outlinePolicy,
    miterOutlineCorners:n.moduleSize>=6,
    enableSecondaryAnatomy:n.enableSecondaryAnatomy,
    enableSurfaceClusters:n.moduleSize>=13 && id!=='hybrid-24',
    ambientOcclusionStrength:0.15+Math.min(0.23,n.moduleSize/128),
    directionalContrastBoost:1.25-Math.min(0.2,n.moduleSize/180)
  });
}
export const UNIFIED_SURFACE_DETAIL_BUDGETS:
  Readonly<Record<UnifiedGranularityProfileId,UnifiedSurfaceDetailBudget>> =
  Object.freeze(Object.fromEntries(
    Object.keys(RESOLUTION_SPACE_SEPARATION_REGISTRY).map(id=>
      [id,buildBudget(id as UnifiedGranularityProfileId)])
  )) as Readonly<Record<UnifiedGranularityProfileId,UnifiedSurfaceDetailBudget>>;

/**
 * Standalone 3A/3B/3C entity synthesis can accept all ten registered art
 * module sizes. This is NOT a claim that legacy CreatureGenerator, the
 * character generator, or the Playground have migrated to this API.
 */
export const STANDALONE_ENTITY_ANATOMY_TEN_RESOLUTION_AVAILABLE = true as const;

/** Full subsystem readiness means consumer integration AND visual QA,
 * not merely standalone support for the ten module sizes. */
export const SUBSYSTEM_TEN_RESOLUTION_READINESS:
  Readonly<Record<SubsystemSupportStage,boolean>> = Object.freeze({
    'core-coordinates':false, // standalone grid only; not wired into all legacy consumers
    'surface-rasterizer':true, // standalone per-module surface rasterizer
    'terrain-hydrology':false,'entity-anatomy':false,
    'vegetation-trees':false,'structures-interiors':false,
    'farming-crops':false,'items-equipment':false,'hud-ui':false
  });

export function getResolutionSpaceSpec(
  input:AnyGranularityProfileInput
):ResolutionSpaceSeparationSpec {
  const id=input==='adaptive-auto'?'adaptive-auto':normalizeGranularityProfileId(input);
  return RESOLUTION_SPACE_SEPARATION_REGISTRY[id];
}
export function getUnifiedSurfaceDetailBudget(
  input:AnyGranularityProfileInput
):UnifiedSurfaceDetailBudget {
  const id=input==='adaptive-auto'?'adaptive-auto':normalizeGranularityProfileId(input);
  return UNIFIED_SURFACE_DETAIL_BUDGETS[id];
}
function normalized(v:number,label:string):number {
  if(!Number.isFinite(v)||v<0||v>1) throw new RangeError(label+' must be in [0,1]');
  return v;
}

/**
 * Logical dimensions are WORLD TILES, consistent with
 * CoordinateSystem; one tile = 16 logical world units.
 * For a single native art module pass 1/modulesPerCanonicalTile.
 */
export function resolveTileAndAnchorLayout(
  input:AnyGranularityProfileInput,logicalWidthUnits=1,logicalHeightUnits=1,
  options?:{
    readonly normalizedPivotX?:number;readonly normalizedPivotY?:number;
    readonly normalizedGripX?:number;readonly normalizedGripY?:number;
    readonly normalizedHitbox?:Readonly<{x:number;y:number;width:number;height:number}>;
  }
):ResolvedTileAndAnchorLayout {
  if(!Number.isFinite(logicalWidthUnits)||logicalWidthUnits<=0||
     !Number.isFinite(logicalHeightUnits)||logicalHeightUnits<=0)
    throw new RangeError('Logical tile dimensions must be positive finite');
  const spec=getResolutionSpaceSpec(input),scale=spec.canonicalTileTexelSize;
  const widthTexels=Math.round(logicalWidthUnits*scale);
  const heightTexels=Math.round(logicalHeightUnits*scale);
  if(!Number.isSafeInteger(widthTexels)||!Number.isSafeInteger(heightTexels)||
     widthTexels<=0||heightTexels<=0||widthTexels*heightTexels>16_777_216)
    throw new RangeError('Invalid or oversized raster layout');
  const m=Math.min(spec.safeMarginTexels,Math.floor((Math.min(widthTexels,heightTexels)-1)/2));
  const safeContentBoxTexels=Object.freeze({x:m,y:m,width:widthTexels-2*m,height:heightTexels-2*m});
  const pivotX=normalized(options?.normalizedPivotX??0.5,'pivotX');
  const pivotY=normalized(options?.normalizedPivotY??1,'pivotY');
  const gripX=normalized(options?.normalizedGripX??0.65,'gripX');
  const gripY=normalized(options?.normalizedGripY??0.55,'gripY');
  const q=(v:number,n:number)=>Math.max(0,Math.min(n-1,Math.round(v*(n-1))));
  const hitbox=options?.normalizedHitbox??{x:0.15,y:0.55,width:0.7,height:0.45};
  for(const [k,v] of Object.entries(hitbox)) normalized(v,'hitbox.'+k);
  if(hitbox.width<=0||hitbox.height<=0||hitbox.x+hitbox.width>1+1e-9||
     hitbox.y+hitbox.height>1+1e-9)
    throw new RangeError('Invalid normalized hitbox extent');
  const hx=Math.min(widthTexels-1,Math.round(hitbox.x*widthTexels));
  const hy=Math.min(heightTexels-1,Math.round(hitbox.y*heightTexels));
  return {
    profileId:spec.profileId,artModuleSize:spec.artModuleSize,
    canonicalTileTexelSize:scale,logicalWidthUnits,logicalHeightUnits,
    widthTexels,heightTexels,safeContentBoxTexels,
    pivotTexels:{x:q(pivotX,widthTexels),y:q(pivotY,heightTexels)},
    gripAnchorTexels:{
      x:m+q(gripX,safeContentBoxTexels.width),
      y:m+q(gripY,safeContentBoxTexels.height)},
    hitboxTexels:{
      x:hx,y:hy,
      width:Math.max(1,Math.min(widthTexels-hx,Math.round(hitbox.width*widthTexels))),
      height:Math.max(1,Math.min(heightTexels-hy,Math.round(hitbox.height*heightTexels)))
    }
  };
}

/** Verify legacy constants at module import; prevent semantic drift. */
for (const id of LEGACY_IDS) {
  const actual=DEFAULT_STYLE_PROFILES[id];
  const spec=RESOLUTION_SPACE_SEPARATION_REGISTRY[id];
  if(actual.moduleSize!==spec.artModuleSize||
     actual.canonicalTileTexels!==spec.canonicalTileTexelSize)
    throw new Error('Legacy PPAE profile mismatch: '+id);
}
/** A color value; equivalent to existing public RGBAColor, not a duplicate public type. */
export type SurfaceColor = RGBAColor;
