"""
AI Service for SiteLens
Provides Claude AI integration for natural language queries, code generation,
and automated insights.
"""

import json
from typing import Optional, AsyncGenerator
from datetime import datetime
import httpx

# Anthropic API client would be imported in production
# from anthropic import AsyncAnthropic


class AIService:
    """
    AI Service for spatial analysis and natural language processing.
    Uses Claude AI for intelligent query processing.
    """

    SYSTEM_PROMPT = """You are SiteLens AI, an intelligent assistant for a GIS (Geographic Information System) platform focused on property and site analysis in Australia.

Your capabilities include:
1. **Spatial Analysis**: Help users understand spatial data, calculate areas, distances, and relationships between features.
2. **Property Insights**: Provide information about zoning, overlays, and planning controls.
3. **Code Generation**: Generate JavaScript code using the Turf.js library for spatial analysis.
4. **Data Interpretation**: Explain GIS data and help users understand map layers and features.

When generating code, use the following available functions:
- `gis.*` - Turf.js spatial analysis functions (area, buffer, intersect, union, etc.)
- `sitelens.*` - Helper functions (filterByProperty, statistics, findNearby, etc.)
- `format.*` - Formatting helpers (area, length, coordinates)
- `getLayer(name)` - Get a layer's data by name or ID
- `selectedFeatures` - Currently selected features on the map
- `mapBounds` - Current map viewport bounds

Always provide clear, concise responses. When showing code, explain what it does.
For Australian property data, reference:
- NSW: NSW Spatial Services, ePlanning
- VIC: VicPlan, DELWP
- QLD: QSpatial, Queensland Globe
- Common zoning codes: R1-R5 (Residential), B1-B7 (Business), IN1-IN4 (Industrial), E1-E4 (Environmental)
"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the AI service with optional API key."""
        self.api_key = api_key
        # In production: self.client = AsyncAnthropic(api_key=api_key)

    async def process_query(
        self,
        query: str,
        context: Optional[dict] = None,
        conversation_history: Optional[list[dict]] = None,
    ) -> dict:
        """
        Process a natural language query about spatial data.

        Args:
            query: User's natural language query
            context: Optional context including current layers, selection, etc.
            conversation_history: Previous messages in the conversation

        Returns:
            AI response with text and optional generated code
        """
        # Build context message
        context_parts = []
        if context:
            if context.get("layers"):
                layer_info = ", ".join(
                    [f"{l['name']} ({l['featureCount']} features)" for l in context["layers"]]
                )
                context_parts.append(f"Available layers: {layer_info}")

            if context.get("selectedFeatures"):
                context_parts.append(
                    f"Selected features: {len(context['selectedFeatures'])} features selected"
                )

            if context.get("mapBounds"):
                bounds = context["mapBounds"]
                context_parts.append(
                    f"Map bounds: {bounds['west']:.4f}, {bounds['south']:.4f} to {bounds['east']:.4f}, {bounds['north']:.4f}"
                )

        context_message = "\n".join(context_parts) if context_parts else ""

        # Build messages
        messages = []
        if conversation_history:
            messages.extend(conversation_history)

        user_content = query
        if context_message:
            user_content = f"Context:\n{context_message}\n\nQuery: {query}"

        messages.append({"role": "user", "content": user_content})

        # In production, this would call the Claude API
        # For now, return a mock response
        return await self._mock_response(query, context)

    async def generate_code(
        self,
        description: str,
        context: Optional[dict] = None,
    ) -> dict:
        """
        Generate spatial analysis code from a natural language description.

        Args:
            description: Description of what the code should do
            context: Optional context about available data

        Returns:
            Generated code with explanation
        """
        prompt = f"""Generate JavaScript code for the following spatial analysis task:
{description}

The code should:
1. Use the available gis.* and sitelens.* functions
2. Include comments explaining each step
3. Return the result (a FeatureCollection, feature, or value)
4. Handle edge cases gracefully

Context: {json.dumps(context) if context else 'No specific context provided'}
"""

        # Mock response for development
        return await self._mock_code_generation(description)

    async def analyze_features(
        self,
        features: list[dict],
        analysis_type: str = "summary",
    ) -> dict:
        """
        Analyze a set of features and provide insights.

        Args:
            features: List of GeoJSON features to analyze
            analysis_type: Type of analysis (summary, comparison, trends)

        Returns:
            Analysis results with insights
        """
        if not features:
            return {
                "success": False,
                "error": "No features provided for analysis",
            }

        # Calculate basic statistics
        total_area = 0
        geometry_types = {}
        properties_summary = {}

        for feature in features:
            geom_type = feature.get("geometry", {}).get("type", "Unknown")
            geometry_types[geom_type] = geometry_types.get(geom_type, 0) + 1

            props = feature.get("properties", {})
            for key, value in (props or {}).items():
                if key not in properties_summary:
                    properties_summary[key] = {"count": 0, "types": set()}
                properties_summary[key]["count"] += 1
                properties_summary[key]["types"].add(type(value).__name__)

        # Convert sets to lists for JSON serialization
        for key in properties_summary:
            properties_summary[key]["types"] = list(properties_summary[key]["types"])

        return {
            "success": True,
            "featureCount": len(features),
            "geometryTypes": geometry_types,
            "propertiesSummary": properties_summary,
            "insights": [
                f"Dataset contains {len(features)} features",
                f"Geometry types: {', '.join(geometry_types.keys())}",
                f"Properties available: {', '.join(properties_summary.keys())}",
            ],
        }

    async def _mock_response(self, query: str, context: Optional[dict]) -> dict:
        """Generate a mock response for development."""
        query_lower = query.lower()

        # Check for common query types
        if "buffer" in query_lower:
            return {
                "text": "To create a buffer around selected features, you can use the `gis.buffer()` function. Here's an example:",
                "code": """// Buffer selected features by 100 meters
const buffered = selectedFeatures.map(f =>
  gis.buffer(f, 100, { units: 'meters' })
).filter(Boolean);

// Combine into a feature collection
return gis.featureCollection(buffered);""",
                "type": "code_generation",
            }

        if "area" in query_lower or "size" in query_lower:
            return {
                "text": "To calculate the area of selected features, use the `gis.area()` function which returns the area in square meters:",
                "code": """// Calculate total area of selected polygons
const areas = selectedFeatures
  .filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
  .map(f => gis.area(f));

const totalArea = areas.reduce((sum, a) => sum + a, 0);
console.log('Total area:', format.area(totalArea));
return { totalArea, formattedArea: format.area(totalArea) };""",
                "type": "code_generation",
            }

        if "zoning" in query_lower:
            return {
                "text": """In Australian planning systems, common zoning codes include:
- **Residential (R1-R5)**: R1 General Residential, R2 Low Density, R3 Medium Density, R4 High Density, R5 Large Lot
- **Business (B1-B7)**: B1 Neighbourhood Centre, B2 Local Centre, B3 Commercial Core, B4 Mixed Use
- **Industrial (IN1-IN4)**: IN1 General Industrial, IN2 Light Industrial, IN3 Heavy Industrial

To check zoning for a location, use the property search feature or query the state planning portal.""",
                "type": "information",
            }

        if "flood" in query_lower or "overlay" in query_lower:
            return {
                "text": """Planning overlays in Australia include:
- **Flood Planning (FP)**: Areas affected by 1 in 100 year flood events
- **Bushfire (BPA/BAL)**: Bushfire Attack Level ratings
- **Heritage (H)**: Heritage conservation areas
- **Environmental (E)**: Environmental protection zones

You can check overlays for a specific location using the property report feature.""",
                "type": "information",
            }

        # Default response
        return {
            "text": f"I understand you're asking about: {query}\n\nCould you provide more details about what specific analysis or information you need? I can help with:\n- Spatial analysis (buffer, intersect, distance)\n- Property information (zoning, overlays)\n- Code generation for custom analysis\n- Data interpretation",
            "type": "clarification",
        }

    async def _mock_code_generation(self, description: str) -> dict:
        """Generate mock code for development."""
        desc_lower = description.lower()

        if "filter" in desc_lower:
            return {
                "code": """// Filter features by property
const layer = getLayer('your-layer-name');
if (!layer) return null;

const filtered = sitelens.filterByProperty(layer, 'propertyName', 'value');
console.log('Filtered:', filtered.features.length, 'features');
return filtered;""",
                "explanation": "This code filters features from a layer based on a property value. Replace 'propertyName' and 'value' with your actual filter criteria.",
            }

        if "intersect" in desc_lower:
            return {
                "code": """// Find intersecting features
const layer1 = getLayer('layer-1');
const layer2 = getLayer('layer-2');
if (!layer1 || !layer2) return null;

const intersecting = layer1.features.filter(f1 =>
  layer2.features.some(f2 => gis.booleanIntersects(f1, f2))
);

return gis.featureCollection(intersecting);""",
                "explanation": "This code finds all features from layer 1 that intersect with any feature in layer 2.",
            }

        return {
            "code": f"""// Custom analysis: {description}
// TODO: Implement the specific analysis logic
const layer = getLayer('your-layer');
if (!layer) return null;

// Add your analysis here
console.log('Layer has', layer.features.length, 'features');
return layer;""",
            "explanation": f"Placeholder code for: {description}. Customize this based on your specific needs.",
        }


# Singleton instance
ai_service = AIService()
