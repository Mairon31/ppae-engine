import { describe, expect, it } from 'vitest';
import {
  BathymetricWaterAnimator,
  HighResAnatomySynthesizer,
  HydrologySdfTopologyEngine,
  SkeletalBranchSegmentNode,
  VisualRegressionAuditor30,
  computeRgbaBufferHexHash,
} from '../src/core/ppae-3-phase1-barrel';

describe('PPAE 3.0 Phase 4A — Evolved Visual Quality & Regression Auditor', () => {
  const auditor = new VisualRegressionAuditor30();

  it('detects tubular, non-tapering upper tree branches and bare tips (Screenshot #4 defect) while approving Da Vinci tapered trees', () => {
    // 1. Defective tree skeleton: upper branch nearly as thick as trunk and bare at tip
    const defectiveBranches: readonly SkeletalBranchSegmentNode[] = [
      {
        id: 'trunk',
        parentId: null,
        order: 0,
        radiusStart: 5.0,
        radiusEnd: 4.5,
        length: 20,
        hasFoliageClusterAtTip: true,
      },
      {
        id: 'tubular_upper_branch',
        parentId: 'trunk',
        order: 1,
        radiusStart: 4.5,
        radiusEnd: 4.4, // does not taper and terminal ratio is 4.4 / 5.0 = 0.88 > 0.45
        length: 16,
        hasFoliageClusterAtTip: false, // exposed bare fork like image_a1079b.png
      },
    ];

    const badReport = auditor.auditBranchTaperingGeometry(defectiveBranches);
    expect(badReport.hasTubularBranchDefect).toBe(true);
    expect(badReport.nonTaperingSegments).toBeGreaterThan(0);
    expect(badReport.exposedLiveTerminalTips).toBe(1);

    // 2. Botanically valid Da Vinci tapered skeleton
    const validBranches: readonly SkeletalBranchSegmentNode[] = [
      {
        id: 'trunk',
        parentId: null,
        order: 0,
        radiusStart: 6.0,
        radiusEnd: 4.2,
        length: 20,
        hasFoliageClusterAtTip: false,
      },
      {
        id: 'branch_left',
        parentId: 'trunk',
        order: 1,
        radiusStart: 2.8,
        radiusEnd: 1.4,
        length: 14,
        hasFoliageClusterAtTip: true,
      },
      {
        id: 'branch_right',
        parentId: 'trunk',
        order: 1,
        radiusStart: 2.6,
        radiusEnd: 1.2,
        length: 13,
        hasFoliageClusterAtTip: true,
      },
    ];

    const goodReport = auditor.auditBranchTaperingGeometry(validBranches);
    expect(goodReport.hasTubularBranchDefect).toBe(false);
    expect(goodReport.daVinciCrossSectionViolations).toBe(0);
    expect(goodReport.exposedLiveTerminalTips).toBe(0);
  });

  it('detects clonal cell repetition in cave perimeters (Screenshot #7 defect: 30 identical rock circles)', () => {
    const cellSize = 8;
    const cols = 9;
    const rows = 7;
    const width = cols * cellSize;
    const height = rows * cellSize;
    const caveRgba = new Uint8ClampedArray(width * height * 4);

    // Stamp the exact same striped circle in all 28 perimeter cells of the 9x7 grid
    for (let cy = 0; cy < rows; cy += 1) {
      for (let cx = 0; cx < cols; cx += 1) {
        const isBorder = cy === 0 || cy === rows - 1 || cx === 0 || cx === cols - 1;
        if (!isBorder) continue;

        for (let dy = 0; dy < cellSize; dy += 1) {
          for (let dx = 0; dx < cellSize; dx += 1) {
            if (Math.hypot(dx - 3.5, dy - 3.5) <= 3.2) {
              const px = cx * cellSize + dx;
              const py = cy * cellSize + dy;
              const idx = (py * width + px) * 4;
              const tone = dy % 2 === 0 ? 90 : 120;
              caveRgba[idx] = tone;
              caveRgba[idx + 1] = tone + 10;
              caveRgba[idx + 2] = tone + 25;
              caveRgba[idx + 3] = 255;
            }
          }
        }
      }
    }

    const repetitionReport = auditor.auditCellPatternRepetition(
      caveRgba,
      width,
      height,
      cellSize
    );
    expect(repetitionReport.hasClonalRepetitionDefect).toBe(true);
    expect(repetitionReport.maxIdenticalCellCount).toBe(28);
  });

  it('detects excessive rectangular/circular primitive silhouettes while approving synthesized 2.5D creatures', () => {
    // 1. Pure solid rectangle (e.g., un-articulated box)
    const rectRgba = new Uint8ClampedArray(24 * 24 * 4);
    for (let y = 4; y < 20; y += 1) {
      for (let x = 4; x < 20; x += 1) {
        const idx = (y * 24 + x) * 4;
        rectRgba[idx] = 180;
        rectRgba[idx + 1] = 90;
        rectRgba[idx + 2] = 40;
        rectRgba[idx + 3] = 255;
      }
    }
    const rectAudit = auditor.auditCircularAndRectangularExcess(rectRgba, 24, 24);
    expect(rectAudit.hasExcessiveRectangleDefect).toBe(true);

    // 2. Synthesized Phase 3C creature passes comprehensive quality audit
    const synthesizer = new HighResAnatomySynthesizer();
    const wolfSprite = synthesizer.synthesizeEntitySprite({
      speciesId: 'canine-wolf',
      direction: 'SE',
      profile: 'native-24x24',
      seed: 404,
    });

    const comprehensive = auditor.evaluateComprehensiveSpriteQuality(
      wolfSprite.rgba,
      wolfSprite.width,
      wolfSprite.height,
      'native-24x24'
    );
    expect(comprehensive.overallPassed, JSON.stringify(comprehensive)).toBe(true);
  });

  it('verifies cross-chunk pixel seam continuity and temporal animation continuity on Phase 2C water chunks', () => {
    const hydrology = new HydrologySdfTopologyEngine({ seed: 98765 });
    const animator = new BathymetricWaterAnimator(hydrology);

    const seqLeft = animator.renderAnimatedChunkSequence({
      profile: 'standard-16x16',
      chunkX: 0,
      chunkY: 0,
      chunkSizeTiles: 2,
      totalFrames: 4,
    });
    const seqRight = animator.renderAnimatedChunkSequence({
      profile: 'standard-16x16',
      chunkX: 1,
      chunkY: 0,
      chunkSizeTiles: 2,
      totalFrames: 4,
    });

    const seamReport = auditor.auditCrossChunkPixelSeam(
      seqLeft[0].rgba,
      seqRight[0].rgba,
      seqLeft[0].widthTexels,
      seqLeft[0].heightTexels,
      'horizontal-left-right'
    );
    expect(seamReport.hasVisibleChunkSeam).toBe(false);

    const temporalReport = auditor.auditAnimationFrameContinuity(
      seqLeft.map((f) => f.rgba),
      seqLeft[0].widthTexels,
      seqLeft[0].heightTexels
    );
    expect(temporalReport.isTemporallyContinuous).toBe(true);
  });

  it('flags tile-grid-aligned blue-water borders and ignores diagonal transitions', () => {
    const width = 32, height = 32, tile = 8;
    const blocky = new Uint8ClampedArray(width * height * 4);
    const diagonal = new Uint8ClampedArray(width * height * 4);
    const paint = (out: Uint8ClampedArray, boundary: (x: number, y: number) => boolean) => {
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const blue = boundary(x, y);
        out[i] = blue ? 20 : 120;
        out[i+1] = blue ? 58 : 110;
        out[i+2] = blue ? 160 : 72;
        out[i+3] = 255;
      }
    };
    paint(blocky, (x) => x < 16);
    paint(diagonal, (x, y) => x < y);
    expect(auditor.evaluateShorelineColorGrid(blocky, width, height, tile).hasBlockyShorelineDefect).toBe(true);
    expect(auditor.evaluateShorelineColorGrid(diagonal, width, height, tile).hasBlockyShorelineDefect).toBe(false);
  });

  it('rejects malformed raster inputs, invalid branch graphs and empty silhouettes', () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4);
    expect(() => auditor.auditCellPatternRepetition(rgba, 5, 4, 2)).toThrow(RangeError);
    expect(() => auditor.auditCrossChunkPixelSeam(rgba, rgba, 0, 4)).toThrow(RangeError);
    expect(() => auditor.auditAnimationFrameContinuity([rgba], 5, 4)).toThrow(RangeError);
    expect(auditor.auditResolutionDetailAndPalette(rgba, 4, 4, 'micro-4x4').passesBudgetAndScale).toBe(false);
    const invalid: readonly SkeletalBranchSegmentNode[] = [
      {id:'orphan',parentId:'missing',order:1,radiusStart:1,radiusEnd:0.4,length:2,hasFoliageClusterAtTip:true}
    ];
    expect(() => auditor.auditBranchTaperingGeometry(invalid)).toThrow(RangeError);
  });

  it('enforces Golden Reference protection against silent hash modifications', () => {
    const sampleRgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    const hashA = computeRgbaBufferHexHash(sampleRgba);

    const unchanged = auditor.verifyGoldenReferencePolicy({
      referenceId: 'canonical-oak-tree-16',
      previousRgbaHash: hashA,
      candidateRgbaHash: hashA,
    });
    expect(unchanged.verdict).toBe('unchanged-pass');

    const silentModification = auditor.verifyGoldenReferencePolicy({
      referenceId: 'canonical-oak-tree-16',
      previousRgbaHash: hashA,
      candidateRgbaHash: 'deadbeef',
    });
    expect(silentModification.verdict).toBe('unauthorized-regression-fail');

    const authorizedUpdate = auditor.verifyGoldenReferencePolicy({
      referenceId: 'canonical-oak-tree-16',
      previousRgbaHash: hashA,
      candidateRgbaHash: 'deadbeef',
      intentionalArtOverhaulReason: 'Phase 5A Da Vinci branch tapering overhaul',
      visualInspectionApproved: true,
    });
    expect(authorizedUpdate.verdict).toBe('authorized-baseline-update');
  });
});
