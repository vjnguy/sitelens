/**
 * Planning API Client
 *
 * Client for the Siteora backend planning API.
 * Provides access to zoning, development controls, overlays, and property analysis.
 */

// API base URL - uses environment variable or defaults to localhost
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ============================================================================
// TYPES
// ============================================================================

export type AustralianState = 'NSW' | 'QLD' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';

export type ZoneCategory =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'rural'
  | 'environmental'
  | 'recreation'
  | 'special_purpose'
  | 'mixed_use'
  | 'infrastructure'
  | 'waterway';

export type HazardType =
  | 'flood'
  | 'bushfire'
  | 'coastal_erosion'
  | 'landslide'
  | 'storm_tide'
  | 'acid_sulfate'
  | 'mine_subsidence'
  | 'contamination';

export type HazardLevel = 'low' | 'medium' | 'high' | 'extreme';

export type HeritageType = 'state' | 'local' | 'national' | 'aboriginal' | 'world';

export type ControlType =
  | 'height'
  | 'fsr'
  | 'lot_size'
  | 'setback_front'
  | 'setback_side'
  | 'setback_rear'
  | 'site_coverage'
  | 'landscaping'
  | 'car_parking'
  | 'dwelling_density';

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ZoningInfo {
  zone_code: string;
  zone_name: string;
  zone_category: ZoneCategory;
  description?: string;
  permitted_uses: string[];
  prohibited_uses: string[];
  objectives: string[];
  lga_name?: string;
  source?: string;
}

export interface DevelopmentControl {
  control_type: ControlType;
  name: string;
  min_value?: number;
  max_value?: number;
  unit: string;
  conditions?: Record<string, unknown>;
  notes?: string;
}

export interface DevelopmentControlsSet {
  height_limit?: DevelopmentControl;
  fsr?: DevelopmentControl;
  lot_size?: DevelopmentControl;
  setbacks: DevelopmentControl[];
  site_coverage?: DevelopmentControl;
  landscaping?: DevelopmentControl;
  car_parking?: DevelopmentControl;
  other_controls: DevelopmentControl[];
  estimated_gfa?: number;
  estimated_storeys?: number;
  estimated_dwellings?: number;
}

export interface HazardOverlay {
  hazard_type: HazardType;
  category?: string;
  level?: HazardLevel;
  name?: string;
  description?: string;
  planning_implications: string[];
  required_assessments: string[];
  source?: string;
}

export interface EnvironmentalOverlay {
  overlay_type: string;
  category?: string;
  name?: string;
  description?: string;
  planning_implications: string[];
  required_assessments: string[];
  source?: string;
}

export interface HeritageItem {
  heritage_type: HeritageType;
  listing_name: string;
  listing_number?: string;
  significance?: string;
  description?: string;
  distance_m?: number;
  planning_implications: string[];
  source?: string;
}

export interface OverlaySummary {
  hazards: HazardOverlay[];
  environmental: EnvironmentalOverlay[];
  heritage: HeritageItem[];
  total_overlays: number;
  has_critical_hazards: boolean;
  has_heritage_constraints: boolean;
}

export interface BuildingEnvelope {
  max_height_m?: number;
  max_storeys?: number;
  max_gfa_sqm?: number;
  max_site_coverage_percent?: number;
  setback_front_m?: number;
  setback_side_m?: number;
  setback_rear_m?: number;
  buildable_area_sqm?: number;
}

export interface SubdivisionPotential {
  can_subdivide: boolean;
  min_lot_size?: number;
  potential_lots: number;
  lot_configurations: Array<{ lots: number; avg_size: number }>;
  constraints: string[];
  required_approvals: string[];
}

export interface DevelopmentScenario {
  scenario_name: string;
  scenario_type: string;
  estimated_dwellings?: number;
  estimated_gfa?: number;
  feasibility_rating: 'low' | 'medium' | 'high';
  key_requirements: string[];
  key_constraints: string[];
  estimated_approval_pathway: 'exempt' | 'complying' | 'DA';
}

export interface DevelopmentPotential {
  current_use?: string;
  building_envelope: BuildingEnvelope;
  subdivision: SubdivisionPotential;
  scenarios: DevelopmentScenario[];
  recommended_scenario?: string;
  key_opportunities: string[];
  key_constraints: string[];
}

export interface PropertyLocation {
  address: string;
  lat: number;
  lon: number;
  state: AustralianState;
  lga?: string;
  suburb?: string;
  postcode?: string;
  lot_plan?: string;
  lot_area_sqm?: number;
}

export interface PropertyAnalysis {
  location: PropertyLocation;
  zoning: ZoningInfo;
  development_controls: DevelopmentControlsSet;
  overlays: OverlaySummary;
  development_potential: DevelopmentPotential;
  analysis_date: string;
  data_sources: string[];
  confidence_score: number;
  limitations: string[];
}

export interface PropertyAnalysisBrief {
  location: { lat: number; lon: number };
  zone_code: string;
  zone_name: string;
  zone_category: ZoneCategory;
  hazard_count: number;
  has_heritage: boolean;
  max_height_m?: number;
  max_fsr?: number;
}

export interface ReportResponse {
  report_id: string;
  pdf_url?: string;
  analysis: PropertyAnalysis;
  generated_at: string;
  expires_at: string;
}

// ============================================================================
// API CLIENT
// ============================================================================

class PlanningApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'PlanningApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PlanningApiError(
        errorData.detail || `API error: ${response.status}`,
        response.status,
        errorData.detail
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof PlanningApiError) {
      throw error;
    }
    // Network error or other issue
    throw new PlanningApiError(
      'Failed to connect to planning API',
      0,
      String(error)
    );
  }
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get zoning information for a location.
 */
export async function getZoning(
  lat: number,
  lon: number,
  state: AustralianState = 'NSW'
): Promise<ZoningInfo> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    state,
  });
  return apiRequest<ZoningInfo>(`/property/zoning?${params}`);
}

/**
 * Get development controls for a location.
 */
export async function getDevelopmentControls(
  lat: number,
  lon: number,
  state: AustralianState = 'NSW',
  zoneCode?: string,
  lotArea?: number
): Promise<DevelopmentControlsSet> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    state,
  });
  if (zoneCode) params.set('zone_code', zoneCode);
  if (lotArea) params.set('lot_area', lotArea.toString());

  return apiRequest<DevelopmentControlsSet>(`/property/controls?${params}`);
}

/**
 * Get all overlays for a location.
 */
export async function getOverlays(
  lat: number,
  lon: number,
  state: AustralianState = 'NSW',
  heritageRadius: number = 100
): Promise<OverlaySummary> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    state,
    heritage_radius: heritageRadius.toString(),
  });
  return apiRequest<OverlaySummary>(`/property/overlays?${params}`);
}

/**
 * Perform a comprehensive property analysis.
 */
export async function analyzeProperty(
  lat: number,
  lon: number,
  options: {
    state?: AustralianState;
    address?: string;
    lotPlan?: string;
    includeScenarios?: boolean;
    heritageRadiusM?: number;
  } = {}
): Promise<PropertyAnalysis> {
  const body = {
    lat,
    lon,
    state: options.state || 'NSW',
    address: options.address,
    lot_plan: options.lotPlan,
    include_scenarios: options.includeScenarios ?? true,
    include_heritage_radius_m: options.heritageRadiusM ?? 100,
  };

  return apiRequest<PropertyAnalysis>('/property/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Get a quick property analysis summary.
 */
export async function getQuickAnalysis(
  lat: number,
  lon: number,
  state: AustralianState = 'NSW'
): Promise<PropertyAnalysisBrief> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    state,
  });
  return apiRequest<PropertyAnalysisBrief>(`/property/analyze/quick?${params}`);
}

/**
 * Generate a property report.
 */
export async function generateReport(
  lat: number,
  lon: number,
  state: AustralianState,
  options: {
    address?: string;
    lotPlan?: string;
    reportType?: 'full' | 'summary' | 'development';
    includeMaps?: boolean;
    includeAppendices?: boolean;
  } = {}
): Promise<ReportResponse> {
  const body = {
    lat,
    lon,
    state,
    address: options.address,
    lot_plan: options.lotPlan,
    report_type: options.reportType || 'full',
    include_maps: options.includeMaps ?? true,
    include_appendices: options.includeAppendices ?? true,
  };

  return apiRequest<ReportResponse>('/property/report', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Search for properties by address.
 */
export async function searchAddress(
  query: string,
  state?: AustralianState,
  limit: number = 10
): Promise<Array<{
  id?: string;
  address: string;
  lat: number;
  lon: number;
  type?: string;
  importance?: number;
  details: Record<string, unknown>;
}>> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });
  if (state) params.set('state', state);

  return apiRequest(`/property/search?${params}`);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get zone category display color.
 */
export function getZoneCategoryColor(category: ZoneCategory): string {
  const colors: Record<ZoneCategory, string> = {
    residential: '#3b82f6',
    commercial: '#f59e0b',
    industrial: '#6b7280',
    rural: '#22c55e',
    environmental: '#10b981',
    recreation: '#8b5cf6',
    special_purpose: '#ec4899',
    mixed_use: '#a855f7',
    infrastructure: '#64748b',
    waterway: '#06b6d4',
  };
  return colors[category] || '#6b7280';
}

/**
 * Get hazard level display color.
 */
export function getHazardLevelColor(level: HazardLevel): string {
  const colors: Record<HazardLevel, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
    extreme: '#991b1b',
  };
  return colors[level] || '#6b7280';
}

/**
 * Format area with appropriate units.
 */
export function formatArea(sqm: number): string {
  if (sqm >= 10000) {
    return `${(sqm / 10000).toFixed(2)} ha`;
  }
  return `${sqm.toLocaleString()} sqm`;
}

/**
 * Detect state from coordinates (approximate).
 */
export function detectStateFromCoordinates(
  lat: number,
  lon: number
): AustralianState {
  // Approximate bounding boxes for Australian states
  if (lat > -29 && lat < -10 && lon > 137.5 && lon < 154) return 'QLD';
  if (lat > -37.6 && lat < -28.15 && lon > 140.5 && lon < 154) return 'NSW';
  if (lat > -39.2 && lat < -34 && lon > 140.5 && lon < 150) return 'VIC';
  if (lat > -38.1 && lat < -26 && lon > 129 && lon < 141) return 'SA';
  if (lat > -35.2 && lat < -13.5 && lon > 112 && lon < 129) return 'WA';
  if (lat > -43.7 && lat < -39.5 && lon > 143.5 && lon < 149) return 'TAS';
  if (lat > -26 && lat < -10.5 && lon > 129 && lon < 138) return 'NT';
  if (lat > -35.95 && lat < -35.1 && lon > 148.7 && lon < 149.4) return 'ACT';

  // Default to NSW if can't determine
  return 'NSW';
}

// Export error class for error handling
export { PlanningApiError };
