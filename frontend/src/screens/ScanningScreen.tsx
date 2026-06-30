import { useEffect, useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Pulse } from "../components/Pulse";
import { ChipIcon } from "../components/Icons";

const MESSAGES = [
  "Checking your processor and memory",
  "Looking at your graphics",
  "Finding a model that fits",
];

const MIN_DWELL_MS = 2200; // let the moment settle before moving on

export function ScanningScreen() {
  const { prefetch, prefetchPhase, prefetchError, next } = useJourney();
  const [msgIndex, setMsgIndex] = useState(0);
  const [dwellDone, setDwellDone] = useState(false);

  useEffect(() => {
    prefetch();
    const dwell = setTimeout(() => setDwellDone(true), MIN_DWELL_MS);
    const rotate = setInterval(
      () => setMsgIndex((i) => (i + 1) % MESSAGES.length),
      1500
    );
    return () => {
      clearTimeout(dwell);
      clearInterval(rotate);
    };
  }, [prefetch]);

  useEffect(() => {
    if (prefetchPhase === "done" && dwellDone) {
      const t = setTimeout(next, 350);
      return () => clearTimeout(t);
    }
  }, [prefetchPhase, dwellDone, next]);

  if (prefetchError) {
    return (
      <div>
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
      </div>
    );
  }

  return (
    <div>
      <Pulse>
        <ChipIcon className="w-7 h-7" />
      </Pulse>
      <h2 className="mt-9 text-[26px] font-semibold tracking-tight2 text-ink-900">
        Getting to know your computer
      </h2>
      <p key={msgIndex} className="mt-2.5 text-ink-500 animate-fade-in">
        {MESSAGES[msgIndex]}
      </p>
    </div>
  );
}
