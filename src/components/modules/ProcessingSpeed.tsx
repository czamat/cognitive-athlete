"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTimer } from "@/hooks/useTimer";
import { getProcessingSpeedConfig, getProcessingSpeedChoiceLimitMs } from "@/lib/difficulty";
import { usePressureTimer } from "@/hooks/usePressureTimer";
import PressureTimerBar from "@/components/ui/PressureTimerBar";
import ModuleShell from "./ModuleShell";
import type { ModuleResult } from "@/hooks/useWorkout";

const TOTAL_ROUNDS = 10;

type VariantKey = "symbol_match" | "number_compare" | "color_match" | "arrow_direction";

interface VariantRound {
  prompt: string;
  displayContent: React.ReactNode;
  questionText: string;
  options: { label: React.ReactNode; value: string }[];
  correctValue: string;
}

const SYMBOL_SETS = [
  ["▲", "●", "■", "◆", "★", "♦", "♣", "♠"],
  ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  ["A", "B", "D", "E", "F", "G", "H", "K", "R"],
  ["ᐁ", "ᐃ", "ᐅ", "ᐊ", "ᐂ", "ᐄ", "ᐆ", "ᐈ"],
  ["23", "32", "28", "82", "38", "83", "35", "53"],
];

const COLORS = [
  { name: "Red", class: "bg-red-500" },
  { name: "Blue", class: "bg-blue-500" },
  { name: "Green", class: "bg-green-500" },
  { name: "Yellow", class: "bg-yellow-400" },
  { name: "Purple", class: "bg-purple-500" },
  { name: "Orange", class: "bg-orange-500" },
  { name: "Pink", class: "bg-pink-500" },
  { name: "Cyan", class: "bg-cyan-400" },
];

const ARROWS = [
  { label: "↑", direction: "Up" },
  { label: "↗", direction: "Up-Right" },
  { label: "→", direction: "Right" },
  { label: "↘", direction: "Down-Right" },
  { label: "↓", direction: "Down" },
  { label: "↙", direction: "Down-Left" },
  { label: "←", direction: "Left" },
  { label: "↖", direction: "Up-Left" },
];

function generateSymbolMatch(similarityLevel: number): VariantRound {
  const set = SYMBOL_SETS[Math.min(similarityLevel - 1, SYMBOL_SETS.length - 1)];
  const shuffled = [...set].sort(() => Math.random() - 0.5);
  const correct = shuffled[0];
  const distractors = shuffled.slice(1, 4);
  const options = [correct, ...distractors].sort(() => Math.random() - 0.5);

  return {
    prompt: "Remember this",
    displayContent: <span className="text-5xl">{correct}</span>,
    questionText: "Which symbol was shown?",
    options: options.map((s) => ({ label: <span className="text-3xl">{s}</span>, value: s })),
    correctValue: correct,
  };
}

function generateNumberCompare(): VariantRound {
  const a = Math.floor(Math.random() * 900) + 100;
  let b: number;
  do { b = Math.floor(Math.random() * 900) + 100; } while (b === a);

  const larger = Math.max(a, b).toString();

  return {
    prompt: "Which is larger?",
    displayContent: (
      <div className="flex items-center gap-4">
        <span className="text-4xl font-bold">{a}</span>
        <span className="text-2xl text-muted">vs</span>
        <span className="text-4xl font-bold">{b}</span>
      </div>
    ),
    questionText: "Tap the larger number",
    options: [
      { label: <span className="text-3xl font-bold">{a}</span>, value: a.toString() },
      { label: <span className="text-3xl font-bold">{b}</span>, value: b.toString() },
    ],
    correctValue: larger,
  };
}

function generateColorMatch(): VariantRound {
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
  const correct = shuffled[0];
  const distractors = shuffled.slice(1, 4);
  const options = [correct, ...distractors].sort(() => Math.random() - 0.5);

  return {
    prompt: "Remember this color",
    displayContent: <div className={`w-20 h-20 rounded-2xl ${correct.class}`} />,
    questionText: "Which color was shown?",
    options: options.map((c) => ({
      label: <div className={`w-12 h-12 rounded-xl ${c.class} mx-auto`} />,
      value: c.name,
    })),
    correctValue: correct.name,
  };
}

function generateArrowDirection(): VariantRound {
  const shuffled = [...ARROWS].sort(() => Math.random() - 0.5);
  const correct = shuffled[0];
  const distractors = shuffled.slice(1, 4);
  const options = [correct, ...distractors].sort(() => Math.random() - 0.5);

  return {
    prompt: "Which direction?",
    displayContent: <span className="text-6xl">{correct.label}</span>,
    questionText: "Which arrow was shown?",
    options: options.map((a) => ({
      label: <span className="text-4xl">{a.label}</span>,
      value: a.direction,
    })),
    correctValue: correct.direction,
  };
}

const VARIANT_GENERATORS: Record<VariantKey, (similarity: number) => VariantRound> = {
  symbol_match: generateSymbolMatch,
  number_compare: () => generateNumberCompare(),
  color_match: () => generateColorMatch(),
  arrow_direction: () => generateArrowDirection(),
};

const VARIANT_TITLES: Record<VariantKey, { title: string; description: string }> = {
  symbol_match: { title: "Symbol Match", description: "Identify the symbol as fast as you can" },
  number_compare: { title: "Number Compare", description: "Pick the larger number quickly" },
  color_match: { title: "Color Match", description: "Remember and match the color" },
  arrow_direction: { title: "Arrow Direction", description: "Remember which direction the arrow pointed" },
};

interface ProcessingSpeedProps {
  difficulty: number;
  streak?: number;
  variant?: VariantKey;
  onComplete: (result: ModuleResult) => void;
}

type Phase = "showing" | "options" | "feedback";

export const PROCESSING_SPEED_VARIANTS: VariantKey[] = [
  "symbol_match", "number_compare", "color_match", "arrow_direction",
];

export default function ProcessingSpeed({ difficulty, streak = 0, variant, onComplete }: ProcessingSpeedProps) {
  const config = getProcessingSpeedConfig(difficulty, streak);
  const timer = useTimer();

  const chosenVariant = useMemo(
    () => variant || PROCESSING_SPEED_VARIANTS[Math.floor(Math.random() * PROCESSING_SPEED_VARIANTS.length)],
    [variant]
  );
  const variantInfo = VARIANT_TITLES[chosenVariant];
  const generate = VARIANT_GENERATORS[chosenVariant];

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("showing");
  const [currentRound, setCurrentRound] = useState<VariantRound>(() => generate(config.similarityLevel));
  const [isCorrect, setIsCorrect] = useState(false);

  const roundRef = useRef(0);
  const phaseRef = useRef<Phase>("showing");
  const reactionTimes = useRef<number[]>([]);
  const correctCount = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const choiceLimitMs = useMemo(
    () => getProcessingSpeedChoiceLimitMs(difficulty, streak),
    [difficulty, streak]
  );

  phaseRef.current = phase;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const startRound = useCallback(() => {
    const r = generate(config.similarityLevel);
    setCurrentRound(r);
    setPhase("showing");

    addTimer(() => {
      setPhase("options");
      timer.start();
    }, config.displayTimeMs);
  }, [generate, config, timer, addTimer]);

  const advanceAfterFeedback = useCallback(() => {
    addTimer(() => {
      const nextRound = roundRef.current + 1;
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
        roundRef.current = nextRound;
        setRound(nextRound);
        startRound();
      }
    }, 600);
  }, [addTimer, startRound, onComplete, difficulty]);

  useEffect(() => {
    startRound();
    return clearTimers;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChoiceTimeout = useCallback(() => {
    if (phaseRef.current !== "options") return;
    const reactionTime = timer.stop();
    reactionTimes.current.push(reactionTime > 0 ? reactionTime : choiceLimitMs);
    setIsCorrect(false);
    setPhase("feedback");
    advanceAfterFeedback();
  }, [timer, choiceLimitMs, advanceAfterFeedback]);

  const { remainingMs: choiceRemaining, fraction: choiceFraction } = usePressureTimer(
    phase === "options",
    choiceLimitMs,
    handleChoiceTimeout
  );

  const handleSelect = (value: string) => {
    if (phase !== "options") return;

    const reactionTime = timer.stop();
    reactionTimes.current.push(reactionTime);

    const correct = value === currentRound.correctValue;
    if (correct) correctCount.current++;

    setIsCorrect(correct);
    setPhase("feedback");

    advanceAfterFeedback();
  };

  return (
    <ModuleShell
      title={variantInfo.title}
      description={variantInfo.description}
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
    >
      {phase === "showing" && (
        <div className="animate-scale-in">
          <div className="w-32 h-32 flex items-center justify-center bg-surface rounded-3xl border-2 border-primary/30">
            {currentRound.displayContent}
          </div>
          <p className="text-xs text-muted text-center mt-3">{currentRound.prompt}</p>
        </div>
      )}

      {phase === "options" && (
        <div className="w-full animate-fade-in">
          <PressureTimerBar
            remainingMs={choiceRemaining}
            fraction={choiceFraction}
            label="Choose"
            className="mb-4"
          />
          <p className="text-sm text-center text-muted mb-6">{currentRound.questionText}</p>
          <div className="grid grid-cols-2 gap-3">
            {currentRound.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(opt.value)}
                className="h-24 flex items-center justify-center bg-surface hover:bg-surface-light
                  active:bg-surface-lighter rounded-2xl border border-surface-lighter
                  transition-colors touch-manipulation select-none"
              >
                {opt.label}
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
            {isCorrect ? "Correct!" : "Wrong!"}
          </p>
        </div>
      )}
    </ModuleShell>
  );
}
