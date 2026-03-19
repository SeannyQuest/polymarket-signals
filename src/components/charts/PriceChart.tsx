"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MarketPriceSnapshot } from "@prisma/client";
import { formatProbability } from "@/lib/utils";

interface Props {
  snapshots: MarketPriceSnapshot[];
}

export function PriceChart({ snapshots }: Props) {
  const data = snapshots.map((s) => ({
    time: new Date(s.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    }),
    price: s.price,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatProbability}
          tick={{ fontSize: 10, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          domain={[0, 1]}
          width={44}
        />
        <Tooltip
          formatter={(val) => [formatProbability(Number(val)), "YES Price"]}
          contentStyle={{
            background: "#13131f",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
          }}
          labelStyle={{ color: "#6b7280", fontSize: 11 }}
          itemStyle={{ color: "#44ddfd" }}
        />
        <ReferenceLine
          y={0.5}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="4 2"
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#44ddfd"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#44ddfd" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
