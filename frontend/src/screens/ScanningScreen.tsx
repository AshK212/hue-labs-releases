import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useJourney } from "../journey/JourneyContext";
import { Column } from "../components/Screen";
import { Button } from "../components/Button";
import { BrandProgressRing } from "../components/BrandKit";
import { CheckIcon, ChipIcon, GpuIcon, MemoryIcon, CloudIcon, Spinner } from "../components/Icons";

const MIN_DWELL_MS = 2600;
const REVEAL_AT = [600, 1200, 1800, 2400];

export function ScanningScreen() {
  const { hardware, ollama, prefetch, prefetchPhase, prefetchError, next } = useJourney();
  const [revealed, setRevealed] = useState(0);
  const [dwellDone, setDwellDone] = useState(false);

  useEffect(() => {
    prefetch();
    const dwell = setTimeout(() => setDwellDone(true), MIN_DWELL_MS);
    const timers = REVEAL_AT.map((ms, i) =>
      setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), ms)
    );
    return () => {
      clearTimeout(dwell);
      timers.forEach(clearTimeout);
    };
  }, [prefetch]);

  useEffect(() => {
    if (prefetchPhase === "done" && dwellDone && revealed >= 4) {
      const t = setTimeout(next, 450);
      return () => clearTimeout(t);
    }
  }, [prefetchPhase, dwellDone, revealed, next]);

  if (prefetchError) {
    return (
      <Column center>
        <h2 className="text-page font-semibold text-ink-900">Something is not responding</h2>
        <p className="text-body text-ink-500 mt-3 mx-auto max-w-[26rem] leading-relaxed">
          The local app that powers this isn't answering yet. Make sure it's running, then
          try again.
        </p>
        <div className="mt-7 flex justify-center">
          <Button onClick={() => prefetch()}>Try again</Button>
        </div>
      </Column>
    );
  }

  const runtimeReady = !!ollama?.running;
  const items = [
    { icon: <ChipIcon className="w-[18px] h-[18px]" />, label: "Processor", value: hardware?.cpu_name },
    {
      icon: <GpuIcon className="w-[18px] h-[18px]" />,
      label: "Graphics",
      value: hardware?.gpus[0]?.name ?? (hardware ? "Built-in graphics" : undefined),
    },
    {
      icon: <MemoryIcon className="w-[18px] h-[18px]" />,
      label: "Memory",
      value: hardware ? `${hardware.memory_total_gb} GB` : undefined,
    },
    {
      icon: <CloudIcon className="w-[18px] h-[18px]" />,
      label: "AI runtime",
      value: hardware ? (runtimeReady ? "Ready" : "We'll set this up next") : undefined,
    },
  ];

  // Honest progress: fraction of scan steps completed (never a fake number).
  const doneCount = items.filter((it, i) => i < revealed && !!it.value).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <Column width="wide">
      <div className="grid lg:grid-cols-[auto_1fr] gap-10 lg:gap-14 items-center">
        {/* Left — scan ring */}
        <div className="flex flex-col items-center text-center mx-auto">
          <BrandProgressRing percent={pct} size={208} stroke={10}>
            <div>
              <div className="text-[40px] leading-none font-semibold font-mono text-ink-900 tnum">
                {pct}
                <span className="text-cardtitle text-ink-400">%</span>
              </div>
              <div className="mt-2 text-micro font-mono uppercase tracking-wider text-sky-600">
                Scanning
              </div>
            </div>
          </BrandProgressRing>
          <h2 className="mt-7 text-cardtitle font-semibold text-ink-900">Reading your computer</h2>
          <p className="mt-1.5 text-caption text-ink-500">This only takes a moment.</p>
        </div>

        {/* Right — detected checklist */}
        <div className="surface p-2.5 divide-y divide-mist-200">
          {items.map((it, i) => {
            const done = i < revealed && !!it.value;
            const current = i === revealed && !done;
            return (
              <div key={it.label} className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={[
                      "grid place-items-center w-9 h-9 rounded-tile transition-colors duration-300 flex-shrink-0",
                      done ? "bg-sage-50 text-sage-500 ring-1 ring-inset ring-sky-100" : "bg-mist-100 text-ink-400",
                    ].join(" ")}
                  >
                    {done ? (
                      <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                        <CheckIcon className="w-5 h-5" />
                      </motion.span>
                    ) : current ? (
                      <Spinner className="w-4 h-4 text-sky-500" />
                    ) : (
                      it.icon
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-micro font-mono uppercase tracking-wide text-ink-400">{it.label}</div>
                    <div className="text-body font-medium text-ink-800 truncate" title={it.value}>
                      {done ? it.value : current ? "Checking…" : "—"}
                    </div>
                  </div>
                </div>
                {done && (
                  <span className="text-micro font-mono uppercase tracking-wide text-sage-500">OK</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Column>
  );
}
