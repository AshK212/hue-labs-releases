import type { ReactNode } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { Button } from "../components/Button";
import { MetricCard } from "../components/Metric";
import { useCountUp } from "../components/useCountUp";
import { friendlySetting } from "../journey/labels";
import { ArrowUpIcon, CheckIcon, ChipIcon, GpuIcon, SparkIcon } from "../components/Icons";

function changeIcon(label: string): ReactNode {
  const s = label.toLowerCase();
  if (s.includes("graphics") || s.includes("gpu")) return <GpuIcon className="w-[18px] h-[18px]" />;
  if (s.includes("processor") || s.includes("core")) return <ChipIcon className="w-[18px] h-[18px]" />;
  return <SparkIcon className="w-[18px] h-[18px]" />;
}

export function ResultsScreen() {
  const { baseline, optimized, profile, reset } = useJourney();
  const before = baseline?.tokens_per_sec ?? 0;
  const after = optimized?.tokens_per_sec ?? 0;
  const pct = before > 0 ? ((after - before) / before) * 100 : 0;
  // Hook must run unconditionally (before any early return).
  const animatedPct = useCountUp(Math.abs(pct), 1000);

  if (!baseline || !optimized) return null;

  const improved = pct >= 1;
  const aboutSame = Math.abs(pct) < 1;
  const changes = Array.from(new Set((profile?.changed_settings ?? []).map(friendlySetting)));

  return (
    <Column width="results">
      <div className="flex flex-col items-center text-center">
        <Reveal index={0}>
          {improved ? (
            <div className="inline-flex items-center gap-2 text-sage-600">
              <span className="grid place-items-center w-12 h-12 rounded-card bg-sage-50 animate-pop-in">
                <ArrowUpIcon className="w-7 h-7" />
              </span>
              <span className="text-[72px] leading-none font-semibold tracking-tight2 tnum">
                {animatedPct.toFixed(0)}%
              </span>
            </div>
          ) : (
            <span className="text-section font-semibold tracking-tight2 text-ink-900 animate-pop-in">
              {aboutSame ? "About the same" : `${pct.toFixed(0)}%`}
            </span>
          )}
        </Reveal>

        <Reveal index={1} className="mt-3">
          <h1 className="text-cardtitle font-semibold text-ink-900">
            {improved
              ? "Your model is now faster"
              : aboutSame
              ? "Your speed held steady"
              : "Here is the result"}
          </h1>
          <p className="text-caption text-ink-500 mt-1">
            {improved
              ? "Measured on your computer, with the same prompt and model."
              : "That is okay. The gain depends on your machine."}
          </p>
        </Reveal>
      </div>

      <Reveal index={2} className="mt-9">
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Before" value={before.toFixed(1)} unit="tokens/sec" />
          <MetricCard label="After" value={after.toFixed(1)} unit="tokens/sec" tone={improved ? "green" : "blue"} />
        </div>
      </Reveal>

      {changes.length > 0 && (
        <Reveal index={3} className="mt-5">
          <div className="surface p-6">
            <div className="text-caption font-semibold text-ink-900 mb-4">What changed</div>
            <div className="space-y-3">
              {changes.map((c) => (
                <div key={c} className="flex items-center gap-3.5">
                  <span className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-tile bg-sage-50 text-sage-600">
                    {changeIcon(c)}
                  </span>
                  <span className="text-body text-ink-700">{c}</span>
                  <CheckIcon className="w-4 h-4 text-sage-500 ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <Reveal index={4} className="mt-5">
        <p className="text-micro text-ink-400 text-center">
          Same prompt, same model. We only changed the settings.
        </p>
      </Reveal>

      <Reveal index={5} className="mt-8 flex items-center justify-center gap-3">
        <Button variant="ghost" onClick={reset}>
          Start over
        </Button>
        <Button onClick={reset}>Finish</Button>
      </Reveal>
    </Column>
  );
}
