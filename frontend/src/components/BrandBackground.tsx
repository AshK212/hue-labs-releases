import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "../ThemeProvider";

/**
 * The shared ambient backdrop. Calm, dark, precise:
 *   1. a carbon radial base,
 *   2. either the brand terrain photo (welcome = right focus, flow = bottom
 *      focus) under a carbon scrim, or a faint technical grid when there's no
 *      photo (e.g. the dashboard),
 *   3. a soft film-grain noise,
 *   4. one very soft signal-green glow.
 *
 * Almost no motion - only the glow breathes slowly, and it stops under
 * prefers-reduced-motion.
 */

// A tiny fractal-noise tile, inlined so it ships with the app (crisp, offline).
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Scrim over the photo so foreground content stays readable.
const SCRIM_BOTTOM =
  "linear-gradient(180deg, rgb(var(--bg)) 0%, rgb(var(--bg)) 44%, rgb(var(--bg) / 0.62) 76%, rgb(var(--bg) / 0.32) 100%)";

export function BrandBackground({
  glow = "top",
  image = false,
}: {
  /** Where the soft green glow sits. "none" removes it. */
  glow?: "top" | "center" | "none";
  /** Show the brand terrain photo, focused to the bottom of the frame. */
  image?: false | "bottom";
}) {
  const reduce = useReducedMotion();
  const { theme } = useTheme();
  // Hue Labs is clean and editorial: skip the terrain photo for a calm, warm
  // charcoal field with generous whitespace. The photo stays for dev themes.
  const showPhoto = image === "bottom" && theme !== "huelabs";

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
            "radial-gradient(1200px 760px at 50% -8%, rgb(var(--bg-top)) 0%, rgb(var(--bg)) 55%), linear-gradient(180deg, rgb(var(--bg-top)) 0%, rgb(var(--bg-bottom)) 100%)",
        }}
      />

      {/* 2 · terrain photo (bottom focus) or faint grid */}
      {showPhoto ? (
        <div className="absolute inset-0">
          <img
            src="/brand_back.png"
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
            style={{ objectPosition: "center bottom" }}
          />
          <div className="absolute inset-0" style={{ background: SCRIM_BOTTOM }} />
        </div>
      ) : (
        <div
          className="absolute inset-0 pattern-grid opacity-[0.4]"
          style={{
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 72%)",
            WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 72%)",
          }}
        />
      )}

      {/* 3 · film grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-soft-light"
        style={{ backgroundImage: NOISE, backgroundSize: "140px 140px" }}
      />

      {/* 4 · soft signal-green glow */}
      {glow !== "none" && (
        <motion.div
          className="absolute rounded-full blur-[120px]"
          style={{
            width: 720,
            height: 520,
            background:
              "radial-gradient(circle, rgb(var(--glow)/0.09) 0%, rgb(var(--glow)/0) 70%)",
            ...glowStyle,
          }}
          animate={reduce ? undefined : { opacity: [0.7, 1, 0.7], scale: [1, 1.04, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
