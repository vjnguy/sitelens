from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import uuid

from app.core.supabase import get_supabase_client
from app.schemas import Connector, ConnectorCreate
from app.connectors.autocad import get_autocad_connector
from app.connectors.qgis import get_qgis_connector

router = APIRouter(prefix="/connectors", tags=["connectors"])


# Available connector types
CONNECTOR_TYPES = {
    "autocad": {
        "name": "AutoCAD",
        "description": "Import and analyze DXF/DWG files",
        "supported_files": ["dxf", "dwg"],
        "available": True,
    },
    "qgis": {
        "name": "QGIS",
        "description": "GIS data - GeoJSON, Shapefiles, KML, GeoPackage, QGIS projects",
        "supported_files": ["qgs", "qgz", "geojson", "shp", "gpkg", "kml", "kmz"],
        "available": True,
    },
    "solidworks": {
        "name": "SolidWorks",
        "description": "Connect to SolidWorks for SLDPRT/SLDASM files",
        "supported_files": ["sldprt", "sldasm"],
        "available": False,
    },
    "fusion360": {
        "name": "Fusion 360",
        "description": "Sync with Autodesk Fusion 360 projects",
        "supported_files": ["f3d"],
        "available": False,
    },
    "onshape": {
        "name": "Onshape",
        "description": "Connect to Onshape cloud CAD",
        "supported_files": [],
        "available": False,
    },
}


@router.get("/types")
async def get_connector_types():
    """Get all available connector types."""
    return {"connector_types": CONNECTOR_TYPES}


@router.post("/", response_model=dict)
async def create_connector(connector: ConnectorCreate):
    """Create a new connector."""
    if connector.type not in CONNECTOR_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown connector type: {connector.type}"
        )

    if not CONNECTOR_TYPES[connector.type]["available"]:
        raise HTTPException(
            status_code=400,
            detail=f"Connector type '{connector.type}' is not yet available"
        )

    # Test the connector
    if connector.type == "autocad":
        conn = get_autocad_connector(connector.config)
        test_result = await conn.test_connection()
        if not test_result.success:
            raise HTTPException(
                status_code=400,
                detail=f"Connector test failed: {test_result.error}"
            )
    elif connector.type == "qgis":
        conn = get_qgis_connector(connector.config)
        test_result = await conn.test_connection()
        if not test_result.success:
            raise HTTPException(
                status_code=400,
                detail=f"Connector test failed: {test_result.error}"
            )

    try:
        supabase = get_supabase_client()
        data = {
            "id": str(uuid.uuid4()),
            "organization_id": connector.organization_id,
            "type": connector.type,
            "name": connector.name,
            "config": connector.config,
            "status": "active",
        }
        response = supabase.table("connectors").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_connectors(organization_id: Optional[str] = None):
    """List all connectors, optionally filtered by organization."""
    try:
        supabase = get_supabase_client()
        query = supabase.table("connectors").select("*")

        if organization_id:
            query = query.eq("organization_id", organization_id)

        response = query.order("created_at", desc=True).execute()
        return {"connectors": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{connector_id}")
async def get_connector(connector_id: str):
    """Get a specific connector by ID."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("connectors").select("*").eq("id", connector_id).single().execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Connector not found")


@router.post("/{connector_id}/test")
async def test_connector(connector_id: str):
    """Test a connector's connection."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("connectors").select("*").eq("id", connector_id).single().execute()
        connector_data = response.data
    except Exception:
        raise HTTPException(status_code=404, detail="Connector not found")

    conn = None
    if connector_data["type"] == "autocad":
        conn = get_autocad_connector(connector_data.get("config", {}))
    elif connector_data["type"] == "qgis":
        conn = get_qgis_connector(connector_data.get("config", {}))

    if conn:
        result = await conn.test_connection()

        # Update status
        new_status = "active" if result.success else "error"
        supabase.table("connectors").update({"status": new_status}).eq("id", connector_id).execute()

        return {
            "success": result.success,
            "message": result.data.get("message") if result.success else result.error,
        }

    raise HTTPException(status_code=400, detail="Unknown connector type")


@router.delete("/{connector_id}")
async def delete_connector(connector_id: str):
    """Delete a connector."""
    try:
        supabase = get_supabase_client()
        supabase.table("connectors").delete().eq("id", connector_id).execute()
        return {"success": True, "message": "Connector deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{connector_id}")
async def update_connector(connector_id: str, updates: dict):
    """Update a connector's configuration."""
    allowed_fields = {"name", "config", "status"}
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}

    if not filtered_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    try:
        supabase = get_supabase_client()
        response = supabase.table("connectors").update(filtered_updates).eq("id", connector_id).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
