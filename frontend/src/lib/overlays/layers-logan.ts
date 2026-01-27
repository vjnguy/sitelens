/**
 * Logan City Council Overlay Layers
 *
 * Council-specific layers from Logan City Council's ArcGIS services
 * Source: https://data-logancity.opendata.arcgis.com/
 */

import { OverlayLayer } from './types';

// Logan City Council bounding box (approximate)
const LOGAN_BOUNDS: [number, number, number, number] = [152.77, -28.05, 153.35, -27.55];

// Logan City Council ArcGIS Services
const LOGAN_ARCGIS = 'https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services';

export const LOGAN_COUNCIL_LAYERS: OverlayLayer[] = [
  // ============================================================================
  // FLOOD HAZARD LAYERS
  // ============================================================================
  {
    id: 'logan-flood-hazard',
    name: 'Flood Hazard Overlay (Logan)',
    category: 'hazards',
    description: 'Planning scheme flood hazard trigger areas - based on flood studies including Logan/Albert Rivers regional study and 20+ local catchment studies',
    level: 'council',
    sourceId: 'logan-council',
    coverage: {
      bounds: LOGAN_BOUNDS,
      states: ['QLD'],
      councils: ['logan'],
      description: 'Logan City Council area only',
    },
    service: {
      type: 'arcgis-feature',
      url: `${LOGAN_ARCGIS}/Flooding_and_Inundation_Area_WFL1/FeatureServer/1`,
      format: 'geojson',
      requiresProxy: false,
      geometryType: 'polygon',
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 20,
      fillColor: '#3b82f6',
      strokeColor: '#1e40af',
      strokeWidth: 1,
      legend: [
        { label: 'Flood Hazard Area', color: '#3b82f6' },
      ],
    },
    quality: 'authoritative',
    lastUpdated: '2024',
    tags: ['flood', 'hazard', 'planning', 'overlay', 'logan'],
  },
  {
    id: 'logan-flood-2022',
    name: '2022 Flood Event Extent (Logan)',
    category: 'hazards',
    description: 'Observed flood extent from the February 2022 flood event',
    level: 'council',
    sourceId: 'logan-council',
    coverage: {
      bounds: LOGAN_BOUNDS,
      states: ['QLD'],
      councils: ['logan'],
      description: 'Logan City Council area only',
    },
    service: {
      type: 'arcgis-feature',
      url: `${LOGAN_ARCGIS}/2022_flood_event_and_2pc_flood_event/FeatureServer/1`,
      format: 'geojson',
      requiresProxy: false,
      geometryType: 'polygon',
    },
    style: {
      opacity: 0.5,
      minZoom: 10,
      maxZoom: 20,
      fillColor: '#0ea5e9',
      strokeColor: '#0369a1',
      strokeWidth: 1,
      legend: [
        { label: '2022 Flood Extent', color: '#0ea5e9' },
      ],
    },
    quality: 'authoritative',
    lastUpdated: '2022',
    tags: ['flood', '2022', 'historical', 'event', 'logan'],
  },
  {
    id: 'logan-flood-2pc',
    name: '2% AEP Flood Extent (Logan)',
    category: 'hazards',
    description: '2% Annual Exceedance Probability (1 in 50 year) flood extent',
    level: 'council',
    sourceId: 'logan-council',
    coverage: {
      bounds: LOGAN_BOUNDS,
      states: ['QLD'],
      councils: ['logan'],
      description: 'Logan City Council area only',
    },
    service: {
      type: 'arcgis-feature',
      url: `${LOGAN_ARCGIS}/2022_flood_event_and_2pc_flood_event/FeatureServer/2`,
      format: 'geojson',
      requiresProxy: false,
      geometryType: 'polygon',
    },
    style: {
      opacity: 0.5,
      minZoom: 10,
      maxZoom: 20,
      fillColor: '#6366f1',
      strokeColor: '#4338ca',
      strokeWidth: 1,
      legend: [
        { label: '2% AEP Flood Extent', color: '#6366f1' },
      ],
    },
    quality: 'authoritative',
    lastUpdated: '2024',
    tags: ['flood', 'aep', 'modelled', 'planning', 'logan'],
  },
  {
    id: 'logan-flood-cameras',
    name: 'Flood Cameras (Logan)',
    category: 'hazards',
    description: 'Live flood camera locations throughout Logan',
    level: 'council',
    sourceId: 'logan-council',
    coverage: {
      bounds: LOGAN_BOUNDS,
      states: ['QLD'],
      councils: ['logan'],
    },
    service: {
      type: 'arcgis-feature',
      url: `${LOGAN_ARCGIS}/Flood_Cameras/FeatureServer/0`,
      format: 'geojson',
      requiresProxy: false,
      geometryType: 'point',
    },
    style: {
      opacity: 1,
      minZoom: 8,
      maxZoom: 20,
      iconUrl: '/icons/camera.svg',
      iconSize: 24,
      legend: [
        { label: 'Flood Camera', color: '#f59e0b' },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'camera', 'monitoring', 'logan'],
  },
  {
    id: 'logan-stormwater',
    name: 'Stormwater Infrastructure (Logan)',
    category: 'infrastructure',
    description: 'Stormwater drainage infrastructure network',
    level: 'council',
    sourceId: 'logan-council',
    coverage: {
      bounds: LOGAN_BOUNDS,
      states: ['QLD'],
      councils: ['logan'],
    },
    service: {
      type: 'arcgis-feature',
      url: `${LOGAN_ARCGIS}/LCC_Stormwater_Infrastructure/FeatureServer/15`,
      format: 'geojson',
      requiresProxy: false,
      geometryType: 'line',
    },
    style: {
      opacity: 0.7,
      minZoom: 14,
      maxZoom: 20,
      strokeColor: '#06b6d4',
      strokeWidth: 2,
      legend: [
        { label: 'Stormwater Pipe', color: '#06b6d4' },
      ],
    },
    quality: 'authoritative',
    tags: ['stormwater', 'drainage', 'infrastructure', 'logan'],
  },

  // ============================================================================
  // WATER & SEWER INFRASTRUCTURE
  // ============================================================================
  {
    id: 'logan-water-mains',
    name: 'Water Mains (Logan)',
    category: 'infrastructure',
    description: 'Logan Water reticulated water main network',
    level: 'council',
    sourceId: 'logan-council',
    coverage: {
      bounds: LOGAN_BOUNDS,
      states: ['QLD'],
      councils: ['logan'],
      description: 'Logan Water service area',
    },
    service: {
      type: 'arcgis-feature',
      url: `${LOGAN_ARCGIS}/Logan_Water_Asset_Location_Data/FeatureServer/2`,
      format: 'geojson',
      requiresProxy: false,
      geometryType: 'line',
    },
    style: {
      opacity: 0.8,
      minZoom: 14,
      maxZoom: 20,
      strokeColor: '#0ea5e9',
      strokeWidth: 2,
      legend: [
        { label: 'Water Main', color: '#0ea5e9' },
      ],
    },
    quality: 'authoritative',
    tags: ['water', 'mains', 'infrastructure', 'utility', 'logan'],
  },
  {
    id: 'logan-sewer-mains',
    name: 'Sewer Mains (Logan)',
    category: 'infrastructure',
    description: 'Logan Water sewer network - gravity and pressure mains',
    level: 'council',
    sourceId: 'logan-council',
    coverage: {
      bounds: LOGAN_BOUNDS,
      states: ['QLD'],
      councils: ['logan'],
      description: 'Logan Water service area',
    },
    service: {
      type: 'arcgis-feature',
      url: `${LOGAN_ARCGIS}/Logan_Water_Asset_Location_Data/FeatureServer/3`,
      format: 'geojson',
      requiresProxy: false,
      geometryType: 'line',
    },
    style: {
      opacity: 0.8,
      minZoom: 14,
      maxZoom: 20,
      strokeColor: '#dc2626',
      strokeWidth: 2,
      legend: [
        { label: 'Sewer Main', color: '#dc2626' },
      ],
    },
    quality: 'authoritative',
    tags: ['sewer', 'mains', 'infrastructure', 'utility', 'logan'],
  },
  {
    id: 'logan-sewer-service-area',
    name: 'Sewer Service Area (Logan)',
    category: 'infrastructure',
    description: 'Areas serviced by Logan Water sewerage network',
    level: 'council',
    sourceId: 'logan-council',
    coverage: {
      bounds: LOGAN_BOUNDS,
      states: ['QLD'],
      councils: ['logan'],
    },
    service: {
      type: 'arcgis-feature',
      url: `${LOGAN_ARCGIS}/Sewerage%20Information/FeatureServer/0`,
      format: 'geojson',
      requiresProxy: false,
      geometryType: 'polygon',
    },
    style: {
      opacity: 0.3,
      minZoom: 10,
      maxZoom: 20,
      fillColor: '#fecaca',
      strokeColor: '#dc2626',
      strokeWidth: 1,
      legend: [
        { label: 'Sewer Service Area', color: '#fecaca' },
      ],
    },
    quality: 'authoritative',
    tags: ['sewer', 'service', 'coverage', 'utility', 'logan'],
  },
];

export default LOGAN_COUNCIL_LAYERS;
