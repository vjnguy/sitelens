from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class OrganizationBase(BaseModel):
    name: str


class OrganizationCreate(OrganizationBase):
    pass


class Organization(OrganizationBase):
    id: str
    created_at: datetime


class ConnectorBase(BaseModel):
    name: str
    type: str
    config: dict = {}


class ConnectorCreate(ConnectorBase):
    organization_id: str


class Connector(ConnectorBase):
    id: str
    organization_id: str
    status: str
    created_at: datetime


class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    definition: dict


class WorkflowCreate(WorkflowBase):
    organization_id: str


class Workflow(WorkflowBase):
    id: str
    organization_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ExecutionBase(BaseModel):
    workflow_id: str
    status: str
    trigger_data: Optional[dict] = None


class ExecutionCreate(ExecutionBase):
    pass


class Execution(ExecutionBase):
    id: str
    result: Optional[dict] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class CadFileBase(BaseModel):
    filename: str
    file_type: str


class CadFileCreate(CadFileBase):
    organization_id: str
    connector_id: Optional[str] = None
    file_path: str
    metadata: Optional[dict] = None


class CadFile(CadFileBase):
    id: str
    organization_id: str
    connector_id: Optional[str]
    file_path: str
    metadata: Optional[dict]
    created_at: datetime


class DxfMetadata(BaseModel):
    filename: str
    file_type: str = "dxf"
    version: Optional[str] = None
    layers: list[str] = []
    layer_count: int = 0
    block_count: int = 0
    entity_count: int = 0
    entities_by_type: dict[str, int] = {}
    units: Optional[str] = None
    extents: Optional[dict] = None


class FileUploadResponse(BaseModel):
    success: bool
    file_id: Optional[str] = None
    metadata: Optional[DxfMetadata] = None
    message: str
