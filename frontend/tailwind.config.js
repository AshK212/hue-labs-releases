/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Soft sky / cloud palette — calm, modern, premium.
        sky: {
          50: "#f3f8ff",
          100: "#e6f0ff",
          200: "#cfe2ff",
          300: "#a9caff",
          400: "#7fabfb",
          500: "#5b8def",
          600: "#3f6fd6",
          700: "#2f56ad",
        },
        cloud: {
          50: "#fcfdff",
          100: "#f5f8fc",
          200: "#e9eff7",
          300: "#dbe4ef",
        },
        ink: {
          300: "#9aa7b8",
          400: "#7c8a9e",
          500: "#5b6b80",
          700: "#33455c",
          900: "#172234",
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
        tightest: "-0.03em",
      },
      boxShadow: {
        soft: "0 18px 40px -18px rgba(63, 111, 214, 0.30)",
        card: "0 24px 60px -28px rgba(23, 34, 52, 0.22)",
        glass: "0 1px 0 0 rgba(255,255,255,0.6) inset, 0 30px 60px -30px rgba(23,34,52,0.25)",
        lift: "0 12px 30px -12px rgba(63, 111, 214, 0.45)",
      },
      borderRadius: {
        xl2: "1.5rem",
        xl3: "2rem",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        screenIn: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "60%": { opacity: "1", transform: "scale(1.03)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
        ring: {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        driftA: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(40px, -30px)" },
        },
        driftB: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-50px, 25px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        progressGlow: {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "screen-in": "screenIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fadeIn 0.5s ease-out both",
        "pop-in": "popIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        breathe: "breathe 2.6s ease-in-out infinite",
        ring: "ring 2.4s ease-out infinite",
        "drift-a": "driftA 22s ease-in-out infinite",
        "drift-b": "driftB 26s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "progress-glow": "progressGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
