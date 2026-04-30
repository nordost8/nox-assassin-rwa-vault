"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { KEYS } from "@/lib/storage-keys";

interface TutorialCtx {
  tutorialActive: boolean;
  tutorialStep: number;
  tutorialStepCompleted: boolean;
  startTutorial: () => void;
  exitTutorial: () => void;
  setTutorialStep: (step: number) => void;
  completeTutorialStep: () => void;
}

const Ctx = createContext<TutorialCtx | null>(null);

export function useTutorial() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTutorial must be inside TutorialProvider");
  return ctx;
}

// Safe variant for components that may render outside (app) layout during prerender.
export function useTutorialOptional() {
  return useContext(Ctx);
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  // Always start at 0 on server — read localStorage only after mount to avoid hydration mismatch
  const [step, setStepState] = useState<number>(0);
  const [stepCompleted, setStepCompleted] = useState(false);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem(KEYS.tutorialStep) ?? "0", 10);
    if (saved > 0) setStepState(saved);
  }, []);

  const startTutorial = useCallback(() => {
    setStepState(1);
    setStepCompleted(false);
    localStorage.setItem(KEYS.tutorialStep, "1");
  }, []);

  const exitTutorial = useCallback(() => {
    setStepState(0);
    setStepCompleted(false);
    localStorage.removeItem(KEYS.tutorialStep);
  }, []);

  const setTutorialStep = useCallback((s: number) => {
    setStepState(s);
    setStepCompleted(false);
    if (s > 0) localStorage.setItem(KEYS.tutorialStep, String(s));
    else localStorage.removeItem(KEYS.tutorialStep);
  }, []);

  const completeTutorialStep = useCallback(() => {
    setStepCompleted(true);
  }, []);

  return (
    <Ctx.Provider value={{
      tutorialActive: step >= 1 && step <= 7,
      tutorialStep: step,
      tutorialStepCompleted: stepCompleted,
      startTutorial,
      exitTutorial,
      setTutorialStep,
      completeTutorialStep,
    }}>
      {children}
    </Ctx.Provider>
  );
}
