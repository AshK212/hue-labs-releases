import { useEffect, useState } from "react";

/**
 * Custom window controls for the frameless desktop window: minimize, maximize /
 * restore, and close.
 *
 * Drag model (this is the reliable one): a dedicated draggable title-bar strip
 * spans the top EXCEPT the right area occupied by the controls, and the page
 * headers are NOT draggable. That way there is no `-webkit-app-region: drag`
 * region beneath the buttons, so they are plain, clickable buttons (a drag
 * region beneath was what swallowed the clicks before).
 *
 * NOTE: Electron preload/main changes need a full app restart (`npm run desktop`).
 */
const CONTROLS_W = 140; // px reserved on the right for the controls

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

  const run = (name: "minimize" | "maximizeToggle" | "close") => api?.[name]?.();

  const btn =
    "grid place-items-center w-[46px] h-full text-ink-500 transition-colors duration-150 outline-none cursor-default";

  return (
    <>
      {/* draggable title-bar strip — everything except the controls on the right */}
      <div
        className="fixed top-0 left-0 h-9 z-[90] app-drag"
        style={{ right: CONTROLS_W }}
      />

      {/* window controls — no drag region beneath, so they click normally */}
      <div className="fixed top-0 right-0 z-[110] flex items-stretch h-9 select-none">
        <button
          type="button"
          className={`${btn} hover:bg-white/[0.09] hover:text-ink-900 active:bg-white/[0.14]`}
          aria-label="Minimize"
          onClick={() => run("minimize")}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 5.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          className={`${btn} hover:bg-white/[0.09] hover:text-ink-900 active:bg-white/[0.14]`}
          aria-label={maximized ? "Restore" : "Maximize"}
          onClick={() => run("maximizeToggle")}
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
          onClick={() => run("close")}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.8 1.8l7.4 7.4M9.2 1.8l-7.4 7.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </>
  );
}
