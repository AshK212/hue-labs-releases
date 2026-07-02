import { motion, useReducedMotion } from "framer-motion";

/**
 * The Welcome hero: a realistic isometric glass cube floating above a deep floor
 * of concentric scan rings. Realism comes from real light logic, not paint:
 *   · the top face catches faint ambient sky light, the sides sit in shadow, and
 *     the base is uplit by the scan point's glow bleeding through the glass;
 *   · the hidden back edges are drawn faintly so the cube reads as transparent;
 *   · edges vary in brightness by depth - near/front brightest, far edges dim;
 *   · a full radar floor of many rings (with distinct, receding heights) sits
 *     under a bright scan point, threaded by faint vertical light beams;
 *   · it floats straight up/down (never rotates) so the centre edge stays aligned
 *     with the scan point and rings.
 * Pure SVG + Framer Motion - crisp, calm, still under prefers-reduced-motion.
 *
 * Brand: Carbon #0C0D0E · Paper #F1F0EB · Signal Green rgb(var(--a500)) · Instrument #878C89
 */

type Pt = { x: number; y: number };
const P = (x: number, y: number): Pt => ({ x, y });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Pt, t: number): Pt => ({ x: a.x * t, y: a.y * t });

// ── Isometric cube vertices (viewBox 0 0 480 520), x centered on 240. ──
const T = P(240, 56); //  back-top
const L = P(128, 112); // left
const R = P(352, 112); // right
const C = P(240, 168); // front-top (top of the middle vertical edge)
const BL = P(128, 262); // bottom-left
const BR = P(352, 262); // bottom-right
const BC = P(240, 318); // front-bottom
const BB = P(240, 206); // back-bottom (hidden - drawn faint for the glass look)

const SCAN = P(240, 384);
const FLOOR_Y = 388;
const RATIO = 0.34; // ry / rx - tilt of the floor rings (higher = more forward)
const CONE = 48; // descent as a ring grows - a visible but gentle height step

const poly = (...pts: Pt[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");
const ln = (a: Pt, b: Pt) => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });

// Inner grid lines for a parallelogram face defined by corner O and edges u, v.
function faceGrid(O: Pt, u: Pt, v: Pt, n = 4): [Pt, Pt][] {
  const lines: [Pt, Pt][] = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    lines.push([add(O, mul(u, t)), add(add(O, mul(u, t)), v)]);
    lines.push([add(O, mul(v, t)), add(add(O, mul(v, t)), u)]);
  }
  return lines;
}
const topGrid = faceGrid(T, sub(R, T), sub(L, T));
const leftGrid = faceGrid(L, sub(C, L), sub(BL, L));
const rightGrid = faceGrid(R, sub(C, R), sub(BR, R));

const NODES = [T, L, R, C, BL, BR, BC];

// The floor is a radar sweep: rings continuously expanding out from the centre
// (no static/paused rings), all at one constant speed.
const RIPPLE_COUNT = 7;
const RIPPLE_DUR = 9;
// Static fallback for reduced-motion only - rings descend as they widen (cone).
const STATIC_RINGS = Array.from({ length: 7 }, (_, i) => {
  const t = i / 6;
  const rx = 20 + i * 34;
  return { rx, ry: rx * RATIO, cy: FLOOR_Y - 4 + t * CONE, opacity: 0.44 - i * 0.05 };
});

// Faint vertical light beams threading down to the floor (main beam is separate).
const GUIDES = Array.from({ length: 11 }, (_, i) => 132 + i * 21.6); // 132..348
const PARTICLES = [
  { x: 150, y: 150, r: 1.7, d: 0 },
  { x: 352, y: 132, r: 1.4, d: 0.8 },
  { x: 384, y: 240, r: 1.5, d: 1.4 },
  { x: 108, y: 246, r: 1.4, d: 0.5 },
  { x: 322, y: 320, r: 1.3, d: 1.1 },
];

const GREEN = "rgb(var(--a500))";

// One ring, born at the centre and expanding outward at a CONSTANT speed
// (rx/ry/cy interpolate linearly across the whole duration); opacity fades in
// then out on its own timeline so the steady expansion is never interrupted.
function Ripple({ delay }: { delay: number }) {
  return (
    <motion.ellipse
      cx={SCAN.x}
      fill="none"
      stroke={GREEN}
      strokeWidth={0.9}
      style={{ filter: "drop-shadow(0 0 3px rgb(var(--glow)/0.4))" }}
      initial={{ rx: 8, ry: 8 * RATIO, cy: FLOOR_Y - 4, opacity: 0 }}
      animate={{
        // born small at the high centre and visible from the start, expanding
        // outward at a constant speed while descending only slightly, then
        // fading as it reaches the rim. Kept faint + softly glowing.
        rx: [8, 250],
        ry: [8 * RATIO, 250 * RATIO],
        cy: [FLOOR_Y - 4, FLOOR_Y - 4 + CONE],
        opacity: [0.28, 0.26, 0.13, 0],
      }}
      transition={{ duration: RIPPLE_DUR, delay, repeat: Infinity, ease: "linear" }}
    />
  );
}

export function BrandHeroVisual({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div className={`relative w-full max-w-[540px] mx-auto ${className}`}>
      <svg viewBox="0 0 480 520" className="w-full h-auto" fill="none">
        <defs>
          <linearGradient id="faceTop" x1="0.32" y1="0" x2="0.55" y2="1">
            <stop offset="0%" stopColor="rgba(241,240,235,0.09)" />
            <stop offset="42%" stopColor="rgba(22,25,26,0.5)" />
            <stop offset="100%" stopColor="rgba(12,13,14,0.5)" />
          </linearGradient>
          <linearGradient id="faceLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(8,9,10,0.66)" />
            <stop offset="72%" stopColor="rgba(11,13,12,0.54)" />
            <stop offset="100%" stopColor="rgba(120,168,72,0.06)" />
          </linearGradient>
          <linearGradient id="faceRight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(12,14,14,0.52)" />
            <stop offset="66%" stopColor="rgba(15,18,15,0.46)" />
            <stop offset="100%" stopColor="rgba(150,198,88,0.11)" />
          </linearGradient>
          <radialGradient id="baseLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(var(--glow)/0.24)" />
            <stop offset="46%" stopColor="rgb(var(--glow)/0.07)" />
            <stop offset="100%" stopColor="rgb(var(--glow)/0)" />
          </radialGradient>
          <radialGradient id="scanGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(var(--node)/0.95)" />
            <stop offset="30%" stopColor="rgb(var(--glow)/0.55)" />
            <stop offset="100%" stopColor="rgb(var(--glow)/0)" />
          </radialGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--glow)/0)" />
            <stop offset="100%" stopColor="rgb(var(--glow)/0.5)" />
          </linearGradient>
          <linearGradient id="guide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--glow)/0)" />
            <stop offset="52%" stopColor="rgb(var(--glow)/0.1)" />
            <stop offset="100%" stopColor="rgb(var(--glow)/0)" />
          </linearGradient>
          {/* soft bloom so the wireframe reads as a glowing hologram, not hard lines */}
          <filter id="edgeGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* the scan-point light, spreading up to naturally light the cube base */}
        <ellipse cx={SCAN.x} cy={SCAN.y - 4} rx={148} ry={150} fill="url(#baseLight)" />

        {/* faint vertical light beams threading down to the floor */}
        {GUIDES.map((x, i) => {
          const mid = Math.abs(x - 240) / 120; // 0 at center, 1 at edges
          return (
            <line key={x} x1={x} y1={196 + mid * 26} x2={x} y2={FLOOR_Y + 22}
              stroke="url(#guide)" strokeWidth={i % 2 ? 0.6 : 0.8} opacity={1 - mid * 0.45} />
          );
        })}

        {/* drifting particles */}
        {PARTICLES.map((p, i) => (
          <motion.circle key={i} cx={p.x} r={p.r} fill={GREEN}
            style={{ filter: "drop-shadow(0 0 3px rgb(var(--glow)/0.7))" }}
            initial={{ cy: p.y, opacity: 0.32 }}
            animate={reduce ? { cy: p.y, opacity: 0.32 } : { cy: [p.y, p.y - 12, p.y], opacity: [0.16, 0.46, 0.16] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: p.d }} />
        ))}

        {/* ── floor: a dense field of rings expanding outward from the centre
             (static fallback under reduced-motion) ─────────────────────────── */}
        {reduce
          ? STATIC_RINGS.map((r, i) => (
              <ellipse key={i} cx={SCAN.x} cy={r.cy} rx={r.rx} ry={r.ry}
                fill="none" stroke={GREEN} strokeWidth={0.9} opacity={r.opacity * 0.6}
                style={{ filter: "drop-shadow(0 0 3px rgb(var(--glow)/0.4))" }} />
            ))
          : Array.from({ length: RIPPLE_COUNT }, (_, i) => (
              <Ripple key={i} delay={(i * RIPPLE_DUR) / RIPPLE_COUNT} />
            ))}

        {/* light beam from the cube base down to the scan point (always centered) */}
        <rect x={BC.x - 1.5} y={300} width="3" height={SCAN.y - 300} fill="url(#beam)" style={{ filter: "blur(0.6px)" }} />
        {!reduce && (
          <motion.circle cx={BC.x} r={3.6} fill="rgb(var(--node)/0.9)" style={{ filter: "blur(2px)" }}
            initial={{ cy: SCAN.y, opacity: 0 }}
            // starts at the scan point (where the rings begin) and rises at a
            // constant speed up to the cube base, fading as it goes.
            animate={{ cy: [SCAN.y, BC.y], opacity: [0.9, 0.9, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }} />
        )}

        {/* the bright scan point */}
        <motion.g
          animate={reduce ? undefined : { opacity: [0.75, 1, 0.75], scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${SCAN.x}px ${SCAN.y}px` }}
        >
          <ellipse cx={SCAN.x} cy={SCAN.y} rx="52" ry={52 * RATIO} fill="url(#scanGlow)" />
          <circle cx={SCAN.x} cy={SCAN.y} r="3.4" fill="rgb(var(--node))" style={{ filter: "drop-shadow(0 0 6px rgb(var(--glow)/0.95))" }} />
        </motion.g>

        {/* ── the floating cube (vertical float only) ─────────────────────── */}
        <motion.g
          animate={reduce ? undefined : { y: [-6, 6, -6] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* hidden back edges - faint, so the cube reads as transparent glass */}
          <g stroke={GREEN} strokeWidth="0.9" strokeLinecap="round" opacity="0.2">
            <line {...ln(BB, T)} />
            <line {...ln(BB, BL)} />
            <line {...ln(BB, BR)} />
          </g>
          <circle cx={BB.x} cy={BB.y} r="1.8" fill={GREEN} opacity="0.35" />

          {/* light-shaded glass faces (top ambient, sides shadowed, base uplit) */}
          <polygon points={poly(T, R, C, L)} fill="url(#faceTop)" />
          <polygon points={poly(L, C, BC, BL)} fill="url(#faceLeft)" />
          <polygon points={poly(R, C, BC, BR)} fill="url(#faceRight)" />

          {/* very faint inner grids */}
          <g stroke={GREEN} strokeWidth="0.5" opacity="0.08">
            {[...topGrid, ...leftGrid, ...rightGrid].map(([a, b], i) => (
              <line key={i} {...ln(a, b)} />
            ))}
          </g>

          {/* paper highlights on the top-back edges (soft) */}
          <g stroke="#F1F0EB" strokeWidth="1.1" strokeLinecap="round" opacity="0.7"
            style={{ filter: "drop-shadow(0 0 3px rgba(241,240,235,0.28))" }}>
            <line {...ln(L, T)} />
            <line {...ln(T, R)} />
          </g>

          {/* green edges, all under one soft bloom → a glowing hologram, not hard
              lines. Depth still reads via per-edge opacity. */}
          <g filter="url(#edgeGlow)" strokeLinecap="round">
            <line {...ln(R, C)} stroke={GREEN} strokeWidth="1.1" opacity="0.72" />
            <line {...ln(C, L)} stroke={GREEN} strokeWidth="1.1" opacity="0.66" />
            <line {...ln(L, BL)} stroke={GREEN} strokeWidth="1.1" opacity="0.5" />
            <line {...ln(R, BR)} stroke={GREEN} strokeWidth="1.1" opacity="0.68" />
            <line {...ln(BL, BC)} stroke={GREEN} strokeWidth="1.2" opacity="0.82" />
            <line {...ln(BC, BR)} stroke={GREEN} strokeWidth="1.2" opacity="0.82" />
            <motion.line
              x1={C.x} y1={C.y} x2={BC.x} y2={BC.y} stroke={GREEN} strokeWidth="1.8"
              animate={reduce ? undefined : { opacity: [0.78, 0.95, 0.78] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
          </g>

          {/* corner nodes - soft, brighter near the viewer, dimmer at the back */}
          {NODES.map((n, i) => {
            const near = n.y > 200 ? 0.75 : 0.45;
            return (
              <motion.circle key={i} cx={n.x} cy={n.y} fill="rgb(var(--node))"
                style={{ filter: "drop-shadow(0 0 3px rgb(var(--glow)/0.7))" }}
                initial={{ r: 2, opacity: near * 0.6 }}
                animate={reduce ? { r: 2, opacity: near } : { opacity: [near * 0.55, near, near * 0.55], r: [1.7, 2.2, 1.7] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.28 }} />
            );
          })}
        </motion.g>
      </svg>
    </div>
  );
}
