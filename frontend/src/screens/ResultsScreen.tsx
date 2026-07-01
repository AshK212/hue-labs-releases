import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { Button } from "../components/Button";
import { MetricCard } from "../components/Metric";
import { StatusBadge } from "../components/Badge";
import { TechnicalDetails } from "../components/TechnicalDetails";
import { useCountUp } from "../components/useCountUp";
import { friendlySetting } from "../journey/labels";
import { ArrowRightIcon, ArrowUpIcon, CheckIcon, ChipIcon, GpuIcon, SparkIcon } from "../components/Icons";

function changeIcon(label: string): ReactNode {
  const s = label.toLowerCase();
  if (s.includes("graphics") || s.includes("gpu")) return <GpuIcon className="w-[18px] h-[18px]" />;
  if (s.includes("processor") || s.includes("core")) return <ChipIcon className="w-[18px] h-[18px]" />;
  return <SparkIcon className="w-[18px] h-[18px]" />;
}

export function ResultsScreen() {
  const { baseline, optimized, profile, reset, openDashboard } = useJourney();
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
      <div className="relative flex flex-col items-center text-center">
        {/* Elegant celebration glow behind the headline figure */}
        <div
          aria-hidden
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-[420px] h-[280px] blur-3xl animate-breathe pointer-events-none"
          style={{
            background: improved
              ? "radial-gradient(50% 50% at 50% 50%, rgba(184,242,92,0.22), rgba(184,242,92,0) 70%)"
              : "radial-gradient(50% 50% at 50% 50%, rgba(135,140,137,0.14), rgba(135,140,137,0) 70%)",
          }}
        />
        <Reveal index={0} className="relative">
          {improved ? (
            <div className="inline-flex items-center gap-3 text-sage-600">
              <span className="relative grid place-items-center w-16 h-16 animate-pop-in">
                {/* success ring that draws itself in */}
                <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="29" fill="none" stroke="#282B2E" strokeWidth="2.5" />
                  <motion.circle
                    cx="32" cy="32" r="29" fill="none" stroke="#B8F25C" strokeWidth="2.5" strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                    style={{ filter: "drop-shadow(0 0 6px rgba(184,242,92,0.5))" }}
                  />
                </svg>
                <span className="grid place-items-center w-11 h-11 rounded-full bg-sage-50 text-sage-500">
                  <ArrowUpIcon className="w-6 h-6" />
                </span>
              </span>
              <span className="text-[88px] leading-none font-semibold font-mono tracking-tight2 tnum">
                {animatedPct.toFixed(0)}%
              </span>
            </div>
          ) : (
            <span className="text-[56px] leading-none font-semibold tracking-tight2 text-ink-900 animate-pop-in">
              {aboutSame ? "About the same" : `${pct.toFixed(0)}%`}
            </span>
          )}
        </Reveal>

        <Reveal index={1} className="mt-5">
          <h1 className="text-section font-semibold text-ink-900">
            {improved
              ? "Your model is now faster"
              : aboutSame
              ? "Your speed held steady"
              : "Here is the result"}
          </h1>
          <p className="text-body text-ink-500 mt-2">
            {improved
              ? "Measured on your computer, with the same prompt and model."
              : "That is okay. The gain depends on your machine."}
          </p>
        </Reveal>
      </div>

      <Reveal index={2} className="mt-10">
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Before" value={before.toFixed(1)} unit="tokens/sec" />
          <MetricCard label="After" value={after.toFixed(1)} unit="tokens/sec" tone={improved ? "green" : "blue"} />
        </div>
        {improved && (
          <p className="text-caption font-mono text-sage-600 font-medium text-center mt-3">
            +{(after - before).toFixed(1)} tokens/sec faster than before
          </p>
        )}
        <div className="flex justify-center mt-4">
          <StatusBadge tone="soft" dot>
            <span className="font-mono uppercase tracking-wide">Measured on this machine</span>
          </StatusBadge>
        </div>
      </Reveal>

      {changes.length > 0 && (
        <Reveal index={3} className="mt-5">
          <div className="surface p-6">
            <div className="text-caption font-semibold text-ink-900 mb-4">What changed</div>
            <div className="space-y-3">
              {changes.map((c) => (
                <div key={c} className="flex items-center gap-3.5">
                  <span className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-tile bg-sage-50 text-sage-500 ring-1 ring-inset ring-sky-100">
                    {changeIcon(c)}
                  </span>
                  <span className="text-body text-ink-700">{c}</span>
                  <CheckIcon className="w-4 h-4 text-sage-500 ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
            {profile?.options && (
              <div className="mt-4">
                <TechnicalDetails options={profile.options} />
              </div>
            )}
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
        <Button onClick={openDashboard} rightIcon={<ArrowRightIcon className="w-5 h-5" />}>
          Go to dashboard
        </Button>
      </Reveal>
    </Column>
  );
}
