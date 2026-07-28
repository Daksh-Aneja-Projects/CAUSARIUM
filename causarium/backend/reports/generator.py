"""
Reality Report generation.

Renders a Jinja2 HTML template and converts it to PDF with xhtml2pdf (pisa) — a
pure-Python HTML→PDF engine (backed by reportlab) that runs identically on every
platform with no native system libraries required.
"""

import os
from io import BytesIO
from typing import Any, Dict, Optional
from uuid import uuid4

from jinja2 import Environment, FileSystemLoader, select_autoescape


class RealityReportGenerator:
    def __init__(self, templates_dir: Optional[str] = None):
        if not templates_dir:
            templates_dir = os.path.join(os.path.dirname(__file__), "templates")
        self.env = Environment(
            loader=FileSystemLoader(templates_dir),
            autoescape=select_autoescape(["html", "xml"]),
        )

    def render_html(self, simulation_id: str, data: Dict[str, Any]) -> str:
        template = self.env.get_template("reality_report.html")
        report_id = str(uuid4())
        return template.render(
            simulation_id=str(simulation_id), report_id=report_id, **data
        )

    def generate_report(
        self, simulation_id: str, data: Dict[str, Any], output_path: Optional[str] = None
    ) -> str:
        """Render the report to a PDF file and return its path."""
        from xhtml2pdf import pisa  # local import keeps module import light

        html_out = self.render_html(simulation_id, data)
        if not output_path:
            output_path = os.path.join(
                os.getcwd(), f"report_{simulation_id}.pdf"
            )

        with open(output_path, "wb") as fh:
            result = pisa.CreatePDF(src=html_out, dest=fh)
        if result.err:
            raise RuntimeError(f"PDF generation failed with {result.err} error(s)")
        return output_path

    def generate_report_bytes(self, simulation_id: str, data: Dict[str, Any]) -> bytes:
        """Render the report to PDF bytes (for streaming HTTP responses)."""
        from xhtml2pdf import pisa

        html_out = self.render_html(simulation_id, data)
        buffer = BytesIO()
        result = pisa.CreatePDF(src=html_out, dest=buffer)
        if result.err:
            raise RuntimeError(f"PDF generation failed with {result.err} error(s)")
        return buffer.getvalue()
