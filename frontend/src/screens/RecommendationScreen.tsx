import { useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { SectionHeader } from "../components/Card";
import { StatusBadge } from "../components/Badge";
import { Button } from "../components/Button";
import { ArrowRightIcon, CheckIcon, DownloadIcon, GaugeIcon, SparkIcon } from "../components/Icons";
import { cleanCopy } from "../journey/labels";
import type { ModelRecommendation } from "../types";

export function RecommendationScreen() {
  const { recommendation, selectedModel, setSelectedModel, next } = useJourney();
  const [showAlt, setShowAlt] = useState(false);
  if (!recommendation) return null;

  const { primary, alternatives } = recommendation;
  const alt = alternatives[0];

  return (
    <Column>
      <Reveal index={0}>
        <SectionHeader
          title={`We suggest ${primary.display_name}`}
          subtitle="A good balance of speed, quality and size for your computer."
        />
      </Reveal>

      <Reveal index={1} className="mt-7">
        <PrimaryCard
          rec={primary}
          selected={selectedModel === primary.model}
          onSelect={() => setSelectedModel(primary.model)}
        />
      </Reveal>

      {alt && (
        <Reveal index={2} className="mt-3">
          {!showAlt ? (
            <button
              className="inline-flex items-center gap-1 text-caption font-medium text-sky-600 hover:text-sky-700 transition-colors"
              onClick={() => setShowAlt(true)}
            >
              Show a smaller model
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <AltCard
              rec={alt}
              selected={selectedModel === alt.model}
              onSelect={() => setSelectedModel(alt.model)}
            />
          )}
        </Reveal>
      )}

      <Reveal index={3} className="mt-9">
        <Button
          onClick={next}
          disabled={!selectedModel}
          rightIcon={<ArrowRightIcon className="w-[18px] h-[18px]" />}
        >
          Continue
        </Button>
      </Reveal>
    </Column>
  );
}

function PrimaryCard({
  rec,
  selected,
  onSelect,
}: {
  rec: ModelRecommendation;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "w-full text-left rounded-card p-7 border transition-all duration-200 surface",
        selected ? "!border-sky-300 ring-2 ring-sky-100 shadow-glowSoft" : "hover:!border-sky-300/60 hover:-translate-y-[2px]",
      ].join(" ")}
    >
      <div className="flex items-start gap-5">
        <div
          className={[
            "flex-shrink-0 grid place-items-center w-14 h-14 rounded-card transition-colors",
            selected ? "bg-sky-500 text-carbon shadow-button" : "bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100",
          ].join(" ")}
        >
          {selected ? <CheckIcon className="w-7 h-7" /> : <SparkIcon className="w-7 h-7" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-cardtitle font-semibold text-ink-900">{rec.display_name}</h3>
            <StatusBadge tone="green">Suggested</StatusBadge>
            {rec.already_installed && <StatusBadge tone="blue">Ready</StatusBadge>}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Fact icon={<DownloadIcon className="w-4 h-4" />} label="Download" value={`${rec.download_size_gb} GB`} />
            <Fact icon={<GaugeIcon className="w-4 h-4" />} label="Estimated speed" value={rec.estimated_tokens_per_sec} />
          </div>

          <div className="mt-4">
            <div className="text-caption font-semibold text-ink-700">Why this model</div>
            <p className="text-caption text-ink-500 mt-1 leading-relaxed">{cleanCopy(rec.reason)}</p>
            <p className="text-micro text-ink-400 mt-2">
              Installs locally and runs offline. The speed above is an estimate, we measure
              the real number next.
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface-quiet px-4 py-3">
      <div className="flex items-center gap-1.5 text-ink-400">
        <span className="text-sky-500">{icon}</span>
        <span className="text-micro font-mono uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-body font-semibold font-mono text-ink-900 mt-1 tnum">{value}</div>
    </div>
  );
}

function AltCard({
  rec,
  selected,
  onSelect,
}: {
  rec: ModelRecommendation;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "w-full text-left rounded-card p-5 border transition-all duration-200 flex items-start gap-4 surface-quiet",
        selected ? "!border-sky-300 ring-2 ring-sky-100" : "hover:!border-sky-300/60",
      ].join(" ")}
    >
      <div
        className={[
          "flex-shrink-0 grid place-items-center w-11 h-11 rounded-tile mt-0.5",
          selected ? "bg-sky-500 text-carbon" : "bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100",
        ].join(" ")}
      >
        {selected ? <CheckIcon className="w-5 h-5" /> : <SparkIcon className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-body font-semibold text-ink-900">{rec.display_name}</h3>
          <StatusBadge tone="neutral">{rec.download_size_gb} GB</StatusBadge>
        </div>
        <p className="text-caption text-ink-500 mt-1.5 leading-relaxed line-clamp-2">{cleanCopy(rec.reason)}</p>
      </div>
    </button>
  );
}
