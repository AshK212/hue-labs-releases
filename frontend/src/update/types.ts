// Shape of the update IPC boundary (mirrors electron/updater.ts UpdateSnapshot).
// Kept here so both the ambient desktop bridge types and the UpdateManager share
// one definition — no duplicated status unions.

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up_to_date"
  | "update_available"
  | "downloading"
  | "downloaded"
  | "restart_required"
  | "error";

export interface UpdateSnapshot {
  status: UpdateStatus;
  availableVersion: string | null;
  percent: number;
  bytesPerSecond: number;
  lastChecked: number | null;
  error: string | null;
  autoUpdatesEnabled: boolean;
}

export interface DesktopUpdatesApi {
  getState(): Promise<UpdateSnapshot>;
  check(): Promise<UpdateSnapshot>;
  restart(): void;
  onState(cb: (state: UpdateSnapshot) => void): () => void;
}
