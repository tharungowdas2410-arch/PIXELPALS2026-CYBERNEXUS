"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Hexagon,
  Shield,
  X,
} from "lucide-react";
import { navGroups } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cybernexus_sidebar_collapsed");
      if (stored === "true") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cybernexus_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#E2E8F0] bg-white transition-all duration-200 lg:static lg:translate-x-0 select-none",
          collapsed ? "w-16" : "w-64",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#E2E8F0] px-3.5">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden" onClick={onClose}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-600 shadow-xs">
              <Hexagon className="h-4 w-4" aria-hidden />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-[0.2em] text-[#0F172A]">CYBERNEXUS</span>
                <span className="text-[9px] font-mono font-medium tracking-wider text-blue-600">SIH 26105</span>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="hidden lg:flex h-6 w-6 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!collapsed ? (
                <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {group.title}
                </p>
              ) : (
                <div className="h-px bg-slate-100 mx-2 my-2" />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : Boolean(pathname) &&
                        (pathname === item.href || pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;

                  const linkEl = (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        collapsed ? "justify-center px-0 h-9" : "",
                        active
                          ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200/80 shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      {active && (
                        <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r bg-blue-600" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                        )}
                        aria-hidden
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <li key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                          <TooltipContent side="right" className="bg-white border-slate-200 text-slate-900 text-xs font-medium shadow-md">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  }

                  return <li key={item.href}>{linkEl}</li>;
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer Attribution */}
        {!collapsed && (
          <div className="border-t border-[#E2E8F0] p-3 text-[10px] text-slate-500 flex items-center gap-2 bg-[#F8FAFC]">
            <Shield className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="truncate">SIH 26105 · Continuous Risk Platform</span>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
