# Web del producto y Playground de PPAE

## Objetivo

La URL pública `https://mairon31.github.io/ppae-engine/` ahora contiene una **landing page orientada a desarrolladores** y el Playground de 30 laboratorios técnicos. La landing promociona PPAE como biblioteca de generación de pixel art, no como videojuego completo. Las escenas y muestras usan los generadores publicados del motor; el marketing no introduce renders artificiales ajenos al código.

## Rutas sin backend

| URL / fragmento | Experiencia |
| --- | --- |
| `/ppae-engine/` o `#home` | Presentación del motor, vista previa procedural animada, galerías e introducción |
| `#features`, `#showcase` | Anclas de la página de producto |
| `#world`, `#characters`, `#trees`, etc. | Playground; los 30 deep links previos funcionan |
| `#playground` | Abre el laboratorio del mundo |

El router de cliente se concentra en `src/demo/main.ts`. No hay React, hidración de SSR, historial `pushState` dependiente de servidor ni rutas que requieran reescritura de GitHub Pages. La página marketing y el Playground viven en el mismo HTML compilado y se alternan con el atributo `hidden`.

## Assets y animación realmente generados

`src/demo/landing.ts` conecta la portada con `NatureGenerator`, `TerrainAutotiler`, `LiquidTileGenerator`, `CharacterAvatarGenerator`, `CreatureGenerator`, `PixelParticleEngine` y variantes de `generateAvatarPreset`. El Canvas principal muestra una composición de sprites procesados por el motor; las cuatro tarjetas enlazan a `#characters`, `#trees`, `#creatures` y `#liquids`. El botón «Nueva variante» cambia la semilla y vuelve a generar los recursos.

Los elementos puramente editoriales (fondos, marcos, etiquetas, tipografía y ornamentación) están dibujados en CSS. Los sprites de personajes, naturaleza, criaturas, líquidos y partículas provienen de PPAE.

Se limita la tasa de actualización de Canvas, se respeta la página oculta y `prefers-reduced-motion`. No se descarga ninguna imagen prerenderizada para sustituir los generadores.

## Sistema visual

- Tipografías `Pixelify Sans` para jerarquía visual y `Press Start 2P` para metadatos muy breves; fallback nativo mientras las fuentes remotas cargan.
- Paleta retro técnica: azul noche, verde ácido, cian, violeta y ámbar. Contornos geométricos pixelados, sombras escalonadas, cuadrícula tenue y sutiles animaciones.
- La landing usa CSS en `src/demo/landing.css`; el estudio reutiliza las clases anteriores con `src/demo/studio-theme.css` y mantiene `src/demo/playground.css`.
- Móvil: navegación por catálogo y panel del inspector en cajones independientes, fondo bloqueador, cerrar con Escape y opciones táctiles.
- Mínimo de piezas de interfaz decorativa: todos los botones en la landing apuntan a un laboratorio, al repositorio o regeneran un Canvas.

## Publicación y fallo de estilo de GitHub Pages

**Causa del error de pantalla blanca de octubre 2026:** se publicó `index.html` directamente como contenido de una rama con rutas Vite de desarrollo, en lugar del resultado `dist/demo`; el archivo fuente solicita `/src/demo/playground.css` y `/src/demo/main.ts` sin compilar. En el sitio final, Vite sustituye estas referencias por archivos `/ppae-engine/assets/index-*.css/js`.

La solución duradera es que el propietario ajuste:

**Repositorio → Settings → Pages → Build and deployment → Source → GitHub Actions**.

Esta configuración requiere permisos de administración de Pages. El complemento GitHub conectado para editar contenidos **no dispone de esa facultad**, y una ejecución satisfactoria de `actions/deploy-pages` por sí sola no certifica que el modo `Deploy from a branch` haya quedado deshabilitado.

El workflow `.github/workflows/deploy-pages.yml` está configurado para generar `dist/demo`, publicarlo mediante `actions/upload-pages-artifact` y `actions/deploy-pages`, y luego ejecutar `scripts/verify-live-pages.mjs`: busca el identificador de la landing, el del Playground, comprueba referencias compiladas `.js`/`.css`, HTTP 200 y tipos MIME. Esto valida el instante posterior al despliegue; si luego se publica un Jekyll/branch build, la configuración de Source debe corregirse.

Para que el despliegue incorrecto no muestre una página que parece averiada, `index.html` incluye un pequeño diagnóstico que únicamente se activa en `*.github.io` cuando la página carga la entrada TypeScript sin compilar. Presenta el enlace directo al ajuste necesario. En el HTML compilado nunca debe ejecutarse esa rama.

## Verificación

`npm run build` compila biblioteca + sitio Vite; `npm test` comprueba el motor; `scripts/verify-pages-output.mjs` impide cargar recursos con rutas de desarrollo. `scripts/playground-browser-qa.mjs` comprueba en Chromium escritorio y 390px:

1. Landing en la raíz, jerarquía visual CSS, Canvas del motor visible y cuatro tarjetas.
2. Enlace principal hacia el Playground y funcionamiento de las 30 secciones.
3. Personalización de personajes, aleatorización, atlas/PNG/JSON y catálogo con búsqueda y paginación.
4. Comprobación de las texturas, metadatos de morfología y paletas reales.
5. Apertura y cierre del inspector en móvil, navegación al inicio y control de overflow.
6. Ausencia de errores de consola o respuestas HTTP 400+.

Las capturas del pipeline se guardan como artefacto `ppae-playground-chromium-qa` en GitHub Actions para revisar el diseño real.

## Limitaciones explícitas

La landing muestra el motor, no sustituye tests técnicos de rendimiento GPU, integración Phaser ni el proceso de benchmark CPU. La calidad artística precisa revisión visual continua; los 30 sistemas de catálogo no significan que cada combinación de atributos haya recibido una evaluación manual.

