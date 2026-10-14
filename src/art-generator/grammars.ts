import {
  AnchorPoint,
  ArtStyleProfile,
  PaletteDefinition,
  ProceduralAssetDefinition,
  RGBAColor,
  BotanicalFamilyId,
  TreeSpeciesDefinition,
  GeologicalResourceKind
} from '../core/contracts';
import { SeededRNG } from '../core/deterministic';
import { rgbaToHex } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import { BOTANICAL_SPECIES_DEFINITIONS, TreeMorphologyResolver } from '../vegetation/tree-morphology';
import { TreeSkeletonRasterizer } from '../vegetation/tree-skeleton-rasterizer';
import { TreeCanopyFoliageRasterizer } from '../vegetation/tree-foliage-rasterizer';
import { GeologicalMorphologyResolver, GEOLOGICAL_ARCHETYPE_CATALOG } from '../vegetation/geology-morphology';
import { GeologicalFormationRasterizer } from '../vegetation/geology-rasterizer';

export interface GrammarOutput {
  readonly buffer: PixelBuffer;
  readonly anchors: Record<string, AnchorPoint>;
}

export class ProceduralGrammarExecutor {
  private readonly morphologyResolver = new TreeMorphologyResolver();
  private readonly skeletonRasterizer = new TreeSkeletonRasterizer();
  private readonly foliageRasterizer = new TreeCanopyFoliageRasterizer();
  private readonly geologicalResolver = new GeologicalMorphologyResolver();
  private readonly geologicalRasterizer = new GeologicalFormationRasterizer();
  public execute(
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG,
    stateTag: 'intact' | 'damaged' | 'snowy' | 'wind_sway' = 'intact'
  ): GrammarOutput {
    const texelWidth = def.widthInModules * profile.moduleSize;
    const texelHeight = def.heightInModules * profile.moduleSize;
    const buffer = new PixelBuffer(texelWidth, texelHeight);

    switch (def.category) {
      case 'tree':
        return this.generateTree(buffer, def, profile, palette, rng, stateTag);
      case 'mineral_rock':
        return this.generateMineralRock(buffer, def, profile, palette, rng, stateTag);
      case 'bush_flora':
        return this.generateBushFlora(buffer, def, profile, palette, rng, stateTag);
      case 'weapon_blade':
        return this.generateWeaponBlade(buffer, def, profile, palette, rng);
      default:
        return this.generateTree(buffer, def, profile, palette, rng, stateTag);
    }
  }

  /**
   * Grammar trees now use the same morphology, wood and foliage synthesis as
   * world vegetation. The final nearest-neighbor fit preserves the catalogue
   * definition's exact dimensions and maps every pixel to its palette ramps.
   * No legacy cones, independent ellipse canopies or new colors are introduced.
   */
  private generateTree(
    buffer: PixelBuffer,
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG,
    stateTag: 'intact' | 'damaged' | 'snowy' | 'wind_sway'
  ): GrammarOutput {
    const foliage = palette.ramps[def.primaryRampId] ?? palette.ramps.foliage;
    const wood = palette.ramps[def.secondaryRampId] ?? palette.ramps.wood;
    const accent = def.accentRampId ? palette.ramps[def.accentRampId] : undefined;
    const botanicalIds = Object.keys(BOTANICAL_SPECIES_DEFINITIONS) as BotanicalFamilyId[];
    const family: BotanicalFamilyId = botanicalIds.includes(def.archetype as BotanicalFamilyId)
      ? def.archetype as BotanicalFamilyId
      : def.archetype === 'pine_conifer' || def.id.startsWith('pine_')
        ? 'pine' : 'oak';
    const baseSpecies = BOTANICAL_SPECIES_DEFINITIONS[family];
    // Use the palette ramp itself at source resolution: no hand-tuned color
    // changes can escape the final declared PaletteDefinition color budget.
    const styleColors: TreeSpeciesDefinition = {
      ...baseSpecies,
      woodColors: {
        outline: rgbaToHex(wood.outline),
        shadow: rgbaToHex(wood.shadow),
        midtone: rgbaToHex(wood.midtone),
        highlight: rgbaToHex(wood.highlight)
      },
      foliageColors: {
        outline: rgbaToHex(foliage.outline),
        shadow: rgbaToHex(foliage.shadow),
        midtone: rgbaToHex(foliage.midtone),
        highlight: rgbaToHex(foliage.highlight),
        ...(accent ? { fruitOrAccent: rgbaToHex(accent.midtone) } : {})
      }
    };
    const stage = stateTag === 'damaged' ? 'damaged' : 'mature';
    const windShift = stateTag === 'wind_sway'
      ? Math.max(1, Math.floor(profile.moduleSize / 2)) : 0;
    const descriptor = this.morphologyResolver.resolveTreeMorphology(
      family, stage, profile, rng.nextInt(0, 0xffffffff)
    );
    const skeleton = this.skeletonRasterizer.renderSkeleton(
      descriptor, profile, styleColors, windShift
    );
    const canopy = this.foliageRasterizer.renderCanopyAndCompose(
      descriptor, skeleton, profile, styleColors,
      stateTag === 'snowy' ? 'snowy' : 'normal', windShift
    );

    // At most N distinct opaque colors, selected exclusively from this palette.
    const declared: RGBAColor[] = [
      wood.outline, wood.shadow, wood.midtone, wood.highlight,
      foliage.outline, foliage.shadow, foliage.midtone, foliage.highlight,
      ...(accent ? [accent.midtone, accent.highlight] : []),
      foliage.accent
    ];
    const seen = new Set<string>();
    const permitted = declared.filter(color => {
      const key = `${color.r}:${color.g}:${color.b}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, Math.max(1, palette.maxColorsPerAsset));
    const source = canopy.compositeTreeBuffer;
    const width = buffer.width;
    const height = buffer.height;
    const scale = Math.min((width - 2) / source.width, (height - 2) / source.height);
    const fitWidth = Math.max(1, Math.min(width, Math.round(source.width * scale)));
    const fitHeight = Math.max(1, Math.min(height, Math.round(source.height * scale)));
    const left = Math.max(0, Math.min(width - fitWidth,
      Math.round(width / 2 - (canopy.pivotTexel[0] / source.width) * fitWidth)));
    const top = Math.max(0, Math.min(height - fitHeight,
      height - 2 - Math.round((canopy.pivotTexel[1] / source.height) * fitHeight)));

    // Quantization is deterministic, preserves every opaque silhouette pixel,
    // and does not introduce anti-aliasing or change the public raster dimensions.
    const quantize = (original: RGBAColor): RGBAColor => {
      let nearest = permitted[0];
      let distance = Infinity;
      for (const color of permitted) {
        const dr = color.r - original.r;
        const dg = color.g - original.g;
        const db = color.b - original.b;
        const delta = dr * dr + dg * dg + db * db;
        if (delta < distance) {
          nearest = color;
          distance = delta;
        }
      }
      return { ...nearest, a: original.a };
    };
    for (let y = 0; y < fitHeight; y++) {
      const sourceY = Math.min(source.height - 1,
        Math.floor((y + 0.5) * source.height / fitHeight));
      for (let x = 0; x < fitWidth; x++) {
        const sourceX = Math.min(source.width - 1,
          Math.floor((x + 0.5) * source.width / fitWidth));
        const pixel = source.getPixel(sourceX, sourceY);
        if (pixel.a > 0) buffer.setPixel(left + x, top + y, quantize(pixel));
      }
    }
    const canvasAnchor = (id: string, sx: number, sy: number): {
      id: string; texelX: number; texelY: number; normalizedX: number; normalizedY: number;
    } => {
      const texelX = Math.max(0, Math.min(width - 1,
        left + Math.round(sx * fitWidth / source.width)));
      const texelY = Math.max(0, Math.min(height - 1,
        top + Math.round(sy * fitHeight / source.height)));
      return { id, texelX, texelY, normalizedX: texelX / width, normalizedY: texelY / height };
    };
    return {
      buffer,
      anchors: {
        base_pivot: canvasAnchor(
          'base_pivot', canopy.pivotTexel[0], canopy.pivotTexel[1]
        ),
        canopy_center: canvasAnchor(
          'canopy_center', canopy.anchors.canopy_center.texelX,
          canopy.anchors.canopy_center.texelY
        )
      }
    };
  }

  /**
   * Catalog mineral and rock assets share the 2A/2B faceted geology pipeline.
   * Nearest-neighbor fitting preserves the exact module dimensions, and
   * palette quantization enforces maxColorsPerAsset without antialiasing.
   */
  private generateMineralRock(
    buffer: PixelBuffer,
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG,
    stateTag: 'intact' | 'damaged' | 'snowy' | 'wind_sway'
  ): GrammarOutput {
    const stone = palette.ramps[def.primaryRampId] ?? palette.ramps.stone;
    const mineral = palette.ramps[def.secondaryRampId] ?? palette.ramps.mineral_crystal;
    const family = def.archetype === 'crystal_vein'
      ? 'crystal_geode' : def.archetype;
    const kind: GeologicalResourceKind =
      Object.prototype.hasOwnProperty.call(GEOLOGICAL_ARCHETYPE_CATALOG, family)
        ? family as GeologicalResourceKind
        : 'angular_boulder';

    const descriptor = this.geologicalResolver.resolveGeologicalMorphology(
      kind, profile, rng.nextInt(0, 0x7fffffff)
    );
    const rendered = this.geologicalRasterizer.renderGeologicalFormation(
      descriptor, profile, stateTag
    );

    // Select a compact declared color ramp so accent/crystal detail remains
    // distinguishable and no arbitrary colors escape into the asset atlas.
    const colors: RGBAColor[] = [
      stone.outline, stone.shadow, stone.midtone, stone.highlight, stone.accent,
      mineral.outline, mineral.shadow, mineral.midtone, mineral.highlight, mineral.accent
    ];
    const used = new Set<string>();
    const permitted = colors.filter(c => {
      const key = `${c.r}:${c.g}:${c.b}`;
      if(used.has(key))return false;
      used.add(key);
      return true;
    }).slice(0,Math.max(1,palette.maxColorsPerAsset));
    const source = rendered.buffer;
    const width = buffer.width, height = buffer.height;
    const scale = Math.min((width-2)/source.width,(height-2)/source.height);
    const fitWidth = Math.max(1,Math.min(width,Math.round(source.width*scale)));
    const fitHeight = Math.max(1,Math.min(height,Math.round(source.height*scale)));
    const left = Math.max(0,Math.min(width-fitWidth,
      Math.round(width/2-(rendered.pivotTexel[0]/source.width)*fitWidth)));
    const top = Math.max(0,Math.min(height-fitHeight,
      height-2-Math.round((rendered.pivotTexel[1]/source.height)*fitHeight)));

    const nearest=(original:RGBAColor):RGBAColor=>{
      let best=permitted[0],distance=Infinity;
      for(const c of permitted){
        const dr=c.r-original.r,dg=c.g-original.g,db=c.b-original.b;
        const delta=dr*dr+dg*dg+db*db;
        if(delta<distance){best=c;distance=delta;}
      }
      return { ...best, a: original.a };
    };
    for(let y=0;y<fitHeight;y++){
      const sy=Math.min(source.height-1,Math.floor((y+.5)*source.height/fitHeight));
      for(let x=0;x<fitWidth;x++){
        const sx=Math.min(source.width-1,Math.floor((x+.5)*source.width/fitWidth));
        const p=source.getPixel(sx,sy);
        if(p.a>0)buffer.setPixel(left+x,top+y,nearest(p));
      }
    }

    const ax=Math.max(0,Math.min(width-1,
      left+Math.round(rendered.pivotTexel[0]*fitWidth/source.width)));
    const ay=Math.max(0,Math.min(height-1,
      top+Math.round(rendered.pivotTexel[1]*fitHeight/source.height)));
    return {
      buffer,
      anchors: {
        base_pivot: {
          id: 'base_pivot', texelX: ax, texelY: ay,
          normalizedX: ax/width, normalizedY: ay/height
        }
      }
    };
  }

  /**
   * Asymmetric shrub generation: primary woody twigs emerge from the soil,
   * independent leaf pads preserve openings, and berries occupy actual foliage.
   * Every shade comes from the biome palette (no new uncontrolled RGB tones).
   */
  private generateBushFlora(
    buffer: PixelBuffer,
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG,
    stateTag: 'intact' | 'damaged' | 'snowy' | 'wind_sway'
  ): GrammarOutput {
    const foliage = palette.ramps[def.primaryRampId] ?? palette.ramps.foliage;
    const berries = palette.ramps[def.secondaryRampId] ?? palette.ramps.berry_accent;
    const wood = palette.ramps.wood ?? foliage;
    const w=buffer.width,h=buffer.height,cx=Math.floor(w/2),baseY=h-2;
    const shift=stateTag==='wind_sway'?1:0;
    const count=rng.nextInt(3,5);
    const nodes:Array<{x:number;y:number;rx:number;ry:number}>=[];
    for(let i=0;i<count;i++){
      const norm=count===1?0:i/(count-1)*2-1;
      const x=Math.max(3,Math.min(w-4,Math.round(cx+norm*w*.24+rng.nextInt(-2,2)+shift)));
      const y=Math.max(3,Math.min(baseY-3,Math.floor(h*.56)+rng.nextInt(-3,2)));
      const rx=Math.max(2,Math.floor(w*rng.nextRange(.17,.25)));
      const ry=Math.max(2,Math.floor(h*rng.nextRange(.19,.26)));
      nodes.push({x,y,rx,ry});
      const branchBaseX=cx+rng.nextInt(-2,2);
      buffer.drawLine(branchBaseX,baseY,x,y+1,wood.shadow,1);
      buffer.setPixel(x,y+2,wood.midtone);
    }
    const upper=stateTag==='snowy'?foliage.accent:foliage.highlight;
    for(let i=0;i<nodes.length;i++){
      const {x,y,rx,ry}=nodes[i];
      if(stateTag==='damaged' && i===nodes.length-1)continue;
      // Separate posterior pads and discrete foreground leaves instead of a fixed 3-ellipse row.
      buffer.fillEllipse(x,y+1,rx,ry,foliage.shadow);
      buffer.fillEllipse(x-1,y,Math.max(1,rx-1),Math.max(1,ry-1),foliage.midtone);
      for(let j=0;j<Math.max(3,rx);j++){
        const ox=x+rng.nextInt(-rx+1,rx-1);
        const oy=y+rng.nextInt(-ry+1,Math.max(-ry+1,ry-1));
        if(buffer.isOpaque(ox,oy)){
          buffer.setPixel(ox,oy,oy<y?upper:foliage.midtone);
        }
      }
      buffer.fillRect(x-1,y-ry+1,Math.max(1,Math.floor(rx*.6)),1,upper);
    }
    const berryCount=rng.nextInt(4,8);
    let added=0,attempts=0;
    while(added<berryCount && attempts<berryCount*10){
      attempts++;
      const node=nodes[rng.nextInt(0,nodes.length-1)];
      const bx=node.x+rng.nextInt(-Math.max(1,node.rx-1),Math.max(1,node.rx-1));
      const by=node.y+rng.nextInt(-Math.max(1,node.ry-1),Math.max(1,node.ry-1));
      if(!buffer.isOpaque(bx,by))continue;
      buffer.setPixel(bx,by,berries.midtone);
      if(buffer.isOpaque(bx,by-1))buffer.setPixel(bx,by-1,berries.highlight);
      added++;
    }
    if(profile.outlineMode!=='none')buffer.applySelectiveOutline(foliage.outline);
    return {
      buffer,
      anchors:{base_pivot:{
        id:'base_pivot',texelX:cx,texelY:baseY,
        normalizedX:cx/w,normalizedY:baseY/h
      }}
    };
  }

  /**
   * Gramática de Armas y Herramientas (Espada / Hoja):
   * Genera pomo, empuñadura, guarda simétrica y hoja biselada con punto de anclaje de mano.
   */
  private generateWeaponBlade(
    buffer: PixelBuffer,
    def: ProceduralAssetDefinition,
    profile: ArtStyleProfile,
    palette: PaletteDefinition,
    rng: SeededRNG
  ): GrammarOutput {
    const bladeRamp = palette.ramps[def.primaryRampId] ?? palette.ramps.mineral_crystal;
    const hiltRamp = palette.ramps[def.secondaryRampId] ?? palette.ramps.wood;

    const w = buffer.width;
    const h = buffer.height;
    const cx = Math.floor(w / 2);

    const tipY = 2;
    const guardY = Math.floor(h * 0.72);
    const pommelY = h - 3;
    const bladeHalfWidth = Math.max(1, Math.floor(profile.moduleSize * 0.35));

    // Hoja con bisel izquierdo iluminado y derecho sombreado
    for (let y = tipY; y < guardY; y++) {
      const taper = y < tipY + 4 ? Math.max(0, y - tipY) : bladeHalfWidth;
      for (let dx = -taper; dx <= taper; dx++) {
        const tone =
          dx < 0 ? bladeRamp.highlight : dx === 0 ? bladeRamp.accent : bladeRamp.midtone;
        buffer.setPixel(cx + dx, y, tone);
      }
    }

    // Guarda cruzada
    const guardHalfSpan = Math.max(3, bladeHalfWidth + rng.nextInt(2, 4));
    buffer.fillRect(cx - guardHalfSpan, guardY, guardHalfSpan * 2 + 1, 2, hiltRamp.highlight);

    // Empuñadura y pomo
    buffer.fillRect(cx - 1, guardY + 2, 3, Math.max(2, pommelY - guardY - 2), hiltRamp.midtone);
    buffer.fillRect(cx - 2, pommelY, 5, 2, bladeRamp.midtone);

    if (profile.outlineMode !== 'none') {
      buffer.applySelectiveOutline(bladeRamp.outline);
    }

    const gripY = guardY + 3;
    return {
      buffer,
      anchors: {
        grip_anchor: {
          id: 'grip_anchor',
          texelX: cx,
          texelY: gripY,
          normalizedX: cx / w,
          normalizedY: gripY / h
        },
        blade_tip: {
          id: 'blade_tip',
          texelX: cx,
          texelY: tipY,
          normalizedX: cx / w,
          normalizedY: tipY / h
        }
      }
    };
  }
}
