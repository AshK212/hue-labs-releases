/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Brand board ──────────────────────────────────────────────────
        // Carbon black background, paper off-white text, signal green accent,
        // instrument gray secondary. Named tokens for direct, intentional use.
        carbon: "#0C0D0E",
        paper: "#F1F0EB",
        // Accent (was signal green): now theme-driven. Carbon White is the
        // default; Signal Green is preserved. Driven by CSS vars in index.css.
        signal: "rgb(var(--a500) / <alpha-value>)",
        instrument: "#878C89",

        // ── Semantic scales (names kept from the original light theme so the
        // whole app inherits the dark identity through the shared classes) ──

        // Surfaces & borders: near-carbon panels, slightly lighter than the
        // background, with a subtle muted-gray hairline (mist-200 is THE border).
        mist: {
          50: "#141517", // quiet fill
          100: "#1A1C1F", // fill / hover
          200: "#282B2E", // subtle border
          300: "#33373A",
          400: "#454A4D",
        },
        // Text: inverted so the darkest name is now the brightest (paper).
        ink: {
          900: "#F1F0EB", // paper — headings / primary
          800: "#E7E7E1", // near-paper
          700: "#CFD1CB", // high-contrast body
          500: "#878C89", // instrument gray — secondary
          400: "#6C716E", // dimmer gray — captions / hints
          300: "#4C514E", // dimmest — inactive / disabled
        },
        // Primary accent → theme accent (Carbon White default, Signal Green
        // preserved). Every step maps to a CSS var so the whole app re-tints
        // when `data-theme` flips. Was the blue "sky" scale.
        sky: {
          50: "rgb(var(--a50) / <alpha-value>)", // chip surface
          100: "rgb(var(--a100) / <alpha-value>)", // soft border
          200: "rgb(var(--a200) / <alpha-value>)", // hover border
          300: "rgb(var(--a300) / <alpha-value>)", // ring / active border
          400: "rgb(var(--a400) / <alpha-value>)",
          500: "rgb(var(--a500) / <alpha-value>)", // accent
          600: "rgb(var(--a600) / <alpha-value>)", // bright accent text
          700: "rgb(var(--a700) / <alpha-value>)",
        },
        // Secondary brand accent → unified onto the theme accent (was "iris").
        iris: {
          50: "rgb(var(--a50) / <alpha-value>)",
          100: "rgb(var(--a100) / <alpha-value>)",
          200: "rgb(var(--a200) / <alpha-value>)",
          300: "rgb(var(--a300) / <alpha-value>)",
          400: "rgb(var(--a400) / <alpha-value>)",
          500: "rgb(var(--a500) / <alpha-value>)",
          600: "rgb(var(--a600) / <alpha-value>)",
          700: "rgb(var(--a700) / <alpha-value>)",
        },
        // Success → theme accent family.
        sage: {
          50: "rgb(var(--a50) / <alpha-value>)",
          100: "rgb(var(--a100) / <alpha-value>)",
          400: "rgb(var(--a400) / <alpha-value>)",
          500: "rgb(var(--a500) / <alpha-value>)",
          600: "rgb(var(--a600) / <alpha-value>)",
        },
        // Faint highlight, theme accent.
        aqua: {
          300: "rgb(var(--a300) / <alpha-value>)",
          400: "rgb(var(--a400) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        // Monospace accent for technical labels, metrics, captions, timestamps.
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      // The single typographic scale for the whole app (desktop-scale).
      fontSize: {
        hero: ["56px", { lineHeight: "1.04", letterSpacing: "-0.025em" }],
        section: ["30px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        page: ["42px", { lineHeight: "1.12", letterSpacing: "-0.022em" }],
        cardtitle: ["22px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        body: ["17px", { lineHeight: "1.6" }],
        caption: ["15px", { lineHeight: "1.5" }],
        micro: ["13px", { lineHeight: "1.4", letterSpacing: "0.01em" }],
      },
      letterSpacing: {
        tight2: "-0.022em",
      },
      borderRadius: {
        badge: "999px",
        btn: "14px",
        tile: "16px",
        card: "20px",
        panel: "26px",
      },
      boxShadow: {
        // Dark, precise depth: deep drop shadow + a whisper of top light for a
        // machined bevel. Glows carry the signal-green accent, used sparingly.
        soft: "0 2px 10px -4px rgba(0,0,0,0.55)",
        card: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.5), 0 22px 50px -26px rgba(0,0,0,0.8)",
        tile: "inset 0 1px 0 0 rgba(255,255,255,0.03), 0 1px 2px rgba(0,0,0,0.45), 0 14px 34px -24px rgba(0,0,0,0.75)",
        // Signature accent glow for primary actions (theme-driven).
        button: "0 1px 2px rgba(0,0,0,0.45), 0 14px 32px -14px rgb(var(--glow) / 0.4)",
        glow: "0 0 0 1px rgb(var(--glow) / 0.16), 0 0 60px -10px rgb(var(--glow) / 0.42)",
        glowSoft: "0 0 46px -14px rgb(var(--glow) / 0.34)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        screenIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        popIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.7", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.03)" },
        },
        ring: {
          "0%": { transform: "scale(0.85)", opacity: "0.4" },
          "100%": { transform: "scale(1.85)", opacity: "0" },
        },
        spinSlow: { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
        drift: {
          "0%, 100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(30px,-22px)" },
        },
        auroraA: {
          "0%, 100%": { transform: "translate(0,0) scale(1)", opacity: "0.5" },
          "50%": { transform: "translate(40px,-30px) scale(1.12)", opacity: "0.72" },
        },
        auroraB: {
          "0%, 100%": { transform: "translate(0,0) scale(1.05)", opacity: "0.42" },
          "50%": { transform: "translate(-46px,26px) scale(1)", opacity: "0.64" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-180% 0" },
          "100%": { backgroundPosition: "180% 0" },
        },
        checkPop: {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "70%": { opacity: "1", transform: "scale(1.12)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        gridPan: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "44px 44px" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "screen-in": "screenIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "pop-in": "popIn 0.5s cubic-bezier(0.16,1,0.3,1) both",
        breathe: "breathe 3.4s ease-in-out infinite",
        ring: "ring 2.6s cubic-bezier(0.16,1,0.3,1) infinite",
        "spin-slow": "spinSlow 9s linear infinite",
        drift: "drift 24s ease-in-out infinite",
        "aurora-a": "auroraA 22s ease-in-out infinite",
        "aurora-b": "auroraB 28s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "check-pop": "checkPop 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "grid-pan": "gridPan 8s linear infinite",
      },
    },
  },
  plugins: [],
};
