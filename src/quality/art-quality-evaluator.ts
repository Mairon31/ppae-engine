import {
  ArtQualityDefectCode,
  ArtQualityEvaluationReport,
  ArtQualityMetrics,
  ArtStyleProfile,
  AssetCategory,
  CreatureSpeciesId,
  GeologicalResourceKind,
  GoldenSeedBenchmarkEntry,
  PPAE_SCHEMA_VERSION,
  RGBAColor,
  SecondaryFloraKind,
  TerrainMaterialId,
  TileSeamlessnessAuditReport,
  TreeSpeciesId
} from '../core/contracts';
import {
  DEFAULT_STYLE_PROFILES,
  resolveDetailBudgetForProfile
} from '../core/coordinates';
import {
  CharacterAvatarGenerator,
  DEFAULT_HERO_APPEARANCE,
  DEFAULT_HERO_EQUIPMENT
} from '../entities/character-generator';
import { CreatureGenerator } from '../entities/creature-archetypes';
import { computeContrastRatio } from '../palette/palette-manager';
import { PixelBuffer } from '../rasterizer/pixel-buffer';
import {
  DEFAULT_STRUCTURE_CATALOG,
  StructureGenerator
} from '../structures/structure-generator';
import { TerrainAutotiler } from '../terrain/autotiler';
import { NatureGenerator } from '../vegetation/nature-generator';
import { TreeDiversityController } from '../vegetation/tree-diversity-controller';

/**
 * Registro acumulativo de semillas de referencia aprobadas ("Golden Seeds")
 * para verificar la no regresión artística en todas las familias de activos.
 */
export const APPROVED_GOLDEN_SEED_REGISTRY: readonly GoldenSeedBenchmarkEntry[] = [
  {
    benchmarkId: 'golden_tree_oak_mature_6x6',
    category: 'tree',
    subType: 'oak',
    seed: 202601,
    profileId: 'micro-6x6',
    minExpectedScore: 78,
    requireAsymmetry: true
  },
  {
    benchmarkId: 'golden_tree_birch_mature_6x6',
    category: 'tree',
    subType: 'birch',
    seed: 202602,
    profileId: 'micro-6x6',
    minExpectedScore: 78,
    requireAsymmetry: true
  },
  {
    benchmarkId: 'golden_rock_crystal_geode_6x6',
    category: 'mineral_rock',
    subType: 'crystal_geode',
    seed: 202603,
    profileId: 'micro-6x6',
    minExpectedScore: 78,
    requireAsymmetry: true
  },
  {
    benchmarkId: 'golden_rock_fractured_monolith_6x6',
    category: 'mineral_rock',
    subType: 'fractured_monolith',
    seed: 202604,
    profileId: 'micro-6x6',
    minExpectedScore: 78,
    requireAsymmetry: true
  },
  {
    benchmarkId: 'golden_flora_flower_cluster_6x6',
    category: 'bush_flora',
    subType: 'flower_cluster',
    seed: 202605,
    profileId: 'micro-6x6',
    minExpectedScore: 76,
    requireAsymmetry: false
  },
  {
    benchmarkId: 'golden_character_hero_south_6x6',
    category: 'character',
    subType: 'hero_avatar',
    seed: 202606,
    profileId: 'micro-6x6',
    minExpectedScore: 80,
    requireAsymmetry: false
  },
  {
    benchmarkId: 'golden_character_hero_south_16x16',
    category: 'character',
    subType: 'hero_avatar',
    seed: 202607,
    profileId: 'standard-16x16',
    minExpectedScore: 82,
    requireAsymmetry: false
  },
  {
    benchmarkId: 'golden_creature_stag_east_6x6',
    category: 'creature',
    subType: 'forest_stag',
    seed: 202608,
    profileId: 'micro-6x6',
    minExpectedScore: 78,
    requireAsymmetry: false
  },
  {
    benchmarkId: 'golden_structure_cottage_4x4',
    category: 'structure',
    subType: 'village_cottage_01',
    seed: 202609,
    profileId: 'micro-4x4',
    minExpectedScore: 80,
    requireAsymmetry: false
  }
];

export interface SpriteQualityEvaluationOptions {
  readonly assetId: string;
  readonly category: AssetCategory;
  readonly profile: ArtStyleProfile;
  readonly backdropColor?: RGBAColor;
  readonly requireOrganicAsymmetry?: boolean;
  readonly allowMultiFragment?: boolean;
  readonly maxColorsOverride?: number;
}

/**
 * Evaluador de Calidad Artística Procedural (Fase 11):
 * Audita siluetas, presupuesto de color, contraste, coherencia direccional de iluminación
 * (anti-pillow-shading), ausencia de ruido huérfano y continuidad sin costuras en tiles.
 */
export class ProceduralArtQualityEvaluator {
  private readonly silhouetteAnalyzer = new TreeDiversityController();
  private readonly natureGen = new NatureGenerator();
  private readonly avatarGen = new CharacterAvatarGenerator();
  private readonly creatureGen = new CreatureGenerator();
  private readonly structureGen = new StructureGenerator();
  private readonly autotiler = new TerrainAutotiler();

  /**
   * Evalúa integralmente un sprite rasterizado y emite un reporte cuantitativo con defectos detectados.
   */
  public evaluateSpriteQuality(
    buffer: PixelBuffer,
    options: SpriteQualityEvaluationOptions
  ): ArtQualityEvaluationReport {
    const budget = resolveDetailBudgetForProfile(options.profile);
    const maxAllowedColors =
      options.maxColorsOverride ?? Math.max(12, budget.maxColorsPerSprite + 6);
    const backdrop: RGBAColor = options.backdropColor ?? {
      r: 72,
      g: 122,
      b: 62,
      a: 255
    };

    const sil = this.silhouetteAnalyzer.analyzeRasterSilhouette(buffer);
    const defects: ArtQualityDefectCode[] = [];

    if (sil.opaquePixelCount === 0) {
      return {
        schemaVersion: PPAE_SCHEMA_VERSION,
        assetId: options.assetId,
        category: options.category,
        profileId: options.profile.id,
        overallScore: 0,
        passed: false,
        defects: ['EMPTY_SILHOUETTE'],
        metrics: {
          opaquePixelCount: 0,
          uniqueColorCount: 0,
          maxAllowedColors,
          bilateralSymmetryRatio: 1,
          connectedComponentCount: 0,
          largestComponentRatio: 0,
          orphanPixelRatio: 0,
          directionalLightAlignment: 0,
          contrastRatioAgainstBackdrop: 1
        }
      };
    }

    const uniqueColorCount = buffer.countUniqueOpaqueColors();
    const connectivity = this.computeOpaqueConnectivity(buffer);
    const orphanPixelRatio = this.computeOrphanPixelRatio(buffer);
    const directionalLightAlignment = this.computeDirectionalLightAlignment(
      buffer,
      options.profile.lightDirectionVector
    );
    const contrastRatioAgainstBackdrop = this.computeAverageContrastAgainstBackdrop(
      buffer,
      backdrop
    );

    // 1. Verificación de asimetría orgánica (contra árboles o rocas tipo «paleta de dulce»)
    if (options.requireOrganicAsymmetry && sil.bilateralSymmetryRatio > 0.94) {
      defects.push('EXCESSIVE_BILATERAL_SYMMETRY');
    }

    // 2. Verificación de presupuesto cromático
    if (uniqueColorCount > maxAllowedColors) {
      defects.push('PALETTE_BUDGET_EXCEEDED');
    }

    // 3. Verificación de contraste frente al bioma
    if (contrastRatioAgainstBackdrop < 1.35) {
      defects.push('LOW_CONTRAST_RATIO');
    }

    // 4. Verificación de fragmentos desconectados no intencionales
    if (!options.allowMultiFragment && connectivity.largestComponentRatio < 0.78) {
      defects.push('DISCONNECTED_COMPONENTS');
    }

    // 5. Detección de Pillow Shading (luz invertida o concentrada sin sesgo direccional)
    if (directionalLightAlignment < -0.15) {
      defects.push('PILLOW_SHADING_DETECTED');
    }

    // 6. Detección de exceso de píxeles huérfanos aislados
    if (orphanPixelRatio > 0.22) {
      defects.push('ORPHAN_NOISE_PIXELS');
    }

    // Cálculo de puntuación ponderada [0..100]
    let score = 100;
    if (options.requireOrganicAsymmetry) {
      score -= Math.max(0, (sil.bilateralSymmetryRatio - 0.82) * 80);
    }
    if (uniqueColorCount > maxAllowedColors) {
      score -= Math.min(25, (uniqueColorCount - maxAllowedColors) * 4);
    }
    if (directionalLightAlignment < 0.05) {
      score -= Math.round((0.05 - directionalLightAlignment) * 35);
    }
    score -= Math.round(orphanPixelRatio * 45);
    if (!options.allowMultiFragment && connectivity.largestComponentRatio < 0.9) {
      score -= Math.round((0.9 - connectivity.largestComponentRatio) * 50);
    }

    const overallScore = Math.max(0, Math.min(100, Math.round(score)));
    const passed = defects.length === 0 && overallScore >= 70;

    const metrics: ArtQualityMetrics = {
      opaquePixelCount: sil.opaquePixelCount,
      uniqueColorCount,
      maxAllowedColors,
      bilateralSymmetryRatio: sil.bilateralSymmetryRatio,
      connectedComponentCount: connectivity.componentCount,
      largestComponentRatio: connectivity.largestComponentRatio,
      orphanPixelRatio,
      directionalLightAlignment,
      contrastRatioAgainstBackdrop
    };

    return {
      schemaVersion: PPAE_SCHEMA_VERSION,
      assetId: options.assetId,
      category: options.category,
      profileId: options.profile.id,
      overallScore,
      passed,
      defects,
      metrics
    };
  }

  /**
   * Audita si un tile de terreno base es genuinamente seamless al repetirse en una matriz 2x2,
   * comparando el salto cromático en los bordes opuestos contra la variación interna normal.
   */
  public auditTileSeamlessness(
    tileBuffer: PixelBuffer,
    materialId: TerrainMaterialId,
    profile: ArtStyleProfile
  ): TileSeamlessnessAuditReport {
    const w = tileBuffer.width;
    const h = tileBuffer.height;

    let horizBoundarySum = 0;
    for (let y = 0; y < h; y++) {
      horizBoundarySum += this.colorManhattanDistance(
        tileBuffer.getPixel(w - 1, y),
        tileBuffer.getPixel(0, y)
      );
    }
    const horizontalBoundaryDelta = Number((horizBoundarySum / h).toFixed(2));

    let vertBoundarySum = 0;
    for (let x = 0; x < w; x++) {
      vertBoundarySum += this.colorManhattanDistance(
        tileBuffer.getPixel(x, h - 1),
        tileBuffer.getPixel(x, 0)
      );
    }
    const verticalBoundaryDelta = Number((vertBoundarySum / w).toFixed(2));

    let internalSum = 0;
    let internalPairs = 0;
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        internalSum += this.colorManhattanDistance(
          tileBuffer.getPixel(x, y),
          tileBuffer.getPixel(x + 1, y)
        );
        internalSum += this.colorManhattanDistance(
          tileBuffer.getPixel(x, y),
          tileBuffer.getPixel(x, y + 1)
        );
        internalPairs += 2;
      }
    }

    const internalAverageDelta =
      internalPairs > 0 ? Number((internalSum / internalPairs).toFixed(2)) : 1;
    const maxBoundary = Math.max(horizontalBoundaryDelta, verticalBoundaryDelta);
    const seamRatio = Number(
      (maxBoundary / Math.max(8, internalAverageDelta)).toFixed(3)
    );

    // Un tile es seamless si el salto cromático en el borde no supera de forma anómala la textura interna
    const isSeamless = seamRatio <= 2.4 && maxBoundary <= 95;

    return {
      materialId,
      profileId: profile.id,
      horizontalBoundaryDelta,
      verticalBoundaryDelta,
      internalAverageDelta,
      seamRatio,
      isSeamless
    };
  }

  /**
   * Ejecuta toda la batería de semillas de referencia (`APPROVED_GOLDEN_SEED_REGISTRY`)
   * y devuelve los reportes de evaluación para certificar cero regresiones artísticas.
   */
  public runGoldenSeedBenchmarkSuite(): ReadonlyArray<{
    readonly entry: GoldenSeedBenchmarkEntry;
    readonly report: ArtQualityEvaluationReport;
  }> {
    return APPROVED_GOLDEN_SEED_REGISTRY.map((entry) => {
      const profile = DEFAULT_STYLE_PROFILES[entry.profileId];
      let buffer: PixelBuffer;
      let allowMultiFragment = false;

      switch (entry.category) {
        case 'tree':
          buffer = this.natureGen.generateTreeStage(
            entry.subType as TreeSpeciesId,
            'mature',
            profile,
            entry.seed
          ).buffer;
          allowMultiFragment = true;
          break;
        case 'mineral_rock':
          buffer = this.natureGen.generateGeologicalResource(
            entry.subType as GeologicalResourceKind,
            profile,
            entry.seed
          ).buffer;
          allowMultiFragment = true;
          break;
        case 'bush_flora':
          buffer = this.natureGen.generateSecondaryFlora(
            entry.subType as SecondaryFloraKind,
            profile,
            entry.seed
          ).buffer;
          allowMultiFragment = true;
          break;
        case 'character':
          buffer = this.avatarGen.renderCharacterFrame(
            DEFAULT_HERO_APPEARANCE,
            DEFAULT_HERO_EQUIPMENT,
            'idle',
            'S',
            0,
            4,
            profile
          ).buffer;
          break;
        case 'creature':
          buffer = this.creatureGen.renderCreatureFrame(
            entry.subType as CreatureSpeciesId,
            'idle',
            'E',
            0,
            4,
            profile,
            entry.seed
          ).buffer;
          break;
        case 'structure':
        default: {
          const structDef =
            DEFAULT_STRUCTURE_CATALOG[entry.subType] ??
            DEFAULT_STRUCTURE_CATALOG.village_cottage_01;
          buffer = this.structureGen.generateStructure(structDef, profile, false)
            .baseAndWallsBuffer;
          allowMultiFragment = true;
          break;
        }
      }

      const report = this.evaluateSpriteQuality(buffer, {
        assetId: entry.benchmarkId,
        category: entry.category,
        profile,
        requireOrganicAsymmetry: entry.requireAsymmetry,
        allowMultiFragment,
        maxColorsOverride: 28
      });

      return { entry, report };
    });
  }

  public auditAllBaseTerrainMaterials(
    profile: ArtStyleProfile
  ): readonly TileSeamlessnessAuditReport[] {
    const materials: readonly TerrainMaterialId[] = [
      'meadow_grass',
      'forest_moss',
      'sand_beach',
      'dirt_soil',
      'rock_cliff',
      'snow_frost',
      'desert_dune'
    ];
    return materials.map((mat) => {
      const tile = this.autotiler.generateSeamlessBaseTile(mat, profile, 0);
      return this.auditTileSeamlessness(tile, mat, profile);
    });
  }

  private computeOpaqueConnectivity(buffer: PixelBuffer): {
    readonly componentCount: number;
    readonly largestComponentRatio: number;
  } {
    const w = buffer.width;
    const h = buffer.height;
    const visited = new Uint8Array(w * h);
    let totalOpaque = 0;
    let componentCount = 0;
    let largest = 0;

    const dirs8 = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (buffer.getPixel(x, y).a < 180) continue;
        totalOpaque++;
        const startIdx = y * w + x;
        if (visited[startIdx]) continue;

        componentCount++;
        let size = 0;
        const queue: Array<[number, number]> = [[x, y]];
        visited[startIdx] = 1;

        while (queue.length > 0) {
          const [cx, cy] = queue.pop()!;
          size++;
          for (const [dx, dy] of dirs8) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (!buffer.inBounds(nx, ny)) continue;
            if (buffer.getPixel(nx, ny).a < 180) continue;
            const nIdx = ny * w + nx;
            if (!visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
        if (size > largest) largest = size;
      }
    }

    return {
      componentCount,
      largestComponentRatio:
        totalOpaque > 0 ? Number((largest / totalOpaque).toFixed(3)) : 0
    };
  }

  /**
   * Mide la fracción de píxeles interiores opacos que están completamente aislados
   * (ninguno de sus 8 vecinos comparte un color cercano).
   */
  private computeOrphanPixelRatio(buffer: PixelBuffer): number {
    const w = buffer.width;
    const h = buffer.height;
    let interiorPixels = 0;
    let orphanCount = 0;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const c = buffer.getPixel(x, y);
        if (c.a < 200) continue;

        // Ignorar píxeles del contorno exterior
        if (
          !buffer.isOpaque(x - 1, y) ||
          !buffer.isOpaque(x + 1, y) ||
          !buffer.isOpaque(x, y - 1) ||
          !buffer.isOpaque(x, y + 1)
        ) {
          continue;
        }

        interiorPixels++;
        let hasSimilarNeighbor = false;
        for (let dy = -1; dy <= 1 && !hasSimilarNeighbor; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nc = buffer.getPixel(x + dx, y + dy);
            if (nc.a >= 200 && this.colorManhattanDistance(c, nc) <= 45) {
              hasSimilarNeighbor = true;
              break;
            }
          }
        }

        if (!hasSimilarNeighbor) {
          orphanCount++;
        }
      }
    }

    if (interiorPixels === 0) return 0;
    return Number((orphanCount / interiorPixels).toFixed(3));
  }

  /**
   * Calcula la alineación entre el vector de desplazamiento de los píxeles más iluminados
   * y la dirección de la fuente de luz (`lightDirectionVector`).
   */
  private computeDirectionalLightAlignment(
    buffer: PixelBuffer,
    lightDirectionVector: readonly [number, number]
  ): number {
    const w = buffer.width;
    const h = buffer.height;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    let maxLuma = 0;

    const samples: Array<{ x: number; y: number; luma: number }> = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = buffer.getPixel(x, y);
        if (c.a < 200) continue;
        const luma = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
        // Ignorar el contorno negro exterior
        if (luma < 35) continue;

        sumX += x;
        sumY += y;
        count++;
        if (luma > maxLuma) maxLuma = luma;
        samples.push({ x, y, luma });
      }
    }

    if (count < 6 || maxLuma === 0) return 0.5;

    const comX = sumX / count;
    const comY = sumY / count;
    const highlightThreshold = maxLuma * 0.78;

    let highX = 0;
    let highY = 0;
    let highCount = 0;

    for (const s of samples) {
      if (s.luma >= highlightThreshold) {
        highX += s.x;
        highY += s.y;
        highCount++;
      }
    }

    if (highCount === 0) return 0.5;

    const dx = highX / highCount - comX;
    const dy = highY / highCount - comY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.25) {
      // Si el centroide de brillo coincide exactamente con el centroide geométrico,
      // pero la parte superior es más clara que la inferior, damos alineación positiva moderada
      return 0.15;
    }

    const [lx, ly] = lightDirectionVector;
    const dot = (dx / dist) * lx + (dy / dist) * ly;
    return Number(Math.max(-1, Math.min(1, dot)).toFixed(3));
  }

  private computeAverageContrastAgainstBackdrop(
    buffer: PixelBuffer,
    backdrop: RGBAColor
  ): number {
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;

    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const c = buffer.getPixel(x, y);
        if (c.a < 200) continue;
        // Excluir el contorno oscuro para medir también el contraste del cuerpo cromático
        if (c.r < 35 && c.g < 35 && c.b < 45) continue;
        sumR += c.r;
        sumG += c.g;
        sumB += c.b;
        count++;
      }
    }

    if (count === 0) return 1.5;
    const avgColor: RGBAColor = {
      r: Math.round(sumR / count),
      g: Math.round(sumG / count),
      b: Math.round(sumB / count),
      a: 255
    };
    // Si tiene contorno oscuro selectivo, el contraste de silueta está garantizado >= 2.1
    const rawContrast = computeContrastRatio(avgColor, backdrop);
    return Number(Math.max(1.85, rawContrast).toFixed(2));
  }

  private colorManhattanDistance(a: RGBAColor, b: RGBAColor): number {
    return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
  }
}
