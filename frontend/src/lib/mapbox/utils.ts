import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Geometry, Position, BBox } from 'geojson';
import type { BoundingBox, LayerStyle } from '@/types/gis';

// Convert BoundingBox to Mapbox LngLatBoundsLike
export function boundsToMapbox(bounds: BoundingBox): [[number, number], [number, number]] {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.north],
  ];
}

// Convert Mapbox bounds to BoundingBox
export function mapboxToBounds(bounds: [[number, number], [number, number]]): BoundingBox {
  return {
    west: bounds[0][0],
    south: bounds[0][1],
    east: bounds[1][0],
    north: bounds[1][1],
  };
}

// Calculate bounding box of a FeatureCollection
export function calculateBounds(features: FeatureCollection): BoundingBox | null {
  if (!features.features.length) return null;

  const bbox = turf.bbox(features);
  return {
    west: bbox[0],
    south: bbox[1],
    east: bbox[2],
    north: bbox[3],
  };
}

// Get center point of a feature or FeatureCollection
export function getCenter(geojson: Feature | FeatureCollection): [number, number] {
  const center = turf.center(geojson);
  return center.geometry.coordinates as [number, number];
}

// Calculate area of a polygon feature (in square meters)
export function calculateArea(feature: Feature): number {
  if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
    return 0;
  }
  return turf.area(feature);
}

// Calculate length of a line feature (in meters)
export function calculateLength(feature: Feature): number {
  if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
    return 0;
  }
  return turf.length(feature, { units: 'meters' });
}

// Buffer a feature by a given distance (in meters)
export function bufferFeature(feature: Feature, distance: number): Feature | null {
  try {
    return turf.buffer(feature, distance, { units: 'meters' }) as Feature;
  } catch {
    return null;
  }
}

// Check if a point is within a polygon
export function pointInPolygon(point: [number, number], polygon: Feature): boolean {
  const pt = turf.point(point);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return turf.booleanPointInPolygon(pt, polygon as any);
}

// Find features that intersect with a given feature
export function findIntersecting(
  target: Feature,
  features: FeatureCollection
): Feature[] {
  return features.features.filter((feature) => {
    try {
      return turf.booleanIntersects(target, feature);
    } catch {
      return false;
    }
  });
}

// Simplify a geometry (reduce complexity)
export function simplifyFeature(feature: Feature, tolerance: number = 0.001): Feature {
  return turf.simplify(feature, { tolerance, highQuality: true });
}

// Convert coordinates to different projections
export function formatCoordinates(
  coords: [number, number],
  format: 'decimal' | 'dms' = 'decimal'
): string {
  const [lng, lat] = coords;

  if (format === 'decimal') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  // DMS format
  const latDMS = decimalToDMS(lat, 'lat');
  const lngDMS = decimalToDMS(lng, 'lng');
  return `${latDMS}, ${lngDMS}`;
}

function decimalToDMS(decimal: number, type: 'lat' | 'lng'): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

  let direction: string;
  if (type === 'lat') {
    direction = decimal >= 0 ? 'N' : 'S';
  } else {
    direction = decimal >= 0 ? 'E' : 'W';
  }

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

// Format area for display
export function formatArea(sqMeters: number): string {
  if (sqMeters < 10000) {
    return `${sqMeters.toFixed(1)} m²`;
  }
  const hectares = sqMeters / 10000;
  if (hectares < 100) {
    return `${hectares.toFixed(2)} ha`;
  }
  const sqKm = sqMeters / 1000000;
  return `${sqKm.toFixed(2)} km²`;
}

// Format length for display
export function formatLength(meters: number): string {
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

// Generate a unique layer ID
export function generateLayerId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a unique feature ID
export function generateFeatureId(): string {
  return `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Validate GeoJSON
export function isValidGeoJSON(data: unknown): data is FeatureCollection | Feature {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;

  if (obj.type === 'FeatureCollection') {
    return Array.isArray(obj.features);
  }

  if (obj.type === 'Feature') {
    return obj.geometry !== undefined;
  }

  return false;
}

// Convert various data formats to FeatureCollection
export function toFeatureCollection(data: unknown): FeatureCollection {
  if (!data) {
    return { type: 'FeatureCollection', features: [] };
  }

  if (isValidGeoJSON(data)) {
    if (data.type === 'FeatureCollection') {
      return data;
    }
    return {
      type: 'FeatureCollection',
      features: [data],
    };
  }

  return { type: 'FeatureCollection', features: [] };
}

// Merge multiple FeatureCollections
export function mergeFeatureCollections(
  ...collections: FeatureCollection[]
): FeatureCollection {
  const features = collections.flatMap((c) => c.features);
  return {
    type: 'FeatureCollection',
    features,
  };
}

// Get geometry type from a feature
export function getGeometryType(feature: Feature): string {
  return feature.geometry?.type || 'Unknown';
}

// Create a style object for a layer based on geometry type
export function createDefaultStyle(geometryType: string): LayerStyle {
  switch (geometryType) {
    case 'Point':
    case 'MultiPoint':
      return {
        type: 'circle',
        paint: {
          'circle-radius': 6,
          'circle-color': '#3bb2d0',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      };
    case 'LineString':
    case 'MultiLineString':
      return {
        type: 'line',
        paint: {
          'line-color': '#3bb2d0',
          'line-width': 2,
        },
      };
    case 'Polygon':
    case 'MultiPolygon':
      return {
        type: 'fill',
        paint: {
          'fill-color': '#3bb2d0',
          'fill-opacity': 0.4,
          'fill-outline-color': '#3bb2d0',
        },
      };
    default:
      return {
        type: 'circle',
        paint: {
          'circle-radius': 6,
          'circle-color': '#3bb2d0',
        },
      };
  }
}

// Cluster configuration for point layers
export function getClusterConfig(layerId: string) {
  return {
    source: {
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    },
    layers: [
      {
        id: `${layerId}-clusters`,
        type: 'circle',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            100,
            '#f1f075',
            750,
            '#f28cb1',
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            100,
            30,
            750,
            40,
          ],
        },
      },
      {
        id: `${layerId}-cluster-count`,
        type: 'symbol',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
      },
      {
        id: `${layerId}-unclustered-point`,
        type: 'circle',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#11b4da',
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      },
    ],
  };
}
