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
}: {
  children: ReactNode;
  tone?: "sky" | "sage";
}) {
  const tones: Record<string, string> = {
    sky: "bg-sky-50 text-sky-500",
    sage: "bg-sage-50 text-sage-600",
  };
  return (
    <div className={`grid place-items-center w-12 h-12 rounded-tile ${tones[tone]}`}>
      {children}
    </div>
  );
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
    <div className="tile p-4">
      <div className="flex items-center gap-2 text-ink-400 mb-2.5">
        {icon}
        <span className="text-[12px] font-medium text-ink-400">{label}</span>
      </div>
      <div
        className="text-[15px] font-semibold text-ink-900 leading-snug truncate"
        title={value}
      >
        {value}
      </div>
      {hint && <div className="text-[12px] text-ink-400 mt-1">{hint}</div>}
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
