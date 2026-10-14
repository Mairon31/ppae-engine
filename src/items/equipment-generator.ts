import {
  ArtStyleProfile,
  ItemEquipmentDefinition,
  ItemMaterialTier,
} from '../core/contracts';
import { hexToRgba } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';

export const MATERIAL_TIER_PALETTES: Readonly<Record<ItemMaterialTier, { primary: string; secondary: string; highlight: string }>> = {
  wood: { primary: '#78350f', secondary: '#451a03', highlight: '#b45309' },
  stone: { primary: '#64748b', secondary: '#334155', highlight: '#94a3b8' },
  copper: { primary: '#c2410c', secondary: '#7c2d12', highlight: '#fb923c' },
  iron: { primary: '#94a3b8', secondary: '#475569', highlight: '#e2e8f0' },
  gold: { primary: '#eab308', secondary: '#854d0e', highlight: '#fef08a' },
  crystal: { primary: '#38bdf8', secondary: '#0369a1', highlight: '#e0f2fe' }
};

/**
 * Generador paramétrico de herramientas, armas y armaduras por grado de material y desgaste.
 * Aplica mellas y oxidación deterministas según `wearState`.
 */
export class EquipmentGenerator {
  public renderEquipmentItem(
    def: ItemEquipmentDefinition,
    profile: ArtStyleProfile
  ): PixelBuffer {
    const mod = profile.moduleSize;
    const w = 6 * mod;
    const h = 6 * mod;
    const buf = new PixelBuffer(w, h);
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    const pal = MATERIAL_TIER_PALETTES[def.tier];
    const mainCol = hexToRgba(pal.primary);
    const secCol = hexToRgba(pal.secondary);
    const highCol = hexToRgba(pal.highlight);
    const rustCol = hexToRgba('#7c2d12');
    const outlineCol = hexToRgba('#090d16');

    if (def.category === 'weapon_sword') {
      // Hoja de espada diagonal con empuñadura
      buf.drawLine(cx - 3, cy + 3, cx + 4, cy - 4, mainCol, Math.max(2, Math.round(mod * 0.35)));
      buf.drawLine(cx - 3, cy + 3, cx + 3, cy - 3, highCol, 1);
      // Guarda cruzada
      buf.fillRect(cx - 3, cy + 2, 4, 2, secCol);
      // Empuñadura y pomo
      buf.drawLine(cx - 3, cy + 3, cx - 5, cy + 5, hexToRgba('#451a03'), 2);
    } else if (def.category === 'tool_axe') {
      // Mango de madera + cabeza de hacha
      buf.drawLine(cx - 4, cy + 4, cx + 3, cy - 3, hexToRgba('#78350f'), 2);
      buf.fillRect(cx + 1, cy - 4, 3, 4, mainCol);
      buf.setPixel(cx + 3, cy - 4, highCol);
    } else if (def.category === 'armor_helmet') {
      // Yelmo defensivo
      buf.fillEllipse(cx, cy, Math.max(3, mod), Math.max(3, mod - 1), mainCol);
      buf.fillRect(cx - Math.floor(mod * 0.5), cy, mod, 2, secCol);
      buf.setPixel(cx, cy - 1, highCol);
    } else {
      // Lingote o material genérico
      buf.fillRect(cx - 3, cy - 2, 8, 5, mainCol);
      buf.fillRect(cx - 2, cy - 1, 6, 3, highCol);
    }

    // Aplicar desgaste superficial (mellas / oxidación) si está dañado o desgastado
    if (def.wearState === 'worn' || def.wearState === 'damaged') {
      const wearIntensity = def.wearState === 'damaged' ? 5 : 2;
      for (let i = 0; i < wearIntensity; i++) {
        const wx = (cx + i * 2) % (w - 2);
        const wy = (cy + i) % (h - 2);
        buf.setPixel(wx, wy, def.tier === 'iron' || def.tier === 'copper' ? rustCol : outlineCol);
      }
    }

    buf.applySelectiveOutline(outlineCol);
    return buf;
  }
}
