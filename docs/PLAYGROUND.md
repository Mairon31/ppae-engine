# PPAE Engine — Interactive Playground

GitHub Pages: https://mairon31.github.io/ppae-engine/

La rama `feat/ppae-2-art-overhaul` y el PR #2 permanecen abiertos, sin modificar `master`. El workflow `.github/workflows/deploy-pages.yml` ahora permite publicar el `dist/demo` compilado de esta rama en `github-pages`. GitHub Actions registró un despliegue exitoso el 14-10-2026 (https://github.com/Mairon31/ppae-engine/actions/runs/38613821723). Esto demuestra que el job ejecutó `actions/deploy-pages`, **no** confirma por sí solo que el navegador reciba la versión compilada correcta: existen ejecuciones paralelas de `pages build and deployment` (Pages/Jekyll). Para evitar que la publicación nativa de rama sustituya a Vite, el propietario debe configurar **Settings → Pages → Build and deployment → Source = GitHub Actions** si aún figura **Deploy from a branch**. No se ha cambiado `master` ni fusionado el PR.

Run locally: npm ci && npm run dev. This is a fully client-side Vite demo whose entrypoint is src/demo/main.ts and UI is index.html + src/demo/playground.css.

## Capabilities

The current Playground exposes **30 engine-backed sections**, including an editable seeded player creator, full animation catalog, NPC/creature/plant lifecycle variations, full autotiling inputs, equipment/HUD, biome palettes, and an actual native-resolution comparator. Every gallery uses real TypeScript generators, not prerecorded image mockups. See [the complete coverage matrix](PLAYGROUND_COVERAGE_MATRIX.md) for one-to-one API mappings and remaining nonvisual subsystems.

Inspector: deterministic seed, 4×4/6×6/8×8/16×16/32×32/hybrid/adaptive profiles, zoom, 8 directions, 28 character or 12 creature actions, speed, loop/pause, tree/crop/boss phases, creature age and health, scene weather/time, optional grid/pivot and buffer bounds, and live rendering telemetry. The viewer caps the redraw rate and defers gallery thumbnails to preserve browser responsiveness. The displayed FPS is viewer FPS, **not** the engine runtime benchmark.

Character/NPC/creature selections offer real SpritesheetCompiler PNG and JSON atlas exports for the active action in 8 directions, using their active anatomical variants and player customization. The toolbar provides both raw native sprite PNG and the visually composed Canvas screenshot. JSON for other categories contains actual morphology, pivots, geometry, palettes, weather definitions or emitter presets as available.

## VFX, not audio

VFX is **visual effects**, generated with PixelParticleEngine (flames, smoke, mining sparks, falling leaves, ripples, combat particles, healing aura and others). No audio playback or SFX interface is included.

## Performance and scope

World scenes are intentionally bounded to an 8×8 chunk; gallery thumbnails use micro-4x4 generation and stage settings may render larger native resolutions. No sprites are enlarged to fake native generator detail. The world and characters are demonstration previews, not a complete playable game. Hitbox overlay is a generic buffer boundary, not actual physics collision; the atlas metadata contains creature hitboxes.

Source of truth: the existing engine APIs. npm test runs tests/ppae-playground.test.ts alongside previous suites; npm run build validates declarations, library, TypeScript and Pages demo. Automated tests do **not** replace browser QA of art parity or visual consistency.


## Build and publication verification

- `npm run build:demo` ejecuta Vite y `scripts/verify-pages-output.mjs`; falla si faltan `dist/demo/index.html`, CSS/JS compilados, assets con `/ppae-engine/assets/` o si quedan rutas de desarrollo `/src/demo/*.ts`.
- El workflow sube exclusivamente `dist/demo` con `actions/upload-pages-artifact@v4` y ejecuta `actions/deploy-pages@v4`. Su éxito no demuestra ausencia de errores HTTP, CORS o MIME en el dominio público.
- Para comprobación manual: abrir `https://mairon31.github.io/ppae-engine/`, inspeccionar **Network** y verificar que `index.html` referencia `/ppae-engine/assets/*.js` y `*.css`, ambos con HTTP 200 y tipos de contenido `text/javascript` y `text/css`. No debe aparecer un intento de importar `/src/demo/main.ts`.
- En GitHub **Settings → Pages**, seleccionar **GitHub Actions** como fuente si hay dos flujos de publicación; mantener la rama del PR abierta. Verificar también que el entorno `github-pages` permite desplegar desde `feat/ppae-2-art-overhaul`; la ejecución exitosa citada indica que lo permitió al menos para ese commit.

## Browser QA evidence

`.github/workflows/playground-browser-qa.yml` instala Chromium y abre la compilación Vite servida en `/ppae-engine/`. `scripts/playground-browser-qa.mjs` visita las 17 secciones reales, espera Canvas y miniaturas generadas, revisa errores de JavaScript/HTTP, prueba 32×32 y orientación NE, exporta PNG y atlas PNG/JSON, prueba criatura juvenil/herida SW y navegación móvil a 390 px. Los screenshots y archivos exportados se guardan como artefacto `ppae-playground-chromium-qa` durante 14 días.

La ejecución y aprobación de este workflow deben comprobarse en Actions; su definición sola no acredita navegador funcional. Las capturas requieren inspección humana para evaluar siluetas, anatomía, paletas y calidad artística. Una prueba automatizada sin errores no equivale a auditoría visual artesanal.

## Performance and UX changes (14-10-2026)

- Las tarjetas se generan con una muestra real por `requestAnimationFrame` para evitar bloquear el hilo con una página completa. Los trabajos de páginas antiguas se cancelan al navegar.
- Caché LRU de 36 miniaturas `198×112`, invalidada al cambiar la semilla y discriminada por controles que alteran la imagen. Los sprites originales de alta resolución no se mantienen en esa caché.
- El reproductor sincroniza su estado accesible cuando finaliza un clip sin bucle y permite reanudarlo desde el inicio; las emisiones de VFX respetan reloj y velocidad del reproductor.
- Navegación móvil con scrim de cierre, tecla Escape, foco visible y compactación bajo 390 px.


## Visual inspection and regression findings — 14 October 2026

**Inspected artifacts:** successful Chromium QA on commit `ee63d92677b80b555ac2048a536e6662d56a4892`,
https://github.com/Mairon31/ppae-engine/actions/runs/38616315040 (artifact `ppae-playground-chromium-qa` with 20 PNG screenshots plus real PNG/JSON exports).
The browser **ran** the engine from Vite's production output and reported no failed HTTP requests or JavaScript console errors; this does **not** independently verify the public GitHub Pages response.

Manual image inspection found and drove these real fixes:

- **World (01-world.png):** previously the fixed world chunk `(0, 0)` was nearly entirely deep water for the default seed, so trees and terrain were hidden. It now scores nearby *actual* deterministic world-field chunks by natural land/water diversity, renders only the chosen chunk and caches its generated frames. Latest capture shows grassland, beach, shoreline, props and the character.
- **Trees (06-trees.png) and farming (13-farming.png):** section defaults previously selected `seed` stage. They now open with `mature` while keeping all genuine lifecycle stages selectable in the inspector; screenshots confirm mature oak/other trees and grown crops.
- **VFX (15-particles.png and 20-mobile-vfx.png):** the initial demo spawned many engine particles into roughly the same coordinates; the apparent result was a single dot or horizontal line. Presets are still generated by `PixelParticleEngine`, but their demo emitters now use bounded, independent X/Y spatial sampling with an avalanche hash and a shorter, playback-clock-based burst interval. Latest screenshot shows a dispersed 2-D pattern instead of the collapsed stripe. The visual footprint remains intentionally small at micro resolution because presets use 1–2 native texels; enhancing individual preset art/trajectories is separate engine work.

**Automated verification:** `npm test` (28 suites/161 passing tests) and `npm run build` successful on the VFX correction commit:
https://github.com/Mairon31/ppae-engine/actions/runs/38616320269. Chromium browser QA passed all 17 categories, gallery canvases, 32×32 player, animated creature variants, PNG/JSON exports and 390px mobile viewport:
https://github.com/Mairon31/ppae-engine/actions/runs/38616315040.
The Pages deploy job succeeded for the same code commit:
https://github.com/Mairon31/ppae-engine/actions/runs/38616315820.

**Public Pages smoke verification:** `scripts/verify-live-pages.mjs` runs **after** `actions/deploy-pages`, retries deployment propagation, verifies the live HTML identity and base path, and fetches bundled JS/CSS requiring HTTP 200 and correct Content-Type. On commit `1093512bd705f384a8a7bef7108a70d5eeb40bfd`, GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38616837141 reported `PUBLIC PAGES VERIFIED`: `/ppae-engine/assets/index-Bpk-q1h9.js` served as `application/javascript`, `/ppae-engine/assets/index-CldpZVnY.css` served as `text/css`, and the public HTML was confirmed as Playground 2.0. This checks the live endpoint **at deploy time**; a later Jekyll job can still replace it until the owner changes Pages Source to GitHub Actions.

**Not yet certified:** persistent absence of Jekyll re-publishing from the competing native Pages workflow; comprehensive art-direction review of *every* age/health/action/profile/seed combination; device-specific GPU frame pacing and performance profiling at high resolutions; fine artistic polish of short-lived VFX. A green CI or browser smoke run is not proof of those requirements.


## Tree canopy clipping regression — 14 October 2026

**Root cause verified in engine source:** the morphology resolver allocated exactly the archetype's raw width/height before building branch-attached foliage. `TreeCanopyFoliageRasterizer.renderBillowingClusterMass` then additionally truncated the lobe union at `cx ± rx + 3`, producing flat vertical canopy walls on oak, pine and birch both in full preview and thumbnails.

**Implemented at engine level** (not CSS/canvas clipping): `TreeMorphologyResolver` now fits the native image bounds to the actual branches, roots, leaf masses, outlines, contact shadow and requested wind before returning the descriptor. Padding is module-aligned; every skeleton node/segment/root/foliage mass and ground pivot is translated by exactly the same amount. Original species metrics remain based on unpadded morphology. `NatureGenerator` forwards the requested wind shift to the fitting pass. `TreeCanopyFoliageRasterizer` traverses the full lobe envelope rather than an inner square, preserving organic edges.

**Regression tests:** `tests/ppae-tree-clipping-regression.test.ts` covers all 12 families at 4/6/8/16/32 resolutions, additional lifecycle stages, strong wind, stable anchors/topology and the actual `PixelProject-2026` oak/pine/birch seeds. The assertions sample the *engine's native buffer edges* (not a scaled HTML screenshot) to fail when a generated sprite touches a clipping boundary. Existing tree morphology test now compares natural species aspect ratios rather than artificial padded canvas height.

**Evidence:** CI `npm test` and `npm run build` PASS for code commit `ff7b6a08df93d80b824c9cb8e261ca26b1e909ed` in https://github.com/Mairon31/ppae-engine/actions/runs/38619162356; Chromium smoke QA PASS across 17 sections in https://github.com/Mairon31/ppae-engine/actions/runs/38619154215. Inspectable screenshot: QA artifact `ppae-playground-chromium-qa`, file `06-trees.png`. The oak now shows continuous lobed canopy without hard-cut rectangular edges; full viewport render reports native `84×78` texels at micro-6×6, and cards use the same engine path.

**Scope:** the sprite generator clipping issue is fixed. Adjacent-chunk streaming/prop-overflow placement and exhaustive artistic inspection over all possible seeds remain separate rendering concerns; no change to master or PR merge was performed.


## Expansión integral del laboratorio (14-10-2026)

La matriz de [30 categorías](PLAYGROUND_COVERAGE_MATRIX.md) documenta la correspondencia estricta entre cada galería y su API. Se incorporó `src/demo/avatar-lab.ts` con 32 identificadores reproducibles por semilla, aleatorización real, edición de rasgos faciales, proporciones, vestuario, equipo, colores y efectos de estado. El personaje editado se utiliza también en la escena del mundo y en sus exportaciones.

El explorador ofrece 28 acciones de personaje, 64 identidades de NPC parametrizadas, 144 variaciones nombradas de criatura, 144 combinaciones de ciclo arbóreo, 20 etapas de cultivos, todas las máscaras brutas de autotiling, 16 texturas por material, seis materiales de equipamiento y todas las paletas de `PaletteManager` y perfiles de resolución concretos. Las miniaturas siguen usando el pipeline del motor y caché acotada.

La demostración permite inspeccionar integridad, acción y fases de muerte de jefes, ocultar tejados y modificar puertas/ventanas, parametrizar cuevas, escala de criaturas y barras de HUD; no simula navegación de juego. Se amplió `SpritesheetCompiler` para conservar el tamaño nativo y variaciones anatómicas de criaturas y efectos visuales del avatar.

**Evidencia inicial de la ampliación:** `npm test` y `npm run build` PASS en https://github.com/Mairon31/ppae-engine/actions/runs/38626871641. Chromium navegó las 28 categorías de esa versión y verificó edición/reroll, búsqueda, exportación y móvil: https://github.com/Mairon31/ppae-engine/actions/runs/38626866399. La versión de 30 secciones requiere confirmación en su propio HEAD, no hereda automáticamente ese estado de verificación.

La cobertura de biblioteca no equivale a una galería para todas las APIs internas (caché, benchmark, LOD, Phaser, portales). Consulte la matriz para esos límites y no represente funciones que no se han probado como completamente demostradas.

## Phase 9 Architecture and interiors

The `#structures` lab now exposes ten real exterior definitions, including a windmill with a tapered stone tower and lattice sails, staggered masonry ruins, half-timbered facades, multi-style roofs, a barn and well. Its roof-visibility, open-door and lit-window controls operate on engine-generated buffers and preserve collision metadata in JSON exports.

The `#interiors` lab exposes three real generated floorplans: cottage, blacksmith workshop and alchemy laboratory. These include furniture geometry, light nodes, collision rectangles and walkability-grid exports. The `#caves` lab renders stalactites, stalagmites and seeded rock columns with logical collisions; crystals and lava remain available. All new catalog labels are localized in English, Spanish and Brazilian Portuguese.

Screenshot/metadata evidence is available in the `ppae-playground-chromium-qa` artifact for https://github.com/Mairon31/ppae-engine/actions/runs/38643851640. The sample screenshots provide targeted visual verification, not a guarantee of art quality for every profile and seed.

## Phase 10 Weather, lighting and VFX

The `#lighting` laboratory renders a procedural oak and a real shadow from `PixelPerfectLightingEngine.renderDirectionalCastShadows` at seven day phases. Dawn casts west, dusk casts east, noon is shorter, and the preview exports the resolved `solarShadowVector` in JSON; the world scene also renders shadows from actual chunk props before compositing their sprite buffers.

The `#weather` laboratory renders `WeatherAndWindSystem` overlays for all 11 weather conditions. Thunderstorms draw seeded branched lightning; fog forms independently drifting, stratified near/far banks with quantized edge dithering. The `#particles` laboratory exposes all 16 real pooled emitter presets, including poison rings, frost cross-sparks and directional magma streaks.

All added catalog labels and section descriptions have English/Spanish/Brazilian Portuguese entries. Existing seed, profile, native PNG and metadata JSON workflows are retained. Browser screenshots `43-phase10-dawn-shadow.png` through `48-phase10-poison-rings.png`, with JSON metadata and all 30 labs, can be found in the `ppae-playground-chromium-qa` artifact from https://github.com/Mairon31/ppae-engine/actions/runs/38645914913.

The visual samples and automated QA demonstrate those selected settings only; full device/resolution/seed combinations and calibrated scene-level performance remain future work.

## Phase 12 — production scene and live visual quality inspector

The Playground now has **32 active, generator-backed labs**. Two new Art Diagnostics labs appear after the original Resolution Comparison: `#integrated-scene` and `#quality-inspector`. Both use the existing responsive, multilingual routing and nearest-neighbor renderer.

**Production Scene Inspector** composes `PPAEInteractiveShowcaseController.renderWorldSceneFrame` using real terrain/chunks, foot-Y-sorted world props, entities, natural assets, structures, solar lighting, weather, VFX and quality analysis. Select world, boss, interior or cave previews. Global controls manage world seed, native/adaptive profile, hero action/direction, weather and zoom. New options select solar hour (0–24), NPC, creature, boss, structure, VFX, doors and roof cutaway. Live metrics include resolved resolution, cast shadows, precipitation/shelter, lightning, particles, 9-dimension detail summary and hero/tree/geode scores. Native PNG and JSON are exported from real buffers and metadata.

**Art Quality Inspector** produces five real native profile variants (4×4, 6×6, 8×8, 16×16, 32×32) for hero, oak and geode, displaying each quality score and defects. The Golden Seed Registry view lists all ten locked references with hashes. JSON export records profile results and RGBA fingerprints.

All new text is English-first with Spanish and Brazilian Portuguese translations; the original 30 labs and route IDs remain unchanged. The Chromium QA script captures screens `49-phase12-production-scene.png` through `53-phase12-mobile-quality-pt.png` with the JSON exports when that workflow succeeds.
