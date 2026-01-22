/**
 * GIS Standard Library for the SiteLens Code Sandbox
 * Provides safe, commonly-used GIS functions for user scripts
 */

import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

// Re-export commonly used turf functions
export const gis = {
  // Measurement
  area: turf.area,
  length: turf.length,
  distance: turf.distance,
  along: turf.along,
  bearing: turf.bearing,
  destination: turf.destination,
  midpoint: turf.midpoint,
  center: turf.center,
  centerOfMass: turf.centerOfMass,
  centroid: turf.centroid,

  // Transformation
  buffer: turf.buffer,
  simplify: turf.simplify,
  bezierSpline: turf.bezierSpline,
  dissolve: turf.dissolve,
  union: turf.union,
  intersect: turf.intersect,
  difference: turf.difference,
  clip: turf.bboxClip,
  convex: turf.convex,
  concave: turf.concave,

  // Booleans
  booleanContains: turf.booleanContains,
  booleanCrosses: turf.booleanCrosses,
  booleanDisjoint: turf.booleanDisjoint,
  booleanEqual: turf.booleanEqual,
  booleanIntersects: turf.booleanIntersects,
  booleanOverlap: turf.booleanOverlap,
  booleanParallel: turf.booleanParallel,
  booleanPointInPolygon: turf.booleanPointInPolygon,
  booleanPointOnLine: turf.booleanPointOnLine,
  booleanWithin: turf.booleanWithin,

  // Feature helpers
  point: turf.point,
  multiPoint: turf.multiPoint,
  lineString: turf.lineString,
  multiLineString: turf.multiLineString,
  polygon: turf.polygon,
  multiPolygon: turf.multiPolygon,
  featureCollection: turf.featureCollection,
  feature: turf.feature,

  // Grids
  hexGrid: turf.hexGrid,
  pointGrid: turf.pointGrid,
  squareGrid: turf.squareGrid,
  triangleGrid: turf.triangleGrid,

  // Classification
  nearestPoint: turf.nearestPoint,
  pointsWithinPolygon: turf.pointsWithinPolygon,
  tag: turf.tag,
  collect: turf.collect,

  // Aggregation
  bbox: turf.bbox,
  bboxPolygon: turf.bboxPolygon,
  envelope: turf.envelope,

  // Interpolation
  interpolate: turf.interpolate,
  isobands: turf.isobands,
  isolines: turf.isolines,
  planepoint: turf.planepoint,
  tin: turf.tin,

  // Joins
  spatialJoin: (points: FeatureCollection, polygons: FeatureCollection) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return turf.tag(points as any, polygons as any, 'polygon_id', 'polygon_id');
  },

  // Unit conversion helpers
  convertLength: turf.convertLength,
  convertArea: turf.convertArea,

  // Random
  randomPoint: turf.randomPoint,
  randomLineString: turf.randomLineString,
  randomPolygon: turf.randomPolygon,
};

// Helper functions specific to SiteLens
export const sitelens = {
  /**
   * Filter features by property value
   */
  filterByProperty: (
    fc: FeatureCollection,
    property: string,
    value: unknown
  ): FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: fc.features.filter(
        (f) => f.properties && f.properties[property] === value
      ),
    };
  },

  /**
   * Filter features by property matching a condition
   */
  filterByCondition: (
    fc: FeatureCollection,
    predicate: (properties: Record<string, unknown>) => boolean
  ): FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: fc.features.filter(
        (f) => f.properties && predicate(f.properties)
      ),
    };
  },

  /**
   * Get unique values of a property
   */
  uniqueValues: (fc: FeatureCollection, property: string): unknown[] => {
    const values = new Set<unknown>();
    fc.features.forEach((f) => {
      if (f.properties && f.properties[property] !== undefined) {
        values.add(f.properties[property]);
      }
    });
    return Array.from(values);
  },

  /**
   * Calculate statistics for a numeric property
   */
  statistics: (
    fc: FeatureCollection,
    property: string
  ): { min: number; max: number; mean: number; sum: number; count: number } => {
    const values = fc.features
      .map((f) => f.properties?.[property])
      .filter((v): v is number => typeof v === 'number');

    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, sum: 0, count: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: sum / values.length,
      sum,
      count: values.length,
    };
  },

  /**
   * Add a new property to all features
   */
  addProperty: (
    fc: FeatureCollection,
    property: string,
    value: unknown | ((f: Feature) => unknown)
  ): FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: fc.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          [property]: typeof value === 'function' ? value(f) : value,
        },
      })),
    };
  },

  /**
   * Calculate area and add as property (for polygons)
   */
  addAreaProperty: (
    fc: FeatureCollection,
    propertyName: string = 'area_sqm'
  ): FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: fc.features.map((f) => {
        const area =
          f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
            ? turf.area(f)
            : 0;
        return {
          ...f,
          properties: {
            ...f.properties,
            [propertyName]: area,
          },
        };
      }),
    };
  },

  /**
   * Calculate length and add as property (for lines)
   */
  addLengthProperty: (
    fc: FeatureCollection,
    propertyName: string = 'length_m'
  ): FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: fc.features.map((f) => {
        const length =
          f.geometry.type === 'LineString' ||
          f.geometry.type === 'MultiLineString'
            ? turf.length(f, { units: 'meters' })
            : 0;
        return {
          ...f,
          properties: {
            ...f.properties,
            [propertyName]: length,
          },
        };
      }),
    };
  },

  /**
   * Find features within a distance of a point
   */
  findNearby: (
    fc: FeatureCollection,
    point: [number, number],
    distance: number,
    units: turf.Units = 'meters'
  ): FeatureCollection => {
    const pt = turf.point(point);
    const buffered = turf.buffer(pt, distance, { units });
    if (!buffered) {
      return { type: 'FeatureCollection', features: [] };
    }
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

  /**
   * Merge/dissolve features by a property
   */
  dissolveByProperty: (
    fc: FeatureCollection,
    property: string
  ): FeatureCollection => {
    const groups = new Map<unknown, Feature[]>();

    fc.features.forEach((f) => {
      const key = f.properties?.[property];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(f);
    });

    const features: Feature[] = [];
    groups.forEach((groupFeatures, key) => {
      if (groupFeatures.length === 1) {
        features.push(groupFeatures[0]);
      } else {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dissolved = turf.dissolve(turf.featureCollection(groupFeatures) as any);
          if (dissolved) {
            dissolved.features.forEach((f) => {
              f.properties = { [property]: key };
              features.push(f);
            });
          }
        } catch {
          features.push(...groupFeatures);
        }
      }
    });

    return { type: 'FeatureCollection', features };
  },

  /**
   * Create a heatmap grid from points
   */
  createHeatmapGrid: (
    points: FeatureCollection,
    cellSize: number = 0.5,
    units: turf.Units = 'kilometers'
  ): FeatureCollection => {
    const bbox = turf.bbox(points);
    const grid = turf.hexGrid(bbox, cellSize, { units });

    return {
      type: 'FeatureCollection',
      features: grid.features.map((cell) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pointsInCell = turf.pointsWithinPolygon(points as any, cell as any);
        return {
          ...cell,
          properties: {
            ...cell.properties,
            count: pointsInCell.features.length,
          },
        };
      }),
    };
  },
};

// Console wrapper for sandbox
export const console = {
  log: (...args: unknown[]) => {
    self.postMessage({ type: 'log', level: 'log', args });
  },
  warn: (...args: unknown[]) => {
    self.postMessage({ type: 'log', level: 'warn', args });
  },
  error: (...args: unknown[]) => {
    self.postMessage({ type: 'log', level: 'error', args });
  },
  info: (...args: unknown[]) => {
    self.postMessage({ type: 'log', level: 'info', args });
  },
};

// Format helpers
export const format = {
  /**
   * Format area for display
   */
  area: (sqMeters: number): string => {
    if (sqMeters < 10000) {
      return `${sqMeters.toFixed(1)} m²`;
    }
    const hectares = sqMeters / 10000;
    if (hectares < 100) {
      return `${hectares.toFixed(2)} ha`;
    }
    const sqKm = sqMeters / 1000000;
    return `${sqKm.toFixed(2)} km²`;
  },

  /**
   * Format length for display
   */
  length: (meters: number): string => {
    if (meters < 1000) {
      return `${meters.toFixed(1)} m`;
    }
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  },

  /**
   * Format coordinates for display
   */
  coordinates: (coords: [number, number]): string => {
    const [lng, lat] = coords;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  },
};
