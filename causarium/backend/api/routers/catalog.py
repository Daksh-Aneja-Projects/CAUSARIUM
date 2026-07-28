"""Catalogue API — agent archetypes, analysis lenses, and scenario templates."""

from typing import Any, Dict

from fastapi import APIRouter

from ..catalog import agent_catalog, scenario_catalog, LENSES

router = APIRouter()


@router.get("/agents")
async def get_agents() -> Dict[str, Any]:
    """All agent archetypes, grouped by category, for the drag-and-drop roster."""
    return agent_catalog()


@router.get("/scenarios")
async def get_scenarios() -> Dict[str, Any]:
    """Industry × intent scenario templates, each with a population, physics, and lens."""
    return scenario_catalog()


@router.get("/lenses")
async def get_lenses() -> Dict[str, Any]:
    """Analysis lenses that adapt the same views to the kind of question being asked."""
    return {"lenses": list(LENSES.values())}
