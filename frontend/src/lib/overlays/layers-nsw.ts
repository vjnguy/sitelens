/**
 * New South Wales State Overlay Layers
 *
 * Layers from NSW Spatial Services, ePlanning, and state agencies
 * Covers all of New South Wales
 */

import { OverlayLayer } from './types';

// NSW state bounding box
const NSW_BOUNDS: [number, number, number, number] = [140.9, -37.6, 154.0, -28.0];
// Greater Sydney region
const SYDNEY_BOUNDS: [number, number, number, number] = [150.3, -34.2, 151.5, -33.4];

// Base URLs for NSW services
const NSW_SPATIAL_BASE = 'https://portal.spatial.nsw.gov.au/server/rest/services';
const NSW_PLANNING_BASE = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services';
const NSW_RFS_BASE = 'https://services1.arcgis.com/cNVyNtjGVZybOQWZ/ArcGIS/rest/services';

export const NSW_STATE_LAYERS: OverlayLayer[] = [
  // ============================================================================
  // HAZARD LAYERS
  // ============================================================================
  {
    id: 'nsw-bushfire-prone',
    name: 'Bush Fire Prone Land',
    category: 'hazards',
    description: 'Certified Bush Fire Prone Land mapping',
    level: 'state',
    sourceId: 'nsw-spatial',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
      description: 'NSW-wide coverage',
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${NSW_SPATIAL_BASE}/NSW_Bush_Fire_Prone_Land/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.7,
      minZoom: 8,
      maxZoom: 18,
      legend: [
        { label: 'Vegetation Category 1', color: '#d7191c' },
        { label: 'Vegetation Category 2', color: '#fdae61' },
        { label: 'Vegetation Category 3', color: '#ffffbf' },
        { label: 'Vegetation Buffer', color: '#a6d96a' },
      ],
    },
    quality: 'authoritative',
    lastUpdated: '2024',
    tags: ['bushfire', 'fire', 'hazard', 'prone'],
  },
  {
    id: 'nsw-flood-planning',
    name: 'Flood Planning Area',
    category: 'hazards',
    description: 'Flood planning areas from Local Environmental Plans',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Flood/MapServer/WMSServer',
      layers: ['0'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Flood Planning Area', color: '#2166ac' },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'hazard', 'planning'],
  },
  {
    id: 'nsw-coastal-hazard',
    name: 'Coastal Vulnerability Areas',
    category: 'hazards',
    description: 'Coastal erosion and inundation hazard areas',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
      description: 'Coastal areas only',
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Coastal/MapServer/WMSServer',
      layers: ['0', '1'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Coastal Vulnerability', color: '#3288bd' },
      ],
    },
    quality: 'authoritative',
    tags: ['coastal', 'erosion', 'hazard'],
  },
  {
    id: 'nsw-landslide',
    name: 'Landslide Risk',
    category: 'hazards',
    description: 'Areas susceptible to mass movement',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Hazard/MapServer/WMSServer',
      layers: ['Landslide_Risk'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Landslide Risk', color: '#8c510a' },
      ],
    },
    quality: 'authoritative',
    tags: ['landslide', 'hazard', 'geotechnical'],
  },
  {
    id: 'nsw-mine-subsidence',
    name: 'Mine Subsidence Districts',
    category: 'hazards',
    description: 'Mine subsidence districts requiring development approval',
    level: 'state',
    sourceId: 'nsw-spatial',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
      description: 'Coal mining regions',
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${NSW_SPATIAL_BASE}/NSW_Mine_Subsidence/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.5,
      minZoom: 8,
      maxZoom: 18,
      legend: [
        { label: 'Mine Subsidence District', color: '#5e4fa2' },
      ],
    },
    quality: 'authoritative',
    tags: ['mining', 'subsidence', 'hazard'],
  },

  // ============================================================================
  // PLANNING LAYERS
  // ============================================================================
  {
    id: 'nsw-cadastre',
    name: 'Property Boundaries (Cadastre)',
    category: 'boundaries',
    description: 'NSW cadastral lot boundaries',
    level: 'state',
    sourceId: 'nsw-spatial',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${NSW_SPATIAL_BASE}/NSW_Cadastre/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.8,
      minZoom: 14,
      maxZoom: 22,
    },
    quality: 'authoritative',
    tags: ['cadastre', 'property', 'boundaries', 'lot'],
  },
  {
    id: 'nsw-lga-boundaries',
    name: 'Local Government Areas',
    category: 'boundaries',
    description: 'NSW LGA boundaries',
    level: 'state',
    sourceId: 'nsw-spatial',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${NSW_SPATIAL_BASE}/NSW_Administrative_Boundaries/MapServer`,
      layers: [1],
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.5,
      minZoom: 6,
      maxZoom: 16,
      legend: [
        { label: 'LGA Boundary', color: '#7570b3' },
      ],
    },
    quality: 'authoritative',
    tags: ['lga', 'council', 'boundaries'],
  },
  {
    id: 'nsw-zoning',
    name: 'Land Zoning',
    category: 'planning',
    description: 'Land zoning from Local Environmental Plans',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/WMSServer',
      layers: ['Land_Zoning'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Residential', color: '#ff6b6b' },
        { label: 'Commercial', color: '#4dabf7' },
        { label: 'Industrial', color: '#9775fa' },
        { label: 'Rural', color: '#69db7c' },
        { label: 'Environmental', color: '#20c997' },
      ],
    },
    quality: 'authoritative',
    tags: ['zoning', 'lep', 'planning'],
  },
  {
    id: 'nsw-height-limits',
    name: 'Building Height Limits',
    category: 'planning',
    description: 'Maximum building heights from LEPs',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/WMSServer',
      layers: ['Height_of_Building'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 12,
      maxZoom: 18,
    },
    quality: 'authoritative',
    tags: ['height', 'building', 'planning'],
  },
  {
    id: 'nsw-fsr',
    name: 'Floor Space Ratio',
    category: 'planning',
    description: 'Maximum floor space ratio from LEPs',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/WMSServer',
      layers: ['Floor_Space_Ratio'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 12,
      maxZoom: 18,
    },
    quality: 'authoritative',
    tags: ['fsr', 'floor-space', 'planning'],
  },
  {
    id: 'nsw-lot-size',
    name: 'Minimum Lot Size',
    category: 'planning',
    description: 'Minimum lot size controls from LEPs',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/WMSServer',
      layers: ['Lot_Size'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 12,
      maxZoom: 18,
    },
    quality: 'authoritative',
    tags: ['lot-size', 'subdivision', 'planning'],
  },

  // ============================================================================
  // HERITAGE LAYERS
  // ============================================================================
  {
    id: 'nsw-state-heritage',
    name: 'State Heritage Register',
    category: 'heritage',
    description: 'Items on the NSW State Heritage Register',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Heritage/MapServer/WMSServer',
      layers: ['State_Heritage_Register'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.7,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'State Heritage Item', color: '#8c510a' },
      ],
    },
    quality: 'authoritative',
    tags: ['heritage', 'state', 'protected'],
  },
  {
    id: 'nsw-local-heritage',
    name: 'Local Heritage Items',
    category: 'heritage',
    description: 'Heritage items from Local Environmental Plans',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Heritage/MapServer/WMSServer',
      layers: ['Local_Heritage'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.7,
      minZoom: 12,
      maxZoom: 18,
      legend: [
        { label: 'Local Heritage Item', color: '#bf812d' },
      ],
    },
    quality: 'authoritative',
    tags: ['heritage', 'local', 'lep'],
  },
  {
    id: 'nsw-heritage-conservation',
    name: 'Heritage Conservation Areas',
    category: 'heritage',
    description: 'Heritage conservation areas from LEPs',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Heritage/MapServer/WMSServer',
      layers: ['Heritage_Conservation_Area'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.5,
      minZoom: 12,
      maxZoom: 18,
      legend: [
        { label: 'Heritage Conservation Area', color: '#dfc27d' },
      ],
    },
    quality: 'authoritative',
    tags: ['heritage', 'conservation', 'area'],
  },
  {
    id: 'nsw-aboriginal-heritage',
    name: 'Aboriginal Heritage',
    category: 'heritage',
    description: 'Aboriginal heritage information management system areas',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Heritage/MapServer/WMSServer',
      layers: ['Aboriginal_Heritage'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Aboriginal Heritage Area', color: '#a6611a' },
      ],
    },
    quality: 'authoritative',
    tags: ['heritage', 'aboriginal', 'indigenous'],
  },

  // ============================================================================
  // ENVIRONMENT LAYERS
  // ============================================================================
  {
    id: 'nsw-native-vegetation',
    name: 'Native Vegetation',
    category: 'environment',
    description: 'Native vegetation mapping',
    level: 'state',
    sourceId: 'nsw-spatial',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${NSW_SPATIAL_BASE}/NSW_Vegetation/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Native Vegetation', color: '#1a9850' },
      ],
    },
    quality: 'authoritative',
    tags: ['vegetation', 'native', 'environment'],
  },
  {
    id: 'nsw-biodiversity',
    name: 'Biodiversity Values',
    category: 'environment',
    description: 'Biodiversity values map for the Biodiversity Offsets Scheme',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Biodiversity/MapServer/WMSServer',
      layers: ['Biodiversity_Values'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'High Biodiversity Value', color: '#006d2c' },
        { label: 'Biodiversity Value', color: '#31a354' },
      ],
    },
    quality: 'authoritative',
    tags: ['biodiversity', 'bos', 'environment'],
  },
  {
    id: 'nsw-koala-sepp',
    name: 'Koala Habitat (SEPP)',
    category: 'environment',
    description: 'Koala habitat as defined by State Environmental Planning Policy',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Biodiversity/MapServer/WMSServer',
      layers: ['Koala_Habitat'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Core Koala Habitat', color: '#006d2c' },
        { label: 'Potential Koala Habitat', color: '#74c476' },
      ],
    },
    quality: 'authoritative',
    tags: ['koala', 'sepp', 'habitat', 'environment'],
  },
  {
    id: 'nsw-wetlands',
    name: 'SEPP Coastal Wetlands',
    category: 'environment',
    description: 'Coastal wetlands under SEPP (Coastal Management)',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
      description: 'Coastal areas only',
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Coastal/MapServer/WMSServer',
      layers: ['Coastal_Wetlands'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Coastal Wetland', color: '#1f78b4' },
      ],
    },
    quality: 'authoritative',
    tags: ['wetlands', 'coastal', 'sepp', 'environment'],
  },
  {
    id: 'nsw-npws-reserves',
    name: 'National Parks & Reserves',
    category: 'environment',
    description: 'NPWS estate including national parks and reserves',
    level: 'state',
    sourceId: 'nsw-spatial',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${NSW_SPATIAL_BASE}/NSW_NPWS_Estate/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.5,
      minZoom: 8,
      maxZoom: 18,
      legend: [
        { label: 'National Park', color: '#1a9850' },
        { label: 'Nature Reserve', color: '#91cf60' },
        { label: 'State Conservation Area', color: '#d9ef8b' },
      ],
    },
    quality: 'authoritative',
    tags: ['parks', 'npws', 'conservation', 'environment'],
  },
  {
    id: 'nsw-acid-sulfate',
    name: 'Acid Sulfate Soils',
    category: 'environment',
    description: 'Acid sulfate soil risk mapping',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Hazard/MapServer/WMSServer',
      layers: ['Acid_Sulfate_Soils'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Class 1', color: '#d7191c' },
        { label: 'Class 2', color: '#fdae61' },
        { label: 'Class 3', color: '#ffffbf' },
        { label: 'Class 4', color: '#a6d96a' },
        { label: 'Class 5', color: '#1a9641' },
      ],
    },
    quality: 'authoritative',
    tags: ['soil', 'acid-sulfate', 'environment'],
  },

  // ============================================================================
  // INFRASTRUCTURE LAYERS
  // ============================================================================
  {
    id: 'nsw-transport-corridors',
    name: 'Transport Corridors',
    category: 'infrastructure',
    description: 'Future transport corridor reservations',
    level: 'state',
    sourceId: 'nsw-planning',
    coverage: {
      bounds: NSW_BOUNDS,
      states: ['NSW'],
    },
    service: {
      type: 'wms',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/services/ePlanning/Planning_Portal_Infrastructure/MapServer/WMSServer',
      layers: ['Transport_Corridor'],
      format: 'image/png',
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Transport Corridor', color: '#4a1486' },
      ],
    },
    quality: 'authoritative',
    tags: ['transport', 'corridor', 'infrastructure'],
  },
];

export default NSW_STATE_LAYERS;
