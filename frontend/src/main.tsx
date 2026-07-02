import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyTheme, getStoredTheme } from "./theme";
import "./index.css";

// Restore the saved accent theme before the first paint so the UI renders in
// the correct theme with no flash or reload. Defaults to Carbon White.
applyTheme(getStoredTheme(), false);

/**
 * Scale the whole UI proportionally with the window so content, type and visuals
 * grow on large / full-screen windows and shrink to fit small ones - the app is
 * designed around a ~1536×850 desktop frame.
 *
 * Because `zoom` scales layout but leaves `vh`/`dvh` measuring the *physical*
 * viewport, we can't use `100dvh` for full-height sections (it would overshoot
 * after zooming). Instead we publish `--vph = innerHeight / scale`: multiplied by
 * the zoom it lands exactly on the real viewport height, so full-height pages fit
 * with no stray scrollbar.
 */
function applyViewportScale() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = Math.min(2.2, Math.max(0.75, Math.min(w / 1536, h / 850)));
  const root = document.documentElement.style;
  root.setProperty("zoom", String(scale));
  root.setProperty("--vph", `${h / scale}px`);
}
applyViewportScale();
window.addEventListener("resize", applyViewportScale);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
