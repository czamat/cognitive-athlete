"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getMemoryConfig } from "@/lib/difficulty";
import ModuleShell from "./ModuleShell";
import Button from "../ui/Button";
import type { ModuleResult } from "@/hooks/useWorkout";

const TOTAL_ROUNDS = 5;

const ITEM_POOL = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

interface WorkingMemoryProps {
  difficulty: number;
  streak?: number;
  onComplete: (result: ModuleResult) => void;
}

type Phase = "init" | "showing" | "delay" | "dual_task" | "recall" | "feedback";

function generateMathProblem(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 12) + 2;
  const b = Math.floor(Math.random() * 12) + 2;
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer: number;
  switch (op) {
    case "+": answer = a + b; break;
    case "-": answer = a - b; break;
    case "×": answer = a * b; break;
    default: answer = a + b;
  }
  return { question: `${a} ${op} ${b} = ?`, answer };
}

function generateSequence(length: number): string[] {
  const shuffled = [...ITEM_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, length);
}

export default function WorkingMemory({ difficulty, streak = 0, onComplete }: WorkingMemoryProps) {
  const config = getMemoryConfig(difficulty, streak);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("init");
  const [sequence, setSequence] = useState<string[]>(() => generateSequence(config.sequenceLength));
  const [currentShowIndex, setCurrentShowIndex] = useState(0);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);

  const [mathProblem, setMathProblem] = useState<{ question: string; answer: number } | null>(null);
  const [mathInput, setMathInput] = useState("");
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [stableOptions, setStableOptions] = useState<string[]>([]);

  const reactionTimes = useRef<number[]>([]);
  const accuracies = useRef<number[]>([]);

  // Start showing on mount and after each new round
  useEffect(() => {
    if (phase === "init" && sequence.length > 0) {
      setPhase("showing");
    }
  }, [phase, sequence]);

  // Animate sequence display one item at a time
  useEffect(() => {
    if (phase !== "showing" || sequence.length === 0) return;

    if (currentShowIndex >= sequence.length) {
      if (config.hasDualTask) {
        setMathProblem(generateMathProblem());
        setPhase("dual_task");
      } else {
        setPhase("delay");
        const timer = setTimeout(() => {
          setPhase("recall");
          setRoundStartTime(performance.now());
        }, config.delayMs);
        return () => clearTimeout(timer);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCurrentShowIndex((prev) => prev + 1);
    }, config.displayTimePerItemMs);

    return () => clearTimeout(timer);
  }, [phase, currentShowIndex, sequence.length, config]);

  // Generate stable recall options when entering recall phase
  useEffect(() => {
    if (phase === "recall" && stableOptions.length === 0) {
      const extras = ITEM_POOL.filter((x) => !sequence.includes(x))
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.max(4, 9 - sequence.length));
      setStableOptions([...sequence, ...extras].sort(() => Math.random() - 0.5));
    }
  }, [phase, sequence, stableOptions.length]);

  const startNextRound = useCallback(() => {
    const seq = generateSequence(config.sequenceLength);
    setSequence(seq);
    setCurrentShowIndex(0);
    setUserInput([]);
    setCurrentInputIndex(0);
    setMathInput("");
    setStableOptions([]);
    setPhase("init");
  }, [config.sequenceLength]);

  const handleDualTaskSubmit = () => {
    setPhase("recall");
    setRoundStartTime(performance.now());
  };

  const handleRecallInput = (item: string) => {
    if (phase !== "recall") return;

    const newInput = [...userInput, item];
    setUserInput(newInput);
    setCurrentInputIndex(newInput.length);

    if (newInput.length === sequence.length) {
      const reactionTime = performance.now() - roundStartTime;
      reactionTimes.current.push(reactionTime);

      let correct = 0;
      for (let i = 0; i < sequence.length; i++) {
        if (newInput[i] === sequence[i]) correct++;
      }
      const accuracy = correct / sequence.length;
      accuracies.current.push(accuracy);

      setPhase("feedback");

      setTimeout(() => {
        const nextRound = round + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          const avgReactionTime =
            reactionTimes.current.reduce((a, b) => a + b, 0) / reactionTimes.current.length;
          const avgAccuracy =
            accuracies.current.reduce((a, b) => a + b, 0) / accuracies.current.length;

          onComplete({
            moduleType: "memory",
            avgReactionTime: Math.round(avgReactionTime),
            accuracy: avgAccuracy,
            difficultyLevel: difficulty,
            roundsCompleted: TOTAL_ROUNDS,
          });
        } else {
          setRound(nextRound);
          startNextRound();
        }
      }, 2000);
    }
  };

  const handleUndo = () => {
    if (userInput.length > 0) {
      setUserInput(userInput.slice(0, -1));
      setCurrentInputIndex(userInput.length - 1);
    }
  };

  return (
    <ModuleShell
      title="Working Memory"
      description="Remember the sequence"
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
    >
      {(phase === "init" || phase === "showing") && (
        <div className="text-center animate-scale-in">
          <p className="text-xs text-muted mb-4">Memorize the sequence</p>
          <div className="w-28 h-28 flex items-center justify-center bg-surface rounded-3xl border-2 border-primary/30 mx-auto">
            {phase === "showing" && currentShowIndex < sequence.length && (
              <span className="text-4xl font-bold text-primary animate-scale-in" key={currentShowIndex}>
                {sequence[currentShowIndex]}
              </span>
            )}
          </div>
          <div className="flex justify-center gap-2 mt-4">
            {sequence.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  phase === "showing" && i <= currentShowIndex ? "bg-primary" : "bg-surface-lighter"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {phase === "delay" && (
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Hold it in memory...</p>
        </div>
      )}

      {phase === "dual_task" && mathProblem && (
        <div className="text-center animate-fade-in w-full">
          <p className="text-xs text-muted mb-3">Solve while remembering</p>
          <p className="text-3xl font-bold mb-6">{mathProblem.question}</p>
          <input
            type="number"
            value={mathInput}
            onChange={(e) => setMathInput(e.target.value)}
            className="w-32 h-12 bg-surface border border-surface-lighter rounded-xl text-center text-xl font-mono mx-auto block mb-4"
            autoFocus
          />
          <Button onClick={handleDualTaskSubmit}>Submit</Button>
        </div>
      )}

      {phase === "recall" && (
        <div className="w-full animate-fade-in">
          <p className="text-xs text-muted text-center mb-3">
            Enter the sequence ({userInput.length}/{sequence.length})
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {sequence.map((_, i) => (
              <div
                key={i}
                className={`w-11 h-11 flex items-center justify-center rounded-xl border text-lg font-bold ${
                  i < userInput.length
                    ? "bg-primary/20 border-primary text-primary"
                    : i === currentInputIndex
                    ? "border-primary/50 border-dashed"
                    : "border-surface-lighter"
                }`}
              >
                {userInput[i] || ""}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            {stableOptions.map((item) => (
              <button
                key={item}
                onClick={() => handleRecallInput(item)}
                disabled={userInput.length >= sequence.length}
                className="h-12 flex items-center justify-center bg-surface hover:bg-surface-light
                  active:bg-surface-lighter rounded-xl border border-surface-lighter
                  text-lg font-mono transition-colors touch-manipulation select-none
                  disabled:opacity-30"
              >
                {item}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={userInput.length === 0}>
            Undo
          </Button>
        </div>
      )}

      {phase === "feedback" && (
        <div className="text-center animate-scale-in">
          <div className="flex justify-center gap-2 mb-4">
            {sequence.map((item, i) => (
              <div
                key={i}
                className={`w-11 h-11 flex items-center justify-center rounded-xl text-lg font-bold ${
                  userInput[i] === item
                    ? "bg-success/20 border border-success text-success"
                    : "bg-danger/20 border border-danger text-danger"
                }`}
              >
                {userInput[i] || "?"}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            Correct: {sequence.filter((item, i) => userInput[i] === item).length}/{sequence.length}
          </p>
          <div className="flex justify-center gap-2 mt-2">
            <span className="text-xs text-muted">Answer: </span>
            {sequence.map((item, i) => (
              <span key={i} className="text-xs font-mono text-muted">{item}</span>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
