"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LossDistributionPoint } from "@/lib/types";
import { formatInr } from "@/lib/format";

export function LossDistributionChart({ data }: { data: LossDistributionPoint[] }) {
  const chartData = data.map((item) => ({
    ...item,
    display: Number((item.lossInr / 1_00_00_000).toFixed(2)),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="percentile" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `₹${v} Cr`}
          />
          <Tooltip
            formatter={(value, _name, props) => [
              formatInr((props.payload as LossDistributionPoint).lossInr),
              "Modeled loss",
            ]}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 12,
              color: "#0F172A",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Bar dataKey="display" fill="#2563EB" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
