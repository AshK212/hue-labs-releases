/**
 * Tiny renderer-side platform helper.
 *
 * The Electron preload exposes the host OS on `window.desktop.platform`
 * (see electron/preload.ts, which forwards `process.platform`). We read it here
 * once so UI code can branch on the platform WITHOUT touching any Node/Electron
 * API directly. In a plain browser (no preload) this is simply `false`.
 */
export const isMacDesktop: boolean =
  typeof window !== "undefined" && window.desktop?.platform === "darwin";
