import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { Pulse } from "../components/Pulse";
import { HeroStat, IconBadge, Note, Pill } from "../components/Bits";
import { ArrowRightIcon, GaugeIcon } from "../components/Icons";

const FAIR_NOTE = "Same prompt, same model. The numbers stay fair.";

export function BaselineScreen() {
  const { baseline, baselinePhase, baselineError, runBaseline, next } = useJourney();

  if (baselinePhase === "loading") {
    return (
      <Column>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight2 text-ink-900">
          Let's measure the current speed
        </h1>
        <p className="mt-2 text-[16px] text-ink-500">
          We send the model a short prompt and time how fast it replies.
        </p>

        <div className="mt-9 flex flex-col items-center text-center">
          <Pulse>
            <GaugeIcon className="w-7 h-7" />
          </Pulse>
          <h2 className="mt-7 text-[20px] font-semibold text-ink-900">Measuring the speed</h2>
          <p className="mt-1.5 text-[14px] text-ink-500">This takes a few seconds.</p>
        </div>

        <div className="mt-9">
          <Note>{FAIR_NOTE}</Note>
        </div>
      </Column>
    );
  }

  if (baselinePhase === "done" && baseline) {
    return (
      <Column>
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
      </Column>
    );
  }

  return (
    <Column>
      <Reveal index={0}>
        <IconBadge>
          <GaugeIcon className="w-6 h-6" />
        </IconBadge>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight2 text-ink-900">
          Let's measure the current speed
        </h1>
      </Reveal>
      <Reveal index={2} className="mt-2">
        <p className="text-[16px] leading-relaxed text-ink-500 max-w-[28rem]">
          We send the model a short prompt and time how fast it replies. The model reports
          the real timing.
        </p>
      </Reveal>
      <Reveal index={3} className="mt-6">
        <Note>{FAIR_NOTE}</Note>
      </Reveal>
      {baselineError && (
        <Reveal index={4} className="mt-4">
          <p className="text-[14px] text-sky-600">{baselineError}</p>
        </Reveal>
      )}
      <Reveal index={4} className="mt-8">
        <button className="btn-primary" onClick={runBaseline}>
          <GaugeIcon className="w-[18px] h-[18px]" />
          {baselineError ? "Try again" : "Run the test"}
        </button>
      </Reveal>
    </Column>
  );
}
