"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTimer } from "@/hooks/useTimer";
import { getProcessingSpeedConfig } from "@/lib/difficulty";
import ModuleShell from "./ModuleShell";
import type { ModuleResult } from "@/hooks/useWorkout";

const TOTAL_ROUNDS = 10;

// Symbol sets of increasing similarity
const SYMBOL_SETS = [
  ["▲", "●", "■", "◆", "★", "♦", "♣", "♠"],
  ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  ["A", "B", "D", "E", "F", "G", "H", "K", "R"],
  ["ᐁ", "ᐃ", "ᐅ", "ᐊ", "ᐂ", "ᐄ", "ᐆ", "ᐈ"],
  ["23", "32", "28", "82", "38", "83", "35", "53"],
];

interface ProcessingSpeedProps {
  difficulty: number;
  streak?: number;
  onComplete: (result: ModuleResult) => void;
}

type Phase = "showing" | "options" | "feedback" | "done";

export default function ProcessingSpeed({ difficulty, streak = 0, onComplete }: ProcessingSpeedProps) {
  const config = getProcessingSpeedConfig(difficulty, streak);
  const timer = useTimer();

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("showing");
  const [target, setTarget] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);

  const reactionTimes = useRef<number[]>([]);
  const correctCount = useRef(0);

  const symbolSet = SYMBOL_SETS[Math.min(config.similarityLevel - 1, SYMBOL_SETS.length - 1)];

  const generateRound = useCallback(() => {
    const shuffled = [...symbolSet].sort(() => Math.random() - 0.5);
    const correctSymbol = shuffled[0];
    const distractors = shuffled.slice(1, config.symbolCount);
    const allOptions = [correctSymbol, ...distractors].sort(() => Math.random() - 0.5);

    setTarget(correctSymbol);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setPhase("showing");

    setTimeout(() => {
      setPhase("options");
      timer.start();
    }, config.displayTimeMs);
  }, [symbolSet, config, timer]);

  useEffect(() => {
    generateRound();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (symbol: string) => {
    if (phase !== "options") return;

    const reactionTime = timer.stop();
    reactionTimes.current.push(reactionTime);

    const correct = symbol === target;
    if (correct) correctCount.current++;

    setSelectedAnswer(symbol);
    setIsCorrect(correct);
    setPhase("feedback");

    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        const avgReactionTime =
          reactionTimes.current.reduce((a, b) => a + b, 0) / reactionTimes.current.length;
        const accuracy = correctCount.current / TOTAL_ROUNDS;

        onComplete({
          moduleType: "processing_speed",
          avgReactionTime: Math.round(avgReactionTime),
          accuracy,
          difficultyLevel: difficulty,
          roundsCompleted: TOTAL_ROUNDS,
        });
      } else {
        setRound(nextRound);
        generateRound();
      }
    }, 600);
  };

  return (
    <ModuleShell
      title="Processing Speed"
      description="Identify the symbol as fast as you can"
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
    >
      {phase === "showing" && (
        <div className="animate-scale-in">
          <div className="w-32 h-32 flex items-center justify-center bg-surface rounded-3xl border-2 border-primary/30">
            <span className="text-5xl">{target}</span>
          </div>
          <p className="text-xs text-muted text-center mt-3">Remember this</p>
        </div>
      )}

      {phase === "options" && (
        <div className="w-full animate-fade-in">
          <p className="text-sm text-center text-muted mb-6">Which symbol was shown?</p>
          <div className="grid grid-cols-2 gap-3">
            {options.map((symbol, i) => (
              <button
                key={i}
                onClick={() => handleSelect(symbol)}
                className="h-24 flex items-center justify-center bg-surface hover:bg-surface-light
                  active:bg-surface-lighter rounded-2xl border border-surface-lighter
                  text-3xl transition-colors touch-manipulation select-none"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "feedback" && (
        <div className="animate-scale-in text-center">
          <div
            className={`w-24 h-24 flex items-center justify-center rounded-full mx-auto mb-3 ${
              isCorrect ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
            }`}
          >
            <span className="text-4xl">{isCorrect ? "✓" : "✗"}</span>
          </div>
          <p className={`text-sm font-medium ${isCorrect ? "text-success" : "text-danger"}`}>
            {isCorrect ? "Correct!" : `Wrong — it was ${target}`}
          </p>
        </div>
      )}
    </ModuleShell>
  );
}
