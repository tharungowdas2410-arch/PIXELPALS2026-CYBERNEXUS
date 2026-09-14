import {
  Activity,
  Bell,
  Blocks,
  Brain,
  Building2,
  FileText,
  GitBranch,
  History,
  Landmark,
  LineChart,
  LayoutDashboard,
  Lock,
  Play,
  Radio,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: "SIH 2026 Showcase",
    items: [
      { href: "/demo", label: "Demo Controller", icon: Play },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/security-posture", label: "Security Posture", icon: Shield },
      { href: "/assets", label: "Assets", icon: Building2 },
      { href: "/vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert },
      { href: "/threat-intelligence", label: "Threat Intelligence", icon: Activity },
      { href: "/attack-paths", label: "Attack Paths", icon: GitBranch },
      { href: "/risks", label: "Risk Center", icon: Target },
      { href: "/controls", label: "Controls", icon: ShieldCheck },
    ],
  },
  {
    title: "Risk & capital",
    items: [
      { href: "/financial-risk", label: "Financial Risk", icon: Landmark },
      { href: "/investment-optimizer", label: "Investment Optimizer", icon: Wallet },
      { href: "/what-if", label: "What-If Simulator", icon: SlidersHorizontal },
      { href: "/ai-risk-advisor", label: "AI Risk Advisor", icon: Brain },
      { href: "/security-operations", label: "Security Operations", icon: Radio },
      { href: "/ml-intelligence", label: "ML Intelligence", icon: LineChart },
    ],
  },
  {
    title: "Assurance",
    items: [
      { href: "/incidents", label: "Incidents", icon: Bell },
      { href: "/compliance", label: "Compliance", icon: ShieldCheck },
      { href: "/blockchain-evidence", label: "Blockchain Evidence", icon: Blocks },
      { href: "/audit", label: "Audit Trail", icon: History },
      { href: "/reports", label: "Reports Hub", icon: FileText },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/settings", label: "General Settings", icon: Settings },
      { href: "/settings/users", label: "User Management", icon: Users },
      { href: "/settings/security", label: "Security & Retention", icon: Lock },
    ],
  },
];
