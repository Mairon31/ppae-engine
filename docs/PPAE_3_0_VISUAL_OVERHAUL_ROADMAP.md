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
- [ ] Pendiente
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
