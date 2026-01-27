"""
Planning Data Ingestion Script
Fetches and stores zoning data from QLD and NSW government APIs.

Usage:
    python scripts/ingest_planning_data.py --state QLD --lga "Brisbane City"
    python scripts/ingest_planning_data.py --state NSW --lga "Sydney"
    python scripts/ingest_planning_data.py --all
"""

import asyncio
import argparse
import httpx
import json
from datetime import datetime
from typing import Optional
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ============================================================================
# QLD DATA SOURCES
# ============================================================================

QLD_SERVICES = {
    "zoning": {
        "name": "Land Use Zoning",
        "url": "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/LandUseZoning/MapServer/0",
        "table": "planning_zones",
    },
    "flood": {
        "name": "Flood Study Areas",
        "url": "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Hazards/FloodStudyAreas/MapServer/0",
        "table": "hazard_overlays",
    },
    "bushfire": {
        "name": "Bushfire Prone Areas",
        "url": "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Hazards/BushfireProne/MapServer/0",
        "table": "hazard_overlays",
    },
    "coastal_erosion": {
        "name": "Coastal Erosion Hazard",
        "url": "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Hazards/CoastalHazardAreas/MapServer/0",
        "table": "hazard_overlays",
    },
    "heritage": {
        "name": "Queensland Heritage Register",
        "url": "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Society/HeritageRegister/MapServer/0",
        "table": "heritage_items",
    },
    "koala_habitat": {
        "name": "Koala Habitat Areas",
        "url": "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Environment/KoalaHabitatAreas/MapServer/0",
        "table": "environmental_overlays",
    },
}

# QLD LGA bounding boxes (approximate)
QLD_LGAS = {
    "Brisbane City": (152.6, -27.7, 153.3, -27.1),
    "Gold Coast City": (153.2, -28.3, 153.6, -27.8),
    "Sunshine Coast": (152.7, -26.8, 153.2, -26.3),
    "Moreton Bay": (152.4, -27.4, 153.2, -26.8),
    "Logan City": (152.8, -28.0, 153.3, -27.5),
    "Ipswich City": (152.4, -27.8, 152.9, -27.4),
    "Redland City": (153.1, -27.7, 153.5, -27.3),
    "Townsville City": (146.4, -19.5, 147.0, -19.1),
    "Cairns": (145.6, -17.1, 146.1, -16.6),
    "Toowoomba": (151.8, -27.7, 152.2, -27.3),
}


# ============================================================================
# NSW DATA SOURCES
# ============================================================================

NSW_SERVICES = {
    "zoning": {
        "name": "Land Zoning",
        "url": "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/1",
        "table": "planning_zones",
    },
    "height": {
        "name": "Height of Buildings",
        "url": "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Height/MapServer/0",
        "table": "development_controls",
    },
    "fsr": {
        "name": "Floor Space Ratio",
        "url": "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_FSR/MapServer/0",
        "table": "development_controls",
    },
    "lot_size": {
        "name": "Minimum Lot Size",
        "url": "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Lot_Size/MapServer/0",
        "table": "development_controls",
    },
    "flood": {
        "name": "Flood Planning",
        "url": "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Flood/MapServer/0",
        "table": "hazard_overlays",
    },
    "bushfire": {
        "name": "Bush Fire Prone Land",
        "url": "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Bushfire/MapServer/0",
        "table": "hazard_overlays",
    },
    "heritage": {
        "name": "Heritage",
        "url": "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Heritage/MapServer/0",
        "table": "heritage_items",
    },
    "biodiversity": {
        "name": "Biodiversity Values",
        "url": "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Biodiversity/MapServer/0",
        "table": "environmental_overlays",
    },
}

# NSW LGA bounding boxes (approximate)
NSW_LGAS = {
    "Sydney": (151.1, -33.95, 151.3, -33.8),
    "Parramatta": (150.95, -33.85, 151.1, -33.75),
    "Canterbury-Bankstown": (150.95, -33.98, 151.15, -33.85),
    "Blacktown": (150.75, -33.8, 150.95, -33.65),
    "Northern Beaches": (151.2, -33.8, 151.35, -33.6),
    "Liverpool": (150.85, -34.05, 151.05, -33.85),
    "Penrith": (150.55, -33.85, 150.85, -33.65),
    "Central Coast": (151.25, -33.55, 151.55, -33.25),
    "Newcastle": (151.7, -33.0, 151.85, -32.85),
    "Wollongong": (150.8, -34.55, 151.0, -34.35),
}


class PlanningDataIngester:
    """Fetches and stores planning data from government APIs."""

    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
        }

    async def query_arcgis_layer(
        self,
        url: str,
        bbox: tuple[float, float, float, float],
        out_fields: str = "*",
        max_records: int = 1000,
    ) -> list[dict]:
        """Query an ArcGIS layer for features within a bounding box."""
        west, south, east, north = bbox

        params = {
            "geometry": json.dumps({
                "xmin": west,
                "ymin": south,
                "xmax": east,
                "ymax": north,
                "spatialReference": {"wkid": 4326},
            }),
            "geometryType": "esriGeometryEnvelope",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": out_fields,
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "geojson",
            "resultRecordCount": max_records,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(f"{url}/query", params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("features", [])
            except Exception as e:
                print(f"Error querying {url}: {e}")
                return []

    async def insert_to_supabase(
        self, table: str, records: list[dict]
    ) -> Optional[dict]:
        """Insert records into Supabase."""
        if not records:
            return None

        url = f"{self.supabase_url}/rest/v1/{table}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=records,
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error inserting to {table}: {e}")
                return None

    async def ingest_qld_zoning(self, lga: str, bbox: tuple) -> int:
        """Ingest QLD zoning data for an LGA."""
        print(f"Fetching QLD zoning data for {lga}...")

        service = QLD_SERVICES["zoning"]
        features = await self.query_arcgis_layer(
            service["url"],
            bbox,
            out_fields="ZONE_CODE,ZONE_NAME,LGA_NAME",
        )

        records = []
        for feature in features:
            props = feature.get("properties", {})
            geom = feature.get("geometry")

            if geom and props.get("ZONE_CODE"):
                records.append({
                    "state": "QLD",
                    "zone_code": props.get("ZONE_CODE"),
                    "zone_name": props.get("ZONE_NAME", "Unknown"),
                    "zone_category": self._get_zone_category(props.get("ZONE_CODE", "")),
                    "lga_name": props.get("LGA_NAME") or lga,
                    "geometry": json.dumps(geom),
                    "source_url": service["url"],
                    "source_date": datetime.now().date().isoformat(),
                })

        if records:
            await self.insert_to_supabase("planning_zones", records)

        print(f"  Ingested {len(records)} zoning records for {lga}")
        return len(records)

    async def ingest_nsw_zoning(self, lga: str, bbox: tuple) -> int:
        """Ingest NSW zoning data for an LGA."""
        print(f"Fetching NSW zoning data for {lga}...")

        service = NSW_SERVICES["zoning"]
        features = await self.query_arcgis_layer(
            service["url"],
            bbox,
            out_fields="SYM_CODE,LAY_CLASS,LGA_NAME",
        )

        records = []
        for feature in features:
            props = feature.get("properties", {})
            geom = feature.get("geometry")

            if geom and props.get("SYM_CODE"):
                records.append({
                    "state": "NSW",
                    "zone_code": props.get("SYM_CODE"),
                    "zone_name": props.get("LAY_CLASS", "Unknown"),
                    "zone_category": self._get_zone_category(props.get("SYM_CODE", "")),
                    "lga_name": props.get("LGA_NAME") or lga,
                    "geometry": json.dumps(geom),
                    "source_url": service["url"],
                    "source_date": datetime.now().date().isoformat(),
                })

        if records:
            await self.insert_to_supabase("planning_zones", records)

        print(f"  Ingested {len(records)} zoning records for {lga}")
        return len(records)

    async def ingest_hazards(
        self, state: str, lga: str, bbox: tuple, hazard_type: str
    ) -> int:
        """Ingest hazard overlay data."""
        services = QLD_SERVICES if state == "QLD" else NSW_SERVICES

        if hazard_type not in services:
            return 0

        service = services[hazard_type]
        print(f"Fetching {state} {service['name']} data for {lga}...")

        features = await self.query_arcgis_layer(service["url"], bbox)

        records = []
        for feature in features:
            props = feature.get("properties", {})
            geom = feature.get("geometry")

            if geom:
                records.append({
                    "state": state,
                    "hazard_type": hazard_type,
                    "hazard_category": self._extract_category(props),
                    "hazard_level": self._determine_hazard_level(hazard_type, props),
                    "name": service["name"],
                    "lga_name": lga,
                    "geometry": json.dumps(geom),
                    "source_url": service["url"],
                    "source_date": datetime.now().date().isoformat(),
                })

        if records:
            await self.insert_to_supabase("hazard_overlays", records)

        print(f"  Ingested {len(records)} {hazard_type} records for {lga}")
        return len(records)

    async def ingest_heritage(self, state: str, lga: str, bbox: tuple) -> int:
        """Ingest heritage data."""
        services = QLD_SERVICES if state == "QLD" else NSW_SERVICES
        service = services.get("heritage")

        if not service:
            return 0

        print(f"Fetching {state} heritage data for {lga}...")
        features = await self.query_arcgis_layer(service["url"], bbox)

        records = []
        for feature in features:
            props = feature.get("properties", {})
            geom = feature.get("geometry")

            if geom:
                # Extract name from various possible fields
                name = (
                    props.get("Name")
                    or props.get("ItemName")
                    or props.get("PLACE_NAME")
                    or "Heritage Item"
                )

                records.append({
                    "state": state,
                    "heritage_type": "state" if state == "QLD" else "local",
                    "listing_name": name,
                    "listing_number": props.get("REGISTER_NUMBER") or props.get("ListingID"),
                    "significance": props.get("Significance"),
                    "lga_name": lga,
                    "geometry": json.dumps(geom),
                    "source_url": service["url"],
                    "source_date": datetime.now().date().isoformat(),
                })

        if records:
            await self.insert_to_supabase("heritage_items", records)

        print(f"  Ingested {len(records)} heritage records for {lga}")
        return len(records)

    async def ingest_development_controls(
        self, lga: str, bbox: tuple, control_type: str
    ) -> int:
        """Ingest NSW development controls (height, FSR, lot size)."""
        if control_type not in NSW_SERVICES:
            return 0

        service = NSW_SERVICES[control_type]
        print(f"Fetching NSW {service['name']} data for {lga}...")

        features = await self.query_arcgis_layer(service["url"], bbox)

        records = []
        for feature in features:
            props = feature.get("properties", {})
            geom = feature.get("geometry")

            if geom:
                value_str = props.get("LAY_CLASS", "")
                value = self._parse_control_value(control_type, value_str)

                records.append({
                    "state": "NSW",
                    "control_type": control_type,
                    "control_name": service["name"],
                    "max_value": value,
                    "unit": self._get_control_unit(control_type),
                    "lga_name": lga,
                    "geometry": json.dumps(geom),
                    "source_url": service["url"],
                    "source_date": datetime.now().date().isoformat(),
                })

        if records:
            await self.insert_to_supabase("development_controls", records)

        print(f"  Ingested {len(records)} {control_type} records for {lga}")
        return len(records)

    async def ingest_all_for_lga(self, state: str, lga: str) -> dict:
        """Ingest all available data for an LGA."""
        lgas = QLD_LGAS if state == "QLD" else NSW_LGAS

        if lga not in lgas:
            print(f"Unknown LGA: {lga}")
            return {"error": f"Unknown LGA: {lga}"}

        bbox = lgas[lga]
        results = {"lga": lga, "state": state}

        # Ingest zoning
        if state == "QLD":
            results["zoning"] = await self.ingest_qld_zoning(lga, bbox)
        else:
            results["zoning"] = await self.ingest_nsw_zoning(lga, bbox)

        # Ingest hazards
        for hazard in ["flood", "bushfire"]:
            results[hazard] = await self.ingest_hazards(state, lga, bbox, hazard)

        # Ingest heritage
        results["heritage"] = await self.ingest_heritage(state, lga, bbox)

        # NSW-specific: development controls
        if state == "NSW":
            for control in ["height", "fsr", "lot_size"]:
                results[control] = await self.ingest_development_controls(
                    lga, bbox, control
                )

        return results

    def _get_zone_category(self, zone_code: str) -> str:
        """Map zone code to category."""
        code = zone_code.upper()

        if code.startswith("R") or code in ["LDR", "LMR", "MDR", "HDR", "CR"]:
            return "residential"
        elif code.startswith("B") or code in ["NC", "DC", "MC", "PC"]:
            return "commercial"
        elif code.startswith("IN") or code in ["LI", "MI", "HI"]:
            return "industrial"
        elif code.startswith("RU") or code in ["SR", "RR", "RL"]:
            return "rural"
        elif code.startswith("E") or code in ["EC", "EM"]:
            return "environmental"
        elif code.startswith("RE") or code in ["OS"]:
            return "recreation"
        elif code.startswith("SP") or code in ["SP", "CF"]:
            return "special_purpose"
        elif code.startswith("W"):
            return "waterway"
        else:
            return "special_purpose"

    def _extract_category(self, props: dict) -> str:
        """Extract category from feature properties."""
        for key in ["Category", "CATEGORY", "Class", "CLASS", "Type", "TYPE"]:
            if key in props:
                return str(props[key])
        return "Unknown"

    def _determine_hazard_level(self, hazard_type: str, props: dict) -> str:
        """Determine hazard level from properties."""
        category = self._extract_category(props).lower()

        if "extreme" in category or "flame" in category:
            return "extreme"
        elif "high" in category or "1" in category:
            return "high"
        elif "medium" in category or "2" in category:
            return "medium"
        else:
            return "low"

    def _parse_control_value(self, control_type: str, value_str: str) -> Optional[float]:
        """Parse control value from string."""
        if not value_str:
            return None

        try:
            # Remove common suffixes
            cleaned = value_str.lower()
            cleaned = cleaned.replace("m", "").replace("sqm", "").replace(":1", "")
            cleaned = cleaned.strip()
            return float(cleaned)
        except (ValueError, TypeError):
            return None

    def _get_control_unit(self, control_type: str) -> str:
        """Get unit for control type."""
        units = {
            "height": "m",
            "fsr": "ratio",
            "lot_size": "sqm",
        }
        return units.get(control_type, "")


async def main():
    parser = argparse.ArgumentParser(description="Ingest planning data")
    parser.add_argument("--state", choices=["QLD", "NSW"], help="State to ingest")
    parser.add_argument("--lga", help="LGA name to ingest")
    parser.add_argument("--all", action="store_true", help="Ingest all available LGAs")

    args = parser.parse_args()

    # Get Supabase credentials from environment
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        print("Set these environment variables before running this script")
        return

    ingester = PlanningDataIngester(supabase_url, supabase_key)

    if args.all:
        # Ingest all LGAs for both states
        all_results = []

        for state, lgas in [("QLD", QLD_LGAS), ("NSW", NSW_LGAS)]:
            for lga in lgas:
                print(f"\n{'='*60}")
                print(f"Processing {lga}, {state}")
                print("=" * 60)
                result = await ingester.ingest_all_for_lga(state, lga)
                all_results.append(result)

        print("\n" + "=" * 60)
        print("INGESTION COMPLETE")
        print("=" * 60)
        for result in all_results:
            print(f"{result.get('lga', 'Unknown')}: {sum(v for k, v in result.items() if isinstance(v, int))} records")

    elif args.state and args.lga:
        result = await ingester.ingest_all_for_lga(args.state, args.lga)
        print(f"\nResult: {result}")

    else:
        parser.print_help()


if __name__ == "__main__":
    asyncio.run(main())
