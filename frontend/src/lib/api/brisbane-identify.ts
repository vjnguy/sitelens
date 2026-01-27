/**
 * Brisbane City Council Spatial Query Service
 *
 * Queries FeatureServer layers at a point to identify ALL overlays affecting a property.
 * Brisbane uses FeatureServer (vector) rather than MapServer (raster tiles).
 *
 * This queries the full Brisbane City Plan 2014 overlay suite.
 * Service names verified against: https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services
 */

import type { Feature, FeatureCollection, Polygon, Point } from 'geojson';

const BCC_ARCGIS = 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services';

// Brisbane council bounds for quick check
const BRISBANE_BOUNDS = {
  minLng: 152.66,
  maxLng: 153.32,
  minLat: -27.77,
  maxLat: -27.05,
};

/**
 * Check if a point is within Brisbane LGA
 */
export function isInBrisbane(lng: number, lat: number): boolean {
  return (
    lng >= BRISBANE_BOUNDS.minLng &&
    lng <= BRISBANE_BOUNDS.maxLng &&
    lat >= BRISBANE_BOUNDS.minLat &&
    lat <= BRISBANE_BOUNDS.maxLat
  );
}

// Brisbane layer configuration for queries
export interface BrisbaneLayerConfig {
  id: string;
  name: string;
  featureServerUrl: string;
  category: 'Planning' | 'Heritage' | 'Environment' | 'Hazards' | 'Infrastructure' | 'Transport' | 'Airport';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  color: string;
  displayField?: string;
  subcategoryField?: string;
}

// ============================================================================
// COMPREHENSIVE BRISBANE CITY PLAN 2014 OVERLAY LAYERS
// Service names verified against BCC ArcGIS REST services
// ============================================================================

export const BRISBANE_OVERLAY_LAYERS: BrisbaneLayerConfig[] = [
  // ============================================================================
  // ZONING & PLANNING
  // ============================================================================
  {
    id: 'brisbane-zoning',
    name: 'Zoning',
    featureServerUrl: `${BCC_ARCGIS}/Zoning/FeatureServer/0`,
    category: 'Planning',
    severity: 'info',
    color: '#3b82f6',
    displayField: 'ZONE_CODE',
  },
  {
    id: 'brisbane-neighbourhood-plan',
    name: 'Neighbourhood Plan',
    featureServerUrl: `${BCC_ARCGIS}/Neighbourhood_Plan_boundaries/FeatureServer/0`,
    category: 'Planning',
    severity: 'info',
    color: '#8b5cf6',
    displayField: 'LP',
  },
  {
    id: 'brisbane-np-precinct',
    name: 'Neighbourhood Plan Precinct',
    featureServerUrl: `${BCC_ARCGIS}/Neighbourhood_Plan_precints/FeatureServer/0`,
    category: 'Planning',
    severity: 'info',
    color: '#a855f7',
    displayField: 'PRECINCT',
  },
  {
    id: 'brisbane-np-subprecinct',
    name: 'Neighbourhood Plan Sub-precinct',
    featureServerUrl: `${BCC_ARCGIS}/Neighbourhood_Plan_sub_precints/FeatureServer/0`,
    category: 'Planning',
    severity: 'info',
    color: '#c084fc',
    displayField: 'SUBPRECINCT',
  },
  {
    id: 'brisbane-dwelling-character',
    name: 'Dwelling House Character',
    featureServerUrl: `${BCC_ARCGIS}/Dwelling_house_character_overlay/FeatureServer/0`,
    category: 'Planning',
    severity: 'medium',
    color: '#ec4899',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-commercial-character',
    name: 'Commercial Character Building',
    featureServerUrl: `${BCC_ARCGIS}/Commercial_character_building_overlay/FeatureServer/0`,
    category: 'Planning',
    severity: 'medium',
    color: '#d946ef',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-streetscape',
    name: 'Streetscape Hierarchy',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014_Streetscape_hierarchy_overlay_Streetscape_hierarchy/FeatureServer/0`,
    category: 'Planning',
    severity: 'low',
    color: '#14b8a6',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-active-frontage',
    name: 'Active Frontage (Residential)',
    featureServerUrl: `${BCC_ARCGIS}/Active_frontages_in_residential_zones_overlay/FeatureServer/0`,
    category: 'Planning',
    severity: 'low',
    color: '#22c55e',
    displayField: 'OVL2_DESC',
  },

  // ============================================================================
  // FLOOD HAZARDS
  // ============================================================================
  {
    id: 'brisbane-flood-river',
    name: 'Brisbane River Flood',
    featureServerUrl: `${BCC_ARCGIS}/Flood_overlay_Brisbane_River_flood_planning_area/FeatureServer/0`,
    category: 'Hazards',
    severity: 'high',
    color: '#1e40af',
    displayField: 'OVL2_DESC',
    subcategoryField: 'OVL2_CAT',
  },
  {
    id: 'brisbane-flood-creek',
    name: 'Creek/Waterway Flood',
    featureServerUrl: `${BCC_ARCGIS}/Flood_overlay_Creek_waterway_flood_planning_area/FeatureServer/0`,
    category: 'Hazards',
    severity: 'high',
    color: '#2563eb',
    displayField: 'OVL2_DESC',
    subcategoryField: 'OVL2_CAT',
  },
  {
    id: 'brisbane-flood-overland',
    name: 'Overland Flow Flood',
    featureServerUrl: `${BCC_ARCGIS}/Flood_overlay_Overland_flow/FeatureServer/0`,
    category: 'Hazards',
    severity: 'medium',
    color: '#60a5fa',
    displayField: 'OVL2_DESC',
  },

  // ============================================================================
  // OTHER HAZARDS
  // ============================================================================
  {
    id: 'brisbane-bushfire',
    name: 'Bushfire Overlay',
    featureServerUrl: `${BCC_ARCGIS}/Bushfire_overlay/FeatureServer/0`,
    category: 'Hazards',
    severity: 'high',
    color: '#dc2626',
    displayField: 'OVL2_DESC',
    subcategoryField: 'OVL2_CAT',
  },
  {
    id: 'brisbane-landslide',
    name: 'Landslide Overlay',
    featureServerUrl: `${BCC_ARCGIS}/Landslide_overlay/FeatureServer/0`,
    category: 'Hazards',
    severity: 'high',
    color: '#92400e',
    displayField: 'OVL2_DESC',
  },

  // ============================================================================
  // COASTAL HAZARDS
  // ============================================================================
  {
    id: 'brisbane-storm-tide',
    name: 'Coastal - Storm Tide',
    featureServerUrl: `${BCC_ARCGIS}/Coastal_hazard_overlay_Storm_tide/FeatureServer/0`,
    category: 'Hazards',
    severity: 'high',
    color: '#0891b2',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-coastal-erosion',
    name: 'Coastal - Erosion Prone',
    featureServerUrl: `${BCC_ARCGIS}/Coastal_hazard_overlay_coastal_erosion/FeatureServer/0`,
    category: 'Hazards',
    severity: 'high',
    color: '#0e7490',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-sea-level-rise',
    name: 'Coastal - Sea Level Rise',
    featureServerUrl: `${BCC_ARCGIS}/Coastal_hazard_overlay_Sea_level_rise/FeatureServer/0`,
    category: 'Hazards',
    severity: 'medium',
    color: '#06b6d4',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-coastal-management',
    name: 'Coastal Management District',
    featureServerUrl: `${BCC_ARCGIS}/Coastal_hazard_overlay_Coastal_management_district/FeatureServer/0`,
    category: 'Hazards',
    severity: 'medium',
    color: '#22d3ee',
    displayField: 'OVL2_DESC',
  },

  // ============================================================================
  // ENVIRONMENT & BIODIVERSITY
  // ============================================================================
  {
    id: 'brisbane-biodiversity',
    name: 'Biodiversity Areas',
    featureServerUrl: `${BCC_ARCGIS}/Biodiversity_areas_overlay_Biodiversity_areas/FeatureServer/0`,
    category: 'Environment',
    severity: 'medium',
    color: '#166534',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-koala',
    name: 'Koala Habitat',
    featureServerUrl: `${BCC_ARCGIS}/Biodiversity_areas_overlay_Koala_habitat_areas/FeatureServer/0`,
    category: 'Environment',
    severity: 'medium',
    color: '#65a30d',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-mses-areas',
    name: 'MSES Biodiversity Areas',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014__Biodiversity_areas_overlay_Biodiversity_MSES_areas/FeatureServer/0`,
    category: 'Environment',
    severity: 'high',
    color: '#15803d',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-acid-sulfate',
    name: 'Acid Sulfate Soils',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014_PotentialAndActual_acid_sulfate_soils_overlay/FeatureServer/0`,
    category: 'Environment',
    severity: 'medium',
    color: '#fbbf24',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-protected-native-veg',
    name: 'Protected Native Vegetation',
    featureServerUrl: `${BCC_ARCGIS}/Protected_Vegetation_Natural_Assets_Local_Law_2003_Significant_Native_Vegetation/FeatureServer/0`,
    category: 'Environment',
    severity: 'medium',
    color: '#22c55e',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-protected-urban-veg',
    name: 'Protected Urban Vegetation',
    featureServerUrl: `${BCC_ARCGIS}/Protected_Vegetation_Natural_Assets_Local_Law_2003_Significant_Urban_Vegetation/FeatureServer/0`,
    category: 'Environment',
    severity: 'medium',
    color: '#4ade80',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-waterway-wetland-veg',
    name: 'Waterway & Wetland Vegetation',
    featureServerUrl: `${BCC_ARCGIS}/Protected_Vegetation_Natural_Assets_Local_Law_2003_Waterway_and_Wetland_Vegetation/FeatureServer/0`,
    category: 'Environment',
    severity: 'medium',
    color: '#14b8a6',
    displayField: 'OVL2_DESC',
  },

  // ============================================================================
  // HERITAGE
  // ============================================================================
  {
    id: 'brisbane-heritage',
    name: 'Heritage Overlay',
    featureServerUrl: `${BCC_ARCGIS}/Heritage_overlay/FeatureServer/0`,
    category: 'Heritage',
    severity: 'high',
    color: '#7c3aed',
    displayField: 'DESCRIPTION',
  },
  {
    id: 'brisbane-heritage-adjoining',
    name: 'Area Adjoining Heritage',
    featureServerUrl: `${BCC_ARCGIS}/Heritage_overlay_Area_adjoining/FeatureServer/0`,
    category: 'Heritage',
    severity: 'medium',
    color: '#a78bfa',
    displayField: 'DESCRIPTION',
  },
  {
    id: 'brisbane-state-heritage',
    name: 'State Heritage Area',
    featureServerUrl: `${BCC_ARCGIS}/Heritage_overlay_State_heritage_area/FeatureServer/0`,
    category: 'Heritage',
    severity: 'high',
    color: '#6d28d9',
    displayField: 'DESCRIPTION',
  },

  // ============================================================================
  // AIRPORT ENVIRONS
  // ============================================================================
  {
    id: 'brisbane-airport-anef',
    name: 'Airport Noise (ANEF)',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014_Airport_environs_overlay_Australian_Noise_Exposure_Forecast_ANEF/FeatureServer/0`,
    category: 'Airport',
    severity: 'high',
    color: '#f97316',
    displayField: 'ANEF',
  },
  {
    id: 'brisbane-airport-ols',
    name: 'Airport OLS Contours',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014_Airport_environs_overlay_Obstacle_Limitation_Surfaces_OLS_contours/FeatureServer/0`,
    category: 'Airport',
    severity: 'high',
    color: '#ea580c',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-airport-height',
    name: 'Airport Height Restriction',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014_Airport_environs_overlay_Height_restriction_zones/FeatureServer/0`,
    category: 'Airport',
    severity: 'high',
    color: '#c2410c',
    displayField: 'HEIGHT_AHD',
  },
  {
    id: 'brisbane-airport-wildlife',
    name: 'Airport Bird/Bat Strike Zone',
    featureServerUrl: `${BCC_ARCGIS}/CP2014_Airport_environs_overlay_BirdBatStrikeZone_PublicSafety_Bird_and_bat_strike_zone/FeatureServer/0`,
    category: 'Airport',
    severity: 'medium',
    color: '#fb923c',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-airport-lighting',
    name: 'Airport Lighting Area',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014_Airport_environs_overlay_Light_intensity/FeatureServer/0`,
    category: 'Airport',
    severity: 'low',
    color: '#fdba74',
    displayField: 'OVL2_DESC',
  },

  // ============================================================================
  // INFRASTRUCTURE
  // ============================================================================
  {
    id: 'brisbane-high-voltage-substation',
    name: 'High Voltage Substation',
    featureServerUrl: `${BCC_ARCGIS}/CP2014_Regional_infrastructure_overlay_High_voltage_substations/FeatureServer/0`,
    category: 'Infrastructure',
    severity: 'medium',
    color: '#eab308',
    displayField: 'NAME',
  },
  {
    id: 'brisbane-powerlines',
    name: 'High Voltage Powerline',
    featureServerUrl: `${BCC_ARCGIS}/Regional_infrastructure_corridors_and_substations_overlay_High_voltage_powerline/FeatureServer/0`,
    category: 'Infrastructure',
    severity: 'medium',
    color: '#facc15',
    displayField: 'VOLTAGE',
  },
  {
    id: 'brisbane-hv-easement',
    name: 'High Voltage Easement',
    featureServerUrl: `${BCC_ARCGIS}/Regional_infrastructure_corridors_and_substations_overlay_High_voltage_easements/FeatureServer/0`,
    category: 'Infrastructure',
    severity: 'medium',
    color: '#fde047',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-pipeline',
    name: 'Petroleum Pipeline',
    featureServerUrl: `${BCC_ARCGIS}/Regional_infrastructure_corridors_and_substations_overlay_Petroleum_pipelines/FeatureServer/0`,
    category: 'Infrastructure',
    severity: 'high',
    color: '#dc2626',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-regional-infra',
    name: 'Regional Infrastructure Corridor',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014_Regional_infrastructure_corridors_and_substations_overlay_Major_Transport_Infras/FeatureServer/0`,
    category: 'Infrastructure',
    severity: 'medium',
    color: '#64748b',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-critical-infra',
    name: 'Critical Infrastructure',
    featureServerUrl: `${BCC_ARCGIS}/Critical_infrastructure_and_movement_network_overlay_Assets_infrastructure_and_movement/FeatureServer/0`,
    category: 'Infrastructure',
    severity: 'medium',
    color: '#475569',
    displayField: 'OVL2_DESC',
  },

  // ============================================================================
  // TRANSPORT IMPACTS
  // ============================================================================
  {
    id: 'brisbane-road-hierarchy',
    name: 'Road Hierarchy',
    featureServerUrl: `${BCC_ARCGIS}/Road_hierarchy/FeatureServer/0`,
    category: 'Transport',
    severity: 'info',
    color: '#6b7280',
    displayField: 'ROAD_TYPE',
  },
  {
    id: 'brisbane-freight-route',
    name: 'Primary Freight Route',
    featureServerUrl: `${BCC_ARCGIS}/Roads_hierarchy_overlay_Primary_freight_route/FeatureServer/0`,
    category: 'Transport',
    severity: 'low',
    color: '#78716c',
    displayField: 'ROUTE_NAME',
  },
  {
    id: 'brisbane-transport-noise',
    name: 'Transport Noise Corridor',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014_Transport_noise_corridor_overlay_Brisbane_road_centreline/FeatureServer/0`,
    category: 'Transport',
    severity: 'medium',
    color: '#a3a3a3',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-air-quality',
    name: 'Transport Air Quality Corridor',
    featureServerUrl: `${BCC_ARCGIS}/City_Plan_2014_Transport_air_quality_corridor_overlay_Transport_routes/FeatureServer/0`,
    category: 'Transport',
    severity: 'medium',
    color: '#94a3b8',
    displayField: 'OVL2_DESC',
  },

  // ============================================================================
  // EXTRACTIVE RESOURCES
  // ============================================================================
  {
    id: 'brisbane-extractive-key',
    name: 'Extractive Resource - Key Area',
    featureServerUrl: `${BCC_ARCGIS}/Extractive_resources_Key_resource_area/FeatureServer/0`,
    category: 'Planning',
    severity: 'medium',
    color: '#78350f',
    displayField: 'OVL2_DESC',
  },
  {
    id: 'brisbane-extractive-route',
    name: 'Extractive Resource - Haulage Route',
    featureServerUrl: `${BCC_ARCGIS}/Extractive_resources_overlay_Key_resource_route/FeatureServer/0`,
    category: 'Planning',
    severity: 'low',
    color: '#a16207',
    displayField: 'OVL2_DESC',
  },
];

// Result of a Brisbane layer query
export interface BrisbaneIdentifyResult {
  layerId: string;
  layerName: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  color: string;
  features: Feature[];
  attributes: Record<string, unknown>[];
  subcategory?: string;
}

/**
 * Query a Brisbane FeatureServer layer at a point
 */
async function queryFeatureServerAtPoint(
  featureServerUrl: string,
  lng: number,
  lat: number
): Promise<any[]> {
  // Create point geometry for spatial query
  const geometry = JSON.stringify({
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    f: 'json',
    geometry: geometry,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    returnGeometry: 'true',
  });

  const url = `${featureServerUrl}/query?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Don't warn for 404s - layer may not have data in this area
      if (response.status !== 404) {
        console.warn(`Brisbane query failed for ${featureServerUrl}: ${response.status}`);
      }
      return [];
    }

    const data = await response.json();

    if (data.error) {
      // Don't warn for common errors - layer may not exist or have different structure
      if (data.error.code !== 400) {
        console.warn(`Brisbane query error for ${featureServerUrl}:`, data.error);
      }
      return [];
    }

    return data.features || [];
  } catch (error) {
    // Silently fail - layer might not be available
    return [];
  }
}

/**
 * Query all Brisbane overlay layers at a point
 * Queries layers in parallel batches for performance
 */
export async function identifyBrisbaneOverlays(
  lng: number,
  lat: number
): Promise<BrisbaneIdentifyResult[]> {
  // Quick bounds check
  if (!isInBrisbane(lng, lat)) {
    return [];
  }

  // Query all layers in parallel
  const results = await Promise.all(
    BRISBANE_OVERLAY_LAYERS.map(async (layer): Promise<BrisbaneIdentifyResult | null> => {
      const queryResults = await queryFeatureServerAtPoint(
        layer.featureServerUrl,
        lng,
        lat
      );

      if (queryResults.length === 0) {
        return null;
      }

      // Convert ESRI geometry to GeoJSON features
      const features: Feature[] = [];

      queryResults.forEach((result, idx) => {
        let geometry: Feature['geometry'] | null = null;

        if (result.geometry?.rings) {
          geometry = {
            type: 'Polygon',
            coordinates: result.geometry.rings,
          };
        } else if (result.geometry?.paths) {
          geometry = {
            type: 'LineString',
            coordinates: result.geometry.paths[0],
          };
        } else if (result.geometry?.x !== undefined) {
          geometry = {
            type: 'Point',
            coordinates: [result.geometry.x, result.geometry.y],
          };
        }

        if (geometry) {
          features.push({
            type: 'Feature',
            id: idx,
            properties: result.attributes || {},
            geometry,
          });
        }
      });

      // Get subcategory from first result if available
      const subcategory = layer.subcategoryField
        ? String(queryResults[0]?.attributes?.[layer.subcategoryField] || '')
        : undefined;

      return {
        layerId: layer.id,
        layerName: layer.name,
        category: layer.category,
        severity: layer.severity,
        color: layer.color,
        features,
        attributes: queryResults.map((r) => r.attributes || {}),
        subcategory,
      };
    })
  );

  // Filter out null results and sort by severity
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  return results
    .filter((r): r is BrisbaneIdentifyResult => r !== null && r.features.length > 0)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Get Brisbane property at a point (from BCC cadastre)
 */
export async function getBrisbanePropertyAtPoint(
  lng: number,
  lat: number
): Promise<{
  lotPlan: string;
  address?: string;
  suburb?: string;
  area?: number;
  geometry: Polygon | null;
} | null> {
  if (!isInBrisbane(lng, lat)) {
    return null;
  }

  const url = `${BCC_ARCGIS}/property_boundaries_parcel/FeatureServer/0`;
  const results = await queryFeatureServerAtPoint(url, lng, lat);

  if (results.length === 0) {
    return null;
  }

  const attrs = results[0].attributes || {};
  const geometry = results[0].geometry?.rings
    ? { type: 'Polygon' as const, coordinates: results[0].geometry.rings }
    : null;

  return {
    lotPlan: attrs.LOTPLAN || `${attrs.LOT || ''}/${attrs.PLAN || ''}`,
    address: attrs.HOUSE_NUMBER
      ? `${attrs.HOUSE_NUMBER} ${attrs.CORRIDOR_NAME || ''}`
      : undefined,
    suburb: attrs.SUBURB || attrs.LOCALITY,
    area: attrs.LOT_AREA,
    geometry,
  };
}

/**
 * Get a formatted summary of Brisbane overlays for display
 */
export function getBrisbaneOverlaySummary(results: BrisbaneIdentifyResult[]): {
  zoning?: string;
  neighbourhoodPlan?: string;
  floodAreas: string[];
  hazards: string[];
  environment: string[];
  heritage: string[];
  airport: string[];
  infrastructure: string[];
  transport: string[];
  planning: string[];
} {
  const summary = {
    zoning: undefined as string | undefined,
    neighbourhoodPlan: undefined as string | undefined,
    floodAreas: [] as string[],
    hazards: [] as string[],
    environment: [] as string[],
    heritage: [] as string[],
    airport: [] as string[],
    infrastructure: [] as string[],
    transport: [] as string[],
    planning: [] as string[],
  };

  for (const result of results) {
    const displayValue = result.attributes[0]?.OVL2_DESC ||
      result.attributes[0]?.ZONE_CODE ||
      result.attributes[0]?.LP ||
      result.attributes[0]?.DESCRIPTION ||
      result.layerName;

    if (result.layerId === 'brisbane-zoning') {
      summary.zoning = String(displayValue);
    } else if (result.layerId === 'brisbane-neighbourhood-plan') {
      summary.neighbourhoodPlan = String(displayValue);
    } else if (result.layerId.includes('flood')) {
      summary.floodAreas.push(`${result.layerName}: ${displayValue}`);
    } else if (result.category === 'Hazards') {
      summary.hazards.push(`${result.layerName}: ${displayValue}`);
    } else if (result.category === 'Environment') {
      summary.environment.push(`${result.layerName}: ${displayValue}`);
    } else if (result.category === 'Heritage') {
      summary.heritage.push(`${result.layerName}: ${displayValue}`);
    } else if (result.category === 'Airport') {
      summary.airport.push(`${result.layerName}: ${displayValue}`);
    } else if (result.category === 'Infrastructure') {
      summary.infrastructure.push(`${result.layerName}: ${displayValue}`);
    } else if (result.category === 'Transport') {
      summary.transport.push(`${result.layerName}: ${displayValue}`);
    } else if (result.category === 'Planning') {
      summary.planning.push(`${result.layerName}: ${displayValue}`);
    }
  }

  return summary;
}

/**
 * Get total layer count for reference
 */
export const BRISBANE_LAYER_COUNT = BRISBANE_OVERLAY_LAYERS.length;
