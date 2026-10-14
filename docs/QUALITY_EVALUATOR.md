# Procedural Art Quality Evaluator — Phase 11

PPAE offers a quantitative, deterministic **diagnostic** layer over its pixel-art generators. This is not a replacement for artist review and not an image-generation model.

## Public API

Import `ProceduralArtQualityEvaluator` and `APPROVED_GOLDEN_SEED_REGISTRY` from the package root.

- `evaluateSpriteQuality(buffer, options)` returns a numeric score (0–100), defects, silhouette/connectivity metrics, chroma-separated highlight alignment, orphan-pixel ratio, silhouette-edge/background contrast and color-budget figures.
- `auditTileSeamlessness(tile, materialId, profile)` checks the actual opposite-edge differences expected when a tile repeats in a 2 × 2 arrangement, compared with adjacent internal differences.
- `auditAllBaseTerrainMaterials(profile)` runs all seven base materials; tests cover the 4, 6, 8, 16 and 32 native profiles.
- `runGoldenSeedBenchmarkSuite()` regenerates ten canonical specimens (trees, mineral rock, flora, two hero resolutions, a creature, a fixed-geometry structure and terrain) and returns their reports and dimension-aware FNV-1a RGBA `pixelHash` values.
- `hashPixelBuffer(buffer)` gives a stable 8-hex-digit signature over dimensions and RGBA bytes (not a cryptographic digest).

## Applicability and scoring

The reported light-alignment heuristic compares highlights **within similar chroma regions**. Comparing a birch's bright trunk to its darker foliage would create a false inverted-light report. For emissive geodes and multi-light structures, the per-reference `checkDirectionalLighting: false` flag excludes a physically inapplicable sun-direction gate; the metric is still reported. Flat terrain deliberately resembles its surrounding biome, so its reference skips sprite-foreground contrast using `checkBackdropContrast: false`; an ordinary sprite does not. These options must not be used as general-purpose means to silence actual defects.

Silhouette/background contrast is measured from **visible boundary pixels**, never replaced by an artificial minimum. The evaluator rejects empty buffers, disconnected sprites (unless allowed), excessive bilateral symmetry when organic asymmetry is required, palette overflow, low contrast, inverted or centered single-material light and granular orphan noise.

Color ceilings for composite reference specimens are explicit in the registry. An articulated multi-material avatar can require more colors than a single-material vegetation tile at the same native resolution. Applications can pass `maxColorsOverride` if justified by their art direction; default evaluation uses the existing detail budget plus the documented allowance.

## Reference baseline and intentional revisions

**Baseline CI:** https://github.com/Mairon31/ppae-engine/actions/runs/38647633342 (35 suites / 199 tests, before hash pins).

| Reference | Canonical RGBA hash |
| --- | --- |
| `golden_tree_oak_mature_6x6` | `a3f5c49a` |
| `golden_tree_birch_mature_6x6` | `a99df991` |
| `golden_rock_crystal_geode_6x6` | `8a0926bb` |
| `golden_rock_fractured_monolith_6x6` | `9c0afbb7` |
| `golden_flora_flower_cluster_6x6` | `e7c57e57` |
| `golden_character_hero_south_6x6` | `d26d3ecd` |
| `golden_character_hero_south_16x16` | `75b3539b` |
| `golden_creature_stag_east_6x6` | `20cea1df` |
| `golden_structure_cottage_4x4` | `c8e5fc62` |
| `golden_terrain_meadow_6x6` | `d5a7b351` |

Each registration includes its target profile, category, minimum score, flags and immutable image hash. A future change to a registered output causes a test failure **even when its quality score improves**. Review the image and the intent of the edit before updating a fingerprint; document the previous and new hashes in the phase-progress log. A hash match proves deterministic output identity only, not artistic quality.

Current baseline scores range from **92 to 100**. Automated metrics and targeted tests passed; independent human examination of every one of the ten generated images is still pending. The quality evaluator is library-only for Phase 11; live Playground visualization is reserved for Phase 12, rather than adding a fake preview.

## Run locally

```bash
npm test
npm run build
npm run check:package
```

CI includes the quality suite automatically. No npm publishing is triggered by these commands.
