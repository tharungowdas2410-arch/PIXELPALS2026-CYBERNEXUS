"use client";

import React, { useEffect } from "react";
import { X, ExternalLink, Sparkles, Shield, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DetailDrawerField {
  label: string;
  value: React.ReactNode;
  hint?: string;
  mono?: boolean;
}

export interface DrawerEntity {
  type: string;
  id: string;
  title: string;
  severity?: string;
  status?: string;
  cve?: string;
  cvss?: number;
  exploitability?: number;
  assetName?: string;
  criticality?: number;
  businessService?: string;
  threatActor?: string;
  financialExposure?: number;
  recommendedAction?: string;
  details?: Array<{ label: string; value: React.ReactNode }>;
}

export interface DetailDrawerProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  entity?: DrawerEntity | null;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    color?: string;
  };
  metrics?: Array<{
    label: string;
    value: string | number;
    sublabel?: string;
    trend?: "up" | "down" | "neutral";
    color?: string;
  }>;
  fields?: DetailDrawerField[];
  recommendation?: {
    title?: string;
    action: string;
    impact?: string;
    onExecute?: () => void;
  };
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function DetailDrawer({
  open,
  isOpen,
  onClose,
  title,
  eyebrow,
  subtitle,
  entity,
  badge,
  metrics,
  fields,
  recommendation,
  actions,
  children,
}: DetailDrawerProps) {
  const isDrawerOpen = Boolean(isOpen ?? open);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, onClose]);

  if (!isDrawerOpen) return null;

  const displayTitle = title || entity?.title || "Investigation Detail";
  const displayEyebrow = eyebrow || (entity?.type ? `${entity.type.toUpperCase()} INTELLIGENCE` : undefined);
  const displaySubtitle = subtitle || (entity?.assetName ? `Associated Asset: ${entity.assetName}` : undefined);

  const displayBadge = badge || (entity?.severity ? {
    label: entity.severity,
    color: entity.severity === "CRITICAL"
      ? "bg-red-50 text-red-700 border-red-200"
      : entity.severity === "HIGH"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "bg-blue-50 text-blue-700 border-blue-200",
  } : undefined);

  const entityMetrics: Array<{ label: string; value: string | number; color?: string }> = [];
  if (entity?.cvss !== undefined) {
    entityMetrics.push({ label: "CVSS Score", value: entity.cvss.toFixed(1), color: "text-amber-600" });
  }
  if (entity?.exploitability !== undefined) {
    entityMetrics.push({ label: "Exploitability", value: `${(entity.exploitability * 100).toFixed(0)}%`, color: "text-red-600" });
  }
  if (entity?.criticality !== undefined) {
    entityMetrics.push({ label: "Criticality Tier", value: `Tier ${entity.criticality}`, color: "text-blue-600" });
  }
  if (entity?.financialExposure !== undefined) {
    entityMetrics.push({ label: "Exposure Impact", value: formatInr(entity.financialExposure), color: "text-emerald-600" });
  }

  const displayMetrics = metrics && metrics.length > 0 ? metrics : entityMetrics;

  const entityFields: DetailDrawerField[] = (entity?.details ?? []).map((d) => ({
    label: d.label,
    value: d.value,
  }));
  const displayFields = fields && fields.length > 0 ? fields : entityFields;

  const displayRecommendation = recommendation || (entity?.recommendedAction ? {
    action: entity.recommendedAction,
    title: "Prescribed Defensive Countermeasure",
  } : undefined);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="relative w-screen max-w-xl border-l border-[#E2E8F0] bg-white shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col text-[#0F172A]">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#E2E8F0] p-5 bg-[#F8FAFC]">
            <div className="space-y-1 pr-4">
              {displayEyebrow && (
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
                  {displayEyebrow}
                </p>
              )}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{displayTitle}</h3>
                {displayBadge && (
                  <Badge variant={displayBadge.variant || "outline"} className={cn("text-xs font-semibold", displayBadge.color)}>
                    {displayBadge.label}
                  </Badge>
                )}
              </div>
              {displaySubtitle && <p className="text-xs text-slate-500 leading-relaxed">{displaySubtitle}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 shrink-0"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Body Content */}
          <ScrollArea className="flex-1 p-5 space-y-6">
            <div className="space-y-6">
              {/* Quick KPI Cards */}
              {displayMetrics && displayMetrics.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {displayMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:border-slate-300"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{m.label}</p>
                      <p className={cn("mt-1 text-lg font-bold font-mono text-slate-900", m.color)}>
                        {m.value}
                      </p>
                      {"sublabel" in m && Boolean((m as any).sublabel) && (
                        <p className="mt-0.5 text-[10px] text-slate-500 truncate">{String((m as any).sublabel)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Recommended Action Box */}
              {displayRecommendation && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {displayRecommendation.title || "AI Prescribed Action"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed">{displayRecommendation.action}</p>
                  {displayRecommendation.impact && (
                    <p className="text-[11px] font-mono text-emerald-700 font-medium">
                      Expected Impact: {displayRecommendation.impact}
                    </p>
                  )}
                  {displayRecommendation.onExecute && (
                    <Button
                      size="sm"
                      onClick={displayRecommendation.onExecute}
                      className="mt-2 h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
                    >
                      Execute Remediation
                      <ArrowUpRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              )}

              {/* Structured Attribute Fields */}
              {displayFields && displayFields.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Investigation Attributes
                  </h4>
                  <div className="divide-y divide-[#E2E8F0] rounded-lg border border-[#E2E8F0] bg-white">
                    {displayFields.map((f, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-4 p-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-medium text-slate-600">{f.label}</span>
                          {f.hint && <p className="text-[10px] text-slate-400">{f.hint}</p>}
                        </div>
                        <div
                          className={cn(
                            "text-right font-semibold text-slate-900 max-w-[60%] break-words",
                            f.mono && "font-mono"
                          )}
                        >
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Child Elements */}
              {children}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          {actions && (
            <div className="border-t border-[#E2E8F0] p-4 bg-[#F8FAFC] flex items-center justify-end gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
