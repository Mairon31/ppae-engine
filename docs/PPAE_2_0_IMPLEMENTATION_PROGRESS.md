# PPAE Engine 2.0 — Implementation Progress

Repositorio: `Mairon31/ppae-engine`  
Rama única: `feat/ppae-2-art-overhaul`  
Objetivo: arquitectura y rasterizado morfológico para pixel art procedural

## Matriz de fases

| Fase | Estado | Resumen |
| --- | --- | --- |
| 1A — Procedural Tree Morphology Architecture | VERIFIED | Contratos, 12 familias, arquetipos, esqueleto y métricas |
| 1B — Tree Skeleton Rasterization | VERIFIED | Rasterización de tronco, bifurcaciones, raíces y ramas curvas |
| 1C — Advanced Canopy / Foliage | VERIFIED | Follaje avanzado y diferenciación por especie |
| 1D — Production Pipeline and World Ecology | VERIFIED | Árboles morfológicos reales en generadores y distribución ecológica |
| 1E — Spatial Diversity and Silhouette Metrics | VERIFIED | Evitar clones vecinos y métricas de silueta sobre píxeles |
| 2A — Geological Morphology Architecture | VERIFIED | 17 formaciones, polígonos, facetas, fracturas e inclusiones |
| 2B — Geological Rasterization and World Integration | VERIFIED | Rasterización de rocas e integración al mundo |
| 3A — Flora Morphology and Ecological Patches | VERIFIED | 17 familias, tallos, hojas, flores, hongos y selección ecológica |
| 3B — Flora Rasterizer and World Integration | VERIFIED | Sustitución de sprites antiguos de vegetación y distribución real |
| 4A — Autotiling 47-State & Coast Regression | VERIFIED | Corrección de inundación oscura, esquinas euclidianas, 16 variantes y costas húmedas |
| 4B — Road Junctions and Animated Shorelines | VERIFIED | Caminos direccionales, animación de orillas y regresión de bifurcaciones |
| 5A — Advanced Character Anatomy Engine | VERIFIED | 16 articulaciones, cabello en capas, cráneo/mandíbula, rostro, torso y equipo por dirección |
| 5B — Character Customization and NPC Anatomy QA | VERIFIED | Atuendos, mochilas, complexión/edad y control de continuidad en 8 direcciones |
| 6A — Advanced Animation System: 28 Actions | VERIFIED | Clips, cinemática contextual de 28 acciones, 8 direcciones y eventos de fotograma |
| 6B — Species Animation Capabilities & Creature Atlas | VERIFIED | 12 acciones, seis familias de rigs y atlas direccionales con fallbacks anatómicos |
| 7A — Multi-Resolution Profiles & Adaptive Detail Budgets | VERIFIED | 4, 6, 8, 16, 32 texels/módulo, nueve dimensiones y LOD adaptativo |
| 7B — Native Multi-Resolution Detail Synthesis | VERIFIED | Escalado de esqueleto proporcional, rostro HD, pliegues, sublóbulos foliares y facetas minerales |
| 8A — Advanced Creatures & Bosses | VERIFIED | Dieciséis especies, diez familias, escala multirresolución, variantes de edad/salud y segundo jefe con anatomía arbórea |
| 9 — Procedural Architecture & Interiors | VERIFIED | 10 estructuras, fachadas/tejados diferenciados, 3 interiores, cuevas con pilares, QA Chromium específico; revisión artística exhaustiva pendiente |
| 10 — Weather, Lighting & VFX Overhaul | VERIFIED | Sombras solares direccionales, relámpagos ramificados, bancos de niebla orgánicos, 16 emisores y cuatro formas de partícula; QA de navegador dirigida |
| 11 — Procedural Art Quality Evaluator | VERIFIED | 10 referencias con huellas RGBA fijas, QA de siluetas, luz/materiales, ruido, paletas y costuras; 200 tests y Browser QA en el commit de código |

## Fase 1A — 14 de octubre de 2026

- **Base de Gemini:** `217f76b393cda5b9755119a67f8b56d854df4520`
- **HEAD original de master:** `2ccc9b14c10cca465256a85f01056ed2c90c834b`
- **Commit real aplicado:** `ccfb6449c023ef24413276ce974a7a4e73891b99`.
- **Operaciones:** MODIFY `src/core/contracts.ts`, MODIFY `src/vegetation/nature-generator.ts`, MODIFY `src/index.ts`; ADD `src/vegetation/tree-morphology.ts`, ADD `tests/ppae-tree-morphology-1a.test.ts`, ADD `.github/workflows/ppae-2-ci.yml`.
- **Entregado:** 12 familias botánicas, arquetipos por especie, 12 etapas de vida, nodos y segmentos con ramificación de dos órdenes, raíces, masas de follaje, métricas y disimilitud determinista.
- **Integración adicional:** el tipo ampliado `TreeSpeciesId` exigía completar las siete familias ausentes en el catálogo del generador antiguo. Se conserva el comportamiento de las cinco familias originales.
- **Correcciones durante integración:** las ramas primarias se distribuyen a ambos lados del tronco y se generan ramas secundarias reales; el rasterizador legado no se sustituye en esta fase.
- **Pruebas solicitadas:** `npm test`, `npm run build`.
- **Verificación técnica:** VERIFIED. GitHub Actions `PPAE 2.0 validation` ejecutó con éxito `npm test` y `npm run build` en el commit principal. Evidencia: https://github.com/Mairon31/ppae-engine/actions/runs/38553570173
- **Validación visual:** PENDING. La fase 1A no conecta todavía el descriptor con el rasterizador visible.
- **Problemas pendientes:** validación visual de siluetas mediante capturas y conexión del rasterizador a la salida de árboles (Fase 1C).
- **Próxima fase:** 1B — Algoritmo de Rasterización de Esqueletos de Troncos, Bifurcaciones, Raíces y Ramas Curvas.

## Fase 1B — 14 de octubre de 2026

- **Base indicada por Gemini:** `217f76b393cda5b9755119a67f8b56d854df4520`, con los cambios de Fase 1A supuestos. Ese commit original no contiene 1A; se integró realmente sobre `b3343b1f07f78f6c108cc42af46ae4eee9453c9f`.
- **Commit de implementación:** `aabccd4f671082d8ac45188e598206a84eadd9b6`.
- **Archivos:** MODIFY `src/vegetation/tree-morphology.ts`, MODIFY `src/index.ts`, ADD `src/vegetation/tree-skeleton-rasterizer.ts`, ADD `tests/ppae-tree-skeleton-1b.test.ts`, MODIFY este documento.
- **Entregado:** fustes gemelos conectados por horquilla real, cañas múltiples con nodos de base propios, masa foliar secundaria anclada al esqueleto preexistente, rasterizado Bézier con taper, sombreado cilíndrico, gramáticas de corteza por familia y etapa, raíces zanco y superficiales, exposición de madera muerta, capas de profundidad y viento discreto.
- **Integración:** el resolver 1A ya contenía ramas secundarias. Se conservaron y no se duplicaron; el diff de Gemini se adaptó semánticamente.
- **Pruebas nuevas:** ocho comprobaciones Vitest para determinismo, morfología, corteza, capas, viento, conectividad, raíces y estados especiales.
- **Verificación técnica:** VERIFIED. GitHub Actions: https://github.com/Mairon31/ppae-engine/actions/runs/38587161738 — 11 suites/56 tests aprobados (8 nuevos de 1B), `npm run build` correcto, declaraciones TypeScript, build de biblioteca y build de demo correctos.
- **Verificación visual:** pendiente de captura y revisión de capas: el rasterizador es una API independiente. La integración en los sprites finales y las copas se reserva a Fase 1C.
- **Estado actual:** VERIFIED (implementación y CI). Inspección visual de sprites compuestos pendiente para Fase 1C.
- **Próxima fase:** FASE 1C — Generación Avanzada de Copas, Masas de Follaje Asimétricas e Integración Multicapa con el Esqueleto.

## Fase 1C — 14 de octubre de 2026

- **Base de Gemini:** `217f76b393cda5b9755119a67f8b56d854df4520` con 1A y 1B supuestamente integrados. La integración real se hace sobre HEAD `2acc48be3c3200dfbe4c3bb0184e59823cfbbbde`, conservando cambios de 1A y 1B.
- **Commit de implementación:** `61c5ae800e88a1ec98db4de5ac12f817574747a1`.
- **Archivos del lote:** ADD `src/vegetation/tree-foliage-rasterizer.ts`, MODIFY `src/index.ts`, ADD `tests/ppae-tree-foliage-1c.test.ts`, MODIFY este seguimiento.
- **Características:** billowing multilobular, estratos acampanados, cortinas de sauce, penachos porosos de abedul/espino, hojas de bambú y frondas de palmera; estaciones normal/autumn/snowy/blossom; capas de follaje back/mid/front intercaladas con las tres capas del esqueleto; pivote y anclajes normalizados.
- **Ajustes de integración:** RNG independiente por masa para determinismo ante cambios de orden; dimensiones de capas validadas; el cálculo de madera visible respeta que exposedTips se compone después de midFoliage; no se ha cambiado el rasterizador legado.
- **Pruebas ejecutadas:** `npm test` (12 suites, 63 pruebas superadas; 7 tests nuevos 1C) y `npm run build` (TypeScript, declaraciones, paquete de librería y demo) superados en https://github.com/Mairon31/ppae-engine/actions/runs/38588085842.
- **Validación visual:** pendiente de inspección directa de composiciones reales y comparativa por especie. Los nuevos renderizadores son API separadas; no cambian automáticamente la salida de `NatureGenerator` hasta Fase 1D.
- **Estado actual:** VERIFIED (implementación y CI). Evaluación visual manual de sprites completos pendiente de 1D.
- **Siguiente fase:** 1D — Integración de especies, edades y estados en NatureGenerator, ProceduralGrammarExecutor y DeterministicWorldField.

## Fase 1D — 14 de octubre de 2026

- **Base citada por Gemini:** `217f76b393cda5b9755119a67f8b56d854df4520` con fases 1A–1C supuestas. **Base real de integración:** `e7427b23838497019e48df523e60a8728042dd51`.
- **Commit real:** `779e2c61a993f6c451cbdefcaf5c1be5867d608e`.
- **Archivos:** MODIFY `src/vegetation/nature-generator.ts`, MODIFY `src/art-generator/grammars.ts`, MODIFY `src/terrain/world-field.ts`, ADD `tests/ppae-tree-lifecycle-1d.test.ts`, MODIFY este documento.
- **NatureGenerator:** reemplaza íntegramente los antiguos troncos rectos y copas repetitivas por la resolución morfológica (1A), el rasterizador leñoso (1B) y la composición foliar (1C); catálogo sincronizado a 12 familias, 12 etapas, opciones retrocompatibles de arquetipo/estación/viento y metadatos morphology/anchors.
- **Grammar:** genera también robles y pinos de catálogo con la tubería 1A–1C, adapta por vecino más cercano y remapea todos los colores a las rampas de `PaletteDefinition` para conservar el presupuesto, el tamaño módulo×definición y los anclajes; respeta `damaged`, `snowy` y `wind_sway`.
- **Ecología del mundo:** rollos separados de aparición, familia y edad; selección contextual mediante humedad, temperatura, bioma y proximidad al agua, con 12 familias elegibles y edades/estados variados, manteniendo determinismo espacial por coordenadas.
- **Pruebas:** suite de 1D para doce especies, doce etapas, tamaños y paletas de catálogo, diversidad de spawn, opciones y determinismo del mundo. GitHub Actions ejecutó `npm test`: **13 suites, 69 pruebas aprobadas** (6 nuevas 1D), y `npm run build`: biblioteca, declaraciones TypeScript, typecheck de paquete y demo correctos. Evidencia: https://github.com/Mairon31/ppae-engine/actions/runs/38589222312.
- **Estado:** VERIFIED para implementación y CI (sin validación artística mediante capturas).
- **Validación artística:** requiere inspección visual de los sprites renderizados en la demostración. Los tests de píxeles no certifican una paridad artística exacta.
- **Siguiente fase:** 1E — TreeDiversityController, métricas de silueta reales y cierre de Fase 1.

## Fase 1E — 14 de octubre de 2026

- **Base citada por Gemini:** `217f76b393cda5b9755119a67f8b56d854df4520` con fases 1A–1D aplicadas. **Base real de integración:** `0904b7a00ce2f2ff23187a50185602b2372b6ec1`.
- **Commit de implementación:** `2d96880ed2b35bca5ec47076238440a7a7733f8e`.
- **Archivos:** ADD `src/vegetation/tree-diversity-controller.ts` y `tests/ppae-tree-diversity-1e.test.ts`; MODIFY `src/core/contracts.ts`, `src/terrain/world-field.ts`, `src/terrain/chunk-renderer.ts`, `src/index.ts` y este documento.
- **Funcionalidad:** mediciones reales RGBA de bounding box, perímetro, rugosidad, centro de masa, simetría y perfiles en 8 bandas; distancias raster normalizadas; cohortes de selección determinista con múltiples candidatos; variaciones espaciales O(1) y propagación del arquetipo al renderizador de chunks.
- **Integración:** el muestreo de mundo y el renderer preservan determinismo entre chunks. La selección usa coloración modular con fase global por familia, eliminando la repetición cardinal inmediata del identificador **cuando la familia tiene dos o más arquetipos**. Familias con un solo arquetipo no pueden alternar IDs; usan semillas únicas por coordenada.
- **Correcciones respecto al lote Gemini:** la fórmula original incorporaba ruido hash independiente por tile y no podía garantizar rotación local; se cambió a patrón modular coherente. El evaluador no mezcla similitud estructural estimada con distancia real de píxeles y añade rugosidad y simetría a esa distancia. La cohorte compara con **todos** sus árboles ya aceptados, no sólo el anterior; no garantiza superar cualquier umbral geométrico con un número finito de intentos.
- **Verificación técnica:** VERIFIED. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38590376150: `npm test` (14 suites, 77 tests, 8 nuevos 1E) y `npm run build` (biblioteca, declaraciones de tipos y demo) completaron correctamente.
- **Verificación visual:** PENDING. No se revisaron capturas reales del mapa y galerías en esta ejecución; las métricas de silueta y las pruebas no certifican similitud artística exacta.
- **Siguiente fase:** Fase 2A — Arquitectura Geológica Poligonal, Facetas, Fracturas y Catálogo de Rocas y Minerales.

## Fase 2A — 14 de octubre de 2026

- **Base entregada por Gemini:** `217f76b393cda5b9755119a67f8b56d854df4520` con fases 1A–1E supuestas. **Base real inspeccionada para este lote:** `e1ba92881fe350c6acf17de4629f4f31c1797c4a`.
- **Commit de implementación:** `71773c4e6df7656beabadf403e3c0d5735fc9a6e`.
- **Operaciones:** MODIFY `src/core/contracts.ts` y `src/index.ts`; ADD `src/vegetation/geology-morphology.ts` y `tests/ppae-geology-morphology-2a.test.ts`; MODIFY este documento.
- **Alcance:** siete identificadores geológicos originales conservados y diez añadidos; catálogo morfológico de 17 formaciones con litologías, geometrías, paletas y rangos estructurales definidos. Resolver determinista con composición multifragmento, polígonos irregulares, facetas triangulares con normal 3D e iluminación por cara, grietas, sedimentos, musgo e inclusiones de mineral o geoda.
- **Integración:** contratos/exportaciones de la API ampliados sin alterar generadores, sprites ni rutas heredadas. La rasterización de los polígonos y la sustitución de las rocas elípticas del juego corresponde estrictamente a 2B.
- **Pruebas ejecutadas:** `npm test` (15 suites, 83 tests aprobados; 6 nuevos de Fase 2A) y `npm run build` (biblioteca, declaraciones TypeScript, typecheck de paquete y demo) correctos. Evidencia: https://github.com/Mairon31/ppae-engine/actions/runs/38591408285.
- **Estado técnico:** VERIFIED (código publicado y CI correcto).
- **Validación visual:** pendiente y no aplicable al resolver de datos por sí solo; las capturas del nuevo arte geológico deberán revisarse tras 2B.
- **Siguiente fase:** Fase 2B — GeologicalFormationRasterizer e integración en NatureGenerator, ProceduralGrammarExecutor y DeterministicWorldField.

## Fase 2B — 14 de octubre de 2026

- **Base citada por Gemini:** `217f76b393cda5b9755119a67f8b56d854df4520` con todas las subfases anteriores supuestamente incorporadas. **HEAD real antes del lote:** `4c1def932095f7dc36f61082771fb82c54197770`.
- **Commit de implementación:** `7de10a8375aefed2fe66b8af67a102f33f7f499a`.
- **Archivos:** ADD `src/vegetation/geology-rasterizer.ts`; MODIFY `src/vegetation/nature-generator.ts`, `src/art-generator/grammars.ts`, `src/terrain/world-field.ts`, `src/index.ts`; ADD `tests/ppae-geology-rasterizer-2b.test.ts`; MODIFY este documento.
- **Rasterizador:** triángulos por baricéntricas sin antialias, geometría facetada con iluminación 3D en bandas, aristas, grietas y vetas, estratos, musgo/nieve y formaciones de cristal. Conteo de minerales únicos pintados en pantalla.
- **Pipeline:** `NatureGenerator.generateGeologicalResource` retorna polígonos de 2A/2B con `geology` y `anchors` conservando la API anterior. `ProceduralGrammarExecutor.generateMineralRock` reutiliza el rasterizador, adapta por vecino más cercano a las dimensiones exactas y cuantiza colores al presupuesto real de `PaletteDefinition`.
- **Ecología:** `DeterministicWorldField` distribuye 17 recursos posibles según material, bioma, humedad y coordenadas; sin dependencia del orden de renderizado de chunks. Las rocas aparecerán en zonas rocosas, playas, desiertos, praderas, bosques y tundra según los tiles disponibles.
- **Compatibilidad:** no modifica `master` ni `Mairon31/pixelproject`; los siete identificadores geológicos anteriores siguen soportados.
- **Pruebas y build:** VERIFIED. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38592321445: `npm test` con **16 suites / 89 pruebas aprobadas** (6 nuevas 2B), y `npm run build` correcto (biblioteca, declaraciones TypeScript, typecheck y demo).
- **Estado:** VERIFIED para código, tests y build; revisión visual de sprites reales pendiente.
- **Validación visual:** requiere revisar imágenes reales del mapa y galerías; pruebas de píxeles no garantizan por sí solas calidad artística.
- **Siguiente fase:** 3A — Arquitectura Botánica de Microvegetación, Césped No Repetitivo, Anatomía Floral y Agrupamiento Ecológico.

## Fase 3A — 14 de octubre de 2026

- **Base provista por Gemini:** `217f76b393cda5b9755119a67f8b56d854df4520` con fases anteriores asumidas; **base real de trabajo:** `24d0a96801f25552e0af14fe4edf4ea8e5466b9a`, rama `feat/ppae-2-art-overhaul`, PR #2.
- **Commit real de implementación:** `9cfe99c5b189b75106599095917b2cb8e620ce5a`.
- **Archivos:** MODIFY `src/core/contracts.ts` (17 tipos `SecondaryFloraKind` y contratos completos); ADD `src/vegetation/flora-morphology.ts` (catálogo y resolver); MODIFY `src/index.ts` (API); ADD `tests/ppae-flora-morphology-3a.test.ts`; UPDATE este progreso.
- **Catálogo y morfología:** seis tipos heredados intactos y once añadidos. Hábitos botánicos diferenciados: gramíneas bajas/altas, hierbas, espinos, arbustos florales, helechos, tapetes de musgo, hongos, juncos, plantas acuáticas, enredaderas, cactus y hojas anchas tropicales. Geometría determinista de tallos Bézier, hojas adheridas a curvas, flores con pétalos y discos centrales, cápsulas micológicas y medidas estructurales.
- **Ecología:** método `selectEcologicalFloraKind` con parches deterministas de 3×3 tiles, criterios de humedad/temperatura/bioma/material/orillas y variantes hash por coordenada, independientes del orden de chunks. Incluye selección potencial de `water_lily_pad` en aguas someras para futura integración en 3B.
- **Compatibilidad:** no se altera `NatureGenerator.generateSecondaryFlora`, `ProceduralGrammarExecutor.generateBushFlora` ni la distribución de flora actual en `DeterministicWorldField`: la arquitectura 3A requiere conexión de rasterizador y spawns en 3B. Los tests de 3A comprueban descriptores, no calidad visual de sprites.
- **Pruebas:** VERIFIED, GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38593279027: `npm test` con **17 suites y 95 pruebas aprobadas** (6 nuevas de 3A); `npm run build` con generación correcta de biblioteca, declaraciones TypeScript, typecheck del paquete y demo.
- **Siguiente fase:** 3B — FloraBotanicalRasterizer e Integración Ecológica en el Mundo.

## Fase 3B — 14 de octubre de 2026

- **Base citada por Gemini:** `217f76b393cda5b9755119a67f8b56d854df4520` con 1A–3A asumidas; **HEAD real utilizado:** `61fc6628394fd703d824fe1d0046f00609aedb50`.
- **Commits:** implementación `d9dfbfb225c632e3bb10666fe059c68959f9c63c`; corrección TypeScript `ada5ea393dcdb6a989986a09f98345f202615873`.
- **Archivos:** ADD `src/vegetation/flora-rasterizer.ts`, ADD `tests/ppae-flora-rasterizer-3b.test.ts`; MODIFY `src/vegetation/nature-generator.ts`, `src/art-generator/grammars.ts`, `src/terrain/world-field.ts`, `src/index.ts` y este archivo.
- **Rasterización:** `FloraBotanicalRasterizer` procesa los descriptores de 3A con tallos Bézier, espinas, hojas diferenciadas, inflorescencias, manto de musgo, nenúfares, cactus y sombreros de hongos. Cuenta píxeles florales únicos pintados y mantiene `base_pivot` inmóvil al desplazar las partes superiores con viento.
- **Integración:** `NatureGenerator.generateSecondaryFlora` sustituye el generador anterior de cinco líneas, conserva el contrato de sprite y añade `flora` y `anchors`. `ProceduralGrammarExecutor.generateBushFlora` añade ramas divergentes, cojines asimétricos y bayas con colores solo de las rampas del bioma. `DeterministicWorldField` emplea parches de flora 3A, respetando prioridades de rocas/árboles y semillas independientes del orden de chunks.
- **Pruebas:** VERIFIED. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38594307270 — `npm test`: **18 suites, 102 pruebas aprobadas** (siete nuevas 3B); `npm run build`: biblioteca, generación de declaraciones y chequeo TypeScript, demo, todos correctos. Primera ejecución falló únicamente por import `hexToRgba` no utilizado; subsanado en el commit de corrección citado.
- **Cobertura ambiental:** nuevos recursos botánicos en tierra de pradera, bosque, costas, desierto y tundra. La selección de nenúfares en aguas someras queda implementada en el resolver 3A, pero el muestreo de props actual descarta líquidos; para mostrar nenúfares en superficies de agua hará falta un pase de props acuáticos específico.
- **Validación visual:** pendiente de inspeccionar capturas reales en la demo y comprobar riqueza de siluetas y composición por bioma. Los tests no certifican fidelidad artística.
- **Siguiente fase:** 4A — Terrain Rendering & Autotiling Overhaul; diagnóstico de cuadrados oscuros y transiciones 47-estados.

## Fase 4A — 14 de octubre de 2026

- **Base citada en el lote:** `217f76b393cda5b9755119a67f8b56d854df4520`. **HEAD real utilizado:** `6ef67b8e57fcfd9f10eb5a2e9e8af85e3e89db18`, rama `feat/ppae-2-art-overhaul`, PR #2. **Commit real 4A:** `107514bc4f8c2e649d8fe35619c8c2bbd0a84f08`.
- **Estado:** VERIFIED por suite y build en GitHub Actions; auditoría visual pendiente.
- **Archivos:** MODIFY `src/core/contracts.ts`, `src/terrain/autotiler.ts`, `src/terrain/chunk-renderer.ts`; ADD `tests/ppae-terrain-autotiler-4a.test.ts`; UPDATE este progreso. `DeterministicWorldField` no se modifica y conserva máscaras y topología lógica.
- **Corrección principal:** elimina por completo la comprobación de vecinos sobre el `PixelBuffer` de salida mientras se modifica; calcula una matriz `Uint8Array` de exposición **inmutable** con arcos euclidianos y ondulación de frontera, y después pinta los colores en una segunda pasada independiente. No puede existir inundación en cascada causada por píxeles de borde previamente pintados.
- **Máscaras:** enumeración, normalización y clasificación semántica de las 47 máscaras válidas con Diagonal Corner Gating; el render acepta también las 209 máscaras crudas no canónicas sin corromperlas.
- **Costas:** `sand_beach` sobre líquidos usa arena húmeda `#9c6d2e` y `#b5833d` junto con espuma `#bae6fd` y evita `transitionBorderHex` marrón. Los bordes terrestres quedan limitados a una banda local, evitando superficies teñidas enteras.
- **Variación:** se incorporan 16 variantes para `ChunkWorldRenderer`, ondas tonales deterministas, micro-clusters de pasto, arena, escarcha y roca, y ajuste de bordes opuestos para repetir una variante sin discontinuidades.
- **Pruebas aprobadas:** GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38595247498: `npm test` **19 suites / 108 pruebas aprobadas**, incluidas seis pruebas 4A (256→47 máscaras, ausencia de inundación en las 47 máscaras para 4×4 y 6×6, esquinas internas/externas, 16 variantes, igualdad de bordes opuestos y bordes localizados). `npm run build` completo: TypeScript, declaraciones, biblioteca y demo correctos.
- **Limitaciones:** la paridad visual con capturas debe revisarse en una demo/screenshot real; las pruebas de código no demuestran ausencia absoluta de costuras al alternar variantes distintas ni resuelven la animación de costas desde el renderer líquido (etapa 4B).
- **Próximo bloque:** 4B — Renderizador Direccional de Caminos, Orillas Líquidas y Road Junction Regression.

## Fase 4B — 14 de octubre de 2026

- **Referencia original Gemini:** commit `217f76b393cda5b9755119a67f8b56d854df4520`. **HEAD real previo:** `9c0523cb69b3f2575ef063be835be15f440cfc1b`, rama `feat/ppae-2-art-overhaul` y PR #2.
- **Implementación:** nuevo `src/terrain/road-renderer.ts` (`DirectionalRoadRenderer`), `src/terrain/world-field.ts`, `src/terrain/autotiler.ts`, `src/terrain/liquid-renderer.ts`, `src/index.ts`, `tests/ppae-road-shore-4b.test.ts`.
- **Conectividad vial:** `dirt_soil` conecta exclusivamente con otros tiles `dirt_soil`; selecciona el sustrato terrestre predominante por cardinales y diagonales, sin depender de `layerPriority` ni del orden de carga. Resto de materiales conserva su cómputo previo de máscaras.
- **Caminos:** geometría de distancia euclidiana al eje, rectas, codos en arco, finales redondeados, bifurcaciones y cruces; erosión local, dos roderas y guijarros. Los píxeles del camino a lo largo del borde compartido son independientes de la variante. En tiles de hierba contiguos no se dibuja una segunda zanja.
- **Agua:** normaliza las máscaras de 47 estados y utiliza distancia euclidiana a costas cardinales y esquinas cóncavas/convexas para espuma con pulso animado. Se mantiene el bucle temporal de fotogramas.
- **Verificación requerida:** `npm test` y `npm run build`; siete regresiones añadidas de caminos, sustrato, esquinas, looping y determinismo entre chunks.
- **Visual:** los umbrales de pixel tests no sustituyen la auditoría de capturas del mundo y de las uniones entre materiales con distintas variantes. Mantener pendientes las inspecciones visuales antes de asegurar paridad estética.
- **Estado:** VERIFIED técnicamente; commit `d4dadc56b1bd9f0b4edceaea0480efd2187d99ef`. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38596286956: `npm test` **20 suites / 115 pruebas aprobadas** (7 nuevas 4B), `npm run build` correcto con declaraciones, TypeScript, biblioteca y demo.
- **Siguiente fase:** 5A — Advanced Character Anatomy Engine.

## Fase 5A — 14 de octubre de 2026

- **Referencia del lote:** base antigua `217f76b393cda5b9755119a67f8b56d854df4520`; **HEAD real inspeccionado:** `d57ad40da79e3f7e8d9785df2937a64ac13ea3df` de `feat/ppae-2-art-overhaul`, PR #2.
- **Estado:** VERIFIED técnicamente. Commit de implementación `934d5fb46e610d8bd9fb717d579c62a8a453cbe8`. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38599405438: `npm test` **21 suites / 122 pruebas aprobadas** (siete nuevas 5A); `npm run build` completo (TypeScript, declaraciones, biblioteca y demo). Auditoría visual de la rosa de ocho direcciones aún pendiente.
- **Archivos:** MODIFY `src/core/contracts.ts`, `src/entities/character-rig.ts`, `src/entities/character-generator.ts`; ADD `tests/ppae-character-anatomy-5a.test.ts`; UPDATE este documento.
- **Rig:** `AnatomicalJointId` aumenta retrocompatiblemente de 11 a **16**: `neck`, `elbow_r`, `elbow_l`, `knee_r`, `knee_l`. `evaluatePose` calcula codos/rodillas con flexión y compresión de perfil lateral sin perder profundidad derecha/izquierda ni anclajes de equipo. Todas las siete acciones y ocho direcciones permanecen disponibles.
- **Render:** `hair_back` es una capa independiente detrás de la cabeza en vistas frontales y laterales; deja de dibujar un rectángulo sobre los ojos. Cráneo con contorno curvo, mandíbula estrecha, cejas y rostro, expresiones faciales opcionales, barba en mentón y cuello sombreado.
- **Cuerpo:** torso trapezoidal con variación de perfil, cintura, cinturón/hebilla, piernas de muslo-rodilla-pantorrilla y brazos de hombro-codo-mano, guantes, botas y equipo.
- **Cascos:** geometrías diferenciadas para `straw_hat`, `knight_helm`, `ranger_hood` y `crown`.
- **Pruebas:** siete nuevas regresiones 5A de rig 16×8×7, escorzo, ojos/nariz, barba y parpadeo, cascos, anclajes y compilación determinista de spritesheets; ejecutar `npm test` y `npm run build` de todos los módulos.
- **Límite:** los tests de píxeles y la compilación no acreditan automáticamente fidelidad estética frente a las capturas de usuario. Inspección visual con `npm run dev` sigue pendiente.
- **Siguiente bloque:** 5B — Sistema avanzado de personalización de personajes/NPC y auditoría de continuidad anatómica.

## Fase 5B — 14 de octubre de 2026

- **Origen:** lote Gemini sobre base desactualizada `217f76b393cda5b9755119a67f8b56d854df4520`, adaptado al HEAD real `cae1882e7bac9ba8df980b0e51fdcb91a035ea25`, rama `feat/ppae-2-art-overhaul`, PR #2 existente.
- **Alcance:** `src/core/contracts.ts`, `src/entities/character-generator.ts`, nuevo `src/entities/character-customization.ts`, `src/index.ts`, nuevas `tests/ppae-character-customization-5b.test.ts`.
- **Contratos:** expansiones retrocompatibles de peinados, cascos, armaduras, manos y escudos; campos opcionales de edad, orejas, cuernos, marcas faciales y mochilas; contratos de profesión y métricas geométricas.
- **Renderizado:** siete tipos de ropa con detalles de geometría distintos, cuatro mochilas con ordenamiento de profundidad, tres nuevos cascos, tres estilos de cabello, variantes faciales y herramientas de oficio. Conserva el tratamiento de `hair_back` independiente de 5A y los anclajes de `SpritesheetCompiler`.
- **NPC:** presets deterministas para ocho profesiones: granjero, herrero, guardia, mago, explorador, mercader, anciano estudioso y minero.
- **Auditoría:** BFS con conectividad de 8 vecinos sobre alfa >= 200 y componentes etiquetadas, excluyendo sombra de contacto; verifica cabeza/cuello/torso y ambos pies sobre la componente principal, proporción principal y apoyo del pie en ocho direcciones. La continuidad medida es pixel-topológica (no una certificación visual de estilo).
- **Cobertura:** seis grupos de regresiones: continuidad héroe, NPC deterministas, vestimenta, mochila/facial, variantes fantásticas y spritesheets/anclajes.
- **Estado:** VERIFIED técnicamente. Commit de implementación `1b7a8bd63d4646696e7386cd19d9c3686c43ef5c`. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38600924526: `npm test` **22 suites / 128 tests** (6 nuevos 5B) y `npm run build` íntegro (TypeScript, declaraciones, biblioteca y demo) exitosos. Sigue pendiente inspeccionar visualmente las ocho vistas de cada oficio.
- **Próximo bloque:** 6A — Advanced Animation System y catálogo ampliado de acciones.

## Fase 6A — 14 de octubre de 2026

- **Referencia:** base de Gemini `217f76b393cda5b9755119a67f8b56d854df4520` desactualizada; HEAD real `76b69704b88966391534f1142392daa9989cc119`. Misma rama `feat/ppae-2-art-overhaul`, PR #2.
- **Archivos:** MODIFY `src/core/contracts.ts`, `src/entities/character-rig.ts`, `src/entities/character-generator.ts`, `src/animation/state-machine.ts`; ADD `tests/ppae-advanced-animation-6a.test.ts`; actualización de este documento.
- **Contratos:** 28 acciones de personajes y 22 tipos de eventos de animación/gameplay. Se conservan los siete identificadores anteriores y sus eventos.
- **Rig:** `evaluatePose` incorpora 21 acciones nuevas con oscilación, zancadas, flexión de extremidades, inclinación/descenso postural y swing de arma contextual en las ocho direcciones, incluyendo el brazo izquierdo con elevación independiente.
- **Render:** overlays contextualizados para magia/curación, consumo, caja cargada y estela de nado; sueño con ojos cerrados y marca de colapso en pose. Se conserva la arquitectura por capas de 5A–5B y compatibilidad de anclajes.
- **Máquina:** 28 `DEFAULT_CHARACTER_CLIPS` con cuadros, cadencias, prioridades, interrupciones, looping y eventos; `fallbackAction` admite `sprint`, `sneak` y `swimming` además de estados originales.
- **Pruebas:** seis tests adicionales de catálogo/8 direcciones/determinismo, poses contextuales, movilidad de manos, eventos FSM, regresión legacy y spritesheets mixtos.
- **Estado:** VERIFIED técnicamente. Implementación `7183404efc760d8505b122a9dda763ddfa78fee5`; ajustes de regresión `c17c3a01bbe3ff05a686188c6954415e98f25ab5` y `7afb4d03d53b63b0e77d132e85893bb55a41cffa`. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38602363584: `npm test` **23 suites / 134 pruebas aprobadas** (6 nuevas 6A); `npm run build` correcto con declaraciones, TypeScript, biblioteca y demo. Auditoría visual del Animation Inspector en 8 direcciones pendiente; no se declara paridad artística basándose solo en tests.
- **Siguiente fase:** 6B — SpeciesAnimationCapabilityRegistry y spritesheets de criaturas.

## Fase 6B — 14 de octubre de 2026

- **Rama exclusiva y PR:** `feat/ppae-2-art-overhaul`, PR #2 (sin fusionar). HEAD inspeccionado `c3a10deadbd44834b720257f1fd4c91f3d71d214`; la base de Gemini `217f76b393cda5b9755119a67f8b56d854df4520` está obsoleta.
- **Contratos:** doce `CreatureActionId` retrocompatibles y perfiles `SpeciesAnimationCapabilityProfile`, `LocomotionMedium`, `CreatureAnimationClipDefinition`, y metadatos de atlas/fauna.
- **Registro:** `SpeciesAnimationCapabilityRegistry`, `DEFAULT_CREATURE_CLIPS`, `FAMILY_ANIMATION_CAPABILITIES`; seis familias con fallback determinista, incluyendo `dairy_cow.jump_pounce -> move` y `river_trout.rest_graze -> swim`. Incompatibles desduplicadas al compilar.
- **Rigs:** `CreatureGenerator` amplía animaciones de cuadrúpedos, aves, slimes, arácnidos, murciélagos y peces con movimiento rápido, descanso, emboscada, alimentación, habilidades y nado según anatomía.
- **Spritesheets:** `SpritesheetCompiler.compileCreatureSheet` con extrusión de bordes, pivotes/anclajes ajustados al padding, hitboxes, 8 direcciones, datos y eventos por fotograma.
- **Pruebas:** seis tests de clips, capacidades, morfología por acción, determinismo en ocho direcciones, atlas y fallback.
- **Estado:** VERIFIED técnicamente. Implementación `fcbe483e03aa2e70382ce49b957470eab589be37`. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38603513137: `npm test` **24 suites / 140 pruebas aprobadas** (6 nuevas 6B) y `npm run build` correcto (TypeScript, declaraciones, biblioteca y demo). Auditoría visual de todas las familias y animaciones pendiente; la aprobación técnica no demuestra paridad artística.
- **Siguiente:** Fase 7A — arquitectura artística multirresolución.

## Fase 7A — 14 de octubre de 2026

- **Referencia:** Gemini indicó la base obsoleta `217f76b393cda5b9755119a67f8b56d854df4520`; HEAD inspeccionado en rama exclusiva `feat/ppae-2-art-overhaul`: `4a8a160e45c05548f8c7a6d5bd99784098e6052c`. Actualización del PR borrador #2, sin tocar master.
- **Archivos:** MODIFY `src/core/contracts.ts`, `src/core/coordinates.ts`, `src/rasterizer/pixel-buffer.ts`; ADD `tests/ppae-multiresolution-7a.test.ts`; actualización del progreso.
- **Contratos:** `ArtModuleSize` 4/6/8/16/32, tamaños de tile canónico, siete perfiles (cinco principales, híbrido histórico y modo de selección adaptativa), `ArtisticDetailBudget` y nueve dimensiones explícitas separadas de física y hitboxes.
- **Perfiles y presupuesto:** `ARTISTIC_DETAIL_BUDGETS` define presupuesto cromático, pasos de sombreado, detalle facial, hojas/corteza/facetas y capacidades opcionales de ropa y articulaciones; `adaptive-auto` representa un default seguro hasta resolver el perfil concreto mediante el controlador. **El detalle adicional no se sintetiza en todos los generadores hasta 7B.**
- **LOD:** `AdaptiveResolutionController.selectOptimalProfile` usa zoom, altura de pantalla, DPR, distancia, importancia y coste de cuadro, con limitación de salto entre niveles basada en `previousProfileId`. `CoordinateSystem.resolveNineDimensionSpec` mantiene 16 unidades lógicas por tile y `computeStyleScaleFactor` expone escala módulo/4.
- **PixelBuffer:** `stampModulePattern` retiene salida legada en 4 y 6 px y permite patrones muestreados con contorno discretizado y detalle interno determinista en 8/16/32.
- **Pruebas:** nueva suite de siete tests para contratos antiguos/nuevos, presupuesto, nueve dimensiones, LOD, validez, estampado y generación de recursos.
- **Estado:** VERIFIED técnicamente. Commit `007aa71a04afc24963051dfa6ce362da993c156a`; GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38604628987: `npm test` **25 suites / 147 pruebas aprobadas** (7 nuevas) y `npm run build` correcto (TypeScript, declaraciones, biblioteca y demo). Revisión visual y síntesis de detalle artístico por resolución en generadores pendientes para 7B.
- **Siguiente:** Fase 7B — síntesis morfológica real por resolución y sustitución de escalas internas rígidas.

## Fase 7B — 14 de octubre de 2026

- **Rama única:** `feat/ppae-2-art-overhaul`, PR #2, `master` intacto. Integración real sobre HEAD `d0729743cb4cf5e7cff4c56ce3b8457f213f17d9` (la base `217f76b393cda5b9755119a67f8b56d854df4520` de Gemini es anterior).
- **Cambios:** MODIFY `src/entities/character-rig.ts`, `src/entities/character-generator.ts`, `src/vegetation/tree-foliage-rasterizer.ts`, `src/vegetation/geology-rasterizer.ts`; ADD `tests/ppae-multiresolution-detail-7b.test.ts`.
- **Escalado:** `moduleSize / 4` sustituye la bifurcación rígida 4/6 en cinemática y rasterización de personajes, preservando el esquema de 16 juntas, 28 acciones, las 8 direcciones y anclajes físicos.
- **Anatomía por presupuesto:** niveles `eyes_only` / `eyes_and_brows` / `full_features` / `expressive_hd`; ojos con iris, pupila, esclera y brillo, nariz y boca expresiva en 16/32; sombras profundas, pliegues, costuras, dedos y mechones; compatibilidad de los ojos 4/6.
- **Follaje:** sublóbulos/racimos con `foliageSubdivisionLevel` 1–4; tonos de interior abisal y brillos separados para 16/32. **Geología:** variaciones mineralógicas deterministas dentro de las facetas de la malla con niveles 1–4, conservando fracturas, estratos e inclusiones.
- **Pruebas:** nuevo archivo de regresión de escala, contraste cromático/geométrico, determinismo y continuidad direccional; ejecución CI pendiente al momento del primer commit.
- **Estado:** VERIFIED técnicamente. Commit de implementación `843af8564f066cc25d472666f9e41ca62ca7e4e6`. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38606458485: `npm test` **26 suites / 151 pruebas aprobadas** (4 nuevas) y `npm run build` correcto (TypeScript, declaraciones, biblioteca y demo). Validación visual con capturas de personajes, copas y rocas en el navegador pendiente; las pruebas técnicas no acreditan equivalencia visual.
- **Siguiente:** Fase 8A — familias anatómicas adicionales y escala multirresolución de criaturas y jefes.

## Fase 8A — 14 de octubre de 2026

- **Rama y PR:** `feat/ppae-2-art-overhaul`, PR #2, sin modificar `master`. HEAD real inspeccionado: `f7211c33ad8d9100582166b66cffe0bd6853fa34`; la referencia original `217f76b393cda5b9755119a67f8b56d854df4520` no contiene los desarrollos posteriores.
- **Contratos:** diez `CreatureFamilyId`, 16 `CreatureSpeciesId`, `CreatureMorphVariantOptions` (juvenile/adult/alpha_elder, healthy/wounded/corrupted, escala limitada) y `BossArchetypeId` tipado.
- **Rigs:** los seis solvers existentes reciben escala continua `profile.moduleSize / 4`, con tamaño extra de variante; cuatro solvers nuevos: reptil serpentino (espina continua, lengua y capucha), insecto hexápodo (trípode/élitros), gólem pétreo (núcleo y puños) y bípeda no muerta/goblin (costillas/orejas/arma). Ciervo con astas y jabalí con colmillos. Detalle superficial adicional nativo en perfiles 16 y 32.
- **Capacidades:** las cuatro familias nuevas se registran en `SpeciesAnimationCapabilityRegistry`; acciones incompatibles resuelven alternativas seguras y permanecen compatibles los clips/atlas 6B.
- **Jefes:** `createCorruptedTreantBossState`, paleta corrupta por fase, corteza, ramificaciones y garras de raíces, sin romper estados de cuatro segmentos, puntos débiles, telegrafía ni fases del coloso preexistente.
- **Pruebas:** `tests/ppae-advanced-creatures-bosses-8a.test.ts` cubre catálogo, render escalado, determinismo en ocho direcciones, variantes, ambos jefes y compilación de atlas.
- **Estado:** VERIFIED técnicamente. Commits: implementación `a04780f26139387f1881fdd57007f16316042018`, corrección de regresión de pivote slime y expectativa de familias 6B `e79910e00364f20548a31c8fac133723a45f5cae`, anclaje de raíces y compilación TypeScript `dbabf52138de17f6df3434dca1962e40d211b1a5`. GitHub Actions https://github.com/Mairon31/ppae-engine/actions/runs/38608133738: **27 suites / 157 tests aprobados**, `npm run build` correcto (TypeScript, biblioteca, declaraciones y demo). Inspección visual de las diez familias en 4/6/8/16/32 pendiente: las pruebas técnicas no certifican fidelidad artística.
- **Siguiente:** Fase 9 — Procedural Architecture & Interiors.

## Convenciones de estado

- `PENDING`: no iniciado.
- `IN_PROGRESS`: integración en curso.
- `IMPLEMENTED`: los cambios están guardados en GitHub.
- `VERIFIED`: tests/build y demás criterios requeridos con evidencia.
- `BLOCKED`: no es posible seguir por una dependencia o fallo específico.

No modificar `master`, no modificar `Mairon31/pixelproject` y no fusionar el PR sin autorización.

## PPAE Playground — 14 de octubre de 2026

- **Objetivo:** demostrador interactivo de los sistemas PPAE 2.0 antes de la Fase 9 (17 secciones de mundo, entidades, vegetación, arquitectura, VFX y entorno).
- **Interfaz:** sustituido el inspector estático por Playground responsive con catálogo seleccionable, escena pixel-perfect, inspección de 28 acciones humanas y 12 acciones de criaturas, 8 direcciones, zoom, controles de FPS, perfil 4/6/8/16/32/híbrido/adaptativo, semilla, edad, salud, fases, clima y luz.
- **VFX (no SFX):** emisiones visuales de `PixelParticleEngine`, incluyendo humo, fuego, chispas, hojas, salpicaduras y magia; sin reproducción de audio.
- **Exportación:** PNG de escena y atlas PNG/JSON del `SpritesheetCompiler` para humanoides y criaturas; telemetría de render y ocupación de partículas.
- **Código:** `index.html`, `src/demo/main.ts`, `src/demo/playground.css`, `src/demo/playground-catalog.ts`; `tests/ppae-playground.test.ts`, `docs/PLAYGROUND.md`.
- **Verificación técnica:** suites `npm test` y `npm run build` completadas satisfactoriamente en CI de commit `327b643b56be179c14fe37ff94b6ad3e226bfe3f`, runs https://github.com/Mairon31/ppae-engine/actions/runs/38611894862 y https://github.com/Mairon31/ppae-engine/actions/runs/38611901583. Nueva validación pendiente para los últimos retoques.
- **Publicación GitHub Pages:** el build de Pages pasó, pero el job de deploy desde la rama del PR falló en https://github.com/Mairon31/ppae-engine/actions/runs/38611894661. Se impide desplegar desde la rama no fusionada y se mantiene el deploy solo desde `master`, sin modificar `master` ni fusionar el PR. La URL pública puede mostrar la demo anterior hasta que se integre el PR.
- **QA visual:** revisión humana de screenshots, rendimiento por perfil y compatibilidad táctil pendiente; tests/build no certifican fidelidad visual.
- **Estado:** IMPLEMENTED, verificación de compilación y pruebas aprobada, publicación pública y QA visual pendientes.

## PPAE Playground — Cierre incremental P0/P2 y QA automatizado (14-10-2026)

- **Base de integración:** `e5703859ea54880b12769dd7c0a59e6a77fa53f3` comprobada como HEAD del PR #2 al iniciar. Rama única `feat/ppae-2-art-overhaul`; `master` intacto, PR #2 abierto y sin fusionar.
- **P0 — Pages:** `deploy-pages.yml` permite desplegar desde la rama de PR sin tocar `master`; `npm run build:demo` incluye una comprobación ejecutable sobre `dist/demo/index.html`, CSS y JS compilados y rutas base Vite. Archivos: `.github/workflows/deploy-pages.yml`, `package.json`, ADD `scripts/verify-pages-output.mjs`.
- **Evidencia de despliegue:** `Deploy demo to GitHub Pages` terminó con build + deploy SUCCESS en https://github.com/Mairon31/ppae-engine/actions/runs/38613821723 (commit `f35ec900ed7882e87ff4d00d2c859a2d6d9f0e42`). También se ejecuta el workflow nativo `pages build and deployment`; hasta revisar la fuente de publicación en Settings → Pages y el HTML servido, **no marcar publicación pública como verificada**. Se recomienda elegir `Source = GitHub Actions`, no `Deploy from a branch`.
- **P2 — Rendering UX:** `src/demo/main.ts` limita la generación de miniaturas a una por fotograma, cancela trabajos obsoletos, cachea máximo 36 Canvas `198×112` y sincroniza reproducción de clips sin bucle. Los controles de animación y entorno refrescan la galería. VFX: emisiones ligadas a tiempo de reproducción; sin SFX. `index.html` y `src/demo/playground.css` incorporan cierre de navegación móvil, teclado y estados de foco.
- **P1 — QA navegador preparado:** ADD `.github/workflows/playground-browser-qa.yml` y `scripts/playground-browser-qa.mjs`. Chromium debe visitar las 17 secciones, esperar tarjetas Canvas, guardar capturas, detectar fallos HTTP/JS, probar 32×32, variaciones de criatura, exportación PNG/JSON y pantalla de 390 px. Artefacto `ppae-playground-chromium-qa`. El workflow no se da por aprobado hasta inspeccionar su resultado.
- **Verificación técnica del lote P0/P2:** CI con `npm test` y `npm run build` PASS para el commit `f35ec900ed7882e87ff4d00d2c859a2d6d9f0e42`: https://github.com/Mairon31/ppae-engine/actions/runs/38613832550. Los commits posteriores deben superar sus propias ejecuciones.
- **Pendiente:** inspección visual humana de screenshots de NPCs, jefes, VFX, vegetación, agua, terrenos e interiores; contraste de HTML/JS/CSS público (incluidos MIME y cachés); conclusiones de la primera ejecución Chromium. **Estado de P0/P2: IMPLEMENTED + CI confirmada en commit citado; QA navegador/arte PENDING.** La Fase 9 no se considera iniciada.

## PPAE Playground — QA visual en navegador y correcciones de muestras (14-10-2026)

- **HEAD de trabajo para este lote:** `01d1dd6ad2e9d191e2bdac6b4892bc18fde955e2`, en el mismo PR #2 y rama `feat/ppae-2-art-overhaul`; `master` sin modificar.
- **Navegador real:** primera ejecución Chromium correcta sobre Vite compilado `/ppae-engine/`: https://github.com/Mairon31/ppae-engine/actions/runs/38614915073. En la primera tentativa el servidor de preview entregó 404 a `/ppae-engine/assets/*.js`, corregido mediante `vite preview --base /ppae-engine/` (`package.json` y workflow). Verificación de 17 secciones, Canvas/miniaturas, exportaciones PNG/atlas PNG/JSON, héroe 32×32 y orientación NE, criatura juvenil/herida SW y móvil 390 px.
- **Defecto visual P1 detectado y corregido:** `worldScene` renderizaba siempre chunk (0,0), mayoritariamente agua con la semilla por defecto. Selección determinista de chunk panorámico mixto a partir de `DeterministicWorldField.sampleMaterialOnly`, sin precalcular ni falsificar arte; screenshot muestra suelo verde, arena y agua con props del motor.
- **Defecto visual P1 corregido:** árboles y cultivos comenzaban en estado `seed`; selector de etapa ahora arranca en `mature` y conserva todos los estados disponibles. Se comprobaron capturas de árboles adultos y cultivos desarrollados.
- **Defecto visual VFX corregido:** 85 partículas se superponían en unos pocos píxeles y las coordenadas Y de emisiones consecutivas estaban correlacionadas. Los emisores visibles del Playground utilizan ahora muestreo espacial X/Y independiente con mezcla avalanche, manteniendo `PixelParticleEngine` real y emisión recurrente cada 175 ms con reloj de reproducción. No se implementó audio/SFX.
- **Commits de corrección artística:** `74f36b5503dc019296bf13a3b2799910ab5c0c19`, `271cd29564efc5cba2b811eeefcbdad32d504249` y `ee63d92677b80b555ac2048a536e6662d56a4892`.
- **Pruebas efectivas en commit `ee63d926`:** `npm test`: **28 suites / 161 tests PASS**, `npm run build`: PASS, ver https://github.com/Mairon31/ppae-engine/actions/runs/38616320269; Chromium QA 17/17 secciones + exportaciones + móvil: **PASS**, capturas disponibles, https://github.com/Mairon31/ppae-engine/actions/runs/38616315040; deployment GitHub Pages: **job SUCCESS** https://github.com/Mairon31/ppae-engine/actions/runs/38616315820. Se inspeccionaron de manera visual las capturas principales y los resultados antes/después, pero NO todas las combinaciones de arte y sprites.
- **Publicación:** el workflow nativo `pages build and deployment` también aparece además del workflow Vite de esta rama. GitHub Pages necesita tener **Settings → Pages → Source = GitHub Actions** para evitar competencia con Jekyll. **No verificado** el HTML/JS/CSS efectivamente servido por el dominio público. No modificar `master` ni fusionar PR para resolverlo.
- **Estado:** CI y QA automatizada en navegador **VERIFIED** (versión citada); mejoras de muestras **IMPLEMENTED** y revisadas con screenshots. Paridad artística de todas las variantes y comprobación de la URL pública **PENDING**. La Fase 9 permanece sin iniciar.

## PPAE Playground — Verificación HTTP pública de Pages (14-10-2026)

- **P0 confirmado en URL real (no solo Actions build):** `scripts/verify-live-pages.mjs` y el paso posterior a `actions/deploy-pages` comprueban el HTML servido, las rutas Vite `/ppae-engine/assets/`, HTTP 200 y los encabezados MIME de JavaScript y CSS. Ejecución satisfactoria: https://github.com/Mairon31/ppae-engine/actions/runs/38616837141, commit `1093512bd705f384a8a7bef7108a70d5eeb40bfd`. Mensajes de logs: `PUBLIC ASSET OK /ppae-engine/assets/index-Bpk-q1h9.js application/javascript`, `PUBLIC ASSET OK /ppae-engine/assets/index-CldpZVnY.css text/css`, `PUBLIC PAGES VERIFIED`.
- **QA de navegador en HEAD de código equivalente:** https://github.com/Mairon31/ppae-engine/actions/runs/38616834390 SUCCESS. `npm test` 28 suites/161 pruebas + `npm run build` siguen PASS para la rama: https://github.com/Mairon31/ppae-engine/actions/runs/38616844763.
- **Riesgo residual de publicación:** `pages build and deployment` (flujo nativo Jekyll) sigue existiendo en paralelo y podría publicar posteriormente contenido antiguo. Ajuste de propietario recomendado: **Settings → Pages → Build and deployment → Source = GitHub Actions**. La verificación HTTP acredita la publicación en el instante posterior al deployment, no estabilidad futura permanente.
- **Estado P0:** **VERIFIED** (HTML, CSS/JS, HTTP/MIME, Pages deployment en momento de ejecución). **P1:** QA funcional automatizado VERIFIED, QA artístico exhaustivo PENDING. **P2:** mejoras de rendimiento y UX implementadas; profiling GPU/dispositivos reales PENDING. Fase 9 sin iniciar; rama exclusiva y PR #2 conservados.

## P0 — Follaje arbóreo recortado: corrección del motor verificada (14-10-2026)

- **Síntoma reproducido:** copas de roble, pino y abedul con paredes verticales en Playground (preview y tarjetas). La causa era **interna al motor**: buffer morfológico demasiado ajustado + límite artificial de la región foliar alrededor de `centerX ± radiusX`.
- **Corrección:** `src/vegetation/tree-morphology.ts` calcula los márgenes precisos por ramas, raíces, masas de follaje, palm fronds, contorno, sombra del pivote y viento; expande dimensiones en múltiplos de `moduleSize` y traslada sin deformación todos los puntos anatómicos y el pivote. `src/vegetation/tree-foliage-rasterizer.ts` usa unión real de elipses lobulares. `src/vegetation/nature-generator.ts` transmite desplazamiento de viento al cálculo de límites.
- **Pruebas nuevas:** `tests/ppae-tree-clipping-regression.test.ts` valida 12 familias, perfiles 4×4/6×6/8×8/16×16/32×32, fases de crecimiento, viento y semilla predeterminada `PixelProject-2026`. Corrige una aserción heredada de comparación por alto de buffer (`tests/ppae-tree-morphology-1a.test.ts`) para comprobar la proporción morfológica sin contabilizar la transparencia de seguridad.
- **Commits funcionales:** `5c6aa3da334adc651055b002d55b69857a05aac9`, `b375b42525a5ec5038bddea7c45cdc87d14f37c2`, `417105949c26842442a3a04691bfccf7ed842f4f`, `81bcbc497f4650c57ef831996756cd46004b7cfa`, `cc70c8dce82aafdf8f3f82b2f84514087e6ee6b0`, `ff7b6a08df93d80b824c9cb8e261ca26b1e909ed`.
- **Evidencia verificada:** Actions CI https://github.com/Mairon31/ppae-engine/actions/runs/38619162356 SUCCESS; browser QA https://github.com/Mairon31/ppae-engine/actions/runs/38619154215 SUCCESS (17/17 secciones). Captura `06-trees.png` inspeccionada: copa y miniaturas libres de cortes verticales antes presentes. La imagen de ejemplo del roble ocupa 84×78 téxeles reales a 6×6.
- **P0 recorte nativo:** CORREGIDO y verificado por tests y captura real. **P1 futuro:** inspección masiva de arquetipos/semillas poco frecuentes y tratamiento de sprites que sobrepasen límites de chunks adyacentes en escenas grandes. PR #2 sigue abierto y `master` intacto. No iniciar Fase 9 por este cambio.

## P0/P1 — Playground exhaustivo: diversidad de personajes y exploración por capacidades (14-10-2026)

**Motivo:** el Playground anterior presentaba un avatar `DEFAULT_HERO_APPEARANCE` fijo y solo 17 galerías generales. Gran parte de `src/index.ts` tenía funcionalidad real no explorable (personalización de jugador, variantes de NPC, edad/estado de criaturas, animaciones, arquetipos de árboles, 256 entradas de autotiling, materiales, texturas, paletas y perfiles nativos).

**Implementación aplicada al PR #2, rama `feat/ppae-2-art-overhaul`; `master` intacto:**

- **30 secciones reales** en `src/demo/playground-catalog.ts` y `src/demo/main.ts`. Todas las rutas tienen `PLAYGROUND_OPTIONS` reales y generadores asociados. Se mantienen catálogos paginados, búsqueda por nombre/ID y renderizado progresivo de miniaturas.
- **Creador de personajes real**: `src/demo/avatar-lab.ts` proporciona 32 puntos de partida deterministas más variantes generadas por botón; expone 16 articulaciones del motor indirectamente mediante rig, tres complexiones, ocho peinados, cuatro tipos de barba, edad, rasgos, marcas, orejas, cuernos, scar-side, vestimenta y equipo, colores, altura, capas y efectos visuales. La definición editable se reutiliza en la escena del mundo, el visor de acciones y el atlas; no se sustituyen sprites con imágenes externas.
- **Diversidad**: 28 acciones, 8 oficios y 64 NPC catalogados, 16 criaturas × 3 edades × 3 estados (144 variantes), 12 árboles × 12 etapas (144), arquetipos morfológicos por familia, 4 cultivos × 5 estados, 16 variantes tileables por material, los 256 input masks normalizados a 47 topologías de autotiling, líquidos someros/profundos/lava, todas las paletas registradas y perfiles nativos de módulo 4/6/8/16/32.
- **Inspector avanzado**: jefe con acciones, fases de destrucción, telegráficos e integridad; criatura con multiplicador de escala; edificio con tejado visible, puerta y ventanas; cueva con lava/cristales; progresos HUD, estados de desgaste, ambiente de follaje y máscaras costeras.
- **Exportación fiel**: PNG nativo RGBA sin marco, PNG de captura del visor, PNG spritesheet con JSON de fotogramas y ficha JSON específica de generadores (morfología, anchors, colisiones, definiciones, paletas, etc.). `SpritesheetCompiler` actualiza celda de atlas para tamaño anatómico joven/adulto/anciano y preserva el estado visual del jugador.
- **Identidad estable del catálogo**: recursos derivados de `stableSubjectSeed(section,id)`, no del elemento seleccionado; cachés ya no eliminan todas las miniaturas al cambiar de elemento. En el comparador nativo, *la misma semilla* de roble se renderiza en todos los perfiles, y la telemetría comunica el perfil nativo real.
- **QA**: `tests/ppae-playground-extended.test.ts` prueba el índice completo, el determinismo y la diferencia entre avatares, el render real de las nuevas APIs y las dimensiones de los atlas de criatura. `scripts/playground-browser-qa.mjs` recorre las 30 categorías, compara las miniaturas antes/después de seleccionar, prueba edición/reroll y definición JSON, filtros de NPC/máscaras, atlas de criatura, exportación PNG nativa y metadatos de árbol/paletas, junto con responsive 390 px.
- **Documentación**: `docs/PLAYGROUND_COVERAGE_MATRIX.md` mapea 30 galerías a APIs y enumera los subsistemas no visuales aún no representados (benchmark CPU, caché interna, LOD/culling espacial, integración Phaser, portales). Se ajustaron `README.md` y `docs/PLAYGROUND.md`; no se afirma que una galería de imágenes demuestre por sí sola todas las funciones de runtime.

**Verificaciones registradas antes del último pulido**: CI `npm test` **30 suites / 170 tests PASS** y `npm run build` PASS (https://github.com/Mairon31/ppae-engine/actions/runs/38627775500); QA real de 30 categorías, editor, catálogos, exportaciones y móvil PASS (https://github.com/Mairon31/ppae-engine/actions/runs/38627851370); HTML público con JS/CSS compilados y MIME correctos PASS (https://github.com/Mairon31/ppae-engine/actions/runs/38627851389).

**Pendiente para dar cierre del HEAD documental:** volver a confirmar `npm test`, `npm run build`, Chromium y publicación después del último pulido de caché/semillas/editor. La inspección exhaustiva de cada combinación artística y las demostraciones runtime/Phaser todavía NO están verificadas. PR #2 sigue sin fusionar.

## PPAE product i18n and npm artifact isolation (14 October 2026)

**Completed on `feat/ppae-2-art-overhaul`, PR #2; no merge to `master`.**

- Canonical product and Playground text is **English**. The product landing and all 30 Playground labs support **Spanish (`es`)** and **Brazilian Portuguese (`pt`)**, using `?lang=es` / `?lang=pt` alongside the existing `#section` deep links. Both headers expose accessible language selectors; explicit URL languages override optional persisted preferences. Locale selection preserves the active lab while leaving all engine IDs, generated assets, seeds and metadata unchanged.
- Translations live in `src/demo/i18n.ts`, `i18n-marketing.ts`, `i18n-catalog.ts`, and `i18n-studio.ts`. The public UI translates HTML metadata, headings, descriptions, accessibility attributes, dynamic catalog controls, avatar editor and status text while preserving the Pixelarticons SVG markup.
- `README.md` remains English and links to **independent translated editions** in `docs/i18n/README.es.md` and `docs/i18n/README.pt-BR.md`. Removed the old Spanish inline details section. See `docs/LOCALIZATION.md` for future contributor guidance.
- No repository split is needed just to keep npm small. `package.json` already uses an explicit `files` allowlist; `tsconfig.build.json` now excludes `src/demo/**` declarations, and CI runs `npm run check:package` after the build. The audit uses `npm pack --dry-run --json` and rejects unneeded HTML, CSS, JS demos, docs, screenshots and test files.
- **Verified npm package on CI:** `@pixelproject/ppae@0.2.0-alpha.1`, **51 files, 122,370 bytes packed, 454,096 bytes unpacked**; engine ESM, public type declarations, `README.md` (English), license and package metadata only. Package was **not** published to npm.
- **CI verification:** 32 passing suites, **177/177 tests**, `npm run build`, `npm run check:package` in [GitHub Actions run 38638778943](https://github.com/Mairon31/ppae-engine/actions/runs/38638778943).
- **Chromium verification:** all 30 engine labs, exports, mobile 390px, Spanish deep link `?lang=es#trees`, Portuguese switch retaining `#trees`, Portuguese landing on mobile, English reset in [GitHub Actions run 38638778956](https://github.com/Mairon31/ppae-engine/actions/runs/38638778956). The package test and browser QA are separate checks; neither substitutes for native artistic review on every device.

**Future release prerequisites:** check package name and npm-scope ownership, create a controlled tagged-release workflow with provenance if wanted, review translations with native speakers, and verify that the actual publish tarball matches dry-run contents. Do not publish automatically from feature branches.

## Phase 9 — Procedural Architecture & Interiors (implementation in progress)

- Base HEAD inspected: `f6ad9ec3e1aecc89375318046ddabd867ed636b1` (PR #2, `feat/ppae-2-art-overhaul`). The supplied patch cited an earlier commit; hunks were applied against the actual branch without resetting newer work.
- Initial implementation: typed material/roof/archetype extensions; exterior facade patterns, roof grammars, windmill/well/ruins catalog entries; detailed interior furniture and cave stalactites; real Playground structure catalog labels with EN/ES/PT-BR translations.
- Regression suite: `tests/ppae-architecture-interiors-9.test.ts`. Retains existing logical collision, door and roof-occlusion return contracts.
- **Status: IMPLEMENTED, verification PENDING for this commit.** Do not mark VERIFIED until full `npm test`, `npm run build`, `npm run check:package` and browser QA complete. Manual art-direction evaluation remains pending.

### Phase 9 — Integration increment

- Cave renderer now includes seeded rock pillars (with logical collision rectangles), layered wall strata and stepped stalagmites while retaining exits, lava/crystals and the existing cave API.
- New `DEFAULT_FORGE_INTERIOR` / `DEFAULT_ALCHEMY_INTERIOR` demonstrate real furniture via the existing Interiors lab; the lab has three selectable layouts, type-safe metadata and localized labels.
- Added native-resolution roof/door invariants, interior collision/exit tests and cave determinism/pillar coverage. Validation of this increment and visual review remain PENDING until new GitHub Actions runs finish.

### Phase 9 — Regression hardening and visual QA capture

- New no-palette-change material/roof differential regression; crystals avoid rock-column collision cells.
- Chromium QA now captures generated windmill, ruins, slate manor, forge and alchemy screens and validates exported alchemy metadata, in addition to the original 30 sections.
- README EN/ES/PT-BR updated consistently; coverage matrix documents 10 catalog structures and three real interior layouts.
- `b185caf68dbfc67f8f6d64304651f458e5225901` passed CI (`npm test`, `npm run build`, `npm run check:package`) and Pages deployment. Phase 9 remains PENDING final verification of this subsequent QA commit and human art-direction review.

### Phase 9 — Visual art-direction correction

- Inspected actual Chromium screenshots: the initial windmill looked like a house with crossed spars; ancient ruins resembled two untextured vertical fences. These are substantive aesthetic defects despite passing CI.
- Replaced only new archetype implementations: the windmill now renders a tapered cylindrical stone tower, conical roof and four cloth lattice sails with native raster pixels; ruins now rasterize staggered masonry, stepped decay, buttress remnants, moss and rubble. Existing generic structures and portal API are preserved.
- New phase-9 regression checks open-door invariance of roof and wall collision and transparent ruins roof. New commit requires CI, browser verification and fresh screenshot inspection before claiming visual improvements verified.

### Phase 9 — Targeted technical and visual verification (14 October 2026)

- **Implementation commits:** `bdf11c320f45fbf8ba832971cf66f930dbd70472` (supplied Phase 9 diff adapted to actual HEAD), `b185caf68dbfc67f8f6d64304651f458e5225901` (column collisions, cave details, real Forge/Alchemy interiors), `d00b8802e30f1207dec54126f95890a227c7ae6b` (translations, browser snapshots, packaging docs), `22354ec7be7e2a363b716f24c1a514669d79f98e` (windmill and ruin visual morphology).
- **GitHub Actions CI on code HEAD `22354ec7`:** https://github.com/Mairon31/ppae-engine/actions/runs/38643851644 — **33 suites / 185 tests PASS**, `npm run build` PASS, `npm run check:package` PASS (51 files, 127,206 packed bytes; 476,058 unpacked bytes). No publishing to npm.
- **Chromium browser QA on code HEAD:** https://github.com/Mairon31/ppae-engine/actions/runs/38643851640 — PASS for landing + 30 sections, controls, exports and localized mobile UI; targeted Phase-9 real screenshot evidence: `38-phase9-windmill.png`, `39-phase9-ruins.png`, `40-phase9-slate-manor.png`, `41-phase9-forge-interior.png`, `42-phase9-alchemy-interior.png`; exported `phase9-alchemy-interior.json`. The images show recognizable tower-and-sail geometry, fractured masonry silhouettes and real interior furniture; previews come from engine buffers.
- **GitHub Pages deployment:** https://github.com/Mairon31/ppae-engine/actions/runs/38643851620 — deploy and public-asset smoke checks PASS.
- **Compatibility:** separated wall/roof buffers; open-door roof invariance, structure logical wall/door/roof metadata, interior walkability and cave collision rectangles remain covered by old/new tests.
- **Status:** VERIFIED for this documented code and targeted visual QA. **Not certified** across all permutations of seed, profile, age/scene, devices or art direction; device-specific frame pacing, 32×32 visual review and comparison against the referenced `image_59315b.jpg` remain pending because the reference image was not attached as an inspectable asset in this task. No changes to `master`, no PR merge and no npm publication.
- **Next planned phase (not started):** Phase 10 — Weather, Lighting & VFX Overhaul, subject to the user-supplied phase specification.

## Phase 10 — Weather, Lighting & VFX Overhaul (implementation started)

- **Base HEAD:** `156aa9ece2438de703615b18f91cdf71440475d9` checked on `feat/ppae-2-art-overhaul`, PR #2. The supplied patches referenced a historical commit and have been applied by matching actual source hunks, without resetting Phase 9.
- **Engine additions:** SolarShadowCaster/SolarShadowVector with directional Bayer shadows; LightningBoltBranch and weather lightning overlay/organic fog; four pixel-particle geometries and six new VFX presets (16 total) with existing pool/portal APIs preserved.
- **Tests:** new `tests/ppae-weather-lighting-vfx-10.test.ts` plus existing Phase 6 regressions.
- **Status: IMPLEMENTED; verification of this commit PENDING.** Playground exposure, internationalization, native-seed visual QA, performance and render-correctness improvements to be completed in subsequent changes.

### Phase 10 — Rendering fidelity and Playground exposure

- Improved directional shadow rasterization to one darkening pass per caster/pixel with a swept tapered silhouette and Bayer edge penumbra (eliminates black overdraw bands).
- Reworked fog as two independently drifting depth waves; per-axis precomputation avoids trig per texel. Branched lightning uses halo plus sharp core. Hollow rings and motion streaks now have recognizable native-pixel geometry.
- Existing Lighting lab now draws an actual procedurally generated oak and its computed solar shadow at each day phase. World chunk props cast ground shadows before foreground sprites. Weather and 16 VFX presets are exposed via existing live generator labs; six new catalog labels and all changed descriptions are translated EN/ES/PT-BR. Lighting JSON includes its resolved solar vector.
- **Status: IMPLEMENTED, verify CI/Chromium and visual output on the new commit before VERIFIED.** Performance claims beyond relative algorithmic complexity remain unbenchmarked.

### Phase 10 — Targeted deterministic and browser QA coverage

- Added self-overdraw regression (single caster is darkened at most once), seeded fog reproducibility and coverage, lightning seed sensitivity.
- Chromium workflow now captures dawn/dusk generated-oak shadows, branched thunderstorms, dense fog and shaped frost/poison effects; validates actual solar vector and emitter geometry through exported JSON.
- Updated the Playground coverage matrix for weather, lighting, VFX and live overworld cast shadows. **Status: implementation complete; CI and Chromium on this QA commit PENDING.**

### Phase 10 — Visual correction: fog stratification

- Real browser evidence from https://github.com/Mairon31/ppae-engine/actions/runs/38645492544 showed repeating elliptical clear holes in dense fog, despite passing functional smoke tests.
- Replaced separable x/y threshold checker pattern with two independent, animated centerline banks, thickness modulation, graded alphas and Bayer dithering restricted to bank edges. Per-column precomputation preserves O(width + height + pixels) runtime without trigonometric calls per pixel.
- Added bank-stratification assertions to the Phase-10 unit suite. **Pending** CI and updated Chromium screenshot review; phase not yet marked fully verified.

### Phase 10 — Technical and targeted visual verification (14 October 2026)

- **Start SHA:** `156aa9ece2438de703615b18f91cdf71440475d9`; the user-provided Phase-10 patches were based on an older revision and were adapted to current HEAD without resetting Phase 9.
- **Code commits:** `e2156cabbd8c811c4b2152f95c0615a39e8ea3b2` (typed solar shadows, lightning, fog, VFX), `712bdb08185bbedacb3a646cabe76d4f6b7e8e5d` (shadow raster correction, fog cost, Playground/i18n), `a1bd5aa6d69289feddd2a336d0d88b73693a9cf3` (QA coverage), `509ec84842d6f4a81156ea0a59013ea60f5e9d94` (async screenshot synchronization), `16f7d9aa5617542347666f41941056beb21eadf4` (stratified-fog visual correction).
- **CI on code SHA `16f7d9aa`:** https://github.com/Mairon31/ppae-engine/actions/runs/38645914922 — `npm test` **34 suites / 191 tests PASS**, `npm run build` PASS, `npm run check:package` PASS. Published package count remains **51**; npm dry-run **129,584 packed bytes / 485,574 unpacked bytes**. No npm publish performed.
- **Chromium QA on same code SHA:** https://github.com/Mairon31/ppae-engine/actions/runs/38645914913 — all **30** real labs, translated UI/deep links, seed/editor/PNG/JSON exports and responsive smoke PASS. Captures explicitly include dawn/dusk tree shadows, lightning, dense fog, frost and poison VFX, plus exported dawn vector and particle-shape definition.
- **Public deployment:** https://github.com/Mairon31/ppae-engine/actions/runs/38645915025 — Pages publish + live HTML/JS/CSS MIME smoke checks PASS.
- **Visual review:** reviewed Chromium screenshots. Dawn shadow extends west and dusk extends east with a native oak sample; bolts are branched; the first fog revision showed repetitive oval voids and was replaced by two continuous wavy depth banks, whose final screenshot has been reviewed. Small VFX particle geometry remains appropriately pixel-scale, and not every combination has been visually assessed.
- **Compatibility:** existing Phase 6 APIs remain; four particle shapes are optional in the public `ParticleEmitterDefinition`, old presets default to squares; pooling and collision/roof interfaces remain intact. No SFX/audio introduced; Pixelarticons preserved.
- **Performance:** fog trigonometry now scales with horizontal resolution rather than total pixel count, while the final loop remains O(width×height). No instrumented before/after benchmark or multi-device frame profile was collected; do not claim performance gain in milliseconds.
- **State:** **VERIFIED** for tested code, Chromium workflows and targeted screenshot QA. Remaining optional QA: exhaustive native 4/6/8/16/32 visual fixtures, art review across seeds, device profiling, larger-scene sun occlusion. No changes to master, no PR merge and no npm release.
- **Next:** Phase 11 — Procedural Art Quality Evaluator (user-supplied specification required before beginning).

## Phase 11 — Procedural Art Quality Evaluator (implementation in progress)

- Baseline HEAD `6073d5ab9b4a60a614d339d48af10cbc37bfcf0e`; original pasted diff referenced an earlier commit. Existing `AssetCategory` is `tree | mineral_rock | bush_flora | character | creature | structure`, so the proposed `mineral/flora/prop` names were mapped to established public contracts rather than breaking TypeScript.
- Added quality metrics, palette/contrast/directional illumination, orphan pixels, connected-components and toroidal tile auditing, plus nine deterministic reference specimens in `APPROVED_GOLDEN_SEED_REGISTRY`.
- New regression suite `tests/ppae-art-quality-evaluator-11.test.ts`. **Status: implemented; CI result pending.** Approval thresholds are provisional until actual scores and visual-review gates are verified, not assumed.

### Phase 11 — Calibration against real assets

- First golden suite failed: birch reference yielded false background-color-average contrast and false inverted lighting, despite its textured bark and foliage. Replaced the two shortcuts with visible silhouette-edge contrast and per-chroma-region highlight alignment; no artificial minimum contrast.
- Second run: oak, birch, fractured monolith, flora, hero, stag passed; crystal geode (emissive core) and multi-material cottage did not have a meaningful single directional light source. The directional metric remains reported, but the golden suite explicitly opts out of requiring solar coherence for those specimens; geometry, color, noise, connectivity and contrast are still audited.
- Golden specimens now declare documented per-composite color ceilings instead of a single 28-color bypass, and a terrain specimen is added. The real RGBA hash is exposed to catch deterministic changes, with expected signatures to be locked after CI baseline verification.
- Regression coverage: synthetic color-overbudget sprite, unreadable foreground, broken seam, reproducible golden hashes. **Status: implementation and baseline verification in progress.**

- Calibration detail: a seamless meadow ground tile must match its biome and therefore naturally has low foreground/background contrast against the default meadow backdrop. Such base terrains retain the measured contrast but skip **sprite foreground contrast** gating, while all standalone sprite categories retain the check. Explicit `checkBackdropContrast` options preserve the ability to test truly unreadable sprites.
- Hero references now forward `entry.seed` into the appearance contract, so an actual seed is tested rather than silently ignored by the benchmark renderer. RGBA fingerprints will be recalculated and locked after this fix.

- Anti-pillow-shading synthetic regression now checks a centered, brighter nucleus **within the same chroma material**, distinct from uniform tones; empty buffers fail with explicit `EMPTY_SILHOUETTE`.

- **Seed contract correction:** renderer anatomy uses explicit appearance attributes; setting `appearance.seed` alone did not alter hero pixels. Golden hero appearances now derive skin, hair, hair style and scar side from `SeededRNG(entry.seed)` before rendering, making reference seed meaningful rather than only a label. Static structure definitions remain definition-based and currently do not expose procedural seed variation.

### Phase 11 — Fingerprint locking and native-resolution seam coverage

- **Calibrated baseline:** ten registered specimen scores are 92–100 with no defect codes after category-appropriate applicability decisions; measured against the CI logs at https://github.com/Mairon31/ppae-engine/actions/runs/38647633342. These are actual measurements, not arbitrary passing scores.
- Pinned ten dimension-aware FNV-1a RGBA signatures observed in CI and enforced exact signature matching in tests. Any regeneration change must explicitly update the baseline and documentation after human review.
- Extended seamlessness audit from 4/6 to every native 4/6/8/16/32 profile; synthetic seam and pixel mutation regressions retained.
- Public API guidance and limitations in `docs/QUALITY_EVALUATOR.md`, EN/ES/PT-BR README updates. **Final CI and Chromium of this commit PENDING.** Phase 12 (live quality inspector) is user-defined future work.

### Phase 11 — Verified code baseline (14 October 2026)

- **Original Phase 11 input:** `6073d5ab9b4a60a614d339d48af10cbc37bfcf0e` (Phase 10 validated). User-provided patch referenced a historic base and was integrated into this actual branch without new PR or a reset.
- **Code and locked-baseline HEAD:** `364e0113fddbfd03a7e390f5355384fda62958be`.
- **GitHub Actions CI:** https://github.com/Mairon31/ppae-engine/actions/runs/38647862464 — **35/35 suites, 200/200 tests**, `npm run build` and `npm run check:package` PASS. Dry-run npm tarball: **52 files, 135,247 packed bytes, 504,774 unpacked bytes**. No npm publish.
- **Browser regression:** https://github.com/Mairon31/ppae-engine/actions/runs/38647862496 — existing 30 labs and prior visual exports/screenshot QA PASS. Quality evaluation remains a library and CI API; Phase 12 is the planned interactive inspector.
- **GitHub Pages:** https://github.com/Mairon31/ppae-engine/actions/runs/38647862381 — build and public smoke PASS.
- **Measured golden reference results:** `golden_tree_oak_mature_6x6` 99; birch 94; crystal geode 92; fractured monolith 97; flower cluster 97; hero 6x6 99; hero 16x16 100; forest stag 100; cottage 99; meadow tile 99. **10 of 10 pass their gates, no reported critical defect** on these samples; actual RGBA hashes locked and tested. User's original nine categories are preserved and a terrain specimen was added.
- **QA coverage:** synthetic circular/pillow shading, lollipop symmetry, orphan noise, empty silhouette, palette overflow, invisible foreground, broken tile seams, hash mutation, all 5 native-profile terrain edge checks.
- **Evaluation limitations:** chroma-based lighting and boundary contrast are quantitative heuristics, not an art director. Two specimens opt out of nonapplicable solar light-source assumptions and terrain opts out of sprite-foreground contrast, with raw metrics still visible. Signature match verifies RGBA identity but **not human artwork approval**. Full-gallery manual visual signoff and device profiling are pending.
- **Status: VERIFIED** for deterministic code, quality gates, CI, browser compatibility and package distribution. Phase 12 not started. `master` unchanged, PR #2 open and not merged.

## Phase 12 — Interactive Showcase, Visual Inspector & Production Integration Overhaul (in progress)

- Audited against actual branch head `01547bd6a3c0bb927c791bf8e016c4e7dc4473d5`, preserving Phase 11. User-supplied patches referenced an older historical commit; adapted to current contract names and existing boss renderer API.
- Added typed scene config/telemetry, unified controller, live catalog inventory, deterministic scene and multi-resolution quality comparison, plus new regression suite.
- **Status: IMPLEMENTED, pending CI and real interactive Playground integration.** Browser UI must expose a dedicated inspector and actual telemetry before completion. No master edits, no npm release.
