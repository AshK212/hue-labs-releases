import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * MascotHero - the official Hue Labs mascot, recreated as a clean pixel/vector
 * character, working at a desktop computer. It is the visual identity of the
 * Hue Labs desktop app's welcome screen.
 *
 * Faithful to the brand mascot: two tall ears with a gap, two big square eyes,
 * a blocky body, stubby legs and a pixel tail curling up behind it. Not cuter,
 * not redesigned - only cleaned up for crisp SVG rendering.
 *
 * Production notes for smoothness: every stateful part (the on-screen terminal,
 * the eyes' blink) lives in its own component, so the main scene renders once
 * and all looping animations run uninterrupted. Calm, premium, 60fps, and fully
 * disabled under prefers-reduced-motion. Pure SVG + Framer Motion.
 */

// ── pixel helpers ────────────────────────────────────────────────────────────
type Cell = [number, number];
const R = (c0: number, r0: number, c1: number, r1: number): Cell[] => {
  const out: Cell[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push([c, r]);
  return out;
};
const keyOf = (c: number, r: number) => `${c},${r}`;
const INSET = 0.09;
const SZ = 1 - INSET * 2;
const EASE = [0.42, 0, 0.58, 1] as const; // smooth, symmetric ease-in-out

// theme-driven warm monochrome
const PAPER = "rgb(var(--k800))";
const PAPER_DIM = "rgb(var(--k700))";
const INK = "rgb(var(--k900))";
const DARK = "rgb(var(--bg))";

function Pixels({ cells, fill, rx = 0.12, opacity }: { cells: Cell[]; fill: string; rx?: number; opacity?: number }) {
  return (
    <g fill={fill} opacity={opacity}>
      {cells.map(([c, r], i) => (
        <rect key={i} x={c + INSET} y={r + INSET} width={SZ} height={SZ} rx={rx} />
      ))}
    </g>
  );
}

// ── Mascot geometry (scene coordinates) ─────────────────────────────────────
const EARS = [...R(5, 2, 6, 4), ...R(11, 2, 12, 4)];
const HEAD = R(3, 5, 14, 12);
const EYES = [...R(5, 7, 6, 9), ...R(11, 7, 12, 9)];
const eyeSet = new Set(EYES.map(([c, r]) => keyOf(c, r)));
const BODY = [...R(5, 13, 12, 18), ...R(5, 19, 6, 22), ...R(11, 19, 12, 22), [4, 22] as Cell, [13, 22] as Cell];
const HEAD_SOLID = HEAD.filter(([c, r]) => !eyeSet.has(keyOf(c, r)));
const TAIL: Cell[] = [[4, 18], [3, 17], [2, 16], [2, 15], [3, 14], [3, 13]];
const TAIL_TIP: Cell[] = [[2, 12], [3, 12], [2, 11]];
const ARM_TOP: Cell[] = [[12, 13], [13, 13], [14, 14], [15, 14], [16, 14]];
const ARM_BOTTOM: Cell[] = [[12, 16], [13, 17], [14, 17], [15, 17], [16, 17]];
const DITHER: Cell[] = [
  [13, 13], [13, 15], [12, 18], [13, 17], [4, 16], [4, 20], [11, 22], [6, 22],
  [3, 11], [14, 11], [2, 17],
];

// ── Desk + computer geometry ────────────────────────────────────────────────
const DESK_SURFACE = R(15, 18, 49, 18);
const DESK_APRON = R(15, 19, 49, 19);
const DESK_LEGS = [...R(17, 20, 18, 26), ...R(46, 20, 47, 26)];
const KEYBOARD = R(16, 16, 30, 17);
const CRT_BODY = R(35, 3, 47, 13);
const CRT_SCREEN = R(37, 5, 45, 11);
const BASE = R(33, 14, 49, 17);
const BASE_SLOT = R(35, 15, 41, 15);
const BASE_LED: Cell = [44, 15];
const CRT_CUT = new Set(CRT_SCREEN.map(([c, r]) => keyOf(c, r)));
const CRT_SOLID = CRT_BODY.filter(([c, r]) => !CRT_CUT.has(keyOf(c, r)));
const BASE_CUT = new Set([...BASE_SLOT, BASE_LED].map(([c, r]) => keyOf(c, r)));
const BASE_SOLID = BASE.filter(([c, r]) => !BASE_CUT.has(keyOf(c, r)));

// ── Floor: perspective guide lines + flowing binary ─────────────────────────
const VP: Cell = [30, 19];
const FLOOR_BOTTOM = 31;
const FAN_X = [-8, -1, 6, 13, 20, 27, 34, 41, 48, 55, 62];
const HLINES = [20.5, 22, 24, 26.6, 30];
const STREAMS = [
  { v: "1001", lx: -1, delay: 0, dur: 9.5 },
  { v: "0", lx: 13, delay: 2.6, dur: 8.5 },
  { v: "101", lx: 41, delay: 1.3, dur: 10.5 },
  { v: "10", lx: 55, delay: 4.4, dur: 9.5 },
  { v: "1", lx: 6, delay: 6, dur: 9 },
  { v: "110", lx: 48, delay: 3.5, dur: 11 },
  { v: "11", lx: 20, delay: 7.2, dur: 10 },
];

// Shared typing cadence (~500ms/tap → alternating hands).
const TYPE = 1.0;
const TAP_TIMES = [0, 0.14, 0.3, 1];
const TAP_Y = [0, 0.55, 0, 0];
const TAP_HL = [0, 0.55, 0, 0];

// ── Floor layer (no state) ──────────────────────────────────────────────────
function Floor({ reduce }: { reduce: boolean | null }) {
  return (
    <>
      <g stroke={INK} strokeWidth={0.06} opacity={0.13} strokeLinecap="round">
        {FAN_X.map((x, i) => (
          <line key={`f${i}`} x1={VP[0]} y1={VP[1]} x2={x} y2={FLOOR_BOTTOM} />
        ))}
        {HLINES.map((y, i) => {
          const t = (y - VP[1]) / (FLOOR_BOTTOM - VP[1]);
          const half = 6 + t * 26;
          return <line key={`h${i}`} x1={VP[0] - half} y1={y} x2={VP[0] + half} y2={y} />;
        })}
      </g>
      {!reduce &&
        STREAMS.map((s, i) => (
          <motion.text
            key={`s${i}`}
            fill={PAPER_DIM}
            fontSize={1.5}
            fontFamily="'IBM Plex Mono', monospace"
            textAnchor="middle"
            initial={{ opacity: 0 }}
            animate={{
              x: [VP[0], (VP[0] + s.lx) / 2, s.lx],
              y: [VP[1] + 0.5, (VP[1] + FLOOR_BOTTOM) / 2, FLOOR_BOTTOM],
              opacity: [0, 0.16, 0.15, 0],
            }}
            transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "linear" }}
          >
            {s.v}
          </motion.text>
        ))}
    </>
  );
}

// ── On-screen terminal (isolated state, so typing never re-renders the scene)─
const SCREEN_LINES = ["Hue Labs", "Local AI"];
function ScreenTerminal({ reduce }: { reduce: boolean | null }) {
  const [text, setText] = useState("Hue Labs");
  useEffect(() => {
    if (reduce) {
      setText("Hue Labs");
      return;
    }
    let li = 0;
    let ci = 0;
    let phase: "type" | "hold" | "erase" = "type";
    let t: ReturnType<typeof setTimeout>;
    setText("");
    const tick = () => {
      const full = SCREEN_LINES[li];
      if (phase === "type") {
        ci++;
        setText(full.slice(0, ci));
        if (ci >= full.length) {
          phase = "hold";
          t = setTimeout(tick, 2000);
          return;
        }
        t = setTimeout(tick, 130);
      } else if (phase === "hold") {
        phase = "erase";
        t = setTimeout(tick, 90);
      } else {
        ci--;
        setText(full.slice(0, ci));
        if (ci <= 0) {
          li = (li + 1) % SCREEN_LINES.length;
          phase = "type";
          t = setTimeout(tick, 550);
          return;
        }
        t = setTimeout(tick, 60);
      }
    };
    t = setTimeout(tick, 800);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <>
      <text
        x={37.7}
        y={8.7}
        fill={PAPER}
        fontSize={1.6}
        fontFamily="'IBM Plex Mono', ui-monospace, monospace"
        style={{ letterSpacing: "-0.03em" }}
      >
        {text}
      </text>
      <motion.rect
        x={37.7 + text.length * 0.92}
        y={7.5}
        width={0.85}
        height={1.5}
        rx={0.06}
        fill={PAPER}
        animate={reduce ? { opacity: 0.7 } : { opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1] }}
      />
    </>
  );
}

// ── Eyes (isolated blink state) ─────────────────────────────────────────────
function Eyes({ reduce }: { reduce: boolean | null }) {
  const [blink, setBlink] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink((x) => x + 1);
        loop();
      }, 6000 + Math.random() * 3000);
    };
    loop();
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <>
      <Pixels cells={EYES} fill={DARK} rx={0.14} />
      {[5, 11].map((ex) => (
        <motion.rect
          key={`${ex}-${blink}`}
          x={ex}
          y={7}
          width={2}
          height={3}
          rx={0.14}
          fill={PAPER}
          initial={{ scaleY: 0 }}
          animate={reduce ? { scaleY: 0 } : { scaleY: [0, 1, 0] }}
          transition={{ duration: 0.24, times: [0, 0.5, 1], ease: "easeInOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "center top" }}
        />
      ))}
    </>
  );
}

export function MascotHero({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const breatheT = { duration: 5.5, repeat: Infinity, ease: EASE };
  const armT = { duration: TYPE, repeat: Infinity, ease: EASE, times: TAP_TIMES };

  return (
    <div className={`relative w-full max-w-[452px] mx-auto ${className}`}>
      <svg viewBox="0 0 50 33" className="w-full h-auto" fill="none">
        <Floor reduce={reduce} />

        {/* ── Desk + retro computer ──────────────────────────────────────── */}
        <Pixels cells={DESK_LEGS} fill={PAPER} />
        <Pixels cells={DESK_APRON} fill={PAPER_DIM} rx={0.04} />
        <Pixels cells={DESK_SURFACE} fill={PAPER} rx={0.04} />

        <Pixels cells={BASE_SOLID} fill={PAPER} rx={0.1} />
        <Pixels cells={BASE_SLOT} fill={DARK} rx={0.12} />
        <motion.rect
          x={BASE_LED[0] + INSET} y={BASE_LED[1] + INSET} width={SZ} height={SZ} rx={0.3} fill={INK}
          animate={reduce ? { opacity: 0.5 } : { opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 2, repeat: Infinity, ease: EASE }}
        />
        <Pixels cells={CRT_SOLID} fill={PAPER} rx={0.18} />
        <Pixels cells={CRT_SCREEN} fill={DARK} rx={0.14} />
        <motion.rect
          x={37} y={5} width={8} height={6} rx={0.2} fill={INK}
          initial={{ opacity: 0.03 }}
          animate={reduce ? { opacity: 0.03 } : { opacity: [0.02, 0.045, 0.02] }}
          transition={{ duration: 5, repeat: Infinity, ease: EASE }}
        />
        <ScreenTerminal reduce={reduce} />

        {/* keyboard + key highlights (synced to the taps) */}
        <Pixels cells={KEYBOARD} fill={PAPER_DIM} rx={0.1} />
        <motion.rect
          x={18.5} y={16.15} width={1.4} height={0.7} rx={0.12} fill={INK}
          animate={reduce ? { opacity: 0 } : { opacity: TAP_HL }}
          transition={armT}
        />
        <motion.rect
          x={23.5} y={16.15} width={1.4} height={0.7} rx={0.12} fill={INK}
          animate={reduce ? { opacity: 0 } : { opacity: TAP_HL }}
          transition={{ ...armT, delay: TYPE / 2 }}
        />

        {/* ── Shadow (breathes with the body) ────────────────────────────── */}
        <motion.ellipse
          cx={9} cy={23.2} rx={6} ry={0.68} fill={DARK}
          animate={reduce ? { opacity: 0.12 } : { opacity: [0.1, 0.14, 0.1], scaleX: [1, 0.985, 1] }}
          transition={breatheT}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />

        {/* ── Mascot (breathing group) ───────────────────────────────────── */}
        <motion.g
          animate={reduce ? undefined : { scale: [1, 1.012, 1] }}
          transition={breatheT}
          style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
        >
          {/* tail - slow, elegant sway */}
          <motion.g
            animate={reduce ? undefined : { rotate: [-3, 3, -3] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: EASE }}
            style={{ transformBox: "fill-box", transformOrigin: "right bottom" }}
          >
            <Pixels cells={TAIL} fill={PAPER} rx={0.3} />
            <Pixels cells={TAIL_TIP} fill={PAPER} rx={0.14} />
          </motion.g>

          <Pixels cells={BODY} fill={PAPER} />
          <Pixels cells={EARS} fill={PAPER} />
          <Pixels cells={HEAD_SOLID} fill={PAPER} />
          <Pixels cells={DITHER} fill={PAPER} rx={0.4} opacity={0.42} />

          <Eyes reduce={reduce} />

          {/* arms - alternating, crisp typing taps */}
          <motion.g animate={reduce ? undefined : { y: TAP_Y }} transition={armT}>
            <Pixels cells={ARM_TOP} fill={PAPER} />
          </motion.g>
          <motion.g animate={reduce ? undefined : { y: TAP_Y }} transition={{ ...armT, delay: TYPE / 2 }}>
            <Pixels cells={ARM_BOTTOM} fill={PAPER} />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}
