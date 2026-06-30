// The ordered journey. Index = position in the flow.

export const STEP = {
  Welcome: 0,
  Scanning: 1,
  Hardware: 2,
  Recommend: 3,
  Setup: 4,
  Baseline: 5,
  Optimize: 6,
  Results: 7,
} as const;

export type StepIndex = (typeof STEP)[keyof typeof STEP];

export const TOTAL_STEPS = 8;

// Steps that show the slim top progress bar (Welcome/Scanning/Results are bare).
export const PROGRESS_STEPS = [
  STEP.Hardware,
  STEP.Recommend,
  STEP.Setup,
  STEP.Baseline,
  STEP.Optimize,
];

// Steps that allow a quiet Back affordance.
export const BACK_STEPS = [
  STEP.Hardware,
  STEP.Recommend,
  STEP.Setup,
  STEP.Baseline,
  STEP.Optimize,
];
