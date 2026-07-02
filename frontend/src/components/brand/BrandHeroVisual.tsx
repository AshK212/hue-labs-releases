import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";

/**
 * The Welcome hero: a realistic isometric glass cube floating above a lifted,
 * tilted ring of radar scans. Realism comes from real light logic, not paint:
 *   · the top face catches faint ambient sky light, the side faces sit in shadow,
 *     and the base is uplit by the scan point's glow bleeding through the glass;
 *   · edges vary in brightness by depth — the near/front edges are brightest and
 *     bloom softly, the far edges are dim;
 *   · the whole thing floats straight up/down (never rotates) so its centre edge
 *     stays aligned with the scan point and rings.
 * Pure SVG + Framer Motion — crisp, calm, still under prefers-reduced-motion.
 *
 * Brand: Carbon #0C0D0E · Paper #F1F0EB · Signal Green #B8F25C · Instrument #878C89
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

// Scan point lifted off the floor and its rings tilted more upright.
const SCAN = P(240, 366);
const FLOOR_Y = 370;
const RATIO = 0.22; // ry / rx — larger = more upright/lifted rings

const poly = (...pts: Pt[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

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
const GUIDES = [170, 205, 240, 275, 310];

const RIPPLE_COUNT = 5;
const RIPPLE_DUR = 9;
const STATIC_RINGS = [52, 100, 150, 198, 235];
const PARTICLES = [
  { x: 150, y: 150, r: 1.7, d: 0 },
  { x: 352, y: 132, r: 1.4, d: 0.8 },
  { x: 384, y: 240, r: 1.5, d: 1.4 },
  { x: 108, y: 246, r: 1.4, d: 0.5 },
  { x: 322, y: 320, r: 1.3, d: 1.1 },
];

const GREEN = "#B8F25C";

// One edge line with depth-based brightness. `glow` adds a soft bloom.
function Edge({ a, b, w = 1.2, o = 0.7, glow = false, color = GREEN }: {
  a: Pt; b: Pt; w?: number; o?: number; glow?: boolean; color?: string;
}) {
  const style: CSSProperties = glow
    ? { filter: `drop-shadow(0 0 4px ${color === GREEN ? "rgba(184,242,92,0.85)" : "rgba(241,240,235,0.3)"})` }
    : {};
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={o} style={style} />;
}

/** One radar ripple: born at the scan point, spreads wide across the (lifted,
 *  tilted) perspective floor, and fades as it extends outward. */
function Ripple({ delay }: { delay: number }) {
  return (
    <motion.ellipse
      cx={SCAN.x}
      fill="none"
      stroke={GREEN}
      strokeWidth={1.1}
      initial={{ rx: 8, ry: 8 * RATIO, cy: FLOOR_Y - 4, opacity: 0 }}
      animate={{ rx: [8, 52, 235], ry: [8 * RATIO, 52 * RATIO, 235 * RATIO], cy: [FLOOR_Y - 4, FLOOR_Y + 1, FLOOR_Y + 26], opacity: [0, 0.5, 0] }}
      transition={{ duration: RIPPLE_DUR, delay, repeat: Infinity, ease: "easeOut", times: [0, 0.14, 1] }}
    />
  );
}

export function BrandHeroVisual({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div className={`relative w-full max-w-[540px] mx-auto ${className}`}>
      <svg viewBox="0 0 480 520" className="w-full h-auto" fill="none">
        <defs>
          {/* top face — ambient sky light catching the back edge, dark toward front */}
          <linearGradient id="faceTop" x1="0.32" y1="0" x2="0.55" y2="1">
            <stop offset="0%" stopColor="rgba(241,240,235,0.09)" />
            <stop offset="42%" stopColor="rgba(22,25,26,0.5)" />
            <stop offset="100%" stopColor="rgba(12,13,14,0.5)" />
          </linearGradient>
          {/* left face — shadow side, darkest, a whisper of uplight at the base */}
          <linearGradient id="faceLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(8,9,10,0.66)" />
            <stop offset="72%" stopColor="rgba(11,13,12,0.54)" />
            <stop offset="100%" stopColor="rgba(120,168,72,0.06)" />
          </linearGradient>
          {/* right face — catches a little more light, more uplight at the base */}
          <linearGradient id="faceRight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(12,14,14,0.52)" />
            <stop offset="66%" stopColor="rgba(15,18,15,0.46)" />
            <stop offset="100%" stopColor="rgba(150,198,88,0.11)" />
          </linearGradient>
          <radialGradient id="baseLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(184,242,92,0.24)" />
            <stop offset="46%" stopColor="rgba(184,242,92,0.07)" />
            <stop offset="100%" stopColor="rgba(184,242,92,0)" />
          </radialGradient>
          <radialGradient id="scanGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(224,252,168,0.95)" />
            <stop offset="30%" stopColor="rgba(184,242,92,0.55)" />
            <stop offset="100%" stopColor="rgba(184,242,92,0)" />
          </radialGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(184,242,92,0)" />
            <stop offset="100%" stopColor="rgba(184,242,92,0.5)" />
          </linearGradient>
          <linearGradient id="guide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(184,242,92,0)" />
            <stop offset="55%" stopColor="rgba(184,242,92,0.1)" />
            <stop offset="100%" stopColor="rgba(184,242,92,0)" />
          </linearGradient>
        </defs>

        {/* the scan-point light, spreading up to naturally light the cube base */}
        <ellipse cx={SCAN.x} cy={SCAN.y - 4} rx={148} ry={150} fill="url(#baseLight)" />

        {/* faint vertical guide lines fanning to the floor */}
        {GUIDES.map((x, i) => (
          <line key={x} x1={x} y1={214 + Math.abs(x - 240) * 0.18} x2={x} y2={FLOOR_Y + 24}
            stroke="url(#guide)" strokeWidth={i === 2 ? 1 : 0.7} />
        ))}

        {/* drifting particles */}
        {PARTICLES.map((p, i) => (
          <motion.circle key={i} cx={p.x} r={p.r} fill={GREEN}
            style={{ filter: "drop-shadow(0 0 3px rgba(184,242,92,0.7))" }}
            initial={{ cy: p.y, opacity: 0.32 }}
            animate={reduce ? { cy: p.y, opacity: 0.32 } : { cy: [p.y, p.y - 12, p.y], opacity: [0.16, 0.46, 0.16] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: p.d }} />
        ))}

        {/* ── floor: lifted, tilted, wide + slow radar ripples ───────────── */}
        {reduce
          ? STATIC_RINGS.map((rx, i) => (
              <ellipse key={rx} cx={SCAN.x} cy={FLOOR_Y + i * 8} rx={rx} ry={rx * RATIO}
                fill="none" stroke={GREEN} strokeWidth="1" opacity={0.42 - i * 0.07} />
            ))
          : Array.from({ length: RIPPLE_COUNT }, (_, i) => (
              <Ripple key={i} delay={(i * RIPPLE_DUR) / RIPPLE_COUNT} />
            ))}

        {/* light beam from the cube base down to the scan point (always centered) */}
        <rect x={BC.x - 1.5} y={300} width="3" height={SCAN.y - 300} fill="url(#beam)" style={{ filter: "blur(0.6px)" }} />
        {!reduce && (
          <motion.circle cx={BC.x} r={3.6} fill="rgba(224,252,168,0.85)" style={{ filter: "blur(2px)" }}
            initial={{ cy: SCAN.y, opacity: 0 }}
            animate={{ cy: [SCAN.y, 306], opacity: [0.7, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeOut" }} />
        )}

        {/* the bright scan point */}
        <motion.g
          animate={reduce ? undefined : { opacity: [0.75, 1, 0.75], scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${SCAN.x}px ${SCAN.y}px` }}
        >
          <ellipse cx={SCAN.x} cy={SCAN.y} rx="50" ry={50 * RATIO} fill="url(#scanGlow)" />
          <circle cx={SCAN.x} cy={SCAN.y} r="3.4" fill="#EAFCB0" style={{ filter: "drop-shadow(0 0 6px rgba(184,242,92,0.95))" }} />
        </motion.g>

        {/* ── the floating cube (vertical float only — never rotates) ────── */}
        <motion.g
          animate={reduce ? undefined : { y: [-6, 6, -6] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* light-shaded glass faces (top ambient, sides shadowed, base uplit) */}
          <polygon points={poly(T, R, C, L)} fill="url(#faceTop)" />
          <polygon points={poly(L, C, BC, BL)} fill="url(#faceLeft)" />
          <polygon points={poly(R, C, BC, BR)} fill="url(#faceRight)" />

          {/* very faint inner grids */}
          <g stroke={GREEN} strokeWidth="0.5" opacity="0.08">
            {[...topGrid, ...leftGrid, ...rightGrid].map(([a, b], i) => (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            ))}
          </g>

          {/* edges — brightness varies with depth for real dimensionality */}
          {/* far/back top edges: paper highlight (ambient sky) */}
          <Edge a={L} b={T} w={1.3} o={0.8} glow color="#F1F0EB" />
          <Edge a={T} b={R} w={1.3} o={0.68} glow color="#F1F0EB" />
          {/* top-front edges: mid-bright */}
          <Edge a={R} b={C} o={0.85} />
          <Edge a={C} b={L} o={0.8} />
          {/* side verticals: left in shadow (dim), right lit (brighter) */}
          <Edge a={L} b={BL} o={0.62} />
          <Edge a={R} b={BR} o={0.82} />
          {/* near bottom-front edges: brightest, soft bloom */}
          <Edge a={BL} b={BC} w={1.4} o={0.95} glow />
          <Edge a={BC} b={BR} w={1.4} o={0.95} glow />
          {/* front vertical center edge — brightest, living glow */}
          <motion.line
            x1={C.x} y1={C.y} x2={BC.x} y2={BC.y} stroke={GREEN} strokeWidth="2.2" strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(184,242,92,0.9))" }}
            animate={reduce ? undefined : { opacity: [0.82, 1, 0.82] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />

          {/* corner nodes — brighter near the viewer, dimmer at the back */}
          {NODES.map((n, i) => {
            const near = n.y > 200 ? 0.9 : 0.6;
            return (
              <motion.circle key={i} cx={n.x} cy={n.y} fill="#EAFCB0"
                style={{ filter: "drop-shadow(0 0 4px rgba(184,242,92,0.8))" }}
                initial={{ r: 2.2, opacity: near * 0.6 }}
                animate={reduce ? { r: 2.2, opacity: near } : { opacity: [near * 0.6, near, near * 0.6], r: [1.9, 2.5, 1.9] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.28 }} />
            );
          })}
        </motion.g>
      </svg>
    </div>
  );
}
