import os
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from uuid import UUID, uuid4
from typing import Dict, Any

class RealityReportGenerator:
    def __init__(self, templates_dir: str = None):
        if not templates_dir:
            templates_dir = os.path.join(os.path.dirname(__file__), 'templates')
        self.env = Environment(loader=FileSystemLoader(templates_dir))

    def generate_report(self, simulation_id: UUID, data: Dict[str, Any], output_path: str = None) -> str:
        """
        Generates a PDF Reality Report from simulation discovery data using Jinja2 and WeasyPrint.
        """
        template = self.env.get_template('reality_report.html')
        report_id = str(uuid4())
        html_out = template.render(
            simulation_id=str(simulation_id),
            report_id=report_id,
            **data
        )
        
        if not output_path:
            output_path = f"/tmp/report_{report_id}.pdf"
            
        HTML(string=html_out).write_pdf(output_path)
        return output_path
