from abc import ABC, abstractmethod
from typing import Any, Optional
from pydantic import BaseModel


class ConnectorConfig(BaseModel):
    """Base configuration for connectors."""
    pass


class ConnectorResult(BaseModel):
    """Result from connector operations."""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None


class BaseConnector(ABC):
    """
    Abstract base class for all engineering tool connectors.

    Each connector must implement methods for:
    - Validating configuration
    - Testing connection
    - Processing files
    - Extracting metadata
    """

    def __init__(self, config: dict):
        self.config = config
        self._is_connected = False

    @property
    @abstractmethod
    def connector_type(self) -> str:
        """Return the type identifier for this connector."""
        pass

    @property
    @abstractmethod
    def supported_file_types(self) -> list[str]:
        """Return list of supported file extensions."""
        pass

    @abstractmethod
    async def validate_config(self) -> ConnectorResult:
        """Validate the connector configuration."""
        pass

    @abstractmethod
    async def test_connection(self) -> ConnectorResult:
        """Test if the connector can successfully connect."""
        pass

    @abstractmethod
    async def process_file(self, file_content: bytes, filename: str) -> ConnectorResult:
        """
        Process a file and extract metadata.

        Args:
            file_content: Raw bytes of the file
            filename: Original filename

        Returns:
            ConnectorResult with extracted metadata
        """
        pass

    def is_file_supported(self, filename: str) -> bool:
        """Check if a file type is supported by this connector."""
        ext = filename.lower().split(".")[-1] if "." in filename else ""
        return ext in self.supported_file_types

    @property
    def is_connected(self) -> bool:
        """Return connection status."""
        return self._is_connected
