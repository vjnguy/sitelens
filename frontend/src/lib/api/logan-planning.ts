/**
 * Queensland Spatial Data API Integration
 * Connects to Queensland Government ArcGIS REST services for property analysis
 */

import type { FeatureCollection, Feature, Polygon, Geometry } from 'geojson';

// Queensland Government Spatial Services Base URL
const QLD_SPATIAL_BASE = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services';

// Service endpoints for Queensland state-wide layers
export const QLD_SERVICES = {
  // Cadastre (property boundaries) - Layer 4 is cadastral parcels
  cadastre: `${QLD_SPATIAL_BASE}/PlanningCadastre/LandParcelPropertyFramework/MapServer/4`,

  // Heritage Register - Layer 78
  heritageRegister: `${QLD_SPATIAL_BASE}/Boundaries/AdminBoundariesFramework/MapServer/78`,

  // Cultural Heritage - Indigenous cultural heritage
  culturalHeritage: `${QLD_SPATIAL_BASE}/Boundaries/CulturalHeritageBoundaries/MapServer/10`,

  // Flood Studies - Level 2 flood studies
  floodStudies: `${QLD_SPATIAL_BASE}/FloodCheck/FloodStudies/MapServer/0`,

  // Environmental Significance - MSES layers
  msesProtectedAreas: `${QLD_SPATIAL_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer/1`,
  msesWetlands: `${QLD_SPATIAL_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer/11`,
  msesWildlifeHabitat: `${QLD_SPATIAL_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer/21`,
  msesKoalaCore: `${QLD_SPATIAL_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer/23`,
  msesVegetation: `${QLD_SPATIAL_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer/15`,

  // Koala Plan
  koalaPlan: `${QLD_SPATIAL_BASE}/Environment/KoalaPlan/MapServer/0`,

  // Local Government Areas
  lga: `${QLD_SPATIAL_BASE}/Boundaries/AdminBoundariesFramework/MapServer/20`,
} as const;

// Overlay layer definitions with styling
export const OVERLAY_LAYERS = {
  cadastre: {
    id: 'cadastre',
    name: 'Property Boundaries',
    serviceUrl: QLD_SERVICES.cadastre,
    category: 'Planning',
    style: {
      type: 'line' as const,
      paint: {
        'line-color': '#ff6600',
        'line-width': 2,
      },
    },
    fillStyle: {
      type: 'fill' as const,
      paint: {
        'fill-color': '#ff6600',
        'fill-opacity': 0.1,
      },
    },
  },
  heritageRegister: {
    id: 'heritageRegister',
    name: 'Heritage Register',
    serviceUrl: QLD_SERVICES.heritageRegister,
    category: 'Heritage',
    style: {
      type: 'fill' as const,
      paint: {
        'fill-color': '#9b59b6',
        'fill-opacity': 0.4,
        'fill-outline-color': '#8e44ad',
      },
    },
    severity: 'high' as const,
    description: 'Queensland Heritage Register listed place',
  },
  culturalHeritage: {
    id: 'culturalHeritage',
    name: 'Cultural Heritage',
    serviceUrl: QLD_SERVICES.culturalHeritage,
    category: 'Heritage',
    style: {
      type: 'fill' as const,
      paint: {
        'fill-color': '#e67e22',
        'fill-opacity': 0.4,
        'fill-outline-color': '#d35400',
      },
    },
    severity: 'high' as const,
    description: 'Aboriginal and Torres Strait Islander cultural heritage area',
  },
  floodStudies: {
    id: 'floodStudies',
    name: 'Flood Study Areas',
    serviceUrl: QLD_SERVICES.floodStudies,
    category: 'Hazards',
    style: {
      type: 'fill' as const,
      paint: {
        'fill-color': '#3498db',
        'fill-opacity': 0.4,
        'fill-outline-color': '#2980b9',
      },
    },
    severity: 'high' as const,
    description: 'Area covered by flood study - check local flood maps for detail',
  },
  msesProtectedAreas: {
    id: 'msesProtectedAreas',
    name: 'Protected Areas (MSES)',
    serviceUrl: QLD_SERVICES.msesProtectedAreas,
    category: 'Environment',
    style: {
      type: 'fill' as const,
      paint: {
        'fill-color': '#27ae60',
        'fill-opacity': 0.4,
        'fill-outline-color': '#1e8449',
      },
    },
    severity: 'high' as const,
    description: 'Matter of State Environmental Significance - Protected Area',
  },
  msesWetlands: {
    id: 'msesWetlands',
    name: 'High Ecological Wetlands',
    serviceUrl: QLD_SERVICES.msesWetlands,
    category: 'Environment',
    style: {
      type: 'fill' as const,
      paint: {
        'fill-color': '#1abc9c',
        'fill-opacity': 0.4,
        'fill-outline-color': '#16a085',
      },
    },
    severity: 'medium' as const,
    description: 'High ecological significance wetland area',
  },
  msesWildlifeHabitat: {
    id: 'msesWildlifeHabitat',
    name: 'Wildlife Habitat (Endangered)',
    serviceUrl: QLD_SERVICES.msesWildlifeHabitat,
    category: 'Environment',
    style: {
      type: 'fill' as const,
      paint: {
        'fill-color': '#f39c12',
        'fill-opacity': 0.4,
        'fill-outline-color': '#d68910',
      },
    },
    severity: 'high' as const,
    description: 'Essential habitat for endangered or vulnerable wildlife',
  },
  msesKoalaCore: {
    id: 'msesKoalaCore',
    name: 'Koala Habitat (Core)',
    serviceUrl: QLD_SERVICES.msesKoalaCore,
    category: 'Environment',
    style: {
      type: 'fill' as const,
      paint: {
        'fill-color': '#95a5a6',
        'fill-opacity': 0.4,
        'fill-outline-color': '#7f8c8d',
      },
    },
    severity: 'medium' as const,
    description: 'SEQ Koala habitat - core area',
  },
  msesVegetation: {
    id: 'msesVegetation',
    name: 'Regulated Vegetation',
    serviceUrl: QLD_SERVICES.msesVegetation,
    category: 'Environment',
    style: {
      type: 'fill' as const,
      paint: {
        'fill-color': '#2ecc71',
        'fill-opacity': 0.3,
        'fill-outline-color': '#27ae60',
      },
    },
    severity: 'medium' as const,
    description: 'Category B endangered or of concern vegetation',
  },
} as const;

// Type for overlay keys
export type OverlayLayerId = keyof typeof OVERLAY_LAYERS;

interface ArcGISQueryParams {
  geometry?: string;
  geometryType?: string;
  spatialRel?: string;
  where?: string;
  outFields?: string;
  returnGeometry?: boolean;
  f?: string;
  inSR?: string;
  outSR?: string;
}

interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry: {
    rings?: number[][][];
    paths?: number[][][];
    x?: number;
    y?: number;
    points?: number[][];
  } | null;
}

interface ArcGISResponse {
  features?: ArcGISFeature[];
  geometryType?: string;
  spatialReference?: { wkid: number };
  error?: { message: string; code?: number; details?: string[] };
}

/**
 * Query an ArcGIS REST service
 */
async function queryArcGISService(
  serviceUrl: string,
  params: ArcGISQueryParams
): Promise<FeatureCollection> {
  const queryParams = new URLSearchParams();
  queryParams.set('f', 'json');
  queryParams.set('outSR', '4326');
  queryParams.set('returnGeometry', 'true');
  queryParams.set('outFields', '*');

  // Add optional params
  if (params.geometry) queryParams.set('geometry', params.geometry);
  if (params.geometryType) queryParams.set('geometryType', params.geometryType);
  if (params.spatialRel) queryParams.set('spatialRel', params.spatialRel);
  if (params.where) queryParams.set('where', params.where);
  if (params.inSR) queryParams.set('inSR', params.inSR);

  const url = `${serviceUrl}/query?${queryParams}`;

  // Use the proxy to avoid CORS
  const proxyUrl = `/api/spatial-proxy?url=${encodeURIComponent(url)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`ArcGIS query failed: ${response.statusText}`);
  }

  const data: ArcGISResponse = await response.json();

  if (data.error) {
    throw new Error(`ArcGIS error: ${data.error.message}`);
  }

  return arcgisToGeoJSON(data);
}

/**
 * Convert ArcGIS JSON to GeoJSON
 */
function arcgisToGeoJSON(arcgisData: ArcGISResponse): FeatureCollection {
  const features: Feature[] = (arcgisData.features || []).map((f, index) => {
    let geometry: Geometry | null = null;

    if (f.geometry) {
      if (f.geometry.rings) {
        geometry = {
          type: 'Polygon',
          coordinates: f.geometry.rings,
        };
      } else if (f.geometry.paths) {
        geometry = {
          type: f.geometry.paths.length > 1 ? 'MultiLineString' : 'LineString',
          coordinates: f.geometry.paths.length > 1 ? f.geometry.paths : f.geometry.paths[0],
        } as Geometry;
      } else if (f.geometry.x !== undefined && f.geometry.y !== undefined) {
        geometry = {
          type: 'Point',
          coordinates: [f.geometry.x, f.geometry.y],
        };
      } else if (f.geometry.points) {
        geometry = {
          type: 'MultiPoint',
          coordinates: f.geometry.points,
        };
      }
    }

    return {
      type: 'Feature' as const,
      id: index,
      properties: f.attributes,
      geometry: geometry!,
    };
  }).filter(f => f.geometry !== null);

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Search for a property by lot/plan
 */
export async function searchProperty(query: string): Promise<FeatureCollection> {
  // Try lot/plan search
  const lotPlanMatch = query.match(/^(\d+)\s*[\/\\]\s*(\w+\d+)$/i);

  let whereClause: string;
  if (lotPlanMatch) {
    const [, lot, plan] = lotPlanMatch;
    whereClause = `LOT = '${lot}' AND PLAN = '${plan.toUpperCase()}'`;
  } else {
    // Search by lot number or plan number
    whereClause = `LOT LIKE '%${query}%' OR PLAN LIKE '%${query.toUpperCase()}%'`;
  }

  return queryArcGISService(QLD_SERVICES.cadastre, {
    where: whereClause,
  });
}

/**
 * Get property by clicking on map (point intersection)
 */
export async function getPropertyAtPoint(lng: number, lat: number): Promise<FeatureCollection> {
  return queryArcGISService(QLD_SERVICES.cadastre, {
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
  });
}

/**
 * Get all overlays that intersect with a property boundary
 */
export async function getPropertyOverlays(
  propertyGeometry: Polygon
): Promise<Record<OverlayLayerId, FeatureCollection>> {
  const geometryJson = JSON.stringify({
    rings: propertyGeometry.coordinates,
    spatialReference: { wkid: 4326 },
  });

  const results: Record<string, FeatureCollection> = {};

  // Query overlays (excluding cadastre which is the property itself)
  const overlayKeys = Object.keys(OVERLAY_LAYERS).filter(k => k !== 'cadastre') as OverlayLayerId[];

  // Query all overlays in parallel
  const queries = overlayKeys.map(async (key) => {
    const layer = OVERLAY_LAYERS[key];
    try {
      const fc = await queryArcGISService(layer.serviceUrl, {
        geometry: geometryJson,
        geometryType: 'esriGeometryPolygon',
        spatialRel: 'esriSpatialRelIntersects',
      });
      return [key, fc] as const;
    } catch (error) {
      console.warn(`Failed to query ${key}:`, error);
      const emptyCollection: FeatureCollection = { type: 'FeatureCollection', features: [] };
      return [key, emptyCollection] as const;
    }
  });

  const queryResults = await Promise.all(queries);
  queryResults.forEach(([key, fc]) => {
    results[key] = fc;
  });

  return results as Record<OverlayLayerId, FeatureCollection>;
}

/**
 * Get a specific overlay layer for given bounds
 */
export async function getOverlayInBounds(
  layerId: OverlayLayerId,
  west: number,
  south: number,
  east: number,
  north: number
): Promise<FeatureCollection> {
  const layer = OVERLAY_LAYERS[layerId];
  if (!layer) {
    throw new Error(`Unknown layer: ${layerId}`);
  }

  const envelope = JSON.stringify({
    xmin: west,
    ymin: south,
    xmax: east,
    ymax: north,
    spatialReference: { wkid: 4326 },
  });

  return queryArcGISService(layer.serviceUrl, {
    geometry: envelope,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
  });
}

/**
 * Generate a property constraint report
 */
export interface PropertyConstraint {
  category: string;
  layerId: OverlayLayerId;
  name: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  description: string;
  featureCount: number;
  details?: Record<string, unknown>;
}

export function analyzePropertyConstraints(
  overlays: Record<string, FeatureCollection>
): PropertyConstraint[] {
  const constraints: PropertyConstraint[] = [];

  // Analyze each overlay
  Object.entries(overlays).forEach(([key, fc]) => {
    if (fc.features.length === 0) return;

    const layerConfig = OVERLAY_LAYERS[key as OverlayLayerId];
    if (!layerConfig) return;

    constraints.push({
      category: layerConfig.category,
      layerId: key as OverlayLayerId,
      name: layerConfig.name,
      severity: ('severity' in layerConfig ? layerConfig.severity : 'info') as PropertyConstraint['severity'],
      description: ('description' in layerConfig ? layerConfig.description : `${layerConfig.name} affects this property`) as string,
      featureCount: fc.features.length,
      details: fc.features[0]?.properties as Record<string, unknown>,
    });
  });

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
  constraints.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return constraints;
}

/**
 * Get available overlay layers
 */
export function getAvailableOverlayLayers() {
  return Object.entries(OVERLAY_LAYERS).map(([id, layer]) => ({
    id: id as OverlayLayerId,
    name: layer.name,
    category: layer.category,
    style: layer.style,
    serviceUrl: layer.serviceUrl,
  }));
}
