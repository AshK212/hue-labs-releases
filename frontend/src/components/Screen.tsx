import type { ReactNode } from "react";

/**
 * The shared content stage. Vertically centered, consistent side margins, with a
 * max content frame. Screens set their own inner column width.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-8 sm:px-12 pt-[84px] pb-16">
      <div className="w-full">{children}</div>
    </main>
  );
}

/** Centered content column. Text inside stays left-aligned unless centered. */
export function Column({
  width = "default",
  center = false,
  children,
}: {
  width?: "default" | "wide" | "results";
  center?: boolean;
  children: ReactNode;
}) {
  const max =
    width === "wide" ? "max-w-[64rem]" : width === "results" ? "max-w-[52rem]" : "max-w-[40rem]";
  return <div className={`mx-auto w-full ${max} ${center ? "text-center" : ""}`}>{children}</div>;
}

/** A child that fades up in sequence (60ms stagger). */
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
    <div className={`animate-fade-up ${className}`} style={{ animationDelay: `${index * 60}ms` }}>
      {children}
    </div>
  );
}
