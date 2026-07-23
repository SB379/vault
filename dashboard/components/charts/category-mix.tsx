"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { SEQ, GRID_STROKE, AXIS_TICK, TOOLTIP_STYLE } from "./theme";

export function CategoryMixChart({
  data,
}: {
  data: { category: string; count: number }[];
}) {
  const height = Math.max(160, data.length * 34);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 0, left: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={72}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={18}>
            {data.map((d) => (
              <Cell key={d.category} fill={SEQ} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
