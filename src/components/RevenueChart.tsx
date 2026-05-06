import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyRevenuePoint } from "../lib/dashboardConstants";
import { formatMonthShort, formatUsd } from "../lib/format";

const MINT = "#2ECC8F";
const MINT_DEEP = "#1B7340";

export function RevenueChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const chartData = data.map((d) => ({
    month: d.month,
    label: formatMonthShort(d.month) +
      (d.month.endsWith("-01") || d.month === data[0].month ? ` ’${d.month.slice(2, 4)}` : ""),
    subs: d.subs_usd,
    fees: d.fees_usd,
    total: d.subs_usd + d.fees_usd,
  }));

  return (
    <div className="w-full" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 16, right: 12, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            stroke="#EFEFEF"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={{ fontSize: 10, fill: "#666666" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#666666" }}
            tickFormatter={(v) => {
              const n = Number(v);
              if (!Number.isFinite(n) || n === 0) return "";
              if (n >= 1000) return `$${Math.round(n / 1000)}k`;
              return `$${n}`;
            }}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "#F4F4F4" }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #E6E6E6",
              padding: "8px 10px",
            }}
            labelStyle={{
              fontSize: 11,
              color: "#666666",
              marginBottom: 4,
            }}
            formatter={(value, name) => {
              const n = Number(value);
              const label =
                name === "subs"
                  ? "Subscriptions"
                  : name === "fees"
                  ? "Fees"
                  : String(name);
              return [formatUsd(n), label];
            }}
          />
          <Bar
            dataKey="subs"
            stackId="rev"
            fill={MINT}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="fees"
            stackId="rev"
            fill={MINT_DEEP}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChartLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-ink-muted">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: MINT }}
        />
        Subscriptions
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: MINT_DEEP }}
        />
        Fees
      </span>
    </div>
  );
}
