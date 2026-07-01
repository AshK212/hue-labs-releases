/** The signature brand glyph: a soft cloud with a bright spark, drawn in white
 * so it reads on the aurora gradient. This is the app's memory hook. */
export function BrandGlyph({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M9.4 22.5a4.6 4.6 0 0 1 .45-9.17 6.1 6.1 0 0 1 11.5-1.35A4.25 4.25 0 0 1 21.2 22.5H9.4z"
        fill="white"
      />
      <path
        d="M23.6 6.4l.98 2.5 2.5.98-2.5.98-.98 2.5-.98-2.5-2.5-.98 2.5-.98z"
        fill="white"
      />
      <circle cx="23.6" cy="9.88" r="1.15" fill="#6f66ec" />
    </svg>
  );
}

/** The brand mark: the glyph inside a gradient rounded-square with a soft glow. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center rounded-[28%] brand-gradient text-white shadow-button"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-[28%]"
        style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.45)" }}
      />
      <BrandGlyph className="w-[64%] h-[64%] relative" />
    </div>
  );
}
