import { useEffect, useState } from "react";
import { BrandProgressRing, BrandStepList } from "./BrandKit";

const STAGES = [
  "Preparing the model",
  "Running the prompt",
  "Reading the timing",
  "Calculating the speed",
];

/**
 * A calm staged view for benchmarks: an indeterminate signal-green ring with the
 * live icon, and an honest step list beneath. The stages reflect what is actually
 * happening - we never show a fake percentage. Stages advance on a gentle timer
 * and hold on the last one until the real result arrives and the parent unmounts.
 */
export function RunningStages({
  title,
  icon,
}: {
  title: string;
  tone?: "blue" | "green";
  icon: React.ReactNode;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((i) => Math.min(i + 1, STAGES.length - 1)), 850);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <BrandProgressRing percent={null} size={188} stroke={9}>
        <span className="grid place-items-center w-14 h-14 rounded-card bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100">
          {icon}
        </span>
      </BrandProgressRing>

      <h2 className="mt-8 text-cardtitle font-semibold text-ink-900">{title}</h2>

      <div className="mt-7 w-full max-w-[20rem]">
        <BrandStepList steps={STAGES.map((label) => ({ label }))} activeIndex={active} />
      </div>
    </div>
  );
}
