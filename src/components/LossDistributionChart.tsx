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
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="percentile" tick={{ fill: "#8b97ab", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: "#8b97ab", fontSize: 11 }}
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
              background: "#10182a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="display" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
