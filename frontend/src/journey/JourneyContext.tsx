import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type {
  BenchmarkResult,
  HardwareInfo,
  OllamaStatus,
  OptimizationProfile,
  RecommendationResponse,
} from "../types";
import { STEP } from "./steps";

export type Phase = "idle" | "loading" | "done" | "error";

interface JourneyValue {
  // Navigation
  step: number;
  next: () => void;
  back: () => void;
  goTo: (n: number) => void;
  reset: () => void;

  // Data
  hardware: HardwareInfo | null;
  ollama: OllamaStatus | null;
  recommendation: RecommendationResponse | null;
  selectedModel: string | null;
  setSelectedModel: (m: string) => void;
  profile: OptimizationProfile | null;
  baseline: BenchmarkResult | null;
  optimized: BenchmarkResult | null;

  // Derived
  ollamaReady: boolean;
  modelInstalled: boolean;

  // Phases + errors
  prefetchPhase: Phase;
  prefetchError: string | null;
  baselinePhase: Phase;
  baselineError: string | null;
  optimizePhase: Phase;
  optimizeError: string | null;

  // Actions
  prefetch: () => Promise<void>;
  refreshOllama: () => Promise<void>;
  runBaseline: () => Promise<void>;
  optimizeAndRetest: () => Promise<void>;
}

const JourneyContext = createContext<JourneyValue | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<number>(STEP.Welcome);

  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [ollama, setOllama] = useState<OllamaStatus | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [profile, setProfile] = useState<OptimizationProfile | null>(null);
  const [baseline, setBaseline] = useState<BenchmarkResult | null>(null);
  const [optimized, setOptimized] = useState<BenchmarkResult | null>(null);

  const [prefetchPhase, setPrefetchPhase] = useState<Phase>("idle");
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const [baselinePhase, setBaselinePhase] = useState<Phase>("idle");
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [optimizePhase, setOptimizePhase] = useState<Phase>("idle");
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const ollamaReady = !!ollama?.running;
  const modelInstalled = useMemo(() => {
    if (!selectedModel || !ollama) return false;
    const base = selectedModel.split(":")[0];
    return ollama.models.some(
      (m) => m.name === selectedModel || m.name.split(":")[0] === base
    );
  }, [selectedModel, ollama]);

  // --- Navigation ---
  const next = useCallback(() => setStep((s) => Math.min(s + 1, STEP.Results)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, STEP.Welcome)), []);
  const goTo = useCallback((n: number) => setStep(n), []);
  const reset = useCallback(() => {
    setStep(STEP.Welcome);
    setProfile(null);
    setBaseline(null);
    setOptimized(null);
    setBaselinePhase("idle");
    setOptimizePhase("idle");
    setBaselineError(null);
    setOptimizeError(null);
  }, []);

  // --- Async actions ---
  const prefetch = useCallback(async () => {
    setPrefetchPhase("loading");
    setPrefetchError(null);
    try {
      const [hw, status, rec] = await Promise.all([
        api.hardware(),
        api.ollamaStatus(),
        api.recommend(),
      ]);
      setHardware(hw);
      setOllama(status);
      setRecommendation(rec);
      setSelectedModel((prev) => prev ?? rec.primary.model);
      setPrefetchPhase("done");
    } catch (e) {
      setPrefetchError((e as Error).message);
      setPrefetchPhase("error");
    }
  }, []);

  const refreshOllama = useCallback(async () => {
    try {
      setOllama(await api.ollamaStatus());
    } catch {
      // A failed status refresh just leaves the previous state in place.
    }
  }, []);

  const runBaseline = useCallback(async () => {
    if (!selectedModel) return;
    setBaselinePhase("loading");
    setBaselineError(null);
    try {
      setBaseline(await api.runBenchmark(selectedModel, "baseline"));
      setBaselinePhase("done");
    } catch (e) {
      setBaselineError((e as Error).message);
      setBaselinePhase("error");
    }
  }, [selectedModel]);

  const optimizeAndRetest = useCallback(async () => {
    if (!selectedModel) return;
    setOptimizePhase("loading");
    setOptimizeError(null);
    try {
      const res = await api.applyOptimization(selectedModel);
      setProfile(res.profile);
      setOptimized(await api.runBenchmark(selectedModel, "optimized"));
      setOptimizePhase("done");
    } catch (e) {
      setOptimizeError((e as Error).message);
      setOptimizePhase("error");
    }
  }, [selectedModel]);

  const value: JourneyValue = {
    step,
    next,
    back,
    goTo,
    reset,
    hardware,
    ollama,
    recommendation,
    selectedModel,
    setSelectedModel,
    profile,
    baseline,
    optimized,
    ollamaReady,
    modelInstalled,
    prefetchPhase,
    prefetchError,
    baselinePhase,
    baselineError,
    optimizePhase,
    optimizeError,
    prefetch,
    refreshOllama,
    runBaseline,
    optimizeAndRetest,
  };

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney(): JourneyValue {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error("useJourney must be used inside <JourneyProvider>");
  return ctx;
}
