"""
Property Sales Data Schemas
"""

from datetime import date
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class PropertyType(str, Enum):
    """Type of property."""
    HOUSE = "house"
    UNIT = "unit"
    TOWNHOUSE = "townhouse"
    VILLA = "villa"
    LAND = "land"
    RURAL = "rural"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    OTHER = "other"


class SaleType(str, Enum):
    """Type of sale transaction."""
    NORMAL = "normal"
    AUCTION = "auction"
    PRIVATE_TREATY = "private_treaty"
    EXPRESSION_OF_INTEREST = "expression_of_interest"
    MORTGAGEE = "mortgagee"
    RELATED_PARTY = "related_party"
    OTHER = "other"


class PropertySale(BaseModel):
    """A property sale record."""

    # Identifiers
    id: str = Field(..., description="Unique identifier")
    dealing_number: Optional[str] = Field(None, description="Transfer dealing number")

    # Location
    address: str = Field(..., description="Property address")
    suburb: str
    postcode: str
    lga_name: Optional[str] = Field(None, description="Local Government Area")
    lat: Optional[float] = None
    lon: Optional[float] = None

    # Property details
    lot_plan: Optional[str] = Field(None, description="Lot/Plan reference")
    property_type: PropertyType = Field(default=PropertyType.OTHER)
    land_area_sqm: Optional[float] = Field(None, description="Land area in square meters")
    zone_code: Optional[str] = Field(None, description="Zoning code")

    # Sale details
    sale_price: float = Field(..., description="Sale price in AUD")
    contract_date: date = Field(..., description="Date of contract")
    settlement_date: Optional[date] = Field(None, description="Date of settlement")
    sale_type: SaleType = Field(default=SaleType.NORMAL)

    # Calculated values
    price_per_sqm: Optional[float] = Field(None, description="Price per square meter")

    # Land value
    land_value: Optional[float] = Field(None, description="Unimproved land value")
    land_value_date: Optional[date] = None

    # Additional details (if available)
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    car_spaces: Optional[int] = None
    building_area_sqm: Optional[float] = None
    year_built: Optional[int] = None

    # Data source
    source: str = Field(default="NSW Valuer General", description="Data source")

    class Config:
        use_enum_values = True


class SalesSearchRequest(BaseModel):
    """Request to search for property sales."""

    # Location-based search
    lat: Optional[float] = Field(None, description="Latitude for radius search")
    lon: Optional[float] = Field(None, description="Longitude for radius search")
    radius_m: int = Field(default=1000, description="Search radius in meters")

    # Text search
    suburb: Optional[str] = None
    postcode: Optional[str] = None
    lga_name: Optional[str] = None

    # Property filters
    property_type: Optional[list[PropertyType]] = None
    min_land_area: Optional[float] = None
    max_land_area: Optional[float] = None
    zone_code: Optional[str] = None

    # Price filters
    min_price: Optional[float] = None
    max_price: Optional[float] = None

    # Date filters
    sold_after: Optional[date] = None
    sold_before: Optional[date] = None

    # Pagination
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)

    # Sort
    sort_by: str = Field(default="contract_date", description="Field to sort by")
    sort_desc: bool = Field(default=True, description="Sort descending")


class SalesSearchResponse(BaseModel):
    """Response containing sales search results."""

    total: int = Field(..., description="Total matching sales")
    sales: list[PropertySale]

    # Market statistics
    stats: Optional["SalesStatistics"] = None


class SalesStatistics(BaseModel):
    """Statistics about property sales in an area."""

    # Volume
    total_sales: int
    sales_last_12_months: int
    sales_last_3_months: int

    # Prices
    median_price: Optional[float] = None
    average_price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None

    # Trends
    median_price_12_months_ago: Optional[float] = None
    price_change_percent: Optional[float] = Field(None, description="12-month price change %")

    # Per sqm
    median_price_per_sqm: Optional[float] = None
    average_price_per_sqm: Optional[float] = None

    # By type
    by_property_type: Optional[dict[str, int]] = None

    # Volume trend
    monthly_volumes: Optional[list[dict]] = Field(
        None, description="Monthly sale counts [{month: str, count: int}]"
    )


class ComparableSale(PropertySale):
    """A comparable sale with similarity score."""

    similarity_score: float = Field(
        ..., ge=0, le=1, description="Similarity to target property (0-1)"
    )
    distance_m: float = Field(..., description="Distance from target in meters")
    days_since_sale: int = Field(..., description="Days since sale")

    # Adjustment factors
    time_adjusted_price: Optional[float] = Field(
        None, description="Price adjusted for time"
    )
    size_adjusted_price_per_sqm: Optional[float] = None


class ComparableSalesRequest(BaseModel):
    """Request for comparable sales analysis."""

    # Target property
    lat: float
    lon: float
    land_area_sqm: Optional[float] = None
    property_type: Optional[PropertyType] = None
    zone_code: Optional[str] = None

    # Search parameters
    radius_m: int = Field(default=1000, ge=100, le=5000)
    max_age_months: int = Field(default=12, ge=1, le=36)
    limit: int = Field(default=10, ge=1, le=50)


class ComparableSalesResponse(BaseModel):
    """Response containing comparable sales analysis."""

    target_lat: float
    target_lon: float

    comparables: list[ComparableSale]

    # Valuation estimate
    estimated_value_low: Optional[float] = None
    estimated_value_mid: Optional[float] = None
    estimated_value_high: Optional[float] = None
    confidence: Optional[float] = Field(None, ge=0, le=1)

    # Market context
    market_stats: Optional[SalesStatistics] = None
