"""
Vector Tile Server API

Serves pre-processed vector tiles from .mbtiles files.
Much faster and more reliable than fetching from external ArcGIS FeatureServers.

Usage: GET /api/v1/tiles/{tileset}/{z}/{x}/{y}.pbf
"""

import sqlite3
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import Response as FastAPIResponse
import gzip

router = APIRouter(prefix="/tiles", tags=["tiles"])

# Cache database connections
_db_connections: dict[str, sqlite3.Connection] = {}

# Available tilesets and their mbtiles file paths
TILESETS = {
    "flood": "data/tiles/brisbane-flood.mbtiles",
}

def get_db(tileset: str) -> Optional[sqlite3.Connection]:
    """Get or create a database connection for a tileset."""
    if tileset in _db_connections:
        return _db_connections[tileset]

    if tileset not in TILESETS:
        return None

    mbtiles_path = Path(__file__).parent.parent.parent.parent / TILESETS[tileset]

    if not mbtiles_path.exists():
        return None

    try:
        conn = sqlite3.connect(str(mbtiles_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        _db_connections[tileset] = conn
        return conn
    except Exception:
        return None


def flip_y(y: int, z: int) -> int:
    """Convert XYZ tile coordinates to TMS (mbtiles uses TMS)."""
    return (2 ** z) - 1 - y


@router.get("/{tileset}/{z}/{x}/{y}.pbf")
async def get_tile(tileset: str, z: int, x: int, y: int):
    """
    Get a vector tile from a tileset.

    Args:
        tileset: Name of the tileset (e.g., "flood")
        z: Zoom level (10-16)
        x: Tile column
        y: Tile row (XYZ/slippy map convention)

    Returns:
        Protobuf vector tile data (gzipped)
    """
    # Validate zoom level
    if z < 0 or z > 22:
        raise HTTPException(status_code=400, detail="Invalid zoom level")

    db = get_db(tileset)

    if db is None:
        raise HTTPException(
            status_code=404,
            detail=f"Tileset '{tileset}' not found. Run 'npm run build:flood-tiles' to generate."
        )

    try:
        # Convert to TMS coordinates (Y is flipped in mbtiles)
        tms_y = flip_y(y, z)

        cursor = db.execute(
            "SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?",
            (z, x, tms_y)
        )
        row = cursor.fetchone()

        if row is None or row["tile_data"] is None:
            # Return empty tile (no data in this area)
            return Response(status_code=204)

        tile_data = row["tile_data"]

        # Check if data is already gzipped (most mbtiles are)
        is_gzipped = tile_data[:2] == b'\x1f\x8b'

        return FastAPIResponse(
            content=tile_data,
            media_type="application/x-protobuf",
            headers={
                "Content-Encoding": "gzip" if is_gzipped else "identity",
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
                "Access-Control-Allow-Origin": "*",
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading tile: {str(e)}")


@router.get("/{tileset}/metadata")
async def get_tileset_metadata(tileset: str):
    """Get metadata for a tileset."""
    db = get_db(tileset)

    if db is None:
        raise HTTPException(status_code=404, detail=f"Tileset '{tileset}' not found")

    try:
        cursor = db.execute("SELECT name, value FROM metadata")
        metadata = {row["name"]: row["value"] for row in cursor.fetchall()}

        return {
            "tileset": tileset,
            "name": metadata.get("name", tileset),
            "description": metadata.get("description", ""),
            "format": metadata.get("format", "pbf"),
            "minzoom": int(metadata.get("minzoom", 0)),
            "maxzoom": int(metadata.get("maxzoom", 22)),
            "bounds": metadata.get("bounds", ""),
            "center": metadata.get("center", ""),
            "attribution": metadata.get("attribution", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading metadata: {str(e)}")


@router.get("/")
async def list_tilesets():
    """List available tilesets."""
    available = []

    for name, path in TILESETS.items():
        mbtiles_path = Path(__file__).parent.parent.parent.parent / path
        available.append({
            "name": name,
            "path": path,
            "available": mbtiles_path.exists(),
        })

    return {"tilesets": available}
