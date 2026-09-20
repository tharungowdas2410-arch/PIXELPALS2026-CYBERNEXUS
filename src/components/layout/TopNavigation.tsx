"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Command,
  HelpCircle,
  Menu,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import type { NotificationItem, Organization, UserProfile } from "@/lib/types";
import { navGroups } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function TopNavigation({
  onMenu,
  organizations,
  organizationId,
  onOrganizationChange,
  notifications,
  user,
  enterpriseRisk,
  onLogout,
  onOpenCommand,
}: {
  onMenu: () => void;
  organizations: Organization[];
  organizationId: string;
  onOrganizationChange: (id: string) => void;
  notifications: NotificationItem[];
  user: UserProfile;
  enterpriseRisk?: number;
  onLogout?: () => void;
  onOpenCommand?: () => void;
}) {
  const [secondsAgo, setSecondsAgo] = useState(12);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => (prev >= 59 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const riskValue = typeof enterpriseRisk === "number" ? enterpriseRisk : 72.0;
  const riskStatus =
    riskValue >= 80 ? "CRITICAL" : riskValue >= 65 ? "HIGH" : riskValue >= 45 ? "ELEVATED" : "CONTROLLED";

  const activeOrgName =
    organizations.find((o) => o.id === organizationId)?.name ||
    organizations[0]?.name ||
    "DEMO FINANCIAL SERVICES";

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white/95 px-3 backdrop-blur md:px-5">
      {/* Left: Mobile Menu & Organization Context */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="org-select">
            Organization
          </label>
          <div className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-800">
            <span className="h-2 w-2 rounded-sm bg-blue-600" />
            <select
              id="org-select"
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              value={organizationId}
              onChange={(e) => onOrganizationChange(e.target.value)}
            >
              {organizations.length === 0 ? (
                <option value="">DEMO FINANCIAL SERVICES</option>
              ) : (
                organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-white text-slate-900">
                    {org.name.toUpperCase()}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs pl-2 border-l border-[#E2E8F0] text-slate-500">
          <span className="text-slate-500 font-medium tracking-wide">
            {navGroups.flatMap(g => g.items.map(i => ({ ...i, groupTitle: g.title }))).find(i => i.href === (typeof window !== "undefined" ? window.location.pathname : "") || (i.href !== "/" && (typeof window !== "undefined" ? window.location.pathname : "").startsWith(`${i.href}/`)))?.groupTitle || "Command Center"}
          </span>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-800">
            {navGroups.flatMap(g => g.items.map(i => ({ ...i, groupTitle: g.title }))).find(i => i.href === (typeof window !== "undefined" ? window.location.pathname : "") || (i.href !== "/" && (typeof window !== "undefined" ? window.location.pathname : "").startsWith(`${i.href}/`)))?.label || "Overview"}
          </span>
        </div>

        {/* Global Security Posture & Risk Status */}
        <div className="hidden 2xl:flex items-center gap-2 pl-2 border-l border-[#E2E8F0] text-xs">
          <div className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-slate-500">Security Posture:</span>
            <span className="font-mono font-semibold text-slate-900">78.4 / 100</span>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium",
              riskStatus === "CRITICAL" && "border-red-200 bg-red-50 text-red-700",
              riskStatus === "HIGH" && "border-orange-200 bg-orange-50 text-orange-700",
              riskStatus === "ELEVATED" && "border-amber-200 bg-amber-50 text-amber-700",
              riskStatus === "CONTROLLED" && "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                riskStatus === "CRITICAL" && "bg-red-600",
                riskStatus === "HIGH" && "bg-orange-600",
                riskStatus === "ELEVATED" && "bg-amber-600",
                riskStatus === "CONTROLLED" && "bg-emerald-600"
              )}
            />
            <span>Cyber Risk: {riskStatus} ({riskValue.toFixed(1)})</span>
          </div>
        </div>
      </div>

      {/* Center: Search & Command Palette Trigger */}
      <div className="hidden md:flex min-w-0 flex-1 max-w-md items-center gap-2">
        <GlobalSearch />
        {onOpenCommand && (
          <button
            type="button"
            onClick={onOpenCommand}
            className="flex items-center gap-1 rounded border border-[#CBD5E1] bg-[#F1F5F9] px-2 py-1.5 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors shrink-0"
            title="Open Command Palette"
          >
            <Command className="h-3 w-3" />
            <kbd className="font-mono">Ctrl+K</kbd>
          </button>
        )}
      </div>

      {/* Right: Observability Metrics, Notifications & User */}
      <div className="flex items-center gap-2.5">
        {/* Relative update timer */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <span>Updated {secondsAgo}s ago</span>
        </div>

        {/* System Status: Operational */}
        <div className="hidden sm:flex items-center">
          <StatusBadge status="OPERATIONAL" size="sm" />
        </div>

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-[#E2E8F0] bg-white text-slate-900 shadow-xl">
            <DropdownMenuLabel className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 border-b border-[#E2E8F0]">
              <span>Real-Time Security Notifications</span>
              <span className="text-[10px] font-mono text-blue-600 font-semibold">{notifications.length} active</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#E2E8F0]" />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No open critical alerts or incidents.
              </div>
            ) : (
              notifications.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="flex flex-col items-start gap-1 p-2.5 hover:bg-slate-50 cursor-pointer focus:bg-slate-50"
                >
                  <div className="flex items-center gap-2 w-full justify-between">
                    <span className="text-xs font-semibold text-slate-900 truncate">{item.title}</span>
                    <span
                      className={cn(
                        "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border",
                        item.level === "critical" && "bg-red-50 text-red-700 border-red-200",
                        item.level === "high" && "bg-orange-50 text-orange-700 border-orange-200",
                        item.level === "medium" && "bg-amber-50 text-amber-700 border-amber-200",
                        item.level === "low" && "bg-slate-100 text-slate-700 border-slate-200"
                      )}
                    >
                      {item.level}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 line-clamp-1">{item.detail}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User profile widget */}
        <div className="flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1">
          <div className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
            {(user.name || "A").slice(0, 1)}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-semibold text-slate-900 truncate max-w-[100px]">{user.name}</p>
            <p className="text-[9px] uppercase tracking-wider text-blue-600 font-medium">{user.role}</p>
          </div>
          {onLogout ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-red-600 hover:bg-red-50"
              onClick={onLogout}
            >
              Sign out
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
