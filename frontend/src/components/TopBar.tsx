// The quiet app frame: brand on the left, a slim step indicator on the right,
// and a back control that appears only when going back makes sense.

import { BrandMark } from "./Brand";
import { ArrowLeftIcon } from "./Icons";
import { PROGRESS_STEPS, BACK_STEPS } from "../journey/steps";

export function TopBar({ step, onBack }: { step: number; onBack: () => void }) {
  const stepIndex = PROGRESS_STEPS.indexOf(step as (typeof PROGRESS_STEPS)[number]);
  const showBack = BACK_STEPS.includes(step as (typeof BACK_STEPS)[number]);

  return (
    <header className="fixed top-0 inset-x-0 z-30 h-16">
      <div className="h-full max-w-[1120px] mx-auto px-8 sm:px-12 lg:px-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
            <BrandMark size={28} />
          )}
          <span className="text-[13px] font-medium text-ink-400">Local AI Optimizer</span>
        </div>

        {stepIndex !== -1 && (
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
