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
| 6B — Species Animation Capabilities & Creature Atlas | IMPLEMENTED | 12 acciones, seis familias de rigs y atlas direccionales con fallbacks anatómicos |

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
- **Estado:** IMPLEMENTED, pendiente del resultado de `npm test`, `npm run build` y revisión visual. El éxito de tests por sí solo no prueba estilo o calidad artística.
- **Siguiente:** Fase 7A — arquitectura artística multirresolución.

## Convenciones de estado

- `PENDING`: no iniciado.
- `IN_PROGRESS`: integración en curso.
- `IMPLEMENTED`: los cambios están guardados en GitHub.
- `VERIFIED`: tests/build y demás criterios requeridos con evidencia.
- `BLOCKED`: no es posible seguir por una dependencia o fallo específico.

No modificar `master`, no modificar `Mairon31/pixelproject` y no fusionar el PR sin autorización.
