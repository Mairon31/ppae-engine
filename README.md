# Procedural Pixel Art Engine (PPAE)

PPAE es un motor gráfico procedural 2D modular y de alto rendimiento escrito en TypeScript estricto, diseñado como un subsistema autónomo integrable para **PixelProject** y videojuegos 2D de mundo abierto.

## Características Principales
1. **Generación Determinista sin GPU:** Basado en hashing FNV-1a y PRNG Mulberry32; las mismas entradas y versión producen resultados repetibles, con equivalencia entre runtimes pendiente de validación específica.
2. **Granularidad Artística Flexible:** Soporta nativamente perfiles Micro Art `4×4` y `6×6` mediante una retícula visual canónica de `24×24` texels.
3. **Rigging en 8 Direcciones:** Perspectiva top-down 3/4 con preservación de asimetría anatómica real (mano derecha/izquierda independiente).
4. **Mundo, Terreno y Autotiling de 47 Bloques:** Continuidad `O(1)` entre chunks vecinos sin necesidad de carga previa en memoria.
5. **Iluminación Dinámica Cuantizada y Clima Ocluido:** Lightmap regional con dithering Bayer 4×4, oclusión por paredes y precipitación bloqueada por techos.
6. **Object Pooling:** El motor de partículas y VFX reduce asignaciones; no se afirma una tasa de FPS sin medir el renderer real.

## Desarrollo y distribución

```bash
npm install
npm run typecheck
npm test
npm run build
```

El punto de entrada es `src/index.ts`. `npm run build` genera un bundle ESM autocontenido en `dist/library/`, declaraciones TypeScript con extensiones ESM válidas en `dist/` y la demostración web en `dist/demo/`; los outputs están separados para que Vite no borre los artefactos de biblioteca. El build comprueba además el paquete con resolución TypeScript `NodeNext`. El paquete expone sus APIs desde la raíz, sin depender de rutas internas.

`PPAEPerformanceBenchmarkSuite` mide generación CPU de recursos y memoria estimada de caché. No mide FPS, frame time, draw calls ni uso de GPU; esas métricas requieren una escena activa y un renderer real.
