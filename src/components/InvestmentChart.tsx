"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInr } from "@/lib/format";

export function InvestmentChart({
  data,
}: {
  data: Array<{ investmentInr: number; residualRisk: number }>;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="investmentInr"
            tickFormatter={(v: number) => formatInr(v)}
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => [String(value), "Residual risk"]}
            labelFormatter={(label) => `Investment ${formatInr(Number(label))}`}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 12,
              color: "#0F172A",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Line type="monotone" dataKey="residualRisk" stroke="#2563EB" strokeWidth={2} dot={{ fill: "#2563EB" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
