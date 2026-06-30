import { useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { Pill } from "../components/Bits";
import { ArrowRightIcon, CheckIcon, SparkIcon } from "../components/Icons";
import type { ModelRecommendation } from "../types";

export function RecommendationScreen() {
  const { recommendation, selectedModel, setSelectedModel, next } = useJourney();
  const [showAlt, setShowAlt] = useState(false);
  if (!recommendation) return null;

  const { primary, alternatives } = recommendation;
  const alt = alternatives[0];

  return (
    <div>
      <Reveal index={0}>
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight2 text-ink-900">
          We suggest {primary.display_name}
        </h1>
      </Reveal>

      <Reveal index={1} className="mt-3">
        <p className="text-[17px] leading-relaxed text-ink-500 max-w-[28rem]">
          It runs well on a computer like yours. You can switch to a smaller one if you
          prefer.
        </p>
      </Reveal>

      <Reveal index={2} className="mt-7">
        <ModelCard
          rec={primary}
          recommended
          selected={selectedModel === primary.model}
          onSelect={() => setSelectedModel(primary.model)}
        />
      </Reveal>

      {alt && (
        <Reveal index={3} className="mt-3">
          {!showAlt ? (
            <button
              className="text-[14px] text-ink-400 hover:text-ink-700 transition-colors"
              onClick={() => setShowAlt(true)}
            >
              Show a smaller model
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
          Continue
          <ArrowRightIcon className="w-[18px] h-[18px]" />
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
        "w-full text-left rounded-card p-5 transition-all duration-200",
        selected
          ? "bg-white shadow-card ring-1 ring-sky-200"
          : "bg-white/60 shadow-tile hover:bg-white/80",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            "flex-shrink-0 grid place-items-center w-10 h-10 rounded-tile transition-colors",
            selected ? "bg-sky-500 text-white" : "bg-sky-50 text-sky-500",
          ].join(" ")}
        >
          {selected ? <CheckIcon className="w-5 h-5" /> : <SparkIcon className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-ink-900">{rec.display_name}</h3>
            {recommended && <Pill tone="good">Suggested</Pill>}
            {rec.already_installed ? (
              <Pill tone="info">Ready</Pill>
            ) : (
              <Pill tone="neutral">{rec.download_size_gb} GB</Pill>
            )}
          </div>
          <p className="text-[14px] text-ink-500 mt-1.5 leading-relaxed">{rec.reason}</p>
          <p className="text-[13px] text-ink-400 mt-2">
            Around {rec.estimated_tokens_per_sec}. This is just an estimate. We measure the
            real speed in a moment.
          </p>
        </div>
      </div>
    </button>
  );
}
