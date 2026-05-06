import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  MonthlyFeesPoint,
  MonthlyPlatformVolumePoint,
  MonthlySubscriptionPoint,
} from "../lib/dashboardConstants";
import { formatMonthShort, formatUsd } from "../lib/format";

const MINT = "#2ECC8F";
const MINT_DEEP = "#1B7340";

interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

interface StackedBarsProps<T extends { month: string }> {
  data: T[];
  series: SeriesDef[];
  height?: number;
}

function monthLabel(month: string, i: number): string {
  const short = formatMonthShort(month);
  const showYear = i === 0 || month.endsWith("-01");
  return showYear ? `${short} ’${month.slice(2, 4)}` : short;
}

function StackedBars<T extends { month: string }>({
  data,
  series,
  height = 240,
}: StackedBarsProps<T>) {
  const chartData = data.map((d, i) => ({
    ...d,
    label: monthLabel(d.month, i),
  }));
  const labelByKey = Object.fromEntries(series.map((s) => [s.key, s.label]));

  return (
    <div className="w-full" style={{ height }}>
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
              if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
              if (n >= 10_000) return `$${Math.round(n / 1000)}k`;
              if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
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
              const label = labelByKey[String(name)] ?? String(name);
              return [formatUsd(n), label];
            }}
          />
          {series.map((s, idx) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="stack"
              fill={s.color}
              radius={idx === series.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend({ series }: { series: SeriesDef[] }) {
  return (
    <div className="flex items-center gap-4 text-xs text-ink-muted flex-wrap">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

const PLATFORM_SERIES: SeriesDef[] = [
  { key: "financing_usd", label: "Financing GMV", color: MINT },
  { key: "insurance_usd", label: "Insurance GMV", color: MINT_DEEP },
];

const SUBS_SERIES: SeriesDef[] = [
  { key: "subs_usd", label: "Subscriptions", color: MINT },
];

const FEES_SERIES: SeriesDef[] = [
  { key: "transaction_usd", label: "Transaction", color: MINT },
  { key: "insurance_admin_usd", label: "Insurance admin", color: MINT_DEEP },
];

export function PlatformVolumeChart({
  data,
  height = 260,
}: {
  data: MonthlyPlatformVolumePoint[];
  height?: number;
}) {
  return <StackedBars data={data} series={PLATFORM_SERIES} height={height} />;
}

export function PlatformVolumeChartLegend() {
  return <Legend series={PLATFORM_SERIES} />;
}

export function SubscriptionsChart({
  data,
  height = 200,
}: {
  data: MonthlySubscriptionPoint[];
  height?: number;
}) {
  return <StackedBars data={data} series={SUBS_SERIES} height={height} />;
}

export function FeesChart({
  data,
  height = 200,
}: {
  data: MonthlyFeesPoint[];
  height?: number;
}) {
  return <StackedBars data={data} series={FEES_SERIES} height={height} />;
}

export function FeesChartLegend() {
  return <Legend series={FEES_SERIES} />;
}
