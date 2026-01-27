/**
 * Queensland State Overlay Layers
 *
 * Layers from Queensland Spatial Services and State agencies
 * Covers all of Queensland with focus on SEQ region
 */

import { OverlayLayer } from './types';

// QLD state bounding box
const QLD_BOUNDS: [number, number, number, number] = [138.0, -29.2, 154.0, -10.0];
// South East Queensland bounding box
const SEQ_BOUNDS: [number, number, number, number] = [152.0, -28.5, 153.6, -24.5];

// Base URLs for Queensland services
const QLD_GIS_BASE = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services';
const AGOL_TILES = 'https://tiles.arcgis.com/tiles/vkTwD8kHw2woKBqV/arcgis/rest/services';

export const QLD_STATE_LAYERS: OverlayLayer[] = [
  // ============================================================================
  // HAZARD LAYERS
  // ============================================================================
  {
    id: 'qld-bushfire-prone',
    name: 'Bushfire Prone Areas',
    category: 'hazards',
    description: 'State Planning Policy bushfire prone area mapping',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
      description: 'Queensland-wide coverage',
    },
    service: {
      type: 'arcgis-cached',
      url: `${AGOL_TILES}/Bushfire_Prone_Areas/MapServer`,
      tileSize: 256,
      requiresProxy: false,
    },
    style: {
      opacity: 0.7,
      minZoom: 8,
      maxZoom: 18,
      legend: [
        { label: 'Very High Potential', color: '#d7191c' },
        { label: 'High Potential', color: '#fdae61' },
        { label: 'Medium Potential', color: '#ffffbf' },
        { label: 'Potential Impact Buffer', color: '#a6d96a' },
      ],
    },
    quality: 'authoritative',
    lastUpdated: '2024',
    tags: ['bushfire', 'fire', 'hazard', 'spp'],
  },
  {
    id: 'qld-fuel-hazard',
    name: 'State Overall Fuel Hazard',
    category: 'hazards',
    description: 'Bushfire fuel hazard across Queensland (30m grid)',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-cached',
      url: `${AGOL_TILES}/State_Overall_Fuel_Hazard_v3/MapServer`,
      tileSize: 256,
      requiresProxy: false,
    },
    style: {
      opacity: 0.6,
      minZoom: 5,
      maxZoom: 13,
      legend: [
        { label: 'Extreme Fuel Hazard', color: '#d7191c' },
        { label: 'Very High Fuel Hazard', color: '#fdae61' },
        { label: 'High Fuel Hazard', color: '#ffffbf' },
        { label: 'Moderate Fuel Hazard', color: '#a6d96a' },
        { label: 'Low Fuel Hazard', color: '#1a9641' },
      ],
    },
    quality: 'authoritative',
    tags: ['bushfire', 'fuel', 'vegetation', 'hazard'],
  },
  {
    id: 'qld-vegetation-hazard',
    name: 'Broad Vegetation Hazard Class',
    category: 'hazards',
    description: 'Vegetation-based bushfire hazard classification',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-cached',
      url: `${AGOL_TILES}/Broad_Vegetation_Hazard_Class/MapServer`,
      tileSize: 256,
      requiresProxy: false,
    },
    style: {
      opacity: 0.6,
      minZoom: 8,
      maxZoom: 18,
      legend: [
        { label: 'Very High Hazard', color: '#d7191c' },
        { label: 'High Hazard', color: '#fdae61' },
        { label: 'Medium Hazard', color: '#ffffbf' },
        { label: 'Low Hazard', color: '#1a9641' },
      ],
    },
    quality: 'authoritative',
    tags: ['bushfire', 'vegetation', 'hazard'],
  },
  {
    id: 'qld-rapid-flood-hazard',
    name: 'Rapid Flood Hazard Assessment',
    category: 'hazards',
    description: 'Flood hazard mapping (Regional QLD - Bundaberg, Rockhampton, etc.)',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
      description: 'Regional QLD only - Bundaberg, Rockhampton, Mackay areas',
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/FloodCheck/RapidHazardAssessment/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.7,
      minZoom: 8,
      maxZoom: 18,
      legend: [
        { label: 'High Hazard', color: '#d7191c' },
        { label: 'Significant Hazard', color: '#fdae61' },
        { label: 'Low Hazard', color: '#1a9641' },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'hazard', 'regional'],
  },
  {
    id: 'qld-coastal-erosion',
    name: 'Coastal Erosion Prone Areas',
    category: 'hazards',
    description: 'Erosion prone areas along the Queensland coastline',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
      description: 'Coastal areas only',
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/PlanningCadastre/CoastalManagement/MapServer`,
      layers: [7, 8, 9],
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Calculated Erosion Distance', color: '#fee08b' },
        { label: 'Sea Level Rise', color: '#3288bd' },
        { label: '40m HAT Buffer', color: '#d53e4f' },
      ],
    },
    quality: 'authoritative',
    tags: ['coastal', 'erosion', 'hazard'],
  },
  {
    id: 'qld-storm-tide',
    name: 'Storm Tide Hazard',
    category: 'hazards',
    description: 'Storm tide inundation hazard areas',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
      description: 'Coastal areas only',
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/PlanningCadastre/CoastalManagement/MapServer`,
      layers: [11, 12],
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'High Hazard', color: '#d7191c' },
        { label: 'Medium Hazard', color: '#fdae61' },
      ],
    },
    quality: 'authoritative',
    tags: ['storm', 'tide', 'coastal', 'hazard'],
  },

  // ============================================================================
  // PLANNING LAYERS
  // ============================================================================
  {
    id: 'qld-cadastre',
    name: 'Property Boundaries',
    category: 'boundaries',
    description: 'Queensland cadastral boundaries (lot/plan)',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/PlanningCadastre/LandParcelPropertyFramework/MapServer`,
      layers: [4],
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
      // Custom symbology: black outlines, no fill
      dynamicLayers: JSON.stringify([{
        id: 4,
        source: { type: 'mapLayer', mapLayerId: 4 },
        drawingInfo: {
          renderer: {
            type: 'simple',
            symbol: {
              type: 'esriSFS',
              style: 'esriSFSNull',
              outline: {
                type: 'esriSLS',
                style: 'esriSLSSolid',
                color: [0, 0, 0, 255],
                width: 1
              }
            }
          }
        }
      }]),
    },
    style: {
      opacity: 0.9,
      minZoom: 14,
      maxZoom: 22,
      legend: [
        { label: 'Property Boundary', color: '#000000' },
      ],
    },
    quality: 'authoritative',
    tags: ['cadastre', 'property', 'boundaries', 'lot'],
    defaultEnabled: true,
  },
  {
    id: 'qld-lga-boundaries',
    name: 'Local Government Areas',
    category: 'boundaries',
    description: 'Queensland LGA boundaries',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/Boundaries/AdminBoundariesFramework/MapServer`,
      layers: [20],
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
    id: 'qld-pda',
    name: 'Priority Development Areas',
    category: 'planning',
    description: 'State declared Priority Development Areas (PDAs)',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/PlanningCadastre/PriorityDevelopmentAreas/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 8,
      maxZoom: 18,
      legend: [
        { label: 'PDA Boundary', color: '#7b3294' },
      ],
    },
    quality: 'authoritative',
    tags: ['pda', 'development', 'planning'],
  },
  {
    id: 'qld-sda',
    name: 'State Development Areas',
    category: 'planning',
    description: 'Declared State Development Areas',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/PlanningCadastre/StateDevelopmentAreas/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 8,
      maxZoom: 18,
      legend: [
        { label: 'SDA Boundary', color: '#c51b7d' },
      ],
    },
    quality: 'authoritative',
    tags: ['sda', 'development', 'planning'],
  },

  // ============================================================================
  // HERITAGE LAYERS
  // ============================================================================
  {
    id: 'qld-cultural-heritage',
    name: 'Cultural Heritage',
    category: 'heritage',
    description: 'Aboriginal & Torres Strait Islander cultural heritage areas',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/Boundaries/CulturalHeritageBoundaries/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Cultural Heritage Management Plan', color: '#8c510a' },
      ],
    },
    quality: 'authoritative',
    tags: ['heritage', 'cultural', 'indigenous'],
  },

  // ============================================================================
  // ENVIRONMENT LAYERS
  // ============================================================================
  {
    id: 'qld-mses',
    name: 'Environmental Significance (MSES)',
    category: 'environment',
    description: 'Matters of State Environmental Significance',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'MSES Wetlands', color: '#1f78b4' },
        { label: 'MSES Wildlife', color: '#33a02c' },
        { label: 'MSES Regulated Vegetation', color: '#6a3d9a' },
      ],
    },
    quality: 'authoritative',
    tags: ['mses', 'environment', 'wetlands', 'wildlife'],
  },
  {
    id: 'qld-koala-habitat',
    name: 'Koala Habitat Areas',
    category: 'environment',
    description: 'SEQ Koala habitat mapping',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: SEQ_BOUNDS,
      states: ['QLD'],
      description: 'South East Queensland only',
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/Environment/KoalaPlan/MapServer`,
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 18,
      legend: [
        { label: 'Core Habitat', color: '#006d2c' },
        { label: 'Locally Refined', color: '#31a354' },
        { label: 'Habitat Area', color: '#74c476' },
      ],
    },
    quality: 'authoritative',
    tags: ['koala', 'habitat', 'seq', 'environment'],
  },
  {
    id: 'qld-protected-areas',
    name: 'Protected Areas',
    category: 'environment',
    description: 'National parks and protected areas',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/Environment/ParksTerrestrialProtectedAreas/MapServer`,
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
        { label: 'Conservation Park', color: '#91cf60' },
        { label: 'Resource Reserve', color: '#d9ef8b' },
      ],
    },
    quality: 'authoritative',
    tags: ['parks', 'protected', 'conservation', 'environment'],
  },
  {
    id: 'qld-acid-sulfate-soils',
    name: 'Acid Sulfate Soils',
    category: 'environment',
    description: 'Potential and actual acid sulfate soil areas',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: QLD_BOUNDS,
      states: ['QLD'],
    },
    service: {
      type: 'arcgis-dynamic',
      url: `${QLD_GIS_BASE}/GeoscientificInformation/SoilsAndLandResource/MapServer`,
      layers: [2052],
      format: 'png32',
      tileSize: 512,
      requiresProxy: true,
    },
    style: {
      opacity: 0.6,
      minZoom: 8,
      maxZoom: 18,
      legend: [
        { label: 'High Probability', color: '#d7191c' },
        { label: 'Low Probability', color: '#fdae61' },
        { label: 'Extremely Low Probability', color: '#1a9641' },
      ],
    },
    quality: 'authoritative',
    tags: ['soil', 'acid-sulfate', 'environment'],
  },
];

export default QLD_STATE_LAYERS;
