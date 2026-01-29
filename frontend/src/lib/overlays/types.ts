/**
 * Australia-Wide Overlay Layer System
 *
 * Type definitions for the unified overlay layer registry
 * Supports National, State, and Council level data sources
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type AustralianState =
  | 'QLD'
  | 'NSW'
  | 'VIC'
  | 'SA'
  | 'WA'
  | 'NT'
  | 'TAS'
  | 'ACT';

export type DataLevel = 'national' | 'state' | 'council';

export type LayerCategory =
  | 'hazards'      // Bushfire, flood, coastal, landslide
  | 'planning'     // Zoning, overlays, development
  | 'environment'  // Vegetation, protected areas, koala habitat
  | 'heritage'     // Cultural, historical
  | 'infrastructure' // Transport, utilities
  | 'boundaries'   // Cadastre, LGA, suburbs
  | 'imagery';     // Aerial, satellite

export type ServiceType =
  | 'arcgis-cached'   // /tile/{z}/{y}/{x} pattern
  | 'arcgis-dynamic'  // /export?bbox= pattern
  | 'arcgis-feature'  // FeatureServer - returns GeoJSON
  | 'wms'             // OGC Web Map Service
  | 'wfs'             // OGC Web Feature Service (vector)
  | 'geojson'         // Static GeoJSON
  | 'xyz'             // Standard XYZ tiles
  | 'vector-tiles';   // Local MVT vector tiles (from backend/mbtiles)

export type DataQuality =
  | 'authoritative'   // Official government source
  | 'indicative'      // General guidance only
  | 'draft'           // Subject to change
  | 'historical';     // May be outdated

// ============================================================================
// BOUNDING BOX & COVERAGE
// ============================================================================

/** [minLng, minLat, maxLng, maxLat] in WGS84 */
export type BoundingBox = [number, number, number, number];

export interface CoverageInfo {
  /** Geographic bounds where this layer has data */
  bounds: BoundingBox;
  /** States/territories this layer covers */
  states: AustralianState[] | 'all';
  /** Specific councils covered (for council-level data) */
  councils?: string[];
  /** Human-readable coverage description */
  description?: string;
}

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

export interface BaseServiceConfig {
  type: ServiceType;
  /** Base URL for the service */
  url: string;
  /** Whether requests need to go through our proxy (CORS issues) */
  requiresProxy?: boolean;
  /** Attribution text */
  attribution?: string;
}

export interface ArcGISCachedConfig extends BaseServiceConfig {
  type: 'arcgis-cached';
  /** Tile size (usually 256) */
  tileSize?: number;
}

export interface ArcGISDynamicConfig extends BaseServiceConfig {
  type: 'arcgis-dynamic';
  /** Specific layer IDs to display */
  layers?: number[];
  /** Image format (default: png32) */
  format?: string;
  /** Tile size for export (default: 512) */
  tileSize?: number;
  /** Custom dynamic layers JSON for symbology override */
  dynamicLayers?: string;
}

export interface ArcGISFeatureConfig extends BaseServiceConfig {
  type: 'arcgis-feature';
  /** Output format (default: geojson) */
  format?: 'geojson' | 'json';
  /** Max features to fetch at once */
  maxRecords?: number;
  /** Where clause for filtering */
  where?: string;
  /** Geometry type hint (avoids runtime detection issues) */
  geometryType?: 'polygon' | 'line' | 'point';
  /** Style attribute for data-driven styling */
  styleAttribute?: string;
  /** Style mapping: attribute value -> color */
  styleMap?: Record<string, string>;
}

export interface WMSConfig extends BaseServiceConfig {
  type: 'wms';
  /** WMS layer names */
  layers: string[];
  /** Image format (default: image/png) */
  format?: string;
  /** WMS version (default: 1.1.1) */
  version?: string;
  /** Coordinate reference system */
  crs?: string;
}

export interface WFSConfig extends BaseServiceConfig {
  type: 'wfs';
  /** Feature type name */
  typeName: string;
  /** Output format */
  outputFormat?: string;
  /** Max features to return */
  maxFeatures?: number;
}

export interface GeoJSONConfig extends BaseServiceConfig {
  type: 'geojson';
  /** URL to GeoJSON file */
  url: string;
  /** Refresh interval in milliseconds (0 = no refresh) */
  refreshInterval?: number;
}

export interface XYZConfig extends BaseServiceConfig {
  type: 'xyz';
  /** Tile URL template with {z}, {x}, {y} placeholders */
  url: string;
  tileSize?: number;
}

export interface VectorTilesConfig extends BaseServiceConfig {
  type: 'vector-tiles';
  /** Tile URL template with {z}, {x}, {y} placeholders (returns PBF) */
  url: string;
  /** Layer name within the vector tile (from tippecanoe -L option) */
  sourceLayer: string;
  /** Geometry type hint for styling */
  geometryType?: 'polygon' | 'line' | 'point';
  /** Style attribute for data-driven styling */
  styleAttribute?: string;
  /** Style mapping: attribute value -> color */
  styleMap?: Record<string, string>;
}

export type ServiceConfig =
  | ArcGISCachedConfig
  | ArcGISDynamicConfig
  | ArcGISFeatureConfig
  | WMSConfig
  | WFSConfig
  | GeoJSONConfig
  | XYZConfig
  | VectorTilesConfig;

// ============================================================================
// LEGEND & STYLING
// ============================================================================

export interface LegendItem {
  label: string;
  color: string;
  /** Optional: for pattern fills */
  pattern?: 'solid' | 'hatched' | 'dotted';
}

export interface LayerStyle {
  /** Default opacity (0-1) */
  opacity: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Legend items for display */
  legend?: LegendItem[];
  /** Fill color for polygons */
  fillColor?: string;
  /** Stroke/outline color */
  strokeColor?: string;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Dash pattern for lines (e.g., [5, 5] for dashed) */
  lineDashArray?: number[];
  /** Icon URL for point layers */
  iconUrl?: string;
  /** Icon size in pixels */
  iconSize?: number;
}

// ============================================================================
// DATA SOURCE METADATA
// ============================================================================

export interface DataSource {
  /** Unique identifier for the data source */
  id: string;
  /** Human-readable name */
  name: string;
  /** Organization providing the data */
  provider: string;
  /** Level of government */
  level: DataLevel;
  /** States covered */
  states: AustralianState[] | 'all';
  /** Base URL for the service */
  baseUrl: string;
  /** API documentation URL */
  docsUrl?: string;
  /** Data portal URL */
  portalUrl?: string;
  /** Update frequency description */
  updateFrequency?: string;
  /** License information */
  license?: string;
  /** Last verified date */
  lastVerified?: string;
  /** Is this source currently working? */
  status: 'active' | 'degraded' | 'offline' | 'unknown';
}

// ============================================================================
// OVERLAY LAYER DEFINITION
// ============================================================================

export interface OverlayLayer {
  /** Unique layer identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Layer category */
  category: LayerCategory;
  /** Brief description */
  description: string;

  /** Data level (national, state, council) */
  level: DataLevel;
  /** Reference to data source */
  sourceId: string;

  /** Coverage information */
  coverage: CoverageInfo;

  /** Service configuration */
  service: ServiceConfig;

  /** Display styling */
  style: LayerStyle;

  /** Data quality indicator */
  quality?: DataQuality;

  /** Last data update (if known) */
  lastUpdated?: string;

  /** Tags for search/filtering */
  tags?: string[];

  /** Direct URL to the specific data source page for this layer */
  sourceUrl?: string;

  /** Is this layer enabled by default? */
  defaultEnabled?: boolean;

  /** Is this layer currently working? */
  status?: 'active' | 'degraded' | 'offline';
}

// ============================================================================
// REGISTRY & RUNTIME TYPES
// ============================================================================

export interface LayerRegistry {
  version: string;
  lastUpdated: string;
  dataSources: DataSource[];
  layers: OverlayLayer[];
}

export interface ActiveLayer extends OverlayLayer {
  /** Runtime: is the layer currently visible? */
  visible: boolean;
  /** Runtime: current opacity setting */
  currentOpacity: number;
  /** Runtime: is the layer loading? */
  loading?: boolean;
  /** Runtime: any error message */
  error?: string;
}

export interface ViewportCoverage {
  /** Layer ID */
  layerId: string;
  /** Does the viewport intersect the layer's coverage? */
  inCoverage: boolean;
  /** Percentage of viewport covered (0-100) */
  coveragePercent?: number;
}

// ============================================================================
// COUNCIL DEFINITION
// ============================================================================

export interface Council {
  /** Unique identifier (e.g., "qld-brisbane") */
  id: string;
  /** Official name */
  name: string;
  /** State/territory */
  state: AustralianState;
  /** Approximate population */
  population: number;
  /** Geographic bounds */
  bounds: BoundingBox;
  /** Open data portal URL (if available) */
  dataPortalUrl?: string;
  /** GIS services URL (if available) */
  gisServicesUrl?: string;
  /** Planning scheme URL */
  planningSchemeUrl?: string;
  /** What data is available? */
  availableData: {
    planning?: boolean;
    hazards?: boolean;
    heritage?: boolean;
    infrastructure?: boolean;
    openData?: boolean;
  };
  /** Notes about data availability */
  notes?: string;
}
