/**
 * Minimal structured logger for the desktop shell.
 *
 * Writes timestamped lines to the console (visible in dev) and appends them to
 * a rolling log file inside the OS user-data directory (invaluable for
 * diagnosing production installs where there is no terminal).
 */
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

type Level = "INFO" | "WARN" | "ERROR";

let stream: fs.WriteStream | null = null;

/** Lazily open the log file. Called on first write so app paths are ready. */
function fileStream(): fs.WriteStream | null {
  if (stream) return stream;
  try {
    const dir = app.getPath("logs");
    fs.mkdirSync(dir, { recursive: true });
    stream = fs.createWriteStream(path.join(dir, "desktop.log"), { flags: "a" });
  } catch {
    // If we can't open a log file (very early startup, permissions) we simply
    // fall back to console-only logging rather than crashing the app.
    stream = null;
  }
  return stream;
}

function write(level: Level, scope: string, message: string): void {
  const line = `${new Date().toISOString()} | ${level.padEnd(5)} | ${scope} | ${message}`;
  // eslint-disable-next-line no-console
  (level === "ERROR" ? console.error : console.log)(line);
  fileStream()?.write(line + "\n");
}

export const log = {
  info: (scope: string, message: string) => write("INFO", scope, message),
  warn: (scope: string, message: string) => write("WARN", scope, message),
  error: (scope: string, message: string) => write("ERROR", scope, message),
};
