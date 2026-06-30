import { useEffect, useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Column } from "../components/Screen";
import { Pulse } from "../components/Pulse";
import { Button } from "../components/Button";
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

  return (
    <Column>
      <div className="flex flex-col items-center text-center">
        <Pulse>
          <ChipIcon className="w-7 h-7" />
        </Pulse>
        <h2 className="mt-8 text-page font-semibold text-ink-900">Getting to know your computer</h2>
        <p className="mt-2 text-body text-ink-500">This only takes a moment.</p>
      </div>

      <div className="mt-8 surface p-2.5 divide-y divide-mist-200">
        {items.map((it, i) => {
          const done = i < revealed && !!it.value;
          const current = i === revealed && !done;
          return (
            <div key={it.label} className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3.5">
                <span
                  className={[
                    "grid place-items-center w-9 h-9 rounded-tile transition-colors duration-300",
                    done ? "bg-sage-50 text-sage-600" : "bg-mist-100 text-ink-400",
                  ].join(" ")}
                >
                  {done ? (
                    <span className="animate-check-pop">
                      <CheckIcon className="w-5 h-5" />
                    </span>
                  ) : current ? (
                    <Spinner className="w-4 h-4 text-sky-500" />
                  ) : (
                    it.icon
                  )}
                </span>
                <span className="text-body font-medium text-ink-700">
                  {done ? `${it.label} detected` : current ? `Checking ${it.label.toLowerCase()}` : it.label}
                </span>
              </div>
              <span
                className={[
                  "text-caption text-ink-500 max-w-[48%] truncate transition-opacity duration-500",
                  done ? "opacity-100" : "opacity-0",
                ].join(" ")}
                title={it.value}
              >
                {it.value}
              </span>
            </div>
          );
        })}
      </div>
    </Column>
  );
}
