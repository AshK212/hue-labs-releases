import type { ReactNode } from "react";

/**
 * The stage for a single screen. Content sits in a left-anchored column inside a
 * wide frame, so the eye lands left and the soft sky breathes on the right. The
 * caller keys this on the step so each screen replays its enter motion.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] flex items-center">
      <div className="w-full max-w-[1120px] mx-auto px-8 sm:px-12 lg:px-20 pt-24 pb-16">
        <div className="max-w-[33rem] animate-screen-in">{children}</div>
      </div>
    </main>
  );
}

/** A child that fades up in sequence. `index` sets the stagger (70ms apart). */
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
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {children}
    </div>
  );
}
