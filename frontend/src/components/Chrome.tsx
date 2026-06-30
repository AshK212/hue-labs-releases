// Top-of-screen chrome: a slim segmented progress bar and a quiet Back button.

import { ArrowLeftIcon } from "./Icons";
import { PROGRESS_STEPS } from "../journey/steps";

export function ProgressBar({ step }: { step: number }) {
  const index = PROGRESS_STEPS.indexOf(step as (typeof PROGRESS_STEPS)[number]);
  if (index === -1) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-20 px-6 pt-6">
      <div className="max-w-xl mx-auto flex items-center gap-1.5">
        {PROGRESS_STEPS.map((_, i) => (
          <span
            key={i}
            className={[
              "h-1 flex-1 rounded-full transition-all duration-500",
              i < index
                ? "bg-sky-400"
                : i === index
                ? "bg-sky-400 animate-progress-glow"
                : "bg-cloud-300/70",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-5 left-5 z-20 grid place-items-center w-10 h-10 rounded-full
                 text-ink-400 hover:text-ink-700 hover:bg-white/70 transition-colors"
      aria-label="Go back"
    >
      <ArrowLeftIcon className="w-5 h-5" />
    </button>
  );
}
