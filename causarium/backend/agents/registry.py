from enum import Enum
from typing import Dict, Any
from .base_agent import CausariumAgent

class AgentType(str, Enum):
    # Organizational Actors
    EXECUTIVE_CEO = "EXECUTIVE_CEO"
    EXECUTIVE_CFO = "EXECUTIVE_CFO"
    EXECUTIVE_CTO = "EXECUTIVE_CTO"
    BOARD_DIRECTOR = "BOARD_DIRECTOR"
    EMPLOYEE_SENIOR = "EMPLOYEE_SENIOR"
    EMPLOYEE_JUNIOR = "EMPLOYEE_JUNIOR"
    EMPLOYEE_DISGRUNTLED = "EMPLOYEE_DISGRUNTLED"
    
    # Market Actors
    INVESTOR_INSTITUTIONAL = "INVESTOR_INSTITUTIONAL"
    INVESTOR_ACTIVIST = "INVESTOR_ACTIVIST"
    INVESTOR_VC = "INVESTOR_VC"
    COMPETITOR_DIRECT = "COMPETITOR_DIRECT"
    COMPETITOR_ADJACENT = "COMPETITOR_ADJACENT"
    MARKET_MAKER = "MARKET_MAKER"
    CUSTOMER_ENTERPRISE = "CUSTOMER_ENTERPRISE"
    CUSTOMER_CONSUMER = "CUSTOMER_CONSUMER"
    CUSTOMER_CHURNED = "CUSTOMER_CHURNED"
    SUPPLIER_PRIMARY = "SUPPLIER_PRIMARY"
    SUPPLIER_BACKUP = "SUPPLIER_BACKUP"

    # Systemic Actors
    REGULATOR_DOMESTIC = "REGULATOR_DOMESTIC"
    REGULATOR_INTERNATIONAL = "REGULATOR_INTERNATIONAL"
    GOVERNMENT_MINISTRY = "GOVERNMENT_MINISTRY"
    MEDIA_MAINSTREAM = "MEDIA_MAINSTREAM"
    MEDIA_SOCIAL = "MEDIA_SOCIAL"
    ANALYST_FINANCIAL = "ANALYST_FINANCIAL"
    HACKER_STATE = "HACKER_STATE"
    HACKER_CRIMINAL = "HACKER_CRIMINAL"
    WHISTLEBLOWER = "WHISTLEBLOWER"

    # AI Actors
    AI_SYSTEM_FRIENDLY = "AI_SYSTEM_FRIENDLY"
    AI_SYSTEM_ADVERSARIAL = "AI_SYSTEM_ADVERSARIAL"
    AUTONOMOUS_AGENT_MARKET = "AUTONOMOUS_AGENT_MARKET"


DEFAULT_AGENT_CONFIGS: Dict[AgentType, Dict[str, Any]] = {
    AgentType.EXECUTIVE_CEO: {
        "confidence": 0.8,
        "risk_tolerance": 0.7,
        "influence": 0.9,
        "information_access": "HIGH",
    },
    AgentType.REGULATOR_INTERNATIONAL: {
        "confidence": 0.9,
        "risk_tolerance": 0.2,
        "influence": 0.9,
        "information_access": "CLASSIFIED",
    },
    AgentType.EMPLOYEE_DISGRUNTLED: {
        "confidence": 0.4,
        "risk_tolerance": 0.8,
        "influence": 0.2,
        "information_access": "LOW",
        "ethics_threshold": 0.2
    },
    # Default configs can be expanded for all 20+ types.
}

class AgentRegistry:
    @classmethod
    def create_agent(
        cls, 
        agent_type: AgentType, 
        persona_name: str, 
        organization: str, 
        overrides: Dict[str, Any] = None
    ) -> CausariumAgent:
        
        config = DEFAULT_AGENT_CONFIGS.get(agent_type, {}).copy()
        if overrides:
            config.update(overrides)
            
        return CausariumAgent(
            agent_type=agent_type.value,
            persona_name=persona_name,
            organization=organization,
            **config
        )
