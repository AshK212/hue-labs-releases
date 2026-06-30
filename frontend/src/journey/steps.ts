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

// Steps shown as dots in the top bar (Welcome shows a pill instead).
export const PROGRESS_STEPS = [
  STEP.Hardware,
  STEP.Recommend,
  STEP.Setup,
  STEP.Baseline,
  STEP.Optimize,
  STEP.Results,
];

// The labelled flow used by the desktop step indicator ("Step N of 7 · label").
export const FLOW_STEPS: { step: number; label: string }[] = [
  { step: STEP.Scanning, label: "Checking your computer" },
  { step: STEP.Hardware, label: "Hardware detection" },
  { step: STEP.Recommend, label: "Choose your model" },
  { step: STEP.Setup, label: "Set up" },
  { step: STEP.Baseline, label: "Measure speed" },
  { step: STEP.Optimize, label: "Optimize" },
  { step: STEP.Results, label: "Results" },
];

// Steps that allow a quiet Back affordance.
export const BACK_STEPS = [
  STEP.Hardware,
  STEP.Recommend,
  STEP.Setup,
  STEP.Baseline,
  STEP.Optimize,
];
