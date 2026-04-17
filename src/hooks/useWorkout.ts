"use client";

import { useState, useCallback } from "react";
import { saveSession } from "@/lib/storage";

export type WorkoutPhase =
  | "idle"
  | "module_intro"
  | "processing_speed"
  | "attention"
  | "memory"
  | "complete";

export interface ModuleResult {
  moduleType: "processing_speed" | "attention" | "memory";
  avgReactionTime: number;
  accuracy: number;
  difficultyLevel: number;
  roundsCompleted: number;
}

export interface SessionResult {
  sessionId: number;
  totalScore: number;
  cognitiveScore: number;
  moduleScores: number[];
  xpGain: number;
  newStreak: number;
}

const MODULE_ORDER: WorkoutPhase[] = ["processing_speed", "attention", "memory"];

const MODULE_NAMES: Record<string, string> = {
  processing_speed: "Processing Speed",
  attention: "Attention Control",
  memory: "Working Memory",
};

export function useWorkout() {
  const [phase, setPhase] = useState<WorkoutPhase>("idle");
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [results, setResults] = useState<ModuleResult[]>([]);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentModuleName = MODULE_NAMES[MODULE_ORDER[currentModuleIndex]] || "";

  const startWorkout = useCallback(() => {
    setResults([]);
    setSessionResult(null);
    setCurrentModuleIndex(0);
    setPhase("module_intro");
  }, []);

  const startCurrentModule = useCallback(() => {
    setPhase(MODULE_ORDER[currentModuleIndex]);
  }, [currentModuleIndex]);

  const completeModule = useCallback(
    (result: ModuleResult) => {
      const newResults = [...results, result];
      setResults(newResults);

      const nextIndex = currentModuleIndex + 1;
      if (nextIndex < MODULE_ORDER.length) {
        setCurrentModuleIndex(nextIndex);
        setPhase("module_intro");
      } else {
        setIsSubmitting(true);
        const data = saveSession(newResults);
        setSessionResult(data);
        setIsSubmitting(false);
        setPhase("complete");
      }
    },
    [results, currentModuleIndex]
  );

  const resetWorkout = useCallback(() => {
    setPhase("idle");
    setCurrentModuleIndex(0);
    setResults([]);
    setSessionResult(null);
  }, []);

  return {
    phase,
    currentModuleIndex,
    currentModuleName,
    results,
    sessionResult,
    isSubmitting,
    startWorkout,
    startCurrentModule,
    completeModule,
    resetWorkout,
  };
}
