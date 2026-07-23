// Validated categorical palette for the dark surface (#1a1a19-class card bg).
// Fixed slot order — never cycled or re-ranked (dataviz skill).
export const SERIES = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
] as const;

export const ACCENT = "#c98500"; // amber — brand accent for single-series charts
export const SEQ = "#3987e5"; // blue — single-hue magnitude

export const GRID_STROKE = "rgba(255,255,255,0.06)";
export const AXIS_TICK = {
  fill: "rgba(235,232,220,0.55)",
  fontSize: 11,
  fontFamily: "var(--font-geist-mono), monospace",
} as const;

export const TOOLTIP_STYLE = {
  backgroundColor: "#211f1d",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  fontSize: 12,
  fontFamily: "var(--font-geist-mono), monospace",
  color: "#ede9dd",
} as const;

export function shortDate(d: string): string {
  // "2026-07-22" -> "Jul 22"
  const dt = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
