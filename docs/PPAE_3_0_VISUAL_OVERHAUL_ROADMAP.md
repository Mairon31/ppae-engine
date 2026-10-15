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
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 2B: Shoreline joining and sandbanks
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 2C: Water depth, flow and animation
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 3: Species anatomy and 8 directions

### FASE 3A: Taxonomic rigs and developmental proportions
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 3B: Eight-direction anatomical occlusion
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

### FASE 3C: Higher-resolution textures and poses
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

## FASE 4: Quality assurance

### FASE 4A: Anatomy, terrain, geometry and temporal diagnostics
- [ ] Pendiente
- [ ] Implementación entregada
- [ ] Aplicada al repositorio
- [ ] Compilación aprobada
- [ ] Pruebas automatizadas aprobadas
- [ ] Revisión visual aprobada
- [ ] Verificada

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
