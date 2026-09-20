"use client";

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
import type { RiskTrendPoint } from "@/lib/types";

export function RiskTrendChart({ data }: { data: RiskTrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 12,
              color: "#0F172A",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#475569" }} />
          <Area
            type="monotone"
            dataKey="currentRisk"
            name="Current Risk"
            stroke="#2563EB"
            fill="url(#riskFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="previousPeriod"
            name="Previous Period"
            stroke="#64748B"
            fill="transparent"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="riskAppetite"
            name="Risk Appetite"
            stroke="#16A34A"
            fill="transparent"
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
