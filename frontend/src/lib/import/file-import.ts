/**
 * File Import Utility
 *
 * Supports importing multiple geospatial file formats:
 * - GeoJSON (.geojson, .json)
 * - KML (.kml)
 * - KMZ (.kmz)
 * - Shapefile (.zip, .shp)
 * - CSV (.csv) - with lat/lng columns
 * - DXF (.dxf) - CAD format
 * - GeoTIFF (.tif, .tiff) - raster with georeferencing
 * - GPX (.gpx) - GPS exchange format
 *
 * All vector formats are converted to GeoJSON FeatureCollection
 */

import type { FeatureCollection, Feature, Point, LineString, Polygon } from 'geojson';

export interface ImportResult {
  success: boolean;
  data?: FeatureCollection;
  fileName: string;
  format: SupportedFormat;
  featureCount?: number;
  error?: string;
  /** Number of images extracted from KMZ */
  extractedImages?: number;
  /** For raster imports, contains the image data */
  rasterData?: RasterImportData;
  /** For CSV imports, detected coordinate columns */
  csvColumns?: CsvColumnInfo;
}

export interface RasterImportData {
  imageUrl: string;
  bounds: [[number, number], [number, number]]; // [[minLng, minLat], [maxLng, maxLat]]
  width: number;
  height: number;
}

export interface CsvColumnInfo {
  latColumn: string;
  lngColumn: string;
  allColumns: string[];
}

export type SupportedFormat =
  | 'geojson'
  | 'kml'
  | 'kmz'
  | 'shapefile'
  | 'csv'
  | 'dxf'
  | 'geotiff'
  | 'gpx'
  | 'image'
  | 'unknown';

interface FormatInfo {
  format: SupportedFormat;
  extensions: string[];
  description: string;
  icon: string;
  isRaster: boolean;
}

export const FORMAT_INFO: Record<SupportedFormat, FormatInfo> = {
  geojson: {
    format: 'geojson',
    extensions: ['.geojson', '.json'],
    description: 'GeoJSON',
    icon: 'FileJson',
    isRaster: false,
  },
  kml: {
    format: 'kml',
    extensions: ['.kml'],
    description: 'KML (Google Earth)',
    icon: 'Globe',
    isRaster: false,
  },
  kmz: {
    format: 'kmz',
    extensions: ['.kmz'],
    description: 'KMZ (Compressed KML)',
    icon: 'FileArchive',
    isRaster: false,
  },
  shapefile: {
    format: 'shapefile',
    extensions: ['.zip', '.shp'],
    description: 'Shapefile (ESRI)',
    icon: 'FileArchive',
    isRaster: false,
  },
  csv: {
    format: 'csv',
    extensions: ['.csv'],
    description: 'CSV (with coordinates)',
    icon: 'Table',
    isRaster: false,
  },
  dxf: {
    format: 'dxf',
    extensions: ['.dxf'],
    description: 'DXF (AutoCAD)',
    icon: 'PenTool',
    isRaster: false,
  },
  geotiff: {
    format: 'geotiff',
    extensions: ['.tif', '.tiff', '.geotiff'],
    description: 'GeoTIFF (Raster)',
    icon: 'Image',
    isRaster: true,
  },
  gpx: {
    format: 'gpx',
    extensions: ['.gpx'],
    description: 'GPX (GPS Exchange)',
    icon: 'Navigation',
    isRaster: false,
  },
  image: {
    format: 'image',
    extensions: ['.jpg', '.jpeg', '.png'],
    description: 'Image (needs georeferencing)',
    icon: 'Image',
    isRaster: true,
  },
  unknown: {
    format: 'unknown',
    extensions: [],
    description: 'Unknown',
    icon: 'File',
    isRaster: false,
  },
};

/**
 * Detect file format from extension
 */
export function detectFormat(fileName: string): SupportedFormat {
  const ext = '.' + (fileName.toLowerCase().split('.').pop() || '');

  for (const [format, info] of Object.entries(FORMAT_INFO)) {
    if (info.extensions.includes(ext)) {
      return format as SupportedFormat;
    }
  }

  return 'unknown';
}

/**
 * Get all supported file extensions for file input
 */
export function getSupportedFileTypes(): string {
  const allExtensions = Object.values(FORMAT_INFO)
    .flatMap(info => info.extensions)
    .filter(ext => ext.length > 0);
  return allExtensions.join(',');
}

/**
 * Get user-friendly format description
 */
export function getFormatDescription(format: SupportedFormat): string {
  return FORMAT_INFO[format]?.description || 'Unknown';
}

/**
 * Check if format produces raster data
 */
export function isRasterFormat(format: SupportedFormat): boolean {
  return FORMAT_INFO[format]?.isRaster || false;
}

// ============================================================================
// PARSERS
// ============================================================================

/**
 * Parse GeoJSON from text
 */
function parseGeoJSON(text: string): FeatureCollection {
  const parsed = JSON.parse(text);

  if (parsed.type === 'FeatureCollection') {
    return parsed;
  }

  if (parsed.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [parsed],
    };
  }

  // Assume it's a geometry, wrap it
  if (parsed.type && parsed.coordinates) {
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: parsed,
      }],
    };
  }

  throw new Error('Invalid GeoJSON structure');
}

/**
 * Parse KML to GeoJSON using @mapbox/togeojson
 */
async function parseKML(text: string): Promise<FeatureCollection> {
  const toGeoJSON = await import('@mapbox/togeojson');

  const parser = new DOMParser();
  const kmlDoc = parser.parseFromString(text, 'text/xml');

  const parseError = kmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid KML format');
  }

  const geojson = toGeoJSON.kml(kmlDoc);
  return geojson as FeatureCollection;
}

/**
 * Parse GPX to GeoJSON using @mapbox/togeojson
 */
async function parseGPX(text: string): Promise<FeatureCollection> {
  const toGeoJSON = await import('@mapbox/togeojson');

  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(text, 'text/xml');

  const parseError = gpxDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid GPX format');
  }

  const geojson = toGeoJSON.gpx(gpxDoc);
  return geojson as FeatureCollection;
}

/**
 * Parse KMZ (compressed KML) to GeoJSON
 */
async function parseKMZ(arrayBuffer: ArrayBuffer): Promise<FeatureCollection & { _importMetadata?: { extractedImages: number } }> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);

  let kmlContent: string | null = null;
  const imageDataUrls: Record<string, string> = {};
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];

  for (const fileName of Object.keys(zip.files)) {
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.kml')) {
      kmlContent = await zip.files[fileName].async('string');
    } else if (imageExtensions.some(ext => lowerName.endsWith(ext))) {
      try {
        const imageData = await zip.files[fileName].async('base64');
        const mimeType = getMimeType(fileName);
        imageDataUrls[fileName] = `data:${mimeType};base64,${imageData}`;
      } catch (e) {
        console.warn(`Failed to extract image: ${fileName}`, e);
      }
    }
  }

  if (!kmlContent) {
    throw new Error('No KML file found in KMZ archive');
  }

  // Replace image references with data URLs
  let processedKml = kmlContent;
  for (const [originalPath, dataUrl] of Object.entries(imageDataUrls)) {
    const fileName = originalPath.split('/').pop() || originalPath;
    const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    processedKml = processedKml.replace(new RegExp(escapedPath, 'g'), dataUrl);
    processedKml = processedKml.replace(new RegExp(`href>${escapedFileName}<`, 'g'), `href>${dataUrl}<`);
  }

  const geojson = await parseKML(processedKml) as FeatureCollection & { _importMetadata?: { extractedImages: number } };

  if (Object.keys(imageDataUrls).length > 0) {
    geojson._importMetadata = {
      extractedImages: Object.keys(imageDataUrls).length,
    };
  }

  return geojson;
}

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Parse Shapefile to GeoJSON
 */
async function parseShapefile(arrayBuffer: ArrayBuffer): Promise<FeatureCollection> {
  const shp = (await import('shpjs')).default;
  const geojson = await shp(arrayBuffer);

  if (Array.isArray(geojson)) {
    const allFeatures = geojson.flatMap(fc => fc.features || []);
    return {
      type: 'FeatureCollection',
      features: allFeatures,
    };
  }

  return geojson as FeatureCollection;
}

/**
 * Parse CSV to GeoJSON points
 */
async function parseCSV(
  text: string,
  options?: { latColumn?: string; lngColumn?: string }
): Promise<{ geojson: FeatureCollection; columns: CsvColumnInfo }> {
  const Papa = (await import('papaparse')).default;

  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    const firstError = result.errors[0];
    throw new Error(`CSV parse error: ${firstError.message}`);
  }

  const rows = result.data as Record<string, unknown>[];
  const columns = result.meta.fields || [];

  // Auto-detect lat/lng columns if not provided
  let latColumn = options?.latColumn;
  let lngColumn = options?.lngColumn;

  if (!latColumn || !lngColumn) {
    const latPatterns = ['lat', 'latitude', 'y', 'lat_dd', 'latitude_dd'];
    const lngPatterns = ['lng', 'lon', 'long', 'longitude', 'x', 'lng_dd', 'lon_dd', 'longitude_dd'];

    for (const col of columns) {
      const lowerCol = col.toLowerCase();
      if (!latColumn && latPatterns.some(p => lowerCol.includes(p))) {
        latColumn = col;
      }
      if (!lngColumn && lngPatterns.some(p => lowerCol.includes(p))) {
        lngColumn = col;
      }
    }
  }

  if (!latColumn || !lngColumn) {
    throw new Error(
      'Could not detect coordinate columns. Please specify lat/lng column names. ' +
      `Available columns: ${columns.join(', ')}`
    );
  }

  const features: Feature<Point>[] = [];
  let skipped = 0;

  for (const row of rows) {
    const lat = parseFloat(String(row[latColumn]));
    const lng = parseFloat(String(row[lngColumn]));

    if (isNaN(lat) || isNaN(lng)) {
      skipped++;
      continue;
    }

    // Build properties excluding coordinate columns
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key !== latColumn && key !== lngColumn) {
        properties[key] = value;
      }
    }

    features.push({
      type: 'Feature',
      properties,
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    });
  }

  if (features.length === 0) {
    throw new Error(`No valid coordinates found in CSV. Skipped ${skipped} rows.`);
  }

  return {
    geojson: {
      type: 'FeatureCollection',
      features,
    },
    columns: {
      latColumn,
      lngColumn,
      allColumns: columns,
    },
  };
}

/**
 * Parse DXF (CAD format) to GeoJSON
 */
async function parseDXF(text: string): Promise<FeatureCollection> {
  const DxfParserModule = await import('dxf-parser');
  const DxfParser = DxfParserModule.default;
  const parser = new DxfParser();
  const dxf = parser.parseSync(text);

  if (!dxf || !dxf.entities) {
    throw new Error('Invalid DXF file or no entities found');
  }

  const features: Feature[] = [];

  // Use 'any' for entity since dxf-parser types are incomplete
  for (const entity of dxf.entities as any[]) {
    let geometry: Point | LineString | Polygon | null = null;
    const properties: Record<string, unknown> = {
      layer: entity.layer,
      type: entity.type,
    };

    switch (entity.type) {
      case 'POINT':
        if (entity.position) {
          geometry = {
            type: 'Point',
            coordinates: [entity.position.x, entity.position.y],
          };
        }
        break;

      case 'LINE':
        if (entity.vertices && entity.vertices.length >= 2) {
          geometry = {
            type: 'LineString',
            coordinates: entity.vertices.map((v: { x: number; y: number }) => [v.x, v.y]),
          };
        }
        break;

      case 'LWPOLYLINE':
      case 'POLYLINE':
        if (entity.vertices && entity.vertices.length >= 2) {
          const coords = entity.vertices.map((v: { x: number; y: number }) => [v.x, v.y]);
          if (entity.shape) {
            // Closed polyline = polygon
            coords.push(coords[0]); // Close the ring
            geometry = {
              type: 'Polygon',
              coordinates: [coords],
            };
          } else {
            geometry = {
              type: 'LineString',
              coordinates: coords,
            };
          }
        }
        break;

      case 'CIRCLE':
        // Approximate circle as polygon with 32 points
        if (entity.center && entity.radius) {
          const points = 32;
          const coords = [];
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            coords.push([
              entity.center.x + Math.cos(angle) * entity.radius,
              entity.center.y + Math.sin(angle) * entity.radius,
            ]);
          }
          geometry = {
            type: 'Polygon',
            coordinates: [coords],
          };
          properties.radius = entity.radius;
        }
        break;

      case 'ARC':
        // Convert arc to LineString
        if (entity.center && entity.radius && entity.startAngle !== undefined && entity.endAngle !== undefined) {
          const points = 32;
          const startAngle = (entity.startAngle * Math.PI) / 180;
          const endAngle = (entity.endAngle * Math.PI) / 180;
          const angleSpan = endAngle - startAngle;
          const coords = [];
          for (let i = 0; i <= points; i++) {
            const angle = startAngle + (i / points) * angleSpan;
            coords.push([
              entity.center.x + Math.cos(angle) * entity.radius,
              entity.center.y + Math.sin(angle) * entity.radius,
            ]);
          }
          geometry = {
            type: 'LineString',
            coordinates: coords,
          };
        }
        break;

      case 'ELLIPSE':
        // Approximate ellipse as polygon
        if (entity.center && entity.majorAxisEndPoint && entity.axisRatio) {
          const points = 32;
          const majorX = entity.majorAxisEndPoint.x;
          const majorY = entity.majorAxisEndPoint.y;
          const majorRadius = Math.sqrt(majorX * majorX + majorY * majorY);
          const minorRadius = majorRadius * entity.axisRatio;
          const rotation = Math.atan2(majorY, majorX);
          const coords = [];
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const x = majorRadius * Math.cos(angle);
            const y = minorRadius * Math.sin(angle);
            // Rotate
            const rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation);
            const rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation);
            coords.push([
              entity.center.x + rotatedX,
              entity.center.y + rotatedY,
            ]);
          }
          geometry = {
            type: 'Polygon',
            coordinates: [coords],
          };
        }
        break;

      case 'TEXT':
      case 'MTEXT':
        if (entity.position || entity.startPoint) {
          const pos = entity.position || entity.startPoint;
          geometry = {
            type: 'Point',
            coordinates: [pos.x, pos.y],
          };
          properties.text = entity.text || entity.contents;
        }
        break;
    }

    if (geometry) {
      features.push({
        type: 'Feature',
        properties,
        geometry,
      });
    }
  }

  if (features.length === 0) {
    throw new Error('No convertible entities found in DXF file');
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Parse GeoTIFF to raster data
 */
async function parseGeoTIFF(arrayBuffer: ArrayBuffer): Promise<RasterImportData> {
  const GeoTIFF = await import('geotiff');
  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  // Get bounding box from GeoTIFF
  const bbox = image.getBoundingBox();
  const width = image.getWidth();
  const height = image.getHeight();

  // Read raster data
  const rasterData = await image.readRasters();
  const samplesPerPixel = image.getSamplesPerPixel();

  // Create canvas and draw image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not create canvas context');
  }

  const imageData = ctx.createImageData(width, height);

  // Handle different band configurations
  if (samplesPerPixel >= 3) {
    // RGB or RGBA
    const red = rasterData[0] as Uint8Array | Uint16Array;
    const green = rasterData[1] as Uint8Array | Uint16Array;
    const blue = rasterData[2] as Uint8Array | Uint16Array;
    const alpha = samplesPerPixel >= 4 ? rasterData[3] as Uint8Array | Uint16Array : null;

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      // Normalize to 0-255 if needed
      const maxVal = red instanceof Uint16Array ? 65535 : 255;
      imageData.data[idx] = Math.round((Number(red[i]) / maxVal) * 255);
      imageData.data[idx + 1] = Math.round((Number(green[i]) / maxVal) * 255);
      imageData.data[idx + 2] = Math.round((Number(blue[i]) / maxVal) * 255);
      imageData.data[idx + 3] = alpha ? Math.round((Number(alpha[i]) / maxVal) * 255) : 255;
    }
  } else {
    // Grayscale
    const gray = rasterData[0] as Uint8Array | Uint16Array;
    const maxVal = gray instanceof Uint16Array ? 65535 : 255;

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const value = Math.round((Number(gray[i]) / maxVal) * 255);
      imageData.data[idx] = value;
      imageData.data[idx + 1] = value;
      imageData.data[idx + 2] = value;
      imageData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const imageUrl = canvas.toDataURL('image/png');

  return {
    imageUrl,
    bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
    width,
    height,
  };
}

// ============================================================================
// MAIN IMPORT FUNCTIONS
// ============================================================================

/**
 * Import a file and convert to GeoJSON (or raster data)
 */
export async function importFile(
  file: File,
  options?: { latColumn?: string; lngColumn?: string }
): Promise<ImportResult> {
  const fileName = file.name;
  const format = detectFormat(fileName);

  if (format === 'unknown') {
    return {
      success: false,
      fileName,
      format: 'unknown',
      error: `Unsupported file format. Supported: ${getSupportedFileTypes()}`,
    };
  }

  try {
    // Handle raster formats
    if (format === 'geotiff') {
      const arrayBuffer = await file.arrayBuffer();
      const rasterData = await parseGeoTIFF(arrayBuffer);
      return {
        success: true,
        fileName,
        format,
        rasterData,
      };
    }

    if (format === 'image') {
      // Images need georeferencing - return as-is for the georeferencing UI
      const imageUrl = URL.createObjectURL(file);
      return {
        success: true,
        fileName,
        format,
        rasterData: {
          imageUrl,
          bounds: [[0, 0], [0, 0]], // Needs georeferencing
          width: 0,
          height: 0,
        },
      };
    }

    // Handle vector formats
    let data: FeatureCollection;
    let csvColumns: CsvColumnInfo | undefined;
    let extractedImages: number | undefined;

    switch (format) {
      case 'geojson': {
        const text = await file.text();
        data = parseGeoJSON(text);
        break;
      }

      case 'kml': {
        const text = await file.text();
        data = await parseKML(text);
        break;
      }

      case 'gpx': {
        const text = await file.text();
        data = await parseGPX(text);
        break;
      }

      case 'kmz': {
        const arrayBuffer = await file.arrayBuffer();
        const result = await parseKMZ(arrayBuffer);
        data = result;
        extractedImages = result._importMetadata?.extractedImages;
        delete (data as FeatureCollection & { _importMetadata?: unknown })._importMetadata;
        break;
      }

      case 'shapefile': {
        const arrayBuffer = await file.arrayBuffer();
        data = await parseShapefile(arrayBuffer);
        break;
      }

      case 'csv': {
        const text = await file.text();
        const result = await parseCSV(text, options);
        data = result.geojson;
        csvColumns = result.columns;
        break;
      }

      case 'dxf': {
        const text = await file.text();
        data = await parseDXF(text);
        break;
      }

      default:
        return {
          success: false,
          fileName,
          format,
          error: 'Unsupported format',
        };
    }

    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        fileName,
        format,
        error: 'No features found in file',
      };
    }

    return {
      success: true,
      data,
      fileName,
      format,
      featureCount: data.features.length,
      extractedImages,
      csvColumns,
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to parse file';
    return {
      success: false,
      fileName,
      format,
      error: errorMessage,
    };
  }
}

/**
 * Import from URL
 */
export async function importFromUrl(url: string): Promise<ImportResult> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        fileName: url,
        format: 'unknown',
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const urlParts = url.split('/');
    let fileName = urlParts[urlParts.length - 1].split('?')[0];
    if (!fileName) fileName = 'imported-data';

    let format = detectFormat(fileName);

    if (format === 'unknown') {
      if (contentType.includes('application/json') || contentType.includes('application/geo+json')) {
        format = 'geojson';
        fileName += '.geojson';
      } else if (contentType.includes('application/vnd.google-earth.kml')) {
        format = 'kml';
        fileName += '.kml';
      } else if (contentType.includes('application/vnd.google-earth.kmz') || contentType.includes('application/zip')) {
        format = 'shapefile';
        fileName += '.zip';
      } else {
        format = 'geojson';
      }
    }

    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });

    return importFile(file);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch URL';
    return {
      success: false,
      fileName: url,
      format: 'unknown',
      error: errorMessage,
    };
  }
}

/**
 * Preview CSV columns without full import
 */
export async function previewCSV(file: File): Promise<{
  columns: string[];
  sampleData: Record<string, unknown>[];
  suggestedLatColumn?: string;
  suggestedLngColumn?: string;
}> {
  const Papa = (await import('papaparse')).default;
  const text = await file.text();

  const result = Papa.parse(text, {
    header: true,
    preview: 5, // Only read first 5 rows
    skipEmptyLines: true,
  });

  const columns = result.meta.fields || [];

  // Detect coordinate columns
  const latPatterns = ['lat', 'latitude', 'y', 'lat_dd'];
  const lngPatterns = ['lng', 'lon', 'long', 'longitude', 'x', 'lng_dd', 'lon_dd'];

  let suggestedLatColumn: string | undefined;
  let suggestedLngColumn: string | undefined;

  for (const col of columns) {
    const lowerCol = col.toLowerCase();
    if (!suggestedLatColumn && latPatterns.some(p => lowerCol.includes(p))) {
      suggestedLatColumn = col;
    }
    if (!suggestedLngColumn && lngPatterns.some(p => lowerCol.includes(p))) {
      suggestedLngColumn = col;
    }
  }

  return {
    columns,
    sampleData: result.data as Record<string, unknown>[],
    suggestedLatColumn,
    suggestedLngColumn,
  };
}
