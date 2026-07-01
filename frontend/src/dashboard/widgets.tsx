import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Spot, type SpotMotif } from "../components/Spot";

/** A dashboard panel with an optional header. */
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
      className={`surface p-6 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-sky-500">{icon}</span>}
            {title && <h3 className="text-cardtitle font-semibold text-ink-900">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </motion.div>
  );
}

export function StatLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-mist-200 last:border-0">
      <span className="text-caption text-ink-500">{label}</span>
      <span className="text-caption font-semibold text-ink-900 tnum">{value}</span>
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

/** A simple, honest bar chart drawn from real benchmark values. */
export function MiniBarChart({ values, height = 120 }: { values: number[]; height?: number }) {
  if (values.length === 0) {
    return <EmptyState motif="speed" title="No benchmarks yet" hint="Run a benchmark to see your speed here." />;
  }
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {values.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-md bg-gradient-to-t from-iris-500 via-iris-400 to-sky-300 min-w-[10px]"
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
          title={`${v.toFixed(1)} tok/s`}
        />
      ))}
    </div>
  );
}
