/**
 * Overlay Layer Registry
 *
 * Unified registry combining all national, state, and council layers
 * Provides filtering, searching, and coverage detection utilities
 */

import { OverlayLayer, DataSource, Council, BoundingBox, AustralianState, LayerCategory, DataLevel } from './types';
import { NATIONAL_LAYERS } from './layers-national';
import { QLD_STATE_LAYERS } from './layers-qld';
import { NSW_STATE_LAYERS } from './layers-nsw';
import { LOGAN_COUNCIL_LAYERS } from './layers-logan';
import { BRISBANE_COUNCIL_LAYERS } from './layers-brisbane';
import { FREE_IMAGERY_LAYERS } from './layers-imagery';
import { NATIONAL_DATA_SOURCES, STATE_DATA_SOURCES, QLD_TOP_COUNCILS, NSW_TOP_COUNCILS, getAllDataSources } from './data-sources';

// ============================================================================
// UNIFIED LAYER REGISTRY
// ============================================================================

/**
 * All registered overlay layers across all levels
 */
export const ALL_LAYERS: OverlayLayer[] = [
  ...NATIONAL_LAYERS,
  ...QLD_STATE_LAYERS,
  ...NSW_STATE_LAYERS,
  // Council layers
  ...BRISBANE_COUNCIL_LAYERS,
  ...LOGAN_COUNCIL_LAYERS,
  // Imagery/basemaps (free, no API key)
  ...FREE_IMAGERY_LAYERS,
];

/**
 * All registered data sources
 */
export const ALL_DATA_SOURCES: DataSource[] = getAllDataSources();

/**
 * All registered councils
 */
export const ALL_COUNCILS: Council[] = [
  ...QLD_TOP_COUNCILS,
  ...NSW_TOP_COUNCILS,
];

// ============================================================================
// FILTERING UTILITIES
// ============================================================================

/**
 * Get layers by state
 */
export function getLayersByState(state: AustralianState): OverlayLayer[] {
  return ALL_LAYERS.filter((layer) => {
    const coverage = layer.coverage.states;
    return coverage === 'all' || coverage.includes(state);
  });
}

/**
 * Get layers by category
 */
export function getLayersByCategory(category: LayerCategory): OverlayLayer[] {
  return ALL_LAYERS.filter((layer) => layer.category === category);
}

/**
 * Get layers by data level (national, state, council)
 */
export function getLayersByLevel(level: DataLevel): OverlayLayer[] {
  return ALL_LAYERS.filter((layer) => layer.level === level);
}

/**
 * Get layers by source
 */
export function getLayersBySource(sourceId: string): OverlayLayer[] {
  return ALL_LAYERS.filter((layer) => layer.sourceId === sourceId);
}

/**
 * Search layers by name or tags
 */
export function searchLayers(query: string): OverlayLayer[] {
  const lowerQuery = query.toLowerCase();
  return ALL_LAYERS.filter((layer) => {
    const matchesName = layer.name.toLowerCase().includes(lowerQuery);
    const matchesDescription = layer.description.toLowerCase().includes(lowerQuery);
    const matchesTags = layer.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery));
    return matchesName || matchesDescription || matchesTags;
  });
}

/**
 * Get layer by ID
 */
export function getLayerById(layerId: string): OverlayLayer | undefined {
  return ALL_LAYERS.find((layer) => layer.id === layerId);
}

/**
 * Group layers by category
 */
export function groupLayersByCategory(): Record<LayerCategory, OverlayLayer[]> {
  const groups: Record<LayerCategory, OverlayLayer[]> = {
    hazards: [],
    planning: [],
    environment: [],
    heritage: [],
    infrastructure: [],
    boundaries: [],
    imagery: [],
  };

  ALL_LAYERS.forEach((layer) => {
    groups[layer.category].push(layer);
  });

  return groups;
}

/**
 * Group layers by level
 */
export function groupLayersByLevel(): Record<DataLevel, OverlayLayer[]> {
  const groups: Record<DataLevel, OverlayLayer[]> = {
    national: [],
    state: [],
    council: [],
  };

  ALL_LAYERS.forEach((layer) => {
    groups[layer.level].push(layer);
  });

  return groups;
}

// ============================================================================
// COVERAGE DETECTION
// ============================================================================

/**
 * Check if two bounding boxes intersect
 */
export function bboxIntersects(bbox1: BoundingBox, bbox2: BoundingBox): boolean {
  const [minLng1, minLat1, maxLng1, maxLat1] = bbox1;
  const [minLng2, minLat2, maxLng2, maxLat2] = bbox2;

  return !(
    maxLng1 < minLng2 ||
    minLng1 > maxLng2 ||
    maxLat1 < minLat2 ||
    minLat1 > maxLat2
  );
}

/**
 * Calculate intersection area percentage
 */
export function bboxIntersectionPercent(viewport: BoundingBox, coverage: BoundingBox): number {
  const [vMinLng, vMinLat, vMaxLng, vMaxLat] = viewport;
  const [cMinLng, cMinLat, cMaxLng, cMaxLat] = coverage;

  // Calculate intersection bounds
  const iMinLng = Math.max(vMinLng, cMinLng);
  const iMinLat = Math.max(vMinLat, cMinLat);
  const iMaxLng = Math.min(vMaxLng, cMaxLng);
  const iMaxLat = Math.min(vMaxLat, cMaxLat);

  // No intersection
  if (iMinLng >= iMaxLng || iMinLat >= iMaxLat) {
    return 0;
  }

  // Calculate areas (simplified, not accounting for projection)
  const intersectionArea = (iMaxLng - iMinLng) * (iMaxLat - iMinLat);
  const viewportArea = (vMaxLng - vMinLng) * (vMaxLat - vMinLat);

  return (intersectionArea / viewportArea) * 100;
}

/**
 * Get layers that cover the current viewport
 */
export function getLayersInViewport(viewport: BoundingBox): OverlayLayer[] {
  return ALL_LAYERS.filter((layer) => {
    return bboxIntersects(viewport, layer.coverage.bounds);
  });
}

/**
 * Get layers with coverage information for the current viewport
 */
export function getLayerCoverage(viewport: BoundingBox): Array<{
  layer: OverlayLayer;
  inCoverage: boolean;
  coveragePercent: number;
}> {
  return ALL_LAYERS.map((layer) => ({
    layer,
    inCoverage: bboxIntersects(viewport, layer.coverage.bounds),
    coveragePercent: bboxIntersectionPercent(viewport, layer.coverage.bounds),
  }));
}

/**
 * Detect which state the viewport is primarily in
 */
export function detectViewportState(viewport: BoundingBox): AustralianState | null {
  // Approximate state bounding boxes (simplified)
  const stateBounds: Record<AustralianState, BoundingBox> = {
    QLD: [138.0, -29.2, 154.0, -10.0],
    NSW: [140.9, -37.6, 154.0, -28.0],
    VIC: [140.9, -39.2, 150.1, -33.9],
    SA: [129.0, -38.1, 141.0, -26.0],
    WA: [112.9, -35.2, 129.0, -13.7],
    NT: [129.0, -26.0, 138.0, -10.9],
    TAS: [143.8, -43.7, 148.5, -39.5],
    ACT: [148.7, -35.9, 149.4, -35.1],
  };

  let bestMatch: AustralianState | null = null;
  let bestPercent = 0;

  for (const [state, bounds] of Object.entries(stateBounds)) {
    const percent = bboxIntersectionPercent(viewport, bounds);
    if (percent > bestPercent) {
      bestPercent = percent;
      bestMatch = state as AustralianState;
    }
  }

  return bestMatch;
}

/**
 * Get councils that cover the current viewport
 */
export function getCouncilsInViewport(viewport: BoundingBox): Council[] {
  return ALL_COUNCILS.filter((council) => {
    return bboxIntersects(viewport, council.bounds);
  });
}

// ============================================================================
// LAYER RECOMMENDATIONS
// ============================================================================

/**
 * Get recommended layers for a viewport based on coverage and zoom level
 */
export function getRecommendedLayers(
  viewport: BoundingBox,
  zoom: number
): OverlayLayer[] {
  const state = detectViewportState(viewport);
  const inViewport = getLayersInViewport(viewport);

  // Filter by appropriate zoom level
  return inViewport.filter((layer) => {
    const minZoom = layer.style.minZoom || 0;
    const maxZoom = layer.style.maxZoom || 22;
    return zoom >= minZoom && zoom <= maxZoom;
  }).sort((a, b) => {
    // Prioritize by coverage percentage
    const aPercent = bboxIntersectionPercent(viewport, a.coverage.bounds);
    const bPercent = bboxIntersectionPercent(viewport, b.coverage.bounds);
    return bPercent - aPercent;
  });
}

// ============================================================================
// REGISTRY INFO
// ============================================================================

/**
 * Get registry statistics
 */
export function getRegistryStats(): {
  totalLayers: number;
  byLevel: Record<DataLevel, number>;
  byCategory: Record<LayerCategory, number>;
  totalSources: number;
  totalCouncils: number;
} {
  const byLevel: Record<DataLevel, number> = { national: 0, state: 0, council: 0 };
  const byCategory: Record<LayerCategory, number> = {
    hazards: 0,
    planning: 0,
    environment: 0,
    heritage: 0,
    infrastructure: 0,
    boundaries: 0,
    imagery: 0,
  };

  ALL_LAYERS.forEach((layer) => {
    byLevel[layer.level]++;
    byCategory[layer.category]++;
  });

  return {
    totalLayers: ALL_LAYERS.length,
    byLevel,
    byCategory,
    totalSources: ALL_DATA_SOURCES.length,
    totalCouncils: ALL_COUNCILS.length,
  };
}
