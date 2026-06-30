import { useEffect, useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { Button } from "../components/Button";
import { RunningStages } from "../components/RunningStages";
import { IconBadge, Note } from "../components/Bits";
import { ArrowRightIcon, CheckIcon, SparkIcon } from "../components/Icons";

const TWEAKS = [
  "Use your graphics card more efficiently",
  "Improve text batching",
  "Tune runtime configuration",
];

export function OptimizeScreen() {
  const { optimizePhase, optimizeError, optimizeAndRetest, next } = useJourney();

  if (optimizePhase === "loading") {
    return (
      <Column>
        <RunningStages title="Tuning and testing again" tone="green" icon={<SparkIcon className="w-7 h-7" />} />
      </Column>
    );
  }

  if (optimizePhase === "done") {
    return (
      <Column>
        <div className="flex flex-col items-center text-center">
          <Reveal index={0}>
            <IconBadge tone="green" size="lg">
              <CheckIcon className="w-8 h-8" />
            </IconBadge>
          </Reveal>
          <Reveal index={1} className="mt-6">
            <h1 className="text-page font-semibold text-ink-900">Done. Let's compare.</h1>
          </Reveal>
          <Reveal index={2} className="mt-3">
            <p className="text-body leading-relaxed text-ink-500 max-w-[26rem]">
              We ran the same test with the new settings. Here is how it changed.
            </p>
          </Reveal>
          <Reveal index={3} className="mt-8">
            <Button onClick={next} rightIcon={<ArrowRightIcon className="w-[18px] h-[18px]" />}>
              See the difference
            </Button>
          </Reveal>
        </div>
      </Column>
    );
  }

  // Intro with animated checkmarks
  return (
    <Column>
      <Reveal index={0}>
        <IconBadge size="lg">
          <SparkIcon className="w-7 h-7" />
        </IconBadge>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-page font-semibold text-ink-900">Now let's tune it for your computer</h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-body leading-relaxed text-ink-500 max-w-[31rem]">
          We adjust a few safe settings and run the same test again so the difference is real
          and measured.
        </p>
      </Reveal>

      <Reveal index={3} className="mt-6">
        <div className="surface p-5">
          <AnimatedChecklist items={TWEAKS} />
        </div>
      </Reveal>

      <Reveal index={4} className="mt-4">
        <Note>These settings are safe and can be changed later.</Note>
      </Reveal>

      {optimizeError && (
        <Reveal index={5} className="mt-4">
          <p className="text-caption text-sky-600">{optimizeError}</p>
        </Reveal>
      )}

      <Reveal index={5} className="mt-7">
        <Button onClick={optimizeAndRetest} leftIcon={<SparkIcon className="w-[18px] h-[18px]" />}>
          {optimizeError ? "Try again" : "Tune and test again"}
        </Button>
      </Reveal>
    </Column>
  );
}

function AnimatedChecklist({ items }: { items: string[] }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setShown((n) => Math.min(n + 1, items.length)), 280);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <ul className="space-y-3.5">
      {items.map((t, i) => {
        const on = i < shown;
        return (
          <li key={t} className="flex items-center gap-3 text-body text-ink-700">
            <span
              className={[
                "grid place-items-center w-6 h-6 rounded-full transition-colors duration-300",
                on ? "bg-sage-50 text-sage-600" : "bg-mist-100 text-ink-300",
              ].join(" ")}
            >
              {on ? (
                <span className="animate-check-pop">
                  <CheckIcon className="w-4 h-4" />
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </span>
            <span className={on ? "" : "text-ink-300"}>{t}</span>
          </li>
        );
      })}
    </ul>
  );
}
