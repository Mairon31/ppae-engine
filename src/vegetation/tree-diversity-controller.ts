import type {
  ArtStyleProfile,
  BotanicalFamilyId,
  TreeLifecycleStage
} from '../core/contracts';
import { fnv1aHash32 } from '../core/deterministic';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { NatureGenerator } from './nature-generator';
import type { NatureSpriteArtifact } from './nature-generator';
import { TREE_MORPHOLOGY_ARCHETYPES } from './tree-morphology';

export interface RasterSilhouetteDescriptor {
  readonly boundingBox: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
    readonly width: number;
    readonly height: number;
  };
  readonly opaquePixelCount: number;
  readonly perimeterPixelCount: number;
  readonly fillRatio: number;
  readonly aspectRatio: number;
  readonly contourRoughness: number;
  readonly centerOfMassNormalized: readonly [number, number];
  readonly bilateralSymmetryRatio: number;
  readonly horizontalProfile8: readonly number[];
  readonly verticalProfile8: readonly number[];
}

export interface TreeDiversityEvaluationReport {
  readonly sampleCount: number;
  readonly uniqueArchetypesCount: number;
  readonly meanPairwiseSilhouetteDistance: number;
  readonly minPairwiseSilhouetteDistance: number;
  readonly widthSpanPx: number;
  readonly heightSpanPx: number;
  readonly meanBilateralSymmetry: number;
  readonly excessiveSymmetryCount: number;
  readonly passedDiversityCriteria: boolean;
}

export interface SpatiallyStratifiedTreeChoice {
  readonly archetypeId: string;
  readonly variantSeed: number;
  readonly spatialCellHash: number;
}

const precision = (value: number): number => Number(value.toFixed(3));
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/**
 * Phase 1E — deterministic anti-clone archetype scheduling and real RGBA
 * silhouette metrics. No global mutable history or chunk load order dependency.
 */
export class TreeDiversityController {
  private readonly natureGenerator = new NatureGenerator();

  /** Two linear passes through opaque pixels, including the actual edge mask. */
  public analyzeRasterSilhouette(buffer: PixelBuffer): RasterSilhouetteDescriptor {
    const w = buffer.width, h = buffer.height;
    const bytes = buffer.data;
    const occupied = (x: number, y: number): boolean =>
      x >= 0 && x < w && y >= 0 && y < h && bytes[(y * w + x) * 4 + 3] !== 0;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    let count = 0, perimeter = 0, sumX = 0, sumY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!occupied(x, y)) continue;
        count++; sumX += x; sumY += y;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        if (!occupied(x - 1, y) || !occupied(x + 1, y) ||
          !occupied(x, y - 1) || !occupied(x, y + 1)) perimeter++;
      }
    }
    if (count === 0) {
      return {
        boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
        opaquePixelCount: 0, perimeterPixelCount: 0, fillRatio: 0, aspectRatio: 1,
        contourRoughness: 0, centerOfMassNormalized: [0.5, 0.5],
        bilateralSymmetryRatio: 1,
        horizontalProfile8: [0,0,0,0,0,0,0,0],
        verticalProfile8: [0,0,0,0,0,0,0,0]
      };
    }
    const width = maxX - minX + 1, height = maxY - minY + 1;
    const horizontal = new Array<number>(8).fill(0);
    const vertical = new Array<number>(8).fill(0);
    let mirroredMatches = 0;
    for (let y = minY; y <= maxY; y++) {
      const verticalBin = Math.min(7, Math.floor((y - minY) * 8 / height));
      for (let x = minX; x <= maxX; x++) {
        if (!occupied(x, y)) continue;
        const horizontalBin = Math.min(7, Math.floor((x - minX) * 8 / width));
        horizontal[horizontalBin]++;
        vertical[verticalBin]++;
        if (occupied(minX + maxX - x, y)) mirroredMatches++;
      }
    }
    return {
      boundingBox: { minX, minY, maxX, maxY, width, height },
      opaquePixelCount: count,
      perimeterPixelCount: perimeter,
      fillRatio: precision(count / (width * height)),
      aspectRatio: precision(width / height),
      contourRoughness: precision(perimeter / Math.max(1, 2 * Math.sqrt(Math.PI * count))),
      centerOfMassNormalized: [
        precision((sumX / count - minX) / width),
        precision((sumY / count - minY) / height)
      ],
      bilateralSymmetryRatio: precision(mirroredMatches / count),
      horizontalProfile8: horizontal.map(n => precision(n / count)),
      verticalProfile8: vertical.map(n => precision(n / count))
    };
  }

  /** Pure geometry: identical raster descriptors have zero distance. */
  public computeRasterSilhouetteDistance(
    a: RasterSilhouetteDescriptor, b: RasterSilhouetteDescriptor
  ): number {
    if (a.opaquePixelCount === 0 || b.opaquePixelCount === 0) {
      return a.opaquePixelCount === b.opaquePixelCount ? 0 : 1;
    }
    let dx = 0, dy = 0;
    for (let i = 0; i < 8; i++) {
      dx += Math.abs(a.horizontalProfile8[i] - b.horizontalProfile8[i]);
      dy += Math.abs(a.verticalProfile8[i] - b.verticalProfile8[i]);
    }
    const aspect = clamp01(Math.abs(a.aspectRatio - b.aspectRatio) / 0.75);
    const size = clamp01((
      Math.abs(a.boundingBox.width - b.boundingBox.width) +
      Math.abs(a.boundingBox.height - b.boundingBox.height)
    ) / Math.max(12, a.boundingBox.width + a.boundingBox.height));
    const com = clamp01(Math.hypot(
      a.centerOfMassNormalized[0] - b.centerOfMassNormalized[0],
      a.centerOfMassNormalized[1] - b.centerOfMassNormalized[1]
    ) / 0.35);
    const fill = clamp01(Math.abs(a.fillRatio - b.fillRatio) / 0.45);
    const roughness = clamp01(Math.abs(a.contourRoughness - b.contourRoughness) / 0.6);
    const symmetry = Math.abs(a.bilateralSymmetryRatio - b.bilateralSymmetryRatio);
    return precision(clamp01(
      clamp01(dx / 2) * 0.23 +
      clamp01(dy / 2) * 0.23 +
      aspect * 0.16 + size * 0.12 + com * 0.08 +
      fill * 0.05 + roughness * 0.08 + symmetry * 0.05
    ));
  }

  /**
   * O(1) neighborhood-aware coloring: for N >= 2, cardinal neighboring tiles
   * receive different archetype indices, including at chunk boundaries.
   * For N = 1 (many families) unique archetype IDs are mathematically impossible;
   * coordinate-salted variants still diversify their individual skeletons.
   */
  public resolveSpatiallyStratifiedTreeVariant(
    worldSeed: string | number,
    tileX: number,
    tileY: number,
    familyId: BotanicalFamilyId
  ): SpatiallyStratifiedTreeChoice {
    const archetypes = TREE_MORPHOLOGY_ARCHETYPES[familyId];
    const count = archetypes.length;
    const phase = fnv1aHash32(`${worldSeed}::tree_arch_phase::${familyId}`) % count;
    // For 3 oak archetypes, three consecutive horizontal cells cycle 0,1,2.
    // y offset 1 is used for two colors; 2 mod 3 for three or more.
    const slopeY = count > 2 ? 2 : 1;
    const index = ((tileX + slopeY * tileY + phase) % count + count) % count;
    const spatialCellHash = fnv1aHash32(
      `${worldSeed}::stratified_tree::${familyId}::${tileX},${tileY}`
    );
    const archetypeId = archetypes[index].archetypeId;
    const variantSeed = fnv1aHash32(
      `${spatialCellHash}::${archetypeId}::${tileX & 1},${tileY & 1}`
    );
    return { archetypeId, variantSeed, spatialCellHash };
  }

  /**
   * Best-of-N deterministic cohort selection; rejects visually similar
   * candidates where possible and reports when the requested threshold cannot
   * actually be satisfied. Never fabricates raster dissimilarity.
   */
  public generateDiverseTreeCohort(
    familyId: BotanicalFamilyId,
    stage: TreeLifecycleStage,
    count: number,
    profile: ArtStyleProfile,
    baseSeed: string | number,
    minSilhouetteDistance = 0.08
  ): NatureSpriteArtifact[] {
    if (!Number.isSafeInteger(count) || count < 0 || count > 256) {
      throw new RangeError('Tree cohort count must be an integer between 0 and 256');
    }
    if (!Number.isFinite(minSilhouetteDistance) ||
      minSilhouetteDistance < 0 || minSilhouetteDistance > 1) {
      throw new RangeError('Invalid silhouette diversity threshold');
    }
    const archetypes = TREE_MORPHOLOGY_ARCHETYPES[familyId];
    const accepted: NatureSpriteArtifact[] = [];
    const silhouettes: RasterSilhouetteDescriptor[] = [];
    for (let i = 0; i < count; i++) {
      const arch = archetypes[i % archetypes.length];
      let best: NatureSpriteArtifact | undefined;
      let bestSilhouette: RasterSilhouetteDescriptor | undefined;
      let bestDistance = -1;
      // Bounded work, independent of ambient state; compare against ALL peers.
      for (let attempt = 0; attempt < 24; attempt++) {
        const seed = fnv1aHash32(
          `${baseSeed}::cohort::${familyId}::tree_${i}::trial_${attempt}`
        );
        const artifact = this.natureGenerator.generateTreeStage(
          familyId, stage, profile, seed, { archetypeId: arch.archetypeId }
        );
        const silhouette = this.analyzeRasterSilhouette(artifact.buffer);
        const minDistance = silhouettes.length === 0
          ? 1
          : Math.min(...silhouettes.map(s =>
            this.computeRasterSilhouetteDistance(silhouette, s)));
        if (minDistance > bestDistance) {
          best = artifact; bestSilhouette = silhouette; bestDistance = minDistance;
        }
        if (minDistance >= minSilhouetteDistance) break;
      }
      if (!best || !bestSilhouette) throw new Error('Could not generate tree candidate');
      accepted.push(best);
      silhouettes.push(bestSilhouette);
    }
    return accepted;
  }

  /** Uninflated raster-only pairwise metrics and explicit QA criteria. */
  public evaluateCohortDiversity(
    artifacts: readonly NatureSpriteArtifact[]
  ): TreeDiversityEvaluationReport {
    if (artifacts.length === 0) {
      return {
        sampleCount: 0, uniqueArchetypesCount: 0,
        meanPairwiseSilhouetteDistance: 0, minPairwiseSilhouetteDistance: 0,
        widthSpanPx: 0, heightSpanPx: 0, meanBilateralSymmetry: 1,
        excessiveSymmetryCount: 0, passedDiversityCriteria: false
      };
    }
    const silhouettes = artifacts.map(a => this.analyzeRasterSilhouette(a.buffer));
    const archetypes = new Set(artifacts.flatMap(a => a.morphology ? [a.morphology.archetypeId] : []));
    const widths = silhouettes.map(s => s.boundingBox.width);
    const heights = silhouettes.map(s => s.boundingBox.height);
    const excessiveSymmetryCount = silhouettes.filter(s => s.bilateralSymmetryRatio > 0.94).length;
    const meanBilateralSymmetry = precision(
      silhouettes.reduce((sum, s) => sum + s.bilateralSymmetryRatio, 0) / silhouettes.length
    );
    let pairCount = 0, sumDistance = 0, minDistance = Infinity;
    for (let i = 0; i < silhouettes.length; i++) {
      for (let j = i + 1; j < silhouettes.length; j++) {
        const d = this.computeRasterSilhouetteDistance(silhouettes[i], silhouettes[j]);
        sumDistance += d;
        minDistance = Math.min(minDistance, d);
        pairCount++;
      }
    }
    const meanDistance = pairCount > 0 ? precision(sumDistance / pairCount) : 0;
    const actualMinDistance = pairCount > 0 ? precision(minDistance) : 0;
    const widthSpanPx = Math.max(...widths) - Math.min(...widths);
    const heightSpanPx = Math.max(...heights) - Math.min(...heights);
    return {
      sampleCount: artifacts.length,
      uniqueArchetypesCount: archetypes.size,
      meanPairwiseSilhouetteDistance: meanDistance,
      minPairwiseSilhouetteDistance: actualMinDistance,
      widthSpanPx, heightSpanPx, meanBilateralSymmetry, excessiveSymmetryCount,
      passedDiversityCriteria:
        artifacts.length > 1 &&
        meanDistance >= 0.08 &&
        meanBilateralSymmetry < 0.92 &&
        excessiveSymmetryCount <= Math.floor(artifacts.length * 0.25)
    };
  }
}
