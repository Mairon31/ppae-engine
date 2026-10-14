import {
  CoordinateSystem,
  DEFAULT_STYLE_PROFILES,
  GeneratedAssetArtifact,
  GranularityProfileId,
  PPAEEngine,
  rgbaToHex
} from '../index';

const engine = new PPAEEngine();

const seedInput = document.getElementById('seed-input') as HTMLInputElement;
const profileSelect = document.getElementById('profile-select') as HTMLSelectElement;
const paletteSelect = document.getElementById('palette-select') as HTMLSelectElement;
const stateSelect = document.getElementById('state-select') as HTMLSelectElement;
const scaleSelect = document.getElementById('scale-select') as HTMLSelectElement;
const debugCheckbox = document.getElementById('debug-pivots') as HTMLInputElement;
const randomBtn = document.getElementById('random-seed-btn') as HTMLButtonElement;
const cardsContainer = document.getElementById('cards-container') as HTMLDivElement;
const telemetryBox = document.getElementById('telemetry') as HTMLDivElement;
const worldStage = document.getElementById('world-stage') as HTMLCanvasElement;

function renderArtifactToCanvas(
  artifact: GeneratedAssetArtifact,
  scale: number,
  showDebug: boolean,
  bgHex: string
): HTMLCanvasElement {
  const { texelWidth, texelHeight, pivotTexel } = artifact.metadata;
  const canvas = document.createElement('canvas');
  canvas.width = texelWidth * scale;
  canvas.height = texelHeight * scale;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar texels con escalado entero exacto
  for (let y = 0; y < texelHeight; y++) {
    for (let x = 0; x < texelWidth; x++) {
      const idx = (y * texelWidth + x) * 4;
      const a = artifact.pixels[idx + 3];
      if (a === 0) continue;
      ctx.fillStyle = `rgba(${artifact.pixels[idx]},${artifact.pixels[idx + 1]},${artifact.pixels[idx + 2]},${a / 255})`;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  if (showDebug) {
    // Punto de pivote de apoyo (Rojo)
    const [px, py] = pivotTexel;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(px * scale - 2, py * scale - 2, 5, 5);
  }

  return canvas;
}

function updateView(): void {
  const seed = seedInput.value.trim() || 'PixelProject-2026';
  const profileId = profileSelect.value as GranularityProfileId;
  const profile = DEFAULT_STYLE_PROFILES[profileId];
  const palette = engine.paletteManager.getPalette(paletteSelect.value);
  const stateTag = stateSelect.value as 'intact' | 'damaged' | 'snowy' | 'wind_sway';
  const scale = parseInt(scaleSelect.value, 10);
  const showDebug = debugCheckbox.checked;
  const bgHex = rgbaToHex(palette.backgroundReference);

  cardsContainer.innerHTML = '';
  const definitions = engine.listAssetDefinitions();
  const generatedMap = new Map<string, GeneratedAssetArtifact>();

  for (const def of definitions) {
    const artifact = engine.generateAsset({
      worldSeed: seed,
      assetDefinition: def,
      styleProfile: profile,
      palette,
      variantIndex: 0,
      stateTag
    });
    generatedMap.set(def.id, artifact);

    const card = document.createElement('div');
    card.className = 'asset-card';

    const previewCanvas = renderArtifactToCanvas(artifact, scale, showDebug, bgHex);
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `
      <strong>${def.id}</strong><br/>
      Resolución: ${artifact.metadata.innerWidth}×${artifact.metadata.innerHeight} px (Módulos ${profile.moduleSize}×${profile.moduleSize})<br/>
      Colores únicos: ${artifact.metadata.uniqueColorCount} / ${palette.maxColorsPerAsset}<br/>
      Contraste Bioma: ${artifact.metadata.contrastRatioAgainstBiome}:1<br/>
      Semilla: 0x${artifact.metadata.resolvedSeed.toString(16)} (${artifact.metadata.generationTimeMs} ms)
    `;

    card.appendChild(previewCanvas);
    card.appendChild(meta);
    cardsContainer.appendChild(card);
  }

  // Renderizar escenario de prueba con Y-sorting en coordenadas lógicas 16x16
  const sCtx = worldStage.getContext('2d')!;
  sCtx.imageSmoothingEnabled = false;
  sCtx.fillStyle = bgHex;
  sCtx.fillRect(0, 0, worldStage.width, worldStage.height);

  const coordSys = new CoordinateSystem(profile);
  const sceneEntities = [
    { id: 'oak_tree_mature', worldX: 48, worldY: 36, variant: 0 },
    { id: 'pine_tree_tall', worldX: 112, worldY: 30, variant: 1 },
    { id: 'crystal_ore_node', worldX: 80, worldY: 48, variant: 2 },
    { id: 'berry_bush_wild', worldX: 56, worldY: 54, variant: 3 },
    { id: 'oak_tree_mature', worldX: 148, worldY: 52, variant: 4 },
    { id: 'crystal_ore_node', worldX: 185, worldY: 42, variant: 5 }
  ];

  const projected = sceneEntities
    .map((ent) => {
      const def = engine.getAssetDefinition(ent.id);
      const art = engine.generateAsset({
        worldSeed: seed,
        assetDefinition: def,
        styleProfile: profile,
        palette,
        variantIndex: ent.variant,
        stateTag
      });
      const proj = coordSys.projectWorldToViewport(
        { worldX: ent.worldX, worldY: ent.worldY },
        0,
        0,
        2
      );
      return { ent, art, proj };
    })
    .sort((a, b) => a.proj.depthSortKey - b.proj.depthSortKey);

  for (const item of projected) {
    const { art, proj } = item;
    const spriteCanvas = renderArtifactToCanvas(art, proj.integerScale, showDebug, 'rgba(0,0,0,0)');
    const drawX = proj.screenX - art.metadata.pivotTexel[0] * proj.integerScale;
    const drawY = proj.screenY - art.metadata.pivotTexel[1] * proj.integerScale;
    sCtx.drawImage(spriteCanvas, drawX, drawY);
  }

  const tel = engine.getTelemetry();
  telemetryBox.innerHTML = `
    <strong>Telemetría de Caché y Motor</strong><br/>
    Generados únicos: ${tel.totalGeneratedCount}<br/>
    Cache Hits / Misses: ${tel.cacheHits} / ${tel.cacheMisses} (${(tel.cacheHitRate * 100).toFixed(1)}%)<br/>
    Memoria en Caché: ${(tel.memoryUsedBytes / 1024).toFixed(2)} KB<br/>
    P50 / P95 / P99: ${tel.genTimeP50Ms} / ${tel.genTimeP95Ms} / ${tel.genTimeP99Ms} ms
  `;
}

[seedInput, profileSelect, paletteSelect, stateSelect, scaleSelect, debugCheckbox].forEach((el) =>
  el.addEventListener('input', updateView)
);

randomBtn.addEventListener('click', () => {
  seedInput.value = `Seed-${Math.floor(Date.now() % 100000)}`;
  updateView();
});

updateView();
