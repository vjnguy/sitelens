/**
 * Imagery Overlay Layers
 *
 * Satellite and aerial imagery sources - no API key required
 *
 * Includes:
 * - ESRI World Imagery (global coverage)
 * - QLD State Aerial Imagery (latest state program imagery - free WMS)
 * - QLD Historical Aerial (earliest available imagery - grayscale)
 * - QLD Satellite 2017 (Planet imagery - statewide 2.4m resolution)
 * - Google Satellite/Hybrid (global coverage)
 *
 * NOTE: QLD Historical Imagery (QImagery) for SPECIFIC DATES requires authentication.
 * The free services provide "earliest" and "latest" but not year-by-year selection.
 * Access date-specific imagery via: https://qimagery.information.qld.gov.au/
 */

import type { OverlayLayer } from './types';

// ============================================================================
// ESRI SATELLITE IMAGERY (Free, high quality)
// ============================================================================

export const ESRI_IMAGERY_LAYERS: OverlayLayer[] = [
  {
    id: 'esri-world-imagery',
    name: 'Satellite Imagery (ESRI)',
    category: 'imagery',
    description: 'High-resolution global satellite and aerial imagery from Maxar/Earthstar',
    level: 'national',
    sourceId: 'esri',
    coverage: {
      bounds: [113.0, -44.0, 154.0, -10.0],
      states: 'all',
    },
    service: {
      type: 'xyz',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
    style: {
      opacity: 1.0,
      minZoom: 0,
      maxZoom: 19,
    },
    quality: 'authoritative',
    tags: ['imagery', 'satellite', 'esri', 'free'],
  },
];

// ============================================================================
// QLD STATE IMAGERY (Free WMS service)
// ============================================================================

export const QLD_IMAGERY_LAYERS: OverlayLayer[] = [
  {
    id: 'qld-latest-imagery',
    name: 'QLD Aerial Imagery (Latest)',
    category: 'imagery',
    description: 'Latest publicly available Queensland aerial imagery from the State Remotely Sensed Image Library - 0.5cm to 240cm resolution',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: [138.0, -29.2, 154.0, -10.0],
      states: ['QLD'],
      description: 'Queensland state coverage',
    },
    service: {
      type: 'wms',
      url: 'https://spatial-img.information.qld.gov.au/arcgis/services/Basemaps/LatestStateProgram_AllUsers/ImageServer/WMSServer',
      layers: ['LatestStateProgram_AllUsers'],
      format: 'image/png',
      version: '1.3.0',
      crs: 'EPSG:3857',
      attribution: '© State of Queensland',
    },
    style: {
      opacity: 1.0,
      minZoom: 10,
      maxZoom: 21,
    },
    quality: 'authoritative',
    tags: ['imagery', 'aerial', 'qld', 'state', 'free', 'latest'],
  },
  {
    id: 'qld-earliest-imagery',
    name: 'QLD Historical Aerial (Earliest)',
    category: 'imagery',
    description: 'Earliest available Queensland aerial imagery from the State Remotely Sensed Image Library - grayscale orthorectified historical photography',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: [138.0, -29.2, 154.0, -10.0],
      states: ['QLD'],
      description: 'Queensland state coverage (varies by location)',
    },
    service: {
      type: 'wms',
      url: 'https://spatial-img.information.qld.gov.au/arcgis/services/Basemaps/EarliestAerialOrtho_AllUsers/ImageServer/WMSServer',
      layers: ['EarliestAerialOrtho_AllUsers'],
      format: 'image/png',
      version: '1.3.0',
      crs: 'EPSG:3857',
      attribution: '© State of Queensland, Geoscience Australia',
    },
    style: {
      opacity: 1.0,
      minZoom: 10,
      maxZoom: 21,
    },
    quality: 'authoritative',
    tags: ['imagery', 'aerial', 'qld', 'state', 'free', 'historical', 'grayscale'],
  },
  {
    id: 'qld-satellite-2017',
    name: 'QLD Satellite Imagery (2017)',
    category: 'imagery',
    description: 'Queensland satellite imagery from Q3 2017 - 2.4m resolution Planet imagery covering the entire state',
    level: 'state',
    sourceId: 'qld-spatial',
    coverage: {
      bounds: [138.0, -29.2, 154.0, -10.0],
      states: ['QLD'],
      description: 'Queensland state coverage',
    },
    service: {
      type: 'wms',
      url: 'https://spatial-img.information.qld.gov.au/arcgis/services/Basemaps/LatestSatelliteWOS_AllUsers/ImageServer/WMSServer',
      layers: ['LatestSatelliteWOS_AllUsers'],
      format: 'image/png',
      version: '1.3.0',
      crs: 'EPSG:3857',
      attribution: '© Planet Labs, State of Queensland',
    },
    style: {
      opacity: 1.0,
      minZoom: 8,
      maxZoom: 18,
    },
    quality: 'authoritative',
    tags: ['imagery', 'satellite', 'qld', 'state', 'free', '2017', 'planet'],
  },
];

// ============================================================================
// GOOGLE IMAGERY (Works without API key)
// ============================================================================

export const GOOGLE_LAYERS: OverlayLayer[] = [
  {
    id: 'google-satellite',
    name: 'Google Satellite',
    category: 'imagery',
    description: 'Google satellite imagery - highest resolution in urban areas',
    level: 'national',
    sourceId: 'google',
    coverage: {
      bounds: [113.0, -44.0, 154.0, -10.0],
      states: 'all',
    },
    service: {
      type: 'xyz',
      url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      tileSize: 256,
      attribution: '© Google',
    },
    style: {
      opacity: 1.0,
      minZoom: 0,
      maxZoom: 21,
    },
    quality: 'authoritative',
    tags: ['imagery', 'satellite', 'google'],
  },
  {
    id: 'google-hybrid',
    name: 'Google Hybrid',
    category: 'imagery',
    description: 'Google satellite with road labels overlay',
    level: 'national',
    sourceId: 'google',
    coverage: {
      bounds: [113.0, -44.0, 154.0, -10.0],
      states: 'all',
    },
    service: {
      type: 'xyz',
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      tileSize: 256,
      attribution: '© Google',
    },
    style: {
      opacity: 1.0,
      minZoom: 0,
      maxZoom: 21,
    },
    quality: 'authoritative',
    tags: ['imagery', 'satellite', 'hybrid', 'google'],
  },
];

// ============================================================================
// EXPORTS
// ============================================================================

// Empty arrays for backwards compatibility with existing imports
export const CARTO_LAYERS: OverlayLayer[] = [];
export const OSM_LAYERS: OverlayLayer[] = [];
export const TOPO_LAYERS: OverlayLayer[] = [];

// All available imagery layers
export const FREE_IMAGERY_LAYERS: OverlayLayer[] = [
  ...ESRI_IMAGERY_LAYERS,
  ...QLD_IMAGERY_LAYERS,
  ...GOOGLE_LAYERS,
];

export const ALL_IMAGERY_LAYERS: OverlayLayer[] = FREE_IMAGERY_LAYERS;

// Quick access
export const RECOMMENDED_IMAGERY = {
  satellite: ESRI_IMAGERY_LAYERS[0],
  qldAerial: QLD_IMAGERY_LAYERS[0],
  qldHistorical: QLD_IMAGERY_LAYERS[1],
  qldSatellite2017: QLD_IMAGERY_LAYERS[2],
  google: GOOGLE_LAYERS[0],
  hybrid: GOOGLE_LAYERS[1],
};

export const IMAGERY_LAYER_COUNT = ALL_IMAGERY_LAYERS.length;
