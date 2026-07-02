import { motion, useReducedMotion } from "framer-motion";

/**
 * Minimalist charts drawn from REAL benchmark history only. Signal green marks
 * optimized/current data; instrument gray marks baseline. No invented series,
 * no axes clutter - just the measured shape of the runs.
 */

export interface ChartPoint {
  value: number;
  /** "signal" = optimized/current, "gray" = baseline. */
  tone?: "signal" | "gray";
  title?: string;
}

const EMPTY = "Run a benchmark to build history";

function EmptyChart({ height, hint = EMPTY }: { height: number; hint?: string }) {
  return (
    <div
      className="grid place-items-center rounded-tile border border-dashed border-mist-200 bg-mist-50/40"
      style={{ height }}
    >
      <p className="text-caption font-mono text-ink-400">{hint}</p>
    </div>
  );
}

/** A smooth, honest line of measured speed over time. */
export function BrandLineChart({
  points,
  height = 160,
  hint,
}: {
  points: ChartPoint[];
  height?: number;
  hint?: string;
}) {
  const reduce = useReducedMotion();
  if (points.length === 0) return <EmptyChart height={height} hint={hint} />;

  const W = 600;
  const H = height;
  const padY = 16;
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const n = points.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * (W - 24) + 12);
  const y = (v: number) => padY + (1 - (v - min) / span) * (H - padY * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--glow)/0.22)" />
          <stop offset="100%" stopColor="rgb(var(--glow)/0)" />
        </linearGradient>
      </defs>

      {/* faint baseline gridlines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={padY + f * (H - padY * 2)} y2={padY + f * (H - padY * 2)} stroke="#282B2E" strokeWidth="1" strokeDasharray="2 6" />
      ))}

      <path d={area} fill="url(#lineArea)" />
      <motion.path
        d={line}
        fill="none"
        stroke="rgb(var(--a500))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? undefined : { pathLength: 0 }}
        animate={reduce ? undefined : { pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ filter: "drop-shadow(0 0 6px rgb(var(--glow)/0.35))" }}
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r={n > 24 ? 2 : 3}
          fill={p.tone === "gray" ? "#878C89" : "rgb(var(--a500))"}
          stroke="#0C0D0E"
          strokeWidth="1.5"
        >
          {p.title && <title>{p.title}</title>}
        </circle>
      ))}
    </svg>
  );
}

/** A simple honest bar chart drawn from measured values. */
export function BrandBarChart({
  values,
  height = 120,
  hint,
}: {
  values: number[];
  height?: number;
  hint?: string;
}) {
  const reduce = useReducedMotion();
  if (values.length === 0) return <EmptyChart height={height} hint={hint} />;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {values.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-md bg-gradient-to-t from-sky-300/30 via-sky-400 to-sky-500 min-w-[8px] shadow-[0_0_12px_-2px_rgb(var(--glow)/0.5)]"
          initial={reduce ? undefined : { height: 0 }}
          animate={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
          title={`${v.toFixed(1)} tok/s`}
        />
      ))}
    </div>
  );
}

/** A legend swatch for chart cards. */
export function ChartLegend({ tone, label }: { tone: "signal" | "gray"; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-micro font-mono uppercase tracking-wide text-ink-400">
      <span className={`w-2.5 h-2.5 rounded-sm ${tone === "signal" ? "bg-signal" : "bg-instrument"}`} />
      {label}
    </span>
  );
}
