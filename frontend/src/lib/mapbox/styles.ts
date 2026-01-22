// Mapbox style configurations

export const MAPBOX_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain: 'mapbox://styles/mapbox/outdoors-v12',
} as const;

export type MapStyle = keyof typeof MAPBOX_STYLES;

// Style metadata for UI display
export const STYLE_INFO: Record<MapStyle, { name: string; icon: string; description: string }> = {
  streets: { name: 'Streets', icon: '🗺️', description: 'Standard street map' },
  light: { name: 'Light', icon: '☀️', description: 'Light minimal style' },
  satellite: { name: 'Satellite', icon: '🛰️', description: 'Pure satellite imagery' },
  satelliteStreets: { name: 'Hybrid', icon: '🗺️', description: 'Satellite with labels' },
  terrain: { name: 'Terrain', icon: '⛰️', description: 'Elevation and terrain' },
};

export const DEFAULT_STYLE: MapStyle = 'satelliteStreets';

// Default map center (Brisbane, Australia)
export const DEFAULT_CENTER: [number, number] = [153.0251, -27.4698];
export const DEFAULT_ZOOM = 14;

// Layer paint styles
export const DEFAULT_FILL_PAINT = {
  'fill-color': '#088',
  'fill-opacity': 0.4,
  'fill-outline-color': '#088',
};

export const DEFAULT_LINE_PAINT = {
  'line-color': '#088',
  'line-width': 2,
};

export const DEFAULT_CIRCLE_PAINT = {
  'circle-radius': 6,
  'circle-color': '#088',
  'circle-stroke-width': 2,
  'circle-stroke-color': '#fff',
};

// Color palettes for data visualization
export const COLOR_PALETTES = {
  sequential: {
    blue: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'],
    green: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32'],
    red: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d'],
    purple: ['#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#4a1486'],
  },
  diverging: {
    redBlue: ['#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac'],
    brownGreen: ['#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#80cdc1', '#35978f', '#01665e'],
  },
  categorical: {
    default: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
    pastel: ['#a6cee3', '#b2df8a', '#fb9a99', '#fdbf6f', '#cab2d6', '#ffff99', '#1f78b4', '#33a02c'],
  },
};

// Zoning color schemes (Australian standard)
export const ZONING_COLORS: Record<string, string> = {
  // Residential
  R1: '#FFFF00', // General Residential
  R2: '#FFFF66', // Low Density Residential
  R3: '#FFCC00', // Medium Density Residential
  R4: '#FF9900', // High Density Residential
  R5: '#FFFFCC', // Large Lot Residential

  // Business/Commercial
  B1: '#FF99CC', // Neighbourhood Centre
  B2: '#FF6699', // Local Centre
  B3: '#FF3366', // Commercial Core
  B4: '#CC0033', // Mixed Use
  B5: '#990033', // Business Development
  B6: '#660033', // Enterprise Corridor
  B7: '#FF0066', // Business Park

  // Industrial
  IN1: '#CC99FF', // General Industrial
  IN2: '#9966FF', // Light Industrial
  IN3: '#6633FF', // Heavy Industrial
  IN4: '#3300FF', // Working Waterfront

  // Environment/Conservation
  E1: '#00FF00', // National Parks
  E2: '#33CC33', // Environmental Conservation
  E3: '#66FF66', // Environmental Management
  E4: '#99FF99', // Environmental Living

  // Recreation/Open Space
  RE1: '#00FFFF', // Public Recreation
  RE2: '#66FFFF', // Private Recreation

  // Special Purpose
  SP1: '#CCCCCC', // Special Activities
  SP2: '#999999', // Infrastructure
  SP3: '#666666', // Tourist

  // Rural
  RU1: '#CC9966', // Primary Production
  RU2: '#996633', // Rural Landscape
  RU3: '#663300', // Forestry
  RU4: '#FFCC99', // Primary Production Small Lots
  RU5: '#FFE5CC', // Village
  RU6: '#CC6600', // Transition

  // Waterway
  W1: '#0066FF', // Natural Waterways
  W2: '#3399FF', // Recreational Waterways
  W3: '#66CCFF', // Working Waterways
};

// Overlay styling
export const OVERLAY_STYLES = {
  flood: {
    'fill-color': '#4169E1',
    'fill-opacity': 0.3,
    'fill-outline-color': '#4169E1',
  },
  bushfire: {
    'fill-color': '#FF4500',
    'fill-opacity': 0.3,
    'fill-outline-color': '#FF4500',
  },
  heritage: {
    'fill-color': '#8B4513',
    'fill-opacity': 0.3,
    'fill-outline-color': '#8B4513',
  },
  environmental: {
    'fill-color': '#228B22',
    'fill-opacity': 0.3,
    'fill-outline-color': '#228B22',
  },
};

// Draw tool styling
export const DRAW_STYLES = [
  // Polygon fill
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': '#3bb2d0',
      'fill-outline-color': '#3bb2d0',
      'fill-opacity': 0.2,
    },
  },
  // Polygon outline
  {
    id: 'gl-draw-polygon-stroke',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#3bb2d0',
      'line-width': 2,
    },
  },
  // Line
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#3bb2d0',
      'line-width': 2,
    },
  },
  // Point
  {
    id: 'gl-draw-point',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 6,
      'circle-color': '#3bb2d0',
    },
  },
  // Vertex points
  {
    id: 'gl-draw-vertex',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#fff',
      'circle-stroke-color': '#3bb2d0',
      'circle-stroke-width': 2,
    },
  },
];
