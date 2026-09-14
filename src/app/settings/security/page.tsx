"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  FileCheck,
  KeyRound,
  Lock,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSystemStatus, type SystemStatusResponse } from "@/lib/api";

export default function SecuritySettingsPage() {
  const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSystemStatus();
      setStatusData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load system security status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Security & Retention Settings"
        description="Review enterprise zero-trust controls, cryptographic configuration, rate limiting, and regulatory retention rules."
      >
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Health Status
        </Button>
      </PageHeader>

      {error && (
        <Card className="border-rose-800 bg-rose-950/20 text-rose-300">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* System Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">System State</CardDescription>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {statusData?.status === "healthy" ? "All Systems Operational" : "Active"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Version {statusData?.version || "1.0.0"} • {statusData?.environment || "production"}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Tenant Isolation</CardDescription>
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Strict Scoping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Row-level org_id scoping & IDOR prevention</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Password Policy</CardDescription>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-400" />
              Argon2id Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Min 8 chars, numbers & special symbols</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Brute-Force Guard</CardDescription>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              5 Failures / 15m
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Automatic 15-min account lockout</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Retention Policies Card */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Regulatory Data Retention Schedules
            </CardTitle>
            <CardDescription>Automated lifecycle schedules adhering to SEBI and RBI audit mandates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compliance Audit Logs</span>
                <Badge variant="outline" className="font-mono text-xs">365 Days</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Append-only log records retained for 1 year with actor, correlation IDs, and decision hashes.
              </p>
            </div>

            <div className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Security Telemetry Events</span>
                <Badge variant="outline" className="font-mono text-xs">90 Days</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Raw normalized telemetry ingested from SIEM, EDR, IAM, and CSPM connectors.
              </p>
            </div>

            <div className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Advisory Audit History</span>
                <Badge variant="outline" className="font-mono text-xs">180 Days</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Natural-language inquiries, tool execution plans, grounded evidence, and blockchain notarizations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Defense-in-Depth HTTP Headers & Controls */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Defense-in-Depth HTTP Security Baseline
            </CardTitle>
            <CardDescription>Enforced via backend middleware on every API response</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-start justify-between py-1.5 border-b border-border/40">
              <div>
                <span className="font-semibold block text-foreground">Content-Security-Policy (CSP)</span>
                <span className="text-muted-foreground">Restricts resource loading to self and trusted domains</span>
              </div>
              <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-500/40">Active</Badge>
            </div>

            <div className="flex items-start justify-between py-1.5 border-b border-border/40">
              <div>
                <span className="font-semibold block text-foreground">X-Frame-Options: DENY</span>
                <span className="text-muted-foreground">Clickjacking prevention disabling iframe embedding</span>
              </div>
              <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-500/40">Active</Badge>
            </div>

            <div className="flex items-start justify-between py-1.5 border-b border-border/40">
              <div>
                <span className="font-semibold block text-foreground">X-Content-Type-Options: nosniff</span>
                <span className="text-muted-foreground">Blocks MIME type sniffing vulnerabilities</span>
              </div>
              <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-500/40">Active</Badge>
            </div>

            <div className="flex items-start justify-between py-1.5 border-b border-border/40">
              <div>
                <span className="font-semibold block text-foreground">X-Request-ID Correlation</span>
                <span className="text-muted-foreground">Traceable UUID stamped onto every request and audit entry</span>
              </div>
              <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-500/40">Active</Badge>
            </div>

            <div className="flex items-start justify-between py-1.5">
              <div>
                <span className="font-semibold block text-foreground">Sliding-Window Rate Limiting</span>
                <span className="text-muted-foreground">10 req/min (auth), 30 req/min (AI), 120 req/min (API)</span>
              </div>
              <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-500/40">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
