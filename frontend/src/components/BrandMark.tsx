/**
 * The Hue Labs / Local AI Optimizer app mark, from the client brand board: a
 * geometric square frame whose lower-right corner opens onto a single Signal
 * Green block. The canonical asset is /logo.png (provided by the client); the
 * SVG glyph below mirrors it for the splash screen and as a crisp fallback.
 */

/** The SVG glyph — mirrors the client logo (square frame, open lower-right + block). */
export function BrandGlyph({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      {/* square frame */}
      <rect x="6" y="6" width="20" height="20" rx="2.4" stroke="#F1F0EB" strokeWidth="2" />
      {/* open the lower-right corner (paint carbon over the frame) */}
      <rect x="16.5" y="16.5" width="11" height="11" fill="#0C0D0E" />
      {/* signal-green block in the opened corner */}
      <rect x="17.6" y="17.6" width="6.6" height="6.6" rx="1.3" fill="#B8F25C" />
    </svg>
  );
}

/** The mark at a given pixel size (uses the exact client logo asset). */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      {/* faint signal glow behind the mark */}
      <span
        aria-hidden
        className="absolute inset-0 blur-md"
        style={{ background: "radial-gradient(circle, rgba(184,242,92,0.22), rgba(184,242,92,0) 70%)" }}
      />
      <img
        src="/logo.png"
        alt="Local AI Optimizer"
        width={size}
        height={size}
        className="relative block"
        style={{ width: size, height: size }}
      />
    </span>
  );
}

/** The full lockup: mark + the stacked "Local AI / Optimizer" wordmark.
 *  Title in Paper (#F1F0EB); kicker in Instrument Gray (#878C89) monospace.
 *  When `onClick` is given it becomes a button (used to return to Welcome). */
export function BrandLockup({ markSize = 36, onClick }: { markSize?: number; onClick?: () => void }) {
  const content = (
    <>
      <BrandMark size={markSize} />
      <div className="leading-none text-left">
        <div className="text-[19px] font-semibold tracking-[-0.01em] text-ink-900">Local AI</div>
        <div className="mt-[5px] text-[11px] font-mono uppercase tracking-[0.24em] text-ink-500">
          Optimizer
        </div>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        onClick={onClick}
        aria-label="Go to start"
        className="flex items-center gap-3 rounded-tile -m-1 p-1 transition-opacity hover:opacity-80"
      >
        {content}
      </button>
    );
  }
  return <div className="flex items-center gap-3">{content}</div>;
}
