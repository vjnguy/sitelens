"""
Property Data API Endpoints
Provides endpoints for searching and retrieving property/cadastral data.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from app.connectors.data_gov_au import PropertyDataConnector, DataGovAuConnector

router = APIRouter(prefix="/property", tags=["property"])

# Initialize connectors
property_connector = PropertyDataConnector()
data_gov_connector = DataGovAuConnector()


class AddressSearchResult(BaseModel):
    id: Optional[str]
    address: str
    lat: float
    lon: float
    type: Optional[str]
    importance: Optional[float]
    details: dict = {}


class ZoningInfo(BaseModel):
    code: str
    name: str
    description: Optional[str]
    source: Optional[str]


class OverlayInfo(BaseModel):
    type: str
    code: str
    name: str
    level: Optional[str]
    source: Optional[str]


class PropertyReport(BaseModel):
    location: dict
    zoning: Optional[ZoningInfo]
    overlays: list[OverlayInfo]
    generated_at: str


@router.get("/search")
async def search_address(
    q: str = Query(..., description="Address search query"),
    state: Optional[str] = Query(None, description="Filter by state (NSW, VIC, QLD, etc.)"),
    limit: int = Query(10, ge=1, le=50),
) -> list[AddressSearchResult]:
    """
    Search for properties by address using geocoding.

    Returns a list of matching addresses with coordinates.
    """
    try:
        results = await property_connector.search_address(q, state)
        return [AddressSearchResult(**r) for r in results[:limit]]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/zoning")
async def get_zoning(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    state: str = Query("NSW", description="Australian state"),
) -> dict:
    """
    Get zoning information for a specific location.

    Returns the applicable zoning code, name, and description.
    """
    try:
        result = await property_connector.get_zoning(lat, lon, state)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overlays")
async def get_overlays(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    state: str = Query("NSW", description="Australian state"),
) -> list[OverlayInfo]:
    """
    Get planning overlays for a location (flood, bushfire, heritage, etc.).

    Returns a list of overlays affecting the location.
    """
    try:
        results = await property_connector.get_overlays(lat, lon, state)
        return [OverlayInfo(**r) for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report")
async def get_property_report(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    state: str = Query("NSW", description="Australian state"),
) -> PropertyReport:
    """
    Generate a comprehensive property report for a location.

    Includes zoning, overlays, and other relevant planning information.
    """
    try:
        report = await property_connector.get_property_report(lat, lon, state)
        return PropertyReport(**report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
