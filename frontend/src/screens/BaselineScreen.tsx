import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { Button } from "../components/Button";
import { RunningStages } from "../components/RunningStages";
import { HeroNumber } from "../components/Metric";
import { Note } from "../components/Bits";
import { Spot } from "../components/Spot";
import { StatusBadge } from "../components/Badge";
import { ArrowRightIcon, GaugeIcon } from "../components/Icons";

/** A friendly descriptor for a measured speed (derived from the real number). */
function performanceLabel(tps: number): string {
  if (tps >= 60) return "Very fast";
  if (tps >= 30) return "Fast";
  if (tps >= 15) return "Comfortable";
  return "Steady";
}

export function BaselineScreen() {
  const { baseline, baselinePhase, baselineError, runBaseline, next } = useJourney();

  if (baselinePhase === "loading") {
    return (
      <Column>
        <RunningStages title="Measuring your speed" icon={<GaugeIcon className="w-7 h-7" />} />
      </Column>
    );
  }

  if (baselinePhase === "done" && baseline) {
    const perf = performanceLabel(baseline.tokens_per_sec);
    return (
      <Column>
        <div className="flex flex-col items-center text-center">
          <Reveal index={0}>
            <p className="text-body text-ink-500">Your speed right now</p>
          </Reveal>
          <Reveal index={1} className="mt-4">
            <HeroNumber value={baseline.tokens_per_sec} unit="tokens per second" />
          </Reveal>
          <Reveal index={2} className="mt-5">
            <StatusBadge tone="green" dot>
              {perf}
            </StatusBadge>
          </Reveal>
          <Reveal index={3} className="mt-4">
            <p className="text-micro font-mono uppercase tracking-wide text-ink-400">
              Default settings · {baseline.output_tokens} tokens in {baseline.total_seconds}s
            </p>
          </Reveal>
          <Reveal index={4} className="mt-10">
            <Button onClick={next} rightIcon={<ArrowRightIcon className="w-5 h-5" />}>
              Continue
            </Button>
          </Reveal>
        </div>
      </Column>
    );
  }

  // Intro
  return (
    <Column>
      <Reveal index={0}>
        <Spot motif="speed" />
      </Reveal>
      <Reveal index={1} className="mt-7">
        <h1 className="text-page font-semibold text-ink-900">Let's measure your speed</h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-body leading-relaxed text-ink-500 max-w-[31rem]">
          We measure how fast your computer responds using the same prompt every time. This
          gives us a fair comparison before and after optimization.
        </p>
      </Reveal>
      <Reveal index={3} className="mt-6">
        <Note>The model reports the real timing, so this number is honest.</Note>
      </Reveal>
      {baselineError && (
        <Reveal index={4} className="mt-4">
          <p className="text-caption text-sky-600">{baselineError}</p>
        </Reveal>
      )}
      <Reveal index={4} className="mt-8">
        <Button onClick={runBaseline} leftIcon={<GaugeIcon className="w-[18px] h-[18px]" />}>
          {baselineError ? "Try again" : "Run the test"}
        </Button>
      </Reveal>
    </Column>
  );
}
