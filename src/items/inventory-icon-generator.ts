import { ArtStyleProfile, ItemEquipmentDefinition } from '../core/contracts';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { EquipmentGenerator } from './equipment-generator';

/**
 * Generador específico de íconos de inventario.
 * Compone los ítems bajo una rotación diagonal estandarizada y un marco transparente de 16x16 o 24x24 texels
 * con contorno completo de alto contraste, optimizado para celdas de HUD y Crafting.
 */
export class InventoryIconGenerator {
  private readonly equipmentGen = new EquipmentGenerator();

  public generateIcon(
    itemDef: ItemEquipmentDefinition,
    profile: ArtStyleProfile,
    iconSizeTexels = 20
  ): PixelBuffer {
    const sourceBuf = this.equipmentGen.renderEquipmentItem(itemDef, profile);
    const iconBuf = new PixelBuffer(iconSizeTexels, iconSizeTexels);

    const srcW = sourceBuf.width;
    const srcH = sourceBuf.height;
    const scale = Math.min(iconSizeTexels / srcW, iconSizeTexels / srcH) * 0.82;

    const destCenterX = Math.floor(iconSizeTexels / 2);
    const destCenterY = Math.floor(iconSizeTexels / 2);
    const srcCenterX = Math.floor(srcW / 2);
    const srcCenterY = Math.floor(srcH / 2);

    // Muestreo con rotación diagonal de 45 grados y escalado limpio para inventario
    const cos45 = 0.7071;
    const sin45 = 0.7071;

    for (let y = 0; y < iconSizeTexels; y++) {
      for (let x = 0; x < iconSizeTexels; x++) {
        const nx = (x - destCenterX) / scale;
        const ny = (y - destCenterY) / scale;

        // Rotación inversa
        const rotX = Math.round(nx * cos45 - ny * sin45 + srcCenterX);
        const rotY = Math.round(nx * sin45 + ny * cos45 + srcCenterY);

        if (rotX >= 0 && rotX < srcW && rotY >= 0 && rotY < srcH) {
          const srcColor = sourceBuf.getPixel(rotX, rotY);
          if (srcColor.a > 0) {
            iconBuf.setPixel(x, y, srcColor);
          }
        }
      }
    }

    iconBuf.applySelectiveOutline(hexToRgba('#050811'));
    return iconBuf;
  }
}
