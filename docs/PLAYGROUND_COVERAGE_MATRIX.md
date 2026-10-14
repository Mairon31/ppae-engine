# PPAE Engine 2.0 — Matriz de cobertura del Playground

> Actualizado: 14 de octubre de 2026. Rama `feat/ppae-2-art-overhaul`, PR #2.
>
> Este documento distingue entre **capacidad implementada en el motor**, **exposición interactiva del Playground** y **verificación real**. Una sección con Canvas no implica que todas las combinaciones posibles del motor hayan pasado inspección artística.

## Principios de fidelidad

1. Cada muestra visual debe provenir de un generador exportado de `src/index.ts`, no de un mockup ni de imágenes estáticas.
2. Cuando un catálogo usa IDs compuestos —por ejemplo `wolf:juvenile:wounded`— sus componentes deben llegar por separado a las APIs de la criatura, de los atlas y de los metadatos.
3. El control **Aleatorizar personaje** cambia la semilla de variación y utiliza las propiedades anatómicas de `EntityAppearance` y `EquipmentLoadout`; no altera los sprites con transformaciones CSS.
4. **Sprite PNG** entrega el `PixelBuffer` nativo, mientras que **Captura** descarga el lienzo del visor, con composición de la interfaz visual. **JSON** exporta el atlas real para personajes/criaturas o datos del generador elegido.
5. En listas grandes, se genera como máximo una miniatura por fotograma con caché limitada y paginación; el buscador filtra por identificador y etiqueta.

## 32 categorías públicas — rutas y APIs reales

| Sección (`#hash`) | Procedencia del motor | Variaciones y controles expuestos |
| --- | --- | --- |
| `world` | `DeterministicWorldField`, `ChunkWorldRenderer`, `StructureGenerator`, entidades, clima e iluminación | Semillas, perfiles, mundo, fauna, pueblo, hora y clima; sombras direccionales de props reales antes de componer sprites |
| `characters` | `CharacterAvatarGenerator`, `ProceduralCharacterRig`, `generateAvatarPreset` | 32 identificadores iniciales, regeneración por semilla, 8 direcciones, 28 acciones, color de piel y cabello, ojos, 8 peinados, complexión, altura, barba, expresión, edad, orejas, cuernos, marcas, casco, armadura, capa, botas, guantes, mochila, manos y estado visual |
| `character-actions` | `DEFAULT_CHARACTER_CLIPS` y `CharacterAvatarGenerator` | 28 acciones con avatar activo editable, 8 direcciones, fotogramas, velocidad y pausa |
| `npcs` | `CharacterCustomizationService.generateNpcPreset` | 8 profesiones, seed reproducible, dirección y acción |
| `npc-variants` | `generateNpcPreset` con subsemillas deterministas | 8 variantes de cada profesión; 64 muestras catalogadas |
| `creatures` | `CreatureGenerator`, registro de acciones admitidas | 16 especies, 10 familias, 12 acciones registradas con fallbacks reales, dirección, edad, salud y escala |
| `creature-variants` | `CreatureGenerator.renderCreatureFrame` con `CreatureMorphVariantOptions` | 16 especies × 3 edades × 3 estados = 144 combinaciones nombradas; escala anatómica |
| `bosses` | `MultiSegmentBossRenderer` y estados de los 2 jefes | Tres fases, seis acciones, cuatro telegráficos, integridad de segmentos, cuatro estados de muerte, ocho direcciones |
| `trees` | `NatureGenerator.generateTreeStage` | 12 familias, ciclo de vida seleccionable, viento y cuatro ambientes de follaje |
| `tree-lifecycle` | `TreeMorphologyResolver` + `NatureGenerator` | 12 familias × 12 etapas = 144 combinaciones |
| `tree-archetypes` | `TREE_MORPHOLOGY_ARCHETYPES` | Todos los arquetipos registrados por familia, generados en estado maduro |
| `flora` | `NatureGenerator.generateSecondaryFlora` | 17 categorías botánicas secundarias, variantes de seed y viento |
| `geology` | `NatureGenerator.generateGeologicalResource` | 17 tipos de formaciones y minerales |
| `terrain` | `TerrainAutotiler`, escena de mosaicos | Catálogo de materiales, seed, animación y perfiles |
| `terrain-variants` | `TerrainAutotiler.generateSeamlessBaseTile` | 16 variantes repetibles por material definido |
| `autotiling` | `TerrainAutotiler.composeAutotiledSurface` | 256 máscaras de vecinos crudas normalizadas al subconjunto canónico de 47; material, sustrato |
| `liquids` | `LiquidTileGenerator.generateAnimatedFrame` | Agua somera, profunda y lava; ocho frames y máscara de costa canónica |
| `structures` | `DEFAULT_STRUCTURE_CATALOG` y `StructureGenerator` | Diez construcciones reales, incluidos graneros, molino, pozo, ruinas, paja y pizarra; puerta, ventanas, techo separado y colisiones |
| `interiors` | `InteriorGenerator`, `DEFAULT_COTTAGE_INTERIOR`, `DEFAULT_FORGE_INTERIOR`, `DEFAULT_ALCHEMY_INTERIOR` | Tres habitaciones amuebladas: cabaña, herrería y laboratorio de alquimia; colisiones, transitabilidad y fuentes de luz |
| `caves` | `CaveDungeonGenerator.generateChamber` | Cámara de cristal por semilla con lava, pilares colisionables, estalagmitas, estalactitas, cristales (0–12) y colisiones |
| `farming` | `FarmingAndCropGenerator` | Las cuatro especies de cultivos, etapa y terreno cultivado |
| `crop-lifecycle` | `FarmingAndCropGenerator.renderCropStage` | Cuatro cultivos × cinco etapas = 20 muestras |
| `equipment` | `InventoryIconGenerator` y `PixelNineSliceLibrary` | Cinco tipos iconográficos, material y desgaste |
| `equipment-materials` | `EquipmentGenerator.renderEquipmentItem` | Seis materiales × tres clases de objeto = 18 muestras; desgaste |
| `hud` | `PixelNineSliceLibrary` | Nine-slice y tres barras de progreso con valor ajustable |
| `particles` | `PixelParticleEngine` | Dieciséis emisores VFX reales y cuatro formas de partículas con pooling, looping y física, sin SFX |
| `weather` | `WeatherAndWindSystem` | 11 condiciones registradas, relámpagos ramificados, niebla multicapa y viento; exportación/snapshots |
| `lighting` | `PixelPerfectLightingEngine`, `AMBIENT_PROFILES_BY_PHASE` | Siete fases lumínicas, roble procedural real con sombra solar Bayer por hora y vector exportado |
| `palettes` | `PaletteManager.listPalettes / getPalette` | Todas las paletas registradas; rampas RGBA reales, bioma/estación en JSON |
| `resolution-profiles` | `DEFAULT_STYLE_PROFILES` + `NatureGenerator` | Generación NATIVA del mismo árbol por perfil; no interpolación ni upscale de imagen |

Los recuentos reflejan **identificadores accesibles en catálogo**, no garantiza diversidad visual suficiente de todos los resultados (por ejemplo, equipamiento cuyos tipos todavía comparten cierta gramática raster). Las variaciones generadas se verifican con snapshots/diferencias y pruebas del motor, pero las evaluaciones artísticas requieren revisión adicional.

## Exportaciones

- **PNG nativo**: buffer del generador sin fondo del visor ni interfaz.
- **Captura PNG**: escena del Canvas incluyendo sus anotaciones y presentación.
- **Atlas PNG + JSON**: `SpritesheetCompiler` real, para personajes, profesiones y criaturas. Contiene direcciones y metadatos de frames; en criaturas conserva variantes de edad y salud y tamaño de celda anatómico.
- **Ficha JSON**: estado de avatar editable, perfil, semilla, dimensiones y metadatos específicos, por ejemplo árbol (morfología, pivote), geología, edificio (colisiones), interiores (walkability), cuevas (cristales/colisiones), autotiling (topología), VFX (preset) y paletas.

## APIs disponibles en el motor que NO equivalen a una galería de sprites

Estas capacidades están presentes en la biblioteca y no deben anunciarse como visualmente verificadas por un catálogo de imágenes:

- `PPAEPerformanceBenchmarkSuite`: mide tiempo de generación CPU y uso estimado de caché, **no** FPS ni GPU. Su ejecución/estadísticas no están incorporadas a un benchmark reproducible en la interfaz actual.
- `LodAndChunkCuller`, `AdaptiveResolutionController`, `CoordinateSystem`: parte de la selección adaptativa se usa en el visor, pero la culling/LOD espacial y la proyección requieren diagnóstico geométrico independiente.
- `PhaserPPAEAdapter`: convierte artefactos de PPAE en CanvasTexture para Phaser; la web no ejecuta una escena Phaser de integración.
- `RuntimeTextureCache` y atlas de runtime: hay caché de miniaturas en el Playground, pero no es una demostración completa del ciclo de vida de la caché interna.
- `PortalSystem`: los interiores/puertas existen y sus datos se exportan, pero el Playground no es un juego con navegación interactiva entre mundo e interior.
- Registro/culling avanzado de luces y exposición de hitboxes/anchors: JSON y generadores los soportan, pero la UI no dibuja todas las geometrías reales; la opción de hitbox visible heredada sigue siendo el límite del buffer, no una colisión física.
- Compatibilidad, metadatos de atlas y frame pacing de navegador: cubiertos parcialmente por pruebas de integración y no sustituyen mediciones en dispositivos reales.

## QA y próximos criterios de cierre

1. `npm test` y `npm run build` correctos en HEAD.
2. `scripts/playground-browser-qa.mjs`: navegar por **las 30 categorías**, comprobar Canvas y miniaturas, edición/reroll/exportación de avatar, catálogo buscable, variante de criatura, PNG/JSON y 390 px móvil.
3. Documentar el resultado exacto de CI y de Chromium en `docs/PPAE_2_0_IMPLEMENTATION_PROGRESS.md`; no marcar `VERIFIED` antes de completar la ejecución.
4. Completar diagnóstico de las APIs internas listadas arriba si se desea una demostración del motor **más allá del arte visible**, y revisar visualmente todas las combinaciones a 4/6/8/16/32.
5. Seguir implementando únicamente en `feat/ppae-2-art-overhaul` y PR #2, sin modificar ni fusionar `master`.


## Phase 11 diagnostics

The exported `ProceduralArtQualityEvaluator` is currently library/CI-only: `evaluateSpriteQuality`, `auditTileSeamlessness`, `auditAllBaseTerrainMaterials` and `runGoldenSeedBenchmarkSuite` consume real `PixelBuffer` outputs and produce quantitative reports. The Playground has no quality-inspector lab in Phase 11; one is planned in Phase 12, and the existing lab coverage and exports are unchanged.

## Phase 12 inspector labs

| Laboratory | Real API | Exposed behavior |
| --- | --- | --- |
| `integrated-scene` | `PPAEInteractiveShowcaseController.renderWorldSceneFrame`, `PPAEEngine.renderProductionScene`, real chunk/nature/character/boss/weather/light/quality engines | Live composed world and boss/interior/cave previews, seed/profile/solar/roof/entity controls, full telemetry, native PNG and JSON |
| `quality-inspector` | `renderMultiResolutionComparisonStrip`, `runGoldenSeedBenchmarkSuite`, `hashPixelBuffer` | Five native profile comparisons, quality scores, ten locked reference results and fingerprints |
