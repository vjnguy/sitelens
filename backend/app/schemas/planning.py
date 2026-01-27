"""
Planning Data Models (Pydantic Schemas)
Comprehensive models for zoning, development controls, overlays, and property analysis.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class AustralianState(str, Enum):
    NSW = "NSW"
    QLD = "QLD"
    VIC = "VIC"
    SA = "SA"
    WA = "WA"
    TAS = "TAS"
    NT = "NT"
    ACT = "ACT"


class ZoneCategory(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    RURAL = "rural"
    ENVIRONMENTAL = "environmental"
    RECREATION = "recreation"
    SPECIAL_PURPOSE = "special_purpose"
    MIXED_USE = "mixed_use"
    INFRASTRUCTURE = "infrastructure"
    WATERWAY = "waterway"


class HazardType(str, Enum):
    FLOOD = "flood"
    BUSHFIRE = "bushfire"
    COASTAL_EROSION = "coastal_erosion"
    LANDSLIDE = "landslide"
    STORM_TIDE = "storm_tide"
    ACID_SULFATE = "acid_sulfate"
    MINE_SUBSIDENCE = "mine_subsidence"
    CONTAMINATION = "contamination"


class HazardLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"


class HeritageType(str, Enum):
    STATE = "state"
    LOCAL = "local"
    NATIONAL = "national"
    ABORIGINAL = "aboriginal"
    WORLD = "world"


class ControlType(str, Enum):
    HEIGHT = "height"
    FSR = "fsr"  # Floor Space Ratio
    LOT_SIZE = "lot_size"
    SETBACK_FRONT = "setback_front"
    SETBACK_SIDE = "setback_side"
    SETBACK_REAR = "setback_rear"
    SITE_COVERAGE = "site_coverage"
    LANDSCAPING = "landscaping"
    CAR_PARKING = "car_parking"
    DWELLING_DENSITY = "dwelling_density"


# ============================================================================
# LOCATION MODELS
# ============================================================================

class Coordinates(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lon: float = Field(..., ge=-180, le=180, description="Longitude")


class BoundingBox(BaseModel):
    west: float
    south: float
    east: float
    north: float


class PropertyLocation(BaseModel):
    address: str
    lat: float
    lon: float
    state: AustralianState
    lga: Optional[str] = None
    suburb: Optional[str] = None
    postcode: Optional[str] = None
    lot_plan: Optional[str] = None
    lot_area_sqm: Optional[float] = None


# ============================================================================
# ZONING MODELS
# ============================================================================

class ZoningInfo(BaseModel):
    """Zoning information for a property."""
    zone_code: str = Field(..., description="Zone code (e.g., R2, B1, SP1)")
    zone_name: str = Field(..., description="Full zone name")
    zone_category: ZoneCategory
    description: Optional[str] = None
    permitted_uses: list[str] = Field(default_factory=list)
    prohibited_uses: list[str] = Field(default_factory=list)
    objectives: list[str] = Field(default_factory=list)
    lga_name: Optional[str] = None
    source: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "zone_code": "R2",
                "zone_name": "Low Density Residential",
                "zone_category": "residential",
                "description": "Zone for low density housing",
                "permitted_uses": ["Dwelling houses", "Home businesses", "Bed and breakfast"],
                "prohibited_uses": ["Industries", "Warehouse"],
                "objectives": ["To provide for low density housing"],
                "lga_name": "Brisbane City Council"
            }
        }


class ZoneSummary(BaseModel):
    """Brief zone summary for list views."""
    zone_code: str
    zone_name: str
    zone_category: ZoneCategory


# ============================================================================
# DEVELOPMENT CONTROLS MODELS
# ============================================================================

class DevelopmentControl(BaseModel):
    """Individual development control."""
    control_type: ControlType
    name: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    unit: str = Field(..., description="Unit of measurement (m, sqm, ratio, %)")
    conditions: Optional[dict] = None
    notes: Optional[str] = None


class DevelopmentControlsSet(BaseModel):
    """Complete set of development controls for a property."""
    height_limit: Optional[DevelopmentControl] = None
    fsr: Optional[DevelopmentControl] = None
    lot_size: Optional[DevelopmentControl] = None
    setbacks: list[DevelopmentControl] = Field(default_factory=list)
    site_coverage: Optional[DevelopmentControl] = None
    landscaping: Optional[DevelopmentControl] = None
    car_parking: Optional[DevelopmentControl] = None
    other_controls: list[DevelopmentControl] = Field(default_factory=list)

    # Calculated building envelope
    estimated_gfa: Optional[float] = Field(None, description="Gross Floor Area in sqm")
    estimated_storeys: Optional[int] = None
    estimated_dwellings: Optional[int] = None


# ============================================================================
# OVERLAY MODELS
# ============================================================================

class HazardOverlay(BaseModel):
    """Hazard overlay affecting a property."""
    hazard_type: HazardType
    category: Optional[str] = None
    level: Optional[HazardLevel] = None
    name: Optional[str] = None
    description: Optional[str] = None
    planning_implications: list[str] = Field(default_factory=list)
    required_assessments: list[str] = Field(default_factory=list)
    source: Optional[str] = None


class EnvironmentalOverlay(BaseModel):
    """Environmental overlay affecting a property."""
    overlay_type: str  # vegetation, biodiversity, wetland, etc.
    category: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    planning_implications: list[str] = Field(default_factory=list)
    required_assessments: list[str] = Field(default_factory=list)
    source: Optional[str] = None


class HeritageItem(BaseModel):
    """Heritage item near or affecting a property."""
    heritage_type: HeritageType
    listing_name: str
    listing_number: Optional[str] = None
    significance: Optional[str] = None
    description: Optional[str] = None
    distance_m: Optional[float] = Field(None, description="Distance from property in meters")
    planning_implications: list[str] = Field(default_factory=list)
    source: Optional[str] = None


class OverlaySummary(BaseModel):
    """Summary of all overlays affecting a property."""
    hazards: list[HazardOverlay] = Field(default_factory=list)
    environmental: list[EnvironmentalOverlay] = Field(default_factory=list)
    heritage: list[HeritageItem] = Field(default_factory=list)
    total_overlays: int = 0
    has_critical_hazards: bool = False
    has_heritage_constraints: bool = False


# ============================================================================
# DEVELOPMENT POTENTIAL MODELS
# ============================================================================

class SubdivisionPotential(BaseModel):
    """Subdivision potential analysis."""
    can_subdivide: bool
    min_lot_size: Optional[float] = None
    potential_lots: int = 0
    lot_configurations: list[dict] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    required_approvals: list[str] = Field(default_factory=list)


class BuildingEnvelope(BaseModel):
    """Building envelope calculation."""
    max_height_m: Optional[float] = None
    max_storeys: Optional[int] = None
    max_gfa_sqm: Optional[float] = None
    max_site_coverage_percent: Optional[float] = None
    setback_front_m: Optional[float] = None
    setback_side_m: Optional[float] = None
    setback_rear_m: Optional[float] = None
    buildable_area_sqm: Optional[float] = None


class DevelopmentScenario(BaseModel):
    """Potential development scenario."""
    scenario_name: str  # e.g., "Dual Occupancy", "Townhouses", "Apartment Building"
    scenario_type: str  # residential, commercial, mixed
    estimated_dwellings: Optional[int] = None
    estimated_gfa: Optional[float] = None
    feasibility_rating: str = Field(..., description="low, medium, high")
    key_requirements: list[str] = Field(default_factory=list)
    key_constraints: list[str] = Field(default_factory=list)
    estimated_approval_pathway: str = Field(..., description="exempt, complying, DA")


class DevelopmentPotential(BaseModel):
    """Complete development potential analysis."""
    current_use: Optional[str] = None
    building_envelope: BuildingEnvelope
    subdivision: SubdivisionPotential
    scenarios: list[DevelopmentScenario] = Field(default_factory=list)
    recommended_scenario: Optional[str] = None
    key_opportunities: list[str] = Field(default_factory=list)
    key_constraints: list[str] = Field(default_factory=list)


# ============================================================================
# COMPREHENSIVE PROPERTY ANALYSIS
# ============================================================================

class PropertyAnalysis(BaseModel):
    """Complete property analysis result."""
    location: PropertyLocation
    zoning: ZoningInfo
    development_controls: DevelopmentControlsSet
    overlays: OverlaySummary
    development_potential: DevelopmentPotential

    # Analysis metadata
    analysis_date: datetime = Field(default_factory=datetime.utcnow)
    data_sources: list[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.8, ge=0, le=1)
    limitations: list[str] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "location": {
                    "address": "123 Example St, Brisbane QLD 4000",
                    "lat": -27.4698,
                    "lon": 153.0251,
                    "state": "QLD",
                    "lga": "Brisbane City Council",
                    "lot_area_sqm": 600
                },
                "zoning": {
                    "zone_code": "LMR",
                    "zone_name": "Low-Medium Density Residential",
                    "zone_category": "residential"
                }
            }
        }


class PropertyAnalysisRequest(BaseModel):
    """Request for property analysis."""
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    state: Optional[AustralianState] = None
    address: Optional[str] = None
    lot_plan: Optional[str] = None
    include_scenarios: bool = True
    include_heritage_radius_m: int = Field(default=100, ge=0, le=1000)


class PropertyAnalysisBrief(BaseModel):
    """Brief property analysis for quick lookups."""
    location: Coordinates
    zone_code: str
    zone_name: str
    zone_category: ZoneCategory
    hazard_count: int = 0
    has_heritage: bool = False
    max_height_m: Optional[float] = None
    max_fsr: Optional[float] = None


# ============================================================================
# REPORT MODELS
# ============================================================================

class ReportRequest(BaseModel):
    """Request for property report generation."""
    lat: float
    lon: float
    state: AustralianState
    address: Optional[str] = None
    lot_plan: Optional[str] = None
    report_type: str = Field(default="full", description="full, summary, or development")
    include_maps: bool = True
    include_appendices: bool = True


class ReportResponse(BaseModel):
    """Response with generated report."""
    report_id: str
    pdf_url: Optional[str] = None
    analysis: PropertyAnalysis
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime


# ============================================================================
# SAVED SITES MODELS
# ============================================================================

class SavedSiteCreate(BaseModel):
    """Create a new saved site."""
    address: str
    lat: float
    lon: float
    state: AustralianState
    lot_plan: Optional[str] = None
    notes: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class SavedSite(BaseModel):
    """Saved site with analysis data."""
    id: str
    address: str
    lat: float
    lon: float
    state: AustralianState
    lot_plan: Optional[str] = None
    notes: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    property_data: Optional[PropertyAnalysisBrief] = None
    created_at: datetime
    updated_at: datetime


class SavedSiteUpdate(BaseModel):
    """Update a saved site."""
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
