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
    title: "Command Center",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/demo", label: "Demo Controller", icon: Play },
    ],
  },
  {
    title: "Understand Risk",
    items: [
      { href: "/risks", label: "Risk Intelligence", icon: Target },
      { href: "/attack-paths", label: "Attack Paths", icon: GitBranch },
      { href: "/assets", label: "Assets", icon: Building2 },
      { href: "/vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert },
      { href: "/threat-intelligence", label: "Threat Intelligence", icon: Activity },
      { href: "/incidents", label: "Incidents", icon: Bell },
    ],
  },
  {
    title: "Quantify Impact",
    items: [
      { href: "/financial-risk", label: "Financial Risk", icon: Landmark },
      { href: "/what-if", label: "What-If Scenarios", icon: SlidersHorizontal },
    ],
  },
  {
    title: "Take Action",
    items: [
      { href: "/investment-optimizer", label: "Investment Optimizer", icon: Wallet },
      { href: "/ai-risk-advisor", label: "AI Risk Advisor", icon: Brain },
    ],
  },
  {
    title: "Verify & Govern",
    items: [
      { href: "/compliance", label: "Compliance", icon: ShieldCheck },
      { href: "/blockchain-evidence", label: "Evidence Integrity", icon: Blocks },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/security-posture", label: "Security Posture", icon: Shield },
      { href: "/audit", label: "Audit Trail", icon: History },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/security-operations", label: "Security Operations", icon: Radio },
      { href: "/ml-intelligence", label: "ML Intelligence", icon: LineChart },
      { href: "/controls", label: "Controls Catalog", icon: ShieldCheck },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/settings/users", label: "Users & Roles", icon: Users },
      { href: "/settings/security", label: "Security & Retention", icon: Lock },
    ],
  },
];
