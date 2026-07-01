import type { ReactNode } from "react";

/** The single surface primitive. `interactive` adds a calm hover lift. */
export function Card({
  children,
  className = "",
  interactive = false,
  selected = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  selected?: boolean;
}) {
  return (
    <div
      className={[
        "surface transition-all duration-200",
        selected ? "!border-iris-300 ring-2 ring-iris-100" : "",
        interactive ? "hover:-translate-y-[2px] hover:!border-iris-200 hover:shadow-glowSoft" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** A consistent page/section heading block. */
export function SectionHeader({
  kicker,
  title,
  subtitle,
  align = "left",
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      {kicker && (
        <p className="text-caption font-semibold text-sky-600 mb-3">{kicker}</p>
      )}
      <h1 className="text-page font-semibold text-ink-900">{title}</h1>
      {subtitle && (
        <p className={`text-body text-ink-500 mt-3.5 ${align === "center" ? "mx-auto" : ""} max-w-[34rem]`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
