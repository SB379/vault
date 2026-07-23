"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SEQ, GRID_STROKE, AXIS_TICK, TOOLTIP_STYLE, shortDate } from "./theme";

export function PapersPerDayChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const sparse = data.length < 3;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            labelFormatter={(l) => shortDate(String(l))}
          />
          <Bar dataKey="count" fill={SEQ} radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
      {sparse && (
        <p className="mt-1 text-center font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
          collecting data — one bar per digest day
        </p>
      )}
    </div>
  );
}
