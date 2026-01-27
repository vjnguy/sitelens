/**
 * National Overlay Layers
 *
 * Layers from Geoscience Australia and other federal sources
 * These work across all of Australia
 */

import { OverlayLayer } from './types';

// Australia-wide bounding box
const AUSTRALIA_BOUNDS: [number, number, number, number] = [112.0, -44.0, 154.0, -10.0];

export const NATIONAL_LAYERS: OverlayLayer[] = [
  // ============================================================================
  // GEOSCIENCE AUSTRALIA - HAZARDS
  // ============================================================================
  {
    id: 'nat-seismic-hazard',
    name: 'National Seismic Hazard',
    category: 'hazards',
    description: 'Earthquake hazard assessment (NSHA23)',
    level: 'national',
    sourceId: 'geoscience-australia',
    coverage: {
      bounds: AUSTRALIA_BOUNDS,
      states: 'all',
      description: 'Australia-wide coverage',
    },
    service: {
      type: 'wms',
      url: 'https://services.ga.gov.au/gis/rest/services/NationalSeismicHazardAssessment/MapServer/WMSServer',
      layers: ['0'],
      format: 'image/png',
      requiresProxy: false,
    },
    style: {
      opacity: 0.6,
      minZoom: 3,
      maxZoom: 12,
      legend: [
        { label: 'Very High Hazard', color: '#d7191c' },
        { label: 'High Hazard', color: '#fdae61' },
        { label: 'Moderate Hazard', color: '#ffffbf' },
        { label: 'Low Hazard', color: '#a6d96a' },
        { label: 'Very Low Hazard', color: '#1a9641' },
      ],
    },
    quality: 'authoritative',
    lastUpdated: '2023',
    tags: ['earthquake', 'seismic', 'hazard', 'national'],
  },
  {
    id: 'nat-surface-geology',
    name: 'Surface Geology 1:1M',
    category: 'environment',
    description: 'National surface geology mapping',
    level: 'national',
    sourceId: 'geoscience-australia',
    coverage: {
      bounds: AUSTRALIA_BOUNDS,
      states: 'all',
    },
    service: {
      type: 'wms',
      url: 'https://services.ga.gov.au/gis/rest/services/GA_Surface_Geology/MapServer/WMSServer',
      layers: ['0'],
      format: 'image/png',
      requiresProxy: false,
    },
    style: {
      opacity: 0.7,
      minZoom: 3,
      maxZoom: 14,
    },
    quality: 'authoritative',
    tags: ['geology', 'surface', 'national'],
  },

  // ============================================================================
  // GEOSCAPE - ADMINISTRATIVE BOUNDARIES (Free tier)
  // ============================================================================
  {
    id: 'nat-lga-boundaries',
    name: 'Local Government Areas',
    category: 'boundaries',
    description: 'LGA boundaries across Australia',
    level: 'national',
    sourceId: 'geoscape',
    coverage: {
      bounds: AUSTRALIA_BOUNDS,
      states: 'all',
    },
    service: {
      type: 'wms',
      url: 'https://services.ga.gov.au/gis/rest/services/NM_AdminBoundaries_LGA/MapServer/WMSServer',
      layers: ['0'],
      format: 'image/png',
      requiresProxy: false,
    },
    style: {
      opacity: 0.5,
      minZoom: 4,
      maxZoom: 16,
      legend: [
        { label: 'LGA Boundary', color: '#7570b3' },
      ],
    },
    quality: 'authoritative',
    lastUpdated: 'Quarterly',
    tags: ['boundaries', 'lga', 'council', 'national'],
  },
  {
    id: 'nat-state-boundaries',
    name: 'State Boundaries',
    category: 'boundaries',
    description: 'State and territory boundaries',
    level: 'national',
    sourceId: 'geoscape',
    coverage: {
      bounds: AUSTRALIA_BOUNDS,
      states: 'all',
    },
    service: {
      type: 'wms',
      url: 'https://services.ga.gov.au/gis/rest/services/NM_AdminBoundaries_States/MapServer/WMSServer',
      layers: ['0'],
      format: 'image/png',
      requiresProxy: false,
    },
    style: {
      opacity: 0.6,
      minZoom: 2,
      maxZoom: 12,
      legend: [
        { label: 'State Boundary', color: '#1f78b4' },
      ],
    },
    quality: 'authoritative',
    tags: ['boundaries', 'state', 'national'],
  },

  // ============================================================================
  // BUREAU OF METEOROLOGY
  // ============================================================================
  {
    id: 'nat-catchment-boundaries',
    name: 'Catchment Boundaries',
    category: 'environment',
    description: 'Hydrological catchment areas',
    level: 'national',
    sourceId: 'bom',
    coverage: {
      bounds: AUSTRALIA_BOUNDS,
      states: 'all',
    },
    service: {
      type: 'wms',
      url: 'http://geofabric.bom.gov.au/simplefeatures/ows',
      layers: ['ahgf_hrr:AHGFCatchment'],
      format: 'image/png',
      version: '1.1.1',
      requiresProxy: true, // HTTP requires proxy
    },
    style: {
      opacity: 0.5,
      minZoom: 5,
      maxZoom: 14,
    },
    quality: 'authoritative',
    tags: ['hydrology', 'catchment', 'water', 'national'],
  },
];

export default NATIONAL_LAYERS;
