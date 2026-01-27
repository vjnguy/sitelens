"""
Property Data API Endpoints
Comprehensive endpoints for property search, zoning, overlays, and development analysis.
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Optional
from datetime import datetime, timedelta
import uuid

from app.schemas.planning import (
    AustralianState,
    ZoningInfo,
    DevelopmentControlsSet,
    OverlaySummary,
    PropertyAnalysis,
    PropertyAnalysisBrief,
    PropertyAnalysisRequest,
    ReportRequest,
    ReportResponse,
    SavedSite,
    SavedSiteCreate,
    SavedSiteUpdate,
)
from app.services.planning_service import planning_service
from app.connectors.data_gov_au import PropertyDataConnector, DataGovAuConnector

router = APIRouter(prefix="/property", tags=["property"])

# Initialize connectors
property_connector = PropertyDataConnector()
data_gov_connector = DataGovAuConnector()


# ============================================================================
# ADDRESS SEARCH
# ============================================================================

@router.get("/search")
async def search_address(
    q: str = Query(..., description="Address search query"),
    state: Optional[str] = Query(None, description="Filter by state (NSW, VIC, QLD, etc.)"),
    limit: int = Query(10, ge=1, le=50),
) -> list[dict]:
    """
    Search for properties by address using geocoding.
    Returns a list of matching addresses with coordinates.
    """
    try:
        results = await property_connector.search_address(q, state)
        return results[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ZONING
# ============================================================================

@router.get("/zoning")
async def get_zoning(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    state: str = Query("NSW", description="Australian state"),
) -> ZoningInfo:
    """
    Get zoning information for a specific location.
    Returns the applicable zoning code, name, permitted uses, and objectives.
    """
    try:
        state_enum = AustralianState(state.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid state: {state}")

    try:
        result = await planning_service.get_zoning(lat, lon, state_enum)
        if not result:
            raise HTTPException(status_code=404, detail="Zoning data not found for this location")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DEVELOPMENT CONTROLS
# ============================================================================

@router.get("/controls")
async def get_development_controls(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    state: str = Query("NSW", description="Australian state"),
    zone_code: Optional[str] = Query(None, description="Zone code (auto-detected if not provided)"),
    lot_area: Optional[float] = Query(None, description="Lot area in sqm"),
) -> DevelopmentControlsSet:
    """
    Get development controls for a location.
    Includes height limits, FSR, setbacks, and other planning controls.
    """
    try:
        state_enum = AustralianState(state.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid state: {state}")

    try:
        # Get zone code if not provided
        if not zone_code:
            zoning = await planning_service.get_zoning(lat, lon, state_enum)
            zone_code = zoning.zone_code if zoning else "Unknown"

        result = await planning_service.get_development_controls(
            lat, lon, state_enum, zone_code, lot_area
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# OVERLAYS
# ============================================================================

@router.get("/overlays")
async def get_overlays(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    state: str = Query("NSW", description="Australian state"),
    heritage_radius: int = Query(100, ge=0, le=1000, description="Heritage search radius in meters"),
) -> OverlaySummary:
    """
    Get all planning overlays for a location.
    Includes hazards (flood, bushfire), environmental constraints, and heritage.
    """
    try:
        state_enum = AustralianState(state.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid state: {state}")

    try:
        result = await planning_service.get_overlays(lat, lon, state_enum, heritage_radius)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# COMPREHENSIVE ANALYSIS
# ============================================================================

@router.post("/analyze")
async def analyze_property(request: PropertyAnalysisRequest) -> PropertyAnalysis:
    """
    Perform a comprehensive property analysis.

    Returns:
    - Zoning information with permitted uses
    - Development controls (height, FSR, setbacks)
    - Hazard overlays (flood, bushfire, etc.)
    - Heritage constraints
    - Development potential scenarios
    - Building envelope calculations
    """
    try:
        state = request.state or AustralianState.NSW
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state")

    try:
        result = await planning_service.analyze_property(
            lat=request.lat,
            lon=request.lon,
            state=state,
            address=request.address,
            lot_plan=request.lot_plan,
            lot_area_sqm=None,  # Would need to query cadastre
            include_scenarios=request.include_scenarios,
            heritage_radius_m=request.include_heritage_radius_m,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze/quick")
async def quick_analyze(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    state: str = Query("NSW", description="Australian state"),
) -> PropertyAnalysisBrief:
    """
    Get a quick property analysis summary.
    Faster than full analysis, suitable for map popups and lists.
    """
    try:
        state_enum = AustralianState(state.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid state: {state}")

    try:
        result = await planning_service.get_brief_analysis(lat, lon, state_enum)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# REPORTS
# ============================================================================

@router.post("/report")
async def generate_report(
    request: ReportRequest,
    background_tasks: BackgroundTasks,
) -> ReportResponse:
    """
    Generate a comprehensive property report.
    Returns immediately with report ID, PDF is generated asynchronously.
    """
    try:
        state_enum = request.state
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state")

    # Generate report ID
    report_id = str(uuid.uuid4())

    # Get property analysis
    analysis = await planning_service.analyze_property(
        lat=request.lat,
        lon=request.lon,
        state=state_enum,
        address=request.address,
        lot_plan=request.lot_plan,
    )

    # Schedule PDF generation in background
    # background_tasks.add_task(generate_pdf_report, report_id, analysis, request)

    return ReportResponse(
        report_id=report_id,
        pdf_url=None,  # Will be updated when PDF is ready
        analysis=analysis,
        generated_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=30),
    )


@router.get("/report/{report_id}")
async def get_report(report_id: str) -> ReportResponse:
    """
    Get a previously generated report by ID.
    """
    # Would query from database
    raise HTTPException(status_code=404, detail="Report not found")


@router.get("/report/{report_id}/pdf")
async def download_report_pdf(report_id: str) -> FileResponse:
    """
    Download the PDF version of a property report.
    """
    # Would serve from Supabase storage
    raise HTTPException(status_code=404, detail="PDF not ready or not found")


# ============================================================================
# CADASTRE
# ============================================================================

@router.get("/cadastre")
async def get_cadastral_boundaries(
    west: float = Query(..., description="Western longitude"),
    south: float = Query(..., description="Southern latitude"),
    east: float = Query(..., description="Eastern longitude"),
    north: float = Query(..., description="Northern latitude"),
    state: str = Query("NSW", description="Australian state"),
):
    """
    Get cadastral (lot/parcel) boundaries for a bounding box area.
    Returns GeoJSON FeatureCollection of cadastral boundaries.
    """
    try:
        bbox = (west, south, east, north)
        result = await property_connector.get_cadastral_boundaries(bbox, state)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lot")
async def get_lot_details(
    lot: str = Query(..., description="Lot number"),
    plan: str = Query(..., description="Plan number (DP, SP, etc.)"),
    state: str = Query("NSW", description="Australian state"),
):
    """
    Get details for a specific lot/plan.
    """
    # Would query cadastre API
    return {
        "lot": lot,
        "plan": plan,
        "state": state,
        "message": "Lot details lookup not yet implemented",
    }


# ============================================================================
# SAVED SITES (requires auth)
# ============================================================================

@router.get("/saved")
async def list_saved_sites(
    # user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[SavedSite]:
    """
    List user's saved sites.
    """
    # Would query from database with RLS
    return []


@router.post("/saved")
async def save_site(
    site: SavedSiteCreate,
    # user: User = Depends(get_current_user),
) -> SavedSite:
    """
    Save a site to the user's list.
    """
    # Would insert to database
    return SavedSite(
        id=str(uuid.uuid4()),
        address=site.address,
        lat=site.lat,
        lon=site.lon,
        state=site.state,
        lot_plan=site.lot_plan,
        notes=site.notes,
        tags=site.tags,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@router.patch("/saved/{site_id}")
async def update_saved_site(
    site_id: str,
    update: SavedSiteUpdate,
    # user: User = Depends(get_current_user),
) -> SavedSite:
    """
    Update a saved site.
    """
    raise HTTPException(status_code=404, detail="Site not found")


@router.delete("/saved/{site_id}")
async def delete_saved_site(
    site_id: str,
    # user: User = Depends(get_current_user),
):
    """
    Delete a saved site.
    """
    raise HTTPException(status_code=404, detail="Site not found")


# ============================================================================
# DATA.GOV.AU DATASETS
# ============================================================================

@router.get("/datasets/search")
async def search_datasets(
    q: str = Query(..., description="Search query"),
    rows: int = Query(10, ge=1, le=100),
    spatial_only: bool = Query(False, description="Only return spatial datasets"),
):
    """
    Search for datasets on data.gov.au.
    Returns dataset metadata and resource information.
    """
    try:
        if spatial_only:
            result = await data_gov_connector.search_spatial_datasets(q)
        else:
            result = await data_gov_connector.search_datasets(q, rows=rows)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: str):
    """
    Get detailed information about a specific dataset.
    """
    try:
        result = await data_gov_connector.get_dataset(dataset_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
