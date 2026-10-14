import type {
  AnchorPoint,
  ArtStyleProfile,
  FloraMorphologyDescriptor,
  GeologicalMorphologyDescriptor,
  GeologicalResourceKind,
  SecondaryFloraKind,
  TreeLifecycleStage,
  TreeMorphologyDescriptor,
  TreeSpeciesDefinition,
  TreeSpeciesId
} from '../core/contracts';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import {
  BOTANICAL_SPECIES_DEFINITIONS,
  TreeMorphologyResolver
} from './tree-morphology';
import {
  TreeCanopyFoliageRasterizer
} from './tree-foliage-rasterizer';
import type { CanopyEnvironmentalState } from './tree-foliage-rasterizer';
import { TreeSkeletonRasterizer } from './tree-skeleton-rasterizer';
import { GeologicalMorphologyResolver } from './geology-morphology';
import { GeologicalFormationRasterizer } from './geology-rasterizer';
import { FloraMorphologyResolver } from './flora-morphology';
import { FloraBotanicalRasterizer } from './flora-rasterizer';

/** Canonical 12-family catalog shared with morphology and rendering. */
export const TREE_SPECIES_CATALOG: Readonly<Record<TreeSpeciesId, TreeSpeciesDefinition>> =
  BOTANICAL_SPECIES_DEFINITIONS;

export interface TreeGenerationOptions {
  readonly archetypeId?: string;
  readonly envState?: CanopyEnvironmentalState;
  readonly windShiftTexels?: number;
}

export interface NatureSpriteArtifact {
  readonly buffer: PixelBuffer;
  readonly pivotTexel: readonly [number, number];
  readonly stage: string;
  readonly morphology?: TreeMorphologyDescriptor;
  readonly geology?: GeologicalMorphologyDescriptor;
  readonly flora?: FloraMorphologyDescriptor;
  readonly anchors?: Readonly<Record<string, AnchorPoint>>;
}

/** Produces botanical sprites using the shared 1A morphology, 1B skeleton, and 1C canopy. */
export class NatureGenerator {
  private readonly morphologyResolver = new TreeMorphologyResolver();
  private readonly skeletonRasterizer = new TreeSkeletonRasterizer();
  private readonly foliageRasterizer = new TreeCanopyFoliageRasterizer();
  private readonly geologyResolver = new GeologicalMorphologyResolver();
  private readonly geologyRasterizer = new GeologicalFormationRasterizer();
  private readonly floraResolver = new FloraMorphologyResolver();
  private readonly floraRasterizer = new FloraBotanicalRasterizer();

  public generateTreeStage(
    speciesId: TreeSpeciesId,
    stage: TreeLifecycleStage,
    profile: ArtStyleProfile,
    seed: number,
    options?: TreeGenerationOptions
  ): NatureSpriteArtifact {
    const species = TREE_SPECIES_CATALOG[speciesId];
    const windShiftTexels = options?.windShiftTexels ?? 0;
    const morphology = this.morphologyResolver.resolveTreeMorphology(
      speciesId, stage, profile, seed, options?.archetypeId
    );
    const skeleton = this.skeletonRasterizer.renderSkeleton(
      morphology, profile, species, windShiftTexels
    );
    const canopy = this.foliageRasterizer.renderCanopyAndCompose(
      morphology, skeleton, profile, species, options?.envState ?? 'normal',
      windShiftTexels
    );
    return {
      buffer: canopy.compositeTreeBuffer,
      pivotTexel: canopy.pivotTexel,
      stage,
      morphology,
      anchors: canopy.anchors
    };
  }

  /** Generates live flora anatomy through the 3A morphology and 3B rasterizer. */
  public generateSecondaryFlora(
    kind: SecondaryFloraKind,
    profile: ArtStyleProfile,
    seed: number,
    windShiftTexels = 0
  ): NatureSpriteArtifact {
    const descriptor = this.floraResolver.resolveFloraMorphology(kind,profile,seed);
    const rendered = this.floraRasterizer.renderFlora(descriptor,profile,windShiftTexels);
    return {
      buffer: rendered.buffer,
      pivotTexel: rendered.pivotTexel,
      stage: kind,
      flora: descriptor,
      anchors: rendered.anchors
    };
  }

  public generateGeologicalResource(
    kind: GeologicalResourceKind,
    profile: ArtStyleProfile,
    seed: number
  ): NatureSpriteArtifact {
    const descriptor = this.geologyResolver.resolveGeologicalMorphology(kind, profile, seed);
    const rendered = this.geologyRasterizer.renderGeologicalFormation(descriptor, profile);
    return {
      buffer: rendered.buffer,
      pivotTexel: rendered.pivotTexel,
      stage: kind,
      geology: descriptor,
      anchors: rendered.anchors
    };
  }
}
