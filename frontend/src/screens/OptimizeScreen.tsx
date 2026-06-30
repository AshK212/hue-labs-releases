import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { Pulse } from "../components/Pulse";
import { IconBadge, Note } from "../components/Bits";
import { ArrowRightIcon, CheckIcon, SparkIcon } from "../components/Icons";

export function OptimizeScreen() {
  const { hardware, optimizePhase, optimizeError, optimizeAndRetest, next } = useJourney();

  const hasGpu = !!hardware && (hardware.gpus.length > 0 || hardware.is_apple_silicon);
  const tweaks = [
    hasGpu ? "Use your graphics card more" : "Match the work to your processor's cores",
    "Handle the prompt more efficiently",
    "Adjust batch size for better throughput",
  ];

  if (optimizePhase === "loading") {
    return (
      <Column>
        <div className="flex flex-col items-center text-center">
          <Pulse tone="sage">
            <SparkIcon className="w-7 h-7" />
          </Pulse>
          <h2 className="mt-8 text-[24px] font-semibold tracking-tight2 text-ink-900">
            Tuning and testing again
          </h2>
          <p className="mt-2 text-[15px] text-ink-500">Running the same test with the new settings.</p>
        </div>
      </Column>
    );
  }

  if (optimizePhase === "done") {
    return (
      <Column>
        <div className="flex flex-col items-center text-center">
          <Reveal index={0}>
            <IconBadge tone="sage" size="lg">
              <CheckIcon className="w-7 h-7" />
            </IconBadge>
          </Reveal>
          <Reveal index={1} className="mt-6">
            <h1 className="text-[30px] leading-tight font-semibold tracking-tight2 text-ink-900">
              Done. Let's compare.
            </h1>
          </Reveal>
          <Reveal index={2} className="mt-3">
            <p className="text-[16px] leading-relaxed text-ink-500 max-w-[24rem]">
              We ran the same test with the new settings. Here is how it changed.
            </p>
          </Reveal>
          <Reveal index={3} className="mt-8">
            <button className="btn-primary" onClick={next}>
              See the difference
              <ArrowRightIcon className="w-[18px] h-[18px]" />
            </button>
          </Reveal>
        </div>
      </Column>
    );
  }

  return (
    <Column>
      <Reveal index={0}>
        <IconBadge>
          <SparkIcon className="w-6 h-6" />
        </IconBadge>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight2 text-ink-900">
          Now let's tune it for your computer
        </h1>
      </Reveal>
      <Reveal index={2} className="mt-2">
        <p className="text-[16px] leading-relaxed text-ink-500 max-w-[28rem]">
          We adjust a few safe settings and run the test again.
        </p>
      </Reveal>

      <Reveal index={3} className="mt-6">
        <div className="card p-5 space-y-3.5">
          {tweaks.map((t) => (
            <div key={t} className="flex items-center gap-3 text-[15px] text-ink-700">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-sage-50 text-sage-600">
                <CheckIcon className="w-4 h-4" />
              </span>
              {t}
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal index={4} className="mt-4">
        <Note>These are normal Ollama settings. Nothing risky, and nothing permanent.</Note>
      </Reveal>

      {optimizeError && (
        <Reveal index={5} className="mt-4">
          <p className="text-[14px] text-sky-600">{optimizeError}</p>
        </Reveal>
      )}

      <Reveal index={5} className="mt-7">
        <button className="btn-primary" onClick={optimizeAndRetest}>
          <SparkIcon className="w-[18px] h-[18px]" />
          {optimizeError ? "Try again" : "Tune and test again"}
        </button>
      </Reveal>
    </Column>
  );
}
