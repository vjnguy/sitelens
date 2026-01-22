from app.connectors.base import BaseConnector, ConnectorResult
from app.services.dxf_parser import DxfParserService
from pydantic import BaseModel
from typing import Optional


class AutoCADConfig(BaseModel):
    """Configuration for AutoCAD connector."""
    watch_folder: Optional[str] = None
    auto_process: bool = True


class AutoCADConnector(BaseConnector):
    """
    Connector for AutoCAD DXF/DWG files.

    Supports:
    - DXF file parsing and metadata extraction
    - DWG file support (future - requires conversion)
    """

    @property
    def connector_type(self) -> str:
        return "autocad"

    @property
    def supported_file_types(self) -> list[str]:
        return ["dxf", "dwg"]

    async def validate_config(self) -> ConnectorResult:
        """Validate the AutoCAD connector configuration."""
        try:
            # Parse config
            config = AutoCADConfig(**self.config)

            # For now, just validate the config structure
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
        """Test the AutoCAD connector."""
        try:
            # For file-based connector, just verify we can import ezdxf
            import ezdxf
            self._is_connected = True
            return ConnectorResult(
                success=True,
                data={"message": "AutoCAD connector ready", "ezdxf_version": ezdxf.__version__}
            )
        except ImportError as e:
            return ConnectorResult(
                success=False,
                error=f"Missing dependency: {str(e)}"
            )

    async def process_file(self, file_content: bytes, filename: str) -> ConnectorResult:
        """
        Process a DXF/DWG file and extract metadata.

        Args:
            file_content: Raw bytes of the file
            filename: Original filename

        Returns:
            ConnectorResult with extracted metadata
        """
        ext = filename.lower().split(".")[-1] if "." in filename else ""

        if ext == "dxf":
            return await self._process_dxf(file_content, filename)
        elif ext == "dwg":
            return await self._process_dwg(file_content, filename)
        else:
            return ConnectorResult(
                success=False,
                error=f"Unsupported file type: {ext}"
            )

    async def _process_dxf(self, file_content: bytes, filename: str) -> ConnectorResult:
        """Process a DXF file."""
        # Validate the file first
        is_valid, error = DxfParserService.validate_dxf(file_content)
        if not is_valid:
            return ConnectorResult(success=False, error=error)

        # Parse and extract metadata
        metadata = DxfParserService.parse_dxf(file_content, filename)

        return ConnectorResult(
            success=True,
            data=metadata.model_dump()
        )

    async def _process_dwg(self, file_content: bytes, filename: str) -> ConnectorResult:
        """Process a DWG file (currently not supported)."""
        # DWG files require conversion - this is a placeholder
        return ConnectorResult(
            success=False,
            error="DWG file support coming soon. Please convert to DXF format."
        )


def get_autocad_connector(config: dict = None) -> AutoCADConnector:
    """Factory function to create an AutoCAD connector."""
    return AutoCADConnector(config or {})
