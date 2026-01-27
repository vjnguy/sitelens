/**
 * Property Search Service
 *
 * Search properties by address, Lot/Plan, or coordinates
 */

import type { Polygon } from 'geojson';

const QLD_GIS_BASE = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services';

export interface PropertySearchResult {
  lotPlan: string;
  lot: string;
  plan: string;
  address?: string;
  locality: string;
  lga: string;
  area: number;
  tenure: string;
  parcelType: string;
  coordinates: [number, number]; // center point
  geometry: Polygon | null;
}

export interface SearchOptions {
  limit?: number;
}

/**
 * Parse a Lot/Plan string into components
 * Supports formats: "123/SP456789", "123 SP456789", "Lot 123 SP456789"
 */
export function parseLotPlan(input: string): { lot: string; plan: string } | null {
  // Clean up input
  const cleaned = input.trim().toUpperCase();

  // Pattern: LOT/PLAN or LOT PLAN (with optional "Lot" prefix)
  const patterns = [
    /^(?:LOT\s*)?(\d+)\s*[\/\s]\s*([A-Z]{1,3}\d+)$/i,  // 123/SP456789 or Lot 123 SP456789
    /^(\d+)\s*([A-Z]{1,3}\d+)$/i,                        // 123SP456789
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return { lot: match[1], plan: match[2] };
    }
  }

  return null;
}

/**
 * Search for property by Lot/Plan number
 */
export async function searchByLotPlan(
  lotPlan: string,
  options: SearchOptions = {}
): Promise<PropertySearchResult[]> {
  const parsed = parseLotPlan(lotPlan);
  if (!parsed) {
    throw new Error('Invalid Lot/Plan format. Use format like "123/SP456789"');
  }

  const { lot, plan } = parsed;

  // Query the cadastre layer
  const params = new URLSearchParams({
    f: 'json',
    where: `LOT = '${lot}' AND PLAN = '${plan}'`,
    outFields: '*',
    outSR: '4326',
    returnGeometry: 'true',
  });

  const url = `${QLD_GIS_BASE}/PlanningCadastre/LandParcelPropertyFramework/MapServer/4/query?${params.toString()}`;
  const proxyUrl = `/api/spatial-proxy?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Search failed');
    }

    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features.slice(0, options.limit || 10).map((f: any) => {
      const attrs = f.attributes || {};
      const geometry = f.geometry?.rings ? {
        type: 'Polygon' as const,
        coordinates: f.geometry.rings,
      } : null;

      // Calculate center point
      let center: [number, number] = [0, 0];
      if (geometry && geometry.coordinates[0]) {
        const coords = geometry.coordinates[0];
        const lngs = coords.map((c: number[]) => c[0]);
        const lats = coords.map((c: number[]) => c[1]);
        center = [
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2,
        ];
      }

      return {
        lotPlan: attrs.LOTPLAN || `${lot}/${plan}`,
        lot: attrs.LOT || lot,
        plan: attrs.PLAN || plan,
        locality: attrs.LOCALITY || '',
        lga: attrs.SHIRE_NAME || attrs.LGA || '',
        area: attrs.LOT_AREA || 0,
        tenure: attrs.TENURE || '',
        parcelType: attrs.PARCEL_TYP || '',
        coordinates: center,
        geometry,
      };
    });
  } catch (error) {
    console.error('Lot/Plan search failed:', error);
    throw error;
  }
}

/**
 * Search for properties by locality/suburb name
 */
export async function searchByLocality(
  locality: string,
  options: SearchOptions = {}
): Promise<PropertySearchResult[]> {
  const params = new URLSearchParams({
    f: 'json',
    where: `UPPER(LOCALITY) LIKE '%${locality.toUpperCase()}%'`,
    outFields: '*',
    outSR: '4326',
    returnGeometry: 'true',
    resultRecordCount: String(options.limit || 20),
  });

  const url = `${QLD_GIS_BASE}/PlanningCadastre/LandParcelPropertyFramework/MapServer/4/query?${params.toString()}`;
  const proxyUrl = `/api/spatial-proxy?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) return [];

    const data = await response.json();
    if (data.error || !data.features) return [];

    return data.features.map((f: any) => {
      const attrs = f.attributes || {};
      const geometry = f.geometry?.rings ? {
        type: 'Polygon' as const,
        coordinates: f.geometry.rings,
      } : null;

      let center: [number, number] = [0, 0];
      if (geometry && geometry.coordinates[0]) {
        const coords = geometry.coordinates[0];
        const lngs = coords.map((c: number[]) => c[0]);
        const lats = coords.map((c: number[]) => c[1]);
        center = [
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2,
        ];
      }

      return {
        lotPlan: attrs.LOTPLAN || '',
        lot: attrs.LOT || '',
        plan: attrs.PLAN || '',
        locality: attrs.LOCALITY || '',
        lga: attrs.SHIRE_NAME || '',
        area: attrs.LOT_AREA || 0,
        tenure: attrs.TENURE || '',
        parcelType: attrs.PARCEL_TYP || '',
        coordinates: center,
        geometry,
      };
    });
  } catch (error) {
    console.error('Locality search failed:', error);
    return [];
  }
}

/**
 * Unified search - detects search type and routes appropriately
 */
export async function searchProperties(
  query: string,
  options: SearchOptions = {}
): Promise<{ type: 'lotplan' | 'address' | 'locality'; results: PropertySearchResult[] }> {
  const trimmed = query.trim();

  // Check if it looks like a Lot/Plan
  if (parseLotPlan(trimmed)) {
    const results = await searchByLotPlan(trimmed, options);
    return { type: 'lotplan', results };
  }

  // Check if it's a short query (likely locality)
  if (trimmed.length < 20 && !trimmed.includes(',')) {
    const results = await searchByLocality(trimmed, options);
    if (results.length > 0) {
      return { type: 'locality', results };
    }
  }

  // Default to address search (will be handled by Mapbox geocoding externally)
  return { type: 'address', results: [] };
}

/**
 * Get property details by coordinates
 */
export async function getPropertyByCoordinates(
  lng: number,
  lat: number
): Promise<PropertySearchResult | null> {
  const params = new URLSearchParams({
    f: 'json',
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    returnGeometry: 'true',
  });

  const url = `${QLD_GIS_BASE}/PlanningCadastre/LandParcelPropertyFramework/MapServer/4/query?${params.toString()}`;
  const proxyUrl = `/api/spatial-proxy?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.error || !data.features || data.features.length === 0) return null;

    const f = data.features[0];
    const attrs = f.attributes || {};
    const geometry = f.geometry?.rings ? {
      type: 'Polygon' as const,
      coordinates: f.geometry.rings,
    } : null;

    return {
      lotPlan: attrs.LOTPLAN || '',
      lot: attrs.LOT || '',
      plan: attrs.PLAN || '',
      locality: attrs.LOCALITY || '',
      lga: attrs.SHIRE_NAME || '',
      area: attrs.LOT_AREA || 0,
      tenure: attrs.TENURE || '',
      parcelType: attrs.PARCEL_TYP || '',
      coordinates: [lng, lat],
      geometry,
    };
  } catch (error) {
    console.error('Coordinate search failed:', error);
    return null;
  }
}
