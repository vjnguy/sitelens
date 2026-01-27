/**
 * Australia-Wide Overlay Layer System
 *
 * Unified system for managing spatial data overlays across
 * National, State, and Council levels for all of Australia.
 *
 * @example
 * ```ts
 * import {
 *   ALL_LAYERS,
 *   getLayersByState,
 *   getLayersInViewport,
 *   addOverlayLayer,
 * } from '@/lib/overlays';
 *
 * // Get all QLD layers
 * const qldLayers = getLayersByState('QLD');
 *
 * // Get layers visible in current viewport
 * const viewport: BoundingBox = [152.9, -27.5, 153.1, -27.4];
 * const visibleLayers = getLayersInViewport(viewport);
 *
 * // Add a layer to the map
 * addOverlayLayer(map, visibleLayers[0]);
 * ```
 */

// Types
export * from './types';

// Layer definitions
export { NATIONAL_LAYERS } from './layers-national';
export { QLD_STATE_LAYERS } from './layers-qld';
export { NSW_STATE_LAYERS } from './layers-nsw';
export { LOGAN_COUNCIL_LAYERS } from './layers-logan';
export { BRISBANE_COUNCIL_LAYERS } from './layers-brisbane';

// Imagery layers (free, no API key required)
export {
  ESRI_IMAGERY_LAYERS,
  QLD_IMAGERY_LAYERS,
  CARTO_LAYERS,
  OSM_LAYERS,
  TOPO_LAYERS,
  GOOGLE_LAYERS,
  FREE_IMAGERY_LAYERS,
  ALL_IMAGERY_LAYERS,
  RECOMMENDED_IMAGERY,
} from './layers-imagery';

// Local flood tiles (faster alternative to ArcGIS)
export {
  LOCAL_FLOOD_LAYERS,
  checkLocalTilesAvailable,
} from './layers-local-flood';

// Data sources and councils
export {
  NATIONAL_DATA_SOURCES,
  STATE_DATA_SOURCES,
  COUNCIL_DATA_SOURCES,
  UTILITY_DATA_SOURCES,
  QLD_TOP_COUNCILS,
  NSW_TOP_COUNCILS,
  getDataSourceById,
  getDataSourcesByState,
  getCouncilsByState,
  getCouncilById,
  getAllDataSources,
  getAllCouncils,
} from './data-sources';

// Service adapters
export {
  getTileUrl,
  getTileSize,
  addOverlayLayer,
  removeOverlayLayer,
  toggleOverlayLayer,
  setOverlayLayerOpacity,
  refreshFeatureLayer,
  getLayerPreviewUrl,
  fetchLayerMetadata,
  isDataStale,
  formatDataAge,
  type LayerMetadata,
} from './adapters';

// Planning implications
export {
  QLD_PLANNING_IMPLICATIONS,
  BRISBANE_PLANNING_IMPLICATIONS,
  NSW_PLANNING_IMPLICATIONS,
  ALL_PLANNING_IMPLICATIONS,
  getPlanningImplication,
  getPlanningImplications,
  getSeverityColor,
  estimateTotalCost,
  estimateTotalDelay,
  getRequiredReferrals,
  getRequiredAssessments,
  type PlanningImplication,
  type Severity,
} from './planning-implications';

// Registry and utilities
export {
  ALL_LAYERS,
  ALL_DATA_SOURCES,
  ALL_COUNCILS,
  getLayerById,
  getLayersByState,
  getLayersByCategory,
  getLayersByLevel,
  getLayersBySource,
  searchLayers,
  groupLayersByCategory,
  groupLayersByLevel,
  bboxIntersects,
  bboxIntersectionPercent,
  getLayersInViewport,
  getLayerCoverage,
  detectViewportState,
  getCouncilsInViewport,
  getRecommendedLayers,
  getRegistryStats,
} from './registry';

