/**
 * Queensland Spatial Identify Service
 *
 * Queries MapServer layers at a clicked point to identify features.
 * This enables click-to-identify on raster tile layers.
 */

import type { Feature, FeatureCollection, Polygon } from 'geojson';
import {
  isInBrisbane,
  identifyBrisbaneOverlays,
  getBrisbanePropertyAtPoint,
  type BrisbaneIdentifyResult,
} from './brisbane-identify';

const QLD_GIS_BASE = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services';

// Layer configuration for identify queries
export interface IdentifyLayerConfig {
  id: string;
  name: string;
  mapServerUrl: string;
  layerIds: number[];
  category: 'Planning' | 'Heritage' | 'Environment' | 'Hazards' | 'Infrastructure' | 'Transport' | 'Airport';
  severity?: 'high' | 'medium' | 'low' | 'info';
  color: string;
}

// All queryable layers
export const IDENTIFY_LAYERS: IdentifyLayerConfig[] = [
  // Cadastre / Property
  {
    id: 'cadastre',
    name: 'Property Boundary',
    mapServerUrl: `${QLD_GIS_BASE}/PlanningCadastre/LandParcelPropertyFramework/MapServer`,
    layerIds: [4],
    category: 'Planning',
    color: '#ff6600',
  },
  // Heritage
  {
    id: 'heritage-register',
    name: 'Heritage Register',
    mapServerUrl: `${QLD_GIS_BASE}/Boundaries/AdminBoundariesFramework/MapServer`,
    layerIds: [78],
    category: 'Heritage',
    severity: 'high',
    color: '#9b59b6',
  },
  {
    id: 'cultural-heritage',
    name: 'Cultural Heritage',
    mapServerUrl: `${QLD_GIS_BASE}/Boundaries/CulturalHeritageBoundaries/MapServer`,
    layerIds: [10],
    category: 'Heritage',
    severity: 'high',
    color: '#e67e22',
  },
  // Environment
  {
    id: 'mses-protected',
    name: 'Protected Areas (MSES)',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer`,
    layerIds: [1],
    category: 'Environment',
    severity: 'high',
    color: '#27ae60',
  },
  {
    id: 'mses-wetlands',
    name: 'High Ecological Wetlands',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer`,
    layerIds: [11],
    category: 'Environment',
    severity: 'medium',
    color: '#1abc9c',
  },
  {
    id: 'mses-wildlife',
    name: 'Wildlife Habitat (Endangered)',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer`,
    layerIds: [21],
    category: 'Environment',
    severity: 'high',
    color: '#f39c12',
  },
  {
    id: 'mses-koala',
    name: 'Koala Habitat',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer`,
    layerIds: [23, 24],
    category: 'Environment',
    severity: 'medium',
    color: '#95a5a6',
  },
  {
    id: 'mses-vegetation',
    name: 'Regulated Vegetation',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer`,
    layerIds: [15],
    category: 'Environment',
    severity: 'medium',
    color: '#2ecc71',
  },
  {
    id: 'wetlands',
    name: 'Wetland Areas',
    mapServerUrl: `${QLD_GIS_BASE}/WetlandMaps/WetlandMapsOfQueensland/MapServer`,
    layerIds: [0, 1, 2],
    category: 'Environment',
    severity: 'medium',
    color: '#3498db',
  },
  {
    id: 'protected-areas',
    name: 'National Parks & Reserves',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/ParksTerrestrialProtectedAreas/MapServer`,
    layerIds: [0],
    category: 'Environment',
    severity: 'high',
    color: '#16a085',
  },
  // Hazards
  {
    id: 'flood-hazard',
    name: 'Flood Hazard Assessment',
    mapServerUrl: `${QLD_GIS_BASE}/FloodCheck/RapidHazardAssessment/MapServer`,
    layerIds: [0],
    category: 'Hazards',
    severity: 'high',
    color: '#1a5276',
  },
  {
    id: 'bushfire-prone',
    name: 'Bushfire Prone Area',
    mapServerUrl: `${QLD_GIS_BASE}/PlanningCadastre/SPPBushfireProneArea/MapServer`,
    layerIds: [0],
    category: 'Hazards',
    severity: 'high',
    color: '#e74c3c',
  },
  {
    id: 'landslide-hazard',
    name: 'Landslide Hazard',
    mapServerUrl: `${QLD_GIS_BASE}/PlanningCadastre/SPPLandslideHazardArea/MapServer`,
    layerIds: [0],
    category: 'Hazards',
    severity: 'high',
    color: '#8b4513',
  },
  {
    id: 'coastal-hazard',
    name: 'Coastal Hazard Area',
    mapServerUrl: `${QLD_GIS_BASE}/PlanningCadastre/SPPCoastalHazardAreas/MapServer`,
    layerIds: [0, 1],
    category: 'Hazards',
    severity: 'high',
    color: '#00bcd4',
  },
  {
    id: 'acid-sulfate',
    name: 'Acid Sulfate Soils',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/AcidSulfateSoils/MapServer`,
    layerIds: [0],
    category: 'Environment',
    severity: 'medium',
    color: '#ff9800',
  },
  // Infrastructure
  {
    id: 'power-easements',
    name: 'Power Line Easements',
    mapServerUrl: `${QLD_GIS_BASE}/Economy/HighVoltageElectricalNetwork/MapServer`,
    layerIds: [0, 1],
    category: 'Infrastructure',
    severity: 'medium',
    color: '#ffc107',
  },
];

// Result of an identify query
export interface IdentifyResult {
  layerId: string;
  layerName: string;
  category: string;
  severity?: 'high' | 'medium' | 'low' | 'info';
  color: string;
  features: Feature[];
  attributes: Record<string, unknown>[];
}

// Property information
export interface PropertyInfo {
  lot: string;
  plan: string;
  lotPlan: string;
  tenure: string;
  locality: string;
  lga: string;
  area: number;
  parcelType: string;
  geometry: Polygon | null;
}

// Complete site analysis result
export interface SiteAnalysis {
  coordinates: [number, number];
  property: PropertyInfo | null;
  constraints: IdentifyResult[];
  timestamp: Date;
}

/**
 * Query a MapServer identify endpoint
 */
async function queryMapServerIdentify(
  mapServerUrl: string,
  layerIds: number[],
  lng: number,
  lat: number,
  tolerance: number = 3
): Promise<any[]> {
  // Create a small envelope around the point for the identify
  const buffer = 0.0001; // ~10m at equator
  const geometry = JSON.stringify({
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  });

  const mapExtent = JSON.stringify({
    xmin: lng - 0.01,
    ymin: lat - 0.01,
    xmax: lng + 0.01,
    ymax: lat + 0.01,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    f: 'json',
    geometry: geometry,
    geometryType: 'esriGeometryPoint',
    sr: '4326',
    layers: `all:${layerIds.join(',')}`,
    tolerance: tolerance.toString(),
    mapExtent: mapExtent,
    imageDisplay: '400,400,96',
    returnGeometry: 'true',
    returnFieldName: 'true',
    returnUnformattedValues: 'false',
  });

  const url = `${mapServerUrl}/identify?${params.toString()}`;
  const proxyUrl = `/api/spatial-proxy?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      console.warn(`Identify failed for ${mapServerUrl}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`Identify error for ${mapServerUrl}:`, data.error);
      return [];
    }

    return data.results || [];
  } catch (error) {
    console.warn(`Identify exception for ${mapServerUrl}:`, error);
    return [];
  }
}

/**
 * Query cadastre for property at point
 */
export async function getPropertyAtPoint(lng: number, lat: number): Promise<PropertyInfo | null> {
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

    if (data.error || !data.features || data.features.length === 0) {
      return null;
    }

    const f = data.features[0];
    const attrs = f.attributes || {};

    return {
      lot: attrs.lot || attrs.LOT || '',
      plan: attrs.plan || attrs.PLAN || '',
      lotPlan: attrs.lotplan || attrs.LOTPLAN || `${attrs.lot || ''}/${attrs.plan || ''}`,
      tenure: attrs.tenure || attrs.TENURE || '',
      locality: attrs.locality || attrs.LOCALITY || '',
      lga: attrs.shire_name || attrs.SHIRE_NAME || attrs.lga || '',
      area: attrs.lot_area || attrs.LOT_AREA || attrs.AREA || 0,
      parcelType: attrs.parcel_typ || attrs.PARCEL_TYP || '',
      geometry: f.geometry?.rings ? {
        type: 'Polygon' as const,
        coordinates: f.geometry.rings,
      } : null,
    };
  } catch (error) {
    console.error('Failed to get property:', error);
    return null;
  }
}

/**
 * Identify all constraints at a point
 */
export async function identifyConstraintsAtPoint(
  lng: number,
  lat: number,
  layerIds?: string[]
): Promise<IdentifyResult[]> {
  // Filter layers if specific ones requested
  const layersToQuery = layerIds
    ? IDENTIFY_LAYERS.filter(l => layerIds.includes(l.id))
    : IDENTIFY_LAYERS.filter(l => l.id !== 'cadastre'); // Exclude cadastre from constraints

  // Query all layers in parallel
  const results = await Promise.all(
    layersToQuery.map(async (layer): Promise<IdentifyResult | null> => {
      const identifyResults = await queryMapServerIdentify(
        layer.mapServerUrl,
        layer.layerIds,
        lng,
        lat
      );

      if (identifyResults.length === 0) {
        return null;
      }

      // Convert to features
      const features: Feature[] = identifyResults.map((r, idx) => ({
        type: 'Feature' as const,
        id: idx,
        properties: r.attributes || {},
        geometry: r.geometry?.rings
          ? { type: 'Polygon' as const, coordinates: r.geometry.rings }
          : r.geometry?.paths
          ? { type: 'LineString' as const, coordinates: r.geometry.paths[0] }
          : r.geometry?.x !== undefined
          ? { type: 'Point' as const, coordinates: [r.geometry.x, r.geometry.y] }
          : null,
      })).filter(f => f.geometry !== null) as Feature[];

      return {
        layerId: layer.id,
        layerName: layer.name,
        category: layer.category,
        severity: layer.severity,
        color: layer.color,
        features,
        attributes: identifyResults.map(r => r.attributes || {}),
      };
    })
  );

  // Filter out null results and sort by severity
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };
  const filtered = results.filter((r): r is IdentifyResult => r !== null && r.features.length > 0);
  return filtered.sort((a, b) =>
    (severityOrder[a.severity || ''] ?? 4) -
    (severityOrder[b.severity || ''] ?? 4)
  );
}

/**
 * Perform complete site analysis at a point
 * For Brisbane properties, includes council-specific overlays
 */
export async function analyzeSite(lng: number, lat: number): Promise<SiteAnalysis> {
  const inBrisbane = isInBrisbane(lng, lat);

  // Query property and constraints in parallel
  // For Brisbane, also query council-specific overlays
  const [property, stateConstraints, brisbaneOverlays] = await Promise.all([
    // Try Brisbane property first if in Brisbane, fall back to QLD cadastre
    inBrisbane
      ? getBrisbanePropertyAtPoint(lng, lat).then(bccProp => {
          if (bccProp) {
            return {
              lot: bccProp.lotPlan.split('/')[0] || '',
              plan: bccProp.lotPlan.split('/')[1] || '',
              lotPlan: bccProp.lotPlan,
              tenure: '',
              locality: bccProp.suburb || '',
              lga: 'Brisbane',
              area: bccProp.area || 0,
              parcelType: '',
              geometry: bccProp.geometry,
            } as PropertyInfo;
          }
          return getPropertyAtPoint(lng, lat);
        })
      : getPropertyAtPoint(lng, lat),
    identifyConstraintsAtPoint(lng, lat),
    inBrisbane ? identifyBrisbaneOverlays(lng, lat) : Promise.resolve([]),
  ]);

  // Convert Brisbane overlays to IdentifyResult format and merge
  const brisbaneConstraints: IdentifyResult[] = brisbaneOverlays.map(overlay => ({
    layerId: overlay.layerId,
    layerName: `${overlay.layerName} (BCC)`,
    category: overlay.category,
    severity: overlay.severity === 'critical' ? 'high' : overlay.severity,
    color: overlay.color,
    features: overlay.features,
    attributes: overlay.attributes,
  }));

  // Merge constraints, Brisbane-specific first (more detailed), then state
  // Deduplicate by category to avoid showing both state and council flood data
  const seenCategories = new Set<string>();
  const mergedConstraints: IdentifyResult[] = [];

  // Add Brisbane constraints first (they're more specific)
  for (const constraint of brisbaneConstraints) {
    // Skip zoning/neighbourhood plan as info layers (not constraints)
    if (constraint.layerId === 'brisbane-zoning' || constraint.layerId === 'brisbane-neighbourhood-plan') {
      continue;
    }
    mergedConstraints.push(constraint);
    // Track flood/bushfire/landslide to avoid duplicating state data
    if (constraint.layerId.includes('flood')) {
      seenCategories.add('flood');
    } else if (constraint.layerId.includes('bushfire')) {
      seenCategories.add('bushfire');
    } else if (constraint.layerId.includes('landslide')) {
      seenCategories.add('landslide');
    }
  }

  // Add state constraints, skipping duplicates
  for (const constraint of stateConstraints) {
    const isFlood = constraint.layerId.includes('flood');
    const isBushfire = constraint.layerId.includes('bushfire');
    const isLandslide = constraint.layerId.includes('landslide');

    // Skip if we already have Brisbane-specific data for this type
    if (inBrisbane) {
      if (isFlood && seenCategories.has('flood')) continue;
      if (isBushfire && seenCategories.has('bushfire')) continue;
      if (isLandslide && seenCategories.has('landslide')) continue;
    }

    mergedConstraints.push(constraint);
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };
  mergedConstraints.sort((a, b) =>
    (severityOrder[a.severity || ''] ?? 4) - (severityOrder[b.severity || ''] ?? 4)
  );

  return {
    coordinates: [lng, lat],
    property,
    constraints: mergedConstraints,
    timestamp: new Date(),
  };
}

/**
 * Get a static map image URL for layer preview
 */
export function getLayerPreviewUrl(
  mapServerUrl: string,
  layerIds?: number[],
  width: number = 200,
  height: number = 120
): string {
  // Use a fixed extent covering SEQ region
  const bbox = '152.5,-28.5,153.5,-27.0';

  const params = new URLSearchParams({
    f: 'image',
    format: 'png32',
    transparent: 'true',
    bbox: bbox,
    bboxSR: '4326',
    imageSR: '4326',
    size: `${width},${height}`,
  });

  if (layerIds && layerIds.length > 0) {
    params.set('layers', `show:${layerIds.join(',')}`);
  }

  return `${mapServerUrl}/export?${params.toString()}`;
}

/**
 * Format property area for display
 */
export function formatArea(sqm: number): string {
  if (sqm >= 10000) {
    return `${(sqm / 10000).toFixed(2)} ha`;
  }
  return `${sqm.toLocaleString()} m²`;
}

/**
 * Get constraint summary counts
 */
export function getConstraintSummary(constraints: IdentifyResult[]): {
  total: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<string, number>;
} {
  const summary = {
    total: constraints.length,
    high: 0,
    medium: 0,
    low: 0,
    byCategory: {} as Record<string, number>,
  };

  constraints.forEach(c => {
    if (c.severity === 'high') summary.high++;
    else if (c.severity === 'medium') summary.medium++;
    else if (c.severity === 'low') summary.low++;

    summary.byCategory[c.category] = (summary.byCategory[c.category] || 0) + 1;
  });

  return summary;
}
