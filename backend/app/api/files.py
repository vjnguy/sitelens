from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import uuid

from app.core.config import get_settings, Settings
from app.core.supabase import get_supabase_client
from app.connectors.autocad import get_autocad_connector
from app.connectors.qgis import get_qgis_connector
from app.schemas import FileUploadResponse, CadFileCreate

router = APIRouter(prefix="/files", tags=["files"])

# Supported file types by connector
AUTOCAD_TYPES = ["dxf", "dwg"]
QGIS_TYPES = ["qgs", "qgz", "geojson", "json", "shp", "gpkg", "kml", "kmz"]
ALL_SUPPORTED_TYPES = AUTOCAD_TYPES + QGIS_TYPES


def get_connector_for_file(ext: str):
    """Get the appropriate connector based on file extension."""
    if ext in AUTOCAD_TYPES:
        return get_autocad_connector(), "autocad"
    elif ext in QGIS_TYPES:
        return get_qgis_connector(), "qgis"
    return None, None


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    organization_id: Optional[str] = None,
    connector_id: Optional[str] = None,
    settings: Settings = Depends(get_settings),
):
    """
    Upload and process a CAD/GIS file.

    Supports:
    - AutoCAD: DXF, DWG
    - QGIS/GIS: GeoJSON, Shapefiles, KML, GeoPackage, QGIS projects

    The file will be:
    1. Validated
    2. Parsed for metadata extraction
    3. Stored in Supabase Storage
    4. Metadata saved to database
    """
    # Validate file type
    filename = file.filename or "unknown"
    ext = filename.lower().split(".")[-1] if "." in filename else ""

    if ext not in ALL_SUPPORTED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported types: {', '.join(ALL_SUPPORTED_TYPES)}"
        )

    # Read file content
    content = await file.read()

    # Check file size
    max_size = settings.max_file_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB"
        )

    # Get appropriate connector
    connector, connector_type = get_connector_for_file(ext)
    if not connector:
        raise HTTPException(status_code=400, detail=f"No connector available for: {ext}")

    result = await connector.process_file(content, filename)

    if not result.success:
        return FileUploadResponse(
            success=False,
            message=result.error or "Failed to process file"
        )

    # Generate file ID and storage path
    file_id = str(uuid.uuid4())
    storage_path = f"{organization_id or 'default'}/{file_id}/{filename}"

    # Store file in Supabase Storage
    try:
        supabase = get_supabase_client()
        storage_response = supabase.storage.from_(settings.storage_bucket).upload(
            storage_path,
            content,
            {"content-type": file.content_type or "application/octet-stream"}
        )
    except Exception as e:
        # If storage fails, still return the metadata
        return FileUploadResponse(
            success=True,
            file_id=file_id,
            metadata=result.data,
            message=f"File processed successfully. Storage failed: {str(e)}"
        )

    # Save metadata to database
    if organization_id:
        try:
            cad_file = CadFileCreate(
                organization_id=organization_id,
                connector_id=connector_id,
                filename=filename,
                file_path=storage_path,
                file_type=ext,
                metadata=result.data,
            )
            supabase.table("cad_files").insert(cad_file.model_dump()).execute()
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to save metadata: {e}")

    return FileUploadResponse(
        success=True,
        file_id=file_id,
        metadata=result.data,
        message="File uploaded and processed successfully"
    )


@router.get("/{file_id}")
async def get_file(file_id: str):
    """Get file metadata by ID."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("cad_files").select("*").eq("id", file_id).single().execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found")


@router.get("/")
async def list_files(
    organization_id: Optional[str] = None,
    connector_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List CAD/GIS files with optional filtering."""
    try:
        supabase = get_supabase_client()
        query = supabase.table("cad_files").select("*")

        if organization_id:
            query = query.eq("organization_id", organization_id)
        if connector_id:
            query = query.eq("connector_id", connector_id)

        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        response = query.execute()

        return {"files": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse")
async def parse_file(file: UploadFile = File(...)):
    """
    Parse a CAD/GIS file and return metadata without storing.

    Useful for quick analysis or preview.
    """
    filename = file.filename or "unknown"
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    content = await file.read()

    connector, _ = get_connector_for_file(ext)
    if not connector:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported: {', '.join(ALL_SUPPORTED_TYPES)}"
        )

    result = await connector.process_file(content, filename)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return result.data


@router.get("/supported-types")
async def get_supported_types():
    """Get list of supported file types."""
    return {
        "autocad": AUTOCAD_TYPES,
        "qgis": QGIS_TYPES,
        "all": ALL_SUPPORTED_TYPES,
    }
