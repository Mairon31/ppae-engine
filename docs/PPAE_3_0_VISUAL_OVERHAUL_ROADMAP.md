# PPAE Engine 3.0 — Visual Art & Procedural Content Overhaul

**Source baseline**: `063e5dcefef86f287a034835e61e7e25da6349e8` (master)

**Working branch**: `feat/ppae-3-0-visual-overhaul` — does not modify master.

**Phase 1A scope**: independent resolution mathematics and diagnostics only. The new profiles are NOT wired into existing public ArtStyleProfile/generators/Playground; that is part of phase 1B. Existing hybrid-24 is an art module of 4 texels and canonical tile of 48 texels, NOT a 24-texel module. Native-24x24 proposes 24-texel art modules and 96-texel canonical tiles. The upscale checker is a heuristic (inconclusive when the pattern is absent), not proof of native generation.

**Validation rule**: Only mark integration/test/visual gates from actual CI and screenshots. Re-test existing 10 golden pixel hashes; do not update them automatically. Advance only after user confirmation.

## FASE 1: Native resolution foundations

### FASE 1A: Registry, budgets and integer grid (this delivery)
- [ ] Pendiente
- [x] Implementación entregada
- [x] Aplicada al repositorio
- [x] Compilación aprobada
- [x] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada — se realizará tras integrar un generador en FASE 1B/1C
- [ ] Verificada — pendiente revisión visual, sin activar perfiles nuevos en producción

**Evidencia técnica:** [CI del commit b959703](https://github.com/Mairon31/ppae-engine/actions/runs/38677272934), 37 suites / 214 tests, incluidos 10 tests de 1A; npm build y package audit PASS. Paquete de 54 archivos / 142624 bytes comprimidos, no publicado.

**Limitaciones:** Los cinco tamaños nuevos todavía no son seleccionables en el Playground. El método de bloques RGBA detecta patrones compatibles con reescalado, pero no puede acreditar por sí mismo la procedencia nativa de una imagen.

### FASE 1B: Integrate public profile contracts, generators and renderer
- [x] En desarrollo — 1B.1 and 1B.2 technical gates passed; 1B.3 and visual parity pending

#### FASE 1B.1 — Standalone resolution contract bridge and material surface rasterizer
- [x] Implementación entregada
- [x] Aplicada al repositorio
- [x] Compilación aprobada — TypeScript, biblioteca y Playground
- [x] Pruebas automatizadas aprobadas — 225/225 tests, 38/38 suites
- [ ] Revisión visual aprobada — requiere galería real antes/después y revisión artística
- [ ] Verificada — pendiente revisión visual y cableado de consumidores en 1B.2

**Evidencia de implementación:** [GitHub Actions 38678948836](https://github.com/Mairon31/ppae-engine/actions/runs/38678948836) (225 tests, 38 suites, build PASS, npm package audit PASS). Paquete: 56 archivos, 151774 bytes comprimidos; no publicado.

**Correcciones respecto al borrador de Gemini Argon:** El módulo artístico no equivale al tile canónico. Por ejemplo, `micro-4x4` usa 4/24, `standard-16x16` usa 16/64, `native-24x24` se registró en 1A como 24/96 y `hybrid-24` conserva 4/48. Un tile representa **16 unidades lógicas de mundo** en el motor actual, no una. `adaptive-auto` utiliza la selección dinámica actual, con 8/32 solo como fallback declarativo. No se proclama integración nativa en otros generadores.

**Superficie nueva:** el rasterizador genera por defecto un buffer de un módulo artístico; permite solicitar explícitamente un tile canónico completo. La salida incluye `PixelBuffer` real y datos RGBA de alfa binario, máscaras de material y normales, todos probados. Un SDF con iluminación normalizada no demuestra por sí solo que las figuras resulten artísticamente mejores: falta QA de escenas y assets.

**FASE 1B.3 pendiente:** integrar `ArtStyleProfile`, `GranularityProfileId`, `CoordinateSystem`, rasterizadores dependientes y validar los consumidores en sus contratos reales. Los cinco perfiles nuevos todavía no están expuestos como modos completos del motor y el Playground.

**Scope:** `src/core/resolution-contract-bridge.ts`, `src/rasterizer/surface-cluster-rasterizer.ts`, `tests/ppae-3-surface-rasterizer-1b.test.ts`; root public exports. Bridges the actual current profile constants rather than re-declaring incompatible tile sizes. `hybrid-24` is module 4/tile 48; `native-24x24` remains module 24/tile 96. The current adaptive selection is dynamic with 8/32 fallback; no new profile is usable in the legacy renderers yet. Surface raster samples a full art module by default; full tile requires explicit extent. Golden RGBA references unchanged.

#### FASE 1B.2 — Multi-chunk coordinate adapter, art primitives and diagnostic barrel
- [ ] Pendiente
- [x] Implementación entregada
- [x] Aplicada al repositorio
- [x] Compilación aprobada — TypeScript, library and package build PASS
- [x] Pruebas automatizadas aprobadas — 235/235 tests in 39 suites
- [ ] Revisión visual aprobada — module output gallery not yet reviewed
- [ ] Verificada — implementation of full legacy consumers remains pending

**Code delivered:** `src/core/coordinate-resolution-adapter.ts`, `src/rasterizer/pixel-perfect-primitives.ts`, `src/core/ppae-3-phase1-barrel.ts`, `tests/ppae-3-coordinate-primitives-1b2.test.ts`, and root `src/index.ts` exports. Uses the existing 16-world-units-per-tile coordinate contract, retains native-24x24 as 24/96 and hybrid-24 as 4/48. Atlas slot computations use canonical tile size, not the module size. Pillow-shading scores are conservative heuristics, not artistic certification. Coordinate seams are mathematically continuous but this does not establish terrain pixel/color seamlessness.

**Phase 1B.2 technical QA:** [GitHub Actions 38680396314](https://github.com/Mairon31/ppae-engine/actions/runs/38680396314) — 39/39 suites, 235/235 tests, build PASS, npm package audit PASS; 59 packed files (157989 bytes compressed), no release. First run failed due to an incorrect test pivot expectation (even 36px width, center round(17.5)=18 plus padding 2 => 20), corrected with no atlas algorithm change.

**Deferred full Phase 1B integration:** The legacy `GranularityProfileId`, `ArtModuleSize`, `CanonicalTileTexelSize`, `DEFAULT_STYLE_PROFILES` and downstream renderers remain unchanged. New sizes render in the standalone surface API, **not** yet in all game assets or Playground. Complete native consumer migration and visual acceptance before closing Phase 1B or proceeding as though Phases 2–11 have full native parity.

#### FASE 1B.3 — Complete legacy public profile and generator migration
- [x] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 1C: Surface raster and native geometry quality fixtures
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 2: Rivers, coastlines and water

### FASE 2A: Stream topology and distance fields
- [ ] Pendiente
- [x] Implementación entregada
- [x] Aplicada al repositorio
- [x] Compilación aprobada — build + TypeScript PASS
- [x] Pruebas automatizadas aprobadas — 243 tests, 40 suites
- [ ] Revisión visual aprobada — requires field-to-tile rendering in Phase 2B
- [ ] Verificada — visual terrain integration pending

**CI evidence:** [GitHub Actions 38682124926](https://github.com/Mairon31/ppae-engine/actions/runs/38682124926), 243/243 tests, 40/40 suites, npm build PASS, npm package audit PASS; 60 files, 161875 packed bytes, no publish.

**Implementation:** `src/terrain/hydrology-sdf-topology.ts`, `tests/ppae-3-hydrology-topology-2a.test.ts`, public barrel exports. Deterministic continuous signed implicit field for curving rivers, tributaries, deltas, lakes/islands, ocean, flow, banks, depth, foam and waterfalls.

**Coordinate contract:** `sampleWorldHydrology(wx,wy)` takes coordinates in **world tiles** (1 world tile = 16 existing engine logical units). The chunk sampler maps canonical tile texels to this field; native-24x24 is module 24/tile 96, hybrid-24 is module 4/tile 48.

**Limitations:** This is an approximate signed implicit topology field, NOT an exact globally measured Euclidean SDF and NOT a fluid physics simulator. No changes to existing `DeterministicWorldField`, liquid renderer or autotiler yet; visual river corrections depend on Phase 2B/C. Phase 1B.3 generator integration remains pending.


### FASE 2B: Shoreline joining and sandbanks
- [ ] Pendiente
- [x] Implementación entregada — standalone 47-mask field-backed shoreline sampler
- [x] Aplicada al repositorio
- [x] Compilación aprobada — build PASS
- [x] Pruebas automatizadas aprobadas — 253/253 tests, 42 suites (combined 2B+2C CI)
- [ ] Revisión visual aprobada — browser/terrain comparison pending
- [ ] Verificada — legacy autotiler integration pending

**Implementation:** `src/terrain/shoreline-autotiler-47.ts`, `tests/ppae-3-shoreline-autotiler-2b.test.ts`. Reuses original `CANONICAL_47_AUTOTILE_MASKS`; samples the signed implicit shoreline field per texel for sand/wetland/water rather than stamping square shore overlays. This prerequisite was absent in the branch and had to be created before Phase 2C. No legacy renderer replacement yet.

### FASE 2C: Water depth, flow and animation
- [ ] Pendiente
- [x] Implementación entregada — standalone bathymetric/optical water animator
- [x] Aplicada al repositorio
- [x] Compilación aprobada — build PASS
- [x] Pruebas automatizadas aprobadas — 253/253 tests, 42 suites
- [ ] Revisión visual aprobada — animation sequences and game world pending
- [ ] Verificada — integration and visual acceptance pending

**Implementation:** `src/terrain/bathymetric-water-animator.ts`, `tests/ppae-3-water-animation-2c.test.ts`. Six biome profiles, world-space periodic currents/shore/waterfall foam, quantized material ramps, shallow-bed visibility and lighting response. Tests cover exact frame wrapping, immutable land, all ten art modules and hybrid-24, palette compliance, and chunk-edge phase stability.

**Validation:** [CI run 38747183127](https://github.com/Mairon31/ppae-engine/actions/runs/38747183127), 253 tests/42 suites, build PASS, npm pack audit PASS, 62 packed files (166406 packed bytes), no npm publish.

**Readiness honesty:** `SUBSYSTEM_TEN_RESOLUTION_READINESS['terrain-hydrology']` remains `false` until `DeterministicWorldField`, `ChunkWorldRenderer`, and `LiquidTileGenerator` actually use the new modules in production and image QA passes. This explicit integration gate remains even though standalone Phase 2A/2B/2C APIs exist. Phase 1B.3 is also outstanding.

## FASE 3: Species anatomy and 8 directions

### FASE 3A: Taxonomic rigs and developmental proportions
- [ ] Pendiente
- [x] Implementación entregada
- [x] Aplicada al repositorio
- [x] Compilación aprobada — library, TypeScript, demo, npm package audit
- [x] Pruebas automatizadas aprobadas — 258/258 tests in 43 suites
- [ ] Revisión visual aprobada — requiere renders reales en el Playground
- [ ] Verificada — renderer y proyección 8 direcciones pendientes

**Code:** `src/entities/species-anatomical-skeleton.ts`, `tests/ppae-3-creature-anatomy-3a.test.ts`, `src/core/ppae-3-phase1-barrel.ts`.
Six standalone anatomical families with articulated limbs, deterministic gait phases, body conditions, five life stages, accessory anchors, mass/bounds, support contacts and ground support hull. Head/torso allometry and wolf thorax/abdomen proportions are regression-tested.

**CI evidence:** [GitHub Actions run 38751816188](https://github.com/Mairon31/ppae-engine/actions/runs/38751816188) — 43/43 suites, 258/258 tests, production library and demo build PASS, npm package audit PASS. The FASE 3A integration is still structural only; visual fidelity and rendering parity remain unverified.

**Scope limit:** This is a 2.5D **rig description API** only. Existing `CreatureGenerator`, character sprites, 8-direction projection, rasterizer composition, and Playground remain on their current renderers until Phase 3B/3C integration. A passing structural test is not visual acceptance.

### FASE 3B: Eight-direction anatomical occlusion
- [ ] Pendiente
- [x] Implementación entregada
- [x] Aplicada al repositorio
- [x] Compilación aprobada — TypeScript, library and Playground build PASS
- [x] Pruebas automatizadas aprobadas — 264/264 tests, 44/44 suites
- [ ] Revisión visual aprobada — gallery of eight-direction sprites and side-by-side comparisons pending
- [ ] Verificada — legacy generator and Playground integration pending

**Implementation:** `src/entities/eight-direction-projection.ts`, `tests/ppae-3-eight-direction-projection-3b.test.ts` and barrel export. Phase 3A rigs project with a constant per-rig reference span into eight 2.5D views, camera-relative joint depth, visible/hidden anatomical parts, far-side limb shading, eye markers, support points and equipment anchors; standalone RGBA generation uses `SurfaceClusterRasterizer`.

**Validation note:** continuity audit tests geometric changes between **45-degree views**, not identical silhouettes. Bounds calibrated against real 3A cow and wolf shapes; eye primitives added to painter ordering before display. Tests include six species, all directions, profile sizes, deterministic native 24x24 pixels, binary alpha, support points, depth ordering and directional occlusion. These are structural/pixel-data tests and **do not certify artistic quality or production creature replacement**.

**CI evidence:** [GitHub Actions run 38754043541](https://github.com/Mairon31/ppae-engine/actions/runs/38754043541) — 264 passing tests across 44 suites, production library/TypeScript and demo build PASS, npm distributable audit PASS. Validation establishes compile-time and unit-test conformity, not visually approved sprites or production generator wiring.

**Unfinished:** 3C adds species-specific material texture and secondary anatomy. 1B.3 still requires full legacy consumer integration. Current creature cards and Playground are unchanged by this standalone projection API; do not mark full rendering parity verified.

### FASE 3C: High-Resolution Secondary Anatomy & Material Cluster Shading
- [ ] Pendiente
- [x] Implementación entregada — species-specific secondary anatomy
- [x] Aplicada al repositorio — standalone public API in barrel
- [x] Compilación aprobada — TypeScript, library, demo and npm package audit PASS
- [x] Pruebas automatizadas aprobadas — 270/270 tests, 45/45 suites
- [ ] Revisión visual aprobada — inspect 6 species × 8 angles × 10 modules in browser
- [ ] Verificada — consumer migration and visual parity pending

**Code:** `src/entities/high-res-anatomy-synthesizer.ts`, `tests/ppae-3-high-res-anatomy-3c.test.ts`, `src/core/ppae-3-phase1-barrel.ts` and `src/core/resolution-contract-bridge.ts`.

**Features:** Distinct cow piebald/muzzle/hooves, sheep fleece, wolf dorsal counter-shading and mane, avian beak/feathers, humanoid hair/clothing, corrupt-gel core and veins. Samples anatomical role metadata over the 3B projected rig. Wool, fur, hair and veins use segment-local coordinates for stability across rotations; result includes RGBA + role buffer and feature count.

**Packaging note:** npm automatically bundles root README language variants. The package manifest audit now explicitly permits only README.md, README.es.md and README.pt-BR.md alongside compiled library, declarations and license; excludes internal `docs/`, demo and tests. These public translations add a small amount of package size but are not internal documentation.

**CI evidence:** [GitHub Actions run 38759736553](https://github.com/Mairon31/ppae-engine/actions/runs/38759736553) — 270/270 tests, 45 suites, ESM library, TypeScript declarations, demo production build and npm pack audit PASS; 67 package files / 191141 compressed bytes; no publish. README language variants are public and the `docs/` directory remains excluded.

**Support contract:** `STANDALONE_ENTITY_ANATOMY_TEN_RESOLUTION_AVAILABLE = true` means the new independent synthesizer accepts all ten native module sizes. `SUBSYSTEM_TEN_RESOLUTION_READINESS['entity-anatomy']` remains **false** because traditional `CreatureGenerator` and `CharacterGenerator` plus Playground still use legacy paths. Phase 1B.3 and visual review are not bypassed.

**Quality caveat:** `verifyTrueNativeResolutionBuffer` reports suspected upscale or inconclusive, not proof of native art. Pillow shading is a heuristic, not an automatic artistic certificate. Full 3D-coherent pattern sampling, anatomy quality, pixel readability at 4x4, and before/after screenshots remain to be verified during QA; do not claim Phase 3 fully visually accepted.


## FASE 4: Quality assurance

### FASE 4A: Geometric, Anatomical & Shoreline Quality Metrics
- [ ] Pendiente
- [x] Implementación entregada — standalone visual-regression auditor and regression fixtures
- [x] Aplicada al repositorio — public barrel export; no changes to Phase 11 canonical references
- [ ] Compilación aprobada — CI pending
- [ ] Pruebas automatizadas aprobadas — CI pending
- [ ] Revisión visual aprobada — before/after screenshots pending
- [ ] Verificada — automatic gate integration into real producers pending

**Implementation:** `src/quality/visual-regression-auditor-30.ts`, `tests/ppae-3-visual-quality-auditor-4a.test.ts` and `src/core/ppae-3-phase1-barrel.ts`.

**Checks:** branch distal radius, parental cross-section, foliage-free live tips, repeated textured tile cells, bounding box/circular silhouette ratios, palette/orphan detail budgets, RGBA seams, animation temporal continuity, 3B eight-direction projection, pillow-shading heuristics and a no-silent-hash-change policy for RGBA Golden References.

**Interface correction:** Phase 2B does not expose `auditBlockyShorelineArtifacts`. Phase 4A supplies a **blue-water color-mask heuristic** itself, using tile-grid transition alignment; this is not a terrain-class semantic/bathymetric proof for swamp or non-blue water. Real signed-distance shoreline and material masks must be audited separately. CI Phase 11 golden-seed benchmarks remain authoritative; no canonical hashes are modified. These functions are opt-in until wired into producers and browser visual QA.

**Gate honesty:** passing synthetic cases and the golden tests is not proof that every real generated tree/cave/crop is visually correct. Treat the P0 code/API delivery and the final P0 visual acceptance as separate statuses.


## FASE 5: Trees, flora and geology

### FASE 5A: Botanical branch tapering
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 5B: Diverse secondary flora families
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 5C: Minerals and fracture geology
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 6: Adaptive architecture

### FASE 6A: Resolution-aware structural grammar
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 6B: Diverse buildings and animated mechanisms
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 7: Interiors, caves and dungeons

### FASE 7A: Separate shell, props and spatial compositor
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 7B: Natural cave networks
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 7C: Built dungeon grammar
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 8: Creature variants and bosses

### FASE 8A: Composable biome/status/elemental forms
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 8B: Articulated boss families
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 9: Farming

### FASE 9A: Taxonomic crop growth and diversity
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 10: Items, equipment and UI

### FASE 10A: Icon grammar and item families
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 10B: Consistent equipment identities in 8 directions
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 10C: Multi-theme UI components
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 11: Biomes and palette systems

### FASE 11A: Diverse biome ecosystems and material ramps
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 12: Contextual effects and production inspection

### FASE 12A: Local lighting and asset-linked VFX
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 12B: Visual comparison, instrumentation and release regression
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## Phase 1A validation

- Expected files: `src/core/native-resolution.ts`, `tests/ppae-3-native-resolution-1a.test.ts`.
- npm test, npm run build, npm run check:package; phase-specific Vitest.
- Evidence to be populated from GitHub Actions after implementation, rather than guessed.
