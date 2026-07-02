import type { ReactNode } from "react";
import { Spot, type SpotMotif } from "../components/Spot";
import { BrandPanel } from "../components/BrandKit";
import { BrandBarChart } from "../components/BrandChart";

/** A dashboard panel with an optional header (delegates to the brand kit). */
export function DashCard({
  title,
  icon,
  action,
  children,
  className = "",
  index = 0,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <BrandPanel title={title} icon={icon} action={action} className={className} index={index}>
      {children}
    </BrandPanel>
  );
}

export function StatLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-mist-200 last:border-0">
      <span className="text-caption text-ink-500">{label}</span>
      <span className="text-caption font-semibold font-mono text-ink-900 tnum">{value}</span>
    </div>
  );
}

/** An empty-state block with a signature spot illustration. */
export function EmptyState({
  motif,
  title,
  hint,
  action,
}: {
  motif: SpotMotif;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <Spot motif={motif} size={88} />
      <p className="text-body font-medium text-ink-700 mt-5">{title}</p>
      {hint && <p className="text-caption text-ink-400 mt-1 max-w-[22rem]">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Kept as a stable alias - the real bar chart lives in the brand chart module. */
export function MiniBarChart({ values, height = 120 }: { values: number[]; height?: number }) {
  return <BrandBarChart values={values} height={height} />;
}
