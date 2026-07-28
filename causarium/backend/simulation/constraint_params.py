from pydantic import BaseModel, ConfigDict, Field

class ConstraintParams(BaseModel):
    """
    Reality Physics is implemented as a set of numerical constraint parameters
    that modify the simulation substrate.
    """
    # Enforce field bounds on assignment too, so live injections can't push a
    # parameter out of its valid range (the injector catches the rejection).
    model_config = ConfigDict(validate_assignment=True)

    entropy_rate: float = Field(
        0.3, ge=0.0, le=1.0, 
        description="Rate at which organized systems tend toward disorder"
    )
    cascade_coefficient: float = Field(
        1.5, ge=1.0, le=5.0, 
        description="Multiplier applied to downstream effects of large events"
    )
    trust_decay_rate: float = Field(
        0.2, ge=0.0, le=1.0, 
        description="Rate at which inter-agent trust erodes without positive interaction"
    )
    adaptation_speed: float = Field(
        0.5, ge=0.0, le=1.0, 
        description="Global modifier on how fast agents update beliefs"
    )
    information_friction: int = Field(
        2, ge=0, le=10, 
        description="Delay between an event occurring and agents learning of it"
    )
    cooperation_incentive: float = Field(
        1.0, ge=0.5, le=2.0, 
        description="Baseline payoff multiplier for cooperative vs competitive behavior"
    )
    black_swan_probability: float = Field(
        0.01, ge=0.0, le=0.05, 
        description="Per-tick probability of a random exogenous shock event"
    )
