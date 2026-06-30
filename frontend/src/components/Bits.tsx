import type { ReactNode } from "react";

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-mist-100 text-ink-500",
    good: "bg-sage-50 text-sage-600",
    info: "bg-sky-50 text-sky-600",
  };
  return <span className={`pill ${tones[tone]}`}>{children}</span>;
}

/** A consistent rounded container for a leading icon. One size everywhere. */
export function IconBadge({
  children,
  tone = "sky",
  size = "md",
}: {
  children: ReactNode;
  tone?: "sky" | "sage";
  size?: "md" | "lg";
}) {
  const tones: Record<string, string> = {
    sky: "bg-sky-50 text-sky-500",
    sage: "bg-sage-50 text-sage-600",
  };
  const dims = size === "lg" ? "w-14 h-14 rounded-[18px]" : "w-12 h-12 rounded-tile";
  return <div className={`grid place-items-center ${dims} ${tones[tone]}`}>{children}</div>;
}

/** A hardware fact card. Icon + label on top, a bold value, an optional hint. */
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
    <div className="tile p-5">
      <div className="flex items-center gap-2 text-ink-400 mb-3">
        <span className="text-sky-500">{icon}</span>
        <span className="text-[12px] font-medium text-ink-400">{label}</span>
      </div>
      <div
        className="text-[17px] font-semibold text-ink-900 leading-snug truncate"
        title={value}
      >
        {value}
      </div>
      {hint && <div className="text-[13px] text-ink-400 mt-1">{hint}</div>}
    </div>
  );
}

/** A status row card: a status icon, a title and a calm subtitle. */
export function StatusCard({
  icon,
  tone = "sky",
  title,
  subtitle,
}: {
  icon: ReactNode;
  tone?: "sky" | "sage";
  title: string;
  subtitle: string;
}) {
  const tones: Record<string, string> = {
    sky: "bg-sky-50 text-sky-500",
    sage: "bg-sage-50 text-sage-600",
  };
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`flex-shrink-0 grid place-items-center w-11 h-11 rounded-tile ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-ink-900">{title}</div>
        <div className="text-[13px] text-ink-400">{subtitle}</div>
      </div>
    </div>
  );
}

/** The large measured figure on the benchmark and results screens. */
export function HeroStat({
  value,
  unit,
  tone = "ink",
}: {
  value: string;
  unit: string;
  tone?: "ink" | "sky" | "sage";
}) {
  const colors: Record<string, string> = {
    ink: "text-ink-900",
    sky: "text-sky-600",
    sage: "text-sage-600",
  };
  return (
    <div className="animate-pop-in">
      <div className={`text-[64px] leading-none font-semibold tracking-tight2 ${colors[tone]}`}>
        {value}
      </div>
      <div className="text-[13px] text-ink-400 mt-2">{unit}</div>
    </div>
  );
}

/** A soft, calm informational note (e.g. the benchmark fairness line). */
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-tile bg-sky-50/70 border border-sky-100 px-4 py-3 text-[13px] text-ink-500">
      <span className="grid place-items-center w-4 h-4 rounded-full bg-sky-200 text-white text-[10px] font-bold mt-0.5">
        i
      </span>
      <span>{children}</span>
    </div>
  );
}
