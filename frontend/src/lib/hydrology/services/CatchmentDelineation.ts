/**
 * Catchment Delineation Service
 *
 * Uses D8 flow direction to delineate catchments from pour points.
 * Designed for WebAssembly integration with WhiteboxTools.
 */

import {
  ICatchmentDelineation,
  CatchmentDelineationInput,
  CatchmentDelineationOutput,
  FlowDirectionGrid,
  FlowAccumulationGrid,
  Coordinate,
  ValidationResult,
  SubcatchmentProperties,
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  HydrologyError,
  HydrologyErrorCode,
  DEMGrid,
} from '../interfaces';
import {
  worldToGrid,
  gridToWorld,
  isInBounds as gridIsInBounds,
  getIndex,
} from '../utils/grid';

// Adapter functions for existing code
function coordinateToGrid(coord: Coordinate, metadata: FlowDirectionGrid['metadata']) {
  const result = worldToGrid(coord, metadata);
  return result || { row: 0, col: 0 };
}

function gridToCoordinate(row: number, col: number, metadata: FlowDirectionGrid['metadata']): Coordinate {
  return gridToWorld(row, col, metadata);
}

function isInBounds(row: number, col: number, metadata: FlowDirectionGrid['metadata']): boolean {
  return gridIsInBounds(row, col, metadata.rows, metadata.cols);
}

/**
 * D8 Flow Direction Codes (WhiteboxTools convention)
 *
 *   64  128  1
 *   32   X   2
 *   16   8   4
 *
 * Each value represents direction water flows TO from the cell
 */
const D8_DIRECTIONS = {
  1: { dx: 1, dy: -1 },   // NE
  2: { dx: 1, dy: 0 },    // E
  4: { dx: 1, dy: 1 },    // SE
  8: { dx: 0, dy: 1 },    // S
  16: { dx: -1, dy: 1 },  // SW
  32: { dx: -1, dy: 0 },  // W
  64: { dx: -1, dy: -1 }, // NW
  128: { dx: 0, dy: -1 }, // N
} as const;

// Reverse lookup: which direction codes flow INTO a cell
const D8_INFLOW = {
  1: 16,    // If neighbor is NE, it flows in with direction 16 (SW)
  2: 32,    // E -> W
  4: 64,    // SE -> NW
  8: 128,   // S -> N
  16: 1,    // SW -> NE
  32: 2,    // W -> E
  64: 4,    // NW -> SE
  128: 8,   // N -> S
} as const;

// Neighbor offsets for 8-connectivity
const NEIGHBORS = [
  { dx: 1, dy: -1, dir: 1 },
  { dx: 1, dy: 0, dir: 2 },
  { dx: 1, dy: 1, dir: 4 },
  { dx: 0, dy: 1, dir: 8 },
  { dx: -1, dy: 1, dir: 16 },
  { dx: -1, dy: 0, dir: 32 },
  { dx: -1, dy: -1, dir: 64 },
  { dx: 0, dy: -1, dir: 128 },
];

export class CatchmentDelineationService implements ICatchmentDelineation {
  /**
   * Delineate catchment from pour point
   */
  async delineate(input: CatchmentDelineationInput): Promise<CatchmentDelineationOutput> {
    const {
      flowDirection,
      flowAccumulation,
      pourPoint,
      dem,
      minSubcatchmentArea = 1.0, // hectares
      confluenceThreshold = 100, // cells
    } = input;

    // Step 1: Validate and potentially snap pour point
    let finalPourPoint = pourPoint.coordinates;

    if (pourPoint.snapToStream) {
      const snapped = this.snapToStream(
        flowAccumulation,
        pourPoint.coordinates,
        pourPoint.snapThreshold ?? 50,
        pourPoint.snapRadius ?? 10
      );
      if (snapped) {
        finalPourPoint = snapped;
      }
    }

    // Validate the pour point
    const validation = this.validatePourPoint(flowDirection, finalPourPoint);
    if (!validation.valid) {
      throw new HydrologyError(
        validation.errors[0].code,
        validation.errors[0].message,
        validation.errors[0].details
      );
    }

    // Step 2: Convert pour point to grid coordinates
    const gridPoint = coordinateToGrid(finalPourPoint, flowDirection.metadata);

    // Step 3: Trace upstream to find all contributing cells
    const catchmentMask = this.traceUpstream(flowDirection, gridPoint);

    // Step 4: Identify confluences for subcatchment subdivision
    const confluences = this.findConfluences(
      flowDirection,
      flowAccumulation,
      catchmentMask,
      confluenceThreshold
    );

    // Step 5: Create subcatchments at confluences
    const subcatchmentMasks = this.subdivideAtConfluences(
      flowDirection,
      catchmentMask,
      confluences,
      gridPoint,
      minSubcatchmentArea,
      flowDirection.metadata
    );

    // Step 6: Convert masks to polygons
    const boundary = this.maskToPolygon(catchmentMask, flowDirection.metadata, 'catchment');
    const subcatchments = this.createSubcatchmentPolygons(
      subcatchmentMasks,
      flowDirection.metadata,
      flowDirection,
      dem
    );

    // Calculate areas
    const areas = subcatchments.features.map(f => f.properties.areaHectares);

    return {
      boundary,
      subcatchments,
      areas,
      snappedPourPoint: finalPourPoint,
    };
  }

  /**
   * Snap pour point to nearest high-accumulation cell
   */
  snapToStream(
    flowAccumulation: FlowAccumulationGrid,
    point: Coordinate,
    threshold: number,
    radius: number
  ): Coordinate | null {
    const { metadata } = flowAccumulation;
    const gridPoint = coordinateToGrid(point, metadata);

    let bestCell: { row: number; col: number } | null = null;
    let bestAccum = threshold;

    // Search within radius
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const row = gridPoint.row + dr;
        const col = gridPoint.col + dc;

        if (!isInBounds(row, col, metadata)) continue;

        const idx = row * metadata.cols + col;
        const accum = flowAccumulation.data[idx];

        // Check if this is better (higher accumulation, closer if equal)
        if (accum >= bestAccum) {
          const dist = Math.sqrt(dr * dr + dc * dc);
          const bestDist = bestCell
            ? Math.sqrt(
                Math.pow(bestCell.row - gridPoint.row, 2) +
                Math.pow(bestCell.col - gridPoint.col, 2)
              )
            : Infinity;

          if (accum > bestAccum || dist < bestDist) {
            bestAccum = accum;
            bestCell = { row, col };
          }
        }
      }
    }

    if (bestCell) {
      return gridToCoordinate(bestCell.row, bestCell.col, metadata);
    }

    return null;
  }

  /**
   * Validate pour point location
   */
  validatePourPoint(
    flowDirection: FlowDirectionGrid,
    point: Coordinate
  ): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];
    const { metadata } = flowDirection;

    // Check bounds
    if (
      point.x < metadata.bounds.minX ||
      point.x > metadata.bounds.maxX ||
      point.y < metadata.bounds.minY ||
      point.y > metadata.bounds.maxY
    ) {
      errors.push({
        code: HydrologyErrorCode.POUR_POINT_OUT_OF_BOUNDS,
        message: 'Pour point is outside DEM bounds',
        details: { point, bounds: metadata.bounds },
      });
      return { valid: false, errors, warnings };
    }

    // Convert to grid coordinates
    const gridPoint = coordinateToGrid(point, metadata);
    const idx = gridPoint.row * metadata.cols + gridPoint.col;

    // Check for nodata
    const flowDir = flowDirection.data[idx];
    if (flowDir === 0 || flowDir === metadata.nodata) {
      // Check if it's a flat area or nodata
      errors.push({
        code: HydrologyErrorCode.POUR_POINT_ON_NODATA,
        message: 'Pour point is on a nodata or invalid cell',
        details: { point, gridPoint, flowDirection: flowDir },
      });
      return { valid: false, errors, warnings };
    }

    // Check for flat area (flow direction exists but might be ambiguous)
    // In D8, flat areas are typically pre-resolved, but we can warn
    const hasUpstream = this.hasUpstreamCells(flowDirection, gridPoint);
    if (!hasUpstream) {
      warnings.push({
        code: 'NO_UPSTREAM_CELLS',
        message: 'Pour point has no upstream contributing area',
        details: { point, gridPoint },
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Check if a cell has any upstream cells flowing into it
   */
  private hasUpstreamCells(
    flowDirection: FlowDirectionGrid,
    point: { row: number; col: number }
  ): boolean {
    const { metadata } = flowDirection;

    for (const neighbor of NEIGHBORS) {
      const nRow = point.row + neighbor.dy;
      const nCol = point.col + neighbor.dx;

      if (!isInBounds(nRow, nCol, metadata)) continue;

      const idx = nRow * metadata.cols + nCol;
      const nDir = flowDirection.data[idx];

      // Check if neighbor flows into this cell
      const expectedDir = D8_INFLOW[neighbor.dir as keyof typeof D8_INFLOW];
      if (nDir === expectedDir) {
        return true;
      }
    }

    return false;
  }

  /**
   * Trace upstream from outlet to find all contributing cells
   * Returns a boolean mask of the catchment
   */
  private traceUpstream(
    flowDirection: FlowDirectionGrid,
    outlet: { row: number; col: number }
  ): Uint8Array {
    const { metadata } = flowDirection;
    const mask = new Uint8Array(metadata.rows * metadata.cols);

    // Use iterative flood fill (BFS) to avoid stack overflow
    const queue: Array<{ row: number; col: number }> = [outlet];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const idx = current.row * metadata.cols + current.col;

      if (visited.has(idx)) continue;
      visited.add(idx);
      mask[idx] = 1;

      // Find all neighbors that flow INTO this cell
      for (const neighbor of NEIGHBORS) {
        const nRow = current.row + neighbor.dy;
        const nCol = current.col + neighbor.dx;

        if (!isInBounds(nRow, nCol, metadata)) continue;

        const nIdx = nRow * metadata.cols + nCol;
        if (visited.has(nIdx)) continue;

        const nDir = flowDirection.data[nIdx];
        if (nDir === 0 || nDir === metadata.nodata) continue;

        // Check if this neighbor flows into current cell
        const expectedDir = D8_INFLOW[neighbor.dir as keyof typeof D8_INFLOW];
        if (nDir === expectedDir) {
          queue.push({ row: nRow, col: nCol });
        }
      }
    }

    return mask;
  }

  /**
   * Find confluence points (where streams meet) within the catchment
   */
  private findConfluences(
    flowDirection: FlowDirectionGrid,
    flowAccumulation: FlowAccumulationGrid,
    catchmentMask: Uint8Array,
    threshold: number
  ): Array<{ row: number; col: number; accumulation: number }> {
    const { metadata } = flowDirection;
    const confluences: Array<{ row: number; col: number; accumulation: number }> = [];

    for (let row = 0; row < metadata.rows; row++) {
      for (let col = 0; col < metadata.cols; col++) {
        const idx = row * metadata.cols + col;

        // Skip if not in catchment
        if (!catchmentMask[idx]) continue;

        const accum = flowAccumulation.data[idx];
        if (accum < threshold) continue;

        // Count significant inflows (streams merging)
        let inflowCount = 0;
        for (const neighbor of NEIGHBORS) {
          const nRow = row + neighbor.dy;
          const nCol = col + neighbor.dx;

          if (!isInBounds(nRow, nCol, metadata)) continue;

          const nIdx = nRow * metadata.cols + nCol;
          if (!catchmentMask[nIdx]) continue;

          const nDir = flowDirection.data[nIdx];
          const expectedDir = D8_INFLOW[neighbor.dir as keyof typeof D8_INFLOW];

          if (nDir === expectedDir) {
            const nAccum = flowAccumulation.data[nIdx];
            // Significant inflow if it has at least 20% of the threshold
            if (nAccum >= threshold * 0.2) {
              inflowCount++;
            }
          }
        }

        // A confluence has 2+ significant inflows
        if (inflowCount >= 2) {
          confluences.push({ row, col, accumulation: accum });
        }
      }
    }

    // Sort by accumulation (largest first)
    confluences.sort((a, b) => b.accumulation - a.accumulation);

    return confluences;
  }

  /**
   * Subdivide catchment at confluences to create subcatchments
   */
  private subdivideAtConfluences(
    flowDirection: FlowDirectionGrid,
    catchmentMask: Uint8Array,
    confluences: Array<{ row: number; col: number }>,
    outlet: { row: number; col: number },
    minAreaHa: number,
    metadata: FlowDirectionGrid['metadata']
  ): Map<string, Uint8Array> {
    const cellAreaHa = Math.abs(metadata.resolution[0] * metadata.resolution[1]) / 10000;
    const minCells = Math.floor(minAreaHa / cellAreaHa);

    const subcatchments = new Map<string, Uint8Array>();
    const assigned = new Uint8Array(metadata.rows * metadata.cols);

    // Start with outlet as first subcatchment break point
    const breakPoints = [outlet, ...confluences];

    let subcatchmentId = 0;

    for (const breakPoint of breakPoints) {
      const idx = breakPoint.row * metadata.cols + breakPoint.col;

      // Skip if already assigned or not in catchment
      if (assigned[idx] || !catchmentMask[idx]) continue;

      // Trace upstream from this break point, but stop at other break points
      const subMask = this.traceUpstreamLimited(
        flowDirection,
        catchmentMask,
        assigned,
        breakPoint,
        breakPoints
      );

      // Check minimum area
      let cellCount = 0;
      for (let i = 0; i < subMask.length; i++) {
        if (subMask[i]) {
          cellCount++;
          assigned[i] = 1;
        }
      }

      if (cellCount >= minCells) {
        subcatchments.set(`sub_${subcatchmentId}`, subMask);
        subcatchmentId++;
      } else {
        // Merge small subcatchment with downstream
        // For now, we keep it separate but mark it
        if (cellCount > 0) {
          subcatchments.set(`sub_${subcatchmentId}_small`, subMask);
          subcatchmentId++;
        }
      }
    }

    // Assign any remaining unassigned cells to nearest subcatchment
    // (This handles edge cases where cells weren't reached)

    return subcatchments;
  }

  /**
   * Trace upstream but stop at break points
   */
  private traceUpstreamLimited(
    flowDirection: FlowDirectionGrid,
    catchmentMask: Uint8Array,
    assigned: Uint8Array,
    start: { row: number; col: number },
    breakPoints: Array<{ row: number; col: number }>
  ): Uint8Array {
    const { metadata } = flowDirection;
    const mask = new Uint8Array(metadata.rows * metadata.cols);

    const breakPointSet = new Set(
      breakPoints.map(bp => bp.row * metadata.cols + bp.col)
    );

    const queue: Array<{ row: number; col: number }> = [start];
    const visited = new Set<number>();

    // Include the start point
    const startIdx = start.row * metadata.cols + start.col;
    mask[startIdx] = 1;
    visited.add(startIdx);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentIdx = current.row * metadata.cols + current.col;

      for (const neighbor of NEIGHBORS) {
        const nRow = current.row + neighbor.dy;
        const nCol = current.col + neighbor.dx;

        if (!isInBounds(nRow, nCol, metadata)) continue;

        const nIdx = nRow * metadata.cols + nCol;

        // Skip if already visited, assigned, not in catchment, or is another break point
        if (visited.has(nIdx)) continue;
        if (assigned[nIdx]) continue;
        if (!catchmentMask[nIdx]) continue;
        if (breakPointSet.has(nIdx) && nIdx !== startIdx) continue;

        const nDir = flowDirection.data[nIdx];
        if (nDir === 0 || nDir === metadata.nodata) continue;

        // Check if neighbor flows into current cell
        const expectedDir = D8_INFLOW[neighbor.dir as keyof typeof D8_INFLOW];
        if (nDir === expectedDir) {
          visited.add(nIdx);
          mask[nIdx] = 1;
          queue.push({ row: nRow, col: nCol });
        }
      }
    }

    return mask;
  }

  /**
   * Convert a binary mask to a GeoJSON polygon
   */
  private maskToPolygon(
    mask: Uint8Array,
    metadata: FlowDirectionGrid['metadata'],
    id: string
  ): GeoJSONFeatureCollection<GeoJSON.Polygon, { areaHectares: number }> {
    // Use marching squares or similar to trace the boundary
    const boundary = this.traceBoundary(mask, metadata);
    const areaHa = this.calculateMaskArea(mask, metadata);

    // Convert Coordinate[] to Position[] for GeoJSON
    const positions = boundary.map(coord => [coord.x, coord.y] as [number, number]);

    const feature: GeoJSONFeature<GeoJSON.Polygon, { areaHectares: number }> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [positions],
      },
      properties: {
        areaHectares: areaHa,
      },
      id,
    };

    return {
      type: 'FeatureCollection',
      features: [feature],
    };
  }

  /**
   * Trace the boundary of a binary mask using a simple contour tracing algorithm
   */
  private traceBoundary(
    mask: Uint8Array,
    metadata: FlowDirectionGrid['metadata']
  ): Coordinate[] {
    const { rows, cols } = metadata;
    const boundary: Coordinate[] = [];

    // Find starting point (first cell on boundary)
    let startRow = -1, startCol = -1;
    outer: for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (mask[row * cols + col]) {
          // Check if it's on the boundary (has at least one non-mask neighbor)
          if (this.isOnBoundary(mask, row, col, rows, cols)) {
            startRow = row;
            startCol = col;
            break outer;
          }
        }
      }
    }

    if (startRow === -1) {
      // Empty mask, return empty polygon
      return [];
    }

    // Simple boundary tracing (Moore neighborhood tracing)
    const visited = new Set<string>();
    let currentRow = startRow;
    let currentCol = startCol;
    let direction = 0; // Start direction

    const dirOffsets = [
      { dr: 0, dc: 1 },   // E
      { dr: 1, dc: 1 },   // SE
      { dr: 1, dc: 0 },   // S
      { dr: 1, dc: -1 },  // SW
      { dr: 0, dc: -1 },  // W
      { dr: -1, dc: -1 }, // NW
      { dr: -1, dc: 0 },  // N
      { dr: -1, dc: 1 },  // NE
    ];

    do {
      const key = `${currentRow},${currentCol}`;
      if (!visited.has(key)) {
        visited.add(key);
        // Add cell center to boundary
        const coord = gridToCoordinate(currentRow, currentCol, metadata);
        boundary.push(coord);
      }

      // Find next boundary cell
      let found = false;
      for (let i = 0; i < 8; i++) {
        const checkDir = (direction + 5 + i) % 8; // Start checking from back-left
        const { dr, dc } = dirOffsets[checkDir];
        const newRow = currentRow + dr;
        const newCol = currentCol + dc;

        if (
          newRow >= 0 && newRow < rows &&
          newCol >= 0 && newCol < cols &&
          mask[newRow * cols + newCol]
        ) {
          currentRow = newRow;
          currentCol = newCol;
          direction = checkDir;
          found = true;
          break;
        }
      }

      if (!found) break;

    } while (currentRow !== startRow || currentCol !== startCol || boundary.length < 4);

    // Close the polygon
    if (boundary.length > 0) {
      boundary.push(boundary[0]);
    }

    return boundary;
  }

  /**
   * Check if a cell is on the boundary of the mask
   */
  private isOnBoundary(
    mask: Uint8Array,
    row: number,
    col: number,
    rows: number,
    cols: number
  ): boolean {
    // Edge of grid is always boundary
    if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
      return true;
    }

    // Check 4-neighbors
    const neighbors = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const { dr, dc } of neighbors) {
      const nIdx = (row + dr) * cols + (col + dc);
      if (!mask[nIdx]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate area of mask in hectares
   */
  private calculateMaskArea(
    mask: Uint8Array,
    metadata: FlowDirectionGrid['metadata']
  ): number {
    let cellCount = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) cellCount++;
    }

    const cellAreaM2 = Math.abs(metadata.resolution[0] * metadata.resolution[1]);
    const areaM2 = cellCount * cellAreaM2;
    return areaM2 / 10000; // Convert to hectares
  }

  /**
   * Create subcatchment polygon features with properties
   */
  private createSubcatchmentPolygons(
    subcatchmentMasks: Map<string, Uint8Array>,
    metadata: FlowDirectionGrid['metadata'],
    flowDirection: FlowDirectionGrid,
    dem?: DEMGrid
  ): GeoJSONFeatureCollection<GeoJSON.Polygon, SubcatchmentProperties> {
    const features: GeoJSONFeature<GeoJSON.Polygon, SubcatchmentProperties>[] = [];

    for (const [id, mask] of subcatchmentMasks) {
      const boundary = this.traceBoundary(mask, metadata);
      if (boundary.length < 4) continue;

      // Convert Coordinate[] to Position[] for GeoJSON
      const positions = boundary.map(coord => [coord.x, coord.y] as [number, number]);

      const areaHa = this.calculateMaskArea(mask, metadata);
      const outlet = this.findOutlet(mask, flowDirection);
      const outletCoord = outlet
        ? gridToCoordinate(outlet.row, outlet.col, metadata)
        : { x: 0, y: 0 };

      const properties: SubcatchmentProperties = {
        id,
        areaHectares: areaHa,
        areaKm2: areaHa / 100,
        outletCoordinates: outletCoord,
        isHeadwater: !this.hasUpstreamSubcatchment(id, subcatchmentMasks),
        downstreamId: null, // Would need connectivity analysis
        upstreamIds: [],    // Would need connectivity analysis
      };

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [positions],
        },
        properties,
        id,
      });
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Find the outlet cell of a subcatchment mask
   */
  private findOutlet(
    mask: Uint8Array,
    flowDirection: FlowDirectionGrid
  ): { row: number; col: number } | null {
    const { metadata } = flowDirection;

    for (let row = 0; row < metadata.rows; row++) {
      for (let col = 0; col < metadata.cols; col++) {
        const idx = row * metadata.cols + col;
        if (!mask[idx]) continue;

        // Check if flow direction leads outside the mask
        const dir = flowDirection.data[idx];
        const offset = D8_DIRECTIONS[dir as keyof typeof D8_DIRECTIONS];
        if (!offset) continue;

        const nextRow = row + offset.dy;
        const nextCol = col + offset.dx;

        if (!isInBounds(nextRow, nextCol, metadata)) {
          // Flows off grid - this is an outlet
          return { row, col };
        }

        const nextIdx = nextRow * metadata.cols + nextCol;
        if (!mask[nextIdx]) {
          // Flows out of mask - this is the outlet
          return { row, col };
        }
      }
    }

    return null;
  }

  /**
   * Check if a subcatchment has upstream subcatchments
   */
  private hasUpstreamSubcatchment(
    id: string,
    subcatchmentMasks: Map<string, Uint8Array>
  ): boolean {
    // Simplified check - in a full implementation,
    // we would trace flow paths to determine connectivity
    return id.includes('_small') ? false : subcatchmentMasks.size > 1;
  }
}

// Export class with correct name
export const CatchmentDelineation = CatchmentDelineationService;

/**
 * Factory function to create a CatchmentDelineation service
 */
export function createCatchmentDelineation(): ICatchmentDelineation {
  return new CatchmentDelineationService();
}

// Export singleton instance for convenience
export const catchmentDelineation = new CatchmentDelineationService();
