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
import { ACCENT, GRID_STROKE, AXIS_TICK, TOOLTIP_STYLE } from "./theme";

/** Fixed 0–10 score domain histogram. */
export function ScoreHistogram({
  data,
}: {
  data: { score: number; count: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }} barCategoryGap="18%">
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="score"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            interval={0}
          />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            labelFormatter={(l) => `score ${l}/10`}
          />
          <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
