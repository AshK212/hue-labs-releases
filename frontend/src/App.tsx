import { AnimatePresence, motion } from "framer-motion";
import { JourneyProvider, useJourney } from "./journey/JourneyContext";
import { STEP } from "./journey/steps";
import { Orbs } from "./components/Orbs";
import { Screen } from "./components/Screen";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./dashboard/Dashboard";

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

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const },
};

function Journey() {
  const { view, step, back } = useJourney();

  if (view === "dashboard") {
    return <Dashboard />;
  }

  if (step === STEP.Welcome) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="welcome" {...pageMotion}>
          <WelcomeScreen />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <>
      <Orbs />
      <TopBar step={step} onBack={back} />
      <AnimatePresence mode="wait">
        <motion.div key={step} {...pageMotion}>
          <Screen>{renderScreen(step)}</Screen>
        </motion.div>
      </AnimatePresence>
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
