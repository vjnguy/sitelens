/**
 * Local Flood Vector Tile Layers
 *
 * These layers use pre-processed vector tiles served from the backend.
 * Run `npm run build:flood-tiles` to generate the tiles first.
 *
 * Benefits over ArcGIS FeatureServer:
 * - Much faster loading (small tile chunks vs full GeoJSON)
 * - More reliable (no external API dependency)
 * - Consistent styling (pre-processed)
 *
 * Backend API endpoint: /api/v1/tiles/flood/{z}/{x}/{y}.pbf
 */

import type { OverlayLayer } from './types';

// Backend API URL - update this if your backend is on a different host
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TILES_URL = `${BACKEND_URL}/api/v1/tiles/flood/{z}/{x}/{y}.pbf`;

// FAM color scheme
const FAM_COLORS = {
  river: {
    high: '#2166ac',
    medium: '#67a9cf',
    low: '#d1e5f0',
    veryLow: '#f7f7f7',
  },
  overland: {
    high: '#5e3c26',
    medium: '#d4b896',
    low: '#f5e6d3',
  },
  historic: {
    feb2022: '#f4a7b9',
    jan2011: '#7fcdbb',
    jan1974: '#9e9ac8',
  },
};

/**
 * Local vector tile flood layers
 * These replace the ArcGIS FeatureServer layers when tiles are available
 */
export const LOCAL_FLOOD_LAYERS: OverlayLayer[] = [
  {
    id: 'local-flood-overall',
    name: 'Flood Likelihood (Local)',
    category: 'hazards',
    description: 'Combined flood likelihood - locally served vector tiles',
    level: 'council',
    sourceId: 'local-tiles',
    coverage: {
      bounds: [152.66, -27.77, 153.32, -27.05],
      states: ['QLD'],
      councils: ['brisbane'],
    },
    service: {
      type: 'vector-tiles',
      url: TILES_URL,
      sourceLayer: 'flood_overall',
      geometryType: 'polygon',
      styleAttribute: 'FLOOD_RISK',
      styleMap: {
        'High': FAM_COLORS.river.high,
        'Medium': FAM_COLORS.river.medium,
        'Low': FAM_COLORS.river.low,
        'Very Low': FAM_COLORS.river.veryLow,
      },
    },
    style: {
      opacity: 0.7,
      minZoom: 10,
      maxZoom: 16,
      fillColor: FAM_COLORS.river.medium,
      strokeColor: '#1a5490',
      legend: [
        { label: 'High likelihood (5% annual)', color: FAM_COLORS.river.high },
        { label: 'Medium likelihood (1% annual)', color: FAM_COLORS.river.medium },
        { label: 'Low likelihood (0.2% annual)', color: FAM_COLORS.river.low },
        { label: 'Very low likelihood (0.05% annual)', color: FAM_COLORS.river.veryLow },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'awareness', 'local', 'fast'],
  },
  {
    id: 'local-flood-river',
    name: 'Flood - River (Local)',
    category: 'hazards',
    description: 'Brisbane River flood likelihood - locally served vector tiles',
    level: 'council',
    sourceId: 'local-tiles',
    coverage: {
      bounds: [152.66, -27.77, 153.32, -27.05],
      states: ['QLD'],
      councils: ['brisbane'],
    },
    service: {
      type: 'vector-tiles',
      url: TILES_URL,
      sourceLayer: 'flood_river',
      geometryType: 'polygon',
      styleAttribute: 'FLOOD_RISK',
      styleMap: {
        'High': FAM_COLORS.river.high,
        'Medium': FAM_COLORS.river.medium,
        'Low': FAM_COLORS.river.low,
        'Very Low': FAM_COLORS.river.veryLow,
      },
    },
    style: {
      opacity: 0.7,
      minZoom: 10,
      maxZoom: 16,
      fillColor: FAM_COLORS.river.medium,
      strokeColor: '#1a5490',
      legend: [
        { label: 'High likelihood', color: FAM_COLORS.river.high },
        { label: 'Medium likelihood', color: FAM_COLORS.river.medium },
        { label: 'Low likelihood', color: FAM_COLORS.river.low },
        { label: 'Very low likelihood', color: FAM_COLORS.river.veryLow },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'river', 'local', 'fast'],
  },
  {
    id: 'local-flood-creek',
    name: 'Flood - Creek (Local)',
    category: 'hazards',
    description: 'Creek and waterway flood likelihood - locally served vector tiles',
    level: 'council',
    sourceId: 'local-tiles',
    coverage: {
      bounds: [152.66, -27.77, 153.32, -27.05],
      states: ['QLD'],
      councils: ['brisbane'],
    },
    service: {
      type: 'vector-tiles',
      url: TILES_URL,
      sourceLayer: 'flood_creek',
      geometryType: 'polygon',
      styleAttribute: 'FLOOD_RISK',
      styleMap: {
        'High': FAM_COLORS.river.high,
        'Medium': FAM_COLORS.river.medium,
        'Low': FAM_COLORS.river.low,
        'Very Low': FAM_COLORS.river.veryLow,
      },
    },
    style: {
      opacity: 0.7,
      minZoom: 10,
      maxZoom: 16,
      fillColor: FAM_COLORS.river.medium,
      strokeColor: '#1a5490',
      legend: [
        { label: 'High likelihood', color: FAM_COLORS.river.high },
        { label: 'Medium likelihood', color: FAM_COLORS.river.medium },
        { label: 'Low likelihood', color: FAM_COLORS.river.low },
        { label: 'Very low likelihood', color: FAM_COLORS.river.veryLow },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'creek', 'local', 'fast'],
  },
  {
    id: 'local-flood-overland',
    name: 'Flood - Overland Flow (Local)',
    category: 'hazards',
    description: 'Overland flow flood impact - locally served vector tiles',
    level: 'council',
    sourceId: 'local-tiles',
    coverage: {
      bounds: [152.66, -27.77, 153.32, -27.05],
      states: ['QLD'],
      councils: ['brisbane'],
    },
    service: {
      type: 'vector-tiles',
      url: TILES_URL,
      sourceLayer: 'flood_overland',
      geometryType: 'polygon',
      styleAttribute: 'FLOOD_RISK',
      styleMap: {
        'High Impact': FAM_COLORS.overland.high,
        'Medium Impact': FAM_COLORS.overland.medium,
        'Low Impact': FAM_COLORS.overland.low,
        'High': FAM_COLORS.overland.high,
        'Medium': FAM_COLORS.overland.medium,
        'Low': FAM_COLORS.overland.low,
      },
    },
    style: {
      opacity: 0.7,
      minZoom: 12,
      maxZoom: 16,
      fillColor: FAM_COLORS.overland.medium,
      strokeColor: '#3d2518',
      legend: [
        { label: 'High impact', color: FAM_COLORS.overland.high },
        { label: 'Medium impact', color: FAM_COLORS.overland.medium },
        { label: 'Low impact', color: FAM_COLORS.overland.low },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'overland', 'local', 'fast'],
  },
  {
    id: 'local-flood-historic-2022',
    name: 'Historic Flood 2022 (Local)',
    category: 'hazards',
    description: 'February 2022 flood extent - locally served vector tiles',
    level: 'council',
    sourceId: 'local-tiles',
    coverage: {
      bounds: [152.66, -27.77, 153.32, -27.05],
      states: ['QLD'],
      councils: ['brisbane'],
    },
    service: {
      type: 'vector-tiles',
      url: TILES_URL,
      sourceLayer: 'flood_historic_2022',
      geometryType: 'polygon',
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 16,
      fillColor: FAM_COLORS.historic.feb2022,
      strokeColor: '#e05780',
      legend: [
        { label: 'February 2022 extent', color: FAM_COLORS.historic.feb2022 },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'historic', '2022', 'local', 'fast'],
  },
  {
    id: 'local-flood-historic-2011',
    name: 'Historic Flood 2011 (Local)',
    category: 'hazards',
    description: 'January 2011 flood extent - locally served vector tiles',
    level: 'council',
    sourceId: 'local-tiles',
    coverage: {
      bounds: [152.66, -27.77, 153.32, -27.05],
      states: ['QLD'],
      councils: ['brisbane'],
    },
    service: {
      type: 'vector-tiles',
      url: TILES_URL,
      sourceLayer: 'flood_historic_2011',
      geometryType: 'polygon',
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 16,
      fillColor: FAM_COLORS.historic.jan2011,
      strokeColor: '#41ae76',
      legend: [
        { label: 'January 2011 extent', color: FAM_COLORS.historic.jan2011 },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'historic', '2011', 'local', 'fast'],
  },
  {
    id: 'local-flood-historic-1974',
    name: 'Historic Flood 1974 (Local)',
    category: 'hazards',
    description: 'January 1974 flood extent - locally served vector tiles',
    level: 'council',
    sourceId: 'local-tiles',
    coverage: {
      bounds: [152.66, -27.77, 153.32, -27.05],
      states: ['QLD'],
      councils: ['brisbane'],
    },
    service: {
      type: 'vector-tiles',
      url: TILES_URL,
      sourceLayer: 'flood_historic_1974',
      geometryType: 'polygon',
    },
    style: {
      opacity: 0.6,
      minZoom: 10,
      maxZoom: 16,
      fillColor: FAM_COLORS.historic.jan1974,
      strokeColor: '#756bb1',
      legend: [
        { label: 'January 1974 extent', color: FAM_COLORS.historic.jan1974 },
      ],
    },
    quality: 'authoritative',
    tags: ['flood', 'historic', '1974', 'local', 'fast'],
  },
];

/**
 * Check if local flood tiles are available
 * Returns true if the backend tile endpoint is responding
 */
export async function checkLocalTilesAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/tiles/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    return data.tilesets?.some((t: { name: string; available: boolean }) =>
      t.name === 'flood' && t.available
    ) ?? false;
  } catch {
    return false;
  }
}
