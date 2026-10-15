/**
 * PPAE Engine 3.0 — Phase 4A: Evolved Visual Quality & Regression Auditor
 *
 * Extends Phase 11 quality evaluation without altering or weakening existing
 * canonical RGBA Golden Reference hashes. Specifically detects the visual defects
 * documented in the 20 evidence screenshots:
 *   1. Tubular / non-tapering upper tree branches and exposed branch tips (Screenshot #4 / #14).
 *   2. Clonal cell repetition in cave perimeters and building facades (Screenshot #5 / #7).
 *   3. Excessive primitive circularity / rectangularity ("lollipop crops" in Screenshot #8 / #9
 *      and oval blobs in Screenshot #17 / #18 / #19).
 *   4. Cross-chunk pixel seams and water bathymetry color inversions (Screenshot #1).
 *   5. Resolution detail scale violations (orphan 1px noise in HD or over-detailing in 4x4/6x6)
 *      and palette color count budget overflows.
 *   6. Temporal animation frame discontinuity (teleporting centers of mass or flickering alpha).
 *   7. Golden Reference baseline guard requiring explicit visual diff justification.
 */

import {
  AnyGranularityProfileInput,
  UnifiedGranularityProfileId,
  getUnifiedSurfaceDetailBudget,
  normalizeGranularityProfileId,
} from '../core/resolution-contract-bridge';
import {
  PillowShadingAuditReport,
  auditPillowShadingAndBlobGeometry,
} from '../rasterizer/pixel-perfect-primitives';

import type { GeneratedAnatomicalRig25D } from '../entities/species-anatomical-skeleton';
import {
  EightDirectionContinuityAudit,
  EightDirectionProjectionEngine,
} from '../entities/eight-direction-projection';

/**
 * RGBA-only coastline heuristic. It detects water/land mask transitions
 * aligned to canonical grid lines, not the actual signed-distance shoreline
 * topology. Opaque non-blue biome water needs an explicit mask in Phase 4B.
 */
export interface BlockyShorelineAuditReport {
  readonly shorelineEdgeCount: number;
  readonly gridAlignedEdgeCount: number;
  readonly gridAlignedEdgeRatio: number;
  readonly hasBlockyShorelineDefect: boolean;
  readonly summary: string;
}

function validateRaster(
  rgba: Uint8ClampedArray | Uint8Array, width: number, height: number
): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width <= 0 || height <= 0 || width * height > 16_777_216 ||
      rgba.length !== width * height * 4)
    throw new RangeError('Invalid RGBA raster dimensions or buffer length');
}

/** Detect abrupt water-class transitions exactly along the tile grid. */
export function auditBlockyShorelineArtifacts(
  rgba: Uint8ClampedArray | Uint8Array, width: number,
  height: number, tileTexelSize: number
): BlockyShorelineAuditReport {
  validateRaster(rgba, width, height);
  if (!Number.isSafeInteger(tileTexelSize) || tileTexelSize < 2)
    throw new RangeError('Invalid tile size for shoreline audit');

  const water = (x: number, y: number): boolean => {
    const p = (y * width + x) * 4;
    return rgba[p + 3] !== 0 &&
      rgba[p + 2] > rgba[p] + 10 &&
      rgba[p + 2] > rgba[p + 1] + 8;
  };
  let edges = 0;
  let gridEdges = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 1; x < width; x++) {
      if (water(x - 1, y) !== water(x, y)) {
        edges++;
        if (x % tileTexelSize === 0) gridEdges++;
      }
    }
  }
  for (let y = 1; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (water(x, y - 1) !== water(x, y)) {
        edges++;
        if (y % tileTexelSize === 0) gridEdges++;
      }
    }
  }
  const ratio = edges ? gridEdges / edges : 0;
  const defect = edges >= Math.max(12, tileTexelSize * 2) && ratio > 0.75;
  return {
    shorelineEdgeCount: edges, gridAlignedEdgeCount: gridEdges,
    gridAlignedEdgeRatio: ratio,
    hasBlockyShorelineDefect: defect,
    summary: edges === 0 ? 'No blue-water shoreline detected; result inconclusive.'
      : defect ? 'Shoreline transitions strongly follow tile grid boundaries.'
      : 'No excessive grid-aligned shoreline transition detected.',
  };
}

export interface SkeletalBranchSegmentNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly order: number; // 0 = trunk, 1 = primary branch, 2 = secondary, etc.
  readonly radiusStart: number;
  readonly radiusEnd: number;
  readonly length: number;
  readonly hasFoliageClusterAtTip: boolean;
  readonly isDeadOrFallenTree?: boolean;
}

export interface BranchTaperingAuditReport {
  readonly segmentCount: number;
  readonly maxTerminalToTrunkRadiusRatio: number;
  readonly daVinciCrossSectionViolations: number;
  readonly nonTaperingSegments: number;
  readonly exposedLiveTerminalTips: number;
  readonly hasTubularBranchDefect: boolean;
  readonly summary: string;
}

export interface CellRepetitionAuditReport {
  readonly cellSizeTexels: number;
  readonly totalNonEmptyCells: number;
  readonly uniqueCellHashes: number;
  readonly maxIdenticalCellCount: number;
  readonly repetitionRatio: number;
  readonly hasClonalRepetitionDefect: boolean;
  readonly summary: string;
}

export interface GeometricPrimitiveExcessReport {
  readonly opaquePixelCount: number;
  readonly boundingBoxFillRatio: number;
  readonly radialCircularityScore: number;
  readonly contourComplexityRatio: number;
  readonly hasExcessiveRectangleDefect: boolean;
  readonly hasExcessiveCircleDefect: boolean;
  readonly summary: string;
}

export interface ResolutionAndPaletteAuditReport {
  readonly profileId: UnifiedGranularityProfileId;
  readonly uniqueColorCount: number;
  readonly maxAllowedColors: number;
  readonly orphanSinglePixelCount: number;
  readonly orphanPixelRatio: number;
  readonly semiTransparentPixelCount: number;
  readonly passesBudgetAndScale: boolean;
  readonly summary: string;
}

export interface CrossChunkPixelSeamReport {
  readonly edgeLengthTexels: number;
  readonly meanBoundaryColorDelta: number;
  readonly meanInteriorColorDelta: number;
  readonly seamDiscontinuityRatio: number;
  readonly hasVisibleChunkSeam: boolean;
  readonly summary: string;
}

export interface TemporalAnimationContinuityReport {
  readonly frameCount: number;
  readonly maxCenterOfMassJumpTexels: number;
  readonly maxAreaFluctuationRatio: number;
  readonly isTemporallyContinuous: boolean;
  readonly summary: string;
}

export interface GoldenReferenceChangeProposal {
  readonly referenceId: string;
  readonly previousRgbaHash: string;
  readonly candidateRgbaHash: string;
  readonly intentionalArtOverhaulReason?: string;
  readonly visualInspectionApproved?: boolean;
}

export interface GoldenReferenceAuditVerdict {
  readonly referenceId: string;
  readonly hashesMatch: boolean;
  readonly isAuthorizedUpdate: boolean;
  readonly verdict: 'unchanged-pass' | 'authorized-baseline-update' | 'unauthorized-regression-fail';
  readonly message: string;
}

export interface ComprehensiveAssetQualityReport30 {
  readonly profileId: UnifiedGranularityProfileId;
  readonly resolutionAndPalette: ResolutionAndPaletteAuditReport;
  readonly pillowShading: PillowShadingAuditReport;
  readonly geometricExcess: GeometricPrimitiveExcessReport;
  readonly overallPassed: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * Computes a deterministic FNV-1a 32-bit hex hash of an RGBA buffer for Golden Reference checks.
 */
export function computeRgbaBufferHexHash(rgba: Uint8ClampedArray | Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < rgba.length; i += 1) {
    h ^= rgba[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export class VisualRegressionAuditor30 {
  /**
   * 1. Audits botanical tree skeletons to detect tubular upper branches, failure to taper
   * toward branch tips, violations of Da Vinci's cross-sectional area conservation law,
   * and bare un-occluded terminal branches on living trees (Screenshot #4 / image_a1079b.png).
   */
  public auditBranchTaperingGeometry(
    segments: readonly SkeletalBranchSegmentNode[]
  ): BranchTaperingAuditReport {
    if (segments.length === 0) {
      return {
        segmentCount: 0,
        maxTerminalToTrunkRadiusRatio: 0,
        daVinciCrossSectionViolations: 0,
        nonTaperingSegments: 0,
        exposedLiveTerminalTips: 0,
        hasTubularBranchDefect: true,
        summary: 'Empty branch skeleton.',
      };
    }

    const ids = new Set<string>();
    for (const seg of segments) {
      if (ids.has(seg.id)) throw new RangeError('Duplicate botanical branch id: ' + seg.id);
      ids.add(seg.id);
      if (![seg.radiusStart, seg.radiusEnd, seg.length].every(n => Number.isFinite(n) && n > 0) ||
          !Number.isSafeInteger(seg.order) || seg.order < 0)
        throw new RangeError('Invalid botanical branch geometry: ' + seg.id);
    }
    for (const seg of segments) {
      if (seg.parentId !== null && !ids.has(seg.parentId))
        throw new RangeError('Unknown branch parent: ' + seg.parentId);
    }
    const trunk = segments.find((s) => s.parentId === null) ?? segments[0];
    const trunkBaseRadius = Math.max(0.5, trunk.radiusStart);

    const childrenByParent = new Map<string, SkeletalBranchSegmentNode[]>();
    for (const seg of segments) {
      if (seg.parentId !== null) {
        const list = childrenByParent.get(seg.parentId) ?? [];
        list.push(seg);
        childrenByParent.set(seg.parentId, list);
      }
    }

    let nonTaperingSegments = 0;
    let daVinciCrossSectionViolations = 0;
    let exposedLiveTerminalTips = 0;
    let maxTerminalToTrunkRadiusRatio = 0;

    for (const seg of segments) {
      // Every individual segment must taper (radiusEnd < radiusStart)
      if (seg.radiusEnd > seg.radiusStart * 0.96) {
        nonTaperingSegments += 1;
      }

      const children = childrenByParent.get(seg.id) ?? [];
      if (children.length === 0 && seg.order >= 1) {
        // Terminal branch tip
        const ratioToTrunk = seg.radiusEnd / trunkBaseRadius;
        if (ratioToTrunk > maxTerminalToTrunkRadiusRatio) {
          maxTerminalToTrunkRadiusRatio = ratioToTrunk;
        }
        if (!seg.isDeadOrFallenTree && !seg.hasFoliageClusterAtTip) {
          exposedLiveTerminalTips += 1;
        }
      }

      if (children.length > 0) {
        const parentEndArea = seg.radiusEnd * seg.radiusEnd;
        let childrenStartAreaSum = 0;
        for (const child of children) {
          childrenStartAreaSum += child.radiusStart * child.radiusStart;
          // No child branch may start thicker than its parent's distal end
          if (child.radiusStart > seg.radiusEnd * 1.05) {
            daVinciCrossSectionViolations += 1;
          }
        }
        if (childrenStartAreaSum > parentEndArea * 1.08) {
          daVinciCrossSectionViolations += 1;
        }
      }
    }

    const hasTubularBranchDefect =
      nonTaperingSegments > 0 ||
      daVinciCrossSectionViolations > 0 ||
      maxTerminalToTrunkRadiusRatio > 0.45 ||
      exposedLiveTerminalTips > 0;

    return {
      segmentCount: segments.length,
      maxTerminalToTrunkRadiusRatio,
      daVinciCrossSectionViolations,
      nonTaperingSegments,
      exposedLiveTerminalTips,
      hasTubularBranchDefect,
      summary: hasTubularBranchDefect
        ? `Tubular branch defect detected: terminalRatio=${maxTerminalToTrunkRadiusRatio.toFixed(2)}, nonTapering=${nonTaperingSegments}, daVinciViolations=${daVinciCrossSectionViolations}, exposedTips=${exposedLiveTerminalTips}`
        : `Botanical tapering heuristics passed: maxTerminalRatio=${maxTerminalToTrunkRadiusRatio.toFixed(2)}.`,
    };
  }

  /**
   * 2. Audits an RGBA scene, cave, or structure for excessive clonal cell repetition
   * (such as the 30 identical circular rock tiles framing the cave in image_a107db.png).
   */
  public auditCellPatternRepetition(
    rgba: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    cellSizeTexels: number
  ): CellRepetitionAuditReport {
    validateRaster(rgba, width, height);
    if (!Number.isSafeInteger(cellSizeTexels) || cellSizeTexels < 1)
      throw new RangeError('Cell size must be a positive integer');
    const cell = Math.max(4, cellSizeTexels);
    const cols = Math.floor(width / cell);
    const rows = Math.floor(height / cell);

    if (cols * rows < 4) {
      return {
        cellSizeTexels: cell,
        totalNonEmptyCells: cols * rows,
        uniqueCellHashes: cols * rows,
        maxIdenticalCellCount: 1,
        repetitionRatio: 0,
        hasClonalRepetitionDefect: false,
        summary: 'Grid has fewer than 4 cells.',
      };
    }

    const hashCounts = new Map<number, number>();
    let totalNonEmptyCells = 0;

    for (let cy = 0; cy < rows; cy += 1) {
      for (let cx = 0; cx < cols; cx += 1) {
        let cellHash = 2166136261;
        let opaqueInCell = 0;
        let firstR = -1;
        let firstG = -1;
        let firstB = -1;
        let hasInternalTexture = false;

        for (let dy = 0; dy < cell; dy += 1) {
          for (let dx = 0; dx < cell; dx += 1) {
            const px = cx * cell + dx;
            const py = cy * cell + dy;
            const idx = (py * width + px) * 4;
            const r = rgba[idx];
            const g = rgba[idx + 1];
            const b = rgba[idx + 2];
            const a = rgba[idx + 3];

            if (a > 0) {
              opaqueInCell += 1;
              if (firstR === -1) {
                firstR = r;
                firstG = g;
                firstB = b;
              } else if (r !== firstR || g !== firstG || b !== firstB) {
                hasInternalTexture = true;
              }
            }

            // Quantize to 4 bits per channel to catch near-identical stamped sprites
            const packed = ((r >> 4) << 12) | ((g >> 4) << 8) | ((b >> 4) << 4) | (a >> 4);
            cellHash ^= packed;
            cellHash = Math.imul(cellHash, 16777619) >>> 0;
          }
        }

        // Only evaluate textured/patterned cells (ignore solid flat background cells)
        if (opaqueInCell > 0 && hasInternalTexture) {
          totalNonEmptyCells += 1;
          hashCounts.set(cellHash, (hashCounts.get(cellHash) ?? 0) + 1);
        }
      }
    }

    if (totalNonEmptyCells === 0) {
      return {
        cellSizeTexels: cell,
        totalNonEmptyCells: 0,
        uniqueCellHashes: 0,
        maxIdenticalCellCount: 0,
        repetitionRatio: 0,
        hasClonalRepetitionDefect: false,
        summary: 'No patterned cells to audit.',
      };
    }

    let maxIdenticalCellCount = 0;
    for (const count of hashCounts.values()) {
      if (count > maxIdenticalCellCount) {
        maxIdenticalCellCount = count;
      }
    }

    const uniqueCellHashes = hashCounts.size;
    const repetitionRatio = 1 - uniqueCellHashes / totalNonEmptyCells;
    const hasClonalRepetitionDefect =
      totalNonEmptyCells >= 6 &&
      (repetitionRatio > 0.65 || maxIdenticalCellCount >= Math.max(6, Math.floor(totalNonEmptyCells * 0.55)));

    return {
      cellSizeTexels: cell,
      totalNonEmptyCells,
      uniqueCellHashes,
      maxIdenticalCellCount,
      repetitionRatio,
      hasClonalRepetitionDefect,
      summary: hasClonalRepetitionDefect
        ? `Clonal cell repetition defect detected: ${maxIdenticalCellCount}/${totalNonEmptyCells} cells are identical (ratio=${repetitionRatio.toFixed(2)}).`
        : `No dominant clonal cell repetition: ${uniqueCellHashes}/${totalNonEmptyCells} unique patterned cells.`,
    };
  }

  /**
   * 3. Audits a sprite silhouette for excessive geometric rectangularity or pure circularity
   * (detecting abstract boxes, circles, or lollipop crops when organic morphology is expected).
   */
  public auditCircularAndRectangularExcess(
    rgba: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number
  ): GeometricPrimitiveExcessReport {
    validateRaster(rgba, width, height);
    let opaqueCount = 0;
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;
    let sumX = 0;
    let sumY = 0;
    let perimeterCount = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const a = rgba[(y * width + x) * 4 + 3];
        if (a === 0) continue;

        opaqueCount += 1;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        const emptyN = y === 0 || rgba[((y - 1) * width + x) * 4 + 3] === 0;
        const emptyS = y === height - 1 || rgba[((y + 1) * width + x) * 4 + 3] === 0;
        const emptyW = x === 0 || rgba[(y * width + (x - 1)) * 4 + 3] === 0;
        const emptyE = x === width - 1 || rgba[(y * width + (x + 1)) * 4 + 3] === 0;
        if (emptyN || emptyS || emptyW || emptyE) {
          perimeterCount += 1;
        }
      }
    }

    if (opaqueCount < 12) {
      return {
        opaquePixelCount: opaqueCount,
        boundingBoxFillRatio: 0,
        radialCircularityScore: 0,
        contourComplexityRatio: 1,
        hasExcessiveRectangleDefect: false,
        hasExcessiveCircleDefect: false,
        summary: 'Micro sprite (<12 px) exempt from primitive excess penalty.',
      };
    }

    const bboxW = Math.max(1, maxX - minX + 1);
    const bboxH = Math.max(1, maxY - minY + 1);
    const boundingBoxFillRatio = opaqueCount / (bboxW * bboxH);

    // Measure radial variance of boundary pixels around the centroid
    const cx = sumX / opaqueCount;
    const cy = sumY / opaqueCount;
    const boundaryDistances: number[] = [];

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (rgba[(y * width + x) * 4 + 3] === 0) continue;
        const emptyN = y === 0 || rgba[((y - 1) * width + x) * 4 + 3] === 0;
        const emptyS = y === height - 1 || rgba[((y + 1) * width + x) * 4 + 3] === 0;
        const emptyW = x === 0 || rgba[(y * width + (x - 1)) * 4 + 3] === 0;
        const emptyE = x === width - 1 || rgba[(y * width + (x + 1)) * 4 + 3] === 0;
        if (emptyN || emptyS || emptyW || emptyE) {
          boundaryDistances.push(Math.hypot(x - cx, y - cy));
        }
      }
    }

    const meanRadius =
      boundaryDistances.reduce((acc, d) => acc + d, 0) /
      Math.max(1, boundaryDistances.length);
    const variance =
      boundaryDistances.reduce((acc, d) => acc + (d - meanRadius) * (d - meanRadius), 0) /
      Math.max(1, boundaryDistances.length);
    const normalizedRadialStdDev = Math.sqrt(variance) / Math.max(1, meanRadius);

    const radialCircularityScore = clamp(1 - normalizedRadialStdDev * 3.2, 0, 1);
    const contourComplexityRatio = perimeterCount / Math.sqrt(opaqueCount);

    const hasExcessiveRectangleDefect = boundingBoxFillRatio > 0.95 && opaqueCount >= 25;
    const hasExcessiveCircleDefect =
      radialCircularityScore > 0.88 &&
      Math.abs(bboxW - bboxH) <= 2 &&
      opaqueCount >= 36;

    return {
      opaquePixelCount: opaqueCount,
      boundingBoxFillRatio,
      radialCircularityScore,
      contourComplexityRatio,
      hasExcessiveRectangleDefect,
      hasExcessiveCircleDefect,
      summary:
        hasExcessiveRectangleDefect || hasExcessiveCircleDefect
          ? `Geometric primitive excess detected (rectFill=${boundingBoxFillRatio.toFixed(2)}, circularity=${radialCircularityScore.toFixed(2)}).`
          : `No simple rectangle/circle detected (rectFill=${boundingBoxFillRatio.toFixed(2)}, circularity=${radialCircularityScore.toFixed(2)}).`,
    };
  }

  /**
   * 4. Audits resolution-specific color budget, binary alpha purity, and orphan 1-texel noise.
   */
  public auditResolutionDetailAndPalette(
    rgba: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    profile: AnyGranularityProfileInput
  ): ResolutionAndPaletteAuditReport {
    validateRaster(rgba, width, height);
    const profileId = normalizeGranularityProfileId(profile);
    const budget = getUnifiedSurfaceDetailBudget(profile);

    const uniqueColors = new Set<number>();
    let semiTransparentPixelCount = 0;
    let opaquePixels = 0;
    let orphanSinglePixelCount = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const a = rgba[idx + 3];
        if (a > 0 && a < 255) {
          semiTransparentPixelCount += 1;
        }
        if (a === 0) {
          continue;
        }
        opaquePixels += 1;
        const packedColor = (rgba[idx] << 16) | (rgba[idx + 1] << 8) | rgba[idx + 2];
        uniqueColors.add(packedColor);

        if (budget.minClusterAreaTexels >= 2 && x > 0 && y > 0 && x < width - 1 && y < height - 1) {
          let hasSameColorNeighbor = false;
          const offsets = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ];
          for (const [dx, dy] of offsets) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            if (rgba[nIdx + 3] > 0) {
              const nColor = (rgba[nIdx] << 16) | (rgba[nIdx + 1] << 8) | rgba[nIdx + 2];
              if (nColor === packedColor) {
                hasSameColorNeighbor = true;
                break;
              }
            }
          }
          if (!hasSameColorNeighbor) {
            orphanSinglePixelCount += 1;
          }
        }
      }
    }

    const uniqueColorCount = uniqueColors.size;
    const orphanPixelRatio = opaquePixels > 0 ? orphanSinglePixelCount / opaquePixels : 0;
    const passesBudgetAndScale =
      opaquePixels > 0 && semiTransparentPixelCount === 0 &&
      uniqueColorCount <= budget.maxUniqueColorsPerSprite &&
      orphanPixelRatio <= 0.18;

    return {
      profileId,
      uniqueColorCount,
      maxAllowedColors: budget.maxUniqueColorsPerSprite,
      orphanSinglePixelCount,
      orphanPixelRatio,
      semiTransparentPixelCount,
      passesBudgetAndScale,
      summary: passesBudgetAndScale
        ? `Resolution & palette budget passed (${uniqueColorCount}/${budget.maxUniqueColorsPerSprite} colors, 0 blur).`
        : `Budget violation: colors=${uniqueColorCount}/${budget.maxUniqueColorsPerSprite}, semiTransparent=${semiTransparentPixelCount}, orphanRatio=${orphanPixelRatio.toFixed(2)}.`,
    };
  }

  /**
   * 5. Audits the shared border between two horizontally or vertically adjacent chunks
   * to detect artificial chunk seam cuts.
   */
  public auditCrossChunkPixelSeam(
    chunkARgba: Uint8ClampedArray | Uint8Array,
    chunkBRgba: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    orientation: 'horizontal-left-right' | 'vertical-top-bottom' = 'horizontal-left-right'
  ): CrossChunkPixelSeamReport {
    validateRaster(chunkARgba, width, height);
    validateRaster(chunkBRgba, width, height);
    if (width < 2 || height < 2)
      throw new RangeError('Chunk seam audit needs at least two texels in each dimension');
    if (orientation !== 'horizontal-left-right' && orientation !== 'vertical-top-bottom')
      throw new RangeError('Invalid chunk adjacency orientation');
    const edgeLen = orientation === 'horizontal-left-right' ? height : width;
    let boundaryDeltaSum = 0;
    let interiorDeltaSum = 0;

    for (let i = 0; i < edgeLen; i += 1) {
      if (orientation === 'horizontal-left-right') {
        const idxBorderLeft = (i * width + (width - 1)) * 4;
        const idxInteriorLeft = (i * width + Math.max(0, width - 2)) * 4;
        const idxBorderRight = (i * width + 0) * 4;

        boundaryDeltaSum +=
          Math.abs(chunkARgba[idxBorderLeft] - chunkBRgba[idxBorderRight]) +
          Math.abs(chunkARgba[idxBorderLeft + 1] - chunkBRgba[idxBorderRight + 1]) +
          Math.abs(chunkARgba[idxBorderLeft + 2] - chunkBRgba[idxBorderRight + 2]);

        interiorDeltaSum +=
          Math.abs(chunkARgba[idxBorderLeft] - chunkARgba[idxInteriorLeft]) +
          Math.abs(chunkARgba[idxBorderLeft + 1] - chunkARgba[idxInteriorLeft + 1]) +
          Math.abs(chunkARgba[idxBorderLeft + 2] - chunkARgba[idxInteriorLeft + 2]);
      } else {
        const idxBorderTop = ((height - 1) * width + i) * 4;
        const idxInteriorTop = (Math.max(0, height - 2) * width + i) * 4;
        const idxBorderBottom = (0 * width + i) * 4;

        boundaryDeltaSum +=
          Math.abs(chunkARgba[idxBorderTop] - chunkBRgba[idxBorderBottom]) +
          Math.abs(chunkARgba[idxBorderTop + 1] - chunkBRgba[idxBorderBottom + 1]) +
          Math.abs(chunkARgba[idxBorderTop + 2] - chunkBRgba[idxBorderBottom + 2]);

        interiorDeltaSum +=
          Math.abs(chunkARgba[idxBorderTop] - chunkARgba[idxInteriorTop]) +
          Math.abs(chunkARgba[idxBorderTop + 1] - chunkARgba[idxInteriorTop + 1]) +
          Math.abs(chunkARgba[idxBorderTop + 2] - chunkARgba[idxInteriorTop + 2]);
      }
    }

    const meanBoundaryColorDelta = boundaryDeltaSum / Math.max(1, edgeLen);
    const meanInteriorColorDelta = interiorDeltaSum / Math.max(1, edgeLen);
    const seamDiscontinuityRatio =
      meanBoundaryColorDelta / Math.max(12.0, meanInteriorColorDelta);

    const hasVisibleChunkSeam =
      meanBoundaryColorDelta > 95 && seamDiscontinuityRatio > 2.4;

    return {
      edgeLengthTexels: edgeLen,
      meanBoundaryColorDelta,
      meanInteriorColorDelta,
      seamDiscontinuityRatio,
      hasVisibleChunkSeam,
      summary: hasVisibleChunkSeam
        ? `Visible cross-chunk seam detected (boundaryDelta=${meanBoundaryColorDelta.toFixed(1)}, ratio=${seamDiscontinuityRatio.toFixed(2)}).`
        : `No large cross-chunk discontinuity detected (boundaryDelta=${meanBoundaryColorDelta.toFixed(1)}).`,
    };
  }

  /**
   * 6. Audits temporal continuity across an animation frame sequence to ensure the sprite
   * does not flicker, vanish, or teleport erratically between consecutive frames.
   */
  public auditAnimationFrameContinuity(
    framesRgba: readonly (Uint8ClampedArray | Uint8Array)[],
    width: number,
    height: number
  ): TemporalAnimationContinuityReport {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
        width <= 0 || height <= 0 || width * height > 16_777_216)
      throw new RangeError('Invalid animation frame dimensions');
    for (const frame of framesRgba) validateRaster(frame, width, height);
    if (framesRgba.length < 2) {
      return {
        frameCount: framesRgba.length,
        maxCenterOfMassJumpTexels: 0,
        maxAreaFluctuationRatio: 0,
        isTemporallyContinuous: framesRgba.length === 1 &&
          framesRgba[0].some((v, i) => i % 4 === 3 && v !== 0),
        summary: 'Single frame sequence.',
      };
    }

    const centroids: Array<{ readonly x: number; readonly y: number; readonly area: number }> = [];
    for (const frame of framesRgba) {
      let area = 0;
      let sx = 0;
      let sy = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (frame[(y * width + x) * 4 + 3] > 0) {
            area += 1;
            sx += x;
            sy += y;
          }
        }
      }
      centroids.push({
        x: area > 0 ? sx / area : width * 0.5,
        y: area > 0 ? sy / area : height * 0.5,
        area,
      });
    }

    let maxComJump = 0;
    let maxAreaFluctuation = 0;

    for (let i = 0; i < centroids.length; i += 1) {
      const curr = centroids[i];
      const next = centroids[(i + 1) % centroids.length];
      const jump = Math.hypot(next.x - curr.x, next.y - curr.y);
      if (jump > maxComJump) maxComJump = jump;

      const areaDiff =
        Math.abs(next.area - curr.area) / Math.max(1, Math.max(curr.area, next.area));
      if (areaDiff > maxAreaFluctuation) maxAreaFluctuation = areaDiff;
    }

    const isTemporallyContinuous =
      maxComJump <= Math.max(2.5, Math.min(width, height) * 0.22) &&
      maxAreaFluctuation <= 0.35 &&
      centroids.every((c) => c.area > 0);

    return {
      frameCount: framesRgba.length,
      maxCenterOfMassJumpTexels: maxComJump,
      maxAreaFluctuationRatio: maxAreaFluctuation,
      isTemporallyContinuous,
      summary: isTemporallyContinuous
        ? `Temporal animation continuity verified (maxJump=${maxComJump.toFixed(2)}px).`
        : `Temporal discontinuity detected (maxJump=${maxComJump.toFixed(2)}px, areaFluct=${maxAreaFluctuation.toFixed(2)}).`,
    };
  }

  /**
   * 7. Enforces the Golden Reference protection policy: a canonical RGBA hash change is
   * rejected as a regression unless accompanied by an explicit overhaul reason and visual approval.
   * Policy check only: it does not mutate or rewrite the fixed Phase 11 registry.
   * CI still compares all 10 canonical hashes against their tracked values.
   */
  public verifyGoldenReferencePolicy(
    proposal: GoldenReferenceChangeProposal
  ): GoldenReferenceAuditVerdict {
    if (proposal.previousRgbaHash === proposal.candidateRgbaHash) {
      return {
        referenceId: proposal.referenceId,
        hashesMatch: true,
        isAuthorizedUpdate: false,
        verdict: 'unchanged-pass',
        message: `Golden reference '${proposal.referenceId}' matches canonical hash ${proposal.previousRgbaHash}.`,
      };
    }

    const hasValidReason =
      typeof proposal.intentionalArtOverhaulReason === 'string' &&
      proposal.intentionalArtOverhaulReason.trim().length >= 12;

    if (hasValidReason && proposal.visualInspectionApproved === true) {
      return {
        referenceId: proposal.referenceId,
        hashesMatch: false,
        isAuthorizedUpdate: true,
        verdict: 'authorized-baseline-update',
        message: `Authorized baseline update for '${proposal.referenceId}': ${proposal.previousRgbaHash} -> ${proposal.candidateRgbaHash} (${proposal.intentionalArtOverhaulReason}).`,
      };
    }

    return {
      referenceId: proposal.referenceId,
      hashesMatch: false,
      isAuthorizedUpdate: false,
      verdict: 'unauthorized-regression-fail',
      message: `Unauthorized RGBA hash modification for '${proposal.referenceId}' (${proposal.previousRgbaHash} != ${proposal.candidateRgbaHash}). Silent baseline updates are prohibited.`,
    };
  }

  /**
   * Runs a combined multi-metric audit on an individual asset sprite.
   */
  public evaluateComprehensiveSpriteQuality(
    rgba: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    profile: AnyGranularityProfileInput
  ): ComprehensiveAssetQualityReport30 {
    validateRaster(rgba, width, height);
    const profileId = normalizeGranularityProfileId(profile);
    const resolutionAndPalette = this.auditResolutionDetailAndPalette(
      rgba,
      width,
      height,
      profile
    );
    const pillowShading = auditPillowShadingAndBlobGeometry(rgba, width, height);
    const geometricExcess = this.auditCircularAndRectangularExcess(rgba, width, height);

    const overallPassed =
      resolutionAndPalette.passesBudgetAndScale &&
      !pillowShading.hasPillowShadingDefect &&
      !geometricExcess.hasExcessiveRectangleDefect &&
      !geometricExcess.hasExcessiveCircleDefect;

    return {
      profileId,
      resolutionAndPalette,
      pillowShading,
      geometricExcess,
      overallPassed,
    };
  }

  /**
   * Delegates 8-direction anatomical continuity and shoreline blockiness checks to their
   * specialized Phase 2B / Phase 3B engines for unified reporting.
   */
  public evaluateShorelineColorGrid(
    rgba: Uint8Array | Uint8ClampedArray,
    width: number, height: number, tileTexelSize: number
  ): BlockyShorelineAuditReport {
    return auditBlockyShorelineArtifacts(rgba, width, height, tileTexelSize);
  }

  public evaluateShorelineAndAnatomicalContinuity(params: {
    readonly chunkRgba: Uint8ClampedArray | Uint8Array;
    readonly chunkWidthTexels: number;
    readonly chunkHeightTexels: number;
    readonly tileTexelSize: number;
    readonly rig: GeneratedAnatomicalRig25D;
  }): {
    readonly shorelineReport: BlockyShorelineAuditReport;
    readonly eightDirectionReport: EightDirectionContinuityAudit;
  } {
    const projector = new EightDirectionProjectionEngine(34);
    return {
      shorelineReport: auditBlockyShorelineArtifacts(
        params.chunkRgba,
        params.chunkWidthTexels,
        params.chunkHeightTexels,
        params.tileTexelSize
      ),
      eightDirectionReport: projector.auditEightDirectionContinuity(params.rig),
    };
  }
}
