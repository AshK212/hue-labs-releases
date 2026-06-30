import { useEffect, useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { Pulse } from "../components/Pulse";
import {
  ArrowRightIcon,
  CheckIcon,
  CloudIcon,
  DownloadIcon,
} from "../components/Icons";

const PULL_MESSAGES = [
  "Downloading the model…",
  "This can take a few minutes…",
  "Setting things up…",
  "Almost ready…",
];

export function SetupScreen() {
  const {
    ollama,
    ollamaReady,
    modelInstalled,
    selectedModel,
    recommendation,
    pulling,
    pullError,
    pullModel,
    refreshOllama,
    next,
  } = useJourney();

  const modelLabel =
    (selectedModel === recommendation?.primary.model
      ? recommendation?.primary.display_name
      : recommendation?.alternatives[0]?.display_name) ?? selectedModel ?? "the model";

  // --- State A: engine not running ---
  if (!ollamaReady) {
    return <EngineNotFound message={ollama?.message} onRecheck={refreshOllama} />;
  }

  // --- State B: pulling the model ---
  if (pulling) {
    return <Installing modelLabel={modelLabel} />;
  }

  // --- State C: model needs installing ---
  if (!modelInstalled) {
    const sizeGb =
      selectedModel === recommendation?.primary.model
        ? recommendation?.primary.download_size_gb
        : recommendation?.alternatives[0]?.download_size_gb;
    return (
      <div className="flex flex-col items-center text-center">
        <Reveal index={0}>
          <div className="grid place-items-center w-16 h-16 rounded-xl3 bg-sky-50 text-sky-500">
            <DownloadIcon className="w-7 h-7" />
          </div>
        </Reveal>
        <Reveal index={1} className="mt-6">
          <h1 className="text-3xl font-bold tracking-tightest text-ink-900">
            Let’s add {modelLabel}
          </h1>
        </Reveal>
        <Reveal index={2} className="mt-3">
          <p className="text-ink-500 max-w-md mx-auto text-balance">
            We’ll download it once{sizeGb ? ` — about ${sizeGb} GB` : ""}. After that it
            stays on your computer and runs fully offline.
          </p>
        </Reveal>
        {pullError && (
          <Reveal index={3} className="mt-4">
            <p className="text-amber-600 text-sm">{pullError}</p>
          </Reveal>
        )}
        <Reveal index={3} className="mt-8">
          <button className="btn-primary" onClick={() => selectedModel && pullModel(selectedModel)}>
            <DownloadIcon className="w-4 h-4" />
            Install {modelLabel}
          </button>
        </Reveal>
      </div>
    );
  }

  // --- State D: all set ---
  return (
    <div className="flex flex-col items-center text-center">
      <Reveal index={0}>
        <div className="grid place-items-center w-16 h-16 rounded-xl3 bg-emerald-50 text-emerald-500 animate-pop-in">
          <CheckIcon className="w-8 h-8" />
        </div>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-3xl font-bold tracking-tightest text-ink-900">You’re all set</h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-ink-500 max-w-sm mx-auto text-balance">
          {modelLabel} is installed and ready to run on your machine.
        </p>
      </Reveal>
      <Reveal index={3} className="mt-8">
        <button className="btn-primary" onClick={next}>
          Continue
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </Reveal>
    </div>
  );
}

function EngineNotFound({
  message,
  onRecheck,
}: {
  message?: string;
  onRecheck: () => void;
}) {
  const steps = [
    "Download Ollama from ollama.com — it’s free.",
    "Open the Ollama app so it runs quietly in the background.",
    "Come back here and press “Check again”.",
  ];
  return (
    <div className="flex flex-col items-center text-center">
      <Reveal index={0}>
        <div className="grid place-items-center w-16 h-16 rounded-xl3 bg-sky-50 text-sky-400">
          <CloudIcon className="w-8 h-8" />
        </div>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-3xl font-bold tracking-tightest text-ink-900">
          One quick thing to enable
        </h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-ink-500 max-w-md mx-auto text-balance">
          {message ?? "We couldn’t find the engine that runs the models yet."} It only
          takes a minute to set up.
        </p>
      </Reveal>

      <Reveal index={3} className="mt-8 w-full">
        <div className="glass p-6 text-left space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 grid place-items-center w-7 h-7 rounded-full bg-sky-50 text-sky-600 text-sm font-semibold">
                {i + 1}
              </span>
              <p className="text-sm text-ink-700 pt-0.5">{s}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal index={4} className="mt-8 flex items-center gap-3">
        <a
          className="btn-soft"
          href="https://ollama.com/download"
          target="_blank"
          rel="noreferrer"
        >
          <DownloadIcon className="w-4 h-4" />
          Get Ollama
        </a>
        <button className="btn-primary" onClick={onRecheck}>
          Check again
        </button>
      </Reveal>
    </div>
  );
}

function Installing({ modelLabel }: { modelLabel: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % PULL_MESSAGES.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center text-center">
      <Pulse>
        <DownloadIcon className="w-9 h-9" />
      </Pulse>
      <h2 className="mt-10 text-2xl font-semibold tracking-tight text-ink-900">
        Adding {modelLabel}
      </h2>
      <p key={i} className="mt-2 text-ink-500 animate-fade-in">
        {PULL_MESSAGES[i]}
      </p>
      <div className="mt-6 w-56 h-1.5 rounded-full bg-cloud-200 overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-sky-400 sheen animate-shimmer" />
      </div>
    </div>
  );
}
