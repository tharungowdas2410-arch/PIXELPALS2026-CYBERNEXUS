"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Download,
  Gauge,
  Info,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getSecurityPosture, type SecurityPostureResponse } from "@/lib/api";

export default function SecurityPosturePage() {
  const [data, setData] = useState<SecurityPostureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const fetchPosture = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSecurityPosture();
      setData(res);
      const firstKey = Object.keys(res.domains)[0];
      if (firstKey && !selectedDomain) {
        setSelectedDomain(firstKey);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load security posture");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosture();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 65) return "text-amber-400";
    return "text-rose-400";
  };

  const getGradeBadgeVariant = (grade: string) => {
    if (grade.startsWith("A")) return "default";
    if (grade.startsWith("B")) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Enterprise Security Posture"
        description="Continuous 8-domain quantitative cybersecurity posture scorecard and control alignment assessment."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchPosture} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recalculate Posture
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Export Scorecard
          </Button>
        </div>
      </PageHeader>

      {error && (
        <Card className="border-rose-800 bg-rose-950/20 text-rose-300">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Top Level Scorecard */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border/60 bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Overall Posture Score</CardDescription>
                <CardTitle className={`text-4xl font-bold tracking-tight ${getScoreColor(data.posture_score)}`}>
                  {data.posture_score}
                  <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={getGradeBadgeVariant(data.overall_grade)} className="px-2 py-0.5 text-xs font-bold">
                    Grade {data.overall_grade}
                  </Badge>
                  <span>• {data.status}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Compliance Alignment</CardDescription>
                <CardTitle className="text-4xl font-bold tracking-tight text-primary">
                  {data.compliance_alignment_index}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">5 Frameworks (NIST, ISO, CIS, RBI, SEBI)</p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Assessed Domains</CardDescription>
                <CardTitle className="text-4xl font-bold tracking-tight">
                  {Object.keys(data.domains).length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">100% evaluated continuously</p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Assurance Engine</CardDescription>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Zero-Trust
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Model v{data.model_version} • Grounded Facts</p>
              </CardContent>
            </Card>
          </div>

          {/* Executive Narrative */}
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Executive Narrative</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{data.summary_narrative}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 8 Domains Grid */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold tracking-tight">Domain Score Breakdown</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(data.domains).map(([domainName, d]) => {
                const isSelected = selectedDomain === domainName;
                return (
                  <Card
                    key={domainName}
                    onClick={() => setSelectedDomain(domainName)}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      isSelected ? "border-primary ring-1 ring-primary/40 bg-primary/5" : "border-border/60"
                    }`}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                          {domainName.replace(/_/g, " ")}
                        </span>
                        <Badge variant={getGradeBadgeVariant(d.grade)} className="text-[10px] font-mono">
                          {d.grade}
                        </Badge>
                      </div>
                      <CardTitle className={`text-2xl font-bold ${getScoreColor(d.score)}`}>
                        {d.score}
                        <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full ${
                            d.score >= 80 ? "bg-emerald-500" : d.score >= 65 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, d.score)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Compliant: {d.compliant_controls}/{d.critical_controls}</span>
                        <span>Weight: {(d.weight * 100).toFixed(0)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Selected Domain Deep Dive & Priorities */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Domain Details */}
            {selectedDomain && data.domains[selectedDomain] && (
              <Card className="border-border/60">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize text-base">
                        {selectedDomain.replace(/_/g, " ")} Details
                      </CardTitle>
                      <CardDescription>Targeted control gaps and posture drivers</CardDescription>
                    </div>
                    <Badge variant={getGradeBadgeVariant(data.domains[selectedDomain].grade)}>
                      Grade {data.domains[selectedDomain].grade} ({data.domains[selectedDomain].score}/100)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Identified Gaps & Weaknesses
                    </h5>
                    {data.domains[selectedDomain].gaps.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        No high-priority control gaps detected in this domain.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {data.domains[selectedDomain].gaps.map((gap, i) => (
                          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-muted/10 p-3 text-xs">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strategic Priorities */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Immediate Strategic Priorities
                </CardTitle>
                <CardDescription>High-impact remediations recommended by the engine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.immediate_priorities.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 text-xs leading-relaxed">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="space-y-1.5 pt-1">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Organizational Strengths
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {data.strengths.map((str, i) => (
                      <Badge key={i} variant="outline" className="border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-[11px]">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {str}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statutory Disclaimer */}
          <div className="rounded-lg border border-border/40 bg-muted/10 p-4 text-xs text-muted-foreground flex items-center gap-3">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{data.disclaimer}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
