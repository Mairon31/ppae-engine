# PPAE Engine — Interactive Playground

GitHub Pages: https://mairon31.github.io/ppae-engine/

La rama `feat/ppae-2-art-overhaul` y el PR #2 permanecen abiertos, sin modificar `master`. El workflow `.github/workflows/deploy-pages.yml` ahora permite publicar el `dist/demo` compilado de esta rama en `github-pages`. GitHub Actions registró un despliegue exitoso el 14-10-2026 (https://github.com/Mairon31/ppae-engine/actions/runs/38613821723). Esto demuestra que el job ejecutó `actions/deploy-pages`, **no** confirma por sí solo que el navegador reciba la versión compilada correcta: existen ejecuciones paralelas de `pages build and deployment` (Pages/Jekyll). Para evitar que la publicación nativa de rama sustituya a Vite, el propietario debe configurar **Settings → Pages → Build and deployment → Source = GitHub Actions** si aún figura **Deploy from a branch**. No se ha cambiado `master` ni fusionado el PR.

Run locally: npm ci && npm run dev. This is a fully client-side Vite demo whose entrypoint is src/demo/main.ts and UI is index.html + src/demo/playground.css.

## Capabilities

The catalog exposes 17 sections: deterministic chunks/world, player, NPC professions, creature bestiary, bosses, trees, flora, geology, terrain and liquids, structures, interiors, caves, crops, equipment/HUD, VFX emitters, weather/wind, and lighting. Previews and thumbnails call the engine's real TypeScript generators, not hand-drawn mockups.

Inspector: deterministic seed, 4×4/6×6/8×8/16×16/32×32/hybrid/adaptive profiles, zoom, 8 directions, 28 character or 12 creature actions, speed, loop/pause, tree/crop/boss phases, creature age and health, scene weather/time, optional grid/pivot and buffer bounds, and live rendering telemetry. The viewer caps the redraw rate to preserve browser responsiveness. The displayed FPS is viewer FPS, **not** the engine runtime benchmark.

Character/NPC/creature selection enables the real SpritesheetCompiler PNG and JSON atlas exports for the current action in 8 directions; the toolbar PNG exports the current canvas preview.

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
