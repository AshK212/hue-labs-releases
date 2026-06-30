import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { BenchmarkRun, OllamaModel } from "../types";

/** Loads the real data the dashboard shows: benchmark history + installed models. */
export function useDashboardData() {
  const [history, setHistory] = useState<BenchmarkRun[]>([]);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([api.history(), api.ollamaStatus()]);
      setHistory(h.runs ?? []);
      setModels(s.models ?? []);
    } catch {
      /* leave previous data in place */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, models, loading, refresh };
}
