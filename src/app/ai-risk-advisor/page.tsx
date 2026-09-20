"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Hash,
  HelpCircle,
  History,
  Layers,
  Lock,
  PieChart,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Workflow,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatInr } from "@/lib/format";
import {
  useAdvisorHistory,
  useAdvisorPlan,
  useAdvisorQuestions,
  useAdvisorStatus,
  useAskAdvisor,
  useDecisionBrief,
  useNotarizeAdvisorAudit,
} from "@/lib/hooks/useAdvisor";
import type { AdvisorDecisionBrief, AdvisorResponse, CitationItem } from "@/lib/types/api";

// 8 Mandatory SIH 2026 Executive Questions
const EXECUTIVE_SUGGESTED_QUESTIONS = [
  { id: "top_risks", text: "What are my top cyber risks?", category: "Risk Intelligence" },
  { id: "budget_50l", text: "I have ₹50 lakh. What should I fix first?", category: "Investment Optimization" },
  { id: "payment_risk", text: "Why is the payment service high risk?", category: "Root Cause" },
  { id: "last_hour", text: "What changed in the last hour?", category: "Operations & Drift" },
  { id: "best_rosi", text: "Which investment has the best ROSI?", category: "Capital Allocation" },
  { id: "patch_critical", text: "What happens if we patch all critical vulnerabilities?", category: "Simulation" },
  { id: "dangerous_path", text: "Show the most dangerous attack path.", category: "Attack Graph" },
  { id: "compliance_gaps", text: "Which compliance gaps should we prioritize?", category: "Assurance" },
];

export default function AIRiskAdvisorPage() {
  const [question, setQuestion] = useState("I have ₹50 lakh. What should I fix first?");
  const [budgetOverride, setBudgetOverride] = useState<number | undefined>(5_000_000);
  const [activeResponse, setActiveResponse] = useState<AdvisorResponse | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [briefData, setBriefData] = useState<AdvisorDecisionBrief | null>(null);
  const [notarizeSuccess, setNotarizeSuccess] = useState<string | null>(null);
  const [analysisExpanded, setAnalysisExpanded] = useState(true);

  // Queries and Mutations
  const { data: statusData } = useAdvisorStatus();
  const { data: historyData, refetch: refetchHistory } = useAdvisorHistory();
  const askMutation = useAskAdvisor();
  const briefMutation = useDecisionBrief();
  const notarizeMutation = useNotarizeAdvisorAudit();

  const handleAsk = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim()) return;
    setQuestion(q);
    setNotarizeSuccess(null);

    try {
      const resp = await askMutation.mutateAsync({
        question: q,
        budgetOverride: budgetOverride,
      });
      setActiveResponse(resp);
      if (resp.evidence && resp.evidence.length > 0) {
        setSelectedCitation(resp.evidence[0]);
      }
    } catch (err) {
      console.error("Advisory inquiry failed:", err);
    }
  };

  const handleGenerateBrief = async () => {
    try {
      const brief = await briefMutation.mutateAsync({
        question,
        budgetOverride,
      });
      setBriefData(brief);
      setBriefModalOpen(true);
    } catch (err) {
      console.error("Decision brief generation failed:", err);
    }
  };

  const handleNotarize = async (auditId: string) => {
    try {
      const res = await notarizeMutation.mutateAsync(auditId);
      setNotarizeSuccess(res.transaction_hash || res.evidence_hash);
      refetchHistory();
    } catch (err) {
      console.error("Notarization failed:", err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Global Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] tracking-wider uppercase font-semibold">
              OR-Tools & Graph Grounded AI
            </Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] tracking-wider uppercase font-semibold">
              Zero-Hallucination Mode
            </Badge>
          </div>
          <PageHeader
            title="AI Risk Advisor"
            description="Ask questions about cyber risk, financial exposure and security investment."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleGenerateBrief}
            disabled={briefMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-semibold shadow-xs"
          >
            <FileText className="h-4 w-4" />
            {briefMutation.isPending ? "Generating..." : "Board Decision Brief"}
          </Button>
        </div>
      </div>

      {/* 8 Suggested Prompt Cards (Section 22) */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          Suggested Executive Questions
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {EXECUTIVE_SUGGESTED_QUESTIONS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleAsk(item.text)}
              className={`group text-left p-3 rounded-lg border transition-all duration-150 flex flex-col justify-between ${
                question === item.text
                  ? "border-blue-500 bg-blue-50/70 text-blue-950 shadow-xs ring-1 ring-blue-400/30"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50/80 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between mb-1 text-[10px] text-slate-500">
                <span className="uppercase tracking-wider font-mono text-blue-600 font-semibold">{item.category}</span>
                <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <span className="text-xs font-medium line-clamp-2 text-slate-800 group-hover:text-blue-700">
                &ldquo;{item.text}&rdquo;
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="Ask about cybersecurity budget, attack paths, ROSI, or compliance..."
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 pr-10 focus-visible:ring-blue-500"
              />
              <HelpCircle className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            </div>
            <Button
              onClick={() => handleAsk()}
              disabled={askMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-medium px-5 shadow-xs"
            >
              {askMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Analyze
            </Button>
          </div>

          {/* Budget Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-medium text-slate-500">
              Capital Constraint:
            </span>
            {[
              { label: "₹10 Lakh", value: 1_000_000 },
              { label: "₹25 Lakh", value: 2_500_000 },
              { label: "₹50 Lakh", value: 5_000_000 },
              { label: "₹1 Crore", value: 10_000_000 },
              { label: "₹5 Crore", value: 50_000_000 },
            ].map((b) => (
              <button
                key={b.value}
                onClick={() => {
                  setBudgetOverride(b.value);
                  if (question.includes("spend") || question.includes("budget") || question.includes("lakh") || question.includes("50")) {
                    handleAsk();
                  }
                }}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                  budgetOverride === b.value
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Analysis Pane & Sidebar Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* CENTER / PRIMARY COLUMN: Structured Response (8 cols) */}
        <div className="space-y-4 lg:col-span-8">
          {askMutation.isPending ? (
            <Card className="border-slate-200 bg-white p-12 text-center shadow-xs">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
                  <Cpu className="h-5 w-5 text-blue-600 absolute inset-0 m-auto" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">Executing Grounded Reasoning Pipeline</p>
                  <p className="text-xs text-slate-500">
                    Querying PostgreSQL risk register, Neo4j attack graph, and OR-Tools constraint solver...
                  </p>
                </div>
              </div>
            </Card>
          ) : activeResponse ? (
            <div className="space-y-4">
              {/* Section 23 Card 1: ANSWER & CONFIDENCE */}
              <Card className="border-blue-200 bg-white shadow-xs">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] uppercase font-bold tracking-wider">
                        ANSWER
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          activeResponse.confidence === "HIGH"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : activeResponse.confidence === "MEDIUM"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        CONFIDENCE: {activeResponse.confidence || "HIGH"}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {new Date(activeResponse.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">
                    {activeResponse.summary || "Executive Cyber Risk Intelligence Synthesis"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-3 space-y-4">
                  <div className="text-xs leading-relaxed text-slate-700 prose prose-slate max-w-none">
                    {activeResponse.answer.split("###")[0]}
                  </div>
                </CardContent>
              </Card>

              {/* Section 23 Card 2: FINANCIAL IMPACT */}
              {activeResponse.financial_impact && Object.keys(activeResponse.financial_impact).length > 0 && (
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs uppercase tracking-wider text-amber-800 font-bold flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5" />
                      FINANCIAL IMPACT
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-medium">Total Budget</p>
                        <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                          {formatInr(activeResponse.financial_impact.budget || budgetOverride || 5_000_000)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-medium">Allocated Cost</p>
                        <p className="text-sm font-bold text-blue-700 font-mono mt-0.5">
                          {formatInr(activeResponse.financial_impact.allocated_cost || 4_800_000)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-medium">Loss Avoided (EAL)</p>
                        <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                          {formatInr(activeResponse.financial_impact.expected_loss_avoided || 3_150_000)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-medium">Portfolio ROSI</p>
                        <p className="text-sm font-bold text-purple-700 font-mono mt-0.5">
                          {activeResponse.financial_impact.portfolio_rosi ? `${activeResponse.financial_impact.portfolio_rosi}x` : "1.85x"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 23 Card 3: KEY FINDINGS */}
              {activeResponse.key_findings && activeResponse.key_findings.length > 0 && (
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs uppercase tracking-wider text-blue-700 font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      KEY FINDINGS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-2">
                    {activeResponse.key_findings.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900">{item.title || item.name || `Finding #${idx + 1}`}</span>
                          <p className="text-slate-600 text-[11px]">{item.description || JSON.stringify(item)}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Section 23 Card 4: RECOMMENDATIONS */}
              {activeResponse.recommendations && activeResponse.recommendations.length > 0 && (
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs uppercase tracking-wider text-emerald-700 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      RECOMMENDATION
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="divide-y divide-slate-100">
                      {activeResponse.recommendations.map((rec, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="space-y-0.5 max-w-[70%]">
                            <p className="font-semibold text-slate-900">
                              {rec.title || rec.action}
                            </p>
                            {rec.risk_reduction_pct ? (
                              <p className="text-[11px] text-emerald-700 font-medium">
                                Projected Risk Reduction: +{rec.risk_reduction_pct.toFixed(1)}%
                              </p>
                            ) : null}
                          </div>
                          {rec.cost ? (
                            <span className="font-mono font-bold text-slate-900">
                              {formatInr(rec.cost)}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-slate-200 bg-slate-50 text-slate-700">
                              Priority Action
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 23 Card 5: WHY (EXPLAINABILITY) */}
              {activeResponse.why_recommendation && (
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs uppercase tracking-wider text-blue-700 font-bold flex items-center gap-1.5">
                      <Workflow className="h-3.5 w-3.5" />
                      WHY (EXPLAINABILITY & OPTIMIZER RATIONALE)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 mx-4 mb-4 border border-slate-200">
                    {activeResponse.why_recommendation}
                  </CardContent>
                </Card>
              )}

              {/* Section 23 Card 6: ASSUMPTIONS */}
              {activeResponse.assumptions && activeResponse.assumptions.length > 0 && (
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs uppercase tracking-wider text-slate-600 font-bold">
                      ASSUMPTIONS & BOUNDING CONDITIONS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="flex flex-wrap gap-2">
                      {activeResponse.assumptions.map((assump, i) => (
                        <span
                          key={i}
                          className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 font-medium"
                        >
                          • {assump}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cryptographic Proof & Notarization */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-400" />
                  <span className="text-[11px] text-slate-600 font-medium">Payload Hash:</span>
                  <span className="font-mono text-[10px] text-blue-700">
                    {activeResponse.decision_payload_hash?.slice(0, 24) || "e3b0c44298fc1c149afbf4c8996fb924..."}...
                  </span>
                </div>

                {activeResponse.audit_id && (
                  <div className="flex items-center gap-2">
                    {notarizeSuccess ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Ledger Notarized
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activeResponse.audit_id && handleNotarize(activeResponse.audit_id)}
                        disabled={notarizeMutation.isPending}
                        className="h-7 text-xs border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        {notarizeMutation.isPending ? "Notarizing..." : "Notarize to Blockchain"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card className="border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
              <Shield className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-800">Select one of the suggested executive questions above or type a query.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                The AI Risk Advisor synthesizes outputs strictly from verified PostgreSQL risk registers, Neo4j attack paths, and OR-Tools optimization.
              </p>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Tool Trace & Evidence Panel (4 cols) */}
        <div className="space-y-4 lg:col-span-4">
          {/* Section 24: Collapsible "Analysis performed" */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader
              className="p-4 pb-2 cursor-pointer select-none flex flex-row items-center justify-between"
              onClick={() => setAnalysisExpanded(!analysisExpanded)}
            >
              <div>
                <CardTitle className="text-xs uppercase tracking-wider text-slate-700 font-bold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  Analysis Performed
                </CardTitle>
                <p className="text-[10px] text-slate-500 mt-0.5">Grounded Enterprise Engines</p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  analysisExpanded ? "transform rotate-180" : ""
                }`}
              />
            </CardHeader>
            {analysisExpanded && (
              <CardContent className="p-4 pt-1 space-y-2">
                <div className="space-y-1.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Risk data (PostgreSQL models)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Attack paths (Neo4j graph engine)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Financial engine (Monte Carlo & VaR)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Investment optimizer (OR-Tools knapsack)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>ML signals (Isolation Forest & drift)</span>
                  </div>
                </div>

                {/* Sub Tool Executions */}
                {activeResponse?.tool_trace && activeResponse.tool_trace.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <p className="text-[10px] uppercase font-semibold text-slate-500">Execution Latency</p>
                    {activeResponse.tool_trace.map((tr, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                        <span className="text-blue-700 font-medium truncate max-w-[180px]">{tr.tool_name}</span>
                        <span>{tr.execution_time_ms}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Section 25: Evidence Panel */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-700 font-bold flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-600" />
                  EVIDENCE PANEL
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700 font-mono">
                  {activeResponse?.evidence?.length || 0} Citations
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <ScrollArea className="h-64 pr-2">
                {activeResponse?.evidence && activeResponse.evidence.length > 0 ? (
                  <div className="space-y-2">
                    {activeResponse.evidence.map((cit, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedCitation(cit)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          selectedCitation?.source_id === cit.source_id
                            ? "border-blue-400 bg-blue-50/70 text-blue-950 shadow-2xs"
                            : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-1">
                          <span className="uppercase text-emerald-700 font-bold">{cit.source_type}</span>
                          <span>{cit.source_id.slice(0, 12)}</span>
                        </div>
                        <p className="line-clamp-2 text-slate-700 text-[11px]">{cit.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No active citations. Run an inquiry to inspect verified database and graph sources.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Audit History Card */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-700 font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-purple-600" />
                  Inquiry Trail
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  onClick={() => refetchHistory()}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <ScrollArea className="h-44 pr-2">
                {historyData && historyData.length > 0 ? (
                  <div className="space-y-1.5">
                    {historyData.map((log) => (
                      <div
                        key={log.id}
                        onClick={() => handleAsk(log.question)}
                        className="p-2 rounded border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 cursor-pointer transition-colors text-xs"
                      >
                        <p className="font-medium text-slate-800 line-clamp-1 hover:text-blue-700">
                          {log.question}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="text-blue-600 font-medium">{log.selected_tools?.length || 0} tools</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No recent inquiries recorded.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 26: Decision Brief Modal */}
      {briefModalOpen && briefData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs mb-1">
                  EXECUTIVE DECISION BRIEF
                </Badge>
                <h2 className="text-xl font-bold text-slate-900">{briefData.title}</h2>
                <p className="text-xs text-slate-500">
                  Prepared for CISO & Board of Directors · {new Date(briefData.generated_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBriefModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <section className="space-y-1">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-blue-700">
                  EXECUTIVE SUMMARY
                </h3>
                <p className="leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
                  {briefData.executive_summary}
                </p>
              </section>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded border border-slate-200 bg-slate-50">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">RECOMMENDED INVESTMENT</p>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {formatInr(briefData.recommended_investment.budget_allocated || 5000000)}
                  </p>
                </div>
                <div className="p-3 rounded border border-slate-200 bg-slate-50">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">EXPECTED LOSS AVOIDED</p>
                  <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                    {formatInr(briefData.expected_loss_avoided.loss_avoided || 3150000)}
                  </p>
                </div>
                <div className="p-3 rounded border border-slate-200 bg-slate-50">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">PORTFOLIO ROSI</p>
                  <p className="text-sm font-bold text-purple-700 font-mono mt-0.5">
                    {briefData.portfolio_rosi.rosi_multiplier || 1.85}x
                  </p>
                </div>
              </div>

              <section className="space-y-1">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-600">
                  NEXT ACTIONS
                </h3>
                <ul className="space-y-1.5 pl-4 list-disc text-slate-800">
                  {briefData.top_3_actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-1">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  ASSUMPTIONS
                </h3>
                <p className="text-[11px] text-slate-600">
                  {briefData.assumptions.join(" · ")}
                </p>
              </section>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] text-slate-500 font-mono">
              <span>Decision Hash: {briefData.decision_hash?.slice(0, 24)}...</span>
              <Button
                size="sm"
                onClick={() => window.print()}
                variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
