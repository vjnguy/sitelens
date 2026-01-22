// Spatial Data API connectors for Australian open data sources

import type { FeatureCollection, Feature } from 'geojson';

// NSW Spatial Services ArcGIS REST API base
const NSW_SPATIAL_BASE = 'https://portal.spatial.nsw.gov.au/server/rest/services';

// Queensland Spatial Services
const QLD_SPATIAL_BASE = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services';

// Data.gov.au / Transport NSW endpoints
const TRANSPORT_NSW_BASE = 'https://opendata.transport.nsw.gov.au';

export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'arcgis' | 'geojson' | 'wfs';
  baseUrl: string;
  datasets: DatasetConfig[];
}

export interface DatasetConfig {
  id: string;
  name: string;
  endpoint: string;
  layerId?: number; // For ArcGIS services
  fields: FieldConfig[];
  geometryType: 'point' | 'polygon' | 'line';
  defaultStyle: {
    type: 'circle' | 'fill' | 'line';
    paint: Record<string, unknown>;
  };
}

export interface FieldConfig {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date';
  filterable: boolean;
}

// Configured data sources with real API endpoints
export const DATA_SOURCES: DataSourceConfig[] = [
  {
    id: 'nsw-spatial',
    name: 'NSW Spatial Services',
    type: 'arcgis',
    baseUrl: NSW_SPATIAL_BASE,
    datasets: [
      {
        id: 'property-boundaries',
        name: 'Property Boundaries (Cadastre)',
        endpoint: '/NSW_Land_Parcel_Property_Theme/FeatureServer/0',
        layerId: 0,
        geometryType: 'polygon',
        fields: [
          { name: 'cadid', label: 'Cadastre ID', type: 'string', filterable: true },
          { name: 'lotnumber', label: 'Lot Number', type: 'string', filterable: true },
          { name: 'sectionnumber', label: 'Section', type: 'string', filterable: true },
          { name: 'planlabel', label: 'Plan Label (DP)', type: 'string', filterable: true },
          { name: 'area', label: 'Area (sqm)', type: 'number', filterable: true },
        ],
        defaultStyle: {
          type: 'fill',
          paint: {
            'fill-color': '#3bb2d0',
            'fill-opacity': 0.3,
            'fill-outline-color': '#3bb2d0',
          },
        },
      },
      {
        id: 'addresses',
        name: 'Geocoded Addresses',
        endpoint: '/NSW_Geocoded_Addressing_Theme/FeatureServer/1',
        layerId: 1,
        geometryType: 'point',
        fields: [
          { name: 'address', label: 'Full Address', type: 'string', filterable: true },
          { name: 'suburb', label: 'Suburb', type: 'string', filterable: true },
          { name: 'postcode', label: 'Postcode', type: 'string', filterable: true },
          { name: 'state', label: 'State', type: 'string', filterable: false },
        ],
        defaultStyle: {
          type: 'circle',
          paint: {
            'circle-radius': 4,
            'circle-color': '#e74c3c',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        },
      },
      {
        id: 'schools',
        name: 'Education Facilities',
        endpoint: '/NSW_FOI_Education_Facilities/FeatureServer/0',
        layerId: 0,
        geometryType: 'point',
        fields: [
          { name: 'generalname', label: 'Name', type: 'string', filterable: true },
          { name: 'featuresubtype', label: 'Type', type: 'string', filterable: true },
          { name: 'suburb', label: 'Suburb', type: 'string', filterable: true },
          { name: 'postcode', label: 'Postcode', type: 'string', filterable: true },
        ],
        defaultStyle: {
          type: 'circle',
          paint: {
            'circle-radius': 6,
            'circle-color': '#9b59b6',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        },
      },
      {
        id: 'hospitals',
        name: 'Health Facilities',
        endpoint: '/NSW_FOI_Health_Facilities/FeatureServer/0',
        layerId: 0,
        geometryType: 'point',
        fields: [
          { name: 'generalname', label: 'Name', type: 'string', filterable: true },
          { name: 'featuresubtype', label: 'Type', type: 'string', filterable: true },
          { name: 'suburb', label: 'Suburb', type: 'string', filterable: true },
          { name: 'postcode', label: 'Postcode', type: 'string', filterable: true },
        ],
        defaultStyle: {
          type: 'circle',
          paint: {
            'circle-radius': 6,
            'circle-color': '#e74c3c',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        },
      },
      {
        id: 'transport',
        name: 'Transport Facilities',
        endpoint: '/NSW_FOI_Transport_Facilities/FeatureServer/0',
        layerId: 0,
        geometryType: 'point',
        fields: [
          { name: 'generalname', label: 'Name', type: 'string', filterable: true },
          { name: 'featuresubtype', label: 'Type', type: 'string', filterable: true },
          { name: 'suburb', label: 'Suburb', type: 'string', filterable: true },
        ],
        defaultStyle: {
          type: 'circle',
          paint: {
            'circle-radius': 5,
            'circle-color': '#3498db',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        },
      },
    ],
  },
  {
    id: 'qld-spatial',
    name: 'Queensland Spatial Services',
    type: 'arcgis',
    baseUrl: QLD_SPATIAL_BASE,
    datasets: [
      {
        id: 'cadastre',
        name: 'Property Boundaries (Cadastre)',
        endpoint: '/PlanningCadastre/LandParcelPropertyFramework/MapServer/4',
        layerId: 4,
        geometryType: 'polygon',
        fields: [
          { name: 'lot', label: 'Lot Number', type: 'string', filterable: true },
          { name: 'plan', label: 'Plan Number', type: 'string', filterable: true },
          { name: 'lotplan', label: 'Lot/Plan', type: 'string', filterable: true },
          { name: 'tenure', label: 'Tenure', type: 'string', filterable: true },
          { name: 'locality', label: 'Locality', type: 'string', filterable: true },
          { name: 'lot_area', label: 'Area (sqm)', type: 'number', filterable: false },
        ],
        defaultStyle: {
          type: 'fill',
          paint: {
            'fill-color': '#e67e22',
            'fill-opacity': 0.3,
            'fill-outline-color': '#d35400',
          },
        },
      },
      {
        id: 'localities',
        name: 'Locality Boundaries (Suburbs)',
        endpoint: '/PlanningCadastre/LandParcelPropertyFramework/MapServer/19',
        layerId: 19,
        geometryType: 'polygon',
        fields: [
          { name: 'locality', label: 'Locality Name', type: 'string', filterable: true },
          { name: 'postcode', label: 'Postcode', type: 'string', filterable: true },
          { name: 'shire_name', label: 'LGA', type: 'string', filterable: true },
        ],
        defaultStyle: {
          type: 'fill',
          paint: {
            'fill-color': '#1abc9c',
            'fill-opacity': 0.2,
            'fill-outline-color': '#16a085',
          },
        },
      },
      {
        id: 'lga',
        name: 'Local Government Areas',
        endpoint: '/PlanningCadastre/LandParcelPropertyFramework/MapServer/20',
        layerId: 20,
        geometryType: 'polygon',
        fields: [
          { name: 'lga', label: 'LGA Name', type: 'string', filterable: true },
          { name: 'abbrev_name', label: 'Abbreviation', type: 'string', filterable: true },
        ],
        defaultStyle: {
          type: 'fill',
          paint: {
            'fill-color': '#9b59b6',
            'fill-opacity': 0.15,
            'fill-outline-color': '#8e44ad',
          },
        },
      },
      {
        id: 'properties',
        name: 'Properties',
        endpoint: '/PlanningCadastre/LandParcelPropertyFramework/MapServer/50',
        layerId: 50,
        geometryType: 'polygon',
        fields: [
          { name: 'prop_name', label: 'Property Name', type: 'string', filterable: true },
          { name: 'locality', label: 'Locality', type: 'string', filterable: true },
        ],
        defaultStyle: {
          type: 'fill',
          paint: {
            'fill-color': '#3498db',
            'fill-opacity': 0.25,
            'fill-outline-color': '#2980b9',
          },
        },
      },
    ],
  },
  {
    id: 'transport-nsw',
    name: 'Transport NSW Live Data',
    type: 'geojson',
    baseUrl: TRANSPORT_NSW_BASE,
    datasets: [
      {
        id: 'traffic-cameras',
        name: 'Live Traffic Cameras',
        endpoint: '/dataset/4a2f2449-f7d4-4730-af85-5f40b1e57f16/resource/951f56c9-5ad7-46ed-9d15-add3b1e74858/download/livetrafficcamera.json',
        geometryType: 'point',
        fields: [
          { name: 'title', label: 'Camera Name', type: 'string', filterable: true },
          { name: 'region', label: 'Region', type: 'string', filterable: true },
          { name: 'direction', label: 'Direction', type: 'string', filterable: true },
        ],
        defaultStyle: {
          type: 'circle',
          paint: {
            'circle-radius': 5,
            'circle-color': '#f39c12',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        },
      },
      {
        id: 'traffic-hazards',
        name: 'Live Traffic Hazards',
        endpoint: '/dataset/9c8f7c66-c68e-4ac8-8ed2-f0b640ff3e38/resource/604badb2-e498-4a99-8f77-6e3eb04ce53b/download/livetraffichazarddata_2_1.json',
        geometryType: 'point',
        fields: [
          { name: 'headline', label: 'Headline', type: 'string', filterable: true },
          { name: 'mainCategory', label: 'Category', type: 'string', filterable: true },
          { name: 'roads', label: 'Roads', type: 'string', filterable: true },
        ],
        defaultStyle: {
          type: 'circle',
          paint: {
            'circle-radius': 6,
            'circle-color': '#e74c3c',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        },
      },
      {
        id: 'parking',
        name: 'Off-Street Parking',
        endpoint: '/dataset/555c5c8d-04b8-42da-b2e5-c0d36f8b8c7b/resource/8b8a5f8a-7e1f-4d1f-9c1a-1f1e1d1c1b1a/download/offstreetparkingdata_2.geojson',
        geometryType: 'point',
        fields: [
          { name: 'name', label: 'Name', type: 'string', filterable: true },
          { name: 'suburb', label: 'Suburb', type: 'string', filterable: true },
          { name: 'capacity', label: 'Capacity', type: 'number', filterable: true },
        ],
        defaultStyle: {
          type: 'circle',
          paint: {
            'circle-radius': 5,
            'circle-color': '#2ecc71',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        },
      },
    ],
  },
];

// Convert ArcGIS JSON to GeoJSON
function arcgisToGeoJSON(arcgisResponse: any): FeatureCollection {
  const features: Feature[] = (arcgisResponse.features || []).map((f: any, idx: number) => {
    let geometry: any = null;

    if (f.geometry) {
      if (f.geometry.x !== undefined && f.geometry.y !== undefined) {
        // Point geometry
        geometry = {
          type: 'Point',
          coordinates: [f.geometry.x, f.geometry.y],
        };
      } else if (f.geometry.rings) {
        // Polygon geometry
        geometry = {
          type: 'Polygon',
          coordinates: f.geometry.rings,
        };
      } else if (f.geometry.paths) {
        // Line geometry
        geometry = {
          type: 'LineString',
          coordinates: f.geometry.paths[0],
        };
      }
    }

    return {
      type: 'Feature' as const,
      id: f.attributes?.OBJECTID || f.attributes?.objectid || idx,
      properties: f.attributes || {},
      geometry,
    };
  });

  return {
    type: 'FeatureCollection',
    features: features.filter(f => f.geometry !== null),
  };
}

// Convert Transport NSW JSON format to GeoJSON
function transportNSWToGeoJSON(data: any): FeatureCollection {
  // Handle different response formats
  let items: any[] = [];

  if (Array.isArray(data)) {
    items = data;
  } else if (data.features) {
    // Already GeoJSON
    return data as FeatureCollection;
  } else if (data.incidents || data.cameras || data.hazards) {
    items = data.incidents || data.cameras || data.hazards || [];
  }

  const features: Feature[] = items
    .filter((item: any) => {
      const lat = item.latitude || item.lat || item.geometry?.coordinates?.[1];
      const lng = item.longitude || item.lng || item.geometry?.coordinates?.[0];
      return lat !== undefined && lng !== undefined;
    })
    .map((item: any, idx: number) => {
      const lat = item.latitude || item.lat || item.geometry?.coordinates?.[1];
      const lng = item.longitude || item.lng || item.geometry?.coordinates?.[0];

      return {
        type: 'Feature' as const,
        id: item.id || idx,
        properties: { ...item },
        geometry: {
          type: 'Point' as const,
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
      };
    });

  return {
    type: 'FeatureCollection',
    features,
  };
}

export interface FetchOptions {
  bbox?: [number, number, number, number]; // [west, south, east, north]
  filters?: Record<string, string>;
  limit?: number;
}

// Fetch data from ArcGIS REST API
export async function fetchArcGISData(
  baseUrl: string,
  endpoint: string,
  options: FetchOptions = {}
): Promise<FeatureCollection> {
  const { bbox, filters, limit = 1000 } = options;

  const params = new URLSearchParams({
    f: 'json',
    outFields: '*',
    outSR: '4326', // WGS84
    returnGeometry: 'true',
    resultRecordCount: limit.toString(),
  });

  // Add spatial filter if bbox provided
  // Use simple envelope format: xmin,ymin,xmax,ymax to avoid JSON encoding issues with proxy
  if (bbox) {
    params.set('geometry', `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`);
    params.set('geometryType', 'esriGeometryEnvelope');
    params.set('spatialRel', 'esriSpatialRelIntersects');
    params.set('inSR', '4326');
  }

  // Build WHERE clause from filters
  const whereClauses: string[] = [];
  if (filters) {
    Object.entries(filters).forEach(([field, value]) => {
      if (value && value.trim()) {
        // Use LIKE for string matching
        whereClauses.push(`UPPER(${field}) LIKE UPPER('%${value}%')`);
      }
    });
  }
  params.set('where', whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1');

  const directUrl = `${baseUrl}${endpoint}/query?${params.toString()}`;

  // Use proxy to bypass CORS for external ArcGIS servers
  const useProxy = typeof window !== 'undefined' && !baseUrl.includes('localhost');
  const url = useProxy
    ? `/api/spatial-proxy?url=${encodeURIComponent(directUrl)}`
    : directUrl;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ArcGIS API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`ArcGIS error: ${data.error.message}`);
  }

  return arcgisToGeoJSON(data);
}

// Fetch GeoJSON data (Transport NSW, etc.)
export async function fetchGeoJSONData(
  url: string,
  options: FetchOptions = {}
): Promise<FeatureCollection> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GeoJSON fetch error: ${response.status}`);
  }

  const data = await response.json();
  let geojson = transportNSWToGeoJSON(data);

  // Apply client-side filters if provided
  if (options.filters) {
    const filteredFeatures = geojson.features.filter(feature => {
      return Object.entries(options.filters!).every(([field, value]) => {
        if (!value || !value.trim()) return true;
        const propValue = String(feature.properties?.[field] || '').toLowerCase();
        return propValue.includes(value.toLowerCase());
      });
    });
    geojson = { ...geojson, features: filteredFeatures };
  }

  // Apply bbox filter if provided
  if (options.bbox) {
    const [west, south, east, north] = options.bbox;
    const filteredFeatures = geojson.features.filter(feature => {
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates;
        return lng >= west && lng <= east && lat >= south && lat <= north;
      }
      return true; // Include non-point geometries
    });
    geojson = { ...geojson, features: filteredFeatures };
  }

  // Apply limit
  if (options.limit && geojson.features.length > options.limit) {
    geojson = { ...geojson, features: geojson.features.slice(0, options.limit) };
  }

  return geojson;
}

// Main fetch function that handles different source types
export async function fetchSpatialData(
  sourceId: string,
  datasetId: string,
  options: FetchOptions = {}
): Promise<FeatureCollection> {
  const source = DATA_SOURCES.find(s => s.id === sourceId);
  if (!source) {
    throw new Error(`Unknown data source: ${sourceId}`);
  }

  const dataset = source.datasets.find(d => d.id === datasetId);
  if (!dataset) {
    throw new Error(`Unknown dataset: ${datasetId}`);
  }

  if (source.type === 'arcgis') {
    return fetchArcGISData(source.baseUrl, dataset.endpoint, options);
  } else if (source.type === 'geojson') {
    const url = `${source.baseUrl}${dataset.endpoint}`;
    return fetchGeoJSONData(url, options);
  }

  throw new Error(`Unsupported source type: ${source.type}`);
}

// Get dataset configuration
export function getDatasetConfig(sourceId: string, datasetId: string): DatasetConfig | null {
  const source = DATA_SOURCES.find(s => s.id === sourceId);
  if (!source) return null;
  return source.datasets.find(d => d.id === datasetId) || null;
}
