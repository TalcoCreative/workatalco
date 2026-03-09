import { useEffect, useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { WelcomeModal } from "./WelcomeModal";
import { TourOverlay } from "./TourOverlay";
import { TourFinishModal } from "./TourFinishModal";

export function OnboardingProvider() {
  const {
    showWelcome,
    tourActive,
    currentStep,
    availableSteps,
    needsOnboarding,
    isLoading,
    startTour,
    skipTour,
    nextStep,
    prevStep,
    finishTour,
    triggerWelcome,
  } = useOnboarding();

  const [showFinish, setShowFinish] = useState(false);

  // Auto-trigger welcome for new users
  useEffect(() => {
    if (!isLoading && needsOnboarding) {
      const t = setTimeout(triggerWelcome, 1000);
      return () => clearTimeout(t);
    }
  }, [isLoading, needsOnboarding, triggerWelcome]);

  // Handle tour completion
  const handleNext = () => {
    if (currentStep === availableSteps.length - 1) {
      finishTour();
      setShowFinish(true);
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    skipTour();
  };

  return (
    <>
      <WelcomeModal open={showWelcome} onStartTour={startTour} onSkip={handleSkip} />
      <TourOverlay
        active={tourActive}
        steps={availableSteps}
        currentStep={currentStep}
        onNext={handleNext}
        onPrev={prevStep}
        onSkip={handleSkip}
      />
      <TourFinishModal open={showFinish} onClose={() => setShowFinish(false)} />
    </>
  );
}
