from app.connectors.base import BaseConnector, ConnectorResult
from pydantic import BaseModel
from typing import Optional
import json


class QGISConfig(BaseModel):
    """Configuration for QGIS connector."""
    project_path: Optional[str] = None
    auto_process: bool = True


class QGISConnector(BaseConnector):
    """
    Connector for QGIS project files and GIS data formats.

    Supports:
    - QGIS Project files (.qgs, .qgz)
    - GeoJSON (.geojson, .json)
    - Shapefiles (.shp)
    - GeoPackage (.gpkg)
    - KML/KMZ (.kml, .kmz)
    - DXF with geo-referencing
    """

    @property
    def connector_type(self) -> str:
        return "qgis"

    @property
    def supported_file_types(self) -> list[str]:
        return ["qgs", "qgz", "geojson", "shp", "gpkg", "kml", "kmz", "dxf"]

    async def validate_config(self) -> ConnectorResult:
        """Validate the QGIS connector configuration."""
        try:
            config = QGISConfig(**self.config)
            return ConnectorResult(
                success=True,
                data={"config": config.model_dump()}
            )
        except Exception as e:
            return ConnectorResult(
                success=False,
                error=f"Invalid configuration: {str(e)}"
            )

    async def test_connection(self) -> ConnectorResult:
        """Test the QGIS connector."""
        try:
            self._is_connected = True
            return ConnectorResult(
                success=True,
                data={
                    "message": "QGIS connector ready",
                    "supported_formats": self.supported_file_types
                }
            )
        except Exception as e:
            return ConnectorResult(
                success=False,
                error=f"Connection test failed: {str(e)}"
            )

    async def process_file(self, file_content: bytes, filename: str) -> ConnectorResult:
        """
        Process a QGIS/GIS file and extract metadata.

        Args:
            file_content: Raw bytes of the file
            filename: Original filename

        Returns:
            ConnectorResult with extracted metadata
        """
        ext = filename.lower().split(".")[-1] if "." in filename else ""

        if ext == "geojson" or (ext == "json" and self._is_geojson(file_content)):
            return await self._process_geojson(file_content, filename)
        elif ext in ["qgs", "qgz"]:
            return await self._process_qgis_project(file_content, filename)
        elif ext == "kml":
            return await self._process_kml(file_content, filename)
        elif ext == "shp":
            return await self._process_shapefile(file_content, filename)
        elif ext == "gpkg":
            return await self._process_geopackage(file_content, filename)
        else:
            return ConnectorResult(
                success=False,
                error=f"Unsupported file type: {ext}"
            )

    def _is_geojson(self, content: bytes) -> bool:
        """Check if JSON content is GeoJSON."""
        try:
            data = json.loads(content.decode('utf-8'))
            return data.get('type') in ['Feature', 'FeatureCollection', 'Point',
                                         'LineString', 'Polygon', 'MultiPoint',
                                         'MultiLineString', 'MultiPolygon', 'GeometryCollection']
        except:
            return False

    async def _process_geojson(self, file_content: bytes, filename: str) -> ConnectorResult:
        """Process a GeoJSON file."""
        try:
            data = json.loads(file_content.decode('utf-8'))

            features = []
            geometry_types = {}
            properties_keys = set()
            bbox = None

            if data.get('type') == 'FeatureCollection':
                features = data.get('features', [])
                bbox = data.get('bbox')
            elif data.get('type') == 'Feature':
                features = [data]

            for feature in features:
                geom_type = feature.get('geometry', {}).get('type', 'Unknown')
                geometry_types[geom_type] = geometry_types.get(geom_type, 0) + 1

                props = feature.get('properties', {})
                if props:
                    properties_keys.update(props.keys())

            # Calculate bounding box if not provided
            if not bbox and features:
                bbox = self._calculate_bbox(features)

            metadata = {
                "filename": filename,
                "file_type": "geojson",
                "feature_count": len(features),
                "geometry_types": geometry_types,
                "properties": list(properties_keys),
                "property_count": len(properties_keys),
                "bbox": bbox,
                "crs": data.get('crs', {}).get('properties', {}).get('name', 'EPSG:4326'),
            }

            return ConnectorResult(success=True, data=metadata)

        except json.JSONDecodeError as e:
            return ConnectorResult(success=False, error=f"Invalid JSON: {str(e)}")
        except Exception as e:
            return ConnectorResult(success=False, error=f"Error processing GeoJSON: {str(e)}")

    def _calculate_bbox(self, features: list) -> Optional[list]:
        """Calculate bounding box from features."""
        try:
            min_x, min_y = float('inf'), float('inf')
            max_x, max_y = float('-inf'), float('-inf')

            def process_coords(coords):
                nonlocal min_x, min_y, max_x, max_y
                if isinstance(coords[0], (int, float)):
                    min_x = min(min_x, coords[0])
                    max_x = max(max_x, coords[0])
                    min_y = min(min_y, coords[1])
                    max_y = max(max_y, coords[1])
                else:
                    for coord in coords:
                        process_coords(coord)

            for feature in features:
                geom = feature.get('geometry', {})
                coords = geom.get('coordinates', [])
                if coords:
                    process_coords(coords)

            if min_x != float('inf'):
                return [min_x, min_y, max_x, max_y]
            return None
        except:
            return None

    async def _process_qgis_project(self, file_content: bytes, filename: str) -> ConnectorResult:
        """Process a QGIS project file (.qgs or .qgz)."""
        try:
            ext = filename.lower().split(".")[-1]

            if ext == "qgz":
                # QGZ is a zip file containing the QGS
                import zipfile
                from io import BytesIO

                with zipfile.ZipFile(BytesIO(file_content)) as zf:
                    qgs_files = [f for f in zf.namelist() if f.endswith('.qgs')]
                    if qgs_files:
                        content = zf.read(qgs_files[0]).decode('utf-8')
                    else:
                        return ConnectorResult(success=False, error="No .qgs file found in .qgz archive")
            else:
                content = file_content.decode('utf-8')

            # Parse XML to extract project info
            import xml.etree.ElementTree as ET
            root = ET.fromstring(content)

            # Extract layers
            layers = []
            for layer in root.findall('.//maplayer'):
                layer_info = {
                    "name": layer.find('layername').text if layer.find('layername') is not None else "Unknown",
                    "type": layer.get('type', 'unknown'),
                    "geometry": layer.get('geometry', 'unknown'),
                }
                datasource = layer.find('datasource')
                if datasource is not None and datasource.text:
                    layer_info["datasource"] = datasource.text[:100]  # Truncate long paths
                layers.append(layer_info)

            # Extract project properties
            title = root.find('.//title')

            metadata = {
                "filename": filename,
                "file_type": "qgis_project",
                "version": root.get('version', 'unknown'),
                "project_title": title.text if title is not None else None,
                "layer_count": len(layers),
                "layers": layers[:20],  # Limit to first 20 layers
                "crs": self._extract_crs(root),
            }

            return ConnectorResult(success=True, data=metadata)

        except Exception as e:
            return ConnectorResult(success=False, error=f"Error processing QGIS project: {str(e)}")

    def _extract_crs(self, root) -> Optional[str]:
        """Extract CRS from QGIS project."""
        try:
            crs = root.find('.//projectCrs/spatialrefsys/authid')
            if crs is not None:
                return crs.text
            return None
        except:
            return None

    async def _process_kml(self, file_content: bytes, filename: str) -> ConnectorResult:
        """Process a KML file."""
        try:
            import xml.etree.ElementTree as ET

            content = file_content.decode('utf-8')
            # Remove namespace for easier parsing
            content = content.replace('xmlns="http://www.opengis.net/kml/2.2"', '')
            root = ET.fromstring(content)

            placemarks = root.findall('.//Placemark')
            folders = root.findall('.//Folder')

            geometry_types = {}
            for pm in placemarks:
                for geom_type in ['Point', 'LineString', 'Polygon', 'MultiGeometry']:
                    if pm.find(f'.//{geom_type}') is not None:
                        geometry_types[geom_type] = geometry_types.get(geom_type, 0) + 1
                        break

            doc_name = root.find('.//Document/name')

            metadata = {
                "filename": filename,
                "file_type": "kml",
                "document_name": doc_name.text if doc_name is not None else None,
                "placemark_count": len(placemarks),
                "folder_count": len(folders),
                "geometry_types": geometry_types,
            }

            return ConnectorResult(success=True, data=metadata)

        except Exception as e:
            return ConnectorResult(success=False, error=f"Error processing KML: {str(e)}")

    async def _process_shapefile(self, file_content: bytes, filename: str) -> ConnectorResult:
        """Process a Shapefile (.shp) - returns basic info since full parsing requires .dbf/.shx."""
        metadata = {
            "filename": filename,
            "file_type": "shapefile",
            "note": "Full shapefile parsing requires .shp, .shx, and .dbf files together. Upload as a zip for complete analysis.",
            "file_size_bytes": len(file_content),
        }
        return ConnectorResult(success=True, data=metadata)

    async def _process_geopackage(self, file_content: bytes, filename: str) -> ConnectorResult:
        """Process a GeoPackage file (.gpkg)."""
        try:
            import sqlite3
            from io import BytesIO
            import tempfile
            import os

            # Write to temp file since sqlite3 needs a file path
            with tempfile.NamedTemporaryFile(delete=False, suffix='.gpkg') as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name

            try:
                conn = sqlite3.connect(tmp_path)
                cursor = conn.cursor()

                # Get layers from gpkg_contents
                cursor.execute("SELECT table_name, data_type, identifier, description, srs_id FROM gpkg_contents")
                layers = []
                for row in cursor.fetchall():
                    layers.append({
                        "name": row[0],
                        "type": row[1],
                        "identifier": row[2],
                        "description": row[3],
                        "srs_id": row[4],
                    })

                # Get geometry columns
                cursor.execute("SELECT table_name, column_name, geometry_type_name FROM gpkg_geometry_columns")
                geometry_info = {row[0]: {"column": row[1], "type": row[2]} for row in cursor.fetchall()}

                conn.close()

                metadata = {
                    "filename": filename,
                    "file_type": "geopackage",
                    "layer_count": len(layers),
                    "layers": layers,
                    "geometry_info": geometry_info,
                }

                return ConnectorResult(success=True, data=metadata)

            finally:
                os.unlink(tmp_path)

        except Exception as e:
            return ConnectorResult(success=False, error=f"Error processing GeoPackage: {str(e)}")


def get_qgis_connector(config: dict = None) -> QGISConnector:
    """Factory function to create a QGIS connector."""
    return QGISConnector(config or {})
