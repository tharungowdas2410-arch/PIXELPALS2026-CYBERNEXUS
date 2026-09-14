"use client";

import { useState } from "react";
import { z } from "zod";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardCard } from "@/components/DashboardCard";
import { FinancialExposureCard } from "@/components/FinancialExposureCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { LossDistributionChart } from "@/components/LossDistributionChart";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCalculateFinancial, useFinancialSummary, useLossDistribution, useMonteCarlo } from "@/lib/hooks/useFinancial";
import { formatInr } from "@/lib/format";

const mcSchema = z.object({
  expected_loss: z.coerce.number().min(0),
  min_loss: z.coerce.number().min(0),
  max_loss: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(1),
  simulations: z.coerce.number().min(100).max(50000),
  seed: z.coerce.number(),
});

export default function FinancialRiskPage() {
  const summary = useFinancialSummary();
  const distribution = useLossDistribution();
  const monte = useMonteCarlo();
  const calc = useCalculateFinancial();
  const [mc, setMc] = useState({
    expected_loss: "1000000",
    min_loss: "100000",
    max_loss: "5000000",
    probability: "0.4",
    simulations: "5000",
    seed: "26105",
  });
  const [ealForm, setEalForm] = useState({ likelihood: "0.4", impact: "0.7", asset_business_value: "10000000" });

  const live = monte.data ?? distribution.data;
  const lossPoints = live
    ? [
        { percentile: "Mean", lossInr: live.mean },
        { percentile: "P50", lossInr: live.p50 },
        { percentile: "P75", lossInr: live.p75 },
        { percentile: "P90", lossInr: live.p90 },
        { percentile: "P95", lossInr: live.p95 },
        { percentile: "P99", lossInr: live.p99 },
      ]
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financial Risk"
        description="Illustrative loss distribution, VaR and expected annual loss. Not actuarial output."
        actions={<IllustrativeNote />}
      />
      {summary.isLoading || (summary.isFetching && !summary.data) ? (
        <LoadingState />
      ) : summary.isError || !summary.data || summary.data.expected_annual_loss === undefined ? (
        summary.isFetching ? <LoadingState /> : <ErrorState message="Unable to load financial summary." onRetry={() => summary.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <FinancialExposureCard title="Expected Annual Loss" amountInr={summary.data.expected_annual_loss ?? 0} />
            <FinancialExposureCard
              title="Value at Risk (95%)"
              amountInr={live?.var ?? live?.p95 ?? 0}
              caption="P95 of the illustrative Monte Carlo."
            />
            <FinancialExposureCard
              title="Total financial exposure"
              amountInr={summary.data.total_financial_exposure}
              caption={`${summary.data.risk_count} quantified risks`}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardCard title="Risk distribution">
              {distribution.isLoading ? (
                <LoadingState />
              ) : lossPoints.length ? (
                <LossDistributionChart data={lossPoints} />
              ) : (
                <EmptyState title="No distribution" description="Quantify risks first." />
              )}
            </DashboardCard>
            <DashboardCard title="Simulation buckets">
              {live?.distribution_buckets?.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={live.distribution_buckets}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="from" tickFormatter={(v: number) => formatInr(v)} tick={{ fill: "#8b97ab", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#8b97ab", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#10182a", border: "1px solid #1e2a40" }} />
                      <Bar dataKey="count" fill="#22d3ee" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="No buckets" description="Run Monte Carlo to populate histogram bins." />
              )}
            </DashboardCard>
          </div>
          <DashboardCard title="Percentiles">
            <Table>
              <TableHeader>
                <TableRow>
                  {["P50", "P75", "P90", "P95", "P99", "VaR"].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono">{formatInr(live?.p50 ?? 0)}</TableCell>
                  <TableCell className="font-mono">{formatInr(live?.p75 ?? 0)}</TableCell>
                  <TableCell className="font-mono">{formatInr(live?.p90 ?? 0)}</TableCell>
                  <TableCell className="font-mono">{formatInr(live?.p95 ?? 0)}</TableCell>
                  <TableCell className="font-mono">{formatInr(live?.p99 ?? 0)}</TableCell>
                  <TableCell className="font-mono">{formatInr(live?.var ?? 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DashboardCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardCard title="Run Monte Carlo">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(mc).map(([key, value]) => (
                  <div key={key}>
                    <Label className="capitalize">{key.replaceAll("_", " ")}</Label>
                    <Input className="mt-1 font-mono" value={value} onChange={(e) => setMc((c) => ({ ...c, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <Button
                className="mt-4"
                onClick={() => {
                  const parsed = mcSchema.safeParse(mc);
                  if (parsed.success) monte.mutate(parsed.data);
                }}
                disabled={monte.isPending || !mcSchema.safeParse(mc).success}
              >
                Simulate
              </Button>
              {monte.isError ? <p className="mt-2 text-sm text-amber-200">Simulation failed.</p> : null}
            </DashboardCard>
            <DashboardCard title="Calculate EAL">
              {Object.entries(ealForm).map(([key, value]) => (
                <div key={key} className="mt-2">
                  <Label className="capitalize">{key.replaceAll("_", " ")}</Label>
                  <Input className="mt-1 font-mono" value={value} onChange={(e) => setEalForm((c) => ({ ...c, [key]: e.target.value }))} />
                </div>
              ))}
              <Button
                className="mt-4"
                onClick={() =>
                  calc.mutate({
                    likelihood: Number(ealForm.likelihood),
                    impact: Number(ealForm.impact),
                    asset_business_value: Number(ealForm.asset_business_value),
                  })
                }
                disabled={calc.isPending}
              >
                Calculate
              </Button>
              {calc.data ? (
                <p className="mt-3 font-mono text-sm text-cyan-200">
                  EAL {formatInr(Number(calc.data.estimated_annual_loss))}
                </p>
              ) : null}
            </DashboardCard>
          </div>
        </>
      )}
    </div>
  );
}
