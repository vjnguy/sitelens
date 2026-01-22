"""
Data.gov.au API Connector
Provides access to Australian government open data including cadastral boundaries,
zoning information, and environmental data.
"""

import httpx
from typing import Optional, Any
from datetime import datetime, timedelta
import json


class DataGovAuConnector:
    """Connector for Data.gov.au CKAN API and related Australian open data sources."""

    BASE_URL = "https://data.gov.au/api/3"
    NSW_SPATIAL_URL = "https://maps.six.nsw.gov.au/arcgis/rest/services"
    VIC_PLANNING_URL = "https://services.land.vic.gov.au/catalogue"

    # Known dataset IDs for common spatial data
    KNOWN_DATASETS = {
        "aus_electoral_boundaries": "9e4a5c74-0d7d-4b35-8814-1fb7c2d90c81",
        "aus_postcodes": "eb69e912-deff-40e5-9f78-ddd04d5fa6dc",
        "nsw_lga_boundaries": "6c40e68e-bce6-4e18-96f8-59dd0a62d5c0",
        "vic_planning_zones": "f52c8d13-618a-4b38-9c91-97d3b4a4c4bd",
    }

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the connector with optional API key."""
        self.api_key = api_key
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self._cache_duration = timedelta(minutes=15)

    async def _request(
        self,
        url: str,
        params: Optional[dict] = None,
        headers: Optional[dict] = None,
    ) -> dict:
        """Make an async HTTP request with caching."""
        cache_key = f"{url}:{json.dumps(params or {}, sort_keys=True)}"

        # Check cache
        if cache_key in self._cache:
            data, timestamp = self._cache[cache_key]
            if datetime.now() - timestamp < self._cache_duration:
                return data

        # Make request
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

        # Cache result
        self._cache[cache_key] = (data, datetime.now())
        return data

    async def search_datasets(
        self,
        query: str,
        rows: int = 10,
        start: int = 0,
        fq: Optional[str] = None,
    ) -> dict:
        """
        Search for datasets on data.gov.au.

        Args:
            query: Search query string
            rows: Number of results to return
            start: Starting index for pagination
            fq: Filter query (e.g., "organization:abs")

        Returns:
            Search results with dataset metadata
        """
        params = {
            "q": query,
            "rows": rows,
            "start": start,
        }
        if fq:
            params["fq"] = fq

        url = f"{self.BASE_URL}/action/package_search"
        return await self._request(url, params)

    async def get_dataset(self, dataset_id: str) -> dict:
        """
        Get detailed information about a specific dataset.

        Args:
            dataset_id: The dataset ID or name

        Returns:
            Dataset metadata and resource information
        """
        url = f"{self.BASE_URL}/action/package_show"
        return await self._request(url, {"id": dataset_id})

    async def get_resource(self, resource_id: str) -> dict:
        """
        Get information about a specific resource within a dataset.

        Args:
            resource_id: The resource ID

        Returns:
            Resource metadata
        """
        url = f"{self.BASE_URL}/action/resource_show"
        return await self._request(url, {"id": resource_id})

    async def search_spatial_datasets(
        self,
        query: str = "",
        bbox: Optional[tuple[float, float, float, float]] = None,
    ) -> dict:
        """
        Search for spatial/GIS datasets.

        Args:
            query: Search query string
            bbox: Optional bounding box (west, south, east, north)

        Returns:
            Spatial datasets matching the criteria
        """
        # Add spatial format filters
        fq = 'res_format:("GeoJSON" OR "WMS" OR "WFS" OR "SHP" OR "KML")'

        if bbox:
            # Add bbox filter if supported
            west, south, east, north = bbox
            fq += f" AND ext_bbox:[{west},{south} TO {east},{north}]"

        return await self.search_datasets(query, fq=fq)

    async def get_wms_capabilities(self, wms_url: str) -> dict:
        """
        Get WMS capabilities from a WMS endpoint.

        Args:
            wms_url: Base URL of the WMS service

        Returns:
            Parsed WMS capabilities
        """
        params = {
            "service": "WMS",
            "request": "GetCapabilities",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(wms_url, params=params)
            response.raise_for_status()
            # Would need XML parsing here - simplified return
            return {"url": wms_url, "raw": response.text[:1000]}

    async def search_nsw_spatial(
        self,
        layer: str,
        where: str = "1=1",
        geometry: Optional[dict] = None,
        out_fields: str = "*",
        return_geometry: bool = True,
    ) -> dict:
        """
        Query NSW Spatial Services ArcGIS REST API.

        Args:
            layer: Layer name (e.g., "Cadastre/Lot")
            where: SQL where clause
            geometry: Optional geometry for spatial query
            out_fields: Fields to return
            return_geometry: Whether to return geometry

        Returns:
            Query results as GeoJSON-like structure
        """
        url = f"{self.NSW_SPATIAL_URL}/{layer}/MapServer/0/query"
        params = {
            "where": where,
            "outFields": out_fields,
            "returnGeometry": str(return_geometry).lower(),
            "f": "geojson",
        }

        if geometry:
            params["geometry"] = json.dumps(geometry)
            params["geometryType"] = geometry.get("type", "esriGeometryEnvelope")
            params["spatialRel"] = "esriSpatialRelIntersects"

        return await self._request(url, params)


class PropertyDataConnector:
    """
    Generic property data connector that aggregates multiple sources.
    """

    def __init__(self):
        self.data_gov = DataGovAuConnector()

    async def search_address(
        self,
        address: str,
        state: Optional[str] = None,
    ) -> list[dict]:
        """
        Search for properties by address.

        Args:
            address: Address search string
            state: Optional state filter (NSW, VIC, QLD, etc.)

        Returns:
            List of matching properties with basic info
        """
        # Use Nominatim for geocoding (free, no API key)
        nominatim_url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address,
            "format": "json",
            "countrycodes": "au",
            "addressdetails": 1,
            "limit": 10,
        }

        if state:
            params["q"] = f"{address}, {state}, Australia"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                nominatim_url,
                params=params,
                headers={"User-Agent": "SiteLens/1.0"},
            )
            response.raise_for_status()
            results = response.json()

        return [
            {
                "id": r.get("osm_id"),
                "address": r.get("display_name"),
                "lat": float(r.get("lat", 0)),
                "lon": float(r.get("lon", 0)),
                "type": r.get("type"),
                "importance": r.get("importance"),
                "details": r.get("address", {}),
            }
            for r in results
        ]

    async def get_cadastral_boundaries(
        self,
        bbox: tuple[float, float, float, float],
        state: str = "NSW",
    ) -> dict:
        """
        Get cadastral (lot/parcel) boundaries for an area.

        Args:
            bbox: Bounding box (west, south, east, north)
            state: Australian state

        Returns:
            GeoJSON FeatureCollection of cadastral boundaries
        """
        west, south, east, north = bbox

        if state.upper() == "NSW":
            # Query NSW Spatial Services
            geometry = {
                "xmin": west,
                "ymin": south,
                "xmax": east,
                "ymax": north,
                "spatialReference": {"wkid": 4326},
            }
            return await self.data_gov.search_nsw_spatial(
                layer="Cadastre/NSW_Cadastre",
                geometry=geometry,
            )

        # Fallback to searching data.gov.au for state-specific data
        datasets = await self.data_gov.search_spatial_datasets(
            query=f"{state} cadastre lot boundary",
            bbox=bbox,
        )
        return datasets

    async def get_zoning(
        self,
        lat: float,
        lon: float,
        state: str = "NSW",
    ) -> dict:
        """
        Get zoning information for a location.

        Args:
            lat: Latitude
            lon: Longitude
            state: Australian state

        Returns:
            Zoning information including code, name, and permitted uses
        """
        # This would typically query state planning portals
        # Simplified example structure
        return {
            "location": {"lat": lat, "lon": lon},
            "state": state,
            "zoning": {
                "code": "R2",
                "name": "Low Density Residential",
                "description": "Low density residential development",
                "source": "placeholder - would query real planning portal",
            },
        }

    async def get_overlays(
        self,
        lat: float,
        lon: float,
        state: str = "NSW",
    ) -> list[dict]:
        """
        Get planning overlays for a location (flood, bushfire, heritage, etc.).

        Args:
            lat: Latitude
            lon: Longitude
            state: Australian state

        Returns:
            List of overlays affecting the location
        """
        # This would query various overlay datasets
        # Simplified example
        return [
            {
                "type": "flood",
                "code": "FP",
                "name": "Flood Planning",
                "level": "1 in 100 year",
                "source": "placeholder",
            },
        ]

    async def get_property_report(
        self,
        lat: float,
        lon: float,
        state: str = "NSW",
    ) -> dict:
        """
        Generate a comprehensive property report for a location.

        Args:
            lat: Latitude
            lon: Longitude
            state: Australian state

        Returns:
            Comprehensive property report including zoning, overlays, etc.
        """
        zoning = await self.get_zoning(lat, lon, state)
        overlays = await self.get_overlays(lat, lon, state)

        return {
            "location": {"lat": lat, "lon": lon, "state": state},
            "zoning": zoning.get("zoning"),
            "overlays": overlays,
            "generated_at": datetime.now().isoformat(),
        }
