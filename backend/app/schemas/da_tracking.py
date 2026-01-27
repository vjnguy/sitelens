"""
Development Application Tracking Schemas
"""

from datetime import date, datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class DAStatus(str, Enum):
    """Development Application status."""
    LODGED = "lodged"
    UNDER_ASSESSMENT = "under_assessment"
    ON_EXHIBITION = "on_exhibition"
    ADDITIONAL_INFO_REQUESTED = "additional_info_requested"
    REFERRED = "referred"
    DETERMINED = "determined"
    APPROVED = "approved"
    REFUSED = "refused"
    WITHDRAWN = "withdrawn"
    DEFERRED = "deferred"


class DevelopmentType(str, Enum):
    """Type of development."""
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    MIXED_USE = "mixed_use"
    SUBDIVISION = "subdivision"
    ALTERATIONS = "alterations"
    DEMOLITION = "demolition"
    CHANGE_OF_USE = "change_of_use"
    TREE_REMOVAL = "tree_removal"
    OTHER = "other"


class AssessmentPath(str, Enum):
    """Development assessment pathway."""
    EXEMPT = "exempt"
    COMPLYING = "complying"
    DA = "development_application"
    CDC = "complying_development_certificate"
    MODIFICATION = "modification"
    REVIEW = "review"
    STATE_SIGNIFICANT = "state_significant"


class DevelopmentApplication(BaseModel):
    """A development application record."""

    # Identifiers
    id: str = Field(..., description="Unique identifier")
    application_number: str = Field(..., description="Council DA number (e.g., DA/2024/1234)")

    # Location
    address: str = Field(..., description="Property address")
    suburb: Optional[str] = None
    postcode: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    lot_plan: Optional[str] = Field(None, description="Lot/Plan reference")

    # Application details
    description: str = Field(..., description="Description of proposed development")
    development_type: DevelopmentType = Field(default=DevelopmentType.OTHER)
    assessment_path: AssessmentPath = Field(default=AssessmentPath.DA)

    # Dates
    lodgement_date: date = Field(..., description="Date application was lodged")
    determination_date: Optional[date] = Field(None, description="Date of determination")
    exhibition_start: Optional[date] = None
    exhibition_end: Optional[date] = None

    # Status
    status: DAStatus = Field(default=DAStatus.LODGED)
    status_detail: Optional[str] = None

    # Costs and values
    estimated_cost: Optional[float] = Field(None, description="Estimated development cost")

    # Dwellings
    proposed_dwellings: Optional[int] = Field(None, description="Number of proposed dwellings")
    existing_dwellings: Optional[int] = Field(None, description="Number of existing dwellings")

    # Council
    council_name: str = Field(..., description="Local council name")
    council_reference_url: Optional[str] = Field(None, description="Link to council DA tracker")

    # Applicant (if public)
    applicant_name: Optional[str] = None

    # Additional metadata
    source: str = Field(default="NSW Planning Portal", description="Data source")
    last_updated: Optional[datetime] = None

    class Config:
        use_enum_values = True


class DASearchRequest(BaseModel):
    """Request to search for development applications."""

    # Location-based search
    lat: Optional[float] = Field(None, description="Latitude for radius search")
    lon: Optional[float] = Field(None, description="Longitude for radius search")
    radius_m: int = Field(default=500, description="Search radius in meters")

    # Text search
    address: Optional[str] = Field(None, description="Address search")
    suburb: Optional[str] = None
    council_name: Optional[str] = None

    # Filters
    status: Optional[list[DAStatus]] = None
    development_type: Optional[list[DevelopmentType]] = None
    min_cost: Optional[float] = None
    max_cost: Optional[float] = None
    min_dwellings: Optional[int] = None

    # Date filters
    lodged_after: Optional[date] = None
    lodged_before: Optional[date] = None
    determined_after: Optional[date] = None
    determined_before: Optional[date] = None

    # Pagination
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class DASearchResponse(BaseModel):
    """Response containing DA search results."""

    total: int = Field(..., description="Total matching applications")
    applications: list[DevelopmentApplication]

    # Statistics
    stats: Optional[dict] = Field(None, description="Summary statistics")


class DAStatistics(BaseModel):
    """Statistics about DAs in an area."""

    total_applications: int
    by_status: dict[str, int]
    by_type: dict[str, int]

    # Recent activity
    lodged_last_30_days: int
    determined_last_30_days: int

    # Approvals
    approval_rate: Optional[float] = Field(None, description="Approval rate as decimal")
    average_determination_days: Optional[float] = None

    # Value
    total_estimated_value: Optional[float] = None
    total_proposed_dwellings: Optional[int] = None
