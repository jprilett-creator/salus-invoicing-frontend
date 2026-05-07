import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
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
const AMBER = "#D97706";

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

function monthLabel(month: string): string {
  const short = formatMonthShort(month);
  return `${short} ’${month.slice(2, 4)}`;
}

function StackedBars<T extends { month: string }>({
  data,
  series,
  height = 240,
}: StackedBarsProps<T>) {
  const chartData = data.map((d) => ({
    ...d,
    label: monthLabel(d.month),
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

const SUBS_SERIES: SeriesDef[] = [
  { key: "subs_usd", label: "Subscriptions", color: MINT },
];

const FEES_SERIES: SeriesDef[] = [
  { key: "transaction_usd", label: "Transaction", color: MINT },
  { key: "insurance_admin_usd", label: "Insurance admin", color: MINT_DEEP },
];

const PLATFORM_LEGEND: SeriesDef[] = [
  { key: "gmv_usd", label: "GMV", color: MINT },
  { key: "parcels", label: "Parcels", color: AMBER },
];

function formatMonthLong(monthIso: string): string {
  const m = monthIso.match(/^(\d{4})-(\d{2})/);
  if (!m) return monthIso;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[Number(m[2]) - 1] ?? ""} ${m[1]}`;
}

interface PlatformTooltipPayload {
  payload: { month: string; gmv_usd: number; parcels: number };
}

function PlatformVolumeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: PlatformTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div
      style={{
        fontSize: 12,
        borderRadius: 6,
        border: "1px solid #E6E6E6",
        background: "#FFFFFF",
        padding: "8px 10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: 11, color: "#666666", marginBottom: 4 }}>
        {formatMonthLong(p.month)}
      </div>
      <div style={{ color: "#1B1B1B" }}>
        GMV: <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatUsd(p.gmv_usd)}</span>
      </div>
      <div style={{ color: "#1B1B1B" }}>
        Parcels: <span style={{ fontVariantNumeric: "tabular-nums" }}>{p.parcels}</span>
      </div>
    </div>
  );
}

export function PlatformVolumeChart({
  data,
  height = 260,
}: {
  data: MonthlyPlatformVolumePoint[];
  height?: number;
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: monthLabel(d.month),
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
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
            yAxisId="gmv"
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
            label={{
              value: "GMV (USD)",
              angle: -90,
              position: "insideLeft",
              offset: 16,
              style: {
                fontSize: 10,
                fill: "#666666",
                textAnchor: "middle",
              },
            }}
          />
          <YAxis
            yAxisId="parcels"
            orientation="right"
            domain={[0, 12]}
            hide
          />
          <Tooltip
            cursor={{ fill: "#F4F4F4" }}
            content={<PlatformVolumeTooltip />}
          />
          <Bar
            yAxisId="gmv"
            dataKey="gmv_usd"
            fill={MINT}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="parcels"
            type="monotone"
            dataKey="parcels"
            stroke="transparent"
            strokeWidth={0}
            dot={{ r: 4, fill: AMBER, stroke: AMBER, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: AMBER, stroke: "#FFFFFF", strokeWidth: 1.5 }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="parcels"
              position="top"
              offset={8}
              fill={AMBER}
              fontSize={11}
              formatter={(value: unknown) => {
                const n = Number(value);
                return Number.isFinite(n) && n > 0 ? String(n) : "";
              }}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlatformVolumeChartLegend() {
  return <Legend series={PLATFORM_LEGEND} />;
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
