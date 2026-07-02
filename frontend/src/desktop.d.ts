// Shape of the API the Electron preload exposes on `window.desktop`.
// (Kept in sync with electron/preload.ts.)
export {};

interface DesktopWindowApi {
  minimize(): void;
  maximizeToggle(): void;
  close(): void;
  isMaximized(): Promise<boolean>;
  onMaximizeChange(cb: (maximized: boolean) => void): () => void;
}

interface DesktopApi {
  isDesktop: boolean;
  platform: string;
  getVersion(): Promise<string>;
  window: DesktopWindowApi;
}

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}
