"""
AI API Endpoints
Provides endpoints for AI-powered spatial analysis and natural language queries.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Optional
from pydantic import BaseModel
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


class QueryRequest(BaseModel):
    query: str
    context: Optional[dict] = None
    conversation_history: Optional[list[dict]] = None


class QueryResponse(BaseModel):
    text: str
    code: Optional[str] = None
    type: str


class CodeGenerationRequest(BaseModel):
    description: str
    context: Optional[dict] = None


class CodeGenerationResponse(BaseModel):
    code: str
    explanation: str


class AnalyzeRequest(BaseModel):
    features: list[dict]
    analysis_type: str = "summary"


class AnalyzeResponse(BaseModel):
    success: bool
    featureCount: Optional[int] = None
    geometryTypes: Optional[dict] = None
    propertiesSummary: Optional[dict] = None
    insights: Optional[list[str]] = None
    error: Optional[str] = None


class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None
    metadata: Optional[dict] = None


class ConversationRequest(BaseModel):
    project_id: str
    messages: list[Message]
    context: Optional[dict] = None


@router.post("/query")
async def process_query(request: QueryRequest) -> QueryResponse:
    """
    Process a natural language query about spatial data.

    Returns an AI response with optional generated code.
    """
    try:
        result = await ai_service.process_query(
            query=request.query,
            context=request.context,
            conversation_history=request.conversation_history,
        )
        return QueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-code")
async def generate_code(request: CodeGenerationRequest) -> CodeGenerationResponse:
    """
    Generate spatial analysis code from a natural language description.

    Returns generated JavaScript code with explanation.
    """
    try:
        result = await ai_service.generate_code(
            description=request.description,
            context=request.context,
        )
        return CodeGenerationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_features(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Analyze a set of GeoJSON features and provide insights.

    Returns analysis results including statistics and AI-generated insights.
    """
    try:
        result = await ai_service.analyze_features(
            features=request.features,
            analysis_type=request.analysis_type,
        )
        return AnalyzeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(request: ConversationRequest) -> dict:
    """
    Continue a conversation with the AI assistant.

    Maintains conversation context and provides relevant responses.
    """
    try:
        # Convert messages to the format expected by the AI service
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages[:-1]  # All but the last message
        ]

        # Process the latest message
        latest = request.messages[-1] if request.messages else None
        if not latest:
            raise HTTPException(status_code=400, detail="No messages provided")

        result = await ai_service.process_query(
            query=latest.content,
            context=request.context,
            conversation_history=history,
        )

        return {
            "response": result,
            "conversation_id": request.project_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_suggestions(
    context_type: str = "general",
    layer_type: Optional[str] = None,
) -> list[str]:
    """
    Get suggested queries based on context.

    Returns a list of suggested natural language queries.
    """
    suggestions = {
        "general": [
            "What is the total area of selected features?",
            "Buffer all selected points by 100 meters",
            "Find features within 500m of the center",
            "What zoning applies to this location?",
            "Show me flood-affected areas",
        ],
        "polygon": [
            "Calculate the area of each polygon",
            "Find polygons larger than 1 hectare",
            "Dissolve polygons by property type",
            "Create a 50m buffer around these polygons",
            "Find the centroid of each polygon",
        ],
        "point": [
            "Cluster nearby points",
            "Find the nearest neighbor for each point",
            "Create a heatmap from these points",
            "Buffer each point by 200 meters",
            "Count points within each polygon",
        ],
        "line": [
            "Calculate the total length",
            "Simplify these lines",
            "Find where lines intersect",
            "Buffer these lines by 10 meters",
            "Split lines at intersections",
        ],
        "property": [
            "What is the zoning for this property?",
            "Are there any flood overlays?",
            "What are the building setbacks?",
            "Is this in a heritage area?",
            "What are the permitted uses?",
        ],
    }

    # Combine suggestions based on context
    result = suggestions.get("general", [])
    if layer_type and layer_type in suggestions:
        result = suggestions[layer_type] + result
    if context_type == "property":
        result = suggestions["property"] + result

    return result[:10]  # Return top 10 suggestions
