"use client";

import { useState, useCallback, useRef } from "react";
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

export function useWorkout() {
  const [phase, setPhase] = useState<WorkoutPhase>("idle");
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [results, setResults] = useState<ModuleResult[]>([]);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use refs to avoid stale closures in callbacks
  const resultsRef = useRef<ModuleResult[]>([]);
  const moduleIndexRef = useRef(0);

  const startWorkout = useCallback(() => {
    resultsRef.current = [];
    moduleIndexRef.current = 0;
    setResults([]);
    setSessionResult(null);
    setCurrentModuleIndex(0);
    setPhase("module_intro");
  }, []);

  const startCurrentModule = useCallback(() => {
    setPhase(MODULE_ORDER[moduleIndexRef.current]);
  }, []);

  const completeModule = useCallback((result: ModuleResult) => {
    const newResults = [...resultsRef.current, result];
    resultsRef.current = newResults;
    setResults(newResults);

    const nextIndex = moduleIndexRef.current + 1;
    if (nextIndex < MODULE_ORDER.length) {
      moduleIndexRef.current = nextIndex;
      setCurrentModuleIndex(nextIndex);
      setPhase("module_intro");
    } else {
      setIsSubmitting(true);
      const data = saveSession(newResults);
      setSessionResult(data);
      setIsSubmitting(false);
      setPhase("complete");
    }
  }, []);

  const resetWorkout = useCallback(() => {
    setPhase("idle");
    setCurrentModuleIndex(0);
    setResults([]);
    setSessionResult(null);
    resultsRef.current = [];
    moduleIndexRef.current = 0;
  }, []);

  return {
    phase,
    currentModuleIndex,
    results,
    sessionResult,
    isSubmitting,
    startWorkout,
    startCurrentModule,
    completeModule,
    resetWorkout,
  };
}
