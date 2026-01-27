/**
 * Queensland DEM Elevation API Service
 *
 * Uses Queensland Government's high-resolution LiDAR DEM ImageServer
 * Resolution: 0.5m - 1m where LiDAR is available, 30m SRTM elsewhere
 *
 * Data source: Queensland Spatial Services
 * https://spatial-img.information.qld.gov.au/arcgis/rest/services/Elevation/QldDem/ImageServer
 */

const QLD_DEM_BASE_URL = 'https://spatial-img.information.qld.gov.au/arcgis/rest/services/Elevation/QldDem/ImageServer';

export interface ElevationResult {
  elevation: number; // metres AHD (Australian Height Datum)
  location: {
    lng: number;
    lat: number;
  };
  metadata: {
    dataSource: string;
    captureDate: string | null;
    resolution: string;
    accuracy: string;
    productType: string;
  };
}

export interface ElevationProfilePoint {
  distance: number; // metres from start
  elevation: number; // metres AHD
  location: {
    lng: number;
    lat: number;
  };
}

export interface ElevationProfileResult {
  points: ElevationProfilePoint[];
  metadata: {
    dataSource: string;
    captureDate: string | null;
    resolution: string;
    accuracy: string;
  };
  statistics: {
    minElevation: number;
    maxElevation: number;
    elevationGain: number;
    elevationLoss: number;
    averageSlope: number; // percentage
    totalDistance: number;
  };
}

/**
 * Query elevation at a single point using the QLD DEM ImageServer
 */
export async function getElevationAtPoint(
  lng: number,
  lat: number
): Promise<ElevationResult> {
  // Use the identify endpoint to get pixel value and metadata
  const params = new URLSearchParams({
    geometry: JSON.stringify({
      x: lng,
      y: lat,
      spatialReference: { wkid: 4326 }
    }),
    geometryType: 'esriGeometryPoint',
    returnGeometry: 'false',
    returnCatalogItems: 'true',
    f: 'json'
  });

  const response = await fetch(`${QLD_DEM_BASE_URL}/identify?${params}`);

  if (!response.ok) {
    throw new Error(`Elevation query failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Elevation query failed');
  }

  // Extract elevation value
  const elevation = parseFloat(data.value) || 0;

  // Extract metadata from catalog items if available
  let metadata = {
    dataSource: 'Queensland Government DEM',
    captureDate: null as string | null,
    resolution: 'Unknown',
    accuracy: '±0.30m (95% confidence)',
    productType: 'Digital Terrain Model'
  };

  if (data.catalogItems?.features?.length > 0) {
    const item = data.catalogItems.features[0].attributes;

    // Parse capture date
    if (item.capturestart) {
      const date = new Date(item.capturestart);
      metadata.captureDate = date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short'
      });
    } else if (item.year) {
      metadata.captureDate = item.year.toString();
    }

    // Parse resolution
    if (item.res_value) {
      metadata.resolution = `${item.res_value}m`;
    } else if (item.lowps) {
      metadata.resolution = `${item.lowps.toFixed(1)}m`;
    }

    // Parse data source
    if (item.name) {
      metadata.dataSource = item.name;
    }

    // Parse product type
    if (item.product_type) {
      metadata.productType = item.product_type;
    }

    // Adjust accuracy based on resolution
    const res = item.res_value || item.lowps || 30;
    if (res <= 1) {
      metadata.accuracy = '±0.15m (95% confidence)';
    } else if (res <= 5) {
      metadata.accuracy = '±0.30m (95% confidence)';
    } else {
      metadata.accuracy = '±5-10m (SRTM)';
    }
  }

  return {
    elevation,
    location: { lng, lat },
    metadata
  };
}

/**
 * Query elevation along a line (for elevation profiles)
 * Samples points along the line and queries elevation at each point
 */
export async function getElevationProfile(
  coordinates: [number, number][], // Array of [lng, lat] pairs
  sampleCount: number = 50
): Promise<ElevationProfileResult> {
  if (coordinates.length < 2) {
    throw new Error('At least 2 coordinates required for elevation profile');
  }

  // Calculate total line length and sample points along it
  const samplePoints = sampleAlongLine(coordinates, sampleCount);

  // Query elevation at each sample point (batch them for efficiency)
  const points: ElevationProfilePoint[] = [];
  let totalDistance = 0;
  let prevPoint: [number, number] | null = null;
  let metadata = {
    dataSource: 'Queensland Government DEM',
    captureDate: null as string | null,
    resolution: 'Variable (0.5m - 30m)',
    accuracy: '±0.30m (95% confidence)'
  };

  // Query elevations in batches to avoid too many requests
  const batchSize = 10;
  for (let i = 0; i < samplePoints.length; i += batchSize) {
    const batch = samplePoints.slice(i, i + batchSize);

    // Query each point in the batch concurrently
    const results = await Promise.all(
      batch.map(async (coord) => {
        try {
          const params = new URLSearchParams({
            geometry: JSON.stringify({
              x: coord[0],
              y: coord[1],
              spatialReference: { wkid: 4326 }
            }),
            geometryType: 'esriGeometryPoint',
            returnGeometry: 'false',
            returnCatalogItems: 'false',
            f: 'json'
          });

          const response = await fetch(`${QLD_DEM_BASE_URL}/identify?${params}`);
          if (!response.ok) return { coord, elevation: 0 };

          const data = await response.json();
          const elevation = parseFloat(data.value) || 0;

          // Get metadata from first successful response
          if (i === 0 && data.catalogItems?.features?.length > 0) {
            const item = data.catalogItems.features[0].attributes;
            if (item.capturestart) {
              const date = new Date(item.capturestart);
              metadata.captureDate = date.toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'short'
              });
            }
            if (item.name) {
              metadata.dataSource = item.name;
            }
          }

          return { coord, elevation };
        } catch {
          return { coord, elevation: 0 };
        }
      })
    );

    // Add results to points array
    for (const result of results) {
      const [lng, lat] = result.coord;

      // Calculate distance from start
      if (prevPoint) {
        totalDistance += haversineDistance(prevPoint[1], prevPoint[0], lat, lng);
      }

      points.push({
        distance: totalDistance,
        elevation: result.elevation,
        location: { lng, lat }
      });

      prevPoint = [lng, lat];
    }
  }

  // Calculate statistics
  const elevations = points.map(p => p.elevation).filter(e => e !== 0);
  const minElevation = elevations.length > 0 ? Math.min(...elevations) : 0;
  const maxElevation = elevations.length > 0 ? Math.max(...elevations) : 0;

  let elevationGain = 0;
  let elevationLoss = 0;

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevation - points[i - 1].elevation;
    if (points[i].elevation !== 0 && points[i - 1].elevation !== 0) {
      if (diff > 0) elevationGain += diff;
      else elevationLoss += Math.abs(diff);
    }
  }

  // Average slope as percentage
  const averageSlope = totalDistance > 0
    ? ((maxElevation - minElevation) / totalDistance) * 100
    : 0;

  return {
    points,
    metadata,
    statistics: {
      minElevation,
      maxElevation,
      elevationGain,
      elevationLoss,
      averageSlope,
      totalDistance
    }
  };
}

/**
 * Sample evenly spaced points along a polyline
 */
function sampleAlongLine(
  coordinates: [number, number][],
  sampleCount: number
): [number, number][] {
  if (coordinates.length < 2) return coordinates;

  // Calculate total length
  let totalLength = 0;
  const segments: { start: [number, number]; end: [number, number]; length: number; cumLength: number }[] = [];

  for (let i = 1; i < coordinates.length; i++) {
    const segmentLength = haversineDistance(
      coordinates[i - 1][1], coordinates[i - 1][0],
      coordinates[i][1], coordinates[i][0]
    );
    totalLength += segmentLength;
    segments.push({
      start: coordinates[i - 1],
      end: coordinates[i],
      length: segmentLength,
      cumLength: totalLength
    });
  }

  // Generate evenly spaced sample points
  const samples: [number, number][] = [coordinates[0]];
  const interval = totalLength / (sampleCount - 1);

  for (let i = 1; i < sampleCount - 1; i++) {
    const targetDist = i * interval;

    // Find the segment containing this distance
    let segment = segments[0];
    let prevCumLength = 0;

    for (const seg of segments) {
      if (seg.cumLength >= targetDist) {
        segment = seg;
        break;
      }
      prevCumLength = seg.cumLength;
    }

    // Interpolate within the segment
    const segmentProgress = (targetDist - prevCumLength) / segment.length;
    const lng = segment.start[0] + (segment.end[0] - segment.start[0]) * segmentProgress;
    const lat = segment.start[1] + (segment.end[1] - segment.start[1]) * segmentProgress;

    samples.push([lng, lat]);
  }

  samples.push(coordinates[coordinates.length - 1]);
  return samples;
}

/**
 * Calculate haversine distance between two points in metres
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in metres
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate slope between two points
 */
export function calculateSlope(
  elevation1: number,
  elevation2: number,
  distance: number
): { degrees: number; percentage: number } {
  if (distance === 0) return { degrees: 0, percentage: 0 };

  const rise = elevation2 - elevation1;
  const percentage = (rise / distance) * 100;
  const degrees = Math.atan(rise / distance) * (180 / Math.PI);

  return { degrees, percentage };
}
