import { motion, useReducedMotion } from "framer-motion";

/**
 * The Welcome hero: an abstract wireframe cube floating above concentric scan
 * rings, wrapped in drifting grid particles and a very soft signal-green glow.
 * Pure SVG/CSS/Framer Motion — sharp at any desktop resolution, calm and slow,
 * and fully still under prefers-reduced-motion.
 */

// Deterministic particle field (no Math.random — stable across renders).
const PARTICLES = [
  { x: 18, y: 26, r: 1.4, d: 0 },
  { x: 82, y: 20, r: 1.1, d: 0.6 },
  { x: 70, y: 74, r: 1.6, d: 1.2 },
  { x: 28, y: 78, r: 1.2, d: 0.3 },
  { x: 90, y: 52, r: 1.0, d: 0.9 },
  { x: 10, y: 56, r: 1.3, d: 1.5 },
  { x: 50, y: 12, r: 1.1, d: 0.4 },
  { x: 44, y: 90, r: 1.2, d: 1.1 },
];

export function BrandHeroVisual({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div className={`relative aspect-square w-full max-w-[520px] mx-auto ${className}`}>
      {/* soft glow */}
      <div
        aria-hidden
        className="absolute inset-[16%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(184,242,92,0.16), rgba(184,242,92,0) 70%)" }}
      />

      {/* drifting particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-signal"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.r * 2, height: p.r * 2, opacity: 0.5 }}
          animate={reduce ? undefined : { y: [0, -8, 0], opacity: [0.25, 0.7, 0.25] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: p.d }}
        />
      ))}

      <svg viewBox="0 0 240 240" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="cubeEdge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D6FA95" />
            <stop offset="100%" stopColor="#93D24A" />
          </linearGradient>
          <linearGradient id="cubeTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(184,242,92,0.22)" />
            <stop offset="100%" stopColor="rgba(184,242,92,0.04)" />
          </linearGradient>
          <radialGradient id="ringFade" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="rgba(135,140,137,0)" />
            <stop offset="100%" stopColor="rgba(135,140,137,0.5)" />
          </radialGradient>
        </defs>

        {/* concentric scan rings, slow synchronized pulse */}
        <g>
          {[46, 68, 92].map((r, i) => (
            <motion.circle
              key={r}
              cx="120"
              cy="150"
              r={r}
              fill="none"
              stroke="rgba(135,140,137,0.28)"
              strokeWidth="1"
              strokeDasharray="2 6"
              animate={reduce ? undefined : { opacity: [0.15, 0.5, 0.15], scale: [0.98, 1.02, 0.98] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
              style={{ transformOrigin: "120px 150px" }}
            />
          ))}
          {/* one bright sweeping ring */}
          <motion.circle
            cx="120"
            cy="150"
            r="58"
            fill="none"
            stroke="rgba(184,242,92,0.35)"
            strokeWidth="1.4"
            strokeDasharray="4 10"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "120px 150px" }}
          />
        </g>

        {/* floating cube */}
        <motion.g
          animate={reduce ? undefined : { y: [-7, 7, -7] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* faces */}
          <polygon points="120,44 178,78 120,112 62,78" fill="url(#cubeTop)" />
          <polygon points="62,78 120,112 120,180 62,146" fill="rgba(184,242,92,0.05)" />
          <polygon points="178,78 120,112 120,180 178,146" fill="rgba(184,242,92,0.10)" />
          {/* wireframe */}
          <g stroke="url(#cubeEdge)" strokeWidth="1.6" fill="none" strokeLinejoin="round">
            <polygon points="120,44 178,78 120,112 62,78" />
            <path d="M62,78 V146 L120,180 V112" />
            <path d="M178,78 V146 L120,180" />
            <path d="M120,112 V180" />
          </g>
          {/* vertex nodes */}
          {[
            [120, 44],
            [178, 78],
            [62, 78],
            [120, 180],
          ].map(([cx, cy], i) => (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r="3"
              fill="#B8F25C"
              animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
            />
          ))}
        </motion.g>
      </svg>
    </div>
  );
}
