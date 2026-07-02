/**
 * Design-token + theme system.
 *
 * The app ships two complete accent themes on the same dark carbon base:
 *   • Carbon White  — a minimal, premium white accent (#F5F5F5). DEFAULT.
 *   • Signal Green  — the original signal-green accent (#B8F25C). Preserved.
 *
 * Only the *accent* changes between themes; the carbon background, surfaces,
 * type scale, spacing and radii are identical. The accent is expressed as CSS
 * variables (see index.css `[data-theme]` blocks) so flipping `data-theme` on
 * <html> re-tints the entire UI — buttons, charts, glows, rings, icons — with
 * no reload and no layout movement.
 *
 * This module is the single source of truth for token *values* and for the
 * read/apply/persist logic. Nothing here changes app behaviour, data or flow.
 */

export type ThemeId = "huelabs" | "carbon" | "green";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  tagline: string;
  /** Solid accent color for the switcher swatch (static, not theme-driven). */
  swatch: string;
  /** Background swatch shown behind the accent dot (approx theme base). */
  base: string;
  /** Development-only themes are kept for QA, not the shipping experience. */
  dev?: boolean;
}

/** The default theme, used on first run and whenever storage is empty. */
export const DEFAULT_THEME: ThemeId = "huelabs";

/** User-facing catalogue (order defines display order in Settings). */
export const THEMES: ThemeOption[] = [
  {
    id: "huelabs",
    name: "Hue Labs",
    tagline: "Warm charcoal, editorial, white accent.",
    swatch: "#F4EFE8",
    base: "#1A1715",
  },
  {
    id: "carbon",
    name: "Carbon White",
    tagline: "Minimal white accent on carbon black.",
    swatch: "#F5F5F5",
    base: "#0C0D0E",
    dev: true,
  },
  {
    id: "green",
    name: "Signal Green",
    tagline: "The original signal-green accent.",
    swatch: "#B8F25C",
    base: "#0C0D0E",
    dev: true,
  },
];

const STORAGE_KEY = "lao.theme";

/** Read the persisted theme, falling back to the default. Never throws. */
export function getStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "huelabs" || v === "carbon" || v === "green") return v;
  } catch {
    /* localStorage unavailable (private mode / sandbox) — use default. */
  }
  return DEFAULT_THEME;
}

/**
 * Apply a theme to the document and persist it.
 *
 * When `animate` is true, a short-lived class on <html> interpolates colours
 * (not layout) for 250ms so the switch feels smooth instead of snapping.
 */
export function applyTheme(id: ThemeId, animate = false): void {
  const el = document.documentElement;
  if (animate) {
    el.classList.add("theme-anim");
    window.setTimeout(() => el.classList.remove("theme-anim"), 300);
  }
  el.dataset.theme = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* Persistence is best-effort; the in-memory theme still applies. */
  }
}

/**
 * Design tokens — the machined vocabulary shared across the app. Accent-tinted
 * values reference the same CSS variables the themes drive, so reading a token
 * always reflects the active theme. Consume these instead of hardcoding values.
 */
export const tokens = {
  color: {
    carbon: "#0C0D0E",
    paper: "#F1F0EB",
    instrument: "#878C89",
    /** Active accent (white or green depending on theme). */
    accent: "rgb(var(--a500))",
    accentBright: "rgb(var(--a600))",
    accentMuted: "rgb(var(--a400))",
    /** Ambient glow color for auras / bloom. */
    glow: "rgb(var(--glow))",
    /** Brightest node / highlight color. */
    node: "rgb(var(--node))",
    surface: "#17191c",
    surfaceQuiet: "#121315",
    border: "#282B2E",
  },
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  radius: {
    badge: "999px",
    btn: "14px",
    tile: "16px",
    card: "20px",
    panel: "26px",
  },
  glow: {
    soft: "0 0 46px -14px rgb(var(--glow) / 0.34)",
    ring: "0 0 0 1px rgb(var(--glow) / 0.16), 0 0 60px -10px rgb(var(--glow) / 0.42)",
    dot: "0 0 8px rgb(var(--glow) / 0.9)",
  },
  shadow: {
    soft: "0 2px 10px -4px rgba(0,0,0,0.55)",
    card:
      "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.5), 0 22px 50px -26px rgba(0,0,0,0.8)",
    tile:
      "inset 0 1px 0 0 rgba(255,255,255,0.03), 0 1px 2px rgba(0,0,0,0.45), 0 14px 34px -24px rgba(0,0,0,0.75)",
    button: "0 1px 2px rgba(0,0,0,0.45), 0 14px 32px -14px rgb(var(--glow) / 0.4)",
  },
  motion: {
    /** Theme cross-fade duration (seconds) — matches the CSS transition. */
    themeTransition: 0.25,
    /** The app's signature easing curve. */
    ease: [0.16, 1, 0.3, 1] as const,
  },
  button: {
    /** Primary: accent fill, carbon text (white btn / black text in Carbon). */
    primaryBg: "linear-gradient(135deg, rgb(var(--a500)) 0%, rgb(var(--a400)) 100%)",
    primaryText: "#0C0D0E",
    radius: "14px",
  },
  card: {
    bg: "linear-gradient(180deg, #17191c 0%, #131417 100%)",
    border: "#282B2E",
    radius: "20px",
  },
  typography: {
    sans: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
} as const;
