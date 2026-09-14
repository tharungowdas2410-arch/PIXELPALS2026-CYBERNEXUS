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
    <header className="flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-[#090f1c]/95 px-3 backdrop-blur md:px-5">
      {/* Left: Mobile Menu & Organization Context */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8 text-slate-300"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="org-select">
            Organization
          </label>
          <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[#060a13] px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-200">
            <span className="h-2 w-2 rounded-sm bg-cyan-400" />
            <select
              id="org-select"
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
              value={organizationId}
              onChange={(e) => onOrganizationChange(e.target.value)}
            >
              {organizations.length === 0 ? (
                <option value="">DEMO FINANCIAL SERVICES</option>
              ) : (
                organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-[#0b1222] text-white">
                    {org.name.toUpperCase()}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Global Security Posture & Risk Status */}
        <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-white/10 text-xs">
          <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">Security Posture:</span>
            <span className="font-mono font-semibold text-white">78.4 / 100</span>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium",
              riskStatus === "CRITICAL" && "border-rose-500/40 bg-rose-950/30 text-rose-300",
              riskStatus === "HIGH" && "border-amber-500/40 bg-amber-950/30 text-amber-300",
              riskStatus === "ELEVATED" && "border-sky-500/40 bg-sky-950/30 text-sky-300",
              riskStatus === "CONTROLLED" && "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                riskStatus === "CRITICAL" && "bg-rose-400",
                riskStatus === "HIGH" && "bg-amber-400",
                riskStatus === "ELEVATED" && "bg-sky-400",
                riskStatus === "CONTROLLED" && "bg-emerald-400"
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
            className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
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
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
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
              className="relative h-8 w-8 text-slate-300 hover:text-white hover:bg-white/5"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0a101c]" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-white/10 bg-[#0d1424] text-white">
            <DropdownMenuLabel className="flex items-center justify-between px-3 py-2 text-xs text-slate-400">
              <span>Real-Time Security Notifications</span>
              <span className="text-[10px] font-mono text-cyan-400">{notifications.length} active</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No open critical alerts or incidents.
              </div>
            ) : (
              notifications.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="flex flex-col items-start gap-1 p-2.5 hover:bg-white/5 cursor-pointer focus:bg-white/5"
                >
                  <div className="flex items-center gap-2 w-full justify-between">
                    <span className="text-xs font-semibold text-white truncate">{item.title}</span>
                    <span
                      className={cn(
                        "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                        item.level === "critical" && "bg-rose-500/20 text-rose-300",
                        item.level === "high" && "bg-amber-500/20 text-amber-300",
                        item.level === "medium" && "bg-blue-500/20 text-blue-300",
                        item.level === "low" && "bg-slate-500/20 text-slate-300"
                      )}
                    >
                      {item.level}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 line-clamp-1">{item.detail}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User profile widget */}
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1">
          <div className="grid h-6 w-6 place-items-center rounded-full bg-cyan-500/20 text-[11px] font-semibold text-cyan-200">
            {(user.name || "A").slice(0, 1)}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-medium text-white truncate max-w-[100px]">{user.name}</p>
            <p className="text-[9px] uppercase tracking-wider text-cyan-400/80">{user.role}</p>
          </div>
          {onLogout ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px] text-slate-400 hover:text-rose-300"
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
