import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { Button } from "../components/Button";
import { MetricCard } from "../components/Metric";
import { TechnicalDetails } from "../components/TechnicalDetails";
import { useCountUp } from "../components/useCountUp";
import { friendlySetting } from "../journey/labels";
import { ArrowRightIcon, ArrowUpIcon, CheckIcon, ChipIcon, GpuIcon, SparkIcon } from "../components/Icons";
import {
  ResultCard,
  buildResultCardData,
  copyToClipboard,
  defaultFileName,
  savePNG,
  shareToX,
} from "../features/result-card";
import type { BenchmarkResult, HardwareInfo, OptimizationRun } from "../types";

function changeIcon(label: string): ReactNode {
  const s = label.toLowerCase();
  if (s.includes("graphics") || s.includes("gpu")) return <GpuIcon className="w-[18px] h-[18px]" />;
  if (s.includes("processor") || s.includes("core")) return <ChipIcon className="w-[18px] h-[18px]" />;
  return <SparkIcon className="w-[18px] h-[18px]" />;
}

/**
 * Adapt the Milestone 1 completion data (baseline/optimized runs) into an
 * OptimizationRun shape so the shared ResultCardBuilder can consume it.
 *
 * The Measured Optimization Engine isn't wired to a UI endpoint yet, so this is
 * a thin, honest mapping — no fabricated numbers. There is a "winner" only when
 * the optimized run was actually faster; otherwise winner is null and the card
 * shows "No measured gain". The optimization score is unknown here (Milestone 1
 * doesn't produce one), so it stays null → the card renders "—".
 */
function toOptimizationRun(args: {
  hardware: HardwareInfo | null;
  model: string;
  baseline: BenchmarkResult;
  optimized: BenchmarkResult;
}): OptimizationRun {
  const { hardware, model, baseline, optimized } = args;
  const before = baseline.tokens_per_sec;
  const after = optimized.tokens_per_sec;
  const gainPercent = before > 0 ? ((after - before) / before) * 100 : 0;
  const hasGain = gainPercent >= 1; // same threshold the page uses for "improved"

  return {
    baseline_result: { tokens_per_sec: before },
    candidate_results: [{ candidate_id: "optimized", tokens_per_sec: after }],
    winner: hasGain ? { candidate_id: "optimized", total_score: null } : null,
    recommendation: null,
    model: { name: model },
    hardware,
    app: { version: null },
    timing: { completed_at: optimized.created_at, started_at: baseline.created_at },
  } as unknown as OptimizationRun;
}

type BusyAction = "export" | "copy" | "share" | null;
type Notice = { tone: "ok" | "error"; text: string } | null;

export function ResultsScreen() {
  const { baseline, optimized, profile, reset, openDashboard, hardware, selectedModel } = useJourney();
  const before = baseline?.tokens_per_sec ?? 0;
  const after = optimized?.tokens_per_sec ?? 0;
  const pct = before > 0 ? ((after - before) / before) * 100 : 0;
  // Hooks must run unconditionally (before any early return).
  const animatedPct = useCountUp(Math.abs(pct), 1000);
  const cardRef = useRef<HTMLDivElement>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [notice, setNotice] = useState<Notice>(null);

  if (!baseline || !optimized) return null;

  const improved = pct >= 1;
  const aboutSame = Math.abs(pct) < 1;
  const changes = Array.from(new Set((profile?.changed_settings ?? []).map(friendlySetting)));

  // Presentation-only card data (built from the run adapter above).
  const run = toOptimizationRun({ hardware, model: selectedModel ?? "", baseline, optimized });
  const cardData = buildResultCardData(run);
  const busy = busyAction !== null;

  // One place for the "disable while running + friendly error, never fail silently" flow.
  async function runAction(name: Exclude<BusyAction, null>, action: () => Promise<void>) {
    if (busy) return;
    setBusyAction(name);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      const message = (e as Error)?.message || "Something went wrong. Please try again.";
      setNotice({ tone: "error", text: message });
    } finally {
      setBusyAction(null);
    }
  }

  const onExport = () =>
    runAction("export", async () => {
      const node = cardRef.current;
      if (!node) throw new Error("The card isn't ready yet — try again in a moment.");
      await savePNG(node, defaultFileName(cardData));
      setNotice({ tone: "ok", text: "Saved as PNG." });
    });

  const onCopy = () =>
    runAction("copy", async () => {
      const node = cardRef.current;
      if (!node) throw new Error("The card isn't ready yet — try again in a moment.");
      await copyToClipboard(node);
      setNotice({ tone: "ok", text: "Card copied to clipboard." });
    });

  const onShareX = () =>
    runAction("share", async () => {
      shareToX(cardData);
      setNotice({ tone: "ok", text: "Opening X…" });
    });

  return (
    <Column width="results">
      <div className="relative flex flex-col items-center text-center">
        {/* Elegant celebration glow behind the headline figure */}
        <div
          aria-hidden
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-[420px] h-[280px] blur-3xl animate-breathe pointer-events-none"
          style={{
            background: improved
              ? "radial-gradient(50% 50% at 50% 50%, rgb(var(--glow)/0.22), rgb(var(--glow)/0) 70%)"
              : "radial-gradient(50% 50% at 50% 50%, rgba(135,140,137,0.14), rgba(135,140,137,0) 70%)",
          }}
        />
        <Reveal index={0} className="relative">
          {improved ? (
            <div className="inline-flex items-center gap-3 text-sage-600">
              <span className="relative grid place-items-center w-16 h-16 animate-pop-in">
                {/* success ring that draws itself in */}
                <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="29" fill="none" stroke="rgb(var(--m200))" strokeWidth="2.5" />
                  <motion.circle
                    cx="32" cy="32" r="29" fill="none" stroke="rgb(var(--a500))" strokeWidth="2.5" strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                    style={{ filter: "drop-shadow(0 0 6px rgb(var(--glow)/0.5))" }}
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
              ? "Measured on this machine. Same prompt, same model."
              : "That is okay. The gain depends on your machine."}
          </p>
        </Reveal>
      </div>

      {/* Before → After comparison, read as one connected measurement */}
      <Reveal index={2} className="mt-9">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-4">
          <MetricCard label="Before" value={before.toFixed(1)} unit="tokens/sec" />
          <div className={`grid place-items-center w-9 h-9 rounded-full border ${improved ? "bg-sage-50 border-sky-100 text-sage-500" : "bg-mist-100 border-mist-200 text-ink-400"}`}>
            <ArrowRightIcon className="w-4 h-4" />
          </div>
          <MetricCard label="After" value={after.toFixed(1)} unit="tokens/sec" tone={improved ? "green" : "blue"} />
        </div>
        {improved && (
          <p className="text-caption font-mono text-sage-600 font-medium text-center mt-3.5">
            +{(after - before).toFixed(1)} tokens/sec faster
          </p>
        )}
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

      {/* Shareable result card — sits below the existing summary, never replaces it. */}
      <Reveal index={4} className="mt-8">
        <div className="text-caption font-semibold text-ink-900 mb-4 text-center">Share your result</div>
        <div className="flex justify-center">
          <ResultCard ref={cardRef} data={cardData} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" onClick={onExport} loading={busyAction === "export"} disabled={busy}>
            Export PNG
          </Button>
          <Button variant="secondary" onClick={onCopy} loading={busyAction === "copy"} disabled={busy}>
            Copy card
          </Button>
          <Button variant="secondary" onClick={onShareX} loading={busyAction === "share"} disabled={busy}>
            Share on X
          </Button>
        </div>
        {notice && (
          <p
            className="text-caption text-center mt-3"
            style={{ color: notice.tone === "error" ? "#E5646A" : "rgb(var(--a500))" }}
            role="status"
          >
            {notice.text}
          </p>
        )}
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
