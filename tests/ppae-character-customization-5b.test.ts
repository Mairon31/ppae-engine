import { describe, expect, it } from 'vitest';
import {
  ALL_DIRECTIONS_8,
  ArmorStyleId,
  CharacterAvatarGenerator,
  CharacterCustomizationService,
  DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT,
  DEFAULT_STYLE_PROFILES,
  NpcProfessionArchetypeId,
  SpritesheetCompiler
} from '../src/index';

describe('PPAE 2.0 Phase 5B — NPC presets, anatomical continuity, profession gear', () => {
  const service = new CharacterCustomizationService();
  const generator = new CharacterAvatarGenerator();
  const p4 = DEFAULT_STYLE_PROFILES['micro-4x4'];
  const p6 = DEFAULT_STYLE_PROFILES['micro-6x6'];
  const professions: readonly NpcProfessionArchetypeId[] = [
    'villager_farmer', 'blacksmith_artisan', 'town_guard', 'wandering_mage',
    'forest_ranger', 'merchant_trader', 'elder_scholar', 'miner_prospector'
  ];

  it('passes 8-direction continuity for default hero in 4x4 idle and 6x6 walk', () => {
    const idle = service.auditCharacterAnatomicalContinuity(
      DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, p4);
    const walk = service.auditCharacterAnatomicalContinuity(
      DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, p6, 'walk', 1, 6);
    expect(idle.passedAllDirections).toBe(true);
    expect(walk.passedAllDirections).toBe(true);
    for(const report of [idle, walk]) {
      expect(Object.keys(report.directionMetrics)).toHaveLength(8);
      for(const metrics of Object.values(report.directionMetrics)) {
        expect(metrics.bodyOpaquePixelCount).toBeGreaterThan(0);
        expect(metrics.headConnectedToTorso).toBe(true);
        expect(metrics.feetAnchoredToGround).toBe(true);
        expect(metrics.largestComponentRatio).toBeGreaterThanOrEqual(.92);
        expect(metrics.connectedComponentCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('makes deterministic and visually distinct presets for eight NPC professions', () => {
    const all = professions.map(profession => {
      const preset = service.generateNpcPreset(profession, 2026);
      expect(service.generateNpcPreset(profession, 2026)).toEqual(preset);
      const frame = generator.renderCharacterFrame(
        preset.appearance, preset.equipment, 'idle', 'S', 0, 4, p6);
      const audit = service.auditCharacterAnatomicalContinuity(
        preset.appearance, preset.equipment, p6);
      expect(audit.passedAllDirections).toBe(true);
      return frame;
    });
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
      expect(Array.from(all[i].buffer.data)).not.toEqual(Array.from(all[j].buffer.data));
    }
  });

  it('draws seven armor and trade outfit morphologies with identical primary colors', () => {
    const styles: ArmorStyleId[] = [
      'cloth_tunic', 'leather_vest', 'iron_plate', 'mage_robe',
      'farmer_overalls', 'blacksmith_apron', 'noble_coat'
    ];
    const frames=styles.map(armor=>generator.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,
      {...DEFAULT_HERO_EQUIPMENT,armor,hasCape:false,mainHand:'none',offHand:'none'},
      'idle','S',0,4,p6).buffer);
    for(let i=0;i<frames.length;i++)for(let j=i+1;j<frames.length;j++){
      expect(Array.from(frames[i].data)).not.toEqual(Array.from(frames[j].data));
    }
  });

  it('draws a visible backpack on North-facing sprite and not over the South face', () => {
    const bare={...DEFAULT_HERO_EQUIPMENT,hasCape:false,backpack:'none' as const};
    const packed={...bare,backpack:'miner_basket' as const,backpackColorHex:'#92400e'};
    const bareN=generator.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,bare,'idle','N',0,4,p6);
    const packN=generator.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,packed,'idle','N',0,4,p6);
    expect(Array.from(bareN.buffer.data)).not.toEqual(Array.from(packN.buffer.data));
    const bareS=generator.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,bare,'idle','S',0,4,p4);
    const packS=generator.renderCharacterFrame(
      DEFAULT_HERO_APPEARANCE,packed,'idle','S',0,4,p4);
    const hx=packS.pivotTexel[0]+packS.pose.joints.head.x;
    const hy=packS.pivotTexel[1]+packS.pose.joints.head.y;
    expect(packS.buffer.getPixel(hx,hy)).toEqual(bareS.buffer.getPixel(hx,hy));
    expect(packN.anchors.main_hand).toEqual(bareN.anchors.main_hand);
  });

  it('differentiates fantasy traits, age groups, additional hair styles and helmets', () => {
    const base={...DEFAULT_HERO_EQUIPMENT,mainHand:'none' as const,offHand:'none' as const,hasCape:false};
    const plain=generator.renderCharacterFrame(DEFAULT_HERO_APPEARANCE,base,'idle','S',0,4,p6);
    for (const change of [
      { earStyle:'fae_long' as const },
      { hornStyle:'curved_ram' as const },
      { faceMarking:'war_paint' as const },
      { ageGroup:'elder' as const },
      { hairStyle:'curly_afro' as const },
      { hairStyle:'braided_crown' as const }
    ]) {
      const styled=generator.renderCharacterFrame(
        {...DEFAULT_HERO_APPEARANCE,...change},base,'idle','S',0,4,p6);
      expect(Array.from(styled.buffer.data)).not.toEqual(Array.from(plain.buffer.data));
    }
    for(const helmet of ['miner_hardhat','wizard_pointed_hat','bandana'] as const){
      const styled=generator.renderCharacterFrame(
        DEFAULT_HERO_APPEARANCE,{...base,helmet},'idle','S',0,4,p6);
      expect(Array.from(styled.buffer.data)).not.toEqual(Array.from(plain.buffer.data));
    }
  });

  it('retains deterministic 8-direction spritesheet and anatomical anchors with profession gear', () => {
    const preset=service.generateNpcPreset('miner_prospector','reference-seed');
    const compiler=new SpritesheetCompiler();
    const sheetA=compiler.compileCharacterSheet(
      preset.appearance,preset.equipment,p4,['idle','walk'],ALL_DIRECTIONS_8);
    const sheetB=compiler.compileCharacterSheet(
      preset.appearance,preset.equipment,p4,['idle','walk'],ALL_DIRECTIONS_8);
    expect(Array.from(sheetA.atlasBuffer.data))
      .toEqual(Array.from(sheetB.atlasBuffer.data));
    const a=generator.renderCharacterFrame(
      preset.appearance,preset.equipment,'idle','S',0,4,p4);
    const b=generator.renderCharacterFrame(
      preset.appearance,{...preset.equipment,backpack:'none'},'idle','S',0,4,p4);
    expect(a.anchors.main_hand).toEqual(b.anchors.main_hand);
    expect(a.anchors.off_hand).toEqual(b.anchors.off_hand);
    expect(a.anchors.ground_pivot).toEqual(b.anchors.ground_pivot);
  });
});
