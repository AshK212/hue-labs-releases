/**
 * UpdateManager — the single owner of update state in the renderer.
 *
 * It reads the app version from Electron (never hardcoded), subscribes once to
 * the main process's consolidated `update:state` pushes (no polling), and exposes
 * everything the UI needs through `useUpdates()`. No update logic lives in any
 * component — they only read this context and call its actions.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UpdateSnapshot, UpdateStatus } from "./types";
import { readUpdateStore, writeUpdateStore } from "./storage";

/** Client-facing status = server statuses plus a local "installing" step. */
export type ClientUpdateStatus = UpdateStatus | "installing";

interface UpdateContextValue {
  // Identity
  currentVersion: string;
  buildType: "Production" | "Development";
  releaseChannel: string;
  autoUpdatesEnabled: boolean;

  // Live state
  status: ClientUpdateStatus;
  progress: { percent: number; bytesPerSecond: number } | null;
  lastChecked: number | null;
  availableVersion: string | null;
  restartRequired: boolean;

  // First-launch-after-update
  previousVersion: string | null;
  justUpdated: boolean;

  // Restart banner
  restartBannerVisible: boolean;

  // Actions
  checkNow: () => void;
  restartNow: () => void;
  dismissUpdated: () => void;
  dismissRestart: () => void;
}

const DEFAULT_SNAPSHOT: UpdateSnapshot = {
  status: "idle",
  availableVersion: null,
  percent: 0,
  bytesPerSecond: 0,
  lastChecked: null,
  error: null,
  autoUpdatesEnabled: !import.meta.env.DEV,
};

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const buildType = import.meta.env.DEV ? "Development" : "Production";

  const [currentVersion, setCurrentVersion] = useState("");
  const [snapshot, setSnapshot] = useState<UpdateSnapshot>(() => ({
    ...DEFAULT_SNAPSHOT,
    lastChecked: readUpdateStore().lastChecked ?? null,
  }));
  const [installing, setInstalling] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(
    () => readUpdateStore().dismissedVersion ?? null
  );

  // Version + first-launch detection, then subscribe to state pushes.
  useEffect(() => {
    let alive = true;
    const desktop = window.desktop;

    desktop
      ?.getVersion()
      .then((version) => {
        if (!alive) return;
        setCurrentVersion(version);
        const store = readUpdateStore();
        if (store.lastSeenVersion && store.lastSeenVersion !== version) {
          // We were just updated — show the one-time dialog.
          setPreviousVersion(store.lastSeenVersion);
          setJustUpdated(true);
        } else if (!store.lastSeenVersion) {
          // First ever launch — record silently, no dialog.
          writeUpdateStore({ ...store, lastSeenVersion: version });
        }
      })
      .catch(() => {
        /* not in the desktop shell */
      });

    desktop?.updates
      ?.getState()
      .then((s) => alive && setSnapshot(s))
      .catch(() => {});
    const off = desktop?.updates?.onState((s) => setSnapshot(s));

    return () => {
      alive = false;
      off?.();
    };
  }, []);

  // Persist last-checked across launches whenever it advances.
  useEffect(() => {
    if (!snapshot.lastChecked) return;
    const store = readUpdateStore();
    if (store.lastChecked !== snapshot.lastChecked) {
      writeUpdateStore({ ...store, lastChecked: snapshot.lastChecked });
    }
  }, [snapshot.lastChecked]);

  const checkNow = useCallback(() => {
    window.desktop?.updates?.check().then(setSnapshot).catch(() => {});
  }, []);

  const restartNow = useCallback(() => {
    setInstalling(true);
    window.desktop?.updates?.restart();
  }, []);

  const dismissUpdated = useCallback(() => {
    setJustUpdated(false);
    if (currentVersion) {
      writeUpdateStore({ ...readUpdateStore(), lastSeenVersion: currentVersion });
    }
  }, [currentVersion]);

  const dismissRestart = useCallback(() => {
    const v = snapshot.availableVersion;
    setDismissedVersion(v);
    writeUpdateStore({ ...readUpdateStore(), dismissedVersion: v ?? undefined });
  }, [snapshot.availableVersion]);

  const value = useMemo<UpdateContextValue>(() => {
    const restartRequired = snapshot.status === "downloaded";
    return {
      currentVersion,
      buildType,
      releaseChannel: "Stable",
      autoUpdatesEnabled: snapshot.autoUpdatesEnabled,
      status: installing ? "installing" : snapshot.status,
      progress:
        snapshot.status === "downloading"
          ? { percent: snapshot.percent, bytesPerSecond: snapshot.bytesPerSecond }
          : null,
      lastChecked: snapshot.lastChecked,
      availableVersion: snapshot.availableVersion,
      restartRequired,
      previousVersion,
      justUpdated,
      restartBannerVisible:
        restartRequired && !installing && dismissedVersion !== snapshot.availableVersion,
      checkNow,
      restartNow,
      dismissUpdated,
      dismissRestart,
    };
  }, [
    currentVersion,
    buildType,
    snapshot,
    installing,
    previousVersion,
    justUpdated,
    dismissedVersion,
    checkNow,
    restartNow,
    dismissUpdated,
    dismissRestart,
  ]);

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdates(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error("useUpdates must be used inside <UpdateProvider>");
  return ctx;
}
