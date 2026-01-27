"""
Property Sales API Endpoints
"""

from fastapi import APIRouter, Query
from typing import Optional
from datetime import date

from app.schemas.property_sales import (
    SalesSearchRequest,
    SalesSearchResponse,
    SalesStatistics,
    ComparableSalesRequest,
    ComparableSalesResponse,
    PropertyType,
)
from app.services.property_sales_service import property_sales_service

router = APIRouter(prefix="/sales", tags=["Property Sales"])


@router.get("/search", response_model=SalesSearchResponse)
async def search_property_sales(
    lat: Optional[float] = Query(None, description="Latitude for radius search"),
    lon: Optional[float] = Query(None, description="Longitude for radius search"),
    radius_m: int = Query(1000, ge=100, le=5000, description="Search radius in meters"),
    suburb: Optional[str] = Query(None, description="Suburb filter"),
    postcode: Optional[str] = Query(None, description="Postcode filter"),
    lga_name: Optional[str] = Query(None, description="LGA filter"),
    property_type: Optional[list[PropertyType]] = Query(None, description="Property type filter"),
    min_price: Optional[float] = Query(None, description="Minimum sale price"),
    max_price: Optional[float] = Query(None, description="Maximum sale price"),
    min_land_area: Optional[float] = Query(None, description="Minimum land area (sqm)"),
    max_land_area: Optional[float] = Query(None, description="Maximum land area (sqm)"),
    sold_after: Optional[date] = Query(None, description="Sold after date"),
    sold_before: Optional[date] = Query(None, description="Sold before date"),
    sort_by: str = Query("contract_date", description="Sort field"),
    sort_desc: bool = Query(True, description="Sort descending"),
    limit: int = Query(50, ge=1, le=200, description="Results limit"),
    offset: int = Query(0, ge=0, description="Results offset"),
):
    """
    Search for property sales.

    Supports location-based search with radius, as well as filtering by
    property type, price range, size, and dates.

    Returns matching sales with market statistics.
    """
    request = SalesSearchRequest(
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        suburb=suburb,
        postcode=postcode,
        lga_name=lga_name,
        property_type=property_type,
        min_price=min_price,
        max_price=max_price,
        min_land_area=min_land_area,
        max_land_area=max_land_area,
        sold_after=sold_after,
        sold_before=sold_before,
        sort_by=sort_by,
        sort_desc=sort_desc,
        limit=limit,
        offset=offset,
    )

    return await property_sales_service.search_sales(request)


@router.get("/comparables", response_model=ComparableSalesResponse)
async def get_comparable_sales(
    lat: float = Query(..., description="Target property latitude"),
    lon: float = Query(..., description="Target property longitude"),
    land_area_sqm: Optional[float] = Query(None, description="Target land area"),
    property_type: Optional[PropertyType] = Query(None, description="Target property type"),
    radius_m: int = Query(1000, ge=100, le=5000, description="Search radius"),
    max_age_months: int = Query(12, ge=1, le=36, description="Max sale age in months"),
    limit: int = Query(10, ge=1, le=50, description="Number of comparables"),
):
    """
    Get comparable sales for valuation analysis.

    Finds similar properties that have sold recently near the target location.
    Returns similarity-scored comparables with an estimated value range.
    """
    request = ComparableSalesRequest(
        lat=lat,
        lon=lon,
        land_area_sqm=land_area_sqm,
        property_type=property_type,
        radius_m=radius_m,
        max_age_months=max_age_months,
        limit=limit,
    )

    return await property_sales_service.get_comparable_sales(request)


@router.get("/nearby", response_model=SalesSearchResponse)
async def get_nearby_sales(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_m: int = Query(500, ge=100, le=2000, description="Search radius"),
    months: int = Query(12, ge=1, le=36, description="Sales within last N months"),
    limit: int = Query(20, ge=1, le=50, description="Results limit"),
):
    """
    Get recent property sales near a location.

    Quick endpoint for showing recent sales on a map.
    """
    sold_after = date.today().replace(day=1)
    for _ in range(months):
        sold_after = (sold_after - date.resolution).replace(day=1)

    request = SalesSearchRequest(
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        sold_after=sold_after,
        sort_by="contract_date",
        sort_desc=True,
        limit=limit,
    )

    return await property_sales_service.search_sales(request)


@router.get("/statistics", response_model=SalesStatistics)
async def get_sales_statistics(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_m: int = Query(1000, ge=100, le=5000, description="Search radius"),
    property_type: Optional[PropertyType] = Query(None, description="Property type filter"),
):
    """
    Get property sales statistics for an area.

    Returns median/average prices, price trends, and volume statistics.
    """
    request = SalesSearchRequest(
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        property_type=[property_type] if property_type else None,
        limit=200,
    )

    response = await property_sales_service.search_sales(request)
    return response.stats
