import { useEffect, useState } from "react";

/**
 * Custom window controls for the frameless desktop window: minimize, maximize /
 * restore, and close, styled to match the dark theme with clear hover feedback.
 *
 * IMPORTANT (Electron): `-webkit-app-region: no-drag` only takes effect when it
 * carves out of an *ancestor* `drag` region. So the controls are wrapped in a
 * small `app-drag` bar (the ancestor) and the buttons carry `app-no-drag` — this
 * makes them clickable/hoverable even though the page header behind them is a
 * drag region. A standalone no-drag element (no drag ancestor) is ignored.
 *
 * NOTE: changes to the Electron preload/main require a full app restart
 * (`npm run desktop`) — Vite hot-reload alone won't pick them up.
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
      off?.();
    };
  }, [api]);

  const btn =
    "app-no-drag grid place-items-center w-[46px] h-full text-ink-500 transition-colors duration-150 outline-none cursor-default";

  return (
    // ancestor drag bar → lets the buttons' no-drag actually take effect
    <div className="fixed top-0 right-0 z-[200] h-9 app-drag">
      <div className="flex items-stretch h-full app-no-drag select-none">
        <button
          type="button"
          className={`${btn} hover:bg-white/[0.09] hover:text-ink-900 active:bg-white/[0.14]`}
          aria-label="Minimize"
          onClick={() => api?.minimize()}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 5.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          className={`${btn} hover:bg-white/[0.09] hover:text-ink-900 active:bg-white/[0.14]`}
          aria-label={maximized ? "Restore" : "Maximize"}
          onClick={() => api?.maximizeToggle()}
        >
          {maximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x="1.4" y="3" width="6.6" height="6.6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3.6 3V1.9A0.9 0.9 0 0 1 4.5 1H9.6A0.9 0.9 0 0 1 10.5 1.9V7A0.9 0.9 0 0 1 9.6 7.9H8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x="1.6" y="1.6" width="7.8" height="7.8" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className={`${btn} hover:bg-[#e5484d] hover:text-white active:bg-[#c93a3f]`}
          aria-label="Close"
          onClick={() => api?.close()}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.8 1.8l7.4 7.4M9.2 1.8l-7.4 7.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
