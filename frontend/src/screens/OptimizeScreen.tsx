import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { Pulse } from "../components/Pulse";
import { ArrowRightIcon, CheckIcon, SparkIcon } from "../components/Icons";

export function OptimizeScreen() {
  const { hardware, optimizePhase, optimizeError, optimizeAndRetest, next } = useJourney();

  // A friendly, plain-language preview of what we'll tune (honest, hardware-aware).
  const hasGpu = !!hardware && (hardware.gpus.length > 0 || hardware.is_apple_silicon);
  const tweaks = hasGpu
    ? ["Use your graphics card to its full potential", "Process the prompt more efficiently"]
    : ["Match the work to your processor’s real cores", "Process the prompt more efficiently"];

  if (optimizePhase === "loading") {
    return (
      <div className="flex flex-col items-center text-center">
        <Pulse tone="emerald">
          <SparkIcon className="w-9 h-9" />
        </Pulse>
        <h2 className="mt-10 text-2xl font-semibold tracking-tight text-ink-900">
          Tuning for your machine
        </h2>
        <p className="mt-2 text-ink-500">Applying the settings and re-running the same test…</p>
      </div>
    );
  }

  if (optimizePhase === "done") {
    return (
      <div className="flex flex-col items-center text-center">
        <Reveal index={0}>
          <div className="grid place-items-center w-16 h-16 rounded-xl3 bg-emerald-50 text-emerald-500 animate-pop-in">
            <CheckIcon className="w-8 h-8" />
          </div>
        </Reveal>
        <Reveal index={1} className="mt-6">
          <h1 className="text-3xl font-bold tracking-tightest text-ink-900">Tuned and re-tested</h1>
        </Reveal>
        <Reveal index={2} className="mt-3">
          <p className="text-ink-500 max-w-sm mx-auto text-balance">
            We measured the optimized settings with the exact same test. Let’s see how it
            compares.
          </p>
        </Reveal>
        <Reveal index={3} className="mt-8">
          <button className="btn-primary" onClick={next}>
            See the difference
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
          <SparkIcon className="w-8 h-8" />
        </div>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tightest text-ink-900">
          Now let’s tune it for your machine
        </h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-ink-500 max-w-md mx-auto text-balance">
          We’ll apply a few safe adjustments, then run the very same test again so the
          difference is honest and measured.
        </p>
      </Reveal>

      <Reveal index={3} className="mt-7 w-full">
        <div className="glass p-5 text-left space-y-3">
          {tweaks.map((t) => (
            <div key={t} className="flex items-center gap-3 text-sm text-ink-700">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-sky-50 text-sky-500">
                <SparkIcon className="w-3.5 h-3.5" />
              </span>
              {t}
            </div>
          ))}
          <p className="text-xs text-ink-400 pt-1">
            These are standard, safe Ollama settings — nothing risky, nothing permanent.
          </p>
        </div>
      </Reveal>

      {optimizeError && (
        <Reveal index={4} className="mt-4">
          <p className="text-amber-600 text-sm">{optimizeError}</p>
        </Reveal>
      )}

      <Reveal index={4} className="mt-8">
        <button className="btn-primary" onClick={optimizeAndRetest}>
          <SparkIcon className="w-4 h-4" />
          {optimizeError ? "Try again" : "Optimize & re-test"}
        </button>
      </Reveal>
    </div>
  );
}
