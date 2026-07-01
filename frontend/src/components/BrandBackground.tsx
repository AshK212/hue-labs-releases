import { motion, useReducedMotion } from "framer-motion";

/**
 * The shared ambient backdrop for every screen. Layered, calm, and precise:
 *   1. a carbon radial base,
 *   2. a faint technical grid that fades toward the bottom,
 *   3. a soft film-grain noise for texture (never distracting),
 *   4. one very soft signal-green glow behind the active content.
 *
 * There is deliberately almost no motion — only the glow breathes, slowly, and
 * even that stops under prefers-reduced-motion.
 */

// A tiny fractal-noise tile, inlined so it ships with the app (crisp, offline).
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function BrandBackground({
  glow = "top",
}: {
  /** Where the soft green glow sits. "none" removes it. */
  glow?: "top" | "center" | "none";
}) {
  const reduce = useReducedMotion();

  const glowStyle =
    glow === "center"
      ? { top: "38%", left: "50%", transform: "translate(-50%, -50%)" }
      : { top: "-14%", left: "50%", transform: "translateX(-50%)" };

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-carbon">
      {/* 1 · carbon radial base */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(1200px 760px at 50% -8%, #131518 0%, #0c0d0e 55%), linear-gradient(180deg, #0d0e10 0%, #0a0b0c 100%)",
        }}
      />

      {/* 2 · faint technical grid, fading downward */}
      <div
        className="absolute inset-0 pattern-grid opacity-[0.45]"
        style={{
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 72%)",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 72%)",
        }}
      />

      {/* 3 · film grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-soft-light"
        style={{ backgroundImage: NOISE, backgroundSize: "140px 140px" }}
      />

      {/* 4 · soft signal-green glow behind content */}
      {glow !== "none" && (
        <motion.div
          className="absolute rounded-full blur-[120px]"
          style={{
            width: 720,
            height: 520,
            background:
              "radial-gradient(circle, rgba(184,242,92,0.10) 0%, rgba(184,242,92,0) 70%)",
            ...glowStyle,
          }}
          animate={reduce ? undefined : { opacity: [0.7, 1, 0.7], scale: [1, 1.04, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
