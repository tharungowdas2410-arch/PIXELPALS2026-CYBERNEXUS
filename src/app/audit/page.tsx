"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Filter,
  History,
  Lock,
  RefreshCw,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getAuditLogs, type AuditLogItem } from "@/lib/api";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async (p = page) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAuditLogs({
        page: p,
        page_size: pageSize,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        result: resultFilter || undefined,
      });
      setLogs(res.data);
      setTotal(res.total);
      setPage(res.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs. Check permissions (Admin/CISO required).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, entityFilter, resultFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Audit Trail Explorer"
        description="Immutable, tamper-evident audit records tracking all authentication, administrative, and risk decision events."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchLogs(page)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Export Audit Log
          </Button>
        </div>
      </PageHeader>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Total Recorded Events</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight">{total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Append-only compliance ledger</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Storage & Immutability</CardDescription>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-400" />
              WORM Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">365-day retention • SHA-256 decision hashes</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Access Policy</CardDescription>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Role-Gated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Restricted to ADMIN and CISO roles</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-rose-800 bg-rose-950/20 text-rose-300">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Action Filter</label>
              <Input
                placeholder="e.g. LOGIN, OPTIMIZE_INVESTMENTS"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Entity Type</label>
              <Input
                placeholder="e.g. User, Asset, Portfolio"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Result Status</label>
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="">All Results</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table & Detail Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Audit Records</CardTitle>
                <span className="text-xs text-muted-foreground">Page {page} of {Math.ceil(total / pageSize) || 1}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-y border-border bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="p-3">Timestamp (UTC)</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entity</th>
                      <th className="p-3">Result</th>
                      <th className="p-3">IP / Correlation</th>
                      <th className="p-3 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2" />
                          Loading audit records...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No audit records found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`cursor-pointer transition-colors hover:bg-muted/20 ${
                            selectedLog?.id === log.id ? "bg-primary/10" : ""
                          }`}
                        >
                          <td className="p-3 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                            {new Date(log.timestamp).toISOString().replace("T", " ").substring(0, 19)}
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            {log.action}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {log.entity_type}
                            {log.entity_id && (
                              <span className="ml-1 text-[10px] font-mono text-muted-foreground/80">
                                ({log.entity_id.substring(0, 8)}...)
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {log.result === "SUCCESS" ? (
                              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/20 text-emerald-400 text-[10px]">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                SUCCESS
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-rose-500/40 bg-rose-950/20 text-rose-400 text-[10px]">
                                <XCircle className="mr-1 h-3 w-3" />
                                FAILED
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-muted-foreground">
                            <div>{log.ip_address || "127.0.0.1"}</div>
                            {log.correlation_id && (
                              <div className="truncate max-w-[100px] text-[9px] text-muted-foreground/60">
                                {log.correlation_id}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border p-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => fetchLogs(page - 1)}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Showing {logs.length} of {total} events
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * pageSize >= total || loading}
                  onClick={() => fetchLogs(page + 1)}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Record Detail Panel */}
        <div className="lg:col-span-1">
          <Card className="border-border/60 sticky top-6">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Record Details</span>
                {selectedLog && (
                  <Badge variant={selectedLog.result === "SUCCESS" ? "outline" : "destructive"} className="text-[10px]">
                    {selectedLog.result}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedLog ? selectedLog.id : "Select a record to view details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              {selectedLog ? (
                <>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Action:</span>
                      <span className="font-mono font-semibold">{selectedLog.action}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Entity Type:</span>
                      <span className="font-medium">{selectedLog.entity_type}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Entity ID:</span>
                      <span className="font-mono text-[11px] truncate max-w-[160px]">{selectedLog.entity_id || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Actor User ID:</span>
                      <span className="font-mono text-[11px] truncate max-w-[160px]">{selectedLog.user_id || "System / Anonymous"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Client IP:</span>
                      <span className="font-mono">{selectedLog.ip_address || "127.0.0.1"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Correlation ID:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[10px] truncate max-w-[120px]">{selectedLog.correlation_id || "N/A"}</span>
                        {selectedLog.correlation_id && (
                          <button
                            onClick={() => copyToClipboard(selectedLog.correlation_id!, "corr")}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Structured Details:</span>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(selectedLog.details, null, 2), "json")}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedId === "json" ? "Copied!" : "Copy JSON"}
                      </button>
                    </div>
                    <ScrollArea className="h-48 rounded border border-border/40 bg-muted/20 p-2">
                      <pre className="font-mono text-[10px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <History className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  Click on any row in the audit log table to inspect detailed actor, correlation, and payload metadata.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
