/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral canvas + surfaces: soft, slightly cool "mist" rather than pure white.
        mist: {
          50: "#fbfcfe",
          100: "#f3f5f9",
          200: "#e9ecf3",
          300: "#dde1ea",
          400: "#c5cbd8",
        },
        // Text: deep, desaturated slate. Never pure black.
        ink: {
          900: "#1b2430",
          700: "#39424f",
          500: "#646e7c",
          400: "#929aa8",
          300: "#b6bdc9",
        },
        // Accent: a soft cornflower / periwinkle. Calmer and warmer than default blue.
        sky: {
          50: "#eef2fc",
          100: "#dfe7f9",
          200: "#c6d4f2",
          300: "#9fb6e9",
          400: "#7c97e0",
          500: "#5e7cd4",
          600: "#4a64ba",
          700: "#3c539b",
        },
        // Positive: a quiet sage, used sparingly for improvement.
        sage: {
          50: "#edf6f1",
          100: "#dcefe4",
          500: "#4fa07f",
          600: "#3f886b",
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
      },
      letterSpacing: {
        tightish: "-0.015em",
        tight2: "-0.025em",
      },
      borderRadius: {
        btn: "13px",
        tile: "16px",
        card: "20px",
        panel: "24px",
      },
      boxShadow: {
        // Subtle, layered, desktop-grade. Never heavy.
        xs: "0 1px 2px rgba(27, 36, 48, 0.06)",
        sm: "0 1px 3px rgba(27, 36, 48, 0.06), 0 1px 2px rgba(27, 36, 48, 0.04)",
        card: "0 1px 3px rgba(27, 36, 48, 0.05), 0 14px 30px -16px rgba(27, 36, 48, 0.18)",
        button: "0 1px 2px rgba(27, 36, 48, 0.12), 0 8px 18px -10px rgba(74, 100, 186, 0.55)",
        tile: "0 1px 2px rgba(27, 36, 48, 0.05), 0 8px 20px -16px rgba(27, 36, 48, 0.20)",
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
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.7", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        ring: {
          "0%": { transform: "scale(0.85)", opacity: "0.45" },
          "100%": { transform: "scale(1.9)", opacity: "0" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(34px, -26px)" },
        },
        driftAlt: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-40px, 22px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-180% 0" },
          "100%": { backgroundPosition: "180% 0" },
        },
      },
      animation: {
        // One easing language across the app: a soft, confident ease-out.
        "fade-up": "fadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) both",
        "screen-in": "screenIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn 0.45s ease-out both",
        "pop-in": "popIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both",
        breathe: "breathe 3s ease-in-out infinite",
        ring: "ring 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite",
        drift: "drift 24s ease-in-out infinite",
        "drift-alt": "driftAlt 28s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
