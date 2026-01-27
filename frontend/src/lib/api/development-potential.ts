/**
 * Development Potential Analysis
 *
 * Analyzes a property's development potential including:
 * - Subdivision potential based on zoning minimum lot sizes
 * - Infrastructure/services proximity
 * - Building footprint and site coverage
 */

import type { Feature, Polygon, Point, LineString, Position } from 'geojson';

const BCC_ARCGIS = 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services';
const UU_ARCGIS = 'https://services3.arcgis.com/ocUCNI2h4moKOpKX/arcgis/rest/services';

// Brisbane zoning minimum lot sizes (from City Plan 2014)
// Source: https://www.brisbane.qld.gov.au/planning-and-building/planning-guidelines-and-tools/brisbane-city-plan-2014
export const BRISBANE_ZONING_LOT_SIZES: Record<string, {
  minLotSize: number;      // m²
  minFrontage: number;     // m
  maxSiteCover?: number;   // percentage
  maxBuildingHeight?: number; // storeys or metres
  description: string;
}> = {
  // Residential Zones
  'LDR': { minLotSize: 400, minFrontage: 10, maxSiteCover: 50, maxBuildingHeight: 9.5, description: 'Low Density Residential' },
  'LMR': { minLotSize: 400, minFrontage: 10, maxSiteCover: 50, maxBuildingHeight: 12, description: 'Low-Medium Density Residential' },
  'MDR': { minLotSize: 800, minFrontage: 20, maxSiteCover: 50, description: 'Medium Density Residential' },
  'HDR': { minLotSize: 1000, minFrontage: 20, description: 'High Density Residential' },
  'CR': { minLotSize: 2000, minFrontage: 30, maxSiteCover: 30, description: 'Character Residential' },
  'ER': { minLotSize: 2000, minFrontage: 40, maxSiteCover: 25, description: 'Environmental Residential' },
  'RR': { minLotSize: 10000, minFrontage: 60, maxSiteCover: 15, description: 'Rural Residential' },

  // Centre Zones
  'NC': { minLotSize: 400, minFrontage: 10, description: 'Neighbourhood Centre' },
  'DC': { minLotSize: 800, minFrontage: 15, description: 'District Centre' },
  'MC': { minLotSize: 1000, minFrontage: 20, description: 'Major Centre' },
  'PC': { minLotSize: 1000, minFrontage: 20, description: 'Principal Centre' },
  'CC': { minLotSize: 600, minFrontage: 15, description: 'Capital City Centre' },
  'SC': { minLotSize: 600, minFrontage: 15, description: 'Specialised Centre' },

  // Mixed Use
  'MU': { minLotSize: 600, minFrontage: 15, description: 'Mixed Use' },

  // Industry
  'LI': { minLotSize: 1000, minFrontage: 20, description: 'Low Impact Industry' },
  'MI': { minLotSize: 2000, minFrontage: 30, description: 'Medium Impact Industry' },
  'HI': { minLotSize: 4000, minFrontage: 40, description: 'High Impact Industry' },
  'SI': { minLotSize: 20000, minFrontage: 60, description: 'Special Industry' },

  // Other
  'CF': { minLotSize: 800, minFrontage: 15, description: 'Community Facilities' },
  'OS': { minLotSize: 2000, minFrontage: 20, description: 'Open Space' },
  'RL': { minLotSize: 100000, minFrontage: 100, description: 'Rural' },
  'SP': { minLotSize: 2000, minFrontage: 20, description: 'Special Purpose' },
};

// Infrastructure service types
export interface InfrastructureService {
  type: 'stormwater' | 'transport' | 'parks' | 'sewer' | 'power';
  name: string;
  status: 'existing' | 'planned' | 'unknown';
  distance?: number;  // metres from property
  features: Feature[];
  attributes: Record<string, unknown>[];
}

// Service connection location relative to property
export type ServiceLocation = 'frontage' | 'rear' | 'side' | 'on-lot' | 'adjacent-lot' | 'unknown';

// Service connection analysis result
export interface ServiceConnection {
  type: 'water' | 'sewer';
  available: boolean;
  nearestDistance: number | null;  // metres
  location: ServiceLocation;
  connectionFeasibility: 'easy' | 'moderate' | 'challenging' | 'unknown';
  details: {
    pipeSize?: string;
    pipeMaterial?: string;
    pipeAge?: number;
    depth?: number;
  };
  notes: string[];
  nearestFeature: Feature | null;
}

// Full services connection assessment
export interface ServicesAssessment {
  water: ServiceConnection;
  sewer: ServiceConnection;
  overallFeasibility: 'straightforward' | 'requires-investigation' | 'challenging';
  recommendations: string[];
}

// Subdivision potential result
export interface SubdivisionPotential {
  currentArea: number;           // m²
  zoningCode: string;
  zoningDescription: string;
  minLotSize: number;           // m²
  minFrontage: number;          // m
  maxPotentialLots: number;
  practicalLots: number;        // accounting for access, setbacks
  accessRequired: boolean;       // needs new road/driveway
  constraints: string[];         // flood, heritage, etc. that may limit
}

// Building footprint info
export interface BuildingFootprint {
  area: number;                  // m²
  percentage: number;            // site coverage %
  geometry: Polygon | null;
  source: 'satellite' | 'osm' | 'cadastre' | 'mock';
}

// Full development potential analysis
export interface DevelopmentPotential {
  property: {
    lotPlan: string;
    area: number;
    frontage?: number;
    geometry: Polygon | null;
  };
  zoning: {
    code: string;
    description: string;
    minLotSize: number;
    minFrontage: number;
    maxSiteCover?: number;
    maxBuildingHeight?: number;
  } | null;
  subdivision: SubdivisionPotential | null;
  infrastructure: InfrastructureService[];
  building: BuildingFootprint | null;
  constraints: string[];
  servicesAssessment: ServicesAssessment | null;
}

/**
 * Query a FeatureServer layer at a point
 */
async function queryFeatureServerAtPoint(
  url: string,
  lng: number,
  lat: number
): Promise<any[]> {
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

  try {
    const response = await fetch(`${url}/query?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.error) return [];
    return data.features || [];
  } catch {
    return [];
  }
}

/**
 * Query features within a buffer distance of a point
 */
async function queryFeaturesNearPoint(
  url: string,
  lng: number,
  lat: number,
  bufferMeters: number = 100
): Promise<any[]> {
  // Create a rough buffer in degrees (1 degree ≈ 111km at equator)
  const bufferDeg = bufferMeters / 111000;

  const geometry = JSON.stringify({
    xmin: lng - bufferDeg,
    ymin: lat - bufferDeg,
    xmax: lng + bufferDeg,
    ymax: lat + bufferDeg,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    f: 'json',
    geometry: geometry,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    returnGeometry: 'true',
  });

  try {
    const response = await fetch(`${url}/query?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.error) return [];
    return data.features || [];
  } catch {
    return [];
  }
}

/**
 * Get zoning for a property
 */
export async function getPropertyZoning(lng: number, lat: number): Promise<{
  code: string;
  description: string;
  minLotSize: number;
  minFrontage: number;
  maxSiteCover?: number;
  maxBuildingHeight?: number;
} | null> {
  const results = await queryFeatureServerAtPoint(
    `${BCC_ARCGIS}/Zoning/FeatureServer/0`,
    lng,
    lat
  );

  if (results.length === 0) return null;

  const attrs = results[0].attributes || {};
  const zoneCode = attrs.ZONE_CODE || attrs.ZN_CODE || '';

  // Extract the zone abbreviation (e.g., "LDR" from "Low density residential")
  const zoneAbbrev = zoneCode.split(' ')[0]?.toUpperCase() || zoneCode;

  const zoneInfo = BRISBANE_ZONING_LOT_SIZES[zoneAbbrev];

  if (zoneInfo) {
    return {
      code: zoneCode,
      description: zoneInfo.description,
      minLotSize: zoneInfo.minLotSize,
      minFrontage: zoneInfo.minFrontage,
      maxSiteCover: zoneInfo.maxSiteCover,
      maxBuildingHeight: zoneInfo.maxBuildingHeight,
    };
  }

  // Default fallback for unknown zones
  return {
    code: zoneCode,
    description: attrs.ZONE_NAME || attrs.ZN_DESC || 'Unknown Zone',
    minLotSize: 600,
    minFrontage: 15,
  };
}

/**
 * Calculate subdivision potential for a property
 */
export function calculateSubdivisionPotential(
  area: number,
  frontage: number | undefined,
  zoning: { code: string; description: string; minLotSize: number; minFrontage: number } | null,
  constraints: string[]
): SubdivisionPotential | null {
  if (!zoning) return null;

  const { minLotSize, minFrontage, code, description } = zoning;

  // Calculate maximum theoretical lots
  const maxPotentialLots = Math.floor(area / minLotSize);

  // Calculate practical lots (accounting for access requirements)
  // Rear lots typically need 3m access strip
  let practicalLots = maxPotentialLots;
  let accessRequired = false;

  if (maxPotentialLots > 1) {
    // For 2+ lots, rear lots need access
    // Access strip of ~50m² per rear lot
    const accessArea = (maxPotentialLots - 1) * 50;
    const usableArea = area - accessArea;
    practicalLots = Math.floor(usableArea / minLotSize);
    accessRequired = true;
  }

  // Check frontage constraints
  const effectiveFrontage = frontage || 20; // Assume 20m if unknown
  const maxFromFrontage = Math.floor(effectiveFrontage / minFrontage);

  if (maxFromFrontage < practicalLots) {
    practicalLots = maxFromFrontage;
  }

  // Reduce if significant constraints
  const severeConstraints = constraints.filter(c =>
    c.toLowerCase().includes('flood') ||
    c.toLowerCase().includes('heritage') ||
    c.toLowerCase().includes('landslide') ||
    c.toLowerCase().includes('bushfire')
  );

  if (severeConstraints.length > 0) {
    // Constraints may prevent subdivision
    practicalLots = Math.min(practicalLots, 1);
  }

  return {
    currentArea: area,
    zoningCode: code,
    zoningDescription: description,
    minLotSize,
    minFrontage,
    maxPotentialLots,
    practicalLots,
    accessRequired: accessRequired && practicalLots > 1,
    constraints: severeConstraints,
  };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate minimum distance from a point to a line segment
 */
function pointToLineDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return calculateDistance(py, px, y1, x1);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;

  return calculateDistance(py, px, nearestY, nearestX);
}

/**
 * Calculate minimum distance from a point to a polyline
 */
function pointToPolylineDistance(point: [number, number], coordinates: Position[]): number {
  let minDistance = Infinity;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i] as [number, number];
    const end = coordinates[i + 1] as [number, number];
    const dist = pointToLineDistance(point, start, end);
    minDistance = Math.min(minDistance, dist);
  }

  return minDistance;
}

/**
 * Determine service location relative to property
 */
function determineServiceLocation(
  propertyCenter: [number, number],
  propertyGeometry: Polygon | null,
  serviceCoordinates: Position[] | null,
  nearestPoint: [number, number] | null
): ServiceLocation {
  if (!propertyGeometry || !nearestPoint) return 'unknown';

  const [propLng, propLat] = propertyCenter;
  const [svcLng, svcLat] = nearestPoint;

  // Get property bounds to determine front/rear/side
  const coords = propertyGeometry.coordinates[0];
  if (coords.length < 4) return 'unknown';

  // Calculate property centroid
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  for (const coord of coords) {
    minLng = Math.min(minLng, coord[0]);
    maxLng = Math.max(maxLng, coord[0]);
    minLat = Math.min(minLat, coord[1]);
    maxLat = Math.max(maxLat, coord[1]);
  }

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  // Determine direction of service from property center
  const dLng = svcLng - centerLng;
  const dLat = svcLat - centerLat;

  // Calculate property dimensions
  const propWidth = calculateDistance(centerLat, minLng, centerLat, maxLng);
  const propHeight = calculateDistance(minLat, centerLng, maxLat, centerLng);

  // Assume front is typically the shorter side (road frontage)
  // For most lots, width < height means front/back are north/south
  const isWiderThanTall = propWidth > propHeight;

  // Calculate distance from service to property boundary
  const distFromCenter = calculateDistance(centerLat, centerLng, svcLat, svcLng);
  const avgDimension = (propWidth + propHeight) / 4; // Half of average dimension

  // If service is very close to or within property bounds
  if (distFromCenter < avgDimension * 0.3) {
    return 'on-lot';
  }

  // Determine relative position
  const absLng = Math.abs(dLng);
  const absLat = Math.abs(dLat);

  if (isWiderThanTall) {
    // Wide lot - front/rear are likely east/west (lng direction)
    if (absLng > absLat) {
      // Assume lower addresses are towards front (this is a simplification)
      return dLng < 0 ? 'frontage' : 'rear';
    } else {
      return 'side';
    }
  } else {
    // Tall lot - front/rear are likely north/south (lat direction)
    if (absLat > absLng) {
      // Assume front is towards south (street) in Australia
      return dLat < 0 ? 'frontage' : 'rear';
    } else {
      return 'side';
    }
  }
}

/**
 * Query Urban Utilities service mains near a property
 */
async function queryUrbanUtilitiesMains(
  lng: number,
  lat: number,
  serviceType: 'water' | 'sewer',
  bufferMeters: number = 150
): Promise<{ features: any[]; nearest: any | null; distance: number | null }> {
  // Use the main layers for water and sewer
  const layerUrl = serviceType === 'water'
    ? `${UU_ARCGIS}/UU_Water_OpenData/FeatureServer/21`  // Water Mains
    : `${UU_ARCGIS}/UU_Sewer_OpenData/FeatureServer/18`; // Sewer Gravity Mains

  const features = await queryFeaturesNearPoint(layerUrl, lng, lat, bufferMeters);

  if (features.length === 0) {
    return { features: [], nearest: null, distance: null };
  }

  // Find the nearest feature
  let nearestFeature: any = null;
  let minDistance = Infinity;

  for (const feature of features) {
    if (feature.geometry?.paths) {
      for (const path of feature.geometry.paths) {
        const dist = pointToPolylineDistance([lng, lat], path);
        if (dist < minDistance) {
          minDistance = dist;
          nearestFeature = feature;
        }
      }
    }
  }

  return {
    features,
    nearest: nearestFeature,
    distance: nearestFeature ? Math.round(minDistance) : null,
  };
}

/**
 * Analyze service connection feasibility
 */
function analyzeConnectionFeasibility(
  distance: number | null,
  location: ServiceLocation,
  serviceType: 'water' | 'sewer'
): 'easy' | 'moderate' | 'challenging' | 'unknown' {
  if (distance === null) return 'unknown';

  // Sewer is more complex due to gravity requirements
  if (serviceType === 'sewer') {
    if (location === 'rear' || location === 'adjacent-lot') {
      return 'challenging';
    }
    if (distance < 20 && (location === 'frontage' || location === 'side')) {
      return 'easy';
    }
    if (distance < 50) {
      return 'moderate';
    }
    return 'challenging';
  }

  // Water is generally easier (pressurized)
  if (distance < 30 && location === 'frontage') {
    return 'easy';
  }
  if (distance < 60) {
    return 'moderate';
  }
  return 'challenging';
}

/**
 * Analyze services connections for a property
 */
export async function analyzeServicesConnections(
  lng: number,
  lat: number,
  propertyGeometry: Polygon | null
): Promise<ServicesAssessment> {
  // Query water and sewer mains in parallel
  const [waterResult, sewerResult] = await Promise.all([
    queryUrbanUtilitiesMains(lng, lat, 'water', 150),
    queryUrbanUtilitiesMains(lng, lat, 'sewer', 150),
  ]);

  const propertyCenter: [number, number] = [lng, lat];

  // Analyze water connection
  const waterLocation = determineServiceLocation(
    propertyCenter,
    propertyGeometry,
    waterResult.nearest?.geometry?.paths?.[0] || null,
    waterResult.nearest?.geometry?.paths?.[0]?.[0] || null
  );

  const waterFeasibility = analyzeConnectionFeasibility(
    waterResult.distance,
    waterLocation,
    'water'
  );

  const waterNotes: string[] = [];
  if (waterResult.distance !== null) {
    waterNotes.push(`Nearest water main is ${waterResult.distance}m away`);
    if (waterLocation === 'frontage') {
      waterNotes.push('Water main is at property frontage - standard connection');
    } else if (waterLocation === 'rear') {
      waterNotes.push('Water main at rear may require longer service run');
    }
  } else {
    waterNotes.push('No water mains found within 150m');
    waterNotes.push('Contact Urban Utilities for service availability');
  }

  const waterConnection: ServiceConnection = {
    type: 'water',
    available: waterResult.features.length > 0,
    nearestDistance: waterResult.distance,
    location: waterLocation,
    connectionFeasibility: waterFeasibility,
    details: {
      pipeSize: waterResult.nearest?.attributes?.NOMINAL_DIAMETER
        ? `${waterResult.nearest.attributes.NOMINAL_DIAMETER}mm`
        : undefined,
      pipeMaterial: waterResult.nearest?.attributes?.MATERIAL || undefined,
      pipeAge: waterResult.nearest?.attributes?.YEAR_LAID
        ? new Date().getFullYear() - waterResult.nearest.attributes.YEAR_LAID
        : undefined,
    },
    notes: waterNotes,
    nearestFeature: waterResult.nearest ? {
      type: 'Feature',
      properties: waterResult.nearest.attributes,
      geometry: {
        type: 'LineString',
        coordinates: waterResult.nearest.geometry?.paths?.[0] || [],
      },
    } : null,
  };

  // Analyze sewer connection
  const sewerLocation = determineServiceLocation(
    propertyCenter,
    propertyGeometry,
    sewerResult.nearest?.geometry?.paths?.[0] || null,
    sewerResult.nearest?.geometry?.paths?.[0]?.[0] || null
  );

  const sewerFeasibility = analyzeConnectionFeasibility(
    sewerResult.distance,
    sewerLocation,
    'sewer'
  );

  const sewerNotes: string[] = [];
  if (sewerResult.distance !== null) {
    sewerNotes.push(`Nearest sewer main is ${sewerResult.distance}m away`);

    if (sewerLocation === 'frontage') {
      sewerNotes.push('Sewer at frontage - gravity connection likely possible');
    } else if (sewerLocation === 'rear') {
      sewerNotes.push('⚠️ Rear sewer detected - check for existing easement');
      sewerNotes.push('May require easement negotiation with neighbours');
    } else if (sewerLocation === 'adjacent-lot') {
      sewerNotes.push('⚠️ Sewer crosses adjacent property');
      sewerNotes.push('Easement required - check property title');
    } else if (sewerLocation === 'side') {
      sewerNotes.push('Sewer on side boundary - check easement requirements');
    }

    // Check pipe depth for gravity feasibility
    const depth = sewerResult.nearest?.attributes?.INVERT_DEPTH ||
                  sewerResult.nearest?.attributes?.DEPTH;
    if (depth && depth > 1.5) {
      sewerNotes.push(`Main depth: ~${depth}m - gravity connection feasible`);
    } else if (depth && depth < 1.5) {
      sewerNotes.push(`Shallow main (~${depth}m) - may require pump system`);
    }
  } else {
    sewerNotes.push('No sewer mains found within 150m');
    sewerNotes.push('Property may require on-site sewerage system');
    sewerNotes.push('Contact Urban Utilities to confirm service area');
  }

  const sewerConnection: ServiceConnection = {
    type: 'sewer',
    available: sewerResult.features.length > 0,
    nearestDistance: sewerResult.distance,
    location: sewerLocation,
    connectionFeasibility: sewerFeasibility,
    details: {
      pipeSize: sewerResult.nearest?.attributes?.NOMINAL_DIAMETER
        ? `${sewerResult.nearest.attributes.NOMINAL_DIAMETER}mm`
        : undefined,
      pipeMaterial: sewerResult.nearest?.attributes?.MATERIAL || undefined,
      pipeAge: sewerResult.nearest?.attributes?.YEAR_LAID
        ? new Date().getFullYear() - sewerResult.nearest.attributes.YEAR_LAID
        : undefined,
      depth: sewerResult.nearest?.attributes?.INVERT_DEPTH ||
             sewerResult.nearest?.attributes?.DEPTH,
    },
    notes: sewerNotes,
    nearestFeature: sewerResult.nearest ? {
      type: 'Feature',
      properties: sewerResult.nearest.attributes,
      geometry: {
        type: 'LineString',
        coordinates: sewerResult.nearest.geometry?.paths?.[0] || [],
      },
    } : null,
  };

  // Determine overall feasibility
  let overallFeasibility: 'straightforward' | 'requires-investigation' | 'challenging';
  const recommendations: string[] = [];

  if (waterFeasibility === 'easy' && sewerFeasibility === 'easy') {
    overallFeasibility = 'straightforward';
    recommendations.push('Both water and sewer connections appear straightforward');
    recommendations.push('Obtain quotes from licensed plumber');
  } else if (waterFeasibility === 'challenging' || sewerFeasibility === 'challenging') {
    overallFeasibility = 'challenging';
    if (sewerLocation === 'rear' || sewerLocation === 'adjacent-lot') {
      recommendations.push('Check property title for existing sewer easements');
      recommendations.push('May need to negotiate easement with neighbours');
    }
    if (sewerFeasibility === 'challenging' && sewerResult.distance && sewerResult.distance > 50) {
      recommendations.push('Long sewer connection - consider pump station costs');
    }
    recommendations.push('Recommend pre-lodgement meeting with Urban Utilities');
  } else {
    overallFeasibility = 'requires-investigation';
    recommendations.push('Services connections require further investigation');
    recommendations.push('Contact Urban Utilities for connection assessment');
  }

  // Add cost guidance
  if (waterResult.distance !== null && sewerResult.distance !== null) {
    const estimatedWaterCost = waterResult.distance < 20 ? '$2,000-$5,000' :
                               waterResult.distance < 50 ? '$5,000-$10,000' : '$10,000+';
    const estimatedSewerCost = sewerLocation === 'frontage' && sewerResult.distance < 30 ? '$3,000-$8,000' :
                               sewerLocation === 'rear' ? '$15,000-$30,000+' : '$8,000-$15,000';
    recommendations.push(`Indicative water connection: ${estimatedWaterCost}`);
    recommendations.push(`Indicative sewer connection: ${estimatedSewerCost}`);
    recommendations.push('Note: Actual costs depend on site conditions');
  }

  return {
    water: waterConnection,
    sewer: sewerConnection,
    overallFeasibility,
    recommendations,
  };
}

/**
 * Query infrastructure services near a point
 */
export async function queryInfrastructureServices(
  lng: number,
  lat: number,
  bufferMeters: number = 200
): Promise<InfrastructureService[]> {
  const services: InfrastructureService[] = [];

  // Query LGIP layers in parallel
  const [
    stormwaterExisting,
    stormwaterFuture,
    transportExisting,
    transportFuture,
    parksExisting,
    sewerAreas,
    serviceCatchments,
  ] = await Promise.all([
    queryFeaturesNearPoint(`${BCC_ARCGIS}/City_Plan_2014_LGIP_PFTI_Stormwater_Existing/FeatureServer/0`, lng, lat, bufferMeters),
    queryFeaturesNearPoint(`${BCC_ARCGIS}/City_Plan_2014_LGIP_PFTI_Stormwater_Future/FeatureServer/0`, lng, lat, bufferMeters),
    queryFeaturesNearPoint(`${BCC_ARCGIS}/City_Plan_2014_LGIP_PFTI_Transport_Existing/FeatureServer/0`, lng, lat, bufferMeters),
    queryFeaturesNearPoint(`${BCC_ARCGIS}/City_Plan_2014_LGIP_PFTI_Transport_Future/FeatureServer/0`, lng, lat, bufferMeters),
    queryFeaturesNearPoint(`${BCC_ARCGIS}/City_Plan_2014_LGIP_PFTI_Parks_and_Community_Facilities_Existing/FeatureServer/0`, lng, lat, bufferMeters),
    queryFeaturesNearPoint(`${BCC_ARCGIS}/detail_plan_areas_sewer/FeatureServer/0`, lng, lat, bufferMeters),
    queryFeatureServerAtPoint(`${BCC_ARCGIS}/City_Plan_2014_LGIP_Service_Catchments/FeatureServer/0`, lng, lat),
  ]);

  // Helper to convert ArcGIS features to GeoJSON
  const toGeoJSONFeatures = (arcgisFeatures: any[]): Feature[] => {
    const result: Feature[] = [];
    arcgisFeatures.forEach((f, i) => {
      const geometry = f.geometry?.paths
        ? { type: 'LineString' as const, coordinates: f.geometry.paths[0] }
        : f.geometry?.rings
        ? { type: 'Polygon' as const, coordinates: f.geometry.rings }
        : null;

      if (geometry) {
        result.push({
          type: 'Feature',
          id: i,
          properties: f.attributes || {},
          geometry,
        } as Feature);
      }
    });
    return result;
  };

  // Process stormwater
  if (stormwaterExisting.length > 0) {
    services.push({
      type: 'stormwater',
      name: 'Stormwater Infrastructure',
      status: 'existing',
      features: toGeoJSONFeatures(stormwaterExisting),
      attributes: stormwaterExisting.map(f => f.attributes || {}),
    });
  } else if (stormwaterFuture.length > 0) {
    services.push({
      type: 'stormwater',
      name: 'Stormwater Infrastructure (Planned)',
      status: 'planned',
      features: toGeoJSONFeatures(stormwaterFuture),
      attributes: stormwaterFuture.map(f => f.attributes || {}),
    });
  }

  // Process transport
  if (transportExisting.length > 0) {
    services.push({
      type: 'transport',
      name: 'Transport Infrastructure',
      status: 'existing',
      features: toGeoJSONFeatures(transportExisting),
      attributes: transportExisting.map(f => f.attributes || {}),
    });
  }

  // Process parks
  if (parksExisting.length > 0) {
    services.push({
      type: 'parks',
      name: 'Parks & Community Facilities',
      status: 'existing',
      features: toGeoJSONFeatures(parksExisting),
      attributes: parksExisting.map(f => f.attributes || {}),
    });
  }

  // Process sewer
  if (sewerAreas.length > 0) {
    services.push({
      type: 'sewer',
      name: 'Sewer Service Area',
      status: 'existing',
      features: toGeoJSONFeatures(sewerAreas),
      attributes: sewerAreas.map(f => f.attributes || {}),
    });
  }

  return services;
}

/**
 * Create a mock building footprint for demonstration
 * In production, this would use satellite imagery analysis or cadastre data
 */
export function mockBuildingFootprint(
  propertyGeometry: Polygon,
  propertyArea: number
): BuildingFootprint {
  // Simulate a typical residential building
  // Average site cover is 30-40% for residential
  const siteCoverPercent = 25 + Math.random() * 15; // 25-40%
  const buildingArea = propertyArea * (siteCoverPercent / 100);

  // Create a simplified building footprint by shrinking the property boundary
  const coords = propertyGeometry.coordinates[0];
  if (coords.length < 4) {
    return {
      area: buildingArea,
      percentage: siteCoverPercent,
      geometry: null,
      source: 'mock',
    };
  }

  // Calculate centroid
  let cx = 0, cy = 0;
  for (const coord of coords) {
    cx += coord[0];
    cy += coord[1];
  }
  cx /= coords.length;
  cy /= coords.length;

  // Create a smaller polygon offset from centroid (mock building)
  const scale = 0.4; // Building takes up ~40% of width
  const buildingCoords = coords.slice(0, -1).map(coord => [
    cx + (coord[0] - cx) * scale,
    cy + (coord[1] - cy) * scale,
  ]);
  buildingCoords.push(buildingCoords[0]); // Close the ring

  return {
    area: buildingArea,
    percentage: siteCoverPercent,
    geometry: {
      type: 'Polygon',
      coordinates: [buildingCoords],
    },
    source: 'mock',
  };
}

/**
 * Analyze full development potential for a property
 */
export async function analyzeDevelopmentPotential(
  lng: number,
  lat: number,
  propertyArea: number,
  propertyGeometry: Polygon | null,
  lotPlan: string,
  frontage?: number,
  constraints: string[] = []
): Promise<DevelopmentPotential> {
  // Query zoning, infrastructure, and services in parallel
  const [zoning, infrastructure, servicesAssessment] = await Promise.all([
    getPropertyZoning(lng, lat),
    queryInfrastructureServices(lng, lat, 200),
    analyzeServicesConnections(lng, lat, propertyGeometry),
  ]);

  // Calculate subdivision potential
  const subdivision = calculateSubdivisionPotential(
    propertyArea,
    frontage,
    zoning,
    constraints
  );

  // Generate building footprint (mock for now)
  const building = propertyGeometry
    ? mockBuildingFootprint(propertyGeometry, propertyArea)
    : null;

  return {
    property: {
      lotPlan,
      area: propertyArea,
      frontage,
      geometry: propertyGeometry,
    },
    zoning,
    subdivision,
    infrastructure,
    building,
    constraints,
    servicesAssessment,
  };
}
