"use client";

/**
 * Chart primitives (Recharts) styled for the Industrial Pro theme.
 * Palette validated for CVD separation on the dark surface (#202428):
 * series A #E86A1F, series B #4A90D9. Single-series charts use the primary orange.
 */
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, type TooltipProps } from "recharts";

import { SERIES } from "./palette";
export { SERIES };
const AXIS = { stroke: "#353B40", tick: { fill: "#9AA1A8", fontSize: 11 }, tickLine: false };

function ChartTooltip({ active, payload, label, unit }: TooltipProps<number, string> & { unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-fg">{label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-sm" style={{ background: (p.payload?.fill as string) ?? p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-mono text-fg">
            {p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function VerticalBarChart({
  data,
  height = 220,
  name = "Anzahl",
  unit,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  name?: string;
  unit?: string;
}) {
  if (!data.length) return <ChartEmpty height={height} />;
  return (
    <div style={{ height }} role="img" aria-label={`${name}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 4, left: -20, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#2A2F34" />
          <XAxis dataKey="label" {...AXIS} interval={0} />
          <YAxis allowDecimals={false} {...AXIS} axisLine={false} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip unit={unit} />} />
          <Bar dataKey="value" name={name} radius={[4, 4, 0, 0]} maxBarSize={44} label={{ position: "top", fill: "#9AA1A8", fontSize: 11 }}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color ?? "#FF7A1A"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({
  data,
  series,
  height = 240,
}: {
  data: Record<string, string | number>[];
  series: { key: string; name: string; color: string }[];
  height?: number;
}) {
  if (!data.length) return <ChartEmpty height={height} />;
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded" style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#2A2F34" />
            <XAxis dataKey="label" {...AXIS} />
            <YAxis allowDecimals={false} {...AXIS} axisLine={false} />
            <Tooltip cursor={{ stroke: "#454C52" }} content={<ChartTooltip />} />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: s.color }} activeDot={{ r: 5, stroke: "#202428", strokeWidth: 2 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartEmpty({ height }: { height: number }) {
  return (
    <div style={{ height }} className="bg-grid flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted">
      Keine Daten im gewählten Zeitraum
    </div>
  );
}
