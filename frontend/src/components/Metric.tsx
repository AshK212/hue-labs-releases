import { useCountUp } from "./useCountUp";

// The labelled value tile now lives in the Brand kit.
export { BrandMetric as MetricCard } from "./BrandKit";

/** The big animated hero number (benchmark / result), in the technical face. */
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
      <div className={`text-[88px] leading-none font-semibold font-mono tracking-tight2 tnum ${colors[tone]}`}>
        {animated.toFixed(decimals)}
      </div>
      <div className="text-caption font-mono text-ink-400 mt-3 uppercase tracking-wide">{unit}</div>
    </div>
  );
}
