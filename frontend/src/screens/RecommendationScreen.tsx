import { useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { Pill } from "../components/Bits";
import { ArrowRightIcon, CheckIcon, GaugeIcon, SparkIcon } from "../components/Icons";
import type { ModelRecommendation } from "../types";

export function RecommendationScreen() {
  const { recommendation, selectedModel, setSelectedModel, next } = useJourney();
  const [showAlt, setShowAlt] = useState(false);
  if (!recommendation) return null;

  const { primary, alternatives } = recommendation;
  const alt = alternatives[0];

  return (
    <div className="flex flex-col items-center text-center">
      <Reveal index={0}>
        <p className="text-sky-600 text-sm font-semibold uppercase tracking-[0.12em]">
          Our recommendation
        </p>
      </Reveal>

      <Reveal index={1} className="mt-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tightest text-ink-900">
          We recommend {primary.display_name}
        </h1>
      </Reveal>

      <Reveal index={2} className="mt-8 w-full">
        <ModelCard
          rec={primary}
          recommended
          selected={selectedModel === primary.model}
          onSelect={() => setSelectedModel(primary.model)}
        />
      </Reveal>

      {alt && (
        <Reveal index={3} className="mt-4 w-full">
          {!showAlt ? (
            <button
              className="text-sm text-ink-400 hover:text-ink-700 transition-colors"
              onClick={() => setShowAlt(true)}
            >
              or choose a lighter model
            </button>
          ) : (
            <ModelCard
              rec={alt}
              selected={selectedModel === alt.model}
              onSelect={() => setSelectedModel(alt.model)}
            />
          )}
        </Reveal>
      )}

      <Reveal index={4} className="mt-9">
        <button className="btn-primary" onClick={next} disabled={!selectedModel}>
          Use this model
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </Reveal>
    </div>
  );
}

function ModelCard({
  rec,
  recommended,
  selected,
  onSelect,
}: {
  rec: ModelRecommendation;
  recommended?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "w-full text-left rounded-xl2 p-5 transition-all duration-200 border",
        selected
          ? "bg-white/80 border-sky-300 shadow-soft ring-1 ring-sky-200"
          : "bg-white/50 border-white/70 hover:border-sky-200 hover:bg-white/70",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            "flex-shrink-0 grid place-items-center w-11 h-11 rounded-xl2 transition-colors",
            selected ? "bg-sky-500 text-white" : "bg-sky-50 text-sky-500",
          ].join(" ")}
        >
          {selected ? <CheckIcon className="w-6 h-6" /> : <SparkIcon className="w-6 h-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-ink-900">{rec.display_name}</h3>
            {recommended && <Pill tone="good">Best fit</Pill>}
            {rec.already_installed ? (
              <Pill tone="info">Ready</Pill>
            ) : (
              <Pill tone="neutral">{rec.download_size_gb} GB</Pill>
            )}
          </div>
          <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{rec.reason}</p>
          <p className="text-xs text-ink-400 mt-2 inline-flex items-center gap-1.5">
            <GaugeIcon className="w-3.5 h-3.5" />
            Around {rec.estimated_tokens_per_sec} · a rough estimate, your benchmark is the
            real number
          </p>
        </div>
      </div>
    </button>
  );
}
