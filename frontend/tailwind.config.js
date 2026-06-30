/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // White, very light blue, soft blue, accent blue, soft green, dark gray.
        mist: {
          50: "#fbfcfe",
          100: "#f4f7fb",
          200: "#eaeef5",
          300: "#dde3ed",
          400: "#c5cdda",
        },
        ink: {
          900: "#1c2533", // darkest text (dark gray, never pure black)
          700: "#3b4453",
          500: "#667083",
          400: "#949db0",
          300: "#b8c0cf",
        },
        sky: {
          50: "#eff4fd",
          100: "#e0e9fb",
          200: "#c6d7f5",
          300: "#9fbcec",
          400: "#7a9ce2",
          500: "#5c7fd6", // accent blue
          600: "#4866bd",
          700: "#3a539c",
        },
        sage: {
          50: "#edf7f1",
          100: "#d9efe2",
          500: "#46a07a",
          600: "#388665",
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
        btn: "16px",
        tile: "18px",
        card: "24px",
        panel: "28px",
      },
      boxShadow: {
        // Very soft, almost invisible. No harsh drop shadows.
        soft: "0 2px 10px -4px rgba(28, 37, 51, 0.08)",
        card: "0 1px 2px rgba(28,37,51,0.04), 0 16px 40px -22px rgba(28,37,51,0.16)",
        tile: "0 1px 2px rgba(28,37,51,0.03), 0 10px 26px -20px rgba(28,37,51,0.18)",
        button: "0 1px 2px rgba(28,37,51,0.10), 0 10px 22px -12px rgba(72,102,189,0.50)",
        glow: "0 0 0 1px rgba(92,127,214,0.10), 0 0 60px -10px rgba(92,127,214,0.45)",
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
          "0%, 100%": { opacity: "0.75", transform: "scale(1)" },
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
        shimmer: {
          "0%": { backgroundPosition: "-180% 0" },
          "100%": { backgroundPosition: "180% 0" },
        },
        checkPop: {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "70%": { opacity: "1", transform: "scale(1.12)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "screen-in": "screenIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "pop-in": "popIn 0.5s cubic-bezier(0.16,1,0.3,1) both",
        breathe: "breathe 2.8s ease-in-out infinite",
        ring: "ring 2.6s cubic-bezier(0.16,1,0.3,1) infinite",
        "spin-slow": "spinSlow 9s linear infinite",
        drift: "drift 24s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "check-pop": "checkPop 0.4s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
