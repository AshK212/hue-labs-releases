import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { Button } from "../components/Button";
import { MetricCard } from "../components/Metric";
import { TechnicalDetails } from "../components/TechnicalDetails";
import { useCountUp } from "../components/useCountUp";
import { friendlySetting } from "../journey/labels";
import { FLOW_STEPS, STEP } from "../journey/steps";
import { ArrowRightIcon, ArrowUpIcon, CheckIcon, ChipIcon, GpuIcon, SparkIcon } from "../components/Icons";
import { Copy, Download, Share2 } from "lucide-react";
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

// Final-step label ("Step 07 / 07"), computed from the flow — not hardcoded.
const STEP_INDEX = FLOW_STEPS.findIndex((f) => f.step === STEP.Results);
const STEP_LABEL = `Step ${String(STEP_INDEX + 1).padStart(2, "0")} / ${String(
  FLOW_STEPS.length
).padStart(2, "0")}`;

// The share card renders at its true width for export, but is shown as a smaller
// preview so the whole screen fits without scrolling. We scale it to a fixed
// target height (regardless of the card's natural height), then reserve exactly
// that much layout space. The exporter reads the card's real (untransformed)
// size, so PNG output stays full resolution.
const CARD_WIDTH = 540;
const PREVIEW_MIN_SCALE = 0.5;
const PREVIEW_MAX_SCALE = 0.82;
const PREVIEW_DEFAULT_SCALE = 0.66; // used for the first paint, before measuring
// The on-screen preview height adapts to the window: larger on a 1080p display
// (the card is a headline element), gently smaller on short laptops — so the
// whole result always fits without scrolling.
const PREVIEW_MIN_H = 300;
const PREVIEW_MAX_H = 400;

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
  // Measured natural height of the card, so the scaled preview reserves the
  // right amount of vertical space (transforms don't affect layout on their own).
  const [cardHeight, setCardHeight] = useState(0);
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 900
  );
  useLayoutEffect(() => {
    const measure = () => {
      setCardHeight(cardRef.current?.offsetHeight ?? 0);
      setViewportH(window.innerHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [before, after, selectedModel]);

  if (!baseline || !optimized) return null;

  const improved = pct >= 1;
  const aboutSame = Math.abs(pct) < 1;
  const changes = Array.from(new Set((profile?.changed_settings ?? []).map(friendlySetting)));

  // Presentation-only card data (built from the run adapter above).
  const run = toOptimizationRun({ hardware, model: selectedModel ?? "", baseline, optimized });
  const cardData = buildResultCardData(run);
  const busy = busyAction !== null;

  // Scale the card to a window-aware target height so the whole page fits at
  // 1080p (larger card) and on shorter laptops (gently smaller) — never scrolling.
  const targetPreviewH = Math.max(
    PREVIEW_MIN_H,
    Math.min(PREVIEW_MAX_H, Math.round((viewportH - 148) * 0.42))
  );
  const previewScale =
    cardHeight > 0
      ? Math.min(PREVIEW_MAX_SCALE, Math.max(PREVIEW_MIN_SCALE, targetPreviewH / cardHeight))
      : PREVIEW_DEFAULT_SCALE;
  const previewWidth = Math.round(CARD_WIDTH * previewScale);
  const previewHeight = cardHeight ? Math.round(cardHeight * previewScale) : undefined;

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

  // --- Reusable blocks ----------------------------------------------------

  const beforeAfter = (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3.5">
        <MetricCard label="Before" value={before.toFixed(1)} unit="tokens/sec" />
        <div className={`grid place-items-center w-9 h-9 rounded-full border ${improved ? "bg-sage-50 border-sky-100 text-sage-500" : "bg-mist-100 border-mist-200 text-ink-400"}`}>
          <ArrowRightIcon className="w-4 h-4" />
        </div>
        <MetricCard label="After" value={after.toFixed(1)} unit="tokens/sec" tone={improved ? "green" : "blue"} />
      </div>
      {improved && (
        <p className="text-caption font-mono text-sage-600 font-medium text-center mt-3">
          +{(after - before).toFixed(1)} tokens/sec faster
        </p>
      )}
    </div>
  );

  const whatChanged = changes.length > 0 && (
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
  );

  // "Share your result": a compact, fully-visible preview of the real card node
  // (scaled for display; exported at full resolution).
  const shareBlock = (
    <div className="min-w-0 flex flex-col items-center">
      <div className="text-caption font-semibold text-ink-900 mb-3">Share your result</div>
      <div
        className="relative overflow-hidden rounded-[24px] shadow-[0_18px_50px_-28px_rgba(0,0,0,0.75)] ring-1 ring-white/5"
        style={{ width: previewWidth, height: previewHeight }}
      >
        <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: CARD_WIDTH }}>
          <ResultCard ref={cardRef} data={cardData} style={{ width: CARD_WIDTH, maxWidth: CARD_WIDTH }} />
        </div>
      </div>
    </div>
  );

  // Share actions as one clean, full-width row (never wraps the card column).
  const shareActions = (
    <div className="flex flex-col items-center">
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button variant="secondary" onClick={onExport} loading={busyAction === "export"} disabled={busy} leftIcon={<Download className="w-[18px] h-[18px]" strokeWidth={1.9} />}>
          Export PNG
        </Button>
        <Button variant="secondary" onClick={onCopy} loading={busyAction === "copy"} disabled={busy} leftIcon={<Copy className="w-[18px] h-[18px]" strokeWidth={1.9} />}>
          Copy card
        </Button>
        <Button variant="secondary" onClick={onShareX} loading={busyAction === "share"} disabled={busy} leftIcon={<Share2 className="w-[18px] h-[18px]" strokeWidth={1.9} />}>
          Share on X
        </Button>
      </div>
      {notice && (
        <p
          className="text-caption mt-3 text-center"
          style={{ color: notice.tone === "error" ? "#E5646A" : "rgb(var(--a500))" }}
          role="status"
        >
          {notice.text}
        </p>
      )}
    </div>
  );

  return (
    // Full-height stage under the fixed 84px top bar (and the 4rem stage bottom
    // padding). The scroll region is full-width, so if it ever scrolls the bar
    // sits at the window edge (not mid-page); the content stays centered.
    <div className="w-full h-[calc(var(--vph)-148px)] flex flex-col">
      {/* Scrollable content — vertically centered when it fits, scrolls when not. */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full flex flex-col">
          <div className="m-auto w-full max-w-[64rem] px-1 py-6">
            {/* Hero — a calm completion headline; the measured % is supporting. */}
            <div className="relative flex flex-col items-center text-center">
              <div
                aria-hidden
                className="absolute -top-8 left-1/2 -translate-x-1/2 w-[460px] h-[220px] blur-3xl animate-breathe pointer-events-none"
                style={{
                  background: improved
                    ? "radial-gradient(50% 50% at 50% 50%, rgb(var(--glow)/0.2), rgb(var(--glow)/0) 70%)"
                    : "radial-gradient(50% 50% at 50% 50%, rgba(135,140,137,0.12), rgba(135,140,137,0) 70%)",
                }}
              />
              <Reveal index={0} className="relative">
                <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-sage-50 text-sage-500 ring-1 ring-inset ring-sky-100 animate-pop-in">
                  {improved ? <ArrowUpIcon className="w-5 h-5" /> : <CheckIcon className="w-5 h-5" />}
                </span>
              </Reveal>

              <Reveal index={1} className="mt-4">
                <h1 className="text-[34px] sm:text-[40px] leading-tight font-semibold tracking-tight2 text-ink-900">
                  Optimization complete
                </h1>
                <p className="text-body text-ink-500 mt-2.5 max-w-[34rem] mx-auto">
                  {improved
                    ? `Your model now runs about ${animatedPct.toFixed(0)}% faster on this machine, measured on the same prompt.`
                    : aboutSame
                    ? "Your speed held steady — about the same on this machine. That's a solid baseline."
                    : `Measured ${pct.toFixed(0)}% on this machine. The gain depends on your hardware.`}
                </p>
              </Reveal>
            </div>

            {/* Balanced two-column body on wide desktop; stacked on narrow.
                Left = measurement + what changed, Right = shareable card. */}
            <Reveal index={2} className="mt-8">
              {changes.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                  <div className="min-w-0 space-y-5">
                    {beforeAfter}
                    {whatChanged}
                  </div>
                  {shareBlock}
                </div>
              ) : (
                <div className="mx-auto w-full max-w-[34rem] space-y-6">
                  {beforeAfter}
                  {shareBlock}
                </div>
              )}
            </Reveal>

            {/* Share actions — one clean row spanning the content width. */}
            <Reveal index={3} className="mt-6">
              {shareActions}
            </Reveal>
          </div>
        </div>
      </div>

      {/* Sticky footer navigation — always visible, never scrolls away. */}
      <div className="w-full max-w-[64rem] mx-auto shrink-0 flex items-center justify-between gap-4 pt-5 mt-1 border-t border-mist-200/70">
        <Button variant="ghost" onClick={reset}>
          Start over
        </Button>
        <span className="hidden sm:block text-micro font-mono uppercase tracking-wider text-ink-400">
          {STEP_LABEL}
        </span>
        <Button onClick={openDashboard} rightIcon={<ArrowRightIcon className="w-5 h-5" />}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
