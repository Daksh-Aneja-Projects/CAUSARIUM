import React from 'react';

// Premium inline-SVG icon set for CAUSARIUM (futuristic dark-neon reality-intelligence app).
// All glyphs are 24x24 line-art, driven by currentColor so the `color` prop / CSS color drives them.
// Replaces emoji usage app-wide.

export type IconName =
  // actions / status / meta
  | 'constellation' | 'intervene' | 'report' | 'pause' | 'play' | 'inject' | 'cooperation'
  | 'launch' | 'close' | 'similar' | 'graph' | 'dna' | 'clock' | 'actors' | 'dot' | 'search' | 'plus'
  // lenses
  | 'lens-risk' | 'lens-strategy' | 'lens-crisis' | 'lens-negotiation' | 'lens-forecast' | 'lens-innovation'
  // agent roles
  | 'role-executive' | 'role-finance' | 'role-tech' | 'role-board' | 'role-employee' | 'role-insider'
  | 'role-investor' | 'role-competitor' | 'role-customer' | 'role-supplier' | 'role-regulator'
  | 'role-government' | 'role-media' | 'role-analyst' | 'role-hacker' | 'role-whistleblower'
  | 'role-ai' | 'role-ai-adversarial' | 'role-algo';

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

// Each entry returns the inner SVG markup for a 24x24 viewBox.
// Keep them minimal, consistent line-art (Lucide/Feather-grade).
const PATHS: Record<IconName, React.ReactNode> = {
  // ----- actions / status / meta -----
  constellation: (
    <>
      <circle cx="5" cy="6" r="1.4" />
      <circle cx="18" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="7" cy="18" r="1.4" />
      <circle cx="19" cy="17" r="1.4" />
      <path d="M6.3 6.6 10.6 11M17 6l-3.6 4.5M11 13.2 7.8 16.7M13.4 12.7 17.6 15.9" />
    </>
  ),
  intervene: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  report: (
    <>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4M8 12h8M8 16h8M8 8h3" />
    </>
  ),
  pause: <path d="M9 5v14M15 5v14" />,
  play: <path d="M7 4.5v15l13-7.5-13-7.5Z" />,
  inject: (
    <>
      <circle cx="12" cy="17" r="4.5" />
      <path d="M12 2v6M9 5l3 3 3-3" />
    </>
  ),
  cooperation: (
    <>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </>
  ),
  launch: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M13 6 8 13h4l-1 5 5-7h-4l1-5Z" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  similar: (
    <>
      <circle cx="9.5" cy="12" r="5.5" />
      <circle cx="14.5" cy="12" r="5.5" />
    </>
  ),
  graph: (
    <>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M7.8 7.6 16 6.4M6.6 8.9 6.8 15M8.6 16.3 15.4 17.5M17.3 8 17 16" />
    </>
  ),
  dna: (
    <>
      <path d="M8 3c0 4.5 8 5.5 8 9s-8 4.5-8 9" />
      <path d="M16 3c0 4.5-8 5.5-8 9s8 4.5 8 9" />
      <path d="M9 6h6M8 9.5h8M8 14.5h8M9 18h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  actors: (
    <>
      <circle cx="8" cy="9" r="2.6" />
      <circle cx="16" cy="9" r="2.6" />
      <path d="M3.5 19c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5M12.5 15.4c.9-.6 2-.9 3.5-.9 2.5 0 4.5 1.7 4.5 4.5" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,

  // ----- lenses -----
  'lens-risk': (
    <>
      <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3Z" />
      <path d="M12 8v4M12 15.5h.01" />
    </>
  ),
  'lens-strategy': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  'lens-crisis': (
    <>
      <path d="M12 4l8.5 15h-17L12 4Z" />
      <path d="M12 10v4M12 16.5h.01" />
    </>
  ),
  'lens-negotiation': (
    <>
      <path d="M3 12l3-2 4 3 2-1 3 2" />
      <path d="M21 12l-3-2-3 2M12 12l2 2c.7.7-.3 1.9-1.2 1.2L11 14" />
      <path d="M6 10V7M18 10V7" />
    </>
  ),
  'lens-forecast': (
    <>
      <path d="M4 20a11 11 0 0 1 16 0" />
      <path d="M8 20a7 7 0 0 1 8 0" />
      <path d="M12 20l6-9" />
      <circle cx="18" cy="11" r="1.4" />
    </>
  ),
  'lens-innovation': (
    <>
      <path d="M9 15a5 5 0 1 1 6 0c-.8.6-1 1.2-1 2H10c0-.8-.2-1.4-1-2Z" />
      <path d="M10 20h4M10.5 22h3" />
    </>
  ),

  // ----- agent roles -----
  'role-executive': (
    <>
      <path d="M8 3l4 3 4-3" />
      <path d="M12 6l-2 4 2 11 2-11-2-4Z" />
      <path d="M8 3 6 6M16 3l2 3" />
    </>
  ),
  'role-finance': (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V8M17 20v-9" />
    </>
  ),
  'role-tech': (
    <>
      <rect x="8" y="8" width="8" height="8" rx="1" />
      <path d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3" />
    </>
  ),
  'role-board': (
    <>
      <path d="M4 9l8-5 8 5H4Z" />
      <path d="M6 9v8M10 9v8M14 9v8M18 9v8M4 20h16" />
    </>
  ),
  'role-employee': (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  'role-insider': (
    <>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.8-6 6.5-6 1.4 0 2.7.4 3.7 1" />
      <path d="M19 8v4M19 15.5h.01" />
    </>
  ),
  'role-investor': (
    <>
      <ellipse cx="12" cy="7" rx="6" ry="2.5" />
      <path d="M6 7v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" />
      <path d="M6 12v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
    </>
  ),
  'role-competitor': (
    <>
      <path d="M4 4l9 9M6 15l3-3M4 4l3 .3.3 3" />
      <path d="M20 4l-9 9M18 15l-3-3M20 4l-3 .3-.3 3" />
      <path d="M6 20l3-3M18 20l-3-3" />
    </>
  ),
  'role-customer': (
    <>
      <path d="M4 5h2l2 11h9l2-8H7" />
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </>
  ),
  'role-supplier': (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  'role-regulator': (
    <>
      <path d="M12 3v18M7 21h10" />
      <path d="M5 8h14M5 8l-2.5 5a3 3 0 0 0 5 0L5 8ZM19 8l-2.5 5a3 3 0 0 0 5 0L19 8Z" />
      <circle cx="12" cy="4" r="1" />
    </>
  ),
  'role-government': (
    <>
      <path d="M3 21h18M4 21V10h16v11M4 10l8-6 8 6" />
      <path d="M8 21v-6M12 21v-6M16 21v-6" />
    </>
  ),
  'role-media': (
    <>
      <path d="M4 9v6l6 3V6L4 9Z" />
      <path d="M10 8l7-3v14l-7-3" />
      <path d="M17 9a3 3 0 0 1 0 6" />
    </>
  ),
  'role-analyst': (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="M18 18l-3.6-3.6" />
      <path d="M7.5 11.5l1.8-2 1.6 1.4 2.1-2.6" />
    </>
  ),
  'role-hacker': (
    <>
      <path d="M4 8c0-1.7 3.6-3 8-3s8 1.3 8 3v3c0 3-3.6 6-8 8-4.4-2-8-5-8-8V8Z" />
      <path d="M8 10a2 2 0 0 1 3 0M13 10a2 2 0 0 1 3 0M10 15c.6.6 1.4.9 2 .9s1.4-.3 2-.9" />
    </>
  ),
  'role-whistleblower': (
    <>
      <path d="M11 5v14l-6-4V9l6-4Z" />
      <path d="M11 8h5a3 3 0 0 1 0 6h-5" />
      <path d="M15 17c1 .7 3 .4 3.5-1" />
    </>
  ),
  'role-ai': (
    <>
      <path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9L12 3Z" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 9.8V6M12 14.2V18M9.9 10.9 6.6 9M14.1 10.9 17.4 9M9.9 13.1 6.6 15M14.1 13.1 17.4 15" />
    </>
  ),
  'role-ai-adversarial': (
    <>
      <path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9L12 3Z" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 9.8V7M12 14.2v2.5M9.9 13.1 7 15M14.1 10.9 17 9" />
      <path d="M16.5 6.5 7.5 17.5" />
    </>
  ),
  'role-algo': (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
    </>
  ),
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  className,
  color,
  strokeWidth = 1.6,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={color ? { color } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
};

// Maps a backend agent registry type string to a role icon.
export function agentTypeIcon(agentType: string): IconName {
  const map: Record<string, IconName> = {
    EXECUTIVE_CEO: 'role-executive',
    EXECUTIVE_CFO: 'role-finance',
    EXECUTIVE_CTO: 'role-tech',
    BOARD_DIRECTOR: 'role-board',
    EMPLOYEE_SENIOR: 'role-employee',
    EMPLOYEE_JUNIOR: 'role-employee',
    EMPLOYEE_DISGRUNTLED: 'role-insider',
    INVESTOR_INSTITUTIONAL: 'role-investor',
    INVESTOR_ACTIVIST: 'role-investor',
    INVESTOR_VC: 'role-investor',
    COMPETITOR_DIRECT: 'role-competitor',
    COMPETITOR_ADJACENT: 'role-competitor',
    MARKET_MAKER: 'role-finance',
    CUSTOMER_ENTERPRISE: 'role-customer',
    CUSTOMER_CONSUMER: 'role-customer',
    CUSTOMER_CHURNED: 'role-customer',
    SUPPLIER_PRIMARY: 'role-supplier',
    SUPPLIER_BACKUP: 'role-supplier',
    REGULATOR_DOMESTIC: 'role-regulator',
    REGULATOR_INTERNATIONAL: 'role-regulator',
    GOVERNMENT_MINISTRY: 'role-government',
    MEDIA_MAINSTREAM: 'role-media',
    MEDIA_SOCIAL: 'role-media',
    ANALYST_FINANCIAL: 'role-analyst',
    HACKER_STATE: 'role-hacker',
    HACKER_CRIMINAL: 'role-hacker',
    WHISTLEBLOWER: 'role-whistleblower',
    AI_SYSTEM_FRIENDLY: 'role-ai',
    AI_SYSTEM_ADVERSARIAL: 'role-ai-adversarial',
    AUTONOMOUS_AGENT_MARKET: 'role-algo',
  };
  return map[agentType] ?? 'dot';
}

// Maps a lens id to a lens icon.
export function lensIcon(lensId: string): IconName {
  const map: Record<string, IconName> = {
    risk: 'lens-risk',
    strategy: 'lens-strategy',
    crisis: 'lens-crisis',
    negotiation: 'lens-negotiation',
    forecast: 'lens-forecast',
    innovation: 'lens-innovation',
  };
  return map[lensId] ?? 'lens-strategy';
}

export default Icon;
