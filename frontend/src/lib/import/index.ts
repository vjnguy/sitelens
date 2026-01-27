/**
 * File Import Module
 *
 * Utilities for importing spatial data files (GeoJSON, KML, KMZ, Shapefile)
 */

export {
  importFile,
  importFromUrl,
  detectFormat,
  getSupportedFileTypes,
  getFormatDescription,
  type ImportResult,
  type SupportedFormat,
} from './file-import';
