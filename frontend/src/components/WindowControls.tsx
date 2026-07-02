import { useEffect, useState } from "react";

/**
 * Custom window controls for the frameless desktop window: minimize, maximize /
 * restore, and close, drawn to match the dark theme. They sit at the very
 * top-right, outside the drag region (so they stay clickable), and talk to the
 * Electron main process over the preload bridge (window.desktop.window).
 * In a plain browser (no preload) they simply render inert.
 */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const api = typeof window !== "undefined" ? window.desktop?.window : undefined;

  useEffect(() => {
    if (!api) return;
    let alive = true;
    api.isMaximized().then((m) => alive && setMaximized(m));
    const off = api.onMaximizeChange(setMaximized);
    return () => {
      alive = false;
      off();
    };
  }, [api]);

  const btn =
    "grid place-items-center w-[46px] h-full text-ink-500 hover:text-ink-900 hover:bg-mist-100 transition-colors";

  return (
    <div className="fixed top-0 right-0 z-[120] flex items-stretch h-8 app-no-drag select-none">
      <button className={btn} aria-label="Minimize" onClick={() => api?.minimize()}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1.5 5.5h8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>

      <button
        className={btn}
        aria-label={maximized ? "Restore" : "Maximize"}
        onClick={() => api?.maximizeToggle()}
      >
        {maximized ? (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <rect x="1.4" y="3" width="6.6" height="6.6" rx="1" stroke="currentColor" strokeWidth="1.1" />
            <path d="M3.4 3V1.9A0.9 0.9 0 0 1 4.3 1h5.3A0.9 0.9 0 0 1 10.5 1.9v5.3A0.9 0.9 0 0 1 9.6 8.1H8.4" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <rect x="1.6" y="1.6" width="7.8" height="7.8" rx="1" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        )}
      </button>

      <button
        className="grid place-items-center w-[46px] h-full text-ink-500 hover:text-white hover:bg-[#e5484d] transition-colors"
        aria-label="Close"
        onClick={() => api?.close()}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1.8 1.8l7.4 7.4M9.2 1.8l-7.4 7.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
