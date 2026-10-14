import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_PROFILES,
  EquipmentGenerator,
  FarmingAndCropGenerator,
  InventoryIconGenerator,
  ItemEquipmentDefinition,
  PixelNineSliceLibrary,
  PPAE_SCHEMA_VERSION
} from '../src/index';

describe('PPAE Phase 7 — Equipment, Inventory Icons, Farming, Crops & Nine-Slice HUD', () => {
  it('generates parametric equipment items and applies wear and tear visually', () => {
    const eqGen = new EquipmentGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const pristineItem: ItemEquipmentDefinition = {
      schemaVersion: PPAE_SCHEMA_VERSION,
      itemId: 'sword_iron_pristine',
      category: 'weapon_sword',
      tier: 'iron',
      wearState: 'pristine',
      durabilityMax: 100,
      durabilityCurrent: 100,
      attackOrPowerBonus: 12,
      defenseBonus: 0,
      primaryColorHex: '#ffffff',
      secondaryColorHex: '#000000'
    };

    const damagedItem: ItemEquipmentDefinition = {
      ...pristineItem,
      itemId: 'sword_iron_damaged',
      wearState: 'damaged',
      durabilityCurrent: 15
    };

    const pristineBuf = eqGen.renderEquipmentItem(pristineItem, profile);
    const damagedBuf = eqGen.renderEquipmentItem(damagedItem, profile);

    expect(pristineBuf.width).toBeGreaterThan(0);
    expect(Array.from(pristineBuf.data)).not.toEqual(Array.from(damagedBuf.data));
  });

  it('renders high-readability diagonal inventory icons inside standardized grid cells', () => {
    const iconGen = new InventoryIconGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const itemDef: ItemEquipmentDefinition = {
      schemaVersion: PPAE_SCHEMA_VERSION,
      itemId: 'gold_axe',
      category: 'tool_axe',
      tier: 'gold',
      wearState: 'pristine',
      durabilityMax: 100,
      durabilityCurrent: 100,
      attackOrPowerBonus: 20,
      defenseBonus: 0,
      primaryColorHex: '#eab308',
      secondaryColorHex: '#854d0e'
    };

    const icon = iconGen.generateIcon(itemDef, profile, 20);
    expect(icon.width).toBe(20);
    expect(icon.height).toBe(20);
    expect(icon.countUniqueOpaqueColors()).toBeGreaterThan(2);
  });

  it('generates tilled soil tiles and morphological crop stages from seed to mature and withered', () => {
    const farming = new FarmingAndCropGenerator();
    const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];

    const soilWet = farming.renderTilledSoilTile(true, profile);
    const seedCrop = farming.renderCropStage('wheat', 'seed', true, profile);
    const matureCrop = farming.renderCropStage('wheat', 'mature', true, profile);
    const witheredCrop = farming.renderCropStage('wheat', 'withered', false, profile);

    expect(soilWet.width).toBe(24);
    const opaqueHeight = (buffer: typeof seedCrop.buffer): number => {
      let top = buffer.height;
      let bottom = -1;
      for (let y = 0; y < buffer.height; y++) {
        for (let x = 0; x < buffer.width; x++) {
          if (buffer.getPixel(x, y).a > 0) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      }
      return bottom < top ? 0 : bottom - top + 1;
    };
    expect(opaqueHeight(seedCrop.buffer)).toBeLessThan(opaqueHeight(matureCrop.buffer));
    expect(Array.from(matureCrop.buffer.data)).not.toEqual(Array.from(witheredCrop.buffer.data));
  });

  it('constructs Nine-Slice HUD panels preserving 1:1 corners and repeating edge tiles without scaling distortion', () => {
    const nineSlice = new PixelNineSliceLibrary();
    const panel = nineSlice.renderNineSlicePanel(
      {
        schemaVersion: PPAE_SCHEMA_VERSION,
        frameId: 'test_panel',
        sourceWidthTexels: 24,
        sourceHeightTexels: 24,
        cornerSizePx: 6
      },
      80,
      32,
      { r: 15, g: 23, b: 42, a: 255 },
      { r: 239, g: 68, b: 68, a: 255 }
    );

    expect(panel.width).toBe(80);
    expect(panel.height).toBe(32);
    // Verificar que las esquinas superiores izquierdas mantienen el color de borde exacto
    const cornerPixel = panel.getPixel(1, 1);
    expect(cornerPixel.r).toBe(239);
    expect(cornerPixel.g).toBe(68);
    expect(cornerPixel.b).toBe(68);
  });
});
