import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Spinner } from "./Icons";
import { useCountUp } from "./useCountUp";

/* ──────────────────────────────────────────────────────────────────────────
 * Shared class tokens - one source of truth so the same look isn't re-typed.
 * ────────────────────────────────────────────────────────────────────────── */
export const tone = {
  label: "text-micro font-mono uppercase tracking-wide text-ink-400",
  metric: "font-mono tnum font-semibold text-ink-900",
  ease: [0.16, 1, 0.3, 1] as const,
};

/* ── BrandStatusDot ───────────────────────────────────────────────────────*/
type DotTone = "signal" | "gray" | "amber";
const DOT: Record<DotTone, string> = {
  signal: "bg-signal shadow-[0_0_8px_rgb(var(--glow)/0.9)]",
  gray: "bg-ink-400",
  amber: "bg-amber-400",
};
export function BrandStatusDot({ tone = "signal", pulse = false }: { tone?: DotTone; pulse?: boolean }) {
  return (
    <span className="relative grid place-items-center w-2.5 h-2.5">
      {pulse && tone === "signal" && (
        <span className="absolute inset-0 rounded-full bg-signal/60 animate-ping" />
      )}
      <span className={`relative w-1.5 h-1.5 rounded-full ${DOT[tone]}`} />
    </span>
  );
}

/* ── BrandBadge ───────────────────────────────────────────────────────────*/
type BadgeTone = "neutral" | "blue" | "green" | "soft";
const BADGE: Record<BadgeTone, string> = {
  neutral: "bg-mist-100 text-ink-500 border border-mist-200",
  blue: "bg-sky-50 text-sky-600 border border-sky-100",
  green: "bg-sage-50 text-sage-600 border border-sky-100",
  soft: "bg-mist-100 border border-mist-200 text-ink-500 shadow-soft",
};
export function BrandBadge({
  children,
  tone = "neutral",
  dot = false,
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  icon?: ReactNode;
  /** Optional per-use overrides (e.g. to make a badge quieter in one place). */
  className?: string;
}) {
  return (
    <span className={`badge ${BADGE[tone]} ${className}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            tone === "green" || tone === "soft" ? "bg-signal" : tone === "blue" ? "bg-sky-500" : "bg-ink-400"
          }`}
        />
      )}
      {icon}
      {children}
    </span>
  );
}

/* ── BrandButton ──────────────────────────────────────────────────────────*/
type Variant = "primary" | "secondary" | "ghost";
const base =
  "inline-flex items-center justify-center gap-2.5 h-[52px] px-8 rounded-btn text-body font-medium " +
  "transition-[transform,box-shadow,background-color,border-color] duration-[240ms] " +
  "ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform select-none whitespace-nowrap " +
  "disabled:opacity-45 disabled:pointer-events-none";
// Premium, calm interaction: a subtle lift + deepening shadow on hover, and a
// crisp settle on press. No scale bounce — the lift alone reads as quality.
const VARIANT: Record<Variant, string> = {
  primary:
    "brand-gradient text-carbon font-semibold shadow-button hover:-translate-y-[2px] hover:shadow-glow active:translate-y-0 active:scale-[0.985] active:duration-100",
  secondary:
    "bg-mist-100/90 backdrop-blur text-ink-800 border border-mist-200 shadow-soft hover:bg-mist-100 hover:border-sky-300/70 hover:-translate-y-[2px] hover:shadow-card active:translate-y-0 active:scale-[0.985] active:duration-100",
  ghost: "text-ink-500 hover:text-ink-900 hover:bg-mist-100",
};
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}
export function BrandButton({
  variant = "primary",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${VARIANT[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner className="w-[18px] h-[18px]" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

/* ── BrandPanel / BrandCard ───────────────────────────────────────────────*/
/** A large surface panel with an optional header (title · subtitle · action). */
export function BrandPanel({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
  index,
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  const inner = (
    <>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-sky-500 shrink-0">{icon}</span>}
            <div className="min-w-0">
              {title && <h3 className="text-cardtitle font-semibold text-ink-900 truncate">{title}</h3>}
              {subtitle && <p className={tone.label}>{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </>
  );

  if (index === undefined) return <div className={`surface p-6 ${className}`}>{inner}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: tone.ease, delay: index * 0.05 }}
      className={`surface p-6 ${className}`}
    >
      {inner}
    </motion.div>
  );
}

/** The single surface primitive with an optional hover lift + selected ring. */
export function BrandCard({
  children,
  className = "",
  interactive = false,
  selected = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  selected?: boolean;
}) {
  return (
    <div
      className={[
        "surface transition-all duration-200",
        selected ? "!border-sky-300 ring-2 ring-sky-100 shadow-glowSoft" : "",
        interactive ? "hover:-translate-y-[2px] hover:!border-sky-300/60 hover:shadow-glowSoft" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* ── BrandMetric ──────────────────────────────────────────────────────────*/
type MetricTone = "neutral" | "blue" | "green";
const METRIC_ACCENT: Record<MetricTone, string> = {
  neutral: "text-ink-900",
  blue: "text-sky-600",
  green: "text-sage-600",
};
const METRIC_BG: Record<MetricTone, string> = {
  neutral: "surface-quiet",
  blue: "bg-sky-50/60 border-sky-100",
  green: "bg-sage-50/60 border-sky-100",
};
export function BrandMetric({
  label,
  value,
  unit,
  tone: t = "neutral",
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: MetricTone;
  icon?: ReactNode;
}) {
  return (
    <div className={`rounded-card border p-6 shadow-tile ${METRIC_BG[t]}`}>
      <div className="flex items-center gap-2 text-ink-400">
        {icon}
        <span className={tone.label}>{label}</span>
      </div>
      <div className={`mt-3 text-[40px] leading-none font-semibold font-mono tracking-tight2 tnum ${METRIC_ACCENT[t]}`}>
        {value}
      </div>
      {unit && <div className="text-micro font-mono text-ink-400 mt-2">{unit}</div>}
    </div>
  );
}

/* ── BrandProgressRing ────────────────────────────────────────────────────*/
export function BrandProgressRing({
  percent,
  size = 220,
  stroke = 12,
  children,
}: {
  percent: number | null;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = percent === null ? 25 : Math.max(0, Math.min(100, percent));
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full animate-breathe"
        style={{
          width: size * 0.86,
          height: size * 0.86,
          background: "radial-gradient(circle, rgb(var(--glow)/0.28) 0%, rgb(var(--glow)/0) 70%)",
        }}
      />
      <svg width={size} height={size} className={percent === null ? "animate-spin-slow" : ""}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--m200))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#brandRing)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <defs>
          <linearGradient id="brandRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--a400))" />
            <stop offset="100%" stopColor="rgb(var(--a500))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ── BrandStepList ────────────────────────────────────────────────────────*/
export interface Step {
  label: string;
  /** done | active | pending - if omitted, derived from `activeIndex`. */
  state?: "done" | "active" | "pending";
}
/** An animated checklist with a drawn checkmark. Drives scan/optimize/run views. */
export function BrandStepList({
  steps,
  activeIndex,
  className = "",
}: {
  steps: Step[];
  /** When provided, items before it are done, the item at it is active. */
  activeIndex?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const resolve = (i: number, s: Step): "done" | "active" | "pending" => {
    if (s.state) return s.state;
    if (activeIndex === undefined) return "pending";
    if (i < activeIndex) return "done";
    if (i === activeIndex) return "active";
    return "pending";
  };

  return (
    <ul className={`space-y-2.5 ${className}`}>
      {steps.map((s, i) => {
        const st = resolve(i, s);
        return (
          <li
            key={s.label}
            className={[
              // border is always present (transparent when idle) so switching the
              // active step never changes an item's size or shifts its neighbours.
              "flex items-center gap-3 rounded-tile border px-4 py-2.5 transition-all duration-300",
              st === "active" ? "border-mist-200 bg-[rgb(var(--surface1))] shadow-tile" : "border-transparent",
            ].join(" ")}
          >
            <span
              className={[
                "grid place-items-center w-5 h-5 rounded-full flex-shrink-0",
                st === "done" ? "bg-sage-50 text-sage-500" : st === "active" ? "text-sky-500" : "text-ink-300",
              ].join(" ")}
            >
              {st === "done" ? (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
                  <motion.path
                    d="M5 12.5l4.2 4.2L19 7"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduce ? undefined : { pathLength: 0 }}
                    animate={reduce ? undefined : { pathLength: 1 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                </svg>
              ) : st === "active" ? (
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </span>
            <span
              className={[
                "text-caption text-left",
                st === "done" ? "text-ink-500" : st === "active" ? "text-ink-900 font-medium" : "text-ink-300",
              ].join(" ")}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── BrandChartCard ───────────────────────────────────────────────────────*/
/** A panel purpose-built to host a chart, with a title and optional legend. */
export function BrandChartCard({
  title,
  icon,
  legend,
  action,
  children,
  index,
}: {
  title: string;
  icon?: ReactNode;
  legend?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  index?: number;
}) {
  return (
    <BrandPanel title={title} icon={icon} action={action} index={index}>
      {children}
      {legend && <div className="mt-4 flex items-center gap-5">{legend}</div>}
    </BrandPanel>
  );
}

/** Animated count-up number in the monospace face. */
export function BrandAnimatedNumber({
  value,
  decimals = 1,
  duration = 1000,
  className = "",
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const animated = useCountUp(value, duration);
  return <span className={`font-mono tnum ${className}`}>{animated.toFixed(decimals)}</span>;
}
