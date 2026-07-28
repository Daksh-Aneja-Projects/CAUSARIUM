from uuid import UUID
from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel
from enum import Enum

class SimulationStatus(str, Enum):
    QUEUED = 'QUEUED'
    RUNNING = 'RUNNING'
    DISCOVERY = 'DISCOVERY'
    COMPLETE = 'COMPLETE'
    FAILED = 'FAILED'

class RunStatus(str, Enum):
    RUNNING = 'RUNNING'
    COMPLETE = 'COMPLETE'
    FAILED = 'FAILED'

class RunConfig(BaseModel):
    run_count: int
    tick_depth: int
    constraint_params: Dict[str, float]

class DiscoveryConfig(BaseModel):
    enable_attractors: bool = True
    enable_choke_points: bool = True
    enable_butterfly_scan: bool = True
    enable_singularity_finder: bool = True

class Simulation(BaseModel):
    simulation_id: UUID
    title: str
    context: str
    status: SimulationStatus
    tenant_id: UUID
    created_at: datetime
    completed_at: Optional[datetime] = None
    run_config: RunConfig
    discovery_config: DiscoveryConfig

class SimulationRun(BaseModel):
    run_id: UUID
    simulation_id: UUID
    seed: int
    status: RunStatus
    tick_count: int
    terminal_outcome: Optional[str] = None
    reality_dna: Dict[str, float]
    event_log_id: UUID
