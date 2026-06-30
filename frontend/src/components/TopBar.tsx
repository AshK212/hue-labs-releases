// The shared top navigation: back + brand on the left, a desktop step indicator
// on the right, and a slim animated progress bar pinned to the very top.

import { BrandMark } from "./Brand";
import { ArrowLeftIcon } from "./Icons";
import { FLOW_STEPS, BACK_STEPS } from "../journey/steps";

export function TopBar({ step, onBack }: { step: number; onBack: () => void }) {
  const flowIndex = FLOW_STEPS.findIndex((f) => f.step === step);
  const showBack = BACK_STEPS.includes(step as (typeof BACK_STEPS)[number]);
  const total = FLOW_STEPS.length;
  const current = flowIndex === -1 ? 0 : flowIndex;
  const pct = ((current + 1) / total) * 100;

  return (
    <>
      {/* Slim animated progress bar across the very top */}
      {flowIndex !== -1 && (
        <div className="fixed top-0 inset-x-0 z-40 h-[3px] bg-mist-200/70">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-r-full transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <header className="fixed top-0 inset-x-0 z-30 h-[84px]">
        <div className="h-full max-w-[1240px] mx-auto px-8 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                onClick={onBack}
                aria-label="Back"
                className="flex items-center gap-1.5 h-10 pl-2 pr-3.5 -ml-2 rounded-badge text-caption font-medium text-ink-500 hover:text-ink-900 hover:bg-mist-100 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                Back
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <BrandMark size={30} />
                <span className="text-body font-semibold text-ink-700">Local AI Optimizer</span>
              </div>
            )}
          </div>

          {flowIndex !== -1 && (
            <div className="text-right">
              <div className="text-micro font-medium text-ink-400">
                Step {current + 1} of {total}
              </div>
              <div className="text-caption font-semibold text-ink-700 mt-0.5">
                {FLOW_STEPS[current].label}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
