/**
 * Grid Utilities for Hydrology Processing
 *
 * Helper functions for working with raster grids
 */

import type {
  Coordinate,
  GridMetadata,
  DEMGrid,
  FlowDirectionGrid,
  FlowAccumulationGrid,
  BoundingBox,
} from '../interfaces';

/**
 * D8 flow direction codes and their corresponding offsets
 *
 * Direction encoding:
 *   64  128  1
 *   32   X   2
 *   16   8   4
 */
export const D8_DIRECTIONS = {
  1: { dx: 1, dy: -1 },   // NE
  2: { dx: 1, dy: 0 },    // E
  4: { dx: 1, dy: 1 },    // SE
  8: { dx: 0, dy: 1 },    // S
  16: { dx: -1, dy: 1 },  // SW
  32: { dx: -1, dy: 0 },  // W
  64: { dx: -1, dy: -1 }, // NW
  128: { dx: 0, dy: -1 }, // N
} as const;

/**
 * Inverse D8 directions - which directions flow INTO a cell
 */
export const D8_INVERSE: Record<number, number> = {
  1: 16,    // NE -> SW
  2: 32,    // E -> W
  4: 64,    // SE -> NW
  8: 128,   // S -> N
  16: 1,    // SW -> NE
  32: 2,    // W -> E
  64: 4,    // NW -> SE
  128: 8,   // N -> S
};

/**
 * All D8 direction codes
 */
export const D8_CODES = [1, 2, 4, 8, 16, 32, 64, 128] as const;

/**
 * Get cell offsets for all 8 neighbors
 */
export const NEIGHBOR_OFFSETS = [
  { dx: 0, dy: -1, dir: 128 },  // N
  { dx: 1, dy: -1, dir: 1 },    // NE
  { dx: 1, dy: 0, dir: 2 },     // E
  { dx: 1, dy: 1, dir: 4 },     // SE
  { dx: 0, dy: 1, dir: 8 },     // S
  { dx: -1, dy: 1, dir: 16 },   // SW
  { dx: -1, dy: 0, dir: 32 },   // W
  { dx: -1, dy: -1, dir: 64 },  // NW
];

/**
 * Convert world coordinates to grid row/col
 */
export function worldToGrid(
  coord: Coordinate,
  metadata: GridMetadata
): { row: number; col: number } | null {
  const { bounds, resolution, rows, cols } = metadata;

  // Check bounds
  if (
    coord.x < bounds.minX ||
    coord.x > bounds.maxX ||
    coord.y < bounds.minY ||
    coord.y > bounds.maxY
  ) {
    return null;
  }

  // Calculate col and row (note: y increases downward in grid)
  const col = Math.floor((coord.x - bounds.minX) / resolution[0]);
  const row = Math.floor((bounds.maxY - coord.y) / resolution[1]);

  // Clamp to valid range
  return {
    row: Math.max(0, Math.min(rows - 1, row)),
    col: Math.max(0, Math.min(cols - 1, col)),
  };
}

/**
 * Convert grid row/col to world coordinates (cell center)
 */
export function gridToWorld(
  row: number,
  col: number,
  metadata: GridMetadata
): Coordinate {
  const { bounds, resolution } = metadata;

  return {
    x: bounds.minX + (col + 0.5) * resolution[0],
    y: bounds.maxY - (row + 0.5) * resolution[1],
  };
}

/**
 * Get index into 1D array from row/col
 */
export function getIndex(row: number, col: number, cols: number): number {
  return row * cols + col;
}

/**
 * Get row/col from 1D array index
 */
export function getRowCol(index: number, cols: number): { row: number; col: number } {
  return {
    row: Math.floor(index / cols),
    col: index % cols,
  };
}

/**
 * Check if row/col is within grid bounds
 */
export function isInBounds(
  row: number,
  col: number,
  rows: number,
  cols: number
): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

/**
 * Get value at row/col from grid data
 */
export function getGridValue<T extends Float32Array | Uint8Array | Uint16Array>(
  data: T,
  row: number,
  col: number,
  cols: number,
  nodata: number
): number {
  const index = getIndex(row, col, cols);
  const value = data[index];
  return value === nodata ? NaN : value;
}

/**
 * Set value at row/col in grid data
 */
export function setGridValue<T extends Float32Array | Uint8Array | Uint16Array>(
  data: T,
  row: number,
  col: number,
  cols: number,
  value: number
): void {
  const index = getIndex(row, col, cols);
  (data as unknown as number[])[index] = value;
}

/**
 * Get the downstream cell given flow direction
 */
export function getDownstreamCell(
  row: number,
  col: number,
  flowDir: number
): { row: number; col: number } | null {
  const offset = D8_DIRECTIONS[flowDir as keyof typeof D8_DIRECTIONS];
  if (!offset) return null;

  return {
    row: row + offset.dy,
    col: col + offset.dx,
  };
}

/**
 * Get all upstream cells that flow into this cell
 */
export function getUpstreamCells(
  row: number,
  col: number,
  flowDirection: FlowDirectionGrid
): Array<{ row: number; col: number }> {
  const { data, metadata } = flowDirection;
  const { rows, cols } = metadata;
  const upstream: Array<{ row: number; col: number }> = [];

  for (const offset of NEIGHBOR_OFFSETS) {
    const nRow = row + offset.dy;
    const nCol = col + offset.dx;

    if (isInBounds(nRow, nCol, rows, cols)) {
      const nDir = data[getIndex(nRow, nCol, cols)];
      const expectedDir = D8_INVERSE[offset.dir];

      if (nDir === expectedDir) {
        upstream.push({ row: nRow, col: nCol });
      }
    }
  }

  return upstream;
}

/**
 * Calculate distance between two cells in world units
 */
export function cellDistance(
  row1: number,
  col1: number,
  row2: number,
  col2: number,
  resolution: [number, number]
): number {
  const dx = (col2 - col1) * resolution[0];
  const dy = (row2 - row1) * resolution[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate cell area in hectares
 */
export function cellAreaHectares(resolution: [number, number]): number {
  // resolution is in meters, 1 hectare = 10000 m²
  return (resolution[0] * resolution[1]) / 10000;
}

/**
 * Calculate cell area in km²
 */
export function cellAreaKm2(resolution: [number, number]): number {
  // resolution is in meters, 1 km² = 1,000,000 m²
  return (resolution[0] * resolution[1]) / 1_000_000;
}

/**
 * Get elevation with optional bilinear interpolation
 */
export function getElevation(
  dem: DEMGrid,
  coord: Coordinate,
  interpolate: boolean = false
): number | null {
  const { data, metadata } = dem;
  const { bounds, resolution, rows, cols, nodata } = metadata;

  // Calculate exact grid position
  const gx = (coord.x - bounds.minX) / resolution[0];
  const gy = (bounds.maxY - coord.y) / resolution[1];

  if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) {
    return null;
  }

  if (!interpolate) {
    // Nearest neighbor
    const row = Math.floor(gy);
    const col = Math.floor(gx);
    const value = data[getIndex(row, col, cols)];
    return value === nodata ? null : value;
  }

  // Bilinear interpolation
  const col0 = Math.floor(gx);
  const row0 = Math.floor(gy);
  const col1 = Math.min(col0 + 1, cols - 1);
  const row1 = Math.min(row0 + 1, rows - 1);

  const fx = gx - col0;
  const fy = gy - row0;

  const v00 = data[getIndex(row0, col0, cols)];
  const v10 = data[getIndex(row0, col1, cols)];
  const v01 = data[getIndex(row1, col0, cols)];
  const v11 = data[getIndex(row1, col1, cols)];

  // Check for nodata
  if (v00 === nodata || v10 === nodata || v01 === nodata || v11 === nodata) {
    // Fall back to nearest valid neighbor
    const value = data[getIndex(Math.round(gy), Math.round(gx), cols)];
    return value === nodata ? null : value;
  }

  // Bilinear interpolation
  const v0 = v00 * (1 - fx) + v10 * fx;
  const v1 = v01 * (1 - fx) + v11 * fx;
  return v0 * (1 - fy) + v1 * fy;
}

/**
 * Create an empty grid mask (Uint8Array)
 */
export function createMask(rows: number, cols: number): Uint8Array {
  return new Uint8Array(rows * cols);
}

/**
 * Create an empty grid (Float32Array)
 */
export function createGrid(rows: number, cols: number, fill: number = 0): Float32Array {
  const grid = new Float32Array(rows * cols);
  if (fill !== 0) {
    grid.fill(fill);
  }
  return grid;
}

/**
 * Calculate bounding box from a set of coordinates
 */
export function calculateBoundingBox(coordinates: Coordinate[]): BoundingBox | null {
  if (coordinates.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const coord of coordinates) {
    minX = Math.min(minX, coord.x);
    minY = Math.min(minY, coord.y);
    maxX = Math.max(maxX, coord.x);
    maxY = Math.max(maxY, coord.y);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Check if a coordinate is within a bounding box
 */
export function isInBoundingBox(coord: Coordinate, bbox: BoundingBox): boolean {
  return (
    coord.x >= bbox.minX &&
    coord.x <= bbox.maxX &&
    coord.y >= bbox.minY &&
    coord.y <= bbox.maxY
  );
}

/**
 * Expand a bounding box by a buffer distance
 */
export function expandBoundingBox(bbox: BoundingBox, buffer: number): BoundingBox {
  return {
    minX: bbox.minX - buffer,
    minY: bbox.minY - buffer,
    maxX: bbox.maxX + buffer,
    maxY: bbox.maxY + buffer,
  };
}
