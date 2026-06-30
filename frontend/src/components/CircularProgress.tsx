import type { ReactNode } from "react";

/**
 * A large circular progress ring with a soft glowing halo. When `percent` is
 * null it shows a calm indeterminate sweep (used before a size is known).
 */
export function CircularProgress({
  percent,
  size = 220,
  stroke = 12,
  children,
}: {
  percent: number | null;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = percent === null ? 25 : Math.max(0, Math.min(100, percent));
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* Soft glow halo */}
      <div
        className="absolute rounded-full animate-breathe"
        style={{
          width: size * 0.86,
          height: size * 0.86,
          background: "radial-gradient(circle, rgba(92,127,214,0.35) 0%, rgba(92,127,214,0) 70%)",
        }}
      />
      <svg width={size} height={size} className={percent === null ? "animate-spin-slow" : ""}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7edf6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#cpgrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <defs>
          <linearGradient id="cpgrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7a9ce2" />
            <stop offset="100%" stopColor="#4866bd" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
