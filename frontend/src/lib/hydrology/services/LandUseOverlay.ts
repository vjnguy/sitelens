/**
 * Land Use Overlay Service
 *
 * Calculates impervious fractions and land use breakdown for subcatchments
 * using zonal statistics on land use raster data.
 *
 * Uses Australian default land use categories with impervious fractions.
 */

import type {
  ILandUseOverlay,
  LandUseOverlayInput,
  LandUseOverlayOutput,
  LandUseCategory,
  AustralianLandUseCategories,
  LandUseRaster,
  LandUseBreakdown,
  SubcatchmentLandUse,
  SubcatchmentProperties,
  GeoJSONFeatureCollection,
} from '../interfaces';
import { getCellsInPolygon, geoJSONPolygonAreaHectares } from '../utils/geometry';
import { getIndex, cellAreaHectares } from '../utils/grid';

/**
 * Australian default land use categories with impervious fractions
 *
 * Based on common Australian urban planning guidelines and
 * Water Sensitive Urban Design (WSUD) principles.
 */
export const AUSTRALIAN_LAND_USE_DEFAULTS: AustralianLandUseCategories = {
  RESIDENTIAL_LOW: {
    code: 1,
    name: 'Residential low density',
    imperviousFraction: 0.45,
  },
  RESIDENTIAL_MEDIUM: {
    code: 2,
    name: 'Residential medium density',
    imperviousFraction: 0.65,
  },
  RESIDENTIAL_HIGH: {
    code: 3,
    name: 'Residential high density',
    imperviousFraction: 0.85,
  },
  COMMERCIAL: {
    code: 4,
    name: 'Commercial',
    imperviousFraction: 0.85,
  },
  INDUSTRIAL: {
    code: 5,
    name: 'Industrial',
    imperviousFraction: 0.75,
  },
  ROADS: {
    code: 6,
    name: 'Roads',
    imperviousFraction: 0.90,
  },
  OPEN_SPACE: {
    code: 7,
    name: 'Open space',
    imperviousFraction: 0.10,
  },
  BUSH_FOREST: {
    code: 8,
    name: 'Bush/forest',
    imperviousFraction: 0.05,
  },
  WATER: {
    code: 9,
    name: 'Water',
    imperviousFraction: 0.0,
  },
  AGRICULTURE: {
    code: 10,
    name: 'Agriculture',
    imperviousFraction: 0.05,
  },
};

/**
 * Convert AustralianLandUseCategories to array for processing
 */
function getDefaultCategoriesArray(): LandUseCategory[] {
  return Object.values(AUSTRALIAN_LAND_USE_DEFAULTS);
}

export class LandUseOverlay implements ILandUseOverlay {
  /**
   * Get default Australian land use categories
   */
  getDefaultCategories(): AustralianLandUseCategories {
    return { ...AUSTRALIAN_LAND_USE_DEFAULTS };
  }

  /**
   * Calculate impervious fractions and land use breakdown for all subcatchments
   */
  async analyze(input: LandUseOverlayInput): Promise<LandUseOverlayOutput> {
    const { subcatchments, landUseRaster, lookupTable } = input;

    // Build lookup map for faster access
    const categoryMap = new Map<number, LandUseCategory>();
    for (const cat of lookupTable) {
      categoryMap.set(cat.code, cat);
    }

    const fractionImpervious: number[] = [];
    const breakdownBySubcatchment: SubcatchmentLandUse[] = [];

    let totalAreaHectares = 0;
    let totalImperviousArea = 0;
    const globalLandUseCounts = new Map<number, number>();

    for (const feature of subcatchments.features) {
      const polygon = feature.geometry as GeoJSON.Polygon;
      const properties = feature.properties as SubcatchmentProperties;

      // Get land use breakdown for this subcatchment
      const breakdown = this.zonalStatistics(polygon, landUseRaster, lookupTable);

      // Calculate area-weighted impervious fraction
      const subcatchmentArea = properties.areaHectares || geoJSONPolygonAreaHectares(polygon);
      let imperviousArea = 0;

      for (const item of breakdown) {
        imperviousArea += item.areaHectares * item.imperviousFraction;

        // Track global counts
        const current = globalLandUseCounts.get(item.categoryCode) || 0;
        globalLandUseCounts.set(item.categoryCode, current + item.cellCount);
      }

      const fi = subcatchmentArea > 0 ? imperviousArea / subcatchmentArea : 0;
      fractionImpervious.push(fi);

      totalAreaHectares += subcatchmentArea;
      totalImperviousArea += imperviousArea;

      breakdownBySubcatchment.push({
        subcatchmentId: properties.id,
        totalAreaHectares: subcatchmentArea,
        fractionImpervious: fi,
        breakdown,
      });
    }

    // Find dominant land use
    let dominantCode = 0;
    let maxCount = 0;
    for (const [code, count] of globalLandUseCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantCode = code;
      }
    }

    const dominantCategory = categoryMap.get(dominantCode);

    return {
      fractionImpervious,
      breakdownBySubcatchment,
      summary: {
        totalAreaHectares,
        overallImperviousFraction:
          totalAreaHectares > 0 ? totalImperviousArea / totalAreaHectares : 0,
        dominantLandUse: dominantCategory?.name || 'Unknown',
      },
    };
  }

  /**
   * Perform zonal statistics for a single polygon
   *
   * Calculates land use breakdown within the polygon boundary.
   */
  zonalStatistics(
    polygon: GeoJSON.Polygon,
    raster: LandUseRaster,
    categories: LandUseCategory[]
  ): LandUseBreakdown[] {
    const { data, metadata } = raster;
    const { cols, nodata } = metadata;

    // Build category lookup
    const categoryMap = new Map<number, LandUseCategory>();
    for (const cat of categories) {
      categoryMap.set(cat.code, cat);
    }

    // Get cells within polygon
    const cells = getCellsInPolygon(polygon, metadata);

    // Count cells by land use code
    const counts = new Map<number, number>();
    let totalValidCells = 0;

    for (const { row, col } of cells) {
      const idx = getIndex(row, col, cols);
      const code = data[idx];

      if (code !== nodata) {
        const current = counts.get(code) || 0;
        counts.set(code, current + 1);
        totalValidCells++;
      }
    }

    // Calculate area per cell
    const cellArea = cellAreaHectares(metadata.resolution);

    // Build breakdown
    const breakdown: LandUseBreakdown[] = [];

    for (const [code, count] of counts) {
      const category = categoryMap.get(code);
      const areaHectares = count * cellArea;

      breakdown.push({
        categoryCode: code,
        categoryName: category?.name || `Unknown (${code})`,
        cellCount: count,
        areaHectares,
        percentOfSubcatchment: totalValidCells > 0 ? (count / totalValidCells) * 100 : 0,
        imperviousFraction: category?.imperviousFraction ?? 0.5, // Default to 50% if unknown
      });
    }

    // Sort by area (largest first)
    breakdown.sort((a, b) => b.areaHectares - a.areaHectares);

    return breakdown;
  }
}

/**
 * Factory function to create a LandUseOverlay service
 */
export function createLandUseOverlay(): ILandUseOverlay {
  return new LandUseOverlay();
}

/**
 * Helper function to create a lookup table from custom categories
 */
export function createLookupTable(
  categories: Array<{
    code: number;
    name: string;
    imperviousFraction: number;
  }>
): LandUseCategory[] {
  return categories.map((cat) => ({
    code: cat.code,
    name: cat.name,
    imperviousFraction: Math.max(0, Math.min(1, cat.imperviousFraction)),
  }));
}

/**
 * Merge Australian defaults with custom overrides
 */
export function mergeWithDefaults(
  overrides: Partial<Record<keyof AustralianLandUseCategories, Partial<LandUseCategory>>>
): LandUseCategory[] {
  const merged = { ...AUSTRALIAN_LAND_USE_DEFAULTS };

  for (const key of Object.keys(overrides) as Array<keyof AustralianLandUseCategories>) {
    if (merged[key]) {
      merged[key] = {
        ...merged[key],
        ...overrides[key],
      };
    }
  }

  return Object.values(merged);
}
