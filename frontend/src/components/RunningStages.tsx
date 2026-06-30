import { useEffect, useState } from "react";
import { Pulse } from "./Pulse";
import { CheckIcon, Spinner } from "./Icons";

const STAGES = [
  "Preparing the model",
  "Sending the prompt",
  "Generating the response",
  "Calculating the speed",
];

/**
 * A calm staged loading view for benchmarks. The stages reflect what is actually
 * happening; we never show a fake percentage. Stages advance on a gentle timer
 * and hold on the last one until the real result arrives and the parent unmounts.
 */
export function RunningStages({
  title,
  tone = "blue",
  icon,
}: {
  title: string;
  tone?: "blue" | "green";
  icon: React.ReactNode;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((i) => Math.min(i + 1, STAGES.length - 1)), 750);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <Pulse tone={tone}>{icon}</Pulse>
      <h2 className="mt-8 text-cardtitle font-semibold text-ink-900">{title}</h2>

      <div className="mt-7 w-full max-w-[20rem] space-y-2.5">
        {STAGES.map((s, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <div
              key={s}
              className={[
                "flex items-center gap-3 rounded-tile px-4 py-2.5 transition-all duration-300",
                current ? "bg-white border border-mist-200 shadow-tile" : "bg-transparent",
              ].join(" ")}
            >
              <span
                className={[
                  "grid place-items-center w-5 h-5 rounded-full flex-shrink-0",
                  done ? "bg-sage-50 text-sage-600" : current ? "text-sky-500" : "text-ink-300",
                ].join(" ")}
              >
                {done ? (
                  <CheckIcon className="w-3.5 h-3.5" />
                ) : current ? (
                  <Spinner className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={[
                  "text-caption text-left",
                  done ? "text-ink-500" : current ? "text-ink-900 font-medium" : "text-ink-300",
                ].join(" ")}
              >
                {s}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
