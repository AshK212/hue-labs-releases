import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { JourneyProvider, useJourney } from "./journey/JourneyContext";
import { STEP } from "./journey/steps";
import { BrandBackground } from "./components/BrandBackground";
import { Screen } from "./components/Screen";
import { TopBar } from "./components/TopBar";
import { pageMotion } from "./components/PageTransition";
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

function Journey() {
  const { view, step, back } = useJourney();

  return (
    <>
      {/* Signature ambient background, shared by every screen. */}
      <BrandBackground glow={view === "dashboard" ? "none" : "top"} />

      {view === "dashboard" ? (
        <Dashboard />
      ) : step === STEP.Welcome ? (
        <AnimatePresence mode="wait">
          <motion.div key="welcome" {...pageMotion}>
            <WelcomeScreen />
          </motion.div>
        </AnimatePresence>
      ) : (
        <>
          <TopBar step={step} onBack={back} />
          <AnimatePresence mode="wait">
            <motion.div key={step} {...pageMotion}>
              <Screen>{renderScreen(step)}</Screen>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    // Globally honor the OS "reduce motion" setting for every Framer animation.
    <MotionConfig reducedMotion="user">
      <JourneyProvider>
        <Journey />
      </JourneyProvider>
    </MotionConfig>
  );
}
