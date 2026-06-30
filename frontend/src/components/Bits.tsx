import type { ReactNode } from "react";

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/70 text-ink-500 border border-cloud-200",
    good: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    info: "bg-sky-50 text-sky-600 border border-sky-100",
  };
  return <span className={`pill ${tones[tone]}`}>{children}</span>;
}

export function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="stat-tile">
      <div className="flex items-center gap-2 text-sky-500 mb-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          {label}
        </span>
      </div>
      <div className="text-[15px] font-semibold text-ink-900 leading-snug truncate" title={value}>
        {value}
      </div>
      {hint && <div className="text-xs text-ink-400 mt-0.5">{hint}</div>}
    </div>
  );
}

/** The big hero figure used on benchmark + results reveals. */
export function HeroStat({
  value,
  unit,
  tone = "ink",
}: {
  value: string;
  unit: string;
  tone?: "ink" | "sky" | "emerald";
}) {
  const colors: Record<string, string> = {
    ink: "text-ink-900",
    sky: "text-sky-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="text-center animate-pop-in">
      <div className={`text-6xl font-bold tracking-tightest ${colors[tone]}`}>{value}</div>
      <div className="text-sm text-ink-400 mt-1">{unit}</div>
    </div>
  );
}
