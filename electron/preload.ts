/**
 * Preload script — the only bridge between the sandboxed renderer (React) and
 * the Electron main process.
 *
 * With context isolation on, nothing from Node/Electron leaks into the page.
 * We deliberately expose a tiny, read-only surface on `window.desktop`. The
 * existing React app does not require any of this to function (it talks to the
 * backend purely over HTTP), but exposing app metadata this way is the secure,
 * future-proof pattern and lets the UI detect that it is running inside the
 * desktop shell if it ever needs to.
 */
import { contextBridge, ipcRenderer } from "electron";

const api = {
  /** True so the web app can tell it is running inside the desktop shell. */
  isDesktop: true,
  /** OS platform string, e.g. "win32". */
  platform: process.platform,
  /** Resolve the packaged application version from the main process. */
  getVersion: (): Promise<string> => ipcRenderer.invoke("app:getVersion"),
  /** Custom title-bar window controls. */
  window: {
    minimize: (): void => ipcRenderer.send("window:minimize"),
    maximizeToggle: (): void => ipcRenderer.send("window:maximizeToggle"),
    close: (): void => ipcRenderer.send("window:close"),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke("window:isMaximized"),
    /** Subscribe to maximize/restore changes; returns an unsubscribe fn. */
    onMaximizeChange: (cb: (maximized: boolean) => void): (() => void) => {
      const onMax = () => cb(true);
      const onUnmax = () => cb(false);
      ipcRenderer.on("window:maximized", onMax);
      ipcRenderer.on("window:unmaximized", onUnmax);
      return () => {
        ipcRenderer.off("window:maximized", onMax);
        ipcRenderer.off("window:unmaximized", onUnmax);
      };
    },
  },
};

export type DesktopApi = typeof api;

contextBridge.exposeInMainWorld("desktop", api);
