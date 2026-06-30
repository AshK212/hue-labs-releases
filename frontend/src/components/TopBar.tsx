// The quiet app frame: brand on the left, a step indicator on the right, and a
// back control that appears only when going back makes sense. On Welcome we show
// a small reassurance pill instead of the step dots.

import { BrandMark } from "./Brand";
import { ArrowLeftIcon, ShieldIcon } from "./Icons";
import { PROGRESS_STEPS, BACK_STEPS, STEP } from "../journey/steps";

export function TopBar({ step, onBack }: { step: number; onBack: () => void }) {
  const stepIndex = PROGRESS_STEPS.indexOf(step as (typeof PROGRESS_STEPS)[number]);
  const showBack = BACK_STEPS.includes(step as (typeof BACK_STEPS)[number]);
  const isWelcome = step === STEP.Welcome;

  return (
    <header className="fixed top-0 inset-x-0 z-30 h-16">
      <div className="h-full max-w-[60rem] mx-auto px-6 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {showBack ? (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="grid place-items-center w-8 h-8 -ml-1 rounded-full text-ink-400
                         hover:text-ink-700 hover:bg-mist-100 transition-colors"
            >
              <ArrowLeftIcon className="w-[18px] h-[18px]" />
            </button>
          ) : (
            <BrandMark size={26} />
          )}
          <span className="text-[13px] font-medium text-ink-400">Local AI Optimizer</span>
        </div>

        {isWelcome ? (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-mist-200 bg-white/70 px-3 py-1 text-[12px] font-medium text-ink-500">
            <ShieldIcon className="w-3.5 h-3.5 text-sky-500" />
            Private · No terminal
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            {PROGRESS_STEPS.map((_, i) => (
              <span
                key={i}
                className={[
                  "h-1.5 rounded-full transition-all duration-500 ease-out",
                  i === stepIndex
                    ? "w-5 bg-sky-500"
                    : i < stepIndex
                    ? "w-1.5 bg-sky-300"
                    : "w-1.5 bg-mist-300",
                ].join(" ")}
              />
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
