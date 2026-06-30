import type { ReactNode } from "react";

/**
 * The stage for a single screen: vertically centered, with a consistent
 * horizontal frame. Screens set their own inner column width (most use the
 * default ~36rem; Welcome and Results go wider). Keyed on step by the caller so
 * each screen replays its enter motion.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6 sm:px-8 pt-24 pb-16">
      <div className="w-full animate-screen-in">{children}</div>
    </main>
  );
}

/** Default centered content column. Text inside stays left-aligned. */
export function Column({
  width = "default",
  children,
}: {
  width?: "default" | "wide" | "results";
  children: ReactNode;
}) {
  const max =
    width === "wide" ? "max-w-[60rem]" : width === "results" ? "max-w-[44rem]" : "max-w-[34rem]";
  return <div className={`mx-auto w-full ${max}`}>{children}</div>;
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
