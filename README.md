# Procedural Pixel Art Engine (PPAE)

PPAE es un motor gráfico procedural 2D modular y de alto rendimiento escrito en TypeScript estricto, diseñado como un subsistema autónomo integrable para **PixelProject** y videojuegos 2D de mundo abierto.

## Características Principales
1. **Generación Determinista sin GPU:** Basado en hashing FNV-1a y PRNG Mulberry32, garantiza idéntico resultado pixel por pixel en cualquier plataforma.
2. **Granularidad Artística Flexible:** Soporta nativamente perfiles Micro Art `4×4` y `6×6` mediante una retícula visual canónica de `24×24` texels.
3. **Rigging en 8 Direcciones:** Perspectiva top-down 3/4 con preservación de asimetría anatómica real (mano derecha/izquierda independiente).
4. **Mundo, Terreno y Autotiling de 47 Bloques:** Continuidad `O(1)` entre chunks vecinos sin necesidad de carga previa en memoria.
5. **Iluminación Dinámica Cuantizada y Clima Ocluido:** Lightmap regional con dithering Bayer 4×4, oclusión por paredes y precipitación bloqueada por techos.
6. **Object Pooling de Asignación Cero:** Motor de partículas y VFX `O(1)` optimizado para 60 FPS estables.
