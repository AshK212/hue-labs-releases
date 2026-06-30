import { useEffect, useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Column } from "../components/Screen";
import { Pulse } from "../components/Pulse";
import { CheckIcon, ChipIcon, Spinner } from "../components/Icons";

const MIN_DWELL_MS = 2400;
const REVEAL_AT = [600, 1200, 1800]; // when each check turns green

export function ScanningScreen() {
  const { hardware, prefetch, prefetchPhase, prefetchError, next } = useJourney();
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
    if (prefetchPhase === "done" && dwellDone && revealed >= 3) {
      const t = setTimeout(next, 400);
      return () => clearTimeout(t);
    }
  }, [prefetchPhase, dwellDone, revealed, next]);

  if (prefetchError) {
    return (
      <Column>
        <h2 className="text-[26px] font-semibold tracking-tight2 text-ink-900">
          Something is not responding
        </h2>
        <p className="text-ink-500 mt-3 max-w-[26rem] leading-relaxed">
          The local app that powers this isn't answering yet. Make sure it's running,
          then try again.
        </p>
        <button className="btn-primary mt-7" onClick={() => prefetch()}>
          Try again
        </button>
      </Column>
    );
  }

  const checks = [
    { label: "Processor", value: hardware?.cpu_name },
    { label: "Memory", value: hardware ? `${hardware.memory_total_gb} GB` : undefined },
    { label: "Graphics", value: hardware?.gpus[0]?.name ?? (hardware ? "Built-in graphics" : undefined) },
  ];

  return (
    <Column>
      <div className="flex flex-col items-center text-center">
        <Pulse>
          <ChipIcon className="w-7 h-7" />
        </Pulse>
        <h2 className="mt-8 text-[26px] font-semibold tracking-tight2 text-ink-900">
          Getting to know your computer
        </h2>
        <p className="mt-2 text-ink-500">Checking your processor, memory and graphics.</p>
      </div>

      <div className="mt-8 card p-2 divide-y divide-mist-200">
        {checks.map((c, i) => {
          const done = i < revealed && !!c.value;
          return (
            <div key={c.label} className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span
                  className={[
                    "grid place-items-center w-6 h-6 rounded-full transition-colors",
                    done ? "bg-sage-50 text-sage-600" : "bg-mist-100 text-ink-300",
                  ].join(" ")}
                >
                  {done ? <CheckIcon className="w-4 h-4" /> : <Spinner className="w-3.5 h-3.5" />}
                </span>
                <span className="text-[15px] font-medium text-ink-700">{c.label}</span>
              </div>
              <span
                className={[
                  "text-[14px] text-ink-500 max-w-[55%] truncate transition-opacity duration-500",
                  done ? "opacity-100" : "opacity-0",
                ].join(" ")}
                title={c.value}
              >
                {c.value}
              </span>
            </div>
          );
        })}
      </div>
    </Column>
  );
}
