/**
 * GMV last-six-months bar chart for the dashboard.
 *
 * Brief: Recharts vertical bars, mint fill, no grid lines, no Y-axis labels,
 * month labels below.
 */

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import { formatMonthShort, formatUsd } from "../lib/format";

interface Point {
  month: string;
  amount_usd: number;
}

export function GmvBarChart({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({
    monthLabel: formatMonthShort(d.month),
    value: d.amount_usd,
  }));

  return (
    <div className="w-full" style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 24, right: 12, left: 12, bottom: 4 }}
        >
          <XAxis
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#666666" }}
          />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((d) => (
              <Cell key={d.monthLabel} fill="#2ECC8F" />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(value) => {
                const n = Number(value);
                return Number.isFinite(n) && n > 0 ? formatUsd(n) : "";
              }}
              style={{ fontSize: 10, fill: "#666666", fontVariantNumeric: "tabular-nums" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
