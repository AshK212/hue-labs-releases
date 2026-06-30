import type { ReactNode } from "react";
import { motion } from "framer-motion";

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

/** A simple, honest bar chart drawn from real benchmark values. */
export function MiniBarChart({ values, height = 120 }: { values: number[]; height?: number }) {
  if (values.length === 0) {
    return (
      <div className="grid place-items-center text-caption text-ink-400" style={{ height }}>
        No runs yet
      </div>
    );
  }
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {values.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-md bg-gradient-to-t from-sky-400 to-sky-300 min-w-[10px]"
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
          title={`${v.toFixed(1)} tok/s`}
        />
      ))}
    </div>
  );
}
