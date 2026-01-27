/**
 * Queensland Spatial Tile Layer Configuration
 *
 * These layers use ArcGIS tile services (cached or dynamic) to render
 * overlay data as raster tiles across the entire map.
 *
 * Two types of services:
 * 1. Cached tiles (TilesOnly) - Use /tile/{z}/{y}/{x} pattern
 * 2. Dynamic export - Use /export endpoint with bbox
 */

// Base URLs for Queensland services
const QLD_GIS_BASE = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services';
// ArcGIS Online tile services (new SPP locations)
const AGOL_TILES = 'https://tiles.arcgis.com/tiles/vkTwD8kHw2woKBqV/arcgis/rest/services';

export interface TileLayerConfig {
  id: string;
  name: string;
  category: 'Planning' | 'Hazards' | 'Heritage' | 'Environment' | 'Infrastructure' | 'Basemap';
  description: string;
  // ArcGIS MapServer URL (without /export or /tile)
  mapServerUrl: string;
  // Service type: 'cached' uses /tile/{z}/{y}/{x}, 'dynamic' uses /export
  serviceType: 'cached' | 'dynamic';
  // Specific layer IDs to display (only for dynamic services)
  layers?: number[];
  // Default visibility
  visible: boolean;
  // Opacity (0-1)
  opacity: number;
  // Min/max zoom levels
  minZoom?: number;
  maxZoom?: number;
  // Legend items for display
  legend?: { label: string; color: string }[];
}

/**
 * Queensland Planning & Overlay Tile Layers
 * These render as raster tiles for full map coverage
 *
 * Updated January 2026 - SPP services moved to ArcGIS Online
 */
export const QLD_TILE_LAYERS: TileLayerConfig[] = [
  // === HAZARD LAYERS (Priority - these work) ===
  {
    id: 'qld-bushfire-tiles',
    name: 'Bushfire Prone Areas',
    category: 'Hazards',
    description: 'State Planning Policy bushfire prone area mapping',
    mapServerUrl: `${AGOL_TILES}/Bushfire_Prone_Areas/MapServer`,
    serviceType: 'cached',
    visible: false,
    opacity: 0.7,
    minZoom: 8,
    legend: [
      { label: 'Very High Potential', color: '#d7191c' },
      { label: 'High Potential', color: '#fdae61' },
      { label: 'Medium Potential', color: '#ffffbf' },
      { label: 'Potential Impact Buffer', color: '#a6d96a' },
    ],
  },
  {
    id: 'qld-flood-tiles',
    name: 'Flood Study Areas',
    category: 'Hazards',
    description: 'Boundaries of completed flood studies (mainly river corridors)',
    mapServerUrl: `${QLD_GIS_BASE}/FloodCheck/FloodStudies/MapServer`,
    serviceType: 'dynamic',
    visible: false,
    opacity: 0.8,
    minZoom: 5,
    legend: [
      { label: 'Comprehensive Study', color: '#2166ac' },
      { label: 'Basic Study', color: '#92c5de' },
    ],
  },
  {
    id: 'qld-flood-hazard-tiles',
    name: 'Rapid Flood Hazard Assessment',
    category: 'Hazards',
    description: 'Flood hazard mapping (Regional QLD - Bundaberg, Rockhampton, etc.)',
    mapServerUrl: `${QLD_GIS_BASE}/FloodCheck/RapidHazardAssessment/MapServer`,
    serviceType: 'dynamic',
    visible: false,
    opacity: 0.7,
    minZoom: 8,
    legend: [
      { label: 'High Hazard', color: '#d7191c' },
      { label: 'Significant Hazard', color: '#fdae61' },
      { label: 'Low Hazard', color: '#1a9641' },
    ],
  },
  {
    id: 'qld-coastal-erosion-tiles',
    name: 'Coastal Erosion Prone Areas',
    category: 'Hazards',
    description: 'Erosion prone areas along the Queensland coastline',
    mapServerUrl: `${QLD_GIS_BASE}/PlanningCadastre/CoastalManagement/MapServer`,
    serviceType: 'dynamic',
    layers: [7, 8, 9], // Component 2 (erosion), Component 3 (sea level rise), Component 1 (40m buffer)
    visible: false,
    opacity: 0.6,
    minZoom: 10,
    legend: [
      { label: 'Calculated Erosion Distance', color: '#fee08b' },
      { label: 'Sea Level Rise', color: '#3288bd' },
      { label: '40m HAT Buffer', color: '#d53e4f' },
    ],
  },
  {
    id: 'qld-storm-tide-tiles',
    name: 'Storm Tide Hazard',
    category: 'Hazards',
    description: 'Storm tide inundation hazard areas',
    mapServerUrl: `${QLD_GIS_BASE}/PlanningCadastre/CoastalManagement/MapServer`,
    serviceType: 'dynamic',
    layers: [11, 12], // High hazard, Medium hazard
    visible: false,
    opacity: 0.6,
    minZoom: 10,
    legend: [
      { label: 'High Hazard', color: '#d7191c' },
      { label: 'Medium Hazard', color: '#fdae61' },
    ],
  },
  {
    id: 'qld-fuel-hazard-tiles',
    name: 'State Overall Fuel Hazard',
    category: 'Hazards',
    description: 'Bushfire fuel hazard across Queensland (30m grid)',
    mapServerUrl: `${AGOL_TILES}/State_Overall_Fuel_Hazard_v3/MapServer`,
    serviceType: 'cached',
    visible: false,
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
  {
    id: 'qld-vegetation-hazard-tiles',
    name: 'Broad Vegetation Hazard Class',
    category: 'Hazards',
    description: 'Vegetation-based bushfire hazard classification',
    mapServerUrl: `${AGOL_TILES}/Broad_Vegetation_Hazard_Class/MapServer`,
    serviceType: 'cached',
    visible: false,
    opacity: 0.6,
    minZoom: 8,
    legend: [
      { label: 'Very High Hazard', color: '#d7191c' },
      { label: 'High Hazard', color: '#fdae61' },
      { label: 'Medium Hazard', color: '#ffffbf' },
      { label: 'Low Hazard', color: '#1a9641' },
    ],
  },

  // === PLANNING LAYERS ===
  {
    id: 'qld-cadastre-tiles',
    name: 'Property Boundaries',
    category: 'Planning',
    description: 'Queensland cadastral boundaries (lot/plan)',
    mapServerUrl: `${QLD_GIS_BASE}/PlanningCadastre/LandParcelPropertyFramework/MapServer`,
    serviceType: 'dynamic',
    layers: [4], // Cadastral parcels layer
    visible: false,
    opacity: 0.8,
    minZoom: 14,
  },
  {
    id: 'qld-lga-tiles',
    name: 'Local Government Areas',
    category: 'Planning',
    description: 'Queensland LGA boundaries',
    mapServerUrl: `${QLD_GIS_BASE}/Boundaries/AdminBoundariesFramework/MapServer`,
    serviceType: 'dynamic',
    layers: [20],
    visible: false,
    opacity: 0.5,
    minZoom: 6,
  },
  {
    id: 'qld-priority-dev-tiles',
    name: 'Priority Development Areas',
    category: 'Planning',
    description: 'State declared Priority Development Areas (PDAs)',
    mapServerUrl: `${QLD_GIS_BASE}/PlanningCadastre/PriorityDevelopmentAreas/MapServer`,
    serviceType: 'dynamic',
    visible: false,
    opacity: 0.6,
    minZoom: 8,
    legend: [
      { label: 'PDA Boundary', color: '#7b3294' },
    ],
  },
  {
    id: 'qld-state-dev-tiles',
    name: 'State Development Areas',
    category: 'Planning',
    description: 'Declared State Development Areas',
    mapServerUrl: `${QLD_GIS_BASE}/PlanningCadastre/StateDevelopmentAreas/MapServer`,
    serviceType: 'dynamic',
    visible: false,
    opacity: 0.6,
    minZoom: 8,
    legend: [
      { label: 'SDA Boundary', color: '#c51b7d' },
    ],
  },

  // === HERITAGE LAYERS ===
  {
    id: 'qld-cultural-heritage-tiles',
    name: 'Cultural Heritage',
    category: 'Heritage',
    description: 'Aboriginal & Torres Strait Islander cultural heritage areas',
    mapServerUrl: `${QLD_GIS_BASE}/Boundaries/CulturalHeritageBoundaries/MapServer`,
    serviceType: 'dynamic',
    visible: false,
    opacity: 0.6,
    minZoom: 10,
    legend: [
      { label: 'Cultural Heritage Management Plan', color: '#8c510a' },
    ],
  },

  // === ENVIRONMENT LAYERS ===
  {
    id: 'qld-mses-tiles',
    name: 'Environmental Significance (MSES)',
    category: 'Environment',
    description: 'Matters of State Environmental Significance',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/MattersOfStateEnvironmentalSignificance/MapServer`,
    serviceType: 'dynamic',
    visible: false,
    opacity: 0.6,
    minZoom: 10,
    legend: [
      { label: 'MSES Wetlands', color: '#1f78b4' },
      { label: 'MSES Wildlife', color: '#33a02c' },
      { label: 'MSES Regulated Vegetation', color: '#6a3d9a' },
    ],
  },
  {
    id: 'qld-koala-tiles',
    name: 'Koala Habitat Areas',
    category: 'Environment',
    description: 'SEQ Koala habitat mapping',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/KoalaPlan/MapServer`,
    serviceType: 'dynamic',
    visible: false,
    opacity: 0.6,
    minZoom: 10,
    legend: [
      { label: 'Core Habitat', color: '#006d2c' },
      { label: 'Locally Refined', color: '#31a354' },
      { label: 'Habitat Area', color: '#74c476' },
    ],
  },
  {
    id: 'qld-protected-areas-tiles',
    name: 'Protected Areas',
    category: 'Environment',
    description: 'National parks and protected areas',
    mapServerUrl: `${QLD_GIS_BASE}/Environment/ParksTerrestrialProtectedAreas/MapServer`,
    serviceType: 'dynamic',
    visible: false,
    opacity: 0.5,
    minZoom: 8,
    legend: [
      { label: 'National Park', color: '#1a9850' },
      { label: 'Conservation Park', color: '#91cf60' },
      { label: 'Resource Reserve', color: '#d9ef8b' },
    ],
  },
  {
    id: 'qld-acid-sulfate-tiles',
    name: 'Acid Sulfate Soils',
    category: 'Environment',
    description: 'Potential and actual acid sulfate soil areas',
    mapServerUrl: `${QLD_GIS_BASE}/GeoscientificInformation/SoilsAndLandResource/MapServer`,
    serviceType: 'dynamic',
    layers: [2052], // National scale acid sulfate soils
    visible: false,
    opacity: 0.6,
    minZoom: 8,
    legend: [
      { label: 'High Probability', color: '#d7191c' },
      { label: 'Low Probability', color: '#fdae61' },
      { label: 'Extremely Low Probability', color: '#1a9641' },
    ],
  },
];

/**
 * Generate tile URL for Mapbox raster tile source
 *
 * Handles two service types:
 * 1. Cached tiles (ArcGIS Online) - Use /tile/{z}/{y}/{x} pattern
 * 2. Dynamic export - Use /export endpoint with bbox
 *
 * @param config - Layer configuration
 * @param useProxy - Whether to route through the tile proxy (for CORS issues with dynamic services)
 */
export function getArcGISExportTileUrl(config: TileLayerConfig, useProxy: boolean = true): string {
  // Cached tile services use XYZ tile pattern
  if (config.serviceType === 'cached') {
    // ArcGIS cached tiles use /tile/{z}/{y}/{x} pattern
    return `${config.mapServerUrl}/tile/{z}/{y}/{x}`;
  }

  // Dynamic export services
  // Build the URL manually to avoid double-encoding issues with commas
  const queryParts = [
    'f=image',
    'format=png32',
    'transparent=true',
    'dpi=96',
    'imageSR=3857',
    'bboxSR=3857',
    'size=512,512',
  ];

  // Add specific layers if defined
  if (config.layers && config.layers.length > 0) {
    queryParts.push(`layers=show:${config.layers.join(',')}`);
  }

  // Base URL without bbox
  const baseUrl = `${config.mapServerUrl}/export?${queryParts.join('&')}`;

  if (useProxy) {
    // Route through our tile proxy to avoid CORS issues
    // The bbox placeholder {bbox-epsg-3857} stays outside the encoded part
    const encodedBase = encodeURIComponent(baseUrl);
    return `/api/tile-proxy?base=${encodedBase}&bbox={bbox-epsg-3857}`;
  }

  // Direct URL (may have CORS issues)
  return `${baseUrl}&bbox={bbox-epsg-3857}`;
}

/**
 * Add a Queensland tile layer to a Mapbox map
 */
export function addQldTileLayer(
  map: mapboxgl.Map,
  config: TileLayerConfig,
  beforeLayerId?: string
): void {
  const sourceId = `source-${config.id}`;
  const layerId = config.id;
  const tileUrl = getArcGISExportTileUrl(config);

  console.log('[QLD Tiles] Adding layer:', layerId);
  console.log('[QLD Tiles] Service type:', config.serviceType);
  console.log('[QLD Tiles] Tile URL template:', tileUrl);
  console.log('[QLD Tiles] Config:', { opacity: config.opacity, visible: config.visible, minZoom: config.minZoom });

  // Remove existing if present
  if (map.getLayer(layerId)) {
    console.log('[QLD Tiles] Removing existing layer:', layerId);
    map.removeLayer(layerId);
  }
  if (map.getSource(sourceId)) {
    console.log('[QLD Tiles] Removing existing source:', sourceId);
    map.removeSource(sourceId);
  }

  // Tile size: 256 for ArcGIS Online cached tiles, 512 for dynamic export
  const tileSize = config.serviceType === 'cached' ? 256 : 512;

  // Add raster tile source
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [tileUrl],
    tileSize: tileSize,
    attribution: '© State of Queensland',
  });
  console.log('[QLD Tiles] Source added:', sourceId, 'tileSize:', tileSize);
  console.log('[QLD Tiles] Full tile URL:', tileUrl);

  // Listen for source data events to debug tile loading
  const handleSourceData = (e: mapboxgl.MapSourceDataEvent) => {
    if (e.sourceId === sourceId) {
      console.log('[QLD Tiles] Source data event:', sourceId, 'isSourceLoaded:', e.isSourceLoaded);
    }
  };
  map.on('sourcedata', handleSourceData);

  // Find a good insertion point - we want overlay tiles above the base map
  // but below labels and symbols for better UX
  let insertBeforeId: string | undefined = beforeLayerId;

  if (!insertBeforeId) {
    // Try to find the first symbol/label layer to insert before it
    const layers = map.getStyle()?.layers || [];
    for (const layer of layers) {
      if (layer.type === 'symbol') {
        insertBeforeId = layer.id;
        break;
      }
    }
    // If no symbol layer found, layer will be added on top (undefined)
  }

  console.log('[QLD Tiles] Inserting layer before:', insertBeforeId || 'TOP');

  // Add raster layer with enhanced visibility settings
  map.addLayer(
    {
      id: layerId,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-opacity': config.opacity,
        'raster-brightness-min': 0,
        'raster-brightness-max': 1,
        'raster-saturation': 0.2, // Slight boost to make colors more visible
        'raster-contrast': 0.1, // Slight contrast boost
      },
      layout: {
        visibility: 'visible', // Always set to visible when adding
      },
      minzoom: config.minZoom || 0,
      maxzoom: config.maxZoom || 22,
    },
    insertBeforeId
  );

  // Debug: Verify layer was added correctly
  const addedLayer = map.getLayer(layerId);
  const addedSource = map.getSource(sourceId);
  console.log('[QLD Tiles] Layer added:', layerId);
  console.log('[QLD Tiles] Layer exists:', !!addedLayer);
  console.log('[QLD Tiles] Source exists:', !!addedSource);
  console.log('[QLD Tiles] Layer visibility:', addedLayer ? map.getLayoutProperty(layerId, 'visibility') : 'N/A');
  console.log('[QLD Tiles] Raster opacity:', addedLayer ? map.getPaintProperty(layerId, 'raster-opacity') : 'N/A');
  console.log('[QLD Tiles] Current zoom:', map.getZoom(), 'Layer minZoom:', config.minZoom || 0);

  // Log all layers to see ordering
  const allLayers = map.getStyle()?.layers || [];
  const layerIndex = allLayers.findIndex(l => l.id === layerId);
  console.log('[QLD Tiles] Layer index in stack:', layerIndex, 'of', allLayers.length, 'layers');

  // Log surrounding layers for context
  if (layerIndex > 0) {
    console.log('[QLD Tiles] Layer below:', allLayers[layerIndex - 1]?.id, allLayers[layerIndex - 1]?.type);
  }
  if (layerIndex < allLayers.length - 1) {
    console.log('[QLD Tiles] Layer above:', allLayers[layerIndex + 1]?.id, allLayers[layerIndex + 1]?.type);
  }
}

/**
 * Remove a Queensland tile layer from a Mapbox map
 */
export function removeQldTileLayer(map: mapboxgl.Map, layerId: string): void {
  const sourceId = `source-${layerId}`;

  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

/**
 * Toggle visibility of a Queensland tile layer
 */
export function toggleQldTileLayer(map: mapboxgl.Map, layerId: string, visible: boolean): void {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

/**
 * Set opacity of a Queensland tile layer
 */
export function setQldTileLayerOpacity(map: mapboxgl.Map, layerId: string, opacity: number): void {
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, 'raster-opacity', opacity);
  }
}

/**
 * Get layers grouped by category
 */
export function getLayersByCategory(): Record<string, TileLayerConfig[]> {
  return QLD_TILE_LAYERS.reduce((acc, layer) => {
    if (!acc[layer.category]) {
      acc[layer.category] = [];
    }
    acc[layer.category].push(layer);
    return acc;
  }, {} as Record<string, TileLayerConfig[]>);
}

/**
 * Generate a static preview image URL for a layer
 * Uses ArcGIS MapServer export with a fixed extent covering SEQ region
 */
export function getLayerPreviewUrl(
  config: TileLayerConfig,
  width: number = 180,
  height: number = 100
): string {
  // Use a fixed extent covering South East Queensland
  // This ensures consistent previews showing actual data
  const bbox = '16992049,-3304840,17141000,-3140000'; // EPSG:3857 Web Mercator

  const params = new URLSearchParams({
    f: 'image',
    format: 'png32',
    transparent: 'true',
    bbox: bbox,
    bboxSR: '3857',
    imageSR: '3857',
    size: `${width},${height}`,
  });

  if (config.layers && config.layers.length > 0) {
    params.set('layers', `show:${config.layers.join(',')}`);
  }

  return `${config.mapServerUrl}/export?${params.toString()}`;
}

/**
 * Generate a preview URL for a specific map extent
 */
export function getLayerPreviewUrlForExtent(
  config: TileLayerConfig,
  bbox: [number, number, number, number], // [minX, minY, maxX, maxY] in Web Mercator
  width: number = 180,
  height: number = 100
): string {
  const params = new URLSearchParams({
    f: 'image',
    format: 'png32',
    transparent: 'true',
    bbox: bbox.join(','),
    bboxSR: '3857',
    imageSR: '3857',
    size: `${width},${height}`,
  });

  if (config.layers && config.layers.length > 0) {
    params.set('layers', `show:${config.layers.join(',')}`);
  }

  return `${config.mapServerUrl}/export?${params.toString()}`;
}
