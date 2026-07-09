import { useEffect, useState } from "react";
import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { Button } from "../components/Button";
import { RunningStages } from "../components/RunningStages";
import { IconBadge, Note } from "../components/Bits";
import { Spot } from "../components/Spot";
import { BrandStepList } from "../components/BrandKit";
import { TechnicalDetails } from "../components/TechnicalDetails";
import { ArrowRightIcon, CheckIcon, SparkIcon } from "../components/Icons";

const TWEAKS = [
  "Use graphics acceleration",
  "Improve batching",
  "Tune runtime settings",
];

export function OptimizeScreen() {
  const { optimizePhase, optimizeError, optimizeAndRetest, profile, next } = useJourney();

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
          {profile && (
            <Reveal index={3} className="mt-6 w-full max-w-[26rem]">
              <TechnicalDetails options={profile.options} />
            </Reveal>
          )}
          <Reveal index={4} className="mt-8">
            <Button onClick={next} rightIcon={<ArrowRightIcon className="w-[18px] h-[18px]" />}>
              See the difference
            </Button>
          </Reveal>
        </div>
      </Column>
    );
  }

  // Intro with animated checklist
  return (
    <Column>
      <Reveal index={0}>
        <Spot motif="optimize" />
      </Reveal>
      <Reveal index={1} className="mt-7">
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
    const t = setInterval(() => setShown((n) => Math.min(n + 1, items.length)), 320);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <BrandStepList
      steps={items.map((label, i) => ({ label, state: i < shown ? "done" : "pending" }))}
    />
  );
}
