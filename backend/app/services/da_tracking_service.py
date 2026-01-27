"""
Development Application Tracking Service
Provides DA search and tracking functionality.
"""

import httpx
from datetime import date, datetime, timedelta
from typing import Optional
import random
import math

from app.schemas.da_tracking import (
    DevelopmentApplication,
    DASearchRequest,
    DASearchResponse,
    DAStatistics,
    DAStatus,
    DevelopmentType,
    AssessmentPath,
)


class DATrackingService:
    """
    Service for tracking development applications.
    Integrates with NSW Planning Portal and council APIs.
    """

    # NSW Planning Portal API (requires subscription key)
    NSW_DA_API = "https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA"

    def __init__(self):
        self._api_key: Optional[str] = None

    def set_api_key(self, key: str):
        """Set the NSW Planning Portal API key."""
        self._api_key = key

    async def search_das(self, request: DASearchRequest) -> DASearchResponse:
        """
        Search for development applications.
        Falls back to mock data if API is unavailable.
        """
        # Try NSW Planning Portal API first
        if self._api_key and request.lat and request.lon:
            try:
                results = await self._query_nsw_portal(request)
                if results:
                    return results
            except Exception as e:
                print(f"NSW Portal API error: {e}")

        # Fall back to mock data
        return self._generate_mock_results(request)

    async def _query_nsw_portal(self, request: DASearchRequest) -> Optional[DASearchResponse]:
        """Query the NSW Planning Portal DA API."""
        if not self._api_key:
            return None

        # Build query parameters
        params = {
            "$top": request.limit,
            "$skip": request.offset,
            "$format": "json",
        }

        # Add filters
        filters = []
        if request.council_name:
            filters.append(f"CouncilName eq '{request.council_name}'")
        if request.lodged_after:
            filters.append(f"LodgementDate ge {request.lodged_after.isoformat()}")
        if request.lodged_before:
            filters.append(f"LodgementDate le {request.lodged_before.isoformat()}")

        if filters:
            params["$filter"] = " and ".join(filters)

        headers = {
            "Ocp-Apim-Subscription-Key": self._api_key,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.NSW_DA_API, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

            # Parse response
            applications = []
            for item in data.get("value", []):
                app = self._parse_nsw_da(item)
                if app:
                    applications.append(app)

            return DASearchResponse(
                total=data.get("@odata.count", len(applications)),
                applications=applications,
            )

    def _parse_nsw_da(self, data: dict) -> Optional[DevelopmentApplication]:
        """Parse NSW Planning Portal DA response."""
        try:
            return DevelopmentApplication(
                id=str(data.get("PlanningPortalApplicationNumber", "")),
                application_number=data.get("ApplicationNumber", ""),
                address=data.get("Location", {}).get("FullAddress", ""),
                suburb=data.get("Location", {}).get("Suburb", ""),
                postcode=data.get("Location", {}).get("Postcode", ""),
                lat=data.get("Location", {}).get("Y"),
                lon=data.get("Location", {}).get("X"),
                description=data.get("DevelopmentDescription", ""),
                lodgement_date=date.fromisoformat(data.get("LodgementDate", "2024-01-01")[:10]),
                status=self._map_nsw_status(data.get("ApplicationStatus", "")),
                estimated_cost=data.get("EstimatedCostOfDevelopment"),
                proposed_dwellings=data.get("NumberOfNewDwellings"),
                council_name=data.get("CouncilName", ""),
                source="NSW Planning Portal",
            )
        except Exception as e:
            print(f"Error parsing DA: {e}")
            return None

    def _map_nsw_status(self, status: str) -> DAStatus:
        """Map NSW Portal status to our enum."""
        status_map = {
            "Lodged": DAStatus.LODGED,
            "Under Assessment": DAStatus.UNDER_ASSESSMENT,
            "On Exhibition": DAStatus.ON_EXHIBITION,
            "Additional Information Requested": DAStatus.ADDITIONAL_INFO_REQUESTED,
            "Determined": DAStatus.DETERMINED,
            "Approved": DAStatus.APPROVED,
            "Refused": DAStatus.REFUSED,
            "Withdrawn": DAStatus.WITHDRAWN,
        }
        return status_map.get(status, DAStatus.LODGED)

    def _generate_mock_results(self, request: DASearchRequest) -> DASearchResponse:
        """Generate mock DA data for development/demo."""
        applications = []

        # Generate DAs around the search location
        center_lat = request.lat or -33.8688
        center_lon = request.lon or 151.2093
        radius_deg = request.radius_m / 111000  # Approximate conversion

        # Council names based on location
        councils = self._get_nearby_councils(center_lat, center_lon)

        # Generate mock applications
        num_results = random.randint(15, 40)

        for i in range(num_results):
            # Random location within radius
            angle = random.uniform(0, 2 * math.pi)
            dist = random.uniform(0, radius_deg)
            lat = center_lat + dist * math.sin(angle)
            lon = center_lon + dist * math.cos(angle)

            # Random dates
            days_ago = random.randint(1, 365)
            lodgement_date = date.today() - timedelta(days=days_ago)

            # Determine status based on age
            if days_ago < 30:
                status = random.choice([DAStatus.LODGED, DAStatus.UNDER_ASSESSMENT])
                determination_date = None
            elif days_ago < 90:
                status = random.choice([
                    DAStatus.UNDER_ASSESSMENT,
                    DAStatus.ON_EXHIBITION,
                    DAStatus.ADDITIONAL_INFO_REQUESTED,
                ])
                determination_date = None
            else:
                status = random.choice([
                    DAStatus.APPROVED,
                    DAStatus.APPROVED,
                    DAStatus.APPROVED,  # More approvals
                    DAStatus.REFUSED,
                    DAStatus.WITHDRAWN,
                ])
                determination_date = lodgement_date + timedelta(days=random.randint(30, 120))

            # Random development type
            dev_type = random.choice(list(DevelopmentType))

            # Generate description based on type
            description = self._generate_description(dev_type)

            # Estimated cost based on type
            cost_ranges = {
                DevelopmentType.RESIDENTIAL: (200000, 5000000),
                DevelopmentType.COMMERCIAL: (500000, 20000000),
                DevelopmentType.INDUSTRIAL: (1000000, 50000000),
                DevelopmentType.MIXED_USE: (2000000, 100000000),
                DevelopmentType.SUBDIVISION: (100000, 2000000),
                DevelopmentType.ALTERATIONS: (50000, 500000),
                DevelopmentType.DEMOLITION: (20000, 200000),
                DevelopmentType.CHANGE_OF_USE: (10000, 100000),
                DevelopmentType.TREE_REMOVAL: (1000, 20000),
                DevelopmentType.OTHER: (10000, 1000000),
            }
            min_cost, max_cost = cost_ranges.get(dev_type, (10000, 1000000))
            estimated_cost = random.randint(int(min_cost), int(max_cost))

            # Number of dwellings for residential
            dwellings = None
            if dev_type in [DevelopmentType.RESIDENTIAL, DevelopmentType.MIXED_USE]:
                dwellings = random.randint(1, 50)

            council = random.choice(councils)

            app = DevelopmentApplication(
                id=f"DA-{random.randint(100000, 999999)}",
                application_number=f"DA/{lodgement_date.year}/{random.randint(1, 9999):04d}",
                address=self._generate_address(lat, lon),
                suburb=self._get_suburb_name(lat, lon),
                postcode=self._generate_postcode(lat, lon),
                lat=round(lat, 6),
                lon=round(lon, 6),
                description=description,
                development_type=dev_type,
                assessment_path=AssessmentPath.DA,
                lodgement_date=lodgement_date,
                determination_date=determination_date,
                status=status,
                estimated_cost=estimated_cost,
                proposed_dwellings=dwellings,
                council_name=council,
                source="Demo Data",
                last_updated=datetime.now(),
            )

            # Apply filters
            if request.status and app.status not in request.status:
                continue
            if request.development_type and app.development_type not in request.development_type:
                continue
            if request.min_cost and (app.estimated_cost or 0) < request.min_cost:
                continue
            if request.max_cost and (app.estimated_cost or 0) > request.max_cost:
                continue
            if request.lodged_after and app.lodgement_date < request.lodged_after:
                continue
            if request.lodged_before and app.lodgement_date > request.lodged_before:
                continue

            applications.append(app)

        # Sort by lodgement date (most recent first)
        applications.sort(key=lambda x: x.lodgement_date, reverse=True)

        # Apply pagination
        total = len(applications)
        applications = applications[request.offset:request.offset + request.limit]

        # Calculate stats
        stats = self._calculate_stats(applications)

        return DASearchResponse(
            total=total,
            applications=applications,
            stats=stats,
        )

    def _get_nearby_councils(self, lat: float, lon: float) -> list[str]:
        """Get council names near a location."""
        # Sydney area
        if -34.2 < lat < -33.4 and 150.5 < lon < 151.5:
            return [
                "City of Sydney",
                "Inner West Council",
                "Randwick City Council",
                "Waverley Council",
                "Woollahra Municipal Council",
                "North Sydney Council",
                "Willoughby City Council",
                "City of Parramatta",
                "Canterbury-Bankstown Council",
            ]
        # Brisbane area
        elif -27.8 < lat < -27.0 and 152.7 < lon < 153.4:
            return [
                "Brisbane City Council",
                "Moreton Bay Regional Council",
                "Logan City Council",
                "Redland City Council",
                "Ipswich City Council",
            ]
        # Default
        return ["Local Council"]

    def _generate_description(self, dev_type: DevelopmentType) -> str:
        """Generate a realistic DA description."""
        descriptions = {
            DevelopmentType.RESIDENTIAL: [
                "Construction of a new two-storey dwelling house",
                "Demolition of existing structures and construction of residential flat building containing 12 units",
                "Alterations and additions to existing dwelling including first floor addition",
                "Construction of attached dual occupancy",
                "Construction of new dwelling house with basement garage",
                "Multi dwelling housing development comprising 6 townhouses",
            ],
            DevelopmentType.COMMERCIAL: [
                "Fit-out of commercial premises for use as a cafe",
                "Construction of a new commercial building with retail and office space",
                "Change of use from warehouse to commercial premises",
                "Construction of mixed-use development with ground floor retail",
            ],
            DevelopmentType.INDUSTRIAL: [
                "Construction of warehouse and distribution facility",
                "Industrial development comprising factory units",
                "Expansion of existing manufacturing facility",
            ],
            DevelopmentType.MIXED_USE: [
                "Mixed use development comprising ground floor retail and 24 residential units above",
                "Construction of mixed-use building with commercial podium and residential tower",
                "Adaptive reuse of heritage building for mixed commercial and residential",
            ],
            DevelopmentType.SUBDIVISION: [
                "Torrens title subdivision creating 3 lots",
                "Strata subdivision of existing building",
                "Community title subdivision",
            ],
            DevelopmentType.ALTERATIONS: [
                "Internal alterations to existing dwelling",
                "Alterations and additions including new deck",
                "Extension to rear of dwelling",
            ],
            DevelopmentType.DEMOLITION: [
                "Demolition of existing structures",
                "Partial demolition of existing building",
            ],
            DevelopmentType.CHANGE_OF_USE: [
                "Change of use from retail to food and drink premises",
                "Change of use from residential to home business",
            ],
            DevelopmentType.TREE_REMOVAL: [
                "Removal of 2 trees",
                "Pruning and removal of regulated trees",
            ],
            DevelopmentType.OTHER: [
                "Installation of telecommunications facility",
                "Construction of swimming pool and associated landscaping",
                "Signage application",
            ],
        }
        return random.choice(descriptions.get(dev_type, ["Development application"]))

    def _generate_address(self, lat: float, lon: float) -> str:
        """Generate a plausible address."""
        street_numbers = list(range(1, 200))
        street_names = [
            "Smith", "King", "Queen", "George", "William", "Victoria",
            "Elizabeth", "Park", "Station", "High", "Main", "Church",
            "Bridge", "Ocean", "Beach", "River", "Hill", "Valley",
        ]
        street_types = ["Street", "Road", "Avenue", "Drive", "Lane", "Place", "Parade"]

        number = random.choice(street_numbers)
        name = random.choice(street_names)
        stype = random.choice(street_types)

        return f"{number} {name} {stype}"

    def _get_suburb_name(self, lat: float, lon: float) -> str:
        """Get a suburb name based on approximate location."""
        # Sydney suburbs
        sydney_suburbs = [
            "Surry Hills", "Paddington", "Newtown", "Marrickville", "Redfern",
            "Darlinghurst", "Potts Point", "Bondi", "Coogee", "Randwick",
            "Chatswood", "North Sydney", "Mosman", "Manly", "Parramatta",
        ]
        # Brisbane suburbs
        brisbane_suburbs = [
            "Fortitude Valley", "New Farm", "West End", "South Brisbane",
            "Paddington", "Milton", "Toowong", "Indooroopilly", "Bulimba",
        ]

        if -34.2 < lat < -33.4:
            return random.choice(sydney_suburbs)
        elif -27.8 < lat < -27.0:
            return random.choice(brisbane_suburbs)
        return "Suburb"

    def _generate_postcode(self, lat: float, lon: float) -> str:
        """Generate a postcode based on location."""
        if -34.2 < lat < -33.4:  # Sydney
            return str(random.randint(2000, 2200))
        elif -27.8 < lat < -27.0:  # Brisbane
            return str(random.randint(4000, 4200))
        return "2000"

    def _calculate_stats(self, applications: list[DevelopmentApplication]) -> dict:
        """Calculate statistics from applications."""
        if not applications:
            return {}

        by_status = {}
        by_type = {}
        total_cost = 0
        total_dwellings = 0
        lodged_30 = 0
        determined_30 = 0
        approved = 0
        total_determined = 0

        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        for app in applications:
            # By status
            by_status[app.status] = by_status.get(app.status, 0) + 1

            # By type
            by_type[app.development_type] = by_type.get(app.development_type, 0) + 1

            # Cost
            if app.estimated_cost:
                total_cost += app.estimated_cost

            # Dwellings
            if app.proposed_dwellings:
                total_dwellings += app.proposed_dwellings

            # Recent activity
            if app.lodgement_date >= thirty_days_ago:
                lodged_30 += 1
            if app.determination_date and app.determination_date >= thirty_days_ago:
                determined_30 += 1

            # Approval rate
            if app.status in [DAStatus.APPROVED, DAStatus.REFUSED]:
                total_determined += 1
                if app.status == DAStatus.APPROVED:
                    approved += 1

        return {
            "by_status": by_status,
            "by_type": by_type,
            "total_estimated_value": total_cost,
            "total_proposed_dwellings": total_dwellings,
            "lodged_last_30_days": lodged_30,
            "determined_last_30_days": determined_30,
            "approval_rate": approved / total_determined if total_determined > 0 else None,
        }

    async def get_da_statistics(
        self, lat: float, lon: float, radius_m: int = 1000
    ) -> DAStatistics:
        """Get DA statistics for an area."""
        request = DASearchRequest(lat=lat, lon=lon, radius_m=radius_m, limit=200)
        response = await self.search_das(request)

        stats = response.stats or {}

        return DAStatistics(
            total_applications=response.total,
            by_status=stats.get("by_status", {}),
            by_type=stats.get("by_type", {}),
            lodged_last_30_days=stats.get("lodged_last_30_days", 0),
            determined_last_30_days=stats.get("determined_last_30_days", 0),
            approval_rate=stats.get("approval_rate"),
            total_estimated_value=stats.get("total_estimated_value"),
            total_proposed_dwellings=stats.get("total_proposed_dwellings"),
        )


# Singleton instance
da_tracking_service = DATrackingService()
