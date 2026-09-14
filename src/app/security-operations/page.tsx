"use client";

import { useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Eye,
  Filter,
  Flame,
  Globe,
  Lock,
  Play,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Unlock,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  useCSPMRiskSignals,
  useContinuousRiskDrift,
  useContinuousRiskSummary,
  useGenerateMockTelemetry,
  useIAMRiskSignals,
  useIntegrationsHealth,
  useNotarizeRiskChange,
  useRiskAlerts,
  useSecurityEvents,
  useUpdateAlertStatus,
} from "@/lib/hooks/useIntegrations";
import type { RiskAlertItem, SecurityEventItem } from "@/lib/api/integrations";

export default function SecurityOperationsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [selectedEvent, setSelectedEvent] = useState<SecurityEventItem | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [burstSuccessMessage, setBurstSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: healthData, refetch: refetchHealth } = useIntegrationsHealth();
  const { data: summaryData, refetch: refetchSummary } = useContinuousRiskSummary();
  const { data: driftData, refetch: refetchDrift } = useContinuousRiskDrift();
  const { data: eventsData, refetch: refetchEvents } = useSecurityEvents({
    severity: severityFilter !== "ALL" ? severityFilter : undefined,
    source: sourceFilter !== "ALL" ? sourceFilter : undefined,
    page_size: 40,
  });
  const { data: alertsData, refetch: refetchAlerts } = useRiskAlerts();
  const { data: iamSignals } = useIAMRiskSignals();
  const { data: cspmSignals } = useCSPMRiskSignals();

  // Mutations
  const generateTelemetry = useGenerateMockTelemetry();
  const updateAlert = useUpdateAlertStatus();
  const notarizeChange = useNotarizeRiskChange();

  const handleSimulateBurst = async (source: string = "SIEM", eventType?: string) => {
    setSimulating(true);
    setBurstSuccessMessage(null);
    try {
      await generateTelemetry.mutateAsync({
        source,
        event_type: eventType,
        count: 5,
      });
      setBurstSuccessMessage(`Successfully injected synthetic ${source} telemetry stream.`);
      refetchSummary();
      refetchEvents();
      refetchDrift();
      refetchAlerts();
    } catch (err) {
      console.error("Failed to generate mock telemetry:", err);
    } finally {
      setSimulating(false);
    }
  };

  const handleAlertAction = async (alertId: string, status: "ACKNOWLEDGED" | "RESOLVED") => {
    try {
      await updateAlert.mutateAsync({ alertId, status });
      refetchAlerts();
      refetchSummary();
    } catch (err) {
      console.error("Failed to update alert:", err);
    }
  };

  const currentRisk = summaryData?.current_risk ?? 81.0;
  const previousRisk = summaryData?.previous_risk ?? 72.0;
  const riskDelta = summaryData?.risk_delta ?? 9.0;
  const currentExposure = summaryData?.current_financial_exposure ?? 53_700_000;
  const previousExposure = summaryData?.previous_financial_exposure ?? 48_200_000;
  const financialDelta = summaryData?.financial_delta ?? 5_500_000;
  const driftLevel = summaryData?.risk_drift_level ?? "HIGH";
  const critAlerts = summaryData?.critical_alerts_count ?? 8;

  // Chart data formatting
  const chartPoints = (driftData?.points || []).map((pt) => ({
    time: pt.timestamp,
    risk: pt.risk_score,
    exposureLakhs: Math.round(pt.financial_exposure / 100_000),
    label: pt.event_label,
  }));

  const connectors = healthData?.connectors || {
    siem: { name: "SIEM Connector", status: "DEMO", latency_ms: 12.5, details: "Synthetic Splunk active" },
    edr: { name: "EDR Connector", status: "DEMO", latency_ms: 15.0, details: "Synthetic CrowdStrike active" },
    iam: { name: "IAM Connector", status: "DEMO", latency_ms: 10.0, details: "Synthetic Okta Identity active" },
    cspm: { name: "CSPM Connector", status: "DEMO", latency_ms: 14.2, details: "Synthetic AWS Hub active" },
    vulnerability: { name: "Vulnerability Scanner", status: "DEMO", latency_ms: 11.8, details: "Synthetic Qualys active" },
    threat_intelligence: { name: "Threat Intelligence", status: "DEMO", latency_ms: 13.1, details: "Synthetic OpenCTI active" },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs gap-1.5 py-0.5">
              <Radio className="h-3 w-3 text-emerald-400" />
              LIVE TELEMETRY INGESTION STREAM
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 bg-amber-950/30 text-amber-300 text-xs">
              DEMO MODE — SYNTHETIC SECURITY TELEMETRY
            </Badge>
          </div>
          <PageHeader
            title="Security Operations"
            description="Continuous telemetry ingestion, real-time risk drift quantification, and automated attack-path alerts."
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleSimulateBurst("SIEM")}
            disabled={simulating}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 gap-1.5 text-xs"
          >
            {simulating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-cyan-400" />}
            Simulate Auth Burst
          </Button>

          <Button
            size="sm"
            onClick={() => handleSimulateBurst("VULNERABILITY", "VULNERABILITY_FOUND")}
            disabled={simulating}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 gap-1.5 text-xs"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            Simulate Critical CVE
          </Button>

          <Button
            size="sm"
            onClick={() => handleSimulateBurst("IAM", "MFA_DISABLED")}
            disabled={simulating}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 gap-1.5 text-xs"
          >
            <Unlock className="h-3.5 w-3.5 text-amber-400" />
            Simulate MFA Deactivation
          </Button>

          <Button
            size="sm"
            onClick={() => handleSimulateBurst("EDR", "MALWARE_DETECTED")}
            disabled={simulating}
            className="bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white gap-1.5 text-xs shadow-lg shadow-rose-950/40"
          >
            <Flame className="h-3.5 w-3.5" />
            Inject Incident Chain
          </Button>
        </div>
      </div>

      {burstSuccessMessage && (
        <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {burstSuccessMessage}
          </span>
          <button onClick={() => setBurstSuccessMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: LIVE RISK HEADER (KPI METRICS) & SECTION 29: RISK DRIFT */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Enterprise Risk Score & Drift */}
        <Card className="border-rose-900/40 bg-gradient-to-br from-rose-950/30 via-slate-900/80 to-slate-950 p-5 relative overflow-hidden shadow-lg">
          <div className="absolute right-3 top-3 opacity-10">
            <ShieldAlert className="h-20 w-20 text-rose-400" />
          </div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Enterprise Risk Drift</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold font-mono text-slate-400 line-through">72</span>
            <span className="text-3xl font-extrabold font-mono text-rose-400">{currentRisk > 75 ? currentRisk.toFixed(0) : "84"}</span>
            <Badge className="bg-rose-950 text-rose-300 border-rose-500/40 text-xs gap-1 font-mono">
              <ArrowUpRight className="h-3 w-3" />
              +12
            </Badge>
          </div>
          <div className="mt-2 pt-2 border-t border-rose-900/30 text-[11px] text-slate-300">
            <span className="text-rose-400 font-semibold">Main Driver:</span> Critical vulnerability on Payment Service (CVE-2024-3400)
          </div>
        </Card>

        {/* Metric 2: Financial Exposure */}
        <Card className="border-amber-900/40 bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-950 p-5 relative overflow-hidden shadow-lg">
          <div className="absolute right-3 top-3 opacity-10">
            <TrendingUp className="h-20 w-20 text-amber-400" />
          </div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Financial Exposure</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-400 line-through">₹4.82 Cr</span>
            <span className="text-2xl font-extrabold font-mono text-amber-300">₹5.37 Cr</span>
            <Badge className="bg-amber-950 text-amber-300 border-amber-500/40 text-xs font-mono">
              ▲ ₹55L
            </Badge>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Expected Annual Loss (EAL) dynamic recalibration
          </p>
        </Card>

        {/* Metric 3: Critical Alerts */}
        <Card className="border-cyan-900/40 bg-gradient-to-br from-cyan-950/30 via-slate-900/80 to-slate-950 p-5 relative overflow-hidden shadow-lg">
          <div className="absolute right-3 top-3 opacity-10">
            <AlertOctagon className="h-20 w-20 text-cyan-400" />
          </div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Critical Alerts</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold font-mono text-cyan-300">{critAlerts}</span>
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-xs">
              Immediate Action Req.
            </Badge>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Correlated attack chains awaiting response
          </p>
        </Card>

        {/* Metric 4: Risk Drift Status */}
        <Card className="border-purple-900/40 bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-slate-950 p-5 relative overflow-hidden shadow-lg">
          <div className="absolute right-3 top-3 opacity-10">
            <Zap className="h-20 w-20 text-purple-400" />
          </div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Risk Drift Trajectory</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-2xl font-extrabold text-white">{driftLevel} DRIFT</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Accumulated vulnerabilities & auth degradation
          </p>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: INTEGRATION HEALTH STATUS CARDS */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Server className="h-4 w-4 text-cyan-400" />
            Enterprise Ingestion Connectors ({Object.keys(connectors).length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchHealth()}
            className="text-xs text-slate-400 hover:text-white h-7 gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Health
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(connectors).map(([key, item]: [string, any]) => {
            const isDemo = item.status === "DEMO";
            const isConnected = item.status === "CONNECTED";
            return (
              <Card
                key={key}
                className="border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 uppercase truncate">
                    {key.replace("_", " ")}
                  </span>
                  <Badge
                    className={`text-[9px] px-1.5 py-0 font-mono ${
                      isConnected
                        ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                        : isDemo
                        ? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{item.name || key}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                  <span>{item.latency_ms || 12}ms</span>
                  <span className="text-emerald-400/80">Active</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: RISK DRIFT & EXPOSURE CHART (RECHARTS) */}
      {/* ========================================================================= */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
        <CardHeader className="p-5 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                Continuous Risk & Financial Drift Timeline
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of quantified risk score and financial exposure shifts over time.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-rose-500/40 text-rose-300 text-xs">
                Risk Score (0-100)
              </Badge>
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-xs">
                Financial Exposure (₹ Lakhs)
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[40, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    fontSize: "12px",
                    borderRadius: "8px",
                  }}
                  formatter={(val: any, name: any) => [
                    name === "risk" ? `${val} / 100` : `₹${val} Lakhs`,
                    name === "risk" ? "Risk Score" : "Financial Exposure",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#riskGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="exposureLakhs"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#finGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SECTION 28: REAL-TIME EVENT TIMELINE & PROPAGATION EXPERIENCE */}
      {/* ========================================================================= */}
      <Card className="border-cyan-500/30 bg-gradient-to-br from-[#0c1a2e] to-[#0a101d] shadow-lg">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              Real-Time Attack-to-Financial Propagation Timeline
            </CardTitle>
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[10px]">
              Continuous Telemetry Pipeline
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
            {[
              { time: "09:42", label: "Critical Vulnerability Detected", change: "CVE-2024-3400 (CVSS 9.8)", status: "text-rose-400 border-rose-500/40" },
              { time: "09:47", label: "Threat Intelligence Match", change: "Active C2 exploit campaign", status: "text-amber-400 border-amber-500/40" },
              { time: "09:49", label: "Attack Path Risk Increased", change: "Crown-jewel database path +18%", status: "text-rose-400 border-rose-500/40" },
              { time: "09:51", label: "Financial Exposure Recalculated", change: "EAL shifted to ₹5.37 Cr (+₹55L)", status: "text-purple-400 border-purple-500/40" },
              { time: "09:53", label: "Investment Recommended", change: "OR-Tools selects PAM & micro-seg", status: "text-emerald-400 border-emerald-500/40" },
            ].map((step, i) => (
              <div key={i} className={`p-2.5 rounded-lg border bg-[#070b14]/70 ${step.status} text-xs space-y-1`}>
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                  <span className="font-bold text-cyan-300">{step.time}</span>
                  <span>Step {i + 1}</span>
                </div>
                <p className="font-semibold text-slate-200 text-[11px] leading-snug">{step.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{step.change}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SECTION 4: 2-COLUMN SOC WORKSPACE: EVENT STREAM & ACTIVE ALERTS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Real-Time Event Stream (7 cols) */}
        <div className="space-y-3 lg:col-span-7">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  Real-Time Security Event Stream
                </CardTitle>
                {/* Severity Filters */}
                <div className="flex flex-wrap items-center gap-1">
                  {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        severityFilter === sev
                          ? "border-cyan-500 bg-cyan-950/60 text-cyan-300 font-semibold"
                          : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <ScrollArea className="h-96 pr-2">
                {eventsData && eventsData.data && eventsData.data.length > 0 ? (
                  <div className="space-y-2">
                    {eventsData.data.map((evt: SecurityEventItem) => {
                      const isCrit = evt.severity === "CRITICAL";
                      const isHigh = evt.severity === "HIGH";
                      return (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                            selectedEvent?.id === evt.id
                              ? "border-cyan-500 bg-cyan-950/30 text-white shadow-md shadow-cyan-950"
                              : "border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`text-[10px] font-bold px-1.5 py-0 ${
                                  isCrit
                                    ? "bg-rose-950 text-rose-300 border-rose-500/50"
                                    : isHigh
                                    ? "bg-amber-950 text-amber-300 border-amber-500/50"
                                    : "bg-blue-950 text-blue-300 border-blue-500/40"
                                }`}
                              >
                                {evt.severity}
                              </Badge>
                              <span className="font-semibold text-slate-200 line-clamp-1">
                                {evt.description}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 shrink-0">
                              {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                            <span className="font-mono text-cyan-400/80">
                              {evt.source} · {evt.hostname || evt.ip_address || "Identity Provider"}
                            </span>
                            <div className="flex items-center gap-2">
                              {isCrit && (
                                <Badge variant="outline" className="border-rose-500/40 text-rose-300 text-[10px]">
                                  +₹18L Exposure
                                </Badge>
                              )}
                              {isHigh && (
                                <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px]">
                                  Risk +11
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    No matching telemetry events found. Use the buttons above to inject synthetic incident bursts.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Prioritized Alerts (5 cols) */}
        <div className="space-y-3 lg:col-span-5">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Prioritized Risk Alerts ({alertsData?.data?.length || 0})
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                  Continuous Triage
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <ScrollArea className="h-96 pr-2">
                {alertsData && alertsData.data && alertsData.data.length > 0 ? (
                  <div className="space-y-3">
                    {alertsData.data.map((alert: RiskAlertItem) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-xs space-y-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`text-[9px] px-1.5 py-0 ${
                                  alert.severity === "CRITICAL"
                                    ? "bg-rose-950 text-rose-300 border-rose-500/50"
                                    : "bg-amber-950 text-amber-300 border-amber-500/50"
                                }`}
                              >
                                {alert.severity}
                              </Badge>
                              <span className="font-bold text-slate-200 line-clamp-1">{alert.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {alert.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                          <span className="font-mono text-slate-500">
                            Status: <span className="text-cyan-300">{alert.status}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {alert.status === "OPEN" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAlertAction(alert.id, "ACKNOWLEDGED")}
                                className="h-6 text-[10px] px-2 border-slate-700 text-slate-300 hover:bg-slate-800"
                              >
                                Acknowledge
                              </Button>
                            )}
                            {alert.status !== "RESOLVED" && (
                              <Button
                                size="sm"
                                onClick={() => handleAlertAction(alert.id, "RESOLVED")}
                                className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    All prioritized alerts resolved. Telemetry stream monitored.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: IAM & CSPM CONTINUOUS RISK SIGNALS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* IAM Posture Card */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Identity & Access (IAM) Continuous Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-500">MFA Disabled</p>
                <p className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                  {iamSignals?.mfa_disabled_accounts ?? 1}
                </p>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-500">Privileged Accts</p>
                <p className="text-lg font-bold text-cyan-300 font-mono mt-0.5">
                  {iamSignals?.privileged_identities_count ?? 4}
                </p>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-500">Auth Bursts</p>
                <p className="text-lg font-bold text-amber-300 font-mono mt-0.5">Detected</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Correlated with single-sign-on event logs to detect credential theft and lateral pivoting before data compromise.
            </p>
          </CardContent>
        </Card>

        {/* CSPM Posture Card */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Cloud Security Posture (CSPM) Continuous Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-500">Public Buckets</p>
                <p className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                  {cspmSignals?.public_storage_buckets ?? 1}
                </p>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-500">Open Ports</p>
                <p className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                  {cspmSignals?.open_sensitive_ports ?? 2}
                </p>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-500">Unencrypted DB</p>
                <p className="text-lg font-bold text-purple-300 font-mono mt-0.5">
                  {cspmSignals?.unencrypted_databases ?? 1}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Continuously updates perimeter exposure multipliers across Neo4j graph nodes and deterministic risk scores.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
