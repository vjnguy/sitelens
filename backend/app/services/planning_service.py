"""
Planning Engine Service
Core service for querying zoning, development controls, overlays, and property analysis.
"""

import httpx
from typing import Optional
from datetime import datetime
import json

from app.schemas.planning import (
    AustralianState,
    ZoneCategory,
    ZoningInfo,
    DevelopmentControl,
    DevelopmentControlsSet,
    ControlType,
    HazardOverlay,
    HazardType,
    HazardLevel,
    EnvironmentalOverlay,
    HeritageItem,
    HeritageType,
    OverlaySummary,
    BuildingEnvelope,
    SubdivisionPotential,
    DevelopmentScenario,
    DevelopmentPotential,
    PropertyLocation,
    PropertyAnalysis,
    PropertyAnalysisBrief,
)


class PlanningService:
    """
    Core planning engine that queries zoning data, development controls,
    and overlays from government APIs and the database.
    """

    # QLD Planning API endpoints
    QLD_PLANNING_API = "https://spatial-gis.information.qld.gov.au/arcgis/rest/services"
    QLD_ZONING_LAYER = "PlanningCadastre/LandUse/MapServer/0"
    QLD_FLOOD_LAYER = "FloodCheck/FloodStudies/MapServer/0"
    QLD_MSES_LAYER = "Environment/MattersOfStateEnvironmentalSignificance/MapServer/0"
    QLD_KOALA_LAYER = "Environment/KoalaPlan/MapServer/0"

    # NSW ePlanning API endpoints
    NSW_PLANNING_API = "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services"
    NSW_ZONING_LAYER = "ePlanning/Planning_Portal_Principal_Planning/MapServer/19"
    NSW_HEIGHT_LAYER = "ePlanning/Planning_Portal_Principal_Planning/MapServer/14"
    NSW_FSR_LAYER = "ePlanning/Planning_Portal_Principal_Planning/MapServer/11"
    NSW_LOT_SIZE_LAYER = "ePlanning/Planning_Portal_Principal_Planning/MapServer/22"
    NSW_HERITAGE_LAYER = "ePlanning/Planning_Portal_Principal_Planning/MapServer/16"
    NSW_FLOOD_LAYER = "ePlanning/Planning_Portal_Hazard/MapServer/230"
    NSW_BUSHFIRE_LAYER = "ePlanning/Planning_Portal_Hazard/MapServer/229"

    # Zone category mappings
    ZONE_CATEGORY_MAP = {
        # NSW zones
        "R1": ZoneCategory.RESIDENTIAL,
        "R2": ZoneCategory.RESIDENTIAL,
        "R3": ZoneCategory.RESIDENTIAL,
        "R4": ZoneCategory.RESIDENTIAL,
        "R5": ZoneCategory.RURAL,
        "B1": ZoneCategory.COMMERCIAL,
        "B2": ZoneCategory.COMMERCIAL,
        "B3": ZoneCategory.COMMERCIAL,
        "B4": ZoneCategory.MIXED_USE,
        "B5": ZoneCategory.COMMERCIAL,
        "B6": ZoneCategory.COMMERCIAL,
        "B7": ZoneCategory.COMMERCIAL,
        "IN1": ZoneCategory.INDUSTRIAL,
        "IN2": ZoneCategory.INDUSTRIAL,
        "IN3": ZoneCategory.INDUSTRIAL,
        "IN4": ZoneCategory.INDUSTRIAL,
        "SP1": ZoneCategory.SPECIAL_PURPOSE,
        "SP2": ZoneCategory.INFRASTRUCTURE,
        "SP3": ZoneCategory.SPECIAL_PURPOSE,
        "SP5": ZoneCategory.COMMERCIAL,  # Metropolitan Centre
        "MU1": ZoneCategory.MIXED_USE,  # Mixed Use
        "RE1": ZoneCategory.RECREATION,
        "RE2": ZoneCategory.RECREATION,
        "E1": ZoneCategory.ENVIRONMENTAL,
        "E2": ZoneCategory.ENVIRONMENTAL,
        "E3": ZoneCategory.ENVIRONMENTAL,
        "E4": ZoneCategory.ENVIRONMENTAL,
        "RU1": ZoneCategory.RURAL,
        "RU2": ZoneCategory.RURAL,
        "RU3": ZoneCategory.RURAL,
        "RU4": ZoneCategory.RURAL,
        "RU5": ZoneCategory.RURAL,
        "RU6": ZoneCategory.RURAL,
        "W1": ZoneCategory.WATERWAY,
        "W2": ZoneCategory.WATERWAY,
        "W3": ZoneCategory.WATERWAY,
        # QLD zones
        "LDR": ZoneCategory.RESIDENTIAL,
        "LMR": ZoneCategory.RESIDENTIAL,
        "MDR": ZoneCategory.RESIDENTIAL,
        "HDR": ZoneCategory.RESIDENTIAL,
        "CR": ZoneCategory.RESIDENTIAL,
        "NC": ZoneCategory.COMMERCIAL,
        "DC": ZoneCategory.COMMERCIAL,
        "MC": ZoneCategory.COMMERCIAL,
        "PC": ZoneCategory.COMMERCIAL,
        "LI": ZoneCategory.INDUSTRIAL,
        "MI": ZoneCategory.INDUSTRIAL,
        "HI": ZoneCategory.INDUSTRIAL,
        "SR": ZoneCategory.RURAL,
        "RR": ZoneCategory.RURAL,
        "RL": ZoneCategory.RURAL,
        "OS": ZoneCategory.RECREATION,
        "SP": ZoneCategory.SPECIAL_PURPOSE,
        "CF": ZoneCategory.SPECIAL_PURPOSE,
        "EC": ZoneCategory.ENVIRONMENTAL,
        "EM": ZoneCategory.ENVIRONMENTAL,
    }

    def __init__(self):
        self._cache = {}
        self._cache_duration = 300  # 5 minutes

    async def _query_arcgis(
        self,
        base_url: str,
        layer: str,
        geometry: dict,
        out_fields: str = "*",
        geometry_type: str = "esriGeometryPoint",
        spatial_rel: str = "esriSpatialRelIntersects",
    ) -> list[dict]:
        """Query an ArcGIS REST service."""
        url = f"{base_url}/{layer}/query"

        params = {
            "geometry": json.dumps(geometry),
            "geometryType": geometry_type,
            "spatialRel": spatial_rel,
            "outFields": out_fields,
            "returnGeometry": "false",
            "f": "json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                if "error" in data:
                    print(f"ArcGIS error: {data['error']}")
                    return []

                return data.get("features", [])
        except Exception as e:
            print(f"Error querying ArcGIS: {e}")
            return []

    def _point_geometry(self, lon: float, lat: float) -> dict:
        """Create an ArcGIS point geometry."""
        return {
            "x": lon,
            "y": lat,
            "spatialReference": {"wkid": 4326},
        }

    def _get_zone_category(self, zone_code: str) -> ZoneCategory:
        """Get the zone category from a zone code."""
        # Extract base zone code (e.g., "R2" from "R2(a)")
        base_code = zone_code.split("(")[0].strip().upper()
        return self.ZONE_CATEGORY_MAP.get(base_code, ZoneCategory.SPECIAL_PURPOSE)

    # =========================================================================
    # ZONING QUERIES
    # =========================================================================

    async def get_zoning(
        self,
        lat: float,
        lon: float,
        state: AustralianState,
    ) -> Optional[ZoningInfo]:
        """Get zoning information for a location."""
        geometry = self._point_geometry(lon, lat)

        if state == AustralianState.QLD:
            return await self._get_qld_zoning(geometry)
        elif state == AustralianState.NSW:
            return await self._get_nsw_zoning(geometry)
        else:
            # Fallback to generic zoning lookup
            return await self._get_generic_zoning(lat, lon, state)

    async def _get_qld_zoning(self, geometry: dict) -> Optional[ZoningInfo]:
        """Get QLD zoning - queries LGA first, then uses planning scheme lookup."""
        # First get the LGA for this location
        lga_features = await self._query_arcgis(
            self.QLD_PLANNING_API,
            "PlanningCadastre/LandParcelPropertyFramework/MapServer/20",  # LGA boundaries
            geometry,
            out_fields="lga,abbrev_name,adminareaname",
        )

        lga_name = None
        if lga_features:
            attrs = lga_features[0].get("attributes", {})
            lga_name = attrs.get("lga") or attrs.get("adminareaname") or attrs.get("abbrev_name")

        # Try Brisbane City Council planning scheme service
        if lga_name and "BRISBANE" in lga_name.upper():
            bcc_features = await self._query_arcgis(
                "https://gisservices.brisbane.qld.gov.au/arcgis/rest/services",
                "OpenData/OpenData_PlanningScheme/MapServer/3",  # Zoning layer
                geometry,
                out_fields="*",
            )
            if bcc_features:
                attrs = bcc_features[0].get("attributes", {})
                zone_code = attrs.get("ZONE_CODE") or attrs.get("Zone_Code") or "Unknown"
                zone_name = attrs.get("ZONE_NAME") or attrs.get("Zone_Name") or "Unknown"
                return ZoningInfo(
                    zone_code=zone_code,
                    zone_name=zone_name,
                    zone_category=self._get_zone_category(zone_code),
                    description=None,
                    permitted_uses=self._get_qld_permitted_uses(zone_code),
                    prohibited_uses=[],
                    objectives=self._get_qld_zone_objectives(zone_code),
                    lga_name=lga_name or "Brisbane City Council",
                    source="Brisbane City Council Planning Scheme",
                )

        # Fallback: Return generic zoning based on land use classification
        land_use = await self._query_arcgis(
            self.QLD_PLANNING_API,
            self.QLD_ZONING_LAYER,
            geometry,
            out_fields="primary_,secondary,tertiary,qlump_code",
        )

        if land_use:
            attrs = land_use[0].get("attributes", {})
            primary = attrs.get("primary_") or attrs.get("PRIMARY_") or "Unknown"
            zone_code = self._land_use_to_zone(primary)

            return ZoningInfo(
                zone_code=zone_code,
                zone_name=f"{primary} (Land Use Classification)",
                zone_category=self._get_zone_category(zone_code),
                description="Zoning based on Queensland Land Use Mapping Program. Check local council planning scheme for specific zoning.",
                permitted_uses=self._get_qld_permitted_uses(zone_code),
                prohibited_uses=[],
                objectives=[],
                lga_name=lga_name,
                source="QLUMP Land Use Classification",
            )

        # Final fallback
        return ZoningInfo(
            zone_code="Unknown",
            zone_name="Zoning data not available",
            zone_category=ZoneCategory.SPECIAL_PURPOSE,
            description=f"Please check {lga_name or 'local council'} planning scheme for zoning information.",
            permitted_uses=[],
            prohibited_uses=[],
            objectives=[],
            lga_name=lga_name,
            source="Queensland Planning Framework",
        )

    def _land_use_to_zone(self, land_use: str) -> str:
        """Convert QLUMP land use to approximate zone code."""
        land_use_lower = land_use.lower() if land_use else ""
        if "residential" in land_use_lower or "urban" in land_use_lower:
            return "LMR"
        elif "commercial" in land_use_lower or "services" in land_use_lower:
            return "NC"
        elif "industrial" in land_use_lower or "manufacturing" in land_use_lower:
            return "LI"
        elif "rural" in land_use_lower or "agricultural" in land_use_lower or "grazing" in land_use_lower:
            return "RR"
        elif "conservation" in land_use_lower or "nature" in land_use_lower:
            return "EC"
        elif "water" in land_use_lower:
            return "OS"
        else:
            return "SP"

    async def _get_nsw_zoning(self, geometry: dict) -> Optional[ZoningInfo]:
        """Get NSW zoning from ePlanning Spatial Viewer."""
        features = await self._query_arcgis(
            self.NSW_PLANNING_API,
            self.NSW_ZONING_LAYER,
            geometry,
            out_fields="SYM_CODE,LAY_CLASS,LGA_NAME,EPI_NAME,PURPOSE",
        )

        if not features:
            return None

        attrs = features[0].get("attributes", {})
        zone_code = attrs.get("SYM_CODE", "Unknown")
        purpose = attrs.get("PURPOSE", "")

        return ZoningInfo(
            zone_code=zone_code,
            zone_name=attrs.get("LAY_CLASS", "Unknown"),
            zone_category=self._get_zone_category(zone_code),
            description=purpose if purpose else None,
            permitted_uses=self._get_nsw_permitted_uses(zone_code),
            prohibited_uses=[],
            objectives=self._get_nsw_zone_objectives(zone_code),
            lga_name=attrs.get("LGA_NAME"),
            source=f"NSW ePlanning - {attrs.get('EPI_NAME', 'LEP')}",
        )

    async def _get_generic_zoning(
        self, lat: float, lon: float, state: AustralianState
    ) -> Optional[ZoningInfo]:
        """Fallback zoning lookup for other states."""
        # This would query a generic planning database
        return ZoningInfo(
            zone_code="Unknown",
            zone_name="Zoning data not available",
            zone_category=ZoneCategory.SPECIAL_PURPOSE,
            description="Zoning data for this state is not yet available. Please check local council planning portal.",
            permitted_uses=[],
            prohibited_uses=[],
            objectives=[],
            lga_name=None,
            source=f"{state.value} Planning Portal",
        )

    def _get_qld_permitted_uses(self, zone_code: str) -> list[str]:
        """Get permitted uses for QLD zones."""
        uses = {
            "LDR": ["Dwelling house", "Home-based business", "Community residence"],
            "LMR": ["Dwelling house", "Dual occupancy", "Multiple dwelling", "Rooming accommodation"],
            "MDR": ["Multiple dwelling", "Short-term accommodation", "Residential care facility"],
            "HDR": ["Multiple dwelling", "Hotel", "Short-term accommodation"],
            "NC": ["Shop", "Office", "Food and drink outlet", "Health care service"],
            "DC": ["Shop", "Office", "Indoor sport and recreation", "Hotel"],
            "LI": ["Low impact industry", "Warehouse", "Service industry"],
            "MI": ["Medium impact industry", "Warehouse", "Research and technology"],
            "OS": ["Park", "Sport and recreation"],
        }
        return uses.get(zone_code.upper(), ["Contact council for permitted uses"])

    def _get_qld_zone_objectives(self, zone_code: str) -> list[str]:
        """Get zone objectives for QLD zones."""
        objectives = {
            "LDR": [
                "Provide for dwelling houses and community uses",
                "Maintain the low density residential character",
                "Ensure development is compatible with surrounding uses",
            ],
            "LMR": [
                "Provide for a range of dwelling types",
                "Support increased housing choice and affordability",
                "Ensure development contributes positively to streetscape",
            ],
        }
        return objectives.get(zone_code.upper(), [])

    def _get_nsw_permitted_uses(self, zone_code: str) -> list[str]:
        """Get permitted uses for NSW zones."""
        uses = {
            "R1": ["Dwelling houses", "Boarding houses", "Child care centres"],
            "R2": ["Dwelling houses", "Dual occupancies", "Group homes"],
            "R3": ["Attached dwellings", "Boarding houses", "Multi dwelling housing"],
            "R4": ["Residential flat buildings", "Shop top housing", "Hostels"],
            "B1": ["Commercial premises", "Child care centres", "Medical centres"],
            "B2": ["Commercial premises", "Retail premises", "Tourist facilities"],
            "B4": ["Shop top housing", "Commercial premises", "Residential flat buildings"],
            "IN1": ["General industries", "Warehouses", "Freight transport facilities"],
            "IN2": ["Light industries", "Warehouses", "Hardware and building supplies"],
        }
        return uses.get(zone_code.upper(), ["Contact council for permitted uses"])

    def _get_nsw_zone_objectives(self, zone_code: str) -> list[str]:
        """Get zone objectives for NSW zones."""
        objectives = {
            "R2": [
                "To provide for the housing needs of the community within a low density residential environment",
                "To enable other land uses that provide facilities or services to meet the day to day needs of residents",
            ],
            "R3": [
                "To provide for the housing needs of the community within a medium density residential environment",
                "To provide a variety of housing types within a medium density residential environment",
            ],
        }
        return objectives.get(zone_code.upper(), [])

    # =========================================================================
    # DEVELOPMENT CONTROLS
    # =========================================================================

    async def get_development_controls(
        self,
        lat: float,
        lon: float,
        state: AustralianState,
        zone_code: str,
        lot_area_sqm: Optional[float] = None,
    ) -> DevelopmentControlsSet:
        """Get development controls for a location."""
        geometry = self._point_geometry(lon, lat)
        controls = DevelopmentControlsSet()

        if state == AustralianState.NSW:
            controls = await self._get_nsw_controls(geometry, zone_code)
        elif state == AustralianState.QLD:
            controls = await self._get_qld_controls(geometry, zone_code)
        else:
            controls = self._get_default_controls(zone_code)

        # Calculate estimated GFA if we have lot area and FSR
        if lot_area_sqm and controls.fsr:
            controls.estimated_gfa = lot_area_sqm * (controls.fsr.max_value or 0.5)

        # Estimate storeys from height
        if controls.height_limit and controls.height_limit.max_value:
            controls.estimated_storeys = int(controls.height_limit.max_value / 3.2)

        return controls

    async def _get_nsw_controls(
        self, geometry: dict, zone_code: str
    ) -> DevelopmentControlsSet:
        """Get NSW development controls."""
        controls = DevelopmentControlsSet()

        # Query height limit
        height_features = await self._query_arcgis(
            self.NSW_PLANNING_API,
            self.NSW_HEIGHT_LAYER,
            geometry,
            out_fields="MAX_B_H,MAX_B_H_M,UNITS",
        )

        if height_features:
            attrs = height_features[0].get("attributes", {})
            # Try different field names
            height_val = attrs.get("MAX_B_H_M") or attrs.get("MAX_B_H")
            if height_val:
                try:
                    height_m = float(str(height_val).replace("m", "").strip())
                    controls.height_limit = DevelopmentControl(
                        control_type=ControlType.HEIGHT,
                        name="Maximum Building Height",
                        max_value=height_m,
                        unit="m",
                    )
                except (ValueError, TypeError):
                    pass

        # Query FSR
        fsr_features = await self._query_arcgis(
            self.NSW_PLANNING_API,
            self.NSW_FSR_LAYER,
            geometry,
            out_fields="FSR,LAY_CLASS,LGA_NAME",
        )

        if fsr_features:
            attrs = fsr_features[0].get("attributes", {})
            fsr_val = attrs.get("FSR")
            if fsr_val:
                try:
                    # Handle formats like "2.5:1" or "2.5"
                    fsr_str = str(fsr_val).replace(":1", "").strip()
                    fsr_ratio = float(fsr_str)
                    controls.fsr = DevelopmentControl(
                        control_type=ControlType.FSR,
                        name="Floor Space Ratio",
                        max_value=fsr_ratio,
                        unit="ratio",
                    )
                except (ValueError, TypeError):
                    pass

        # Query lot size
        lot_features = await self._query_arcgis(
            self.NSW_PLANNING_API,
            self.NSW_LOT_SIZE_LAYER,
            geometry,
            out_fields="LOT_SIZE,LAY_CLASS,LGA_NAME",
        )

        if lot_features:
            attrs = lot_features[0].get("attributes", {})
            lot_val = attrs.get("LOT_SIZE")
            if lot_val:
                try:
                    lot_size = float(str(lot_val).replace("sqm", "").replace(",", "").strip())
                    controls.lot_size = DevelopmentControl(
                        control_type=ControlType.LOT_SIZE,
                        name="Minimum Lot Size",
                        min_value=lot_size,
                        unit="sqm",
                    )
                except (ValueError, TypeError):
                    pass

        # Add default setbacks based on zone
        controls.setbacks = self._get_default_setbacks(zone_code)

        return controls

    async def _get_qld_controls(
        self, geometry: dict, zone_code: str
    ) -> DevelopmentControlsSet:
        """Get QLD development controls."""
        controls = DevelopmentControlsSet()

        # QLD uses planning scheme codes - would query specific council data
        # For now, use defaults based on zone
        controls = self._get_default_controls(zone_code)

        return controls

    def _get_default_controls(self, zone_code: str) -> DevelopmentControlsSet:
        """Get default controls based on zone code."""
        controls = DevelopmentControlsSet()

        # Default heights by zone category
        category = self._get_zone_category(zone_code)

        height_defaults = {
            ZoneCategory.RESIDENTIAL: 9.0,
            ZoneCategory.COMMERCIAL: 15.0,
            ZoneCategory.INDUSTRIAL: 15.0,
            ZoneCategory.MIXED_USE: 24.0,
            ZoneCategory.RURAL: 9.0,
        }

        fsr_defaults = {
            ZoneCategory.RESIDENTIAL: 0.5,
            ZoneCategory.COMMERCIAL: 1.5,
            ZoneCategory.INDUSTRIAL: 1.0,
            ZoneCategory.MIXED_USE: 2.0,
            ZoneCategory.RURAL: 0.3,
        }

        if category in height_defaults:
            controls.height_limit = DevelopmentControl(
                control_type=ControlType.HEIGHT,
                name="Maximum Building Height (Default)",
                max_value=height_defaults[category],
                unit="m",
                notes="Default value - check local planning controls",
            )

        if category in fsr_defaults:
            controls.fsr = DevelopmentControl(
                control_type=ControlType.FSR,
                name="Floor Space Ratio (Default)",
                max_value=fsr_defaults[category],
                unit="ratio",
                notes="Default value - check local planning controls",
            )

        controls.setbacks = self._get_default_setbacks(zone_code)

        return controls

    def _get_default_setbacks(self, zone_code: str) -> list[DevelopmentControl]:
        """Get default setbacks based on zone."""
        category = self._get_zone_category(zone_code)

        if category == ZoneCategory.RESIDENTIAL:
            return [
                DevelopmentControl(
                    control_type=ControlType.SETBACK_FRONT,
                    name="Front Setback",
                    min_value=6.0,
                    unit="m",
                ),
                DevelopmentControl(
                    control_type=ControlType.SETBACK_SIDE,
                    name="Side Setback",
                    min_value=0.9,
                    unit="m",
                ),
                DevelopmentControl(
                    control_type=ControlType.SETBACK_REAR,
                    name="Rear Setback",
                    min_value=6.0,
                    unit="m",
                ),
            ]
        elif category == ZoneCategory.COMMERCIAL:
            return [
                DevelopmentControl(
                    control_type=ControlType.SETBACK_FRONT,
                    name="Front Setback",
                    min_value=0.0,
                    unit="m",
                ),
            ]

        return []

    # =========================================================================
    # OVERLAYS
    # =========================================================================

    async def get_overlays(
        self,
        lat: float,
        lon: float,
        state: AustralianState,
        heritage_radius_m: int = 100,
    ) -> OverlaySummary:
        """Get all overlays affecting a location."""
        geometry = self._point_geometry(lon, lat)

        hazards = await self._get_hazard_overlays(geometry, state)
        environmental = await self._get_environmental_overlays(geometry, state)
        heritage = await self._get_heritage_items(geometry, state, heritage_radius_m)

        has_critical = any(
            h.level in [HazardLevel.HIGH, HazardLevel.EXTREME] for h in hazards
        )

        return OverlaySummary(
            hazards=hazards,
            environmental=environmental,
            heritage=heritage,
            total_overlays=len(hazards) + len(environmental) + len(heritage),
            has_critical_hazards=has_critical,
            has_heritage_constraints=len(heritage) > 0,
        )

    async def _get_hazard_overlays(
        self, geometry: dict, state: AustralianState
    ) -> list[HazardOverlay]:
        """Get hazard overlays (flood, bushfire, etc.)."""
        hazards = []

        if state == AustralianState.NSW:
            # Query NSW flood
            flood_features = await self._query_arcgis(
                self.NSW_PLANNING_API,
                self.NSW_FLOOD_LAYER,
                geometry,
                out_fields="LAY_CLASS",
            )

            if flood_features:
                hazards.append(
                    HazardOverlay(
                        hazard_type=HazardType.FLOOD,
                        category=flood_features[0].get("attributes", {}).get("LAY_CLASS"),
                        level=HazardLevel.MEDIUM,
                        name="Flood Planning Area",
                        description="Property is within a flood planning area",
                        planning_implications=[
                            "Development consent required for most development",
                            "Floor levels may need to be above flood planning level",
                            "May require flood impact assessment",
                        ],
                        required_assessments=["Flood Impact Assessment"],
                        source="NSW ePlanning",
                    )
                )

            # Query NSW bushfire
            bushfire_features = await self._query_arcgis(
                self.NSW_PLANNING_API,
                self.NSW_BUSHFIRE_LAYER,
                geometry,
                out_fields="Category",
            )

            if bushfire_features:
                category = bushfire_features[0].get("attributes", {}).get("Category", "")
                level = (
                    HazardLevel.EXTREME
                    if "Flame" in category
                    else HazardLevel.HIGH
                    if "1" in category
                    else HazardLevel.MEDIUM
                )

                hazards.append(
                    HazardOverlay(
                        hazard_type=HazardType.BUSHFIRE,
                        category=category,
                        level=level,
                        name="Bush Fire Prone Land",
                        description=f"Property is in a {category} bushfire zone",
                        planning_implications=[
                            "Must comply with Planning for Bush Fire Protection",
                            "BAL (Bushfire Attack Level) assessment required",
                            "May require Asset Protection Zone",
                        ],
                        required_assessments=[
                            "Bushfire Attack Level (BAL) Assessment",
                            "Bushfire Emergency Management and Evacuation Plan",
                        ],
                        source="NSW RFS",
                    )
                )

        elif state == AustralianState.QLD:
            # Query QLD flood - FloodCheck service
            flood_features = await self._query_arcgis(
                self.QLD_PLANNING_API,
                "FloodCheck/FloodStudies/MapServer/0",
                geometry,
                out_fields="*",
            )

            if flood_features:
                attrs = flood_features[0].get("attributes", {})
                hazards.append(
                    HazardOverlay(
                        hazard_type=HazardType.FLOOD,
                        category=attrs.get("Study_Name") or attrs.get("STUDY_NAME"),
                        level=HazardLevel.MEDIUM,
                        name="Flood Study Area",
                        description="Property is within a mapped flood study area",
                        planning_implications=[
                            "May be subject to flood overlay codes in local planning scheme",
                            "Minimum floor level requirements may apply",
                            "Flood impact assessment may be required for development",
                        ],
                        required_assessments=["Flood Impact Assessment"],
                        source="QLD FloodCheck",
                    )
                )

            # Query MSES (Matters of State Environmental Significance)
            mses_features = await self._query_arcgis(
                self.QLD_PLANNING_API,
                self.QLD_MSES_LAYER,
                geometry,
                out_fields="*",
            )

            if mses_features:
                hazards.append(
                    HazardOverlay(
                        hazard_type=HazardType.CONTAMINATION,  # Using as generic environmental
                        level=HazardLevel.MEDIUM,
                        name="Matter of State Environmental Significance",
                        description="Property contains or is near a Matter of State Environmental Significance",
                        planning_implications=[
                            "State code assessment may be required",
                            "Environmental assessment likely required",
                            "Vegetation clearing restrictions may apply",
                        ],
                        required_assessments=["Environmental Assessment"],
                        source="QLD MSES",
                    )
                )

            # Query Koala habitat
            koala_features = await self._query_arcgis(
                self.QLD_PLANNING_API,
                self.QLD_KOALA_LAYER,
                geometry,
                out_fields="*",
            )

            if koala_features:
                hazards.append(
                    HazardOverlay(
                        hazard_type=HazardType.CONTAMINATION,  # Using as generic environmental
                        level=HazardLevel.MEDIUM,
                        name="Koala Habitat Area",
                        description="Property is within a mapped koala habitat area",
                        planning_implications=[
                            "Koala habitat assessment required",
                            "Development may require koala-sensitive design",
                            "Vegetation clearing restrictions apply",
                        ],
                        required_assessments=["Koala Habitat Assessment"],
                        source="QLD Koala Plan",
                    )
                )

        return hazards

    async def _get_environmental_overlays(
        self, geometry: dict, state: AustralianState
    ) -> list[EnvironmentalOverlay]:
        """Get environmental overlays."""
        # Would query vegetation, biodiversity layers
        return []

    async def _get_heritage_items(
        self, geometry: dict, state: AustralianState, radius_m: int
    ) -> list[HeritageItem]:
        """Get heritage items near the location."""
        heritage = []

        if state == AustralianState.NSW:
            # Query NSW heritage
            heritage_features = await self._query_arcgis(
                self.NSW_PLANNING_API,
                self.NSW_HERITAGE_LAYER,
                geometry,
                out_fields="H_NAME,H_ID,SIG,LAY_CLASS,LGA_NAME",
            )

            for feature in heritage_features:
                attrs = feature.get("attributes", {})
                layer_class = str(attrs.get("LAY_CLASS", "")).lower()
                heritage.append(
                    HeritageItem(
                        heritage_type=HeritageType.LOCAL
                        if "local" in layer_class
                        else HeritageType.STATE,
                        listing_name=attrs.get("H_NAME", "Heritage Item"),
                        listing_number=attrs.get("H_ID"),
                        significance=attrs.get("SIG"),
                        planning_implications=[
                            "Development consent required for most works",
                            "Heritage impact statement may be required",
                            "Conservation management plan may be needed",
                        ],
                        source="NSW ePlanning Heritage",
                    )
                )

        return heritage

    # =========================================================================
    # DEVELOPMENT POTENTIAL
    # =========================================================================

    async def get_development_potential(
        self,
        zoning: ZoningInfo,
        controls: DevelopmentControlsSet,
        overlays: OverlaySummary,
        lot_area_sqm: Optional[float] = None,
    ) -> DevelopmentPotential:
        """Calculate development potential based on zoning and controls."""

        # Calculate building envelope
        envelope = self._calculate_building_envelope(controls, lot_area_sqm)

        # Calculate subdivision potential
        subdivision = self._calculate_subdivision_potential(
            zoning, controls, lot_area_sqm
        )

        # Generate development scenarios
        scenarios = self._generate_development_scenarios(
            zoning, controls, envelope, lot_area_sqm
        )

        # Identify opportunities and constraints
        opportunities = self._identify_opportunities(zoning, controls, scenarios)
        constraints = self._identify_constraints(overlays, zoning)

        # Recommend best scenario
        recommended = None
        if scenarios:
            # Pick highest feasibility scenario
            high_feasibility = [s for s in scenarios if s.feasibility_rating == "high"]
            if high_feasibility:
                recommended = high_feasibility[0].scenario_name

        return DevelopmentPotential(
            current_use=None,
            building_envelope=envelope,
            subdivision=subdivision,
            scenarios=scenarios,
            recommended_scenario=recommended,
            key_opportunities=opportunities,
            key_constraints=constraints,
        )

    def _calculate_building_envelope(
        self,
        controls: DevelopmentControlsSet,
        lot_area_sqm: Optional[float],
    ) -> BuildingEnvelope:
        """Calculate the building envelope from controls."""
        envelope = BuildingEnvelope()

        if controls.height_limit:
            envelope.max_height_m = controls.height_limit.max_value
            if envelope.max_height_m:
                envelope.max_storeys = int(envelope.max_height_m / 3.2)

        if controls.fsr and lot_area_sqm:
            envelope.max_gfa_sqm = lot_area_sqm * (controls.fsr.max_value or 0)

        if controls.site_coverage:
            envelope.max_site_coverage_percent = controls.site_coverage.max_value

        # Extract setbacks
        for setback in controls.setbacks:
            if setback.control_type == ControlType.SETBACK_FRONT:
                envelope.setback_front_m = setback.min_value
            elif setback.control_type == ControlType.SETBACK_SIDE:
                envelope.setback_side_m = setback.min_value
            elif setback.control_type == ControlType.SETBACK_REAR:
                envelope.setback_rear_m = setback.min_value

        # Calculate buildable area (simplified)
        if lot_area_sqm and envelope.setback_front_m and envelope.setback_rear_m:
            # Assume rectangular lot
            assumed_width = (lot_area_sqm / 30) ** 0.5 * 2  # Estimate width
            assumed_depth = lot_area_sqm / assumed_width if assumed_width > 0 else 30

            buildable_width = assumed_width - 2 * (envelope.setback_side_m or 0.9)
            buildable_depth = (
                assumed_depth
                - (envelope.setback_front_m or 6)
                - (envelope.setback_rear_m or 6)
            )

            if buildable_width > 0 and buildable_depth > 0:
                envelope.buildable_area_sqm = buildable_width * buildable_depth

        return envelope

    def _calculate_subdivision_potential(
        self,
        zoning: ZoningInfo,
        controls: DevelopmentControlsSet,
        lot_area_sqm: Optional[float],
    ) -> SubdivisionPotential:
        """Calculate subdivision potential."""
        result = SubdivisionPotential(can_subdivide=False)

        if not lot_area_sqm:
            return result

        # Get minimum lot size from controls or defaults
        min_lot = 450  # Default for residential

        if controls.lot_size and controls.lot_size.min_value:
            min_lot = controls.lot_size.min_value
        elif zoning.zone_category == ZoneCategory.RURAL:
            min_lot = 4000  # Rural default
        elif zoning.zone_category == ZoneCategory.RESIDENTIAL:
            if "R2" in zoning.zone_code or "LDR" in zoning.zone_code:
                min_lot = 450
            elif "R3" in zoning.zone_code or "LMR" in zoning.zone_code:
                min_lot = 300
            elif "R4" in zoning.zone_code or "MDR" in zoning.zone_code:
                min_lot = 200

        result.min_lot_size = min_lot

        # Calculate potential lots
        potential_lots = int(lot_area_sqm / min_lot)

        if potential_lots >= 2:
            result.can_subdivide = True
            result.potential_lots = potential_lots
            result.lot_configurations = [
                {"lots": 2, "avg_size": lot_area_sqm / 2},
            ]

            if potential_lots >= 3:
                result.lot_configurations.append(
                    {"lots": 3, "avg_size": lot_area_sqm / 3}
                )

            result.required_approvals = ["Development Application for Subdivision"]

        return result

    def _generate_development_scenarios(
        self,
        zoning: ZoningInfo,
        controls: DevelopmentControlsSet,
        envelope: BuildingEnvelope,
        lot_area_sqm: Optional[float],
    ) -> list[DevelopmentScenario]:
        """Generate development scenarios."""
        scenarios = []

        if not lot_area_sqm:
            return scenarios

        category = zoning.zone_category

        if category == ZoneCategory.RESIDENTIAL:
            # Scenario 1: Single dwelling
            scenarios.append(
                DevelopmentScenario(
                    scenario_name="Single Dwelling House",
                    scenario_type="residential",
                    estimated_dwellings=1,
                    estimated_gfa=min(300, envelope.max_gfa_sqm or 300),
                    feasibility_rating="high",
                    key_requirements=[
                        "Complies with building codes",
                        "Private certifier or council approval",
                    ],
                    key_constraints=[],
                    estimated_approval_pathway="complying",
                )
            )

            # Scenario 2: Dual occupancy (if lot big enough)
            if lot_area_sqm >= 600:
                scenarios.append(
                    DevelopmentScenario(
                        scenario_name="Dual Occupancy",
                        scenario_type="residential",
                        estimated_dwellings=2,
                        estimated_gfa=min(400, envelope.max_gfa_sqm or 400),
                        feasibility_rating="high" if lot_area_sqm >= 800 else "medium",
                        key_requirements=[
                            "Development Application",
                            "Minimum lot size requirements",
                            "Private open space for each dwelling",
                        ],
                        key_constraints=[],
                        estimated_approval_pathway="DA",
                    )
                )

            # Scenario 3: Townhouses (if zone allows)
            if "R3" in zoning.zone_code or "LMR" in zoning.zone_code or "MDR" in zoning.zone_code:
                if lot_area_sqm >= 1000:
                    estimated_units = min(int(lot_area_sqm / 200), 8)
                    scenarios.append(
                        DevelopmentScenario(
                            scenario_name="Townhouse Development",
                            scenario_type="residential",
                            estimated_dwellings=estimated_units,
                            estimated_gfa=envelope.max_gfa_sqm,
                            feasibility_rating="medium",
                            key_requirements=[
                                "Development Application",
                                "Urban design assessment",
                                "Traffic and parking study",
                            ],
                            key_constraints=[],
                            estimated_approval_pathway="DA",
                        )
                    )

            # Scenario 4: Apartment building (if zone allows high density)
            if "R4" in zoning.zone_code or "HDR" in zoning.zone_code:
                if envelope.max_storeys and envelope.max_storeys >= 4:
                    estimated_units = int((envelope.max_gfa_sqm or 0) / 80)
                    scenarios.append(
                        DevelopmentScenario(
                            scenario_name="Residential Flat Building",
                            scenario_type="residential",
                            estimated_dwellings=estimated_units,
                            estimated_gfa=envelope.max_gfa_sqm,
                            feasibility_rating="medium",
                            key_requirements=[
                                "Development Application",
                                "Design excellence panel review",
                                "Traffic impact assessment",
                                "BASIX certification",
                            ],
                            key_constraints=[],
                            estimated_approval_pathway="DA",
                        )
                    )

        elif category == ZoneCategory.COMMERCIAL:
            scenarios.append(
                DevelopmentScenario(
                    scenario_name="Commercial Development",
                    scenario_type="commercial",
                    estimated_gfa=envelope.max_gfa_sqm,
                    feasibility_rating="medium",
                    key_requirements=[
                        "Development Application",
                        "Traffic and parking assessment",
                    ],
                    key_constraints=[],
                    estimated_approval_pathway="DA",
                )
            )

        elif category == ZoneCategory.MIXED_USE:
            scenarios.append(
                DevelopmentScenario(
                    scenario_name="Mixed Use Development",
                    scenario_type="mixed",
                    estimated_dwellings=int((envelope.max_gfa_sqm or 0) * 0.7 / 80),
                    estimated_gfa=envelope.max_gfa_sqm,
                    feasibility_rating="medium",
                    key_requirements=[
                        "Development Application",
                        "Design excellence requirements",
                        "Active street frontage",
                    ],
                    key_constraints=[],
                    estimated_approval_pathway="DA",
                )
            )

        return scenarios

    def _identify_opportunities(
        self,
        zoning: ZoningInfo,
        controls: DevelopmentControlsSet,
        scenarios: list[DevelopmentScenario],
    ) -> list[str]:
        """Identify development opportunities."""
        opportunities = []

        if any(s.estimated_dwellings and s.estimated_dwellings > 1 for s in scenarios):
            opportunities.append("Multi-dwelling development potential")

        if controls.fsr and controls.fsr.max_value and controls.fsr.max_value >= 1.5:
            opportunities.append("High FSR allows for significant development")

        if (
            controls.height_limit
            and controls.height_limit.max_value
            and controls.height_limit.max_value >= 12
        ):
            opportunities.append("Height controls allow multi-storey development")

        if "dual" in str(zoning.permitted_uses).lower():
            opportunities.append("Dual occupancy is permitted")

        return opportunities

    def _identify_constraints(
        self, overlays: OverlaySummary, zoning: ZoningInfo
    ) -> list[str]:
        """Identify development constraints."""
        constraints = []

        if overlays.has_critical_hazards:
            constraints.append("Critical hazard overlays may limit development")

        if overlays.has_heritage_constraints:
            constraints.append("Heritage constraints may require additional approvals")

        for hazard in overlays.hazards:
            if hazard.hazard_type == HazardType.FLOOD:
                constraints.append("Flood planning controls apply")
            elif hazard.hazard_type == HazardType.BUSHFIRE:
                constraints.append("Bushfire protection requirements apply")

        return constraints

    # =========================================================================
    # FULL PROPERTY ANALYSIS
    # =========================================================================

    async def analyze_property(
        self,
        lat: float,
        lon: float,
        state: AustralianState,
        address: Optional[str] = None,
        lot_plan: Optional[str] = None,
        lot_area_sqm: Optional[float] = None,
        include_scenarios: bool = True,
        heritage_radius_m: int = 100,
    ) -> PropertyAnalysis:
        """Perform a complete property analysis."""

        # Get location info
        location = PropertyLocation(
            address=address or f"{lat}, {lon}",
            lat=lat,
            lon=lon,
            state=state,
            lot_plan=lot_plan,
            lot_area_sqm=lot_area_sqm,
        )

        # Get zoning
        zoning = await self.get_zoning(lat, lon, state)
        if not zoning:
            zoning = ZoningInfo(
                zone_code="Unknown",
                zone_name="Zoning not available",
                zone_category=ZoneCategory.SPECIAL_PURPOSE,
            )

        # Get development controls
        controls = await self.get_development_controls(
            lat, lon, state, zoning.zone_code, lot_area_sqm
        )

        # Get overlays
        overlays = await self.get_overlays(lat, lon, state, heritage_radius_m)

        # Calculate development potential
        if include_scenarios:
            potential = await self.get_development_potential(
                zoning, controls, overlays, lot_area_sqm
            )
        else:
            potential = DevelopmentPotential(
                building_envelope=BuildingEnvelope(),
                subdivision=SubdivisionPotential(can_subdivide=False),
                scenarios=[],
            )

        # Build limitations list
        limitations = [
            "This analysis is for informational purposes only",
            "Always verify with local council planning department",
            "Development controls may vary - check specific LEP/planning scheme",
        ]

        if state not in [AustralianState.NSW, AustralianState.QLD]:
            limitations.append(
                f"Limited data available for {state.value} - manual verification recommended"
            )

        return PropertyAnalysis(
            location=location,
            zoning=zoning,
            development_controls=controls,
            overlays=overlays,
            development_potential=potential,
            data_sources=[
                f"{state.value} Planning Portal",
                "ePlanning Spatial Viewer" if state == AustralianState.NSW else "QLD Globe",
            ],
            confidence_score=0.85 if state in [AustralianState.NSW, AustralianState.QLD] else 0.6,
            limitations=limitations,
        )

    async def get_brief_analysis(
        self, lat: float, lon: float, state: AustralianState
    ) -> PropertyAnalysisBrief:
        """Get a brief property analysis for quick lookups."""
        from app.schemas.planning import Coordinates

        zoning = await self.get_zoning(lat, lon, state)
        overlays = await self.get_overlays(lat, lon, state, 50)

        controls = await self.get_development_controls(
            lat, lon, state, zoning.zone_code if zoning else "Unknown"
        )

        return PropertyAnalysisBrief(
            location=Coordinates(lat=lat, lon=lon),
            zone_code=zoning.zone_code if zoning else "Unknown",
            zone_name=zoning.zone_name if zoning else "Unknown",
            zone_category=zoning.zone_category if zoning else ZoneCategory.SPECIAL_PURPOSE,
            hazard_count=len(overlays.hazards),
            has_heritage=overlays.has_heritage_constraints,
            max_height_m=controls.height_limit.max_value if controls.height_limit else None,
            max_fsr=controls.fsr.max_value if controls.fsr else None,
        )


# Singleton instance
planning_service = PlanningService()
