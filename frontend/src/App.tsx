import { JourneyProvider, useJourney } from "./journey/JourneyContext";
import { STEP } from "./journey/steps";
import { Orbs } from "./components/Orbs";
import { Screen } from "./components/Screen";
import { TopBar } from "./components/TopBar";

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
  const isWelcome = step === STEP.Welcome;

  // Welcome is a full-bleed hero: it owns the whole viewport and its own header,
  // so we skip the centered stage and the standard chrome for it.
  if (isWelcome) {
    return <WelcomeScreen />;
  }

  return (
    <>
      <Orbs />
      <TopBar step={step} onBack={back} />

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
