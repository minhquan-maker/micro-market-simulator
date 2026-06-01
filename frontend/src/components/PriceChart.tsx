import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PricePoint } from "../types";

interface Props {
  data: PricePoint[];
  initialPrice: number;
}

export default function PriceChart({ data, initialPrice }: Props) {
  if (data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📈</div>
        <div className="empty-state-text">
          Price chart will appear<br />as the simulation runs
        </div>
      </div>
    );
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || 1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="tick"
          stroke="#64748b"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#64748b", fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice - padding, maxPrice + padding]}
          stroke="#64748b"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#64748b", fontSize: 10 }}
          tickFormatter={(v: number) => v.toFixed(1)}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: "#1a2235",
            border: "1px solid #1e2d45",
            borderRadius: 6,
            fontSize: 11,
            fontFamily: "JetBrains Mono, monospace",
            color: "#e2e8f0",
          }}
          labelStyle={{ color: "#64748b" }}
          formatter={(value: number) => [value.toFixed(3), "Price"]}
          labelFormatter={(label: number) => `Tick ${label}`}
        />
        <ReferenceLine
          y={initialPrice}
          stroke="#3b82f6"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#22c55e"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, fill: "#22c55e", stroke: "#0a0e17", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
