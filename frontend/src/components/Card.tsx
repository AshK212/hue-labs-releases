// The surface primitive now lives in the Brand kit; SectionHeader stays here.
export { BrandCard as Card } from "./BrandKit";

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
        <p className="text-micro font-mono uppercase tracking-wider text-sky-600 mb-3">{kicker}</p>
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
