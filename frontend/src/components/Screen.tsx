import type { ReactNode } from "react";

/**
 * A full-height, centered stage for a single journey screen. The caller keys
 * this on the step index so each screen remounts and replays its enter motion.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl animate-screen-in">{children}</div>
    </div>
  );
}

/** A child that fades up in sequence. `index` controls the stagger delay. */
export function Reveal({
  index = 0,
  children,
  className = "",
}: {
  index?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`animate-fade-up ${className}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {children}
    </div>
  );
}
