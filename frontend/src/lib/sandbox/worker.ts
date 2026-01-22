/**
 * SiteLens Code Sandbox WebWorker
 * Executes user code in an isolated environment
 */

import * as turf from '@turf/turf';
import type { Feature, FeatureCollection } from 'geojson';

// Message types
interface ExecuteMessage {
  type: 'execute';
  code: string;
  context: {
    layers: Array<{ id: string; name: string; data: FeatureCollection }>;
    selectedFeatures: Feature[];
    mapBounds: { west: number; south: number; east: number; north: number };
  };
}

interface CancelMessage {
  type: 'cancel';
}

type WorkerMessage = ExecuteMessage | CancelMessage;

interface ResultMessage {
  type: 'result';
  success: boolean;
  output?: unknown;
  error?: string;
  logs: Array<{ level: string; args: unknown[] }>;
  executionTime: number;
}

interface LogMessage {
  type: 'log';
  level: string;
  args: unknown[];
}

// Logs collected during execution
let executionLogs: Array<{ level: string; args: unknown[] }> = [];

// Custom console for sandbox
const sandboxConsole = {
  log: (...args: unknown[]) => {
    executionLogs.push({ level: 'log', args });
  },
  warn: (...args: unknown[]) => {
    executionLogs.push({ level: 'warn', args });
  },
  error: (...args: unknown[]) => {
    executionLogs.push({ level: 'error', args });
  },
  info: (...args: unknown[]) => {
    executionLogs.push({ level: 'info', args });
  },
};

// GIS standard library (safe subset of turf)
const gis = {
  // Measurement
  area: turf.area,
  length: turf.length,
  distance: turf.distance,
  bearing: turf.bearing,
  center: turf.center,
  centroid: turf.centroid,
  centerOfMass: turf.centerOfMass,

  // Transformation
  buffer: turf.buffer,
  simplify: turf.simplify,
  union: turf.union,
  intersect: turf.intersect,
  difference: turf.difference,
  convex: turf.convex,

  // Booleans
  booleanContains: turf.booleanContains,
  booleanIntersects: turf.booleanIntersects,
  booleanPointInPolygon: turf.booleanPointInPolygon,
  booleanWithin: turf.booleanWithin,

  // Feature helpers
  point: turf.point,
  lineString: turf.lineString,
  polygon: turf.polygon,
  featureCollection: turf.featureCollection,
  feature: turf.feature,

  // Grids
  hexGrid: turf.hexGrid,
  pointGrid: turf.pointGrid,
  squareGrid: turf.squareGrid,

  // Classification
  nearestPoint: turf.nearestPoint,
  pointsWithinPolygon: turf.pointsWithinPolygon,

  // Aggregation
  bbox: turf.bbox,
  bboxPolygon: turf.bboxPolygon,

  // Random (for testing)
  randomPoint: turf.randomPoint,
  randomPolygon: turf.randomPolygon,
};

// SiteLens helper functions
const sitelens = {
  filterByProperty: (
    fc: FeatureCollection,
    property: string,
    value: unknown
  ): FeatureCollection => ({
    type: 'FeatureCollection',
    features: fc.features.filter(
      (f) => f.properties && f.properties[property] === value
    ),
  }),

  filterByCondition: (
    fc: FeatureCollection,
    predicate: (props: Record<string, unknown>) => boolean
  ): FeatureCollection => ({
    type: 'FeatureCollection',
    features: fc.features.filter((f) => f.properties && predicate(f.properties)),
  }),

  uniqueValues: (fc: FeatureCollection, property: string): unknown[] => {
    const values = new Set<unknown>();
    fc.features.forEach((f) => {
      if (f.properties?.[property] !== undefined) {
        values.add(f.properties[property]);
      }
    });
    return Array.from(values);
  },

  statistics: (
    fc: FeatureCollection,
    property: string
  ): { min: number; max: number; mean: number; sum: number; count: number } => {
    const values = fc.features
      .map((f) => f.properties?.[property])
      .filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return { min: 0, max: 0, mean: 0, sum: 0, count: 0 };
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: sum / values.length,
      sum,
      count: values.length,
    };
  },

  addProperty: (
    fc: FeatureCollection,
    property: string,
    value: unknown | ((f: Feature) => unknown)
  ): FeatureCollection => ({
    type: 'FeatureCollection',
    features: fc.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        [property]: typeof value === 'function' ? value(f) : value,
      },
    })),
  }),

  addAreaProperty: (fc: FeatureCollection, propertyName = 'area_sqm'): FeatureCollection => ({
    type: 'FeatureCollection',
    features: fc.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        [propertyName]:
          f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
            ? turf.area(f)
            : 0,
      },
    })),
  }),

  findNearby: (
    fc: FeatureCollection,
    point: [number, number],
    distance: number,
    units = 'meters'
  ): FeatureCollection => {
    const pt = turf.point(point);
    const buffered = turf.buffer(pt, distance, { units: units as turf.Units });
    if (!buffered) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: fc.features.filter((f) => {
        try {
          return turf.booleanIntersects(f, buffered);
        } catch {
          return false;
        }
      }),
    };
  },
};

// Format helpers
const format = {
  area: (sqMeters: number): string => {
    if (sqMeters < 10000) return `${sqMeters.toFixed(1)} m²`;
    const hectares = sqMeters / 10000;
    if (hectares < 100) return `${hectares.toFixed(2)} ha`;
    return `${(sqMeters / 1000000).toFixed(2)} km²`;
  },
  length: (meters: number): string => {
    if (meters < 1000) return `${meters.toFixed(1)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  },
  coordinates: (coords: [number, number]): string => {
    const [lng, lat] = coords;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  },
};

// Execute user code
function executeCode(code: string, context: ExecuteMessage['context']): unknown {
  // Create a safe execution context
  const { layers, selectedFeatures, mapBounds } = context;

  // Build layer data map
  const layerData: Record<string, FeatureCollection> = {};
  layers.forEach((l) => {
    layerData[l.id] = l.data;
    layerData[l.name] = l.data;
  });

  // Create the execution function with safe globals
  const executionCode = `
    "use strict";
    return (function(console, gis, sitelens, format, layers, selectedFeatures, mapBounds, getLayer) {
      ${code}
    })(console, gis, sitelens, format, layers, selectedFeatures, mapBounds, getLayer);
  `;

  // Get layer helper
  const getLayer = (idOrName: string): FeatureCollection | null => {
    return layerData[idOrName] || null;
  };

  // Create and execute the function
  const fn = new Function(executionCode);
  return fn.call(
    null,
    sandboxConsole,
    gis,
    sitelens,
    format,
    layerData,
    selectedFeatures,
    mapBounds,
    getLayer
  );
}

// Handle messages
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === 'execute') {
    executionLogs = [];
    const startTime = performance.now();

    try {
      const result = executeCode(message.code, message.context);
      const executionTime = performance.now() - startTime;

      const response: ResultMessage = {
        type: 'result',
        success: true,
        output: result,
        logs: executionLogs,
        executionTime,
      };

      self.postMessage(response);
    } catch (error) {
      const executionTime = performance.now() - startTime;

      const response: ResultMessage = {
        type: 'result',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs: executionLogs,
        executionTime,
      };

      self.postMessage(response);
    }
  }
};

// Export types for TypeScript
export type { ExecuteMessage, ResultMessage, LogMessage };
