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
    blue: "bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100 shadow-glowSoft",
    green: "bg-sage-50 text-sage-500 ring-1 ring-inset ring-sky-100 shadow-glowSoft",
  };
  const dims = size === "lg" ? "w-20 h-20 rounded-card" : "w-14 h-14 rounded-tile";
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
    <div className="h-full surface-tile p-6 flex items-start gap-4 transition-all duration-200 hover:border-sky-300/60">
      <div className="flex-shrink-0 grid place-items-center w-12 h-12 rounded-tile bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-micro font-mono uppercase tracking-wide text-ink-400">{label}</div>
        <div className="text-body font-semibold text-ink-900 mt-1 truncate" title={value}>
          {value}
        </div>
        {hint && <div className="text-micro font-mono text-ink-400 mt-1">{hint}</div>}
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
    blue: "bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100",
    green: "bg-sage-50 text-sage-500 ring-1 ring-inset ring-sky-100",
  };
  return (
    <div className="surface p-5 flex items-center gap-4">
      <div className={`flex-shrink-0 grid place-items-center w-12 h-12 rounded-tile ${tones[tone]}`}>
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
    <div className="flex items-start gap-3 rounded-tile bg-sky-50/60 border border-sky-100 px-5 py-4 text-caption text-ink-500">
      <span className="grid place-items-center w-[18px] h-[18px] rounded-full bg-sky-500 text-carbon text-[11px] font-bold mt-0.5 flex-shrink-0">
        i
      </span>
      <span>{children}</span>
    </div>
  );
}
