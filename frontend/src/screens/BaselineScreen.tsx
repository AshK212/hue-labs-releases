import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { Pulse } from "../components/Pulse";
import { HeroStat, Pill } from "../components/Bits";
import { ArrowRightIcon, GaugeIcon } from "../components/Icons";

export function BaselineScreen() {
  const { baseline, baselinePhase, baselineError, runBaseline, next } = useJourney();

  if (baselinePhase === "loading") {
    return (
      <div className="flex flex-col items-center text-center">
        <Pulse>
          <GaugeIcon className="w-9 h-9" />
        </Pulse>
        <h2 className="mt-10 text-2xl font-semibold tracking-tight text-ink-900">
          Measuring your starting speed
        </h2>
        <p className="mt-2 text-ink-500">Running the same test we’ll use every time…</p>
      </div>
    );
  }

  if (baselinePhase === "done" && baseline) {
    return (
      <div className="flex flex-col items-center text-center">
        <Reveal index={0}>
          <p className="text-sky-600 text-sm font-semibold uppercase tracking-[0.12em]">
            Your starting speed
          </p>
        </Reveal>
        <Reveal index={1} className="mt-8">
          <HeroStat value={baseline.tokens_per_sec.toFixed(1)} unit="tokens per second" />
        </Reveal>
        <Reveal index={2} className="mt-6">
          <Pill tone="neutral">Default settings · {baseline.output_tokens} tokens in {baseline.total_seconds}s</Pill>
        </Reveal>
        <Reveal index={3} className="mt-9">
          <button className="btn-primary" onClick={next}>
            Continue
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </Reveal>
      </div>
    );
  }

  // idle / error
  return (
    <div className="flex flex-col items-center text-center">
      <Reveal index={0}>
        <div className="grid place-items-center w-16 h-16 rounded-xl3 bg-sky-50 text-sky-500">
          <GaugeIcon className="w-8 h-8" />
        </div>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tightest text-ink-900">
          Let’s measure your starting speed
        </h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-ink-500 max-w-md mx-auto text-balance">
          We send the model the same short prompt every time and measure how fast it
          replies. This is a real number, reported by the model itself.
        </p>
      </Reveal>
      {baselineError && (
        <Reveal index={3} className="mt-4">
          <p className="text-amber-600 text-sm">{baselineError}</p>
        </Reveal>
      )}
      <Reveal index={3} className="mt-8">
        <button className="btn-primary" onClick={runBaseline}>
          <GaugeIcon className="w-4 h-4" />
          {baselineError ? "Try again" : "Run the test"}
        </button>
      </Reveal>
    </div>
  );
}
