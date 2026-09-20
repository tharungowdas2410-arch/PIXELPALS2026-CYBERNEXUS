"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileCheck,
  FileText,
  Landmark,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatInr } from "@/lib/format";
import { getExecutiveReport, type ExecutiveReportData } from "@/lib/api";

export default function ReportsHubPage() {
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExecutiveReport();
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load executive report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getExecutiveReport()
      .then((data) => {
        if (active) {
          setReport(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load executive report");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cybernexus_executive_report_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Executive & Compliance Reports Hub"
        description="Consolidated quantitative risk reporting, financial exposure models, and board decision briefs."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadJSON} disabled={!report}>
            <Download className="mr-2 h-4 w-4" />
            Download JSON
          </Button>
          <Button size="sm" onClick={() => window.print()} disabled={!report}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </PageHeader>

      {error && (
        <Card className="border-rose-200 bg-rose-50 text-rose-800 shadow-sm">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="text-xs font-semibold text-rose-900 uppercase tracking-wide">
                  Executive Report Generation Failed
                </p>
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              className="border-rose-300 bg-white text-rose-700 hover:bg-rose-100 text-xs shrink-0"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Section 36: Standardized Report Catalog */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Enterprise Cybersecurity Report Catalog
          </p>
          <span className="text-[11px] text-blue-600 font-mono font-medium">6 Standard Reports Available</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { id: "exec_risk", title: "Executive Risk Report", target: "overview", desc: "Board-level cyber posture, VaR 95%, and annualized financial loss summary." },
            { id: "posture", title: "Security Posture Report", target: "overview", desc: "Asset hygiene, vulnerability distribution, and attack-surface exposure." },
            { id: "investment", title: "Investment Decision Brief", target: "investments", desc: "OR-Tools recommended budget allocations, loss avoided, and ROSI." },
            { id: "compliance", title: "Compliance Report", target: "compliance", desc: "NIST CSF, ISO 27001, CIS, RBI, and SEBI mapped control alignment." },
            { id: "attack_path", title: "Attack Path Report", target: "financial", desc: "Neo4j crown-jewel traversal chains, blast radius, and critical bottlenecks." },
            { id: "incident", title: "Incident Report", target: "overview", desc: "Real-time telemetry drift, active alerts, and incident-to-financial impact." },
          ].map((item) => (
            <Card key={item.id} className="border-slate-200 bg-white p-4 flex flex-col justify-between hover:border-slate-300 shadow-sm transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px]">
                    PDF / JSON
                  </Badge>
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
              <div className="flex items-center gap-2 pt-3 mt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchReport}
                  disabled={loading}
                  className="h-7 text-[11px] px-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Generate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const elem = document.getElementById("reports-tabs");
                    elem?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-7 text-[11px] px-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDownloadJSON}
                  disabled={!report}
                  className="h-7 text-[11px] px-2 text-slate-500 hover:text-slate-900 ml-auto"
                >
                  <Download className="h-3 w-3 mr-1" />
                  JSON
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {loading && !report ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : report ? (
        <Tabs id="reports-tabs" defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/40">
            <TabsTrigger value="overview">Executive Summary</TabsTrigger>
            <TabsTrigger value="financial">Financial Risk & VaR</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Assurance</TabsTrigger>
            <TabsTrigger value="investments">Investment Portfolio</TabsTrigger>
          </TabsList>

          {/* Tab 1: Executive Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Top Score Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wider">Overall Posture</CardDescription>
                  <CardTitle className="text-3xl font-bold tracking-tight text-emerald-600">
                    {report.executive_summary.posture_score} / 100
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="default">Grade {report.executive_summary.posture_grade}</Badge>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wider">Expected Annual Loss (EAL)</CardDescription>
                  <CardTitle className="text-2xl font-bold tracking-tight text-primary">
                    {formatInr(report.financial_risk_quantification.expected_annual_loss_inr)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Annualized probabilistic loss</p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wider">95% Value at Risk (VaR)</CardDescription>
                  <CardTitle className="text-2xl font-bold tracking-tight text-rose-600">
                    {formatInr(report.financial_risk_quantification.value_at_risk_95_inr)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">1-in-20 year tail risk</p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wider">Optimal Portfolio ROSI</CardDescription>
                  <CardTitle className="text-2xl font-bold tracking-tight text-emerald-600">
                    {report.investment_recommendations.portfolio_rosi.toFixed(1)}x
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Return on Security Investment</p>
                </CardContent>
              </Card>
            </div>

            {/* Narrative */}
            <Card className="border-border/60 bg-muted/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  CISO Executive Briefing Narrative
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {report.executive_summary.narrative}
                </p>
                <div className="mt-4 pt-4 border-t border-border/40 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Report ID: {report.report_metadata.report_id}</span>
                  <span>Generated: {new Date(report.report_metadata.generated_at).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Top Risk Drivers */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                  Primary Threat & Vulnerability Drivers
                </CardTitle>
                <CardDescription>Top unmitigated risk items requiring executive allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.top_risk_drivers.map((driver, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-semibold block text-foreground">{driver.title}</span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {driver.severity}
                          </Badge>
                          <span>Residual Risk: {driver.residual_risk.toFixed(1)}/100</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-rose-600 block">{formatInr(driver.loss)}</span>
                        <span className="text-[10px] text-muted-foreground">Expected Loss</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Financial Risk */}
          <TabsContent value="financial" className="space-y-6">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  Quantitative Cyber Loss Exceedance Scenarios
                </CardTitle>
                <CardDescription>10,000-iteration Monte Carlo simulated loss scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {report.financial_risk_quantification.loss_exceedance_scenarios.map((sc, idx) => (
                    <div key={idx} className="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {sc.scenario}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{sc.confidence}</Badge>
                      </div>
                      <div className="text-2xl font-bold font-mono text-primary">
                        {formatInr(sc.simulated_loss_inr)}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Estimated financial loss threshold at {sc.confidence} probability.
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Compliance */}
          <TabsContent value="compliance" className="space-y-6">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  Multi-Standard Compliance Alignment
                </CardTitle>
                <CardDescription>Overall alignment index: {report.compliance_alignment.overall_score}% across {report.compliance_alignment.total_requirements} controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.compliance_alignment.frameworks.map((fw, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-xs">
                      <div>
                        <span className="font-semibold block text-foreground">{fw.framework}</span>
                        <span className="text-muted-foreground">{fw.controls} mapped control requirements</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">{fw.score}%</span>
                        <Badge variant={fw.status === "STRONG" ? "default" : "secondary"}>
                          {fw.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Investments */}
          <TabsContent value="investments" className="space-y-6">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Optimized Security Investment Allocations
                </CardTitle>
                <CardDescription>
                  Budget: {formatInr(report.investment_recommendations.available_budget_inr)} • Projected Loss Avoided: {formatInr(report.investment_recommendations.projected_loss_avoided_inr)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.investment_recommendations.recommended_controls.map((ctl, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-xs">
                      <div>
                        <span className="font-semibold block text-foreground">{ctl.name}</span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{ctl.category}</Badge>
                          <span>Risk Reduction: -{ctl.estimated_risk_reduction.toFixed(1)} pts</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-primary block">{formatInr(ctl.cost)}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">{ctl.rosi.toFixed(1)}x ROSI</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
