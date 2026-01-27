/**
 * Service Adapters for Overlay Layers
 *
 * Converts different service configurations into Mapbox-compatible tile URLs
 * Handles ArcGIS cached tiles, dynamic export, WMS, and other service types
 */

import type mapboxgl from 'mapbox-gl';
import {
  ServiceConfig,
  ArcGISCachedConfig,
  ArcGISDynamicConfig,
  ArcGISFeatureConfig,
  WMSConfig,
  XYZConfig,
  VectorTilesConfig,
  OverlayLayer,
} from './types';

// ============================================================================
// DATA FRESHNESS / METADATA
// ============================================================================

export interface LayerMetadata {
  lastEditDate?: Date;
  dataLastEditDate?: Date;
  description?: string;
  copyright?: string;
  source?: string;
  featureCount?: number;
}

/**
 * Fetch metadata for an ArcGIS layer including last updated date
 */
export async function fetchLayerMetadata(layer: OverlayLayer): Promise<LayerMetadata | null> {
  const config = layer.service;

  try {
    if (config.type === 'arcgis-feature' || config.type === 'arcgis-dynamic' || config.type === 'arcgis-cached') {
      // Query the service endpoint for metadata
      const metadataUrl = `${config.url}?f=json`;
      const response = await fetch(metadataUrl);

      if (!response.ok) return null;

      const data = await response.json();

      const editInfo = data.editingInfo || {};
      const lastEdit = editInfo.lastEditDate || editInfo.dataLastEditDate;

      return {
        lastEditDate: lastEdit ? new Date(lastEdit) : undefined,
        dataLastEditDate: editInfo.dataLastEditDate ? new Date(editInfo.dataLastEditDate) : undefined,
        description: data.description || data.serviceDescription,
        copyright: data.copyrightText,
        source: data.source,
        featureCount: data.featureCount,
      };
    }

    return null;
  } catch (error) {
    console.error(`[Overlay] Failed to fetch metadata for ${layer.id}:`, error);
    return null;
  }
}

/**
 * Check if data is considered stale (older than threshold)
 */
export function isDataStale(lastUpdated: Date | undefined, thresholdMonths: number = 24): boolean {
  if (!lastUpdated) return false; // Unknown = not marked as stale

  const now = new Date();
  const monthsAgo = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsAgo > thresholdMonths;
}

/**
 * Format a date for display (e.g., "Feb 2022" or "3 days ago")
 */
export function formatDataAge(date: Date | undefined): string {
  if (!date) return 'Unknown';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

  // For older dates, show month/year
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

// ============================================================================
// URL GENERATION
// ============================================================================

/**
 * Generate tile URL for ArcGIS cached tile services
 * These use the /tile/{z}/{y}/{x} pattern
 */
export function getArcGISCachedTileUrl(config: ArcGISCachedConfig): string {
  return `${config.url}/tile/{z}/{y}/{x}`;
}

/**
 * Generate tile URL for ArcGIS dynamic export services
 * These use the /export endpoint with bbox parameter
 */
export function getArcGISDynamicTileUrl(
  config: ArcGISDynamicConfig,
  useProxy: boolean = true
): string {
  // Build the URL manually to avoid double-encoding issues with commas
  const tileSize = config.tileSize || 512;
  const format = config.format || 'png32';

  const queryParts = [
    'f=image',
    `format=${format}`,
    'transparent=true',
    'dpi=96',
    'imageSR=3857',
    'bboxSR=3857',
    `size=${tileSize},${tileSize}`,
  ];

  // Add specific layers if defined
  if (config.layers && config.layers.length > 0) {
    queryParts.push(`layers=show:${config.layers.join(',')}`);
  }

  // Add dynamic layers for custom symbology if defined
  if (config.dynamicLayers) {
    queryParts.push(`dynamicLayers=${encodeURIComponent(config.dynamicLayers)}`);
  }

  // Base URL without bbox
  const baseUrl = `${config.url}/export?${queryParts.join('&')}`;

  if (useProxy && config.requiresProxy !== false) {
    // Route through our tile proxy to avoid CORS issues
    const encodedBase = encodeURIComponent(baseUrl);
    return `/api/tile-proxy?base=${encodedBase}&bbox={bbox-epsg-3857}`;
  }

  // Direct URL (may have CORS issues)
  return `${baseUrl}&bbox={bbox-epsg-3857}`;
}

/**
 * Generate tile URL for WMS services
 * Converts to Mapbox-compatible URL with bbox placeholder
 */
export function getWMSTileUrl(config: WMSConfig, useProxy: boolean = true): string {
  const version = config.version || '1.1.1';
  const format = config.format || 'image/png';
  const crs = config.crs || (version === '1.3.0' ? 'EPSG:3857' : 'EPSG:3857');

  // WMS 1.3.0 uses CRS, 1.1.x uses SRS
  const srsParam = version === '1.3.0' ? 'CRS' : 'SRS';
  // WMS 1.3.0 might use different bbox ordering for certain CRS
  const bboxParam = 'BBOX';

  const params = [
    'SERVICE=WMS',
    'REQUEST=GetMap',
    `VERSION=${version}`,
    `LAYERS=${config.layers.join(',')}`,
    `${srsParam}=${crs}`,
    `FORMAT=${encodeURIComponent(format)}`,
    'TRANSPARENT=TRUE',
    'WIDTH=512',
    'HEIGHT=512',
  ];

  const baseUrl = `${config.url}?${params.join('&')}`;

  if (useProxy && config.requiresProxy !== false) {
    const encodedBase = encodeURIComponent(baseUrl);
    return `/api/tile-proxy?base=${encodedBase}&bbox={bbox-epsg-3857}`;
  }

  return `${baseUrl}&${bboxParam}={bbox-epsg-3857}`;
}

/**
 * Generate tile URL for XYZ tile services
 */
export function getXYZTileUrl(config: XYZConfig): string {
  // XYZ URLs already have placeholders
  return config.url;
}

/**
 * Generate URL for ArcGIS FeatureServer query (returns GeoJSON)
 * Optionally includes bounding box for viewport-based queries
 *
 * @param config - FeatureServer configuration
 * @param bbox - Bounding box [minLng, minLat, maxLng, maxLat]
 * @param simplifyGeometry - If true, adds maxAllowableOffset for faster loading
 */
export function getArcGISFeatureUrl(
  config: ArcGISFeatureConfig,
  bbox?: [number, number, number, number], // [minLng, minLat, maxLng, maxLat]
  simplifyGeometry: boolean = true
): string {
  const params = new URLSearchParams({
    where: config.where || '1=1',
    outFields: '*',
    f: 'geojson',
    outSR: '4326',
    inSR: '4326',
  });

  // Add geometry filter if bbox provided
  if (bbox) {
    params.set('geometry', JSON.stringify({
      xmin: bbox[0],
      ymin: bbox[1],
      xmax: bbox[2],
      ymax: bbox[3],
      spatialReference: { wkid: 4326 }
    }));
    params.set('geometryType', 'esriGeometryEnvelope');
    params.set('spatialRel', 'esriSpatialRelIntersects');

    // Calculate maxAllowableOffset based on viewport size for geometry simplification
    // This dramatically speeds up loading by reducing vertex count
    // Larger offset = more simplification = faster but less precise
    if (simplifyGeometry) {
      const lngSpan = bbox[2] - bbox[0];
      const latSpan = bbox[3] - bbox[1];
      const viewportSize = Math.max(lngSpan, latSpan);

      // Calculate offset: roughly 1/500th of viewport in degrees
      // At zoom 14 (~0.01 degrees), this is about 2m offset - good detail
      // At zoom 10 (~0.1 degrees), this is about 20m offset - good for overview
      const offset = viewportSize / 500;

      // Only apply if offset is meaningful (>1m equivalent)
      if (offset > 0.00001) {
        params.set('maxAllowableOffset', offset.toString());
      }
    }
  }

  return `${config.url}/query?${params.toString()}`;
}

/**
 * Fetch GeoJSON from ArcGIS FeatureServer with optional bounding box
 */
export async function fetchArcGISFeatures(
  config: ArcGISFeatureConfig,
  bbox?: [number, number, number, number]
): Promise<GeoJSON.FeatureCollection> {
  const url = getArcGISFeatureUrl(config, bbox);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch features: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[Overlay] Error fetching features:', error);
    return { type: 'FeatureCollection', features: [] };
  }
}

/**
 * Query ArcGIS FeatureServer metadata to get the geometry type
 * This is more reliable than inferring from feature data
 */
async function fetchArcGISGeometryType(
  baseUrl: string
): Promise<'polygon' | 'line' | 'point' | null> {
  try {
    const response = await fetch(`${baseUrl}?f=json`);
    if (!response.ok) return null;

    const data = await response.json();
    const esriGeomType = data.geometryType;

    if (!esriGeomType) return null;

    // Map ESRI geometry types to our simplified types
    if (esriGeomType === 'esriGeometryPolygon' || esriGeomType === 'esriGeometryMultiPolygon') {
      return 'polygon';
    } else if (esriGeomType === 'esriGeometryPolyline' || esriGeomType === 'esriGeometryLine') {
      return 'line';
    } else if (esriGeomType === 'esriGeometryPoint' || esriGeomType === 'esriGeometryMultipoint') {
      return 'point';
    }

    return null;
  } catch (error) {
    console.warn('[Overlay] Failed to fetch geometry type from metadata:', error);
    return null;
  }
}

/**
 * Detect geometry type from GeoJSON features
 * Scans multiple features to find the dominant geometry type
 */
function detectGeometryTypeFromFeatures(
  features: GeoJSON.Feature[]
): 'polygon' | 'line' | 'point' | null {
  if (!features || features.length === 0) return null;

  const counts = { polygon: 0, line: 0, point: 0 };

  // Sample up to 10 features to determine geometry type
  const sampleSize = Math.min(features.length, 10);
  for (let i = 0; i < sampleSize; i++) {
    const geomType = features[i]?.geometry?.type;
    if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
      counts.polygon++;
    } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
      counts.line++;
    } else if (geomType === 'Point' || geomType === 'MultiPoint') {
      counts.point++;
    }
  }

  // Return the dominant type
  if (counts.polygon >= counts.line && counts.polygon >= counts.point && counts.polygon > 0) {
    return 'polygon';
  } else if (counts.line >= counts.point && counts.line > 0) {
    return 'line';
  } else if (counts.point > 0) {
    return 'point';
  }

  return null;
}

/**
 * Get the appropriate tile URL for any service configuration
 */
export function getTileUrl(config: ServiceConfig, useProxy: boolean = true): string {
  switch (config.type) {
    case 'arcgis-cached':
      return getArcGISCachedTileUrl(config);
    case 'arcgis-dynamic':
      return getArcGISDynamicTileUrl(config, useProxy);
    case 'wms':
      return getWMSTileUrl(config, useProxy);
    case 'xyz':
      return getXYZTileUrl(config);
    case 'arcgis-feature':
      return getArcGISFeatureUrl(config as ArcGISFeatureConfig);
    default:
      throw new Error(`Unsupported service type: ${(config as ServiceConfig).type}`);
  }
}

/**
 * Get tile size for the service type
 */
export function getTileSize(config: ServiceConfig): number {
  switch (config.type) {
    case 'arcgis-cached':
      return (config as ArcGISCachedConfig).tileSize || 256;
    case 'arcgis-dynamic':
      return (config as ArcGISDynamicConfig).tileSize || 512;
    case 'wms':
      return 512;
    case 'xyz':
      return (config as XYZConfig).tileSize || 256;
    default:
      return 256;
  }
}

// ============================================================================
// MAPBOX LAYER MANAGEMENT
// ============================================================================

/**
 * Get map bounds as [minLng, minLat, maxLng, maxLat]
 */
function getMapBounds(map: mapboxgl.Map): [number, number, number, number] {
  const bounds = map.getBounds();
  if (!bounds) {
    // Default to Australia bounds if map bounds not available
    return [113.0, -44.0, 154.0, -10.0];
  }
  return [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ];
}

/**
 * Add an overlay layer to a Mapbox map
 */
export async function addOverlayLayer(
  map: mapboxgl.Map,
  layer: OverlayLayer,
  beforeLayerId?: string
): Promise<void> {
  const sourceId = `source-${layer.id}`;
  const layerId = layer.id;

  console.log('[Overlay] Adding layer:', layerId);
  console.log('[Overlay] Service type:', layer.service.type);

  // Remove existing if present
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
  if (map.getLayer(`${layerId}-outline`)) {
    map.removeLayer(`${layerId}-outline`);
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }

  // Find insertion point - overlays go below user layers but above basemap
  // Insert before the first symbol layer (labels) so overlays appear under labels
  // User-added layers will be added on top of overlays
  let insertBeforeId: string | undefined = beforeLayerId;
  if (!insertBeforeId) {
    const layers = map.getStyle()?.layers || [];
    for (const l of layers) {
      // Insert before first symbol layer (labels stay on top)
      if (l.type === 'symbol') {
        insertBeforeId = l.id;
        break;
      }
    }
  }

  // Handle local vector tiles (from backend mbtiles or static files)
  if (layer.service.type === 'vector-tiles') {
    const config = layer.service as VectorTilesConfig;
    console.log('[Overlay] Adding vector tile layer:', layerId, 'source-layer:', config.sourceLayer);

    // Add vector tile source
    map.addSource(sourceId, {
      type: 'vector',
      tiles: [config.url],
      minzoom: layer.style.minZoom || 10,
      maxzoom: layer.style.maxZoom || 16,
    });

    // Build fill color expression from styleMap if provided
    let fillColor: any = layer.style.fillColor || '#3b82f6';
    let strokeColor: any = layer.style.strokeColor || '#1e40af';

    if (config.styleAttribute && config.styleMap) {
      const matchExpr: any[] = ['match', ['get', config.styleAttribute]];
      for (const [value, color] of Object.entries(config.styleMap)) {
        matchExpr.push(value, color);
      }
      matchExpr.push(fillColor); // fallback
      fillColor = matchExpr;
    }

    const geomType = config.geometryType || 'polygon';

    if (geomType === 'polygon') {
      // Check if fill should be transparent (no fill, outline only)
      const isTransparentFill = fillColor === 'transparent' || fillColor === 'rgba(0,0,0,0)';
      const fillOpacity = isTransparentFill ? 0 : layer.style.opacity * 0.6;

      // Add fill layer
      map.addLayer(
        {
          id: layerId,
          type: 'fill',
          source: sourceId,
          'source-layer': config.sourceLayer,
          paint: {
            'fill-color': isTransparentFill ? '#000000' : fillColor,
            'fill-opacity': fillOpacity,
          },
          minzoom: layer.style.minZoom || 0,
          maxzoom: layer.style.maxZoom || 22,
        },
        insertBeforeId
      );

      // Add outline
      map.addLayer(
        {
          id: `${layerId}-outline`,
          type: 'line',
          source: sourceId,
          'source-layer': config.sourceLayer,
          paint: {
            'line-color': strokeColor,
            'line-width': layer.style.strokeWidth || 1,
            'line-opacity': layer.style.opacity,
          },
          minzoom: layer.style.minZoom || 0,
          maxzoom: layer.style.maxZoom || 22,
        },
        insertBeforeId
      );
    } else if (geomType === 'line') {
      map.addLayer(
        {
          id: layerId,
          type: 'line',
          source: sourceId,
          'source-layer': config.sourceLayer,
          paint: {
            'line-color': strokeColor,
            'line-width': layer.style.strokeWidth || 2,
            'line-opacity': layer.style.opacity,
          },
          minzoom: layer.style.minZoom || 0,
          maxzoom: layer.style.maxZoom || 22,
        },
        insertBeforeId
      );
    } else {
      map.addLayer(
        {
          id: layerId,
          type: 'circle',
          source: sourceId,
          'source-layer': config.sourceLayer,
          paint: {
            'circle-color': fillColor,
            'circle-radius': (layer.style.iconSize || 8) / 2,
            'circle-opacity': layer.style.opacity,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
          minzoom: layer.style.minZoom || 0,
          maxzoom: layer.style.maxZoom || 22,
        },
        insertBeforeId
      );
    }

    console.log('[Overlay] Vector tile layer added:', layerId);
    return;
  }

  // Handle ArcGIS Feature layers (vector/GeoJSON)
  if (layer.service.type === 'arcgis-feature') {
    const config = layer.service as ArcGISFeatureConfig;

    // Get current viewport bounds for initial load
    const bbox = getMapBounds(map);
    console.log('[Overlay] Loading GeoJSON from FeatureServer with bbox:', bbox);
    const geojson = await fetchArcGISFeatures(config, bbox);
    console.log('[Overlay] Loaded', geojson.features.length, 'features');

    // Add GeoJSON source
    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
    });

    // Determine geometry type with fallback chain:
    // 1. Use config hint if provided (most reliable)
    // 2. Query service metadata (reliable but async)
    // 3. Detect from features (fallback)
    let detectedGeomType: 'polygon' | 'line' | 'point' | null = null;

    // Check config hint first
    if (config.geometryType) {
      detectedGeomType = config.geometryType;
      console.log('[Overlay] Using config geometry type:', detectedGeomType);
    }

    // If no hint, try to detect from features
    if (!detectedGeomType) {
      detectedGeomType = detectGeometryTypeFromFeatures(geojson.features);
      console.log('[Overlay] Detected geometry type from features:', detectedGeomType);
    }

    // If still no type, query service metadata (async, but don't block)
    if (!detectedGeomType) {
      detectedGeomType = await fetchArcGISGeometryType(config.url);
      console.log('[Overlay] Fetched geometry type from metadata:', detectedGeomType);
    }

    // Final fallback to polygon if all else fails
    if (!detectedGeomType) {
      console.warn('[Overlay] Could not determine geometry type, defaulting to polygon');
      detectedGeomType = 'polygon';
    }

    // Get first feature for flood styling checks
    const firstFeature = geojson.features[0];

    if (detectedGeomType === 'polygon') {
      // Determine fill color expression - use data-driven styling for flood layers
      let fillColor: any = layer.style.fillColor || '#3b82f6';
      let strokeColor: any = layer.style.strokeColor || '#1e40af';

      // Check if this is a flood awareness layer with categorized data
      // Brisbane FAM layers use FLOOD_RISK attribute with string values
      if (layer.id.includes('flood-awareness') && firstFeature?.properties) {
        const props = firstFeature.properties;
        const floodRisk = props.FLOOD_RISK || props.Flood_Risk || '';

        // Check if this is overland flow (has "Impact" in values) or river/creek (has likelihood values)
        if (layer.id.includes('overland') || floodRisk.includes('Impact')) {
          // Overland flow layers - FLOOD_RISK has "High Impact", "Medium Impact", "Low Impact"
          fillColor = [
            'match',
            ['get', 'FLOOD_RISK'],
            'High Impact', '#5e3c26',
            'Medium Impact', '#d4b896',
            'Low Impact', '#f5e6d3',
            'High', '#5e3c26',
            'Medium', '#d4b896',
            'Low', '#f5e6d3',
            // Fallback
            '#d4b896'
          ];
          strokeColor = [
            'match',
            ['get', 'FLOOD_RISK'],
            'High Impact', '#3d2518',
            'Medium Impact', '#b89d7a',
            'Low Impact', '#d9cfc2',
            'High', '#3d2518',
            'Medium', '#b89d7a',
            'Low', '#d9cfc2',
            '#b89d7a'
          ];
        } else if ('FLOOD_RISK' in props) {
          // River/Creek/Overall flood layers - FLOOD_RISK has "High", "Medium", "Low", "Very Low"
          fillColor = [
            'match',
            ['get', 'FLOOD_RISK'],
            'High', '#2166ac',
            'Medium', '#67a9cf',
            'Low', '#d1e5f0',
            'Very Low', '#f7f7f7',
            // Fallback
            '#67a9cf'
          ];
          strokeColor = [
            'match',
            ['get', 'FLOOD_RISK'],
            'High', '#1a5490',
            'Medium', '#4a8bb8',
            'Low', '#a8c9de',
            'Very Low', '#e0e0e0',
            '#4a8bb8'
          ];
        }
      }

      // Add fill layer
      map.addLayer(
        {
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': fillColor,
            'fill-opacity': layer.style.opacity * 0.6,
          },
          layout: {
            visibility: 'visible',
          },
          minzoom: layer.style.minZoom || 0,
          maxzoom: layer.style.maxZoom || 22,
        },
        insertBeforeId
      );

      // Add outline layer
      map.addLayer(
        {
          id: `${layerId}-outline`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': strokeColor,
            'line-width': layer.style.strokeWidth || 1,
            'line-opacity': layer.style.opacity,
          },
          layout: {
            visibility: 'visible',
          },
          minzoom: layer.style.minZoom || 0,
          maxzoom: layer.style.maxZoom || 22,
        },
        insertBeforeId
      );
    } else if (detectedGeomType === 'line') {
      // Add line layer
      map.addLayer(
        {
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': layer.style.strokeColor || '#06b6d4',
            'line-width': layer.style.strokeWidth || 2,
            'line-opacity': layer.style.opacity,
          },
          layout: {
            visibility: 'visible',
          },
          minzoom: layer.style.minZoom || 0,
          maxzoom: layer.style.maxZoom || 22,
        },
        insertBeforeId
      );
    } else {
      // Add circle layer for points (detectedGeomType === 'point')
      map.addLayer(
        {
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-color': layer.style.fillColor || '#f59e0b',
            'circle-radius': (layer.style.iconSize || 8) / 2,
            'circle-opacity': layer.style.opacity,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
          layout: {
            visibility: 'visible',
          },
          minzoom: layer.style.minZoom || 0,
          maxzoom: layer.style.maxZoom || 22,
        },
        insertBeforeId
      );
    }

    console.log('[Overlay] Vector layer added:', layerId);
    return;
  }

  // Handle raster tile layers (cached, dynamic, wms, xyz)
  const tileUrl = getTileUrl(layer.service);
  const tileSize = getTileSize(layer.service);

  console.log('[Overlay] Tile URL:', tileUrl);

  // Add raster tile source
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [tileUrl],
    tileSize: tileSize,
    attribution: layer.service.attribution || '',
  });

  // Add raster layer
  map.addLayer(
    {
      id: layerId,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-opacity': layer.style.opacity,
        'raster-brightness-min': 0,
        'raster-brightness-max': 1,
        'raster-saturation': 0.2,
        'raster-contrast': 0.1,
      },
      layout: {
        visibility: 'visible',
      },
      minzoom: layer.style.minZoom || 0,
      maxzoom: layer.style.maxZoom || 22,
    },
    insertBeforeId
  );

  console.log('[Overlay] Raster layer added:', layerId);
}

/**
 * Remove an overlay layer from a Mapbox map
 */
export function removeOverlayLayer(map: mapboxgl.Map, layerId: string): void {
  const sourceId = `source-${layerId}`;

  // Remove main layer
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
  // Remove outline layer (for vector polygons)
  if (map.getLayer(`${layerId}-outline`)) {
    map.removeLayer(`${layerId}-outline`);
  }
  // Remove source
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

/**
 * Toggle visibility of an overlay layer
 */
export function toggleOverlayLayer(map: mapboxgl.Map, layerId: string, visible: boolean): void {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

/**
 * Set opacity of an overlay layer
 */
export function setOverlayLayerOpacity(map: mapboxgl.Map, layerId: string, opacity: number): void {
  if (map.getLayer(layerId)) {
    // Try raster first, then line/fill for vector layers
    try {
      map.setPaintProperty(layerId, 'raster-opacity', opacity);
    } catch {
      try {
        map.setPaintProperty(layerId, 'line-opacity', opacity);
      } catch {
        try {
          map.setPaintProperty(layerId, 'fill-opacity', opacity * 0.6);
        } catch {
          try {
            map.setPaintProperty(layerId, 'circle-opacity', opacity);
          } catch {
            // Ignore if layer type doesn't support opacity
          }
        }
      }
    }
  }
}

/**
 * Refresh a FeatureServer layer with new viewport data
 * Call this on map moveend for large FeatureServer datasets
 */
export async function refreshFeatureLayer(
  map: mapboxgl.Map,
  layer: OverlayLayer
): Promise<void> {
  if (layer.service.type !== 'arcgis-feature') return;

  const sourceId = `source-${layer.id}`;
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;

  if (!source) return;

  const bbox = getMapBounds(map);
  console.log('[Overlay] Refreshing FeatureServer layer:', layer.id);

  try {
    const geojson = await fetchArcGISFeatures(layer.service as ArcGISFeatureConfig, bbox);
    console.log('[Overlay] Refreshed with', geojson.features.length, 'features');
    source.setData(geojson);
  } catch (error) {
    console.error('[Overlay] Error refreshing layer:', error);
  }
}

// ============================================================================
// PREVIEW URL GENERATION
// ============================================================================

/**
 * Generate a static preview image URL for a layer
 * Uses a fixed extent covering a representative area
 */
export function getLayerPreviewUrl(
  layer: OverlayLayer,
  bbox: [number, number, number, number], // [minX, minY, maxX, maxY] in Web Mercator
  width: number = 180,
  height: number = 100
): string {
  const config = layer.service;

  switch (config.type) {
    case 'arcgis-cached':
    case 'arcgis-dynamic': {
      const params = new URLSearchParams({
        f: 'image',
        format: 'png32',
        transparent: 'true',
        bbox: bbox.join(','),
        bboxSR: '3857',
        imageSR: '3857',
        size: `${width},${height}`,
      });

      if (config.type === 'arcgis-dynamic' && config.layers?.length) {
        params.set('layers', `show:${config.layers.join(',')}`);
      }

      return `${config.url}/export?${params.toString()}`;
    }

    case 'wms': {
      const version = config.version || '1.1.1';
      const srsParam = version === '1.3.0' ? 'CRS' : 'SRS';

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        REQUEST: 'GetMap',
        VERSION: version,
        LAYERS: config.layers.join(','),
        [srsParam]: 'EPSG:3857',
        FORMAT: config.format || 'image/png',
        TRANSPARENT: 'TRUE',
        WIDTH: width.toString(),
        HEIGHT: height.toString(),
        BBOX: bbox.join(','),
      });

      return `${config.url}?${params.toString()}`;
    }

    default:
      return '';
  }
}
