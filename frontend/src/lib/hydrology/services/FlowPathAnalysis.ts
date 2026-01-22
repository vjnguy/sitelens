/**
 * Flow Path Analysis Service
 *
 * Finds longest flow paths within subcatchments and calculates:
 * - Total length (m)
 * - Average slope (%)
 * - 10-85 slope (slope between 10% and 85% of path length)
 * - Elevation profiles
 */

import type {
  IFlowPathAnalysis,
  FlowPathAnalysisInput,
  FlowPathAnalysisOutput,
  FlowDirectionGrid,
  FlowAccumulationGrid,
  DEMGrid,
  Coordinate,
  ElevationProfile,
  FlowPathProperties,
  SubcatchmentProperties,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
} from '../interfaces';
import {
  worldToGrid,
  gridToWorld,
  getIndex,
  isInBounds,
  D8_DIRECTIONS,
  getUpstreamCells,
  cellDistance,
  getElevation,
} from '../utils/grid';
import {
  coordinatesToLineString,
  lineStringLength,
  pointAlongLine,
  createFeature,
  createFeatureCollection,
  getCellsInPolygon,
  pointInGeoJSONPolygon,
} from '../utils/geometry';

export class FlowPathAnalysis implements IFlowPathAnalysis {
  /**
   * Analyze flow paths for all subcatchments
   */
  async analyze(input: FlowPathAnalysisInput): Promise<FlowPathAnalysisOutput> {
    const { flowDirection, flowAccumulation, dem, subcatchments } = input;

    const longestPaths: GeoJSONFeature<GeoJSON.LineString, FlowPathProperties>[] = [];
    const lengths: number[] = [];
    const slopes: number[] = [];
    const slopes10_85: number[] = [];
    const elevationProfiles: ElevationProfile[] = [];

    for (const feature of subcatchments.features) {
      const polygon = feature.geometry as GeoJSON.Polygon;
      const properties = feature.properties as SubcatchmentProperties;

      // Find longest flow path
      const pathCoords = this.findLongestFlowPath(
        flowDirection,
        flowAccumulation,
        polygon,
        properties.outletCoordinates
      );

      if (pathCoords.length < 2) {
        // No valid path found - use defaults
        lengths.push(0);
        slopes.push(0);
        slopes10_85.push(0);
        elevationProfiles.push({
          distances: [],
          elevations: [],
          coordinates: [],
        });
        continue;
      }

      // Create LineString
      const lineString = coordinatesToLineString(pathCoords);
      const lengthMeters = lineStringLength(lineString);

      // Extract elevation profile
      const profile = this.extractElevationProfile(dem, pathCoords);

      // Calculate slopes
      const avgSlope = this.calculateAverageSlope(profile);
      const slope10_85 = this.calculateSlope10_85(profile);

      // Create path properties
      const pathProps: FlowPathProperties = {
        subcatchmentId: properties.id,
        lengthMeters,
        lengthKm: lengthMeters / 1000,
        averageSlopePercent: avgSlope,
        slope10_85Percent: slope10_85,
        startElevation: profile.elevations[0] || 0,
        endElevation: profile.elevations[profile.elevations.length - 1] || 0,
        elevationDrop:
          (profile.elevations[0] || 0) -
          (profile.elevations[profile.elevations.length - 1] || 0),
      };

      longestPaths.push(createFeature(lineString, pathProps, properties.id));
      lengths.push(lengthMeters);
      slopes.push(avgSlope);
      slopes10_85.push(slope10_85);
      elevationProfiles.push(profile);
    }

    return {
      longestPaths: createFeatureCollection(longestPaths),
      lengths,
      slopes,
      slopes10_85,
      elevationProfiles,
    };
  }

  /**
   * Find longest flow path within a subcatchment
   *
   * Algorithm:
   * 1. Find all cells within subcatchment boundary
   * 2. Find the cell with maximum flow accumulation (headwater candidates are cells with no upstream)
   * 3. Trace downstream from each headwater cell to outlet
   * 4. Return the longest path
   */
  findLongestFlowPath(
    flowDirection: FlowDirectionGrid,
    flowAccumulation: FlowAccumulationGrid,
    subcatchment: GeoJSON.Polygon,
    outlet: Coordinate
  ): Coordinate[] {
    const { metadata: fdMeta } = flowDirection;
    const { data: accData, metadata: accMeta } = flowAccumulation;
    const { rows, cols, nodata } = fdMeta;

    // Get outlet cell
    const outletCell = worldToGrid(outlet, fdMeta);
    if (!outletCell) return [];

    // Get all cells within subcatchment
    const cells = getCellsInPolygon(subcatchment, fdMeta);
    if (cells.length === 0) return [];

    // Create a set for quick lookup
    const cellSet = new Set<string>();
    for (const { row, col } of cells) {
      cellSet.add(`${row},${col}`);
    }

    // Find headwater cells (cells with no upstream within subcatchment)
    const headwaterCells: Array<{ row: number; col: number; acc: number }> = [];

    for (const { row, col } of cells) {
      const upstream = getUpstreamCells(row, col, flowDirection);
      const upstreamInCatchment = upstream.filter((u) =>
        cellSet.has(`${u.row},${u.col}`)
      );

      if (upstreamInCatchment.length === 0) {
        // This is a headwater cell
        const idx = getIndex(row, col, cols);
        const acc = accData[idx];
        if (acc !== nodata) {
          headwaterCells.push({ row, col, acc });
        }
      }
    }

    if (headwaterCells.length === 0) {
      // Fall back to finding cell with highest accumulation
      let maxAcc = 0;
      let maxCell = cells[0];
      for (const { row, col } of cells) {
        const idx = getIndex(row, col, cols);
        const acc = accData[idx];
        if (acc !== nodata && acc > maxAcc) {
          maxAcc = acc;
          maxCell = { row, col };
        }
      }
      headwaterCells.push({ ...maxCell, acc: maxAcc });
    }

    // Trace from each headwater to outlet and find longest path
    let longestPath: Array<{ row: number; col: number }> = [];
    let maxLength = 0;

    for (const headwater of headwaterCells) {
      const path = this.traceDownstream(
        flowDirection,
        { row: headwater.row, col: headwater.col },
        outletCell,
        cellSet
      );

      if (path.length > maxLength) {
        maxLength = path.length;
        longestPath = path;
      }
    }

    // Convert grid cells to world coordinates
    return longestPath.map(({ row, col }) =>
      gridToWorld(row, col, fdMeta)
    );
  }

  /**
   * Trace downstream from a cell to the outlet
   */
  private traceDownstream(
    flowDirection: FlowDirectionGrid,
    start: { row: number; col: number },
    outlet: { row: number; col: number },
    validCells: Set<string>
  ): Array<{ row: number; col: number }> {
    const { data, metadata } = flowDirection;
    const { rows, cols, nodata } = metadata;

    const path: Array<{ row: number; col: number }> = [];
    let current = { ...start };
    const visited = new Set<string>();

    const maxIterations = rows * cols;
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      const key = `${current.row},${current.col}`;

      // Check if we've reached outlet or left the subcatchment
      if (current.row === outlet.row && current.col === outlet.col) {
        path.push(current);
        break;
      }

      // Prevent infinite loops
      if (visited.has(key)) break;
      visited.add(key);

      // Check if still in valid area
      if (!validCells.has(key)) break;

      path.push({ ...current });

      // Get flow direction
      const idx = getIndex(current.row, current.col, cols);
      const dir = data[idx];

      if (dir === 0 || dir === nodata) break;

      // Get downstream cell
      const offset = D8_DIRECTIONS[dir as keyof typeof D8_DIRECTIONS];
      if (!offset) break;

      const nextRow = current.row + offset.dy;
      const nextCol = current.col + offset.dx;

      if (!isInBounds(nextRow, nextCol, rows, cols)) break;

      current = { row: nextRow, col: nextCol };
    }

    return path;
  }

  /**
   * Extract elevation profile along a path
   */
  extractElevationProfile(dem: DEMGrid, path: Coordinate[]): ElevationProfile {
    const distances: number[] = [];
    const elevations: number[] = [];
    const coordinates: Coordinate[] = [];

    if (path.length === 0) {
      return { distances, elevations, coordinates };
    }

    let cumulativeDistance = 0;

    for (let i = 0; i < path.length; i++) {
      const coord = path[i];
      const elevation = getElevation(dem, coord, true);

      if (elevation !== null) {
        if (i > 0) {
          const dx = coord.x - path[i - 1].x;
          const dy = coord.y - path[i - 1].y;
          cumulativeDistance += Math.sqrt(dx * dx + dy * dy);
        }

        distances.push(cumulativeDistance);
        elevations.push(elevation);
        coordinates.push(coord);
      }
    }

    return { distances, elevations, coordinates };
  }

  /**
   * Calculate average slope from elevation profile
   */
  private calculateAverageSlope(profile: ElevationProfile): number {
    const { distances, elevations } = profile;

    if (distances.length < 2) return 0;

    const totalDistance = distances[distances.length - 1] - distances[0];
    const elevationDrop = elevations[0] - elevations[elevations.length - 1];

    if (totalDistance === 0) return 0;

    // Slope in percent
    return (elevationDrop / totalDistance) * 100;
  }

  /**
   * Calculate 10-85 slope (slope between 10% and 85% points along path)
   *
   * This is commonly used in Australian hydrology as it excludes
   * the steeper headwater and flatter outlet sections.
   */
  calculateSlope10_85(profile: ElevationProfile): number {
    const { distances, elevations } = profile;

    if (distances.length < 2) return 0;

    const totalLength = distances[distances.length - 1];
    if (totalLength === 0) return 0;

    // Find distances at 10% and 85% of total length
    const dist10 = totalLength * 0.10;
    const dist85 = totalLength * 0.85;

    // Interpolate elevations at these points
    const elev10 = this.interpolateElevation(distances, elevations, dist10);
    const elev85 = this.interpolateElevation(distances, elevations, dist85);

    if (elev10 === null || elev85 === null) {
      return this.calculateAverageSlope(profile);
    }

    const horizontalDistance = dist85 - dist10;
    const elevationDrop = elev10 - elev85;

    if (horizontalDistance === 0) return 0;

    // Slope in percent
    return (elevationDrop / horizontalDistance) * 100;
  }

  /**
   * Interpolate elevation at a specific distance along the profile
   */
  private interpolateElevation(
    distances: number[],
    elevations: number[],
    targetDistance: number
  ): number | null {
    if (distances.length === 0) return null;

    // Handle edge cases
    if (targetDistance <= distances[0]) return elevations[0];
    if (targetDistance >= distances[distances.length - 1]) {
      return elevations[elevations.length - 1];
    }

    // Find surrounding points
    for (let i = 1; i < distances.length; i++) {
      if (distances[i] >= targetDistance) {
        const d0 = distances[i - 1];
        const d1 = distances[i];
        const e0 = elevations[i - 1];
        const e1 = elevations[i];

        // Linear interpolation
        const ratio = (targetDistance - d0) / (d1 - d0);
        return e0 + ratio * (e1 - e0);
      }
    }

    return elevations[elevations.length - 1];
  }
}

/**
 * Factory function to create a FlowPathAnalysis service
 */
export function createFlowPathAnalysis(): IFlowPathAnalysis {
  return new FlowPathAnalysis();
}

/**
 * Helper to get equal-area slope
 *
 * The equal-area slope is the slope of a line that passes through the
 * outlet elevation and divides the area under the elevation-distance
 * curve into two equal parts.
 */
export function calculateEqualAreaSlope(profile: ElevationProfile): number {
  const { distances, elevations } = profile;

  if (distances.length < 2) return 0;

  // Calculate area under the curve using trapezoidal rule
  let totalArea = 0;
  for (let i = 1; i < distances.length; i++) {
    const dx = distances[i] - distances[i - 1];
    const avgElev = (elevations[i] + elevations[i - 1]) / 2;
    totalArea += dx * avgElev;
  }

  const totalLength = distances[distances.length - 1];
  const baseElevation = elevations[elevations.length - 1]; // Outlet elevation

  // Area under straight line from outlet with slope S:
  // A = (1/2) * L * S * L = L² * S / 2
  // Total area = L * baseElev + L² * S / 2
  // Want: L * avgElev = L * baseElev + L² * S / 2
  // S = 2 * (avgElev - baseElev) / L

  const avgElevation = totalArea / totalLength;
  const slope = (2 * (avgElevation - baseElevation)) / totalLength;

  return slope * 100; // Convert to percent
}
