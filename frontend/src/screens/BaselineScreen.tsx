import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { Button } from "../components/Button";
import { RunningStages } from "../components/RunningStages";
import { HeroNumber } from "../components/Metric";
import { IconBadge, Note } from "../components/Bits";
import { StatusBadge } from "../components/Badge";
import { ArrowRightIcon, GaugeIcon } from "../components/Icons";

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
    return (
      <Column>
        <div className="flex flex-col items-center text-center">
          <Reveal index={0}>
            <p className="text-body text-ink-500">Your speed right now</p>
          </Reveal>
          <Reveal index={1} className="mt-5">
            <HeroNumber value={baseline.tokens_per_sec} unit="tokens per second" />
          </Reveal>
          <Reveal index={2} className="mt-6">
            <StatusBadge tone="neutral">
              Default settings · {baseline.output_tokens} tokens in {baseline.total_seconds}s
            </StatusBadge>
          </Reveal>
          <Reveal index={3} className="mt-9">
            <Button onClick={next} rightIcon={<ArrowRightIcon className="w-[18px] h-[18px]" />}>
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
        <IconBadge size="lg">
          <GaugeIcon className="w-7 h-7" />
        </IconBadge>
      </Reveal>
      <Reveal index={1} className="mt-6">
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
