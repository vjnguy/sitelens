from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
import uuid
from datetime import datetime

from app.core.supabase import get_supabase_client
from app.schemas import WorkflowCreate, ExecutionCreate

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("/", response_model=dict)
async def create_workflow(workflow: WorkflowCreate):
    """Create a new workflow."""
    try:
        supabase = get_supabase_client()
        data = {
            "id": str(uuid.uuid4()),
            "organization_id": workflow.organization_id,
            "name": workflow.name,
            "description": workflow.description,
            "definition": workflow.definition,
            "is_active": False,
        }
        response = supabase.table("workflows").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_workflows(
    organization_id: Optional[str] = None,
    is_active: Optional[bool] = None,
):
    """List all workflows, optionally filtered."""
    try:
        supabase = get_supabase_client()
        query = supabase.table("workflows").select("*")

        if organization_id:
            query = query.eq("organization_id", organization_id)
        if is_active is not None:
            query = query.eq("is_active", is_active)

        response = query.order("updated_at", desc=True).execute()
        return {"workflows": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get a specific workflow by ID."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("workflows").select("*").eq("id", workflow_id).single().execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Workflow not found")


@router.patch("/{workflow_id}")
async def update_workflow(workflow_id: str, updates: dict):
    """Update a workflow."""
    allowed_fields = {"name", "description", "definition", "is_active"}
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    filtered_updates["updated_at"] = datetime.utcnow().isoformat()

    if not filtered_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    try:
        supabase = get_supabase_client()
        response = supabase.table("workflows").update(filtered_updates).eq("id", workflow_id).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow."""
    try:
        supabase = get_supabase_client()
        supabase.table("workflows").delete().eq("id", workflow_id).execute()
        return {"success": True, "message": "Workflow deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{workflow_id}/activate")
async def activate_workflow(workflow_id: str):
    """Activate a workflow."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("workflows").update({
            "is_active": True,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", workflow_id).execute()
        return {"success": True, "workflow": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{workflow_id}/deactivate")
async def deactivate_workflow(workflow_id: str):
    """Deactivate a workflow."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("workflows").update({
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", workflow_id).execute()
        return {"success": True, "workflow": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def execute_workflow_async(workflow_id: str, execution_id: str, trigger_data: dict):
    """Execute a workflow asynchronously."""
    supabase = get_supabase_client()

    try:
        # Get workflow definition
        workflow = supabase.table("workflows").select("*").eq("id", workflow_id).single().execute()
        definition = workflow.data.get("definition", {})

        # Simple workflow execution (placeholder)
        # In a full implementation, this would:
        # 1. Parse the workflow definition
        # 2. Execute each node in order
        # 3. Handle branching and conditions
        # 4. Call appropriate services for each action

        result = {
            "nodes_executed": len(definition.get("nodes", [])),
            "trigger_data": trigger_data,
            "status": "completed",
        }

        # Update execution
        supabase.table("executions").update({
            "status": "completed",
            "result": result,
            "completed_at": datetime.utcnow().isoformat(),
        }).eq("id", execution_id).execute()

    except Exception as e:
        # Mark execution as failed
        supabase.table("executions").update({
            "status": "failed",
            "result": {"error": str(e)},
            "completed_at": datetime.utcnow().isoformat(),
        }).eq("id", execution_id).execute()


@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    background_tasks: BackgroundTasks,
    trigger_data: Optional[dict] = None,
):
    """Trigger a workflow execution."""
    # Verify workflow exists and is active
    try:
        supabase = get_supabase_client()
        workflow = supabase.table("workflows").select("*").eq("id", workflow_id).single().execute()

        if not workflow.data.get("is_active"):
            raise HTTPException(status_code=400, detail="Workflow is not active")

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Create execution record
    execution_id = str(uuid.uuid4())
    execution_data = {
        "id": execution_id,
        "workflow_id": workflow_id,
        "status": "pending",
        "trigger_data": trigger_data or {},
    }

    try:
        supabase.table("executions").insert(execution_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create execution: {e}")

    # Execute workflow in background
    background_tasks.add_task(
        execute_workflow_async,
        workflow_id,
        execution_id,
        trigger_data or {}
    )

    return {
        "execution_id": execution_id,
        "status": "pending",
        "message": "Workflow execution started"
    }


@router.get("/{workflow_id}/executions")
async def list_workflow_executions(
    workflow_id: str,
    limit: int = 20,
    offset: int = 0,
):
    """List executions for a specific workflow."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("executions").select("*").eq(
            "workflow_id", workflow_id
        ).order("started_at", desc=True).range(offset, offset + limit - 1).execute()

        return {"executions": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/executions/{execution_id}")
async def get_execution(execution_id: str):
    """Get details of a specific execution."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("executions").select("*").eq("id", execution_id).single().execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Execution not found")
