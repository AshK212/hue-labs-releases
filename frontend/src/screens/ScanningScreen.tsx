import { useEffect, useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Pulse } from "../components/Pulse";
import { ChipIcon } from "../components/Icons";

const MESSAGES = [
  "Getting to know your computer…",
  "Checking memory and graphics…",
  "Looking for the best model for you…",
];

const MIN_DWELL_MS = 2200; // let the moment breathe before advancing

export function ScanningScreen() {
  const { prefetch, prefetchPhase, prefetchError, next } = useJourney();
  const [msgIndex, setMsgIndex] = useState(0);
  const [dwellDone, setDwellDone] = useState(false);

  // Kick off the prefetch + the rotating copy + the minimum dwell timer once.
  useEffect(() => {
    prefetch();
    const dwell = setTimeout(() => setDwellDone(true), MIN_DWELL_MS);
    const rotate = setInterval(
      () => setMsgIndex((i) => (i + 1) % MESSAGES.length),
      1400
    );
    return () => {
      clearTimeout(dwell);
      clearInterval(rotate);
    };
  }, [prefetch]);

  // Advance only when the data is ready AND the dwell has elapsed.
  useEffect(() => {
    if (prefetchPhase === "done" && dwellDone) {
      const t = setTimeout(next, 350);
      return () => clearTimeout(t);
    }
  }, [prefetchPhase, dwellDone, next]);

  if (prefetchError) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="glass px-8 py-7 max-w-sm">
          <h2 className="text-xl font-semibold text-ink-900">We can’t reach the app service</h2>
          <p className="text-ink-500 mt-2 text-sm">
            The local helper that powers this app isn’t responding. Make sure it’s
            running, then try again.
          </p>
          <button className="btn-primary mt-6" onClick={() => prefetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <Pulse>
        <ChipIcon className="w-9 h-9" />
      </Pulse>
      <h2 className="mt-10 text-2xl font-semibold tracking-tight text-ink-900">
        Setting things up
      </h2>
      <p key={msgIndex} className="mt-2 text-ink-500 animate-fade-in">
        {MESSAGES[msgIndex]}
      </p>
    </div>
  );
}
