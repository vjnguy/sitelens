/**
 * File Import Utility
 *
 * Supports importing GeoJSON, KML, KMZ, and Shapefiles
 * Converts all formats to GeoJSON FeatureCollection
 */

import type { FeatureCollection } from 'geojson';

export interface ImportResult {
  success: boolean;
  data?: FeatureCollection;
  fileName: string;
  format: 'geojson' | 'kml' | 'kmz' | 'shapefile' | 'unknown';
  featureCount?: number;
  error?: string;
  /** Number of images extracted from KMZ */
  extractedImages?: number;
}

export type SupportedFormat = 'geojson' | 'kml' | 'kmz' | 'zip';

const SUPPORTED_EXTENSIONS = ['.geojson', '.json', '.kml', '.kmz', '.zip', '.shp'];

/**
 * Detect file format from extension
 */
export function detectFormat(fileName: string): SupportedFormat | null {
  const ext = fileName.toLowerCase().split('.').pop();

  switch (ext) {
    case 'geojson':
    case 'json':
      return 'geojson';
    case 'kml':
      return 'kml';
    case 'kmz':
      return 'kmz';
    case 'zip':
    case 'shp':
      return 'zip';
    default:
      return null;
  }
}

/**
 * Convert internal format to result format
 */
function toResultFormat(format: SupportedFormat): ImportResult['format'] {
  return format === 'zip' ? 'shapefile' : format;
}

/**
 * Parse GeoJSON from text
 */
function parseGeoJSON(text: string): FeatureCollection {
  const parsed = JSON.parse(text);

  // Handle different GeoJSON types
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
  // Dynamic import to avoid SSR issues
  const toGeoJSON = await import('@mapbox/togeojson');

  // Parse XML
  const parser = new DOMParser();
  const kmlDoc = parser.parseFromString(text, 'text/xml');

  // Check for parse errors
  const parseError = kmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid KML format');
  }

  // Convert to GeoJSON
  const geojson = toGeoJSON.kml(kmlDoc);

  return geojson as FeatureCollection;
}

/**
 * Parse KMZ (compressed KML) to GeoJSON with embedded images
 */
async function parseKMZ(arrayBuffer: ArrayBuffer): Promise<FeatureCollection> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find the KML file (usually doc.kml or *.kml)
  let kmlContent: string | null = null;
  let kmlFileName: string | null = null;

  // Collect all image files as data URLs
  const imageDataUrls: Record<string, string> = {};
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];

  for (const fileName of Object.keys(zip.files)) {
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.kml')) {
      kmlContent = await zip.files[fileName].async('string');
      kmlFileName = fileName;
    } else if (imageExtensions.some(ext => lowerName.endsWith(ext))) {
      // Extract image as base64 data URL
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

  // Replace image references in KML with data URLs
  let processedKml = kmlContent;
  for (const [originalPath, dataUrl] of Object.entries(imageDataUrls)) {
    // Replace both the filename and any relative path references
    const fileName = originalPath.split('/').pop() || originalPath;

    // Escape special regex characters in the path
    const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace full path references
    processedKml = processedKml.replace(new RegExp(escapedPath, 'g'), dataUrl);
    // Replace filename-only references (common in href attributes)
    processedKml = processedKml.replace(new RegExp(`href>${escapedFileName}<`, 'g'), `href>${dataUrl}<`);
  }

  // Parse the processed KML
  const geojson = await parseKML(processedKml);

  // Add image count to metadata if images were extracted
  if (Object.keys(imageDataUrls).length > 0) {
    // Store extracted images info in the first feature's properties for reference
    if (geojson.features.length > 0 && !geojson.features[0].properties) {
      geojson.features[0].properties = {};
    }
    // Add metadata about extracted images
    (geojson as any)._importMetadata = {
      extractedImages: Object.keys(imageDataUrls).length,
      imageFiles: Object.keys(imageDataUrls),
    };
  }

  return geojson;
}

/**
 * Get MIME type from file extension
 */
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
 * Parse Shapefile to GeoJSON using shpjs
 */
async function parseShapefile(arrayBuffer: ArrayBuffer): Promise<FeatureCollection> {
  // Dynamic import
  const shp = (await import('shpjs')).default;

  // shpjs can handle both .shp files and .zip files containing shapefiles
  const geojson = await shp(arrayBuffer);

  // shpjs might return an array of FeatureCollections for multiple layers
  if (Array.isArray(geojson)) {
    // Merge all features into one FeatureCollection
    const allFeatures = geojson.flatMap(fc => fc.features || []);
    return {
      type: 'FeatureCollection',
      features: allFeatures,
    };
  }

  return geojson as FeatureCollection;
}

/**
 * Import a file and convert to GeoJSON
 */
export async function importFile(file: File): Promise<ImportResult> {
  const fileName = file.name;
  const format = detectFormat(fileName);

  if (!format) {
    return {
      success: false,
      fileName,
      format: 'unknown',
      error: `Unsupported file format. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  try {
    let data: FeatureCollection;

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

      case 'kmz': {
        const arrayBuffer = await file.arrayBuffer();
        data = await parseKMZ(arrayBuffer);
        break;
      }

      case 'zip': {
        const arrayBuffer = await file.arrayBuffer();
        data = await parseShapefile(arrayBuffer);
        break;
      }

      default:
        return {
          success: false,
          fileName,
          format: 'unknown',
          error: 'Unsupported format',
        };
    }

    // Validate we got features
    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        fileName,
        format: toResultFormat(format),
        error: 'No features found in file',
      };
    }

    // Check for import metadata (e.g., extracted images from KMZ)
    const importMetadata = (data as any)._importMetadata;
    if (importMetadata) {
      delete (data as any)._importMetadata; // Clean up metadata from data
    }

    return {
      success: true,
      data,
      fileName,
      format: toResultFormat(format),
      featureCount: data.features.length,
      extractedImages: importMetadata?.extractedImages,
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to parse file';
    return {
      success: false,
      fileName,
      format: toResultFormat(format),
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

    // Get content type to help detect format
    const contentType = response.headers.get('content-type') || '';

    // Extract filename from URL
    const urlParts = url.split('/');
    let fileName = urlParts[urlParts.length - 1].split('?')[0];
    if (!fileName) fileName = 'imported-data';

    // Detect format from URL or content type
    let format = detectFormat(fileName);

    if (!format) {
      // Try to detect from content type
      if (contentType.includes('application/json') || contentType.includes('application/geo+json')) {
        format = 'geojson';
        fileName += '.geojson';
      } else if (contentType.includes('application/vnd.google-earth.kml')) {
        format = 'kml';
        fileName += '.kml';
      } else if (contentType.includes('application/vnd.google-earth.kmz') || contentType.includes('application/zip')) {
        format = 'zip';
        fileName += '.zip';
      } else {
        // Default to trying GeoJSON
        format = 'geojson';
      }
    }

    // Create a virtual file from the response
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
 * Get user-friendly format description
 */
export function getFormatDescription(format: ImportResult['format']): string {
  switch (format) {
    case 'geojson':
      return 'GeoJSON';
    case 'kml':
      return 'KML (Google Earth)';
    case 'kmz':
      return 'KMZ (Compressed KML)';
    case 'shapefile':
      return 'Shapefile (ESRI)';
    default:
      return 'Unknown';
  }
}

/**
 * Get supported formats for file input accept attribute
 */
export function getSupportedFileTypes(): string {
  return '.geojson,.json,.kml,.kmz,.zip,.shp';
}
