import ezdxf
from ezdxf.document import Drawing
from io import BytesIO
from typing import Optional
from app.schemas import DxfMetadata


class DxfParserService:
    """Service for parsing and extracting metadata from DXF files."""

    @staticmethod
    def parse_dxf(file_content: bytes, filename: str) -> DxfMetadata:
        """
        Parse a DXF file and extract metadata.

        Args:
            file_content: Raw bytes of the DXF file
            filename: Original filename

        Returns:
            DxfMetadata object with extracted information
        """
        try:
            # Load DXF from bytes
            doc: Drawing = ezdxf.read(BytesIO(file_content))

            # Extract layers
            layers = [layer.dxf.name for layer in doc.layers]

            # Extract blocks
            blocks = [block.name for block in doc.blocks if not block.name.startswith("*")]

            # Count entities by type
            entities_by_type: dict[str, int] = {}
            total_entities = 0

            for entity in doc.modelspace():
                entity_type = entity.dxftype()
                entities_by_type[entity_type] = entities_by_type.get(entity_type, 0) + 1
                total_entities += 1

            # Get drawing extents
            extents = None
            try:
                msp = doc.modelspace()
                if msp:
                    bbox = ezdxf.bbox.extents(msp)
                    if bbox.has_data:
                        extents = {
                            "min_x": bbox.extmin.x,
                            "min_y": bbox.extmin.y,
                            "min_z": bbox.extmin.z,
                            "max_x": bbox.extmax.x,
                            "max_y": bbox.extmax.y,
                            "max_z": bbox.extmax.z,
                        }
            except Exception:
                pass  # Extents calculation failed, continue without it

            # Get DXF version
            version = doc.dxfversion

            # Get units (if available)
            units = None
            try:
                units_value = doc.header.get("$INSUNITS", 0)
                units_map = {
                    0: "Unitless",
                    1: "Inches",
                    2: "Feet",
                    3: "Miles",
                    4: "Millimeters",
                    5: "Centimeters",
                    6: "Meters",
                    7: "Kilometers",
                }
                units = units_map.get(units_value, f"Unknown ({units_value})")
            except Exception:
                pass

            return DxfMetadata(
                filename=filename,
                file_type="dxf",
                version=version,
                layers=layers,
                layer_count=len(layers),
                block_count=len(blocks),
                entity_count=total_entities,
                entities_by_type=entities_by_type,
                units=units,
                extents=extents,
            )

        except Exception as e:
            # Return basic metadata if parsing fails
            return DxfMetadata(
                filename=filename,
                file_type="dxf",
                layers=[],
                layer_count=0,
                block_count=0,
                entity_count=0,
                entities_by_type={},
            )

    @staticmethod
    def validate_dxf(file_content: bytes) -> tuple[bool, Optional[str]]:
        """
        Validate if the file content is a valid DXF file.

        Args:
            file_content: Raw bytes of the file

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            ezdxf.read(BytesIO(file_content))
            return True, None
        except ezdxf.DXFError as e:
            return False, f"Invalid DXF file: {str(e)}"
        except Exception as e:
            return False, f"Error reading file: {str(e)}"
