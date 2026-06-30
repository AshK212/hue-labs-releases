import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { Pulse } from "../components/Pulse";
import { HeroStat, IconBadge, Pill } from "../components/Bits";
import { ArrowRightIcon, GaugeIcon } from "../components/Icons";

export function BaselineScreen() {
  const { baseline, baselinePhase, baselineError, runBaseline, next } = useJourney();

  if (baselinePhase === "loading") {
    return (
      <div>
        <Pulse>
          <GaugeIcon className="w-7 h-7" />
        </Pulse>
        <h2 className="mt-9 text-[26px] font-semibold tracking-tight2 text-ink-900">
          Measuring the speed
        </h2>
        <p className="mt-2.5 text-ink-500">This takes a few seconds.</p>
      </div>
    );
  }

  if (baselinePhase === "done" && baseline) {
    return (
      <div>
        <Reveal index={0}>
          <p className="text-[15px] text-ink-500">Here is the speed right now</p>
        </Reveal>
        <Reveal index={1} className="mt-4">
          <HeroStat value={baseline.tokens_per_sec.toFixed(1)} unit="tokens per second" />
        </Reveal>
        <Reveal index={2} className="mt-5">
          <Pill tone="neutral">
            Default settings, {baseline.output_tokens} tokens in {baseline.total_seconds}s
          </Pill>
        </Reveal>
        <Reveal index={3} className="mt-9">
          <button className="btn-primary" onClick={next}>
            Continue
            <ArrowRightIcon className="w-[18px] h-[18px]" />
          </button>
        </Reveal>
      </div>
    );
  }

  return (
    <div>
      <Reveal index={0}>
        <IconBadge>
          <GaugeIcon className="w-6 h-6" />
        </IconBadge>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight2 text-ink-900">
          Let's measure the current speed
        </h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-[17px] leading-relaxed text-ink-500 max-w-[28rem]">
          We send the model a short prompt and time how fast it replies. It's the same
          prompt every time, so the numbers stay fair. The model reports the real timing.
        </p>
      </Reveal>
      {baselineError && (
        <Reveal index={3} className="mt-4">
          <p className="text-[14px] text-sky-600">{baselineError}</p>
        </Reveal>
      )}
      <Reveal index={3} className="mt-8">
        <button className="btn-primary" onClick={runBaseline}>
          <GaugeIcon className="w-[18px] h-[18px]" />
          {baselineError ? "Try again" : "Run the test"}
        </button>
      </Reveal>
    </div>
  );
}
