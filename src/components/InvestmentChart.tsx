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
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="investmentInr"
            tickFormatter={(v: number) => formatInr(v)}
            tick={{ fill: "#8b97ab", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fill: "#8b97ab", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => [String(value), "Residual risk"]}
            labelFormatter={(label) => `Investment ${formatInr(Number(label))}`}
            contentStyle={{
              background: "#10182a",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 12,
            }}
          />
          <Line type="monotone" dataKey="residualRisk" stroke="#22d3ee" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
