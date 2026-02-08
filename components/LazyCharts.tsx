"use client";

import dynamic from "next/dynamic";

const ChartPlaceholder = () => (
  <div className="flex items-center justify-center h-full text-xs text-[var(--text-muted)] animate-pulse">
    Loading chart…
  </div>
);

// Lazy-load Recharts components to avoid ~280KB in the initial bundle.
// They are only used on the player detail page.

export const LazyAreaChart = dynamic(
  () => import("recharts").then((m) => m.AreaChart),
  { ssr: false, loading: ChartPlaceholder }
);

export const LazyBarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false, loading: ChartPlaceholder }
);

export const LazyResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);

// Re-export sub-components statically — these are small and only render
// inside a lazy-loaded parent chart, so they don't add meaningful initial JS.
export {
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
