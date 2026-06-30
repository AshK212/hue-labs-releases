import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { Pulse } from "../components/Pulse";
import { IconBadge } from "../components/Bits";
import { ArrowRightIcon, CheckIcon, SparkIcon } from "../components/Icons";

export function OptimizeScreen() {
  const { hardware, optimizePhase, optimizeError, optimizeAndRetest, next } = useJourney();

  const hasGpu = !!hardware && (hardware.gpus.length > 0 || hardware.is_apple_silicon);
  const tweaks = hasGpu
    ? ["Let it use your graphics card fully", "Handle the prompt more efficiently"]
    : ["Match the work to your processor's real cores", "Handle the prompt more efficiently"];

  if (optimizePhase === "loading") {
    return (
      <div>
        <Pulse tone="sage">
          <SparkIcon className="w-7 h-7" />
        </Pulse>
        <h2 className="mt-9 text-[26px] font-semibold tracking-tight2 text-ink-900">
          Tuning and testing again
        </h2>
        <p className="mt-2.5 text-ink-500">Running the same test with the new settings.</p>
      </div>
    );
  }

  if (optimizePhase === "done") {
    return (
      <div>
        <Reveal index={0}>
          <IconBadge tone="sage">
            <CheckIcon className="w-6 h-6" />
          </IconBadge>
        </Reveal>
        <Reveal index={1} className="mt-6">
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight2 text-ink-900">
            Done. Let's compare.
          </h1>
        </Reveal>
        <Reveal index={2} className="mt-3">
          <p className="text-[17px] leading-relaxed text-ink-500 max-w-[26rem]">
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
    );
  }

  return (
    <div>
      <Reveal index={0}>
        <IconBadge>
          <SparkIcon className="w-6 h-6" />
        </IconBadge>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight2 text-ink-900">
          Now let's tune it for your computer
        </h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-[17px] leading-relaxed text-ink-500 max-w-[28rem]">
          We change a few settings that are safe to adjust, then run the same test again
          so the difference is real and measured.
        </p>
      </Reveal>

      <Reveal index={3} className="mt-7">
        <ul className="space-y-3">
          {tweaks.map((t) => (
            <li key={t} className="flex items-center gap-3 text-[15px] text-ink-700">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-sky-50 text-sky-500">
                <SparkIcon className="w-3.5 h-3.5" />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-ink-400 mt-4 max-w-[28rem] leading-relaxed">
          These are normal Ollama settings. Nothing risky, and nothing permanent.
        </p>
      </Reveal>

      {optimizeError && (
        <Reveal index={4} className="mt-4">
          <p className="text-[14px] text-sky-600">{optimizeError}</p>
        </Reveal>
      )}

      <Reveal index={4} className="mt-8">
        <button className="btn-primary" onClick={optimizeAndRetest}>
          <SparkIcon className="w-[18px] h-[18px]" />
          {optimizeError ? "Try again" : "Tune and test again"}
        </button>
      </Reveal>
    </div>
  );
}
