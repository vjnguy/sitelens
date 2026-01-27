"""
Property Sales Service
Provides property sales data and market analysis.
"""

import httpx
from datetime import date, timedelta
from typing import Optional
import random
import math
from statistics import median, mean

from app.schemas.property_sales import (
    PropertySale,
    SalesSearchRequest,
    SalesSearchResponse,
    SalesStatistics,
    ComparableSale,
    ComparableSalesRequest,
    ComparableSalesResponse,
    PropertyType,
    SaleType,
)


class PropertySalesService:
    """
    Service for property sales data and market analysis.
    Integrates with NSW Valuer General and other data sources.
    """

    # NSW Valuer General ArcGIS service (requires token for some layers)
    NSW_VG_API = "https://portal.spatial.nsw.gov.au/server/rest/services"

    def __init__(self):
        self._api_token: Optional[str] = None

    def set_api_token(self, token: str):
        """Set the NSW Spatial Portal API token."""
        self._api_token = token

    async def search_sales(self, request: SalesSearchRequest) -> SalesSearchResponse:
        """
        Search for property sales.
        Falls back to mock data if API is unavailable.
        """
        # Try NSW Valuer General API first
        if self._api_token and request.lat and request.lon:
            try:
                results = await self._query_nsw_vg(request)
                if results:
                    return results
            except Exception as e:
                print(f"NSW VG API error: {e}")

        # Fall back to mock data
        return self._generate_mock_results(request)

    async def _query_nsw_vg(self, request: SalesSearchRequest) -> Optional[SalesSearchResponse]:
        """Query the NSW Valuer General property sales data."""
        # Would query the ArcGIS service - requires token
        return None

    def _generate_mock_results(self, request: SalesSearchRequest) -> SalesSearchResponse:
        """Generate mock sales data for development/demo."""
        sales = []

        # Generate sales around the search location
        center_lat = request.lat or -33.8688
        center_lon = request.lon or 151.2093
        radius_deg = request.radius_m / 111000

        # Base prices vary by location
        base_price = self._get_base_price(center_lat, center_lon)

        # Generate sales
        num_results = random.randint(30, 80)

        for i in range(num_results):
            # Random location within radius
            angle = random.uniform(0, 2 * math.pi)
            dist = random.uniform(0, radius_deg)
            lat = center_lat + dist * math.sin(angle)
            lon = center_lon + dist * math.cos(angle)

            # Random date in last 2 years
            days_ago = random.randint(1, 730)
            contract_date = date.today() - timedelta(days=days_ago)
            settlement_date = contract_date + timedelta(days=random.randint(30, 90))

            # Property type distribution
            prop_type = random.choices(
                [PropertyType.HOUSE, PropertyType.UNIT, PropertyType.TOWNHOUSE,
                 PropertyType.LAND, PropertyType.OTHER],
                weights=[35, 40, 15, 8, 2],
            )[0]

            # Land area based on type
            if prop_type == PropertyType.HOUSE:
                land_area = random.randint(300, 1500)
            elif prop_type == PropertyType.TOWNHOUSE:
                land_area = random.randint(150, 400)
            elif prop_type == PropertyType.UNIT:
                land_area = random.randint(50, 200)  # Strata lot
            elif prop_type == PropertyType.LAND:
                land_area = random.randint(400, 5000)
            else:
                land_area = random.randint(200, 800)

            # Price based on type, size, and location
            price_multiplier = {
                PropertyType.HOUSE: 1.0,
                PropertyType.UNIT: 0.6,
                PropertyType.TOWNHOUSE: 0.8,
                PropertyType.LAND: 0.4,
                PropertyType.OTHER: 0.7,
            }.get(prop_type, 1.0)

            # Add some randomness and size factor
            size_factor = math.log(land_area / 500 + 1) * 0.3 + 0.7
            random_factor = random.uniform(0.7, 1.3)

            price = int(base_price * price_multiplier * size_factor * random_factor)

            # Round to nearest 5000
            price = round(price / 5000) * 5000

            # Price per sqm
            price_per_sqm = price / land_area if land_area > 0 else None

            # Building details for houses/units
            bedrooms = None
            bathrooms = None
            car_spaces = None
            building_area = None

            if prop_type in [PropertyType.HOUSE, PropertyType.TOWNHOUSE]:
                bedrooms = random.randint(2, 5)
                bathrooms = random.randint(1, 3)
                car_spaces = random.randint(1, 3)
                building_area = random.randint(120, 350)
            elif prop_type == PropertyType.UNIT:
                bedrooms = random.randint(1, 3)
                bathrooms = random.randint(1, 2)
                car_spaces = random.randint(0, 2)
                building_area = random.randint(50, 150)

            suburb = self._get_suburb_name(lat, lon)

            sale = PropertySale(
                id=f"SALE-{random.randint(100000, 999999)}",
                dealing_number=f"D{random.randint(1000000, 9999999)}",
                address=self._generate_address(lat, lon),
                suburb=suburb,
                postcode=self._generate_postcode(lat, lon),
                lga_name=self._get_lga_name(lat, lon),
                lat=round(lat, 6),
                lon=round(lon, 6),
                property_type=prop_type,
                land_area_sqm=land_area,
                sale_price=price,
                contract_date=contract_date,
                settlement_date=settlement_date,
                sale_type=random.choices(
                    [SaleType.NORMAL, SaleType.AUCTION, SaleType.PRIVATE_TREATY],
                    weights=[50, 30, 20],
                )[0],
                price_per_sqm=round(price_per_sqm, 2) if price_per_sqm else None,
                bedrooms=bedrooms,
                bathrooms=bathrooms,
                car_spaces=car_spaces,
                building_area_sqm=building_area,
                source="Demo Data",
            )

            # Apply filters
            if request.property_type and sale.property_type not in request.property_type:
                continue
            if request.min_price and sale.sale_price < request.min_price:
                continue
            if request.max_price and sale.sale_price > request.max_price:
                continue
            if request.min_land_area and (sale.land_area_sqm or 0) < request.min_land_area:
                continue
            if request.max_land_area and (sale.land_area_sqm or 0) > request.max_land_area:
                continue
            if request.sold_after and sale.contract_date < request.sold_after:
                continue
            if request.sold_before and sale.contract_date > request.sold_before:
                continue

            sales.append(sale)

        # Sort
        if request.sort_by == "contract_date":
            sales.sort(key=lambda x: x.contract_date, reverse=request.sort_desc)
        elif request.sort_by == "sale_price":
            sales.sort(key=lambda x: x.sale_price, reverse=request.sort_desc)
        elif request.sort_by == "land_area_sqm":
            sales.sort(key=lambda x: x.land_area_sqm or 0, reverse=request.sort_desc)

        total = len(sales)

        # Calculate stats before pagination
        stats = self._calculate_stats(sales)

        # Apply pagination
        sales = sales[request.offset:request.offset + request.limit]

        return SalesSearchResponse(
            total=total,
            sales=sales,
            stats=stats,
        )

    def _get_base_price(self, lat: float, lon: float) -> float:
        """Get base property price for a location."""
        # Sydney - very high prices
        if -33.95 < lat < -33.75 and 151.15 < lon < 151.35:
            return 2500000  # Eastern suburbs / inner city
        elif -34.2 < lat < -33.4 and 150.5 < lon < 151.5:
            return 1500000  # Greater Sydney

        # Brisbane
        elif -27.5 < lat < -27.35 and 152.95 < lon < 153.15:
            return 1200000  # Inner Brisbane
        elif -27.8 < lat < -27.0 and 152.7 < lon < 153.4:
            return 800000  # Greater Brisbane

        return 750000  # Default

    def _calculate_stats(self, sales: list[PropertySale]) -> SalesStatistics:
        """Calculate sales statistics."""
        if not sales:
            return SalesStatistics(
                total_sales=0,
                sales_last_12_months=0,
                sales_last_3_months=0,
            )

        today = date.today()
        year_ago = today - timedelta(days=365)
        three_months_ago = today - timedelta(days=90)

        prices = [s.sale_price for s in sales]
        prices_per_sqm = [s.price_per_sqm for s in sales if s.price_per_sqm]

        # Recent sales
        last_12_months = [s for s in sales if s.contract_date >= year_ago]
        last_3_months = [s for s in sales if s.contract_date >= three_months_ago]

        # Older sales for trend
        older_sales = [s for s in sales if s.contract_date < year_ago]
        older_prices = [s.sale_price for s in older_sales] if older_sales else []

        # By property type
        by_type = {}
        for sale in sales:
            t = sale.property_type
            by_type[t] = by_type.get(t, 0) + 1

        # Monthly volumes (last 12 months)
        monthly_volumes = []
        for i in range(12):
            month_start = today.replace(day=1) - timedelta(days=30 * i)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            count = len([s for s in sales if month_start <= s.contract_date < month_end])
            monthly_volumes.append({
                "month": month_start.strftime("%Y-%m"),
                "count": count,
            })
        monthly_volumes.reverse()

        # Price change
        current_median = median(prices) if prices else None
        old_median = median(older_prices) if older_prices else None
        price_change = None
        if current_median and old_median:
            price_change = ((current_median - old_median) / old_median) * 100

        return SalesStatistics(
            total_sales=len(sales),
            sales_last_12_months=len(last_12_months),
            sales_last_3_months=len(last_3_months),
            median_price=median(prices) if prices else None,
            average_price=mean(prices) if prices else None,
            min_price=min(prices) if prices else None,
            max_price=max(prices) if prices else None,
            median_price_12_months_ago=old_median,
            price_change_percent=round(price_change, 1) if price_change else None,
            median_price_per_sqm=median(prices_per_sqm) if prices_per_sqm else None,
            average_price_per_sqm=mean(prices_per_sqm) if prices_per_sqm else None,
            by_property_type=by_type,
            monthly_volumes=monthly_volumes,
        )

    async def get_comparable_sales(
        self, request: ComparableSalesRequest
    ) -> ComparableSalesResponse:
        """Get comparable sales for valuation analysis."""
        # Search for sales
        search_req = SalesSearchRequest(
            lat=request.lat,
            lon=request.lon,
            radius_m=request.radius_m,
            property_type=[request.property_type] if request.property_type else None,
            sold_after=date.today() - timedelta(days=request.max_age_months * 30),
            limit=100,
        )

        response = await self.search_sales(search_req)

        # Score and sort by similarity
        comparables = []
        for sale in response.sales:
            score = self._calculate_similarity(request, sale)
            distance = self._calculate_distance(
                request.lat, request.lon, sale.lat or 0, sale.lon or 0
            )
            days_since = (date.today() - sale.contract_date).days

            # Time adjustment (assume 5% annual growth)
            time_factor = 1 + (days_since / 365) * 0.05
            time_adjusted = int(sale.sale_price * time_factor)

            comparable = ComparableSale(
                **sale.model_dump(),
                similarity_score=score,
                distance_m=distance,
                days_since_sale=days_since,
                time_adjusted_price=time_adjusted,
            )
            comparables.append(comparable)

        # Sort by similarity
        comparables.sort(key=lambda x: x.similarity_score, reverse=True)
        comparables = comparables[:request.limit]

        # Estimate value from comparables
        if comparables:
            adjusted_prices = [c.time_adjusted_price for c in comparables if c.time_adjusted_price]
            if adjusted_prices:
                est_mid = int(median(adjusted_prices))
                est_low = int(est_mid * 0.9)
                est_high = int(est_mid * 1.1)
                confidence = min(len(comparables) / 10, 1.0) * 0.8  # Max 80% confidence
            else:
                est_low = est_mid = est_high = None
                confidence = None
        else:
            est_low = est_mid = est_high = None
            confidence = None

        return ComparableSalesResponse(
            target_lat=request.lat,
            target_lon=request.lon,
            comparables=comparables,
            estimated_value_low=est_low,
            estimated_value_mid=est_mid,
            estimated_value_high=est_high,
            confidence=confidence,
            market_stats=response.stats,
        )

    def _calculate_similarity(
        self, request: ComparableSalesRequest, sale: PropertySale
    ) -> float:
        """Calculate similarity score between target and sale."""
        score = 1.0

        # Property type match
        if request.property_type and sale.property_type != request.property_type:
            score *= 0.7

        # Land area similarity
        if request.land_area_sqm and sale.land_area_sqm:
            size_diff = abs(request.land_area_sqm - sale.land_area_sqm)
            size_ratio = size_diff / request.land_area_sqm
            score *= max(0.5, 1 - size_ratio)

        # Distance penalty
        if sale.lat and sale.lon:
            distance = self._calculate_distance(
                request.lat, request.lon, sale.lat, sale.lon
            )
            # Reduce score for farther properties
            distance_factor = max(0.5, 1 - (distance / request.radius_m) * 0.5)
            score *= distance_factor

        # Recency bonus
        days_ago = (date.today() - sale.contract_date).days
        if days_ago < 90:
            score *= 1.1
        elif days_ago > 365:
            score *= 0.9

        return min(1.0, max(0.0, score))

    def _calculate_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Calculate distance between two points in meters."""
        R = 6371000  # Earth radius in meters

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = math.sin(delta_lat / 2) ** 2 + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * \
            math.sin(delta_lon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def _generate_address(self, lat: float, lon: float) -> str:
        """Generate a plausible address."""
        street_numbers = list(range(1, 200))
        street_names = [
            "Smith", "King", "Queen", "George", "William", "Victoria",
            "Elizabeth", "Park", "Station", "High", "Main", "Church",
            "Bridge", "Ocean", "Beach", "River", "Hill", "Valley",
        ]
        street_types = ["Street", "Road", "Avenue", "Drive", "Lane", "Place"]

        number = random.choice(street_numbers)
        name = random.choice(street_names)
        stype = random.choice(street_types)

        return f"{number} {name} {stype}"

    def _get_suburb_name(self, lat: float, lon: float) -> str:
        """Get suburb name based on location."""
        sydney_suburbs = [
            "Surry Hills", "Paddington", "Newtown", "Marrickville", "Redfern",
            "Darlinghurst", "Bondi", "Coogee", "Randwick", "Kensington",
            "Chatswood", "North Sydney", "Mosman", "Manly", "Parramatta",
            "Pyrmont", "Ultimo", "Glebe", "Balmain", "Rozelle",
        ]
        brisbane_suburbs = [
            "Fortitude Valley", "New Farm", "West End", "South Brisbane",
            "Paddington", "Milton", "Toowong", "Indooroopilly", "Bulimba",
            "Teneriffe", "Newstead", "Ascot", "Hamilton", "Clayfield",
        ]

        if -34.2 < lat < -33.4:
            return random.choice(sydney_suburbs)
        elif -27.8 < lat < -27.0:
            return random.choice(brisbane_suburbs)
        return "Suburb"

    def _generate_postcode(self, lat: float, lon: float) -> str:
        """Generate postcode based on location."""
        if -34.2 < lat < -33.4:
            return str(random.randint(2000, 2250))
        elif -27.8 < lat < -27.0:
            return str(random.randint(4000, 4170))
        return "2000"

    def _get_lga_name(self, lat: float, lon: float) -> str:
        """Get LGA name based on location."""
        sydney_lgas = [
            "City of Sydney", "Inner West", "Randwick", "Waverley",
            "Woollahra", "North Sydney", "Willoughby", "Parramatta",
        ]
        brisbane_lgas = [
            "Brisbane City", "Moreton Bay", "Logan", "Redland",
        ]

        if -34.2 < lat < -33.4:
            return random.choice(sydney_lgas)
        elif -27.8 < lat < -27.0:
            return random.choice(brisbane_lgas)
        return "Local Government Area"


# Singleton instance
property_sales_service = PropertySalesService()
