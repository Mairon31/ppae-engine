import { describe, expect, it } from 'vitest';
import {
  CharacterAvatarGenerator, CREATURE_SPECIES_CATALOG, CreatureGenerator,
  DEFAULT_CHARACTER_CLIPS, DEFAULT_STYLE_PROFILES, EquipmentGenerator,
  FarmingAndCropGenerator, LiquidTileGenerator, MATERIAL_TIER_PALETTES,
  NatureGenerator, PixelNineSliceLibrary, SpritesheetCompiler, PaletteManager,
  TerrainAutotiler, TERRAIN_MATERIALS
} from '../src/index';
import { AVATAR_FIELDS, AVATAR_VARIANTS, generateAvatarPreset } from '../src/demo/avatar-lab';
import {
  PLAYGROUND_OPTIONS, PLAYGROUND_SECTIONS, NPC_VARIANTS, CREATURE_VARIANTS,
  TREE_LIFECYCLE_VARIANTS, CROP_LIFECYCLE_VARIANTS, TERRAIN_VARIANTS,
  TREE_ARCHETYPE_OPTIONS, AUTOTILE_MASKS
} from '../src/demo/playground-catalog';

describe('PPAE Playground advanced laboratory coverage', () => {
  const p = DEFAULT_STYLE_PROFILES['micro-4x4'];

  it('indexes real engine variants without static mockup assets', () => {
    expect(PLAYGROUND_SECTIONS).toHaveLength(30);
    expect(AVATAR_VARIANTS).toHaveLength(32);
    expect(PLAYGROUND_OPTIONS.characters).toEqual(AVATAR_VARIANTS);
    expect(PLAYGROUND_OPTIONS['character-actions']).toHaveLength(28);
    expect(NPC_VARIANTS).toHaveLength(64);
    expect(CREATURE_VARIANTS).toHaveLength(Object.keys(CREATURE_SPECIES_CATALOG).length * 9);
    expect(TREE_LIFECYCLE_VARIANTS).toHaveLength(12 * 12);
    expect(CROP_LIFECYCLE_VARIANTS).toHaveLength(4 * 5);
    expect(TERRAIN_VARIANTS).toHaveLength(Object.keys(TERRAIN_MATERIALS).length * 16);
    expect(TREE_ARCHETYPE_OPTIONS.length).toBeGreaterThan(12);
    expect(AUTOTILE_MASKS).toHaveLength(256);
    expect(PLAYGROUND_OPTIONS.palettes).toEqual(new PaletteManager().listPalettes().map(p => p.id));
    expect(PLAYGROUND_OPTIONS['resolution-profiles']).toContain('detailed-32x32');
    for (const section of PLAYGROUND_SECTIONS)
      expect(PLAYGROUND_OPTIONS[section.id].length).toBeGreaterThan(0);
  });

  it('generates reproducible yet diverse player appearances with every supported control enumerated', () => {
    const a = generateAvatarPreset('PixelProject-2026', 'avatar_01');
    const same = generateAvatarPreset('PixelProject-2026', 'avatar_01');
    const b = generateAvatarPreset('PixelProject-2026', 'avatar_02');
    const rerolled = generateAvatarPreset('PixelProject-2026', 'avatar_01', 1);
    expect(same).toEqual(a);
    expect(a.appearance).not.toEqual(b.appearance);
    expect(a.appearance).not.toEqual(rerolled.appearance);
    for (const [field, values] of Object.entries(AVATAR_FIELDS)) {
      expect(values.length, field).toBeGreaterThan(0);
      expect(new Set(values).size, field).toBe(values.length);
    }
    const painter = new CharacterAvatarGenerator();
    const frame = painter.renderCharacterFrame(a.appearance, a.equipment, 'walk', 'NE', 1,
      DEFAULT_CHARACTER_CLIPS.walk.frameCount, p, 'poisoned');
    expect(frame.buffer.countUniqueOpaqueColors()).toBeGreaterThan(4);
    const edited = painter.renderCharacterFrame(
      { ...a.appearance, hairStyle: 'mohawk', hairColorHex: '#facc15' },
      { ...a.equipment, helmet: 'none', armor: 'mage_robe' },
      'walk','NE',1,DEFAULT_CHARACTER_CLIPS.walk.frameCount,p,'poisoned'
    );
    expect(Array.from(frame.buffer.data)).not.toEqual(Array.from(edited.buffer.data));
  });

  it('compiles creature variants without clipping custom juvenile/elder frame dimensions', () => {
    const compiler = new SpritesheetCompiler();
    const gen = new CreatureGenerator();
    for (const [ageStage, healthState] of [
      ['juvenile','wounded'], ['adult','healthy'], ['alpha_elder','corrupted']
    ] as const) {
      const result = compiler.compileCreatureSheet('timber_wolf', p,
        ['move'], ['S'], 2026, { ageStage, healthState });
      const frame = gen.renderCreatureFrame('timber_wolf','move','S',0,6,p,2026,
        { ageStage, healthState });
      const meta = Object.values(result.metadata.frames)[0];
      expect(meta.innerWidth).toBe(frame.buffer.width);
      expect(meta.innerHeight).toBe(frame.buffer.height);
      expect(result.atlasBuffer.width).toBeGreaterThanOrEqual(frame.buffer.width);
      expect(result.atlasBuffer.countUniqueOpaqueColors()).toBeGreaterThan(3);
    }
  });

  it('renders the additional systems through their actual generator APIs', () => {
    const tree = new NatureGenerator().generateTreeStage('oak','ancient',p,314159);
    const highRes = new NatureGenerator().generateTreeStage(
      'oak','mature',DEFAULT_STYLE_PROFILES['standard-16x16'],314159);
    expect(highRes.buffer.width).toBeGreaterThan(tree.buffer.width);
    const palette = new PaletteManager().getPalette('meadow-summer');
    expect(palette.ramps.foliage.midtone.a).toBeGreaterThan(0);
    const terrain = new TerrainAutotiler();
    const tiles = terrain.generateSeamlessBaseTile('forest_moss',p,15);
    const border = terrain.composeAutotiledSurface('dirt_soil',85,p,'meadow_grass',8);
    const lava = new LiquidTileGenerator().generateAnimatedFrame('lava_magma',2,8,255,p);
    const crop = new FarmingAndCropGenerator().renderCropStage('wheat','mature',true,p);
    const gear = new EquipmentGenerator().renderEquipmentItem({
      schemaVersion:'1.0.0',itemId:'gold_axe',category:'tool_axe',tier:'gold',
      wearState:'worn',durabilityMax:100,durabilityCurrent:55,
      attackOrPowerBonus:4,defenseBonus:0,primaryColorHex:'#eab308',secondaryColorHex:'#854d0e'
    },p);
    const progress = new PixelNineSliceLibrary().renderProgressBar(62,100,80,12,
      '#65b971','#20362b');
    for (const buffer of [tree.buffer,tiles,border,lava,crop.buffer,gear,progress])
      expect(buffer.countUniqueOpaqueColors()).toBeGreaterThan(1);
    expect(Object.keys(MATERIAL_TIER_PALETTES)).toHaveLength(6);
  });
});
