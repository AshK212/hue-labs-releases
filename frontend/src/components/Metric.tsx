import type { ReactNode } from "react";
import { useCountUp } from "./useCountUp";

/** A labelled value tile (e.g. Before / After). */
export function MetricCard({
  label,
  value,
  unit,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "neutral" | "blue" | "green";
  icon?: ReactNode;
}) {
  const accents: Record<string, string> = {
    neutral: "text-ink-900",
    blue: "text-sky-600",
    green: "text-sage-600",
  };
  const bg: Record<string, string> = {
    neutral: "bg-white border-mist-200",
    blue: "bg-sky-50/70 border-sky-100",
    green: "bg-sage-50/70 border-sage-100",
  };
  return (
    <div className={`rounded-card border p-6 shadow-tile ${bg[tone]}`}>
      <div className="flex items-center gap-2 text-ink-400">
        {icon}
        <span className="text-caption font-medium">{label}</span>
      </div>
      <div className={`mt-3 text-[40px] leading-none font-semibold tracking-tight2 tnum ${accents[tone]}`}>
        {value}
      </div>
      {unit && <div className="text-caption text-ink-400 mt-2">{unit}</div>}
    </div>
  );
}

/** The big animated hero number (benchmark / result). */
export function HeroNumber({
  value,
  unit,
  tone = "ink",
  decimals = 1,
}: {
  value: number;
  unit: string;
  tone?: "ink" | "blue" | "green";
  decimals?: number;
}) {
  const animated = useCountUp(value);
  const colors: Record<string, string> = {
    ink: "text-ink-900",
    blue: "text-sky-600",
    green: "text-sage-600",
  };
  return (
    <div>
      <div className={`text-[88px] leading-none font-semibold tracking-tight2 tnum ${colors[tone]}`}>
        {animated.toFixed(decimals)}
      </div>
      <div className="text-body text-ink-400 mt-3">{unit}</div>
    </div>
  );
}
