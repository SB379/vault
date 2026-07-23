"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  SERIES,
  GRID_STROKE,
  AXIS_TICK,
  TOOLTIP_STYLE,
  shortDate,
} from "./theme";

export type ConceptFrequencyPoint = { date: string } & Record<string, number | string>;

export function ConceptFrequencyChart({
  data,
  concepts,
}: {
  data: ConceptFrequencyPoint[];
  concepts: string[];
}) {
  const sparse = data.length < 3;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(l) => shortDate(String(l))}
            cursor={{ stroke: "rgba(255,255,255,0.15)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace" }}
            iconType="plainline"
          />
          {concepts.map((c, i) => (
            <Line
              key={c}
              type="monotone"
              dataKey={c}
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={2}
              dot={sparse ? { r: 4, strokeWidth: 0, fill: SERIES[i % SERIES.length] } : false}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {sparse && (
        <p className="mt-1 text-center font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
          collecting data — trends appear as more days are ingested
        </p>
      )}
    </div>
  );
}
