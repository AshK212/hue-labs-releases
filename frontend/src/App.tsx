import { JourneyProvider, useJourney } from "./journey/JourneyContext";
import { STEP, BACK_STEPS } from "./journey/steps";
import { Orbs } from "./components/Orbs";
import { Screen } from "./components/Screen";
import { ProgressBar, BackButton } from "./components/Chrome";

import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ScanningScreen } from "./screens/ScanningScreen";
import { HardwareScreen } from "./screens/HardwareScreen";
import { RecommendationScreen } from "./screens/RecommendationScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { BaselineScreen } from "./screens/BaselineScreen";
import { OptimizeScreen } from "./screens/OptimizeScreen";
import { ResultsScreen } from "./screens/ResultsScreen";

function renderScreen(step: number) {
  switch (step) {
    case STEP.Welcome:
      return <WelcomeScreen />;
    case STEP.Scanning:
      return <ScanningScreen />;
    case STEP.Hardware:
      return <HardwareScreen />;
    case STEP.Recommend:
      return <RecommendationScreen />;
    case STEP.Setup:
      return <SetupScreen />;
    case STEP.Baseline:
      return <BaselineScreen />;
    case STEP.Optimize:
      return <OptimizeScreen />;
    case STEP.Results:
      return <ResultsScreen />;
    default:
      return <WelcomeScreen />;
  }
}

function Journey() {
  const { step, back } = useJourney();
  const showBack = BACK_STEPS.includes(step as (typeof BACK_STEPS)[number]);

  return (
    <>
      <Orbs />
      <ProgressBar step={step} />
      {showBack && <BackButton onClick={back} />}

      {/* Keyed on step so each screen remounts and replays its enter motion. */}
      <Screen key={step}>{renderScreen(step)}</Screen>
    </>
  );
}

export default function App() {
  return (
    <JourneyProvider>
      <Journey />
    </JourneyProvider>
  );
}
