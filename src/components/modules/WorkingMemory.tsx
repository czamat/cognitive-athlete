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
  onComplete: (result: ModuleResult) => void;
}

type Phase = "showing" | "delay" | "dual_task" | "recall" | "feedback";

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

export default function WorkingMemory({ difficulty, onComplete }: WorkingMemoryProps) {
  const config = getMemoryConfig(difficulty);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("showing");
  const [sequence, setSequence] = useState<string[]>([]);
  const [currentShowIndex, setCurrentShowIndex] = useState(0);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);

  const [mathProblem, setMathProblem] = useState<{ question: string; answer: number } | null>(null);
  const [mathInput, setMathInput] = useState("");
  const [roundStartTime, setRoundStartTime] = useState(0);

  const reactionTimes = useRef<number[]>([]);
  const accuracies = useRef<number[]>([]);

  const generateSequence = useCallback(() => {
    const shuffled = [...ITEM_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, config.sequenceLength);
  }, [config.sequenceLength]);

  const startRound = useCallback(() => {
    const seq = generateSequence();
    setSequence(seq);
    setCurrentShowIndex(0);
    setUserInput([]);
    setCurrentInputIndex(0);
    setMathInput("");
    setPhase("showing");
  }, [generateSequence]);

  useEffect(() => {
    startRound();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate sequence display
  useEffect(() => {
    if (phase !== "showing") return;
    if (currentShowIndex >= sequence.length) {
      if (config.hasDualTask) {
        setMathProblem(generateMathProblem());
        setPhase("dual_task");
      } else {
        setPhase("delay");
        setTimeout(() => {
          setPhase("recall");
          setRoundStartTime(performance.now());
        }, config.delayMs);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCurrentShowIndex((prev) => prev + 1);
    }, config.displayTimePerItemMs);

    return () => clearTimeout(timer);
  }, [phase, currentShowIndex, sequence.length, config]);

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
          startRound();
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

  // Unique items for the input grid (the sequence items + some extras)
  const inputOptions = (() => {
    const extras = ITEM_POOL.filter((x) => !sequence.includes(x))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(4, 9 - sequence.length));
    return [...sequence, ...extras].sort(() => Math.random() - 0.5);
  })();

  // Memoize input options so they don't reshuffle on every render
  const [stableOptions, setStableOptions] = useState<string[]>([]);
  useEffect(() => {
    if (phase === "recall" && stableOptions.length === 0) {
      setStableOptions(inputOptions);
    }
    if (phase === "showing") {
      setStableOptions([]);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ModuleShell
      title="Working Memory"
      description="Remember the sequence"
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
    >
      {phase === "showing" && (
        <div className="text-center animate-scale-in">
          <p className="text-xs text-muted mb-4">Memorize the sequence</p>
          <div className="w-28 h-28 flex items-center justify-center bg-surface rounded-3xl border-2 border-primary/30 mx-auto">
            {currentShowIndex < sequence.length && (
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
                  i <= currentShowIndex ? "bg-primary" : "bg-surface-lighter"
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

          {/* User input display */}
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

          {/* Input grid */}
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
