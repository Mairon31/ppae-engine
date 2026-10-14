import type {
  AnchorPoint,
  ArtStyleProfile,
  GeologicalMorphologyDescriptor,
  GeologicalResourceKind,
  SecondaryFloraKind,
  TreeLifecycleStage,
  TreeMorphologyDescriptor,
  TreeSpeciesDefinition,
  TreeSpeciesId
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { hexToRgba } from '../palette/palette-manager';
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
  readonly anchors?: Readonly<Record<string, AnchorPoint>>;
}

/** Produces botanical sprites using the shared 1A morphology, 1B skeleton, and 1C canopy. */
export class NatureGenerator {
  private readonly morphologyResolver = new TreeMorphologyResolver();
  private readonly skeletonRasterizer = new TreeSkeletonRasterizer();
  private readonly foliageRasterizer = new TreeCanopyFoliageRasterizer();
  private readonly geologyResolver = new GeologicalMorphologyResolver();
  private readonly geologyRasterizer = new GeologicalFormationRasterizer();

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

  public generateSecondaryFlora(
    kind: SecondaryFloraKind,
    profile: ArtStyleProfile,
    seed: number
  ): NatureSpriteArtifact {
    const mod = profile.moduleSize;
    const w = 3 * mod;
    const h = 3 * mod;
    const buf = new PixelBuffer(w, h);
    const rng = new SeededRNG(seed);
    const cx = Math.floor(w / 2);
    const baseY = h - 2;

    const greenMid = hexToRgba('#498a42');
    const greenHigh = hexToRgba('#78bd64');
    const outline = hexToRgba('#183018');

    if (kind === 'desert_cactus') {
      buf.fillRect(cx - 2, baseY - mod * 2, 4, mod * 2, greenMid);
      buf.fillRect(cx - 5, baseY - Math.floor(mod * 1.4), 3, 2, greenMid);
      buf.fillRect(cx - 5, baseY - Math.floor(mod * 1.9), 2, Math.floor(mod * 0.6), greenHigh);
      buf.fillRect(cx + 2, baseY - Math.floor(mod * 1.2), 3, 2, greenMid);
    } else if (kind === 'mushroom_cluster') {
      const stem = hexToRgba('#e2d9c8');
      const cap = hexToRgba('#d93b48');
      const spot = hexToRgba('#fff7e6');
      buf.fillRect(cx - 1, baseY - 4, 3, 4, stem);
      buf.fillEllipse(cx, baseY - 5, 4, 2, cap);
      buf.setPixel(cx - 1, baseY - 6, spot);
      buf.setPixel(cx + 2, baseY - 5, spot);
    } else {
      // Hierba alta o flores silvestres
      for (let i = -2; i <= 2; i++) {
        const bx = cx + i * 2;
        const bladeH = rng.nextInt(mod, mod * 2 - 1);
        buf.drawLine(bx, baseY, bx + (i < 0 ? -1 : 1), baseY - bladeH, i % 2 === 0 ? greenHigh : greenMid, 1);
        if (kind === 'wild_flower' && Math.abs(i) <= 1) {
          const petal = rng.chance(0.5) ? hexToRgba('#facc15') : hexToRgba('#f43f5e');
          buf.fillRect(bx - 1, baseY - bladeH - 1, 2, 2, petal);
        }
      }
    }

    buf.applySelectiveOutline(outline);
    return { buffer: buf, pivotTexel: [cx, baseY], stage: kind };
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
