from fastapi import APIRouter, BackgroundTasks
from uuid import UUID, uuid4
from typing import Dict, Any
from ...reports.generator import RealityReportGenerator

router = APIRouter(prefix="/v1/simulations", tags=["reports"])
generator = RealityReportGenerator()

@router.post("/{simulation_id}/report")
async def generate_reality_report(simulation_id: UUID, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Triggers the generation of a Reality Report PDF.
    """
    report_id = str(uuid4())
    
    # Mock data; would normally fetch from Discovery DB
    data = {
        "executive_summary": "Auto-generated analysis of convergent scenarios and causal pathways.",
        "attractors": [],
        "choke_points": [],
        "hidden_causal_chains": [],
        "recommended_interventions": []
    }
    
    # Run PDF generation in background
    background_tasks.add_task(generator.generate_report, simulation_id, data, f"/tmp/report_{report_id}.pdf")
    
    return {
        "report_id": report_id,
        "download_url": f"https://api.causarium.io/v1/reports/{report_id}",
        "format": "PDF",
        "pages": 12 # Mock
    }
