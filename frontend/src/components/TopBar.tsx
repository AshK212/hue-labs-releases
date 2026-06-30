// The shared top navigation: back + brand on the left, step indicator on the right.

import { BrandMark } from "./Brand";
import { StepIndicator } from "./StepIndicator";
import { ArrowLeftIcon } from "./Icons";
import { PROGRESS_STEPS, BACK_STEPS } from "../journey/steps";

export function TopBar({ step, onBack }: { step: number; onBack: () => void }) {
  const stepIndex = PROGRESS_STEPS.indexOf(step as (typeof PROGRESS_STEPS)[number]);
  const showBack = BACK_STEPS.includes(step as (typeof BACK_STEPS)[number]);

  return (
    <header className="fixed top-0 inset-x-0 z-30 h-[72px]">
      <div className="h-full max-w-[1180px] mx-auto px-8 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={onBack}
              aria-label="Back"
              className="flex items-center gap-1.5 h-9 pl-1.5 pr-3 -ml-1.5 rounded-badge text-caption font-medium text-ink-500 hover:text-ink-900 hover:bg-mist-100 transition-colors"
            >
              <ArrowLeftIcon className="w-[18px] h-[18px]" />
              Back
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <BrandMark size={28} />
              <span className="text-caption font-semibold text-ink-700">Local AI Optimizer</span>
            </div>
          )}
        </div>

        {stepIndex !== -1 && <StepIndicator total={PROGRESS_STEPS.length} current={stepIndex} />}
      </div>
    </header>
  );
}
