import { useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { STEP } from "../journey/steps";
import { useTheme } from "../ThemeProvider";
import { THEMES } from "../theme";
import {
  DEFAULT_PRIVACY,
  getStoredPrivacy,
  setStoredPrivacy,
  type PrivacySettings,
} from "../privacy";
import {
  activateLicense,
  clearLicense,
  getStoredLicense,
  type LicenseState,
} from "../license";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/Badge";
import { friendlySetting } from "../journey/labels";
import type { BenchmarkRun, OllamaModel } from "../types";
import { DashCard, EmptyState, StatLine } from "./widgets";
import { BrandLineChart, ChartLegend, type ChartPoint } from "../components/BrandChart";
import { TechnicalDetails } from "../components/TechnicalDetails";
import {
  Activity,
  ArrowRight,
  Boxes,
  Check,
  Clock,
  Cpu,
  Database,
  Gauge,
  KeyRound,
  Palette,
  Play,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

export type SectionId =
  | "overview"
  | "models"
  | "performance"
  | "benchmark"
  | "optimization"
  | "history"
  | "settings";

function perfLabel(tps: number): string {
  if (tps >= 60) return "Very fast";
  if (tps >= 30) return "Fast";
  if (tps >= 15) return "Comfortable";
  return "Steady";
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
function chartPoints(history: BenchmarkRun[]): ChartPoint[] {
  // Oldest → newest so the line reads left-to-right through real runs.
  return history
    .slice(0, 14)
    .reverse()
    .map((r) => ({
      value: r.tokens_per_sec,
      tone: r.profile === "optimized" ? "signal" : "gray",
      title: `${r.tokens_per_sec.toFixed(1)} tok/s · ${r.profile}`,
    }));
}

function useModelLabel(): string {
  const { selectedModel, recommendation } = useJourney();
  if (!selectedModel) return "No model selected";
  if (selectedModel === recommendation?.primary.model) return recommendation.primary.display_name;
  const alt = recommendation?.alternatives.find((a) => a.model === selectedModel);
  return alt?.display_name ?? selectedModel;
}

// --- Overview -----------------------------------------------------------

export function OverviewSection({
  history,
  models,
  onNavigate,
}: {
  history: BenchmarkRun[];
  models: OllamaModel[];
  onNavigate: (s: SectionId) => void;
}) {
  const { hardware, baseline, optimized, profile, restartBenchmarks, reoptimize, enterFlowAt } =
    useJourney();
  const modelLabel = useModelLabel();
  const current = optimized?.tokens_per_sec ?? baseline?.tokens_per_sec ?? history[0]?.tokens_per_sec ?? 0;
  const changes = Array.from(new Set((profile?.changed_settings ?? []).map(friendlySetting)));
  const baseModel = (baseline?.model ?? optimized?.model ?? "").split(":")[0];
  const modelSize = baseModel
    ? models.find((m) => m.name.split(":")[0] === baseModel)?.size_gb
    : undefined;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DashCard className="lg:col-span-2" index={0}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-micro font-mono uppercase tracking-wide text-ink-500">Current speed</p>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-[64px] leading-none font-semibold font-mono tracking-tight2 text-ink-900 tnum">
                  {current.toFixed(1)}
                </span>
                <span className="text-caption font-mono text-ink-400 pb-2">tokens/sec</span>
              </div>
              {current > 0 && (
                <div className="mt-3">
                  <StatusBadge tone="green" dot>
                    {perfLabel(current)}
                  </StatusBadge>
                </div>
              )}
            </div>
            <span className="grid place-items-center w-12 h-12 rounded-tile bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100">
              <Gauge className="w-6 h-6" strokeWidth={1.8} />
            </span>
          </div>
          <p className="text-caption text-ink-400 mt-5">
            Measured on your computer with the same prompt every time.
          </p>
        </DashCard>

        <DashCard title="Quick actions" index={1}>
          <div className="space-y-2.5">
            <QuickAction icon={<Play className="w-[18px] h-[18px]" />} label="Run benchmark" onClick={restartBenchmarks} />
            <QuickAction icon={<Sparkles className="w-[18px] h-[18px]" />} label="Optimize again" onClick={reoptimize} />
            <QuickAction icon={<Boxes className="w-[18px] h-[18px]" />} label="Change model" onClick={() => enterFlowAt(STEP.Recommend)} />
            <QuickAction icon={<SettingsIcon className="w-[18px] h-[18px]" />} label="Settings" onClick={() => onNavigate("settings")} />
          </div>
        </DashCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <DashCard title="Installed model" icon={<Boxes className="w-5 h-5" strokeWidth={1.8} />} index={2}>
          <div className="text-body font-semibold text-ink-900">{modelLabel}</div>
          <div className="mt-1 text-caption text-ink-400">
            {modelSize ? `${modelSize} GB on disk · ` : ""}Runs offline
          </div>
          <div className="mt-3">
            <StatusBadge tone="green" dot>
              Ready
            </StatusBadge>
          </div>
        </DashCard>

        <DashCard title="Your hardware" icon={<Cpu className="w-5 h-5" strokeWidth={1.8} />} index={3}>
          {hardware ? (
            <>
              <StatLine label="Processor" value={`${hardware.cpu_cores_physical} cores`} />
              <StatLine label="Memory" value={`${hardware.memory_total_gb} GB`} />
              <StatLine
                label="Graphics"
                value={hardware.gpus[0]?.vram_gb ? `${hardware.gpus[0].vram_gb} GB` : "Built-in"}
              />
            </>
          ) : (
            <p className="text-caption text-ink-400">Not detected in this session.</p>
          )}
        </DashCard>

        <DashCard title="Optimization" icon={<Sparkles className="w-5 h-5" strokeWidth={1.8} />} index={4}>
          {changes.length > 0 ? (
            <div className="space-y-2">
              {changes.map((c) => (
                <div key={c} className="flex items-center gap-2 text-caption text-ink-700">
                  <Zap className="w-4 h-4 text-sage-500" strokeWidth={2} />
                  {c}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-caption text-ink-400">Not optimized yet.</p>
              <button
                className="mt-3 inline-flex items-center gap-1 text-caption font-medium text-sky-600 hover:text-sky-700"
                onClick={reoptimize}
              >
                Optimize now <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </DashCard>
      </div>

      <DashCard
        title="Recent benchmarks"
        icon={<Activity className="w-5 h-5" strokeWidth={1.8} />}
        action={
          <button
            className="text-caption font-medium text-sky-600 hover:text-sky-700"
            onClick={() => onNavigate("history")}
          >
            View history
          </button>
        }
        index={5}
      >
        <BrandLineChart points={chartPoints(history)} height={150} />
        {history.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <ChartLegend tone="signal" label="Optimized" />
              <ChartLegend tone="gray" label="Baseline" />
            </div>
            <p className="text-micro font-mono text-ink-400">
              {history.length} run{history.length === 1 ? "" : "s"} · latest{" "}
              {history[0].tokens_per_sec.toFixed(1)} tok/s
            </p>
          </div>
        )}
      </DashCard>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-tile bg-mist-50 border border-mist-200 text-body font-medium text-ink-700 hover:bg-mist-100 hover:border-sky-300/60 hover:text-ink-900 hover:-translate-y-[1px] transition-all duration-200"
    >
      <span className="text-sky-500">{icon}</span>
      {label}
      <ArrowRight className="w-4 h-4 ml-auto text-ink-400" strokeWidth={2} />
    </button>
  );
}

// --- Models -------------------------------------------------------------

export function ModelsSection({ models }: { models: OllamaModel[] }) {
  const { enterFlowAt } = useJourney();
  return (
    <div className="space-y-5">
      <DashCard title="Installed models" icon={<Boxes className="w-5 h-5" strokeWidth={1.8} />}>
        {models.length === 0 ? (
          <EmptyState motif="chip" title="No models yet" hint="Choose a model to install it on your computer." />
        ) : (
          <div className="space-y-3">
            {models.map((m) => (
              <div
                key={m.name}
                className="flex items-center gap-4 p-4 rounded-tile bg-mist-50 border border-mist-200"
              >
                <span className="grid place-items-center w-11 h-11 rounded-tile bg-sky-50 text-sky-500">
                  <Boxes className="w-5 h-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-body font-semibold text-ink-900">{m.name}</div>
                  <div className="text-caption text-ink-400">
                    {m.size_gb ? `${m.size_gb} GB on disk` : "Installed"} · Runs offline
                  </div>
                </div>
                <StatusBadge tone="green" dot>
                  Ready
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
      </DashCard>
      <div>
        <Button variant="secondary" onClick={() => enterFlowAt(STEP.Recommend)} leftIcon={<Boxes className="w-[18px] h-[18px]" />}>
          Choose a different model
        </Button>
      </div>
    </div>
  );
}

// --- Performance --------------------------------------------------------

export function PerformanceSection({ history }: { history: BenchmarkRun[] }) {
  const values = history.map((r) => r.tokens_per_sec);
  const best = values.length ? Math.max(...values) : 0;
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const latest = history[0]?.tokens_per_sec ?? 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <DashCard index={0}>
          <p className="text-micro font-mono uppercase tracking-wide text-ink-500">Latest</p>
          <div className="text-[34px] font-semibold font-mono text-ink-900 tnum mt-1">{latest.toFixed(1)}</div>
          <p className="text-micro font-mono text-ink-400">tokens/sec</p>
        </DashCard>
        <DashCard index={1}>
          <p className="text-micro font-mono uppercase tracking-wide text-ink-500">Best</p>
          <div className="text-[34px] font-semibold font-mono text-sage-600 tnum mt-1">{best.toFixed(1)}</div>
          <p className="text-micro font-mono text-ink-400">tokens/sec</p>
        </DashCard>
        <DashCard index={2}>
          <p className="text-micro font-mono uppercase tracking-wide text-ink-500">Average</p>
          <div className="text-[34px] font-semibold font-mono text-ink-900 tnum mt-1">{avg.toFixed(1)}</div>
          <p className="text-micro font-mono text-ink-400">tokens/sec</p>
        </DashCard>
      </div>
      <DashCard title="Speed over time" icon={<Activity className="w-5 h-5" strokeWidth={1.8} />} index={3}>
        <BrandLineChart points={chartPoints(history)} height={200} />
        {history.length > 0 && (
          <div className="mt-4 flex items-center gap-5">
            <ChartLegend tone="signal" label="Optimized" />
            <ChartLegend tone="gray" label="Baseline" />
          </div>
        )}
      </DashCard>
    </div>
  );
}

// --- History ------------------------------------------------------------

export function HistorySection({ history }: { history: BenchmarkRun[] }) {
  return (
    <DashCard title="Benchmark history" icon={<Clock className="w-5 h-5" strokeWidth={1.8} />}>
      {history.length === 0 ? (
        <EmptyState motif="speed" title="No runs recorded yet" hint="Your benchmark runs will appear here." />
      ) : (
        <div className="overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-micro font-mono uppercase tracking-wide text-ink-400 px-2 pb-2 border-b border-mist-200">
            <span>Model</span>
            <span>Profile</span>
            <span className="text-right">Speed</span>
            <span className="text-right">When</span>
          </div>
          {history.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 items-center px-2 py-3 border-b border-mist-200 last:border-0 hover:bg-mist-50 rounded-md transition-colors"
            >
              <span className="text-caption font-medium text-ink-900 truncate">{r.model}</span>
              <span className="text-caption font-mono text-ink-500 capitalize">{r.profile}</span>
              <span className="text-caption font-semibold font-mono text-sky-600 text-right tnum">
                {r.tokens_per_sec.toFixed(1)} tok/s
              </span>
              <span className="text-caption font-mono text-ink-400 text-right">{fmtDate(r.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </DashCard>
  );
}

// --- Benchmark ----------------------------------------------------------

export function BenchmarkSection() {
  const { baseline, optimized, restartBenchmarks } = useJourney();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <DashCard title="Baseline" icon={<Gauge className="w-5 h-5" strokeWidth={1.8} />} index={0}>
          <div className="text-[40px] font-semibold font-mono text-ink-900 tnum">
            {baseline ? baseline.tokens_per_sec.toFixed(1) : "-"}
          </div>
          <p className="text-micro font-mono text-ink-400">tokens/sec · default settings</p>
        </DashCard>
        <DashCard title="Optimized" icon={<Sparkles className="w-5 h-5" strokeWidth={1.8} />} index={1}>
          <div className="text-[40px] font-semibold font-mono text-sage-600 tnum">
            {optimized ? optimized.tokens_per_sec.toFixed(1) : "-"}
          </div>
          <p className="text-micro font-mono text-ink-400">tokens/sec · tuned settings</p>
        </DashCard>
      </div>
      <Button onClick={restartBenchmarks} leftIcon={<RefreshCw className="w-[18px] h-[18px]" />}>
        Run benchmark again
      </Button>
    </div>
  );
}

// --- Optimization -------------------------------------------------------

export function OptimizationSection() {
  const { profile, reoptimize } = useJourney();
  const changes = Array.from(new Set((profile?.changed_settings ?? []).map(friendlySetting)));
  return (
    <div className="space-y-5">
      <DashCard title="Applied settings" icon={<Sparkles className="w-5 h-5" strokeWidth={1.8} />}>
        {changes.length === 0 ? (
          <p className="text-caption text-ink-400">No optimization applied yet.</p>
        ) : (
          <div className="space-y-3">
            {changes.map((c) => (
              <div key={c} className="flex items-center gap-3 p-3.5 rounded-tile bg-mist-50 border border-mist-200">
                <span className="grid place-items-center w-9 h-9 rounded-tile bg-sage-50 text-sage-500 ring-1 ring-inset ring-sky-100">
                  <Zap className="w-[18px] h-[18px]" strokeWidth={2} />
                </span>
                <span className="text-body text-ink-700">{c}</span>
              </div>
            ))}
          </div>
        )}
        {profile?.options && (
          <div className="mt-4">
            <TechnicalDetails options={profile.options} />
          </div>
        )}
      </DashCard>
      <Button onClick={reoptimize} leftIcon={<Sparkles className="w-[18px] h-[18px]" />}>
        Optimize again
      </Button>
    </div>
  );
}

// --- Settings -----------------------------------------------------------

export function SettingsSection() {
  const { reset } = useJourney();
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => getStoredPrivacy());

  const updatePrivacy = (patch: Partial<PrivacySettings>) => {
    const next = { ...privacy, ...patch };
    setPrivacy(next);
    setStoredPrivacy(next); // persist via the existing localStorage mechanism
  };

  const [license, setLicense] = useState<LicenseState>(() => getStoredLicense());
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseError, setLicenseError] = useState<string | null>(null);

  const onActivate = () => {
    const next = activateLicense(licenseKeyInput);
    setLicense(next);
    if (next.status === "INVALID") {
      setLicenseError("That license key wasn't recognized.");
    } else {
      setLicenseError(null);
      setLicenseKeyInput("");
    }
  };

  const onClearLicense = () => {
    setLicense(clearLicense());
    setLicenseKeyInput("");
    setLicenseError(null);
  };

  return (
    <div className="space-y-5 max-w-[40rem]">
      <DashCard title="Appearance" icon={<Palette className="w-5 h-5" strokeWidth={1.8} />}>
        <p className="text-caption text-ink-500 leading-relaxed">
          Choose how the whole app looks. Hue Labs is the default; the others are kept for development.
        </p>
        <ThemePicker />
      </DashCard>

      <DashCard title="Privacy" icon={<ShieldCheck className="w-5 h-5" strokeWidth={1.8} />}>
        <p className="text-caption text-ink-500 leading-relaxed">
          Everything runs locally on your computer. Models and benchmarks never leave your
          machine, and no account or internet connection is required to use it.
        </p>
        <div className="mt-3">
          <StatusBadge tone="green" dot>
            Local only
          </StatusBadge>
        </div>
      </DashCard>

      <DashCard title="Help improve Hue Labs" icon={<ShieldCheck className="w-5 h-5" strokeWidth={1.8} />}>
        <p className="text-caption text-ink-500 leading-relaxed">
          Optional and anonymous. No prompts, no personal data — and you can change these anytime.
        </p>
        <div className="mt-3 divide-y divide-mist-200">
          <ToggleRow
            label="Anonymous usage analytics"
            description="Share anonymous usage events to help us prioritize what to improve."
            checked={privacy.telemetry_enabled}
            onChange={(v) => updatePrivacy({ telemetry_enabled: v })}
          />
          <ToggleRow
            label="Anonymous benchmark submission"
            description="Contribute your measured results (no prompts, no personal data) to the community dataset."
            checked={privacy.benchmark_submission_enabled}
            onChange={(v) => updatePrivacy({ benchmark_submission_enabled: v })}
          />
          <ToggleRow
            label="Crash reporting"
            description="Coming soon."
            checked={DEFAULT_PRIVACY.crash_reports_enabled}
            onChange={() => {}}
            disabled
          />
        </div>
      </DashCard>

      <DashCard title="License" icon={<KeyRound className="w-5 h-5" strokeWidth={1.8} />}>
        <p className="text-caption text-ink-500 leading-relaxed">
          Enter a license key to unlock Pro features. Hue Labs works fully without one.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={licenseKeyInput}
            onChange={(e) => setLicenseKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onActivate()}
            placeholder="Enter license key"
            aria-label="License key"
            className="min-w-0 flex-1 h-11 px-3 rounded-tile bg-mist-50 border border-mist-200 text-body text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-sky-300"
          />
          <Button variant="secondary" onClick={onActivate}>
            Activate
          </Button>
        </div>
        {licenseError && (
          <p className="text-micro mt-2" style={{ color: "#E5646A" }}>
            {licenseError}
          </p>
        )}
        <div className="mt-4 divide-y divide-mist-200">
          <StatLine label="Current status" value={license.status} />
          <StatLine label="Current plan" value={license.plan} />
        </div>
        {(license.status === "ACTIVE" || license.status === "TRIAL") && (
          <div className="mt-3">
            <Button variant="ghost" onClick={onClearLicense}>
              Remove license
            </Button>
          </div>
        )}
      </DashCard>

      <DashCard title="Data" icon={<Database className="w-5 h-5" strokeWidth={1.8} />}>
        <StatLine label="Benchmark history" value="Stored locally" />
        <StatLine label="Models" value="Managed by Ollama" />
        <StatLine label="App" value="Hue Labs · MVP" />
      </DashCard>

      <DashCard title="Setup">
        <p className="text-caption text-ink-500">
          Run the guided setup again from the beginning.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={reset} leftIcon={<RefreshCw className="w-[18px] h-[18px]" />}>
            Re-run setup
          </Button>
        </div>
      </DashCard>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-body font-medium text-ink-800">{label}</div>
        {description && <div className="text-micro text-ink-400 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={[
          "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200",
          disabled
            ? "bg-mist-200 opacity-50 cursor-not-allowed"
            : checked
            ? "bg-sky-500"
            : "bg-mist-300 hover:bg-mist-400",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Appearance theme" className="mt-4 space-y-2.5">
      {THEMES.map((opt) => {
        const selected = theme === opt.id;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(opt.id)}
            className={[
              "group w-full flex items-center gap-3.5 p-3 rounded-tile border text-left transition-all duration-200",
              selected
                ? "bg-mist-100 !border-sky-300 ring-2 ring-sky-100"
                : "bg-mist-50 border-mist-200 hover:!border-sky-300/60 hover:-translate-y-[1px]",
            ].join(" ")}
          >
            {/* swatch: theme base tile with the accent dot */}
            <span
              aria-hidden
              className="flex-shrink-0 grid place-items-center w-10 h-10 rounded-tile ring-1 ring-inset ring-white/10"
              style={{ backgroundColor: opt.base }}
            >
              <span
                className="w-4 h-4 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: opt.swatch }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-body font-semibold text-ink-900">{opt.name}</span>
                {opt.dev && (
                  <span className="text-[10px] font-mono uppercase tracking-wide text-ink-400 border border-mist-300 rounded px-1.5 py-px">
                    Dev
                  </span>
                )}
                {!opt.dev && (
                  <span className="text-[10px] font-mono uppercase tracking-wide text-ink-500">
                    Default
                  </span>
                )}
              </span>
              <span className="block text-micro text-ink-400 truncate mt-0.5">{opt.tagline}</span>
            </span>
            <span
              className={[
                "flex-shrink-0 grid place-items-center w-6 h-6 rounded-full border transition-colors",
                selected
                  ? "bg-sky-500 border-transparent text-carbon"
                  : "border-mist-300 text-transparent group-hover:border-sky-300/60",
              ].join(" ")}
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const SECTION_ICON: Record<SectionId, React.ReactNode> = {
  overview: <Activity className="w-[18px] h-[18px]" strokeWidth={1.9} />,
  models: <Boxes className="w-[18px] h-[18px]" strokeWidth={1.9} />,
  performance: <Activity className="w-[18px] h-[18px]" strokeWidth={1.9} />,
  benchmark: <Gauge className="w-[18px] h-[18px]" strokeWidth={1.9} />,
  optimization: <Sparkles className="w-[18px] h-[18px]" strokeWidth={1.9} />,
  history: <Clock className="w-[18px] h-[18px]" strokeWidth={1.9} />,
  settings: <SettingsIcon className="w-[18px] h-[18px]" strokeWidth={1.9} />,
};

