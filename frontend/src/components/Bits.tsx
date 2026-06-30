import type { ReactNode } from "react";

/** A consistent rounded container for a leading icon. */
export function IconBadge({
  children,
  tone = "blue",
  size = "md",
}: {
  children: ReactNode;
  tone?: "blue" | "green";
  size?: "md" | "lg";
}) {
  const tones: Record<string, string> = {
    blue: "bg-sky-50 text-sky-500",
    green: "bg-sage-50 text-sage-600",
  };
  const dims = size === "lg" ? "w-16 h-16 rounded-card" : "w-12 h-12 rounded-tile";
  return <div className={`grid place-items-center ${dims} ${tones[tone]}`}>{children}</div>;
}

/** A hardware fact card, Apple System Settings style. */
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
    <div className="surface-tile p-5 flex items-start gap-4">
      <div className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-tile bg-sky-50 text-sky-500">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-caption text-ink-400">{label}</div>
        <div className="text-body font-semibold text-ink-900 mt-0.5 truncate" title={value}>
          {value}
        </div>
        {hint && <div className="text-caption text-ink-400 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

/** A status row: icon, title, calm subtitle. */
export function StatusCard({
  icon,
  tone = "blue",
  title,
  subtitle,
}: {
  icon: ReactNode;
  tone?: "blue" | "green";
  title: string;
  subtitle: string;
}) {
  const tones: Record<string, string> = {
    blue: "bg-sky-50 text-sky-500",
    green: "bg-sage-50 text-sage-600",
  };
  return (
    <div className="surface p-4 flex items-center gap-4">
      <div className={`flex-shrink-0 grid place-items-center w-11 h-11 rounded-tile ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-body font-semibold text-ink-900">{title}</div>
        <div className="text-caption text-ink-400">{subtitle}</div>
      </div>
    </div>
  );
}

/** A soft informational note. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-tile bg-sky-50/70 border border-sky-100 px-4 py-3 text-caption text-ink-500">
      <span className="grid place-items-center w-4 h-4 rounded-full bg-sky-200 text-white text-[10px] font-bold mt-0.5">
        i
      </span>
      <span>{children}</span>
    </div>
  );
}
