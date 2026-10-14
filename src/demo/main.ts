import {
  CharacterAvatarGenerator,
  CHUNK_SIZE_TILES,
  ChunkWorldRenderer,
  CropGrowthStage,
  CropSpeciesId,
  DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT,
  DEFAULT_STYLE_PROFILES,
  DeterministicWorldField,
  EquipmentGenerator,
  FarmingAndCropGenerator,
  GranularityProfileId,
  InventoryIconGenerator,
  ItemEquipmentDefinition,
  ItemMaterialTier,
  ItemWearState,
  PixelBuffer,
  PixelNineSliceLibrary,
  PPAE_SCHEMA_VERSION,
  StructureGenerator
} from '../index';

const seedInput = document.getElementById('seed-input') as HTMLInputElement;
const profileSelect = document.getElementById('profile-select') as HTMLSelectElement;
const scaleSelect = document.getElementById('scale-select') as HTMLSelectElement;
const telemetryBox = document.getElementById('telemetry') as HTMLDivElement;
const worldStage = document.getElementById('world-stage') as HTMLCanvasElement;
const cardsContainer = document.getElementById('cards-container') as HTMLDivElement;

const worldField = new DeterministicWorldField(seedInput.value.trim() || 'PixelProject-2026');
const chunkRenderer = new ChunkWorldRenderer(worldField);
const structureGen = new StructureGenerator();
const avatarGen = new CharacterAvatarGenerator();
const equipmentGen = new EquipmentGenerator();
const iconGen = new InventoryIconGenerator();
const farmingGen = new FarmingAndCropGenerator();
const nineSliceLib = new PixelNineSliceLibrary();

let selectedTier: ItemMaterialTier = 'iron';
let selectedWear: ItemWearState = 'pristine';
let selectedCrop: CropSpeciesId = 'wheat';
let cropStage: CropGrowthStage = 'mature';

function drawPixelBufferToCtx(
  ctx: CanvasRenderingContext2D,
  buf: PixelBuffer,
  destX: number,
  destY: number,
  scale: number
): void {
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < buf.width; x++) {
      const idx = (y * buf.width + x) * 4;
      const a = buf.data[idx + 3];
      if (a === 0) continue;
      ctx.fillStyle = `rgba(${buf.data[idx]},${buf.data[idx + 1]},${buf.data[idx + 2]},${a / 255})`;
      ctx.fillRect(destX + x * scale, destY + y * scale, scale, scale);
    }
  }
}

function copyBufferOver(target: PixelBuffer, src: PixelBuffer, offsetX: number, offsetY: number): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const c = src.getPixel(x, y);
      if (c.a > 0) {
        target.setPixel(offsetX + x, offsetY + y, c);
      }
    }
  }
}

function setupPhase7InspectorUI(): void {
  cardsContainer.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'asset-card';
  panel.style.gridColumn = '1 / -1';
  panel.style.alignItems = 'flex-start';

  panel.innerHTML = `
    <strong>Fase 7 — Herramientas, Armas, Íconos de Inventario, Granjas y HUD Nine-Slice</strong>
    <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
      <span>Material Tier:</span>
      <button data-tier="wood">Madera</button>
      <button data-tier="iron">Hierro</button>
      <button data-tier="gold">Oro</button>
      <button data-tier="crystal">Cristal</button>
      <span>Desgaste:</span>
      <button data-wear="pristine">Pristino</button>
      <button data-wear="worn">Desgastado</button>
      <button data-wear="damaged">Dañado</button>
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
      <span>Cultivo / Etapa:</span>
      <button data-crop="wheat">Trigo</button>
      <button data-crop="tomato">Tomate</button>
      <button data-crop="pumpkin">Calabaza</button>
      <button data-stage="seed">Semilla</button>
      <button data-stage="growing">Creciendo</button>
      <button data-stage="mature">Maduro</button>
      <button data-stage="withered">Marchito</button>
    </div>
  `;
  cardsContainer.appendChild(panel);

  panel.querySelectorAll<HTMLButtonElement>('button[data-tier]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedTier = btn.dataset.tier as ItemMaterialTier;
      renderPhase7Scene();
    });
  });

  panel.querySelectorAll<HTMLButtonElement>('button[data-wear]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedWear = btn.dataset.wear as ItemWearState;
      renderPhase7Scene();
    });
  });

  panel.querySelectorAll<HTMLButtonElement>('button[data-crop]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCrop = btn.dataset.crop as CropSpeciesId;
      renderPhase7Scene();
    });
  });

  panel.querySelectorAll<HTMLButtonElement>('button[data-stage]').forEach((btn) => {
    btn.addEventListener('click', () => {
      cropStage = btn.dataset.stage as CropGrowthStage;
      renderPhase7Scene();
    });
  });
}

function renderPhase7Scene(): void {
  const profileId = profileSelect.value as GranularityProfileId;
  const profile = DEFAULT_STYLE_PROFILES[profileId];
  const scale = Math.min(3, Math.max(2, parseInt(scaleSelect.value, 10) - 1));

  const chunkTexels = CHUNK_SIZE_TILES * profile.canonicalTileTexels;
  const sceneWidthTexels = 2 * chunkTexels;
  const sceneHeightTexels = chunkTexels;
  const compositeScene = new PixelBuffer(sceneWidthTexels, sceneHeightTexels);

  // 1. Terreno base
  for (let cx = 0; cx < 2; cx++) {
    const chunk = chunkRenderer.renderChunk(cx, 0, profile, 0, 4);
    copyBufferOver(compositeScene, chunk.terrainBuffer, cx * chunkTexels, 0);
  }

  // 2. Parcela de granja (tierra labrada + cultivo seleccionado)
  const soilTile = farmingGen.renderTilledSoilTile(true, profile);
  const cropArtifact = farmingGen.renderCropStage(selectedCrop, cropStage, true, profile);
  copyBufferOver(compositeScene, soilTile, 120, 80);
  copyBufferOver(compositeScene, cropArtifact.buffer, 120, 80);

  // 3. Avatar y Cabaña
  const cottageArt = structureGen.generateStructure(
    DEFAULT_STRUCTURE_CATALOG.village_cottage_01,
    profile,
    true,
    false
  );
  copyBufferOver(compositeScene, cottageArt.baseAndWallsBuffer, 16, 10);
  copyBufferOver(compositeScene, cottageArt.roofOverlayBuffer, 16, 10);

  const heroFrame = avatarGen.renderCharacterFrame(
    DEFAULT_HERO_APPEARANCE,
    DEFAULT_HERO_EQUIPMENT,
    'idle',
    'S',
    0,
    4,
    profile
  );
  copyBufferOver(compositeScene, heroFrame.buffer, 145, 78);

  // 4. Panel HUD con Nine-Slice y ranuras de inventario con íconos diagonales de alta legibilidad
  const hudPanel = nineSliceLib.renderNineSlicePanel(
    {
      schemaVersion: PPAE_SCHEMA_VERSION,
      frameId: 'hud_panel_wood',
      sourceWidthTexels: 24,
      sourceHeightTexels: 24,
      cornerSizePx: 6
    },
    160,
    48,
    { r: 24, g: 32, b: 48, a: 220 },
    { r: 115, g: 63, b: 18, a: 255 }
  );

  const testItemDef: ItemEquipmentDefinition = {
    schemaVersion: PPAE_SCHEMA_VERSION,
    itemId: 'test_sword',
    category: 'weapon_sword',
    tier: selectedTier,
    wearState: selectedWear,
    durabilityMax: 100,
    durabilityCurrent: selectedWear === 'damaged' ? 22 : 100,
    attackOrPowerBonus: 15,
    defenseBonus: 0,
    primaryColorHex: '#ffffff',
    secondaryColorHex: '#000000'
  };

  const diagIcon = iconGen.generateIcon(testItemDef, profile, 20);
  const hpBar = nineSliceLib.renderProgressBar(78, 100, 64, 8, '#22c55e', '#1e293b');

  // Copiar HUD sobre la escena de prueba
  copyBufferOver(compositeScene, hudPanel, 12, 12);
  copyBufferOver(compositeScene, diagIcon, 20, 20);
  copyBufferOver(compositeScene, hpBar, 48, 22);

  worldStage.width = sceneWidthTexels * scale;
  worldStage.height = sceneHeightTexels * scale;
  const ctx = worldStage.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  drawPixelBufferToCtx(ctx, compositeScene, 0, 0, scale);

  telemetryBox.innerHTML = `
    <strong>Telemetría Fase 7 — Items, Cultivos y HUD Nine-Slice</strong><br/>
    Item Activo: <strong>${selectedTier.toUpperCase()} Sword</strong> (${selectedWear})<br/>
    Cultivo Activo: <strong>${selectedCrop.toUpperCase()}</strong> (${cropStage})<br/>
    Nine-Slice HUD: Renderizado sin distorsión de esquinas<br/>
    Ícono Diagonal: Compilación $45^\circ$ optimizada para slot
  `;
}

setupPhase7InspectorUI();
[profileSelect, scaleSelect].forEach((el) => el.addEventListener('input', renderPhase7Scene));
renderPhase7Scene();
