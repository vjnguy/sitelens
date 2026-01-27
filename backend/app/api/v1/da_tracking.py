"""
Development Application Tracking API Endpoints
"""

from fastapi import APIRouter, Query
from typing import Optional
from datetime import date

from app.schemas.da_tracking import (
    DASearchRequest,
    DASearchResponse,
    DAStatistics,
    DAStatus,
    DevelopmentType,
)
from app.services.da_tracking_service import da_tracking_service

router = APIRouter(prefix="/da", tags=["Development Applications"])


@router.get("/search", response_model=DASearchResponse)
async def search_development_applications(
    lat: Optional[float] = Query(None, description="Latitude for radius search"),
    lon: Optional[float] = Query(None, description="Longitude for radius search"),
    radius_m: int = Query(500, ge=100, le=5000, description="Search radius in meters"),
    address: Optional[str] = Query(None, description="Address search"),
    suburb: Optional[str] = Query(None, description="Suburb filter"),
    council_name: Optional[str] = Query(None, description="Council name filter"),
    status: Optional[list[DAStatus]] = Query(None, description="Status filter"),
    development_type: Optional[list[DevelopmentType]] = Query(None, description="Type filter"),
    min_cost: Optional[float] = Query(None, description="Minimum estimated cost"),
    max_cost: Optional[float] = Query(None, description="Maximum estimated cost"),
    min_dwellings: Optional[int] = Query(None, description="Minimum proposed dwellings"),
    lodged_after: Optional[date] = Query(None, description="Lodged after date"),
    lodged_before: Optional[date] = Query(None, description="Lodged before date"),
    limit: int = Query(50, ge=1, le=200, description="Results limit"),
    offset: int = Query(0, ge=0, description="Results offset"),
):
    """
    Search for development applications.

    Supports location-based search with radius, as well as filtering by
    status, type, cost, and dates.

    Returns matching DAs with summary statistics.
    """
    request = DASearchRequest(
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        address=address,
        suburb=suburb,
        council_name=council_name,
        status=status,
        development_type=development_type,
        min_cost=min_cost,
        max_cost=max_cost,
        min_dwellings=min_dwellings,
        lodged_after=lodged_after,
        lodged_before=lodged_before,
        limit=limit,
        offset=offset,
    )

    return await da_tracking_service.search_das(request)


@router.get("/statistics", response_model=DAStatistics)
async def get_da_statistics(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_m: int = Query(1000, ge=100, le=5000, description="Search radius in meters"),
):
    """
    Get development application statistics for an area.

    Returns counts by status and type, recent activity metrics,
    approval rates, and total development value.
    """
    return await da_tracking_service.get_da_statistics(lat, lon, radius_m)


@router.get("/nearby", response_model=DASearchResponse)
async def get_nearby_das(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_m: int = Query(500, ge=100, le=2000, description="Search radius"),
    active_only: bool = Query(True, description="Only show active applications"),
    limit: int = Query(20, ge=1, le=50, description="Results limit"),
):
    """
    Get development applications near a location.

    Quick endpoint for showing DAs on a map near a property.
    By default only shows active (undetermined) applications.
    """
    status_filter = None
    if active_only:
        status_filter = [
            DAStatus.LODGED,
            DAStatus.UNDER_ASSESSMENT,
            DAStatus.ON_EXHIBITION,
            DAStatus.ADDITIONAL_INFO_REQUESTED,
            DAStatus.REFERRED,
        ]

    request = DASearchRequest(
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        status=status_filter,
        limit=limit,
    )

    return await da_tracking_service.search_das(request)
