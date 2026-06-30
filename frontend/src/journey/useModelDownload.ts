import { useCallback, useRef, useState } from "react";
import { api } from "../api/client";
import type { PullEvent } from "../types";

export type DownloadStatus =
  | "idle"
  | "preparing"
  | "downloading"
  | "verifying"
  | "finalizing"
  | "complete"
  | "error"
  | "cancelled";

export interface DownloadState {
  status: DownloadStatus;
  /** 0–100 once Ollama reports sizes; null while size is unknown (preparing/verifying). */
  percent: number | null;
  completedBytes: number;
  totalBytes: number;
  error: string | null;
  start: (model: string) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

const ACTIVE: DownloadStatus[] = [
  "preparing",
  "downloading",
  "verifying",
  "finalizing",
];

/**
 * Drives a single model download from real Ollama progress. It aggregates the
 * per-layer byte counts Ollama streams into one honest overall percentage, and
 * exposes a cancel that actually aborts the request. Reusable for any model.
 */
export function useModelDownload(): DownloadState {
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [percent, setPercent] = useState<number | null>(null);
  const [completedBytes, setCompletedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const failedRef = useRef(false);
  // Real bytes per layer (digest), summed for the overall figure.
  const layersRef = useRef<Map<string, { total: number; completed: number }>>(new Map());

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    layersRef.current.clear();
    setStatus("idle");
    setPercent(null);
    setCompletedBytes(0);
    setTotalBytes(0);
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("cancelled");
  }, []);

  const handleEvent = useCallback((e: PullEvent) => {
    if (e.error || e.phase === "error") {
      failedRef.current = true;
      setError(e.error ?? "The download stopped unexpectedly.");
      setStatus("error");
      return;
    }

    // Update aggregated byte totals from the real per-layer numbers.
    if (e.digest && typeof e.total === "number") {
      layersRef.current.set(e.digest, {
        total: e.total,
        completed: e.completed ?? 0,
      });
      let total = 0;
      let completed = 0;
      layersRef.current.forEach((v) => {
        total += v.total;
        completed += v.completed;
      });
      setTotalBytes(total);
      setCompletedBytes(completed);
      if (total > 0) setPercent(Math.min(100, (completed / total) * 100));
    }

    // Advance the status label, but never move backwards out of "complete".
    setStatus((prev) => {
      if (prev === "complete") return prev;
      if (e.phase === "complete") return "complete";
      return e.phase; // preparing | downloading | verifying | finalizing
    });
  }, []);

  const start = useCallback(
    async (model: string) => {
      layersRef.current.clear();
      failedRef.current = false;
      setError(null);
      setPercent(null);
      setCompletedBytes(0);
      setTotalBytes(0);
      setStatus("preparing");

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        await api.pullModelStream(model, handleEvent, ac.signal);
        // Stream finished cleanly. Treat a successful end of stream as completion
        // unless an error event arrived along the way.
        if (!failedRef.current && !ac.signal.aborted) {
          setStatus("complete");
          setPercent(100);
        }
      } catch (err) {
        if (ac.signal.aborted) {
          setStatus("cancelled");
        } else {
          setError((err as Error).message);
          setStatus("error");
        }
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
      }
    },
    [handleEvent]
  );

  return {
    status,
    percent,
    completedBytes,
    totalBytes,
    error,
    start,
    cancel,
    reset,
  };
}

export function isDownloadActive(status: DownloadStatus): boolean {
  return ACTIVE.includes(status);
}
