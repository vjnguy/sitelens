"""
PDF Report Generator Service
Generates professional property analysis reports using WeasyPrint.
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Optional
import tempfile

from jinja2 import Environment, FileSystemLoader

from app.schemas.planning import PropertyAnalysis, ReportRequest

# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"


class ReportService:
    """Generates PDF property reports."""

    def __init__(self):
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=True,
        )

    def _render_html(self, analysis: PropertyAnalysis, request: ReportRequest) -> str:
        """Render the report as HTML."""
        template = self.jinja_env.get_template("property_report.html")

        # Prepare context
        context = {
            "title": f"Property Report - {analysis.location.address}",
            "generated_at": datetime.now().strftime("%d %B %Y at %H:%M"),
            "address": analysis.location.address,
            "state": analysis.location.state.value,
            "lat": analysis.location.lat,
            "lon": analysis.location.lon,
            "lga": analysis.location.lga,
            "lot_plan": analysis.location.lot_plan,
            "lot_area": analysis.location.lot_area_sqm,
            # Zoning
            "zone_code": analysis.zoning.zone_code,
            "zone_name": analysis.zoning.zone_name,
            "zone_category": analysis.zoning.zone_category.value,
            "zone_description": analysis.zoning.description,
            "permitted_uses": analysis.zoning.permitted_uses,
            "prohibited_uses": analysis.zoning.prohibited_uses,
            "zone_objectives": analysis.zoning.objectives,
            # Development controls
            "controls": analysis.development_controls,
            "height_limit": analysis.development_controls.height_limit,
            "fsr": analysis.development_controls.fsr,
            "setbacks": analysis.development_controls.setbacks,
            "estimated_gfa": analysis.development_controls.estimated_gfa,
            "estimated_storeys": analysis.development_controls.estimated_storeys,
            # Overlays
            "hazards": analysis.overlays.hazards,
            "heritage": analysis.overlays.heritage,
            "environmental": analysis.overlays.environmental,
            "has_critical_hazards": analysis.overlays.has_critical_hazards,
            "has_heritage": analysis.overlays.has_heritage_constraints,
            # Development potential
            "potential": analysis.development_potential,
            "scenarios": analysis.development_potential.scenarios,
            "envelope": analysis.development_potential.building_envelope,
            "subdivision": analysis.development_potential.subdivision,
            "opportunities": analysis.development_potential.key_opportunities,
            "constraints": analysis.development_potential.key_constraints,
            # Metadata
            "confidence": int(analysis.confidence_score * 100),
            "data_sources": analysis.data_sources,
            "limitations": analysis.limitations,
            "include_maps": request.include_maps,
        }

        return template.render(**context)

    def generate_pdf(
        self,
        analysis: PropertyAnalysis,
        request: ReportRequest,
        output_path: Optional[str] = None,
    ) -> str:
        """
        Generate a PDF report.

        Args:
            analysis: Property analysis data
            request: Report request options
            output_path: Optional path for the PDF. If not provided, uses temp file.

        Returns:
            Path to the generated PDF file.
        """
        try:
            from weasyprint import HTML, CSS
        except ImportError:
            raise ImportError("WeasyPrint is required for PDF generation. Install with: pip install weasyprint")

        # Render HTML
        html_content = self._render_html(analysis, request)

        # Generate PDF
        if output_path is None:
            output_path = tempfile.mktemp(suffix=".pdf")

        html = HTML(string=html_content)

        # Add custom CSS
        css = CSS(string="""
            @page {
                size: A4;
                margin: 2cm;
                @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10px;
                    color: #666;
                }
            }
        """)

        html.write_pdf(output_path, stylesheets=[css])

        return output_path

    def generate_summary_pdf(
        self,
        analysis: PropertyAnalysis,
        output_path: Optional[str] = None,
    ) -> str:
        """Generate a shorter summary report."""
        # Would use a different template
        request = ReportRequest(
            lat=analysis.location.lat,
            lon=analysis.location.lon,
            state=analysis.location.state,
            report_type="summary",
            include_maps=False,
            include_appendices=False,
        )
        return self.generate_pdf(analysis, request, output_path)


# Singleton instance
report_service = ReportService()
