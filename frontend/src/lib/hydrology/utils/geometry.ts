/**
 * Geometry Utilities for Hydrology Processing
 *
 * Helper functions for working with GeoJSON and spatial operations
 */

import type {
  Coordinate,
  BoundingBox,
  GridMetadata,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
} from '../interfaces';
import { worldToGrid, gridToWorld, getIndex, isInBounds } from './grid';

/**
 * Check if a point is inside a polygon using ray casting
 */
export function pointInPolygon(point: Coordinate, polygon: number[][]): boolean {
  const x = point.x;
  const y = point.y;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a point is inside a GeoJSON polygon (handles holes)
 */
export function pointInGeoJSONPolygon(
  point: Coordinate,
  polygon: GeoJSON.Polygon
): boolean {
  const coords = polygon.coordinates;

  // Check if in outer ring
  if (!pointInPolygon(point, coords[0])) {
    return false;
  }

  // Check if in any hole
  for (let i = 1; i < coords.length; i++) {
    if (pointInPolygon(point, coords[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate polygon area using shoelace formula
 * Returns area in square units of the coordinate system
 */
export function polygonArea(ring: number[][]): number {
  let area = 0;
  const n = ring.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += ring[i][0] * ring[j][1];
    area -= ring[j][0] * ring[i][1];
  }

  return Math.abs(area) / 2;
}

/**
 * Calculate GeoJSON polygon area (handles holes)
 * Returns area in hectares (assumes CRS units are meters)
 */
export function geoJSONPolygonAreaHectares(polygon: GeoJSON.Polygon): number {
  const coords = polygon.coordinates;

  // Outer ring area
  let area = polygonArea(coords[0]);

  // Subtract holes
  for (let i = 1; i < coords.length; i++) {
    area -= polygonArea(coords[i]);
  }

  // Convert m² to hectares
  return area / 10000;
}

/**
 * Calculate centroid of a polygon
 */
export function polygonCentroid(ring: number[][]): Coordinate {
  let cx = 0;
  let cy = 0;
  let area = 0;
  const n = ring.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const f = ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
    cx += (ring[i][0] + ring[j][0]) * f;
    cy += (ring[i][1] + ring[j][1]) * f;
    area += f;
  }

  area /= 2;
  cx /= 6 * area;
  cy /= 6 * area;

  return { x: cx, y: cy };
}

/**
 * Calculate bounding box of a GeoJSON polygon
 */
export function polygonBoundingBox(polygon: GeoJSON.Polygon): BoundingBox {
  const ring = polygon.coordinates[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const coord of ring) {
    minX = Math.min(minX, coord[0]);
    minY = Math.min(minY, coord[1]);
    maxX = Math.max(maxX, coord[0]);
    maxY = Math.max(maxY, coord[1]);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Convert a binary mask to a GeoJSON polygon
 * Uses marching squares algorithm for contour tracing
 */
export function maskToPolygon(
  mask: Uint8Array,
  metadata: GridMetadata,
  value: number = 1
): GeoJSON.Polygon | null {
  const { rows, cols } = metadata;

  // Find starting edge cell
  let startRow = -1;
  let startCol = -1;

  outer: for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = getIndex(row, col, cols);
      if (mask[idx] === value) {
        // Check if it's an edge cell (has at least one neighbor that's 0 or out of bounds)
        const isEdge =
          row === 0 ||
          col === 0 ||
          row === rows - 1 ||
          col === cols - 1 ||
          mask[getIndex(row - 1, col, cols)] !== value ||
          mask[getIndex(row + 1, col, cols)] !== value ||
          mask[getIndex(row, col - 1, cols)] !== value ||
          mask[getIndex(row, col + 1, cols)] !== value;

        if (isEdge) {
          startRow = row;
          startCol = col;
          break outer;
        }
      }
    }
  }

  if (startRow === -1) return null;

  // Trace boundary using contour following
  const boundary: Coordinate[] = [];
  const visited = new Set<string>();

  // Moore neighborhood tracing
  const directions = [
    { dr: -1, dc: 0 },  // N
    { dr: -1, dc: 1 },  // NE
    { dr: 0, dc: 1 },   // E
    { dr: 1, dc: 1 },   // SE
    { dr: 1, dc: 0 },   // S
    { dr: 1, dc: -1 },  // SW
    { dr: 0, dc: -1 },  // W
    { dr: -1, dc: -1 }, // NW
  ];

  let row = startRow;
  let col = startCol;
  let dir = 0; // Start looking north

  const maxIterations = rows * cols * 2;
  let iterations = 0;

  do {
    const key = `${row},${col}`;

    if (!visited.has(key)) {
      visited.add(key);
      boundary.push(gridToWorld(row, col, metadata));
    }

    // Find next boundary cell
    let found = false;
    const startDir = (dir + 5) % 8; // Start search from backtrack direction + 1

    for (let i = 0; i < 8; i++) {
      const checkDir = (startDir + i) % 8;
      const { dr, dc } = directions[checkDir];
      const newRow = row + dr;
      const newCol = col + dc;

      if (isInBounds(newRow, newCol, rows, cols)) {
        const idx = getIndex(newRow, newCol, cols);
        if (mask[idx] === value) {
          row = newRow;
          col = newCol;
          dir = checkDir;
          found = true;
          break;
        }
      }
    }

    if (!found) break;
    iterations++;
  } while ((row !== startRow || col !== startCol) && iterations < maxIterations);

  if (boundary.length < 3) return null;

  // Close the ring
  boundary.push(boundary[0]);

  // Convert to GeoJSON coordinate format
  const coordinates: number[][] = boundary.map((c) => [c.x, c.y]);

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

/**
 * Simplify a polygon using Douglas-Peucker algorithm
 */
export function simplifyPolygon(
  polygon: GeoJSON.Polygon,
  tolerance: number
): GeoJSON.Polygon {
  const simplifiedCoords: number[][][] = [];

  for (const ring of polygon.coordinates) {
    simplifiedCoords.push(douglasPeucker(ring, tolerance));
  }

  return {
    type: 'Polygon',
    coordinates: simplifiedCoords,
  };
}

/**
 * Douglas-Peucker line simplification
 */
function douglasPeucker(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) return points;

  // Find the point with maximum distance from the line between first and last
  let maxDist = 0;
  let maxIndex = 0;

  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > tolerance) {
    // Recursively simplify
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);

    return left.slice(0, -1).concat(right);
  } else {
    return [first, last];
  }
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: number[],
  lineStart: number[],
  lineEnd: number[]
): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];

  const numerator = Math.abs(
    dy * point[0] - dx * point[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]
  );
  const denominator = Math.sqrt(dx * dx + dy * dy);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Get all grid cells that fall within a polygon
 */
export function getCellsInPolygon(
  polygon: GeoJSON.Polygon,
  metadata: GridMetadata
): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = [];
  const bbox = polygonBoundingBox(polygon);
  const { rows, cols } = metadata;

  // Get grid bounds for polygon bbox
  const minCell = worldToGrid({ x: bbox.minX, y: bbox.maxY }, metadata);
  const maxCell = worldToGrid({ x: bbox.maxX, y: bbox.minY }, metadata);

  if (!minCell || !maxCell) return cells;

  const startRow = Math.max(0, minCell.row);
  const endRow = Math.min(rows - 1, maxCell.row);
  const startCol = Math.max(0, minCell.col);
  const endCol = Math.min(cols - 1, maxCell.col);

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const center = gridToWorld(row, col, metadata);
      if (pointInGeoJSONPolygon(center, polygon)) {
        cells.push({ row, col });
      }
    }
  }

  return cells;
}

/**
 * Create a GeoJSON LineString from coordinates
 */
export function coordinatesToLineString(
  coordinates: Coordinate[]
): GeoJSON.LineString {
  return {
    type: 'LineString',
    coordinates: coordinates.map((c) => [c.x, c.y]),
  };
}

/**
 * Calculate length of a LineString in meters
 */
export function lineStringLength(line: GeoJSON.LineString): number {
  let length = 0;
  const coords = line.coordinates;

  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    length += Math.sqrt(dx * dx + dy * dy);
  }

  return length;
}

/**
 * Get point at a specific distance along a LineString
 */
export function pointAlongLine(
  line: GeoJSON.LineString,
  distance: number
): Coordinate | null {
  const coords = line.coordinates;
  let accumulated = 0;

  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    if (accumulated + segmentLength >= distance) {
      const remaining = distance - accumulated;
      const ratio = remaining / segmentLength;
      return {
        x: coords[i - 1][0] + dx * ratio,
        y: coords[i - 1][1] + dy * ratio,
      };
    }

    accumulated += segmentLength;
  }

  // Return last point if distance exceeds line length
  const last = coords[coords.length - 1];
  return { x: last[0], y: last[1] };
}

/**
 * Create a GeoJSON Feature
 */
export function createFeature<G extends GeoJSON.Geometry, P>(
  geometry: G,
  properties: P,
  id?: string | number
): GeoJSONFeature<G, P> {
  return {
    type: 'Feature',
    geometry,
    properties,
    ...(id !== undefined && { id }),
  };
}

/**
 * Create a GeoJSON FeatureCollection
 */
export function createFeatureCollection<G extends GeoJSON.Geometry, P>(
  features: GeoJSONFeature<G, P>[]
): GeoJSONFeatureCollection<G, P> {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Calculate Euclidean distance between two coordinates
 */
export function distance(a: Coordinate, b: Coordinate): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Merge multiple polygons into a single polygon (union)
 * Simplified version - just returns convex hull for now
 */
export function mergePolygons(polygons: GeoJSON.Polygon[]): GeoJSON.Polygon | null {
  if (polygons.length === 0) return null;
  if (polygons.length === 1) return polygons[0];

  // Collect all points
  const allPoints: number[][] = [];
  for (const polygon of polygons) {
    for (const ring of polygon.coordinates) {
      allPoints.push(...ring);
    }
  }

  // Calculate convex hull
  const hull = convexHull(allPoints);

  return {
    type: 'Polygon',
    coordinates: [hull],
  };
}

/**
 * Calculate convex hull using Graham scan
 */
function convexHull(points: number[][]): number[][] {
  if (points.length < 3) return points;

  // Find bottom-most point (or left-most if tie)
  let minIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (
      points[i][1] < points[minIdx][1] ||
      (points[i][1] === points[minIdx][1] && points[i][0] < points[minIdx][0])
    ) {
      minIdx = i;
    }
  }

  const pivot = points[minIdx];

  // Sort points by polar angle
  const sorted = points
    .filter((_, i) => i !== minIdx)
    .sort((a, b) => {
      const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
      const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
      return angleA - angleB;
    });

  const hull = [pivot];

  for (const point of sorted) {
    while (hull.length > 1 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
      hull.pop();
    }
    hull.push(point);
  }

  // Close the hull
  hull.push(hull[0]);

  return hull;
}

/**
 * Cross product of vectors OA and OB
 */
function crossProduct(o: number[], a: number[], b: number[]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
