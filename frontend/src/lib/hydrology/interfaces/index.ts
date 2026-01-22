/**
 * Hydrology Pre-Processing Tool - TypeScript Interfaces
 *
 * Modular, stateless components for catchment analysis
 * Designed for WebAssembly integration with WhiteboxTools
 */

// ============================================================================
// Common Types
// ============================================================================

export interface Coordinate {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GridMetadata {
  crs: string;                    // e.g., "EPSG:28355" (MGA Zone 55)
  resolution: [number, number];   // [cellSizeX, cellSizeY] in CRS units
  bounds: BoundingBox;
  nodata: number;
  rows: number;
  cols: number;
}

export interface GeoJSONFeature<G = GeoJSON.Geometry, P = Record<string, unknown>> {
  type: 'Feature';
  geometry: G;
  properties: P;
  id?: string | number;
}

export interface GeoJSONFeatureCollection<G = GeoJSON.Geometry, P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: GeoJSONFeature<G, P>[];
}

// ============================================================================
// 1. DEM Ingestion
// ============================================================================

export interface DEMGrid {
  data: Float32Array;
  metadata: GridMetadata;
}

export interface DEMIngestionInput {
  file: File | ArrayBuffer;
  targetCRS?: string;  // Optional reprojection
}

export interface DEMIngestionOutput {
  grid: DEMGrid;
  statistics: {
    min: number;
    max: number;
    mean: number;
    validCellCount: number;
  };
}

export interface IDEMIngestion {
  /**
   * Ingest a GeoTIFF DEM file and return a normalized grid
   */
  ingest(input: DEMIngestionInput): Promise<DEMIngestionOutput>;

  /**
   * Validate that a coordinate falls within the DEM bounds and is not nodata
   */
  validatePoint(grid: DEMGrid, point: Coordinate): ValidationResult;

  /**
   * Get elevation at a specific point (with bilinear interpolation option)
   */
  getElevation(grid: DEMGrid, point: Coordinate, interpolate?: boolean): number | null;
}

// ============================================================================
// 2. Terrain Analysis
// ============================================================================

export interface TerrainAnalysisInput {
  dem: DEMGrid;
  fillDepressions?: boolean;      // Default: true
  enforceEdgeDrainage?: boolean;  // Default: true
}

export interface FlowDirectionGrid {
  data: Uint8Array;               // D8 direction codes (1-8, 0 for flat/nodata)
  metadata: GridMetadata;
}

export interface FlowAccumulationGrid {
  data: Float32Array;             // Upstream cell count
  metadata: GridMetadata;
}

export interface SlopeGrid {
  data: Float32Array;             // Slope in percent (%)
  metadata: GridMetadata;
}

export interface TerrainAnalysisOutput {
  flowDirection: FlowDirectionGrid;
  flowAccumulation: FlowAccumulationGrid;
  slope: SlopeGrid;
  filledDEM?: DEMGrid;            // If depressions were filled
}

export interface ITerrainAnalysis {
  /**
   * Perform complete terrain analysis on a DEM
   */
  analyze(input: TerrainAnalysisInput): Promise<TerrainAnalysisOutput>;

  /**
   * Fill depressions in a DEM
   */
  fillDepressions(dem: DEMGrid): Promise<DEMGrid>;

  /**
   * Calculate D8 flow direction
   */
  calculateFlowDirection(dem: DEMGrid): Promise<FlowDirectionGrid>;

  /**
   * Calculate flow accumulation from flow direction
   */
  calculateFlowAccumulation(flowDirection: FlowDirectionGrid): Promise<FlowAccumulationGrid>;

  /**
   * Calculate slope from DEM
   */
  calculateSlope(dem: DEMGrid): Promise<SlopeGrid>;
}

// ============================================================================
// 3. Catchment Delineation
// ============================================================================

export interface PourPoint {
  coordinates: Coordinate;
  snapToStream?: boolean;         // Snap to high accumulation cell
  snapThreshold?: number;         // Min accumulation for snapping
  snapRadius?: number;            // Search radius in cells
}

export interface SubcatchmentProperties {
  id: string;
  areaHectares: number;
  areaKm2: number;
  outletCoordinates: Coordinate;
  isHeadwater: boolean;
  downstreamId: string | null;
  upstreamIds: string[];
}

export interface CatchmentDelineationInput {
  flowDirection: FlowDirectionGrid;
  flowAccumulation: FlowAccumulationGrid;
  pourPoint: PourPoint;
  dem?: DEMGrid;                  // Optional, for elevation stats
  minSubcatchmentArea?: number;   // Min area in hectares for subdivision
  confluenceThreshold?: number;   // Min accumulation to define confluence
}

export interface CatchmentDelineationOutput {
  /** Full catchment boundary */
  boundary: GeoJSONFeatureCollection<GeoJSON.Polygon, { areaHectares: number }>;

  /** Subdivided subcatchments at confluences */
  subcatchments: GeoJSONFeatureCollection<GeoJSON.Polygon, SubcatchmentProperties>;

  /** Area of each subcatchment in hectares (same order as features) */
  areas: number[];

  /** Stream network within catchment */
  streamNetwork?: GeoJSONFeatureCollection<GeoJSON.LineString>;

  /** Snapped pour point location (if snapping was applied) */
  snappedPourPoint: Coordinate;
}

export interface ICatchmentDelineation {
  /**
   * Delineate catchment from pour point
   */
  delineate(input: CatchmentDelineationInput): Promise<CatchmentDelineationOutput>;

  /**
   * Snap pour point to nearest high-accumulation cell
   */
  snapToStream(
    flowAccumulation: FlowAccumulationGrid,
    point: Coordinate,
    threshold: number,
    radius: number
  ): Coordinate | null;

  /**
   * Validate pour point location
   */
  validatePourPoint(
    flowDirection: FlowDirectionGrid,
    point: Coordinate
  ): ValidationResult;
}

// ============================================================================
// 4. Land Use Overlay
// ============================================================================

export interface LandUseCategory {
  code: number;
  name: string;
  imperviousFraction: number;
}

export interface AustralianLandUseCategories {
  RESIDENTIAL_LOW: LandUseCategory;
  RESIDENTIAL_MEDIUM: LandUseCategory;
  RESIDENTIAL_HIGH: LandUseCategory;
  COMMERCIAL: LandUseCategory;
  INDUSTRIAL: LandUseCategory;
  ROADS: LandUseCategory;
  OPEN_SPACE: LandUseCategory;
  BUSH_FOREST: LandUseCategory;
  WATER: LandUseCategory;
  AGRICULTURE: LandUseCategory;
}

export interface LandUseRaster {
  data: Uint16Array;              // Land use category codes
  metadata: GridMetadata;
}

export interface LandUseBreakdown {
  categoryCode: number;
  categoryName: string;
  cellCount: number;
  areaHectares: number;
  percentOfSubcatchment: number;
  imperviousFraction: number;
}

export interface SubcatchmentLandUse {
  subcatchmentId: string;
  totalAreaHectares: number;
  fractionImpervious: number;
  breakdown: LandUseBreakdown[];
}

export interface LandUseOverlayInput {
  subcatchments: GeoJSONFeatureCollection<GeoJSON.Polygon, SubcatchmentProperties>;
  landUseRaster: LandUseRaster;
  lookupTable: LandUseCategory[];
}

export interface LandUseOverlayOutput {
  /** Impervious fraction for each subcatchment (0-1) */
  fractionImpervious: number[];

  /** Detailed breakdown by category for each subcatchment */
  breakdownBySubcatchment: SubcatchmentLandUse[];

  /** Summary statistics */
  summary: {
    totalAreaHectares: number;
    overallImperviousFraction: number;
    dominantLandUse: string;
  };
}

export interface ILandUseOverlay {
  /**
   * Calculate impervious fractions and land use breakdown
   */
  analyze(input: LandUseOverlayInput): Promise<LandUseOverlayOutput>;

  /**
   * Get default Australian land use categories
   */
  getDefaultCategories(): AustralianLandUseCategories;

  /**
   * Perform zonal statistics for a single polygon
   */
  zonalStatistics(
    polygon: GeoJSON.Polygon,
    raster: LandUseRaster,
    categories: LandUseCategory[]
  ): LandUseBreakdown[];
}

// ============================================================================
// 5. Flow Path Analysis
// ============================================================================

export interface ElevationProfile {
  /** Distance along path from start (m) */
  distances: number[];
  /** Elevation at each point (m) */
  elevations: number[];
  /** Coordinates along path */
  coordinates: Coordinate[];
}

export interface FlowPathProperties {
  subcatchmentId: string;
  lengthMeters: number;
  lengthKm: number;
  averageSlopePercent: number;
  slope10_85Percent: number;      // Slope between 10% and 85% of path
  startElevation: number;
  endElevation: number;
  elevationDrop: number;
}

export interface FlowPathAnalysisInput {
  flowDirection: FlowDirectionGrid;
  flowAccumulation: FlowAccumulationGrid;
  dem: DEMGrid;
  subcatchments: GeoJSONFeatureCollection<GeoJSON.Polygon, SubcatchmentProperties>;
}

export interface FlowPathAnalysisOutput {
  /** Longest flow paths as LineStrings */
  longestPaths: GeoJSONFeatureCollection<GeoJSON.LineString, FlowPathProperties>;

  /** Path lengths in meters (same order as subcatchments) */
  lengths: number[];

  /** Average slopes in percent (same order as subcatchments) */
  slopes: number[];

  /** 10-85 slopes in percent */
  slopes10_85: number[];

  /** Elevation profiles for each path */
  elevationProfiles: ElevationProfile[];
}

export interface IFlowPathAnalysis {
  /**
   * Analyze flow paths for all subcatchments
   */
  analyze(input: FlowPathAnalysisInput): Promise<FlowPathAnalysisOutput>;

  /**
   * Find longest flow path within a subcatchment
   */
  findLongestFlowPath(
    flowDirection: FlowDirectionGrid,
    flowAccumulation: FlowAccumulationGrid,
    subcatchment: GeoJSON.Polygon,
    outlet: Coordinate
  ): Coordinate[];

  /**
   * Extract elevation profile along a path
   */
  extractElevationProfile(
    dem: DEMGrid,
    path: Coordinate[]
  ): ElevationProfile;

  /**
   * Calculate 10-85 slope (slope between 10% and 85% points along path)
   */
  calculateSlope10_85(profile: ElevationProfile): number;
}

// ============================================================================
// 6. Lag Calculator
// ============================================================================

export type TcMethod = 'bransby-williams' | 'ilsax' | 'arr-rffe';

export interface TcParameters {
  lengthKm: number;               // Flow path length in km
  areaKm2: number;                // Catchment area in km²
  slopePercent: number;           // Slope in percent
  slope10_85Percent?: number;     // 10-85 slope for some methods
  fractionImpervious: number;     // Impervious fraction (0-1)
  mainChannelLength?: number;     // For ARR methods
  equalAreaSlope?: number;        // For ARR methods
}

export interface TcResult {
  subcatchmentId: string;
  method: TcMethod;
  tcMinutes: number;              // Time of concentration
  lagMinutes: number;             // Lag time (typically 0.6 * Tc)
  parameters: TcParameters;       // Input parameters used
}

export interface LagCalculatorInput {
  flowPaths: GeoJSONFeatureCollection<GeoJSON.LineString, FlowPathProperties>;
  subcatchments: GeoJSONFeatureCollection<GeoJSON.Polygon, SubcatchmentProperties>;
  fractionImpervious: number[];
  method: TcMethod;
  lagFactor?: number;             // Default: 0.6 for lag = lagFactor * Tc
}

export interface LagCalculatorOutput {
  /** Time of concentration for each subcatchment (minutes) */
  tc: number[];

  /** Lag time for each subcatchment (minutes) */
  lag: number[];

  /** Detailed results for each subcatchment */
  results: TcResult[];

  /** Method used */
  method: TcMethod;
}

export interface ILagCalculator {
  /**
   * Calculate Tc and lag for all subcatchments
   */
  calculate(input: LagCalculatorInput): LagCalculatorOutput;

  /**
   * Calculate Tc using Bransby-Williams method
   * Tc = 0.057 * L / (A^0.1 * S^0.2)
   */
  bransbyWilliams(params: TcParameters): number;

  /**
   * Calculate Tc using ILSAX method
   * Tc = 0.147 * (L / S^0.5)^0.75 * (1 + FI)
   */
  ilsax(params: TcParameters): number;

  /**
   * Calculate Tc using ARR RFFE friendship method
   */
  arrRffe(params: TcParameters): number;
}

// ============================================================================
// Validation & Error Handling
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: HydrologyErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export enum HydrologyErrorCode {
  // DEM Errors
  INVALID_GEOTIFF = 'INVALID_GEOTIFF',
  UNSUPPORTED_CRS = 'UNSUPPORTED_CRS',
  MISSING_NODATA = 'MISSING_NODATA',

  // Pour Point Errors
  POUR_POINT_OUT_OF_BOUNDS = 'POUR_POINT_OUT_OF_BOUNDS',
  POUR_POINT_ON_NODATA = 'POUR_POINT_ON_NODATA',
  POUR_POINT_FLAT_AREA = 'POUR_POINT_FLAT_AREA',
  POUR_POINT_NO_UPSTREAM = 'POUR_POINT_NO_UPSTREAM',

  // Processing Errors
  DELINEATION_FAILED = 'DELINEATION_FAILED',
  FLOW_PATH_NOT_FOUND = 'FLOW_PATH_NOT_FOUND',
  RASTER_MISMATCH = 'RASTER_MISMATCH',

  // Land Use Errors
  UNKNOWN_LAND_USE_CODE = 'UNKNOWN_LAND_USE_CODE',
  NO_VALID_CELLS = 'NO_VALID_CELLS',
}

export class HydrologyError extends Error {
  constructor(
    public code: HydrologyErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HydrologyError';
  }
}

// ============================================================================
// Service Factory Interface
// ============================================================================

export interface IHydrologyServices {
  demIngestion: IDEMIngestion;
  terrainAnalysis: ITerrainAnalysis;
  catchmentDelineation: ICatchmentDelineation;
  landUseOverlay: ILandUseOverlay;
  flowPathAnalysis: IFlowPathAnalysis;
  lagCalculator: ILagCalculator;
}
