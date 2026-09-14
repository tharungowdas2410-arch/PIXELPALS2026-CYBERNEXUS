"use client";

import React from "react";
import { HelpCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type MetricExplanationKey =
  | "EAL"
  | "VaR"
  | "ROSI"
  | "Risk Reduction"
  | "Residual Risk"
  | "Attack Path Score"
  | "Control Effectiveness"
  | "Financial Exposure";

const EXPLANATIONS: Record<MetricExplanationKey, { title: string; desc: string }> = {
  EAL: {
    title: "Expected Annual Loss (EAL)",
    desc: "Statistically projected annualized financial loss in INR (Likelihood × Asset Value × Severity Factor) without or with controls.",
  },
  VaR: {
    title: "Value at Risk (95% VaR)",
    desc: "The threshold financial loss that is not expected to be exceeded with 95% confidence over a one-year period.",
  },
  ROSI: {
    title: "Return on Security Investment (ROSI)",
    desc: "Ratio measuring the economic return of cyber spending: (Loss Avoided - Cost of Controls) / Cost of Controls.",
  },
  "Risk Reduction": {
    title: "Risk Reduction Opportunity",
    desc: "Modeled decrease in enterprise residual score achievable if recommended budget and controls are funded.",
  },
  "Residual Risk": {
    title: "Residual Cyber Risk",
    desc: "The quantified risk score remaining (0-100) after current security controls and mitigations are applied.",
  },
  "Attack Path Score": {
    title: "Attack Path Criticality",
    desc: "Graph-based risk rating reflecting exploitability, hop count, and financial criticality of downstream crown jewels.",
  },
  "Control Effectiveness": {
    title: "Control Effectiveness Factor",
    desc: "Dampening metric (0.00 to 1.00) measuring how reliably the active control blocks associated attack vectors.",
  },
  "Financial Exposure": {
    title: "Total Financial Exposure",
    desc: "Aggregated maximum probable financial loss across all active enterprise assets and open vulnerabilities.",
  },
};

interface TooltipExplainerProps {
  term: MetricExplanationKey;
  children?: React.ReactNode;
  iconOnly?: boolean;
}

export function TooltipExplainer({
  term,
  children,
  iconOnly = false,
}: TooltipExplainerProps) {
  const item = EXPLANATIONS[term] || { title: term, desc: "" };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help group">
            {children}
            <Info className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <p className="font-semibold text-cyan-300 text-xs">{item.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{item.desc}</p>
          <p className="mt-1.5 text-[9px] uppercase tracking-wider text-slate-500 border-t border-white/5 pt-1">
            Illustrative Quantitative Model
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
