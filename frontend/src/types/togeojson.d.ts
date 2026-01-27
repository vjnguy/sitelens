declare module '@mapbox/togeojson' {
  import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

  /**
   * Convert a KML document to GeoJSON
   */
  export function kml(doc: Document): FeatureCollection<Geometry, GeoJsonProperties>;

  /**
   * Convert a KML document to GeoJSON, including style information
   */
  export function kmlWithStyles(doc: Document): FeatureCollection<Geometry, GeoJsonProperties>;

  /**
   * Convert a GPX document to GeoJSON
   */
  export function gpx(doc: Document): FeatureCollection<Geometry, GeoJsonProperties>;
}
