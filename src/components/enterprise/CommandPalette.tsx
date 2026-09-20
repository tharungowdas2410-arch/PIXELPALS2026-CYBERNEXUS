"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  Brain,
  Building2,
  Command,
  FileText,
  GitBranch,
  History,
  LayoutDashboard,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAssets } from "@/lib/hooks/useAssets";
import { useVulnerabilities } from "@/lib/hooks/useVulnerabilities";
import { navGroups } from "@/lib/nav";

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Action" | "Asset" | "Vulnerability" | "Demo";
  icon: any;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data: assetsData } = useAssets({ page_size: 20 });
  const { data: vulnsData } = useVulnerabilities({ page_size: 20 });

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const commands: CommandItem[] = useMemo(() => {
    const baseNav: CommandItem[] = navGroups.flatMap((grp) =>
      grp.items.map((item) => ({
        id: `nav-${item.href}`,
        title: `Go to ${item.label}`,
        category: "Navigation",
        icon: item.icon,
        action: () => {
          router.push(item.href);
          onOpenChange(false);
        },
      }))
    );

    const demoActions: CommandItem[] = [
      {
        id: "action-demo",
        title: "Open SIH Demo Scenario Controller",
        category: "Demo",
        icon: Play,
        action: () => {
          router.push("/demo");
          onOpenChange(false);
        },
        shortcut: "D",
      },
      {
        id: "action-ai-advisor",
        title: "Ask AI Risk Advisor",
        category: "Action",
        icon: Brain,
        action: () => {
          router.push("/ai-risk-advisor");
          onOpenChange(false);
        },
      },
      {
        id: "action-optimize",
        title: "Run ₹50 Lakh Portfolio Optimizer",
        category: "Action",
        icon: Wallet,
        action: () => {
          router.push("/investment-optimizer");
          onOpenChange(false);
        },
      },
      {
        id: "action-generate-report",
        title: "Generate Executive Risk Report",
        category: "Action",
        icon: FileText,
        action: () => {
          router.push("/reports");
          onOpenChange(false);
        },
      },
    ];

    const assetItems: CommandItem[] = (assetsData?.data ?? []).map((a) => ({
      id: `asset-${a.id}`,
      title: `${a.name} (${a.asset_type})`,
      category: "Asset",
      icon: Building2,
      action: () => {
        router.push("/assets");
        onOpenChange(false);
      },
    }));

    const vulnItems: CommandItem[] = (vulnsData?.data ?? []).map((v) => ({
      id: `vuln-${v.id}`,
      title: `${v.cve_id || v.title} - ${v.severity}`,
      category: "Vulnerability",
      icon: ShieldAlert,
      action: () => {
        router.push("/vulnerabilities");
        onOpenChange(false);
      },
    }));

    return [...demoActions, ...baseNav, ...assetItems, ...vulnItems];
  }, [assetsData, vulnsData, router, onOpenChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 10);
    return commands
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [commands, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex items-center border-b border-[#E2E8F0] px-4 py-3 bg-[#F8FAFC]">
          <Search className="h-4 w-4 text-blue-600 mr-3 shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            placeholder="Type a command, page, or asset name (Ctrl+K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#F1F5F9]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching commands or objects found.
            </div>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={cmd.action}
                  className="flex w-full items-center justify-between px-3 py-2.5 rounded-md hover:bg-slate-100 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-slate-100 group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-600 transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900 truncate">
                        {cmd.title}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        {cmd.category}
                      </p>
                    </div>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono font-medium text-blue-700">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-2 bg-[#F8FAFC] text-[11px] text-slate-500">
          <span>Navigate with arrow keys or type to filter</span>
          <span className="font-mono text-blue-600 font-semibold">SIH 26105 Command Core</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
