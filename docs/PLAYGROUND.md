# PPAE Engine — Interactive Playground

GitHub Pages (publicación pendiente de fusión a master): https://mairon31.github.io/ppae-engine/

La rama feat/ppae-2-art-overhaul compila el Playground en Actions, pero no intenta publicar en el entorno protegido github-pages. El workflow de Pages desplegará la nueva versión tras la fusión autorizada del PR #2; no se han cambiado ni fusionado commits a master.

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
