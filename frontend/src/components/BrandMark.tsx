/**
 * The Hue Labs app mark: a precise geometric line glyph — two measurement
 * corner brackets framing a single Signal Green block — set in a carbon tile.
 * Built entirely in SVG so it stays razor-sharp at any size in the desktop app.
 * This replaces the old blue cloud logo everywhere (sidebar, header, splash).
 */

/** The bare glyph (no tile) — for places that supply their own container. */
export function BrandGlyph({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      {/* top-left measurement bracket */}
      <path
        d="M7 12.5V8.5A1.5 1.5 0 0 1 8.5 7H12.5"
        stroke="#F1F0EB"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* bottom-right measurement bracket */}
      <path
        d="M25 19.5V23.5A1.5 1.5 0 0 1 23.5 25H19.5"
        stroke="#878C89"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* centered signal block */}
      <rect x="12.4" y="12.4" width="7.2" height="7.2" rx="1.6" fill="#B8F25C" />
    </svg>
  );
}

/** The mark inside a carbon tile with a thin border and a faint green glow. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center rounded-[26%] border border-mist-200 shadow-tile"
      style={{
        width: size,
        height: size,
        backgroundImage: "linear-gradient(160deg, #17191c 0%, #0f1012 100%)",
      }}
    >
      {/* faint inner signal glow */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[26%]"
        style={{ boxShadow: "inset 0 0 14px -6px rgba(184,242,92,0.5)" }}
      />
      <BrandGlyph className="w-[70%] h-[70%] relative" />
    </div>
  );
}
