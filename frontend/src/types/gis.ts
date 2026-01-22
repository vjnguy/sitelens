import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

// Project types
export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  bounds?: BoundingBox;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
}

export interface ProjectSettings {
  defaultCenter?: [number, number];
  defaultZoom?: number;
  basemap?: string;
}

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

// Layer types
export interface Layer {
  id: string;
  project_id: string;
  name: string;
  type: LayerType;
  source_type: SourceType;
  source_config: SourceConfig;
  style: LayerStyle;
  visible: boolean;
  order_index: number;
  created_at: string;
  // Dynamic loading configuration
  dynamicSource?: {
    sourceId: string;
    datasetId: string;
    filters?: Record<string, string>;
    maxFeatures?: number;
  };
  isLoading?: boolean;
  featureCount?: number;
}

export type LayerType = 'vector' | 'raster' | 'api';
export type SourceType = 'geojson' | 'tiles' | 'wms' | 'api' | 'file';

export interface SourceConfig {
  url?: string;
  data?: FeatureCollection;
  tileSize?: number;
  attribution?: string;
  apiEndpoint?: string;
  apiParams?: Record<string, string>;
}

export interface LayerStyle {
  type?: 'fill' | 'line' | 'circle' | 'symbol';
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  filter?: unknown[];
}

// Dataset types
export interface Dataset {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: DatasetType;
  storage_path?: string;
  metadata: DatasetMetadata;
  created_at: string;
}

export type DatasetType = 'geojson' | 'shapefile' | 'csv' | 'kml' | 'geopackage';

export interface DatasetMetadata {
  featureCount?: number;
  geometry_type?: string;
  properties?: string[];
  bounds?: BoundingBox;
  crs?: string;
}

// Analysis script types
export interface AnalysisScript {
  id: string;
  project_id: string;
  name: string;
  code: string;
  language: 'javascript' | 'python';
  is_protected: boolean;
  created_at: string;
  updated_at: string;
}

// AI conversation types
export interface AIConversation {
  id: string;
  project_id: string;
  user_id: string;
  messages: AIMessage[];
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    query_type?: 'spatial' | 'analysis' | 'general';
    generated_code?: string;
    affected_layers?: string[];
  };
}

// Map state types
export interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  bounds?: BoundingBox;
}

export interface DrawState {
  mode: DrawMode;
  features: Feature[];
}

export type DrawMode =
  | 'simple_select'
  | 'direct_select'
  | 'draw_point'
  | 'draw_line_string'
  | 'draw_polygon'
  | 'draw_rectangle'
  | 'draw_circle';

// Data source types
export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  config: DataSourceConfig;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}

export type DataSourceType = 'api' | 'file' | 'database' | 'wms' | 'wfs';

export interface DataSourceConfig {
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  refreshInterval?: number;
}

// Property data types (for Australian data)
export interface PropertyData {
  id: string;
  address: string;
  lot?: string;
  plan?: string;
  lga?: string;
  state?: string;
  postcode?: string;
  geometry: Geometry;
  zoning?: ZoningInfo;
  overlays?: OverlayInfo[];
  metadata?: Record<string, unknown>;
}

export interface ZoningInfo {
  code: string;
  name: string;
  description?: string;
  allowedUses?: string[];
}

export interface OverlayInfo {
  type: 'flood' | 'bushfire' | 'heritage' | 'environmental' | 'other';
  code: string;
  name: string;
  affectedArea?: number;
}

// Code sandbox types
export interface SandboxResult {
  success: boolean;
  output?: unknown;
  error?: string;
  logs?: string[];
  executionTime?: number;
  affectedFeatures?: Feature[];
}

export interface SandboxContext {
  layers: Layer[];
  selectedFeatures: Feature[];
  mapBounds: BoundingBox;
  projectSettings: ProjectSettings;
}

// Export GeoJSON types for convenience
export type { Feature, FeatureCollection, Geometry, GeoJsonProperties };
