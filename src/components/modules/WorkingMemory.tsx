"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getMemoryConfig } from "@/lib/difficulty";
import ModuleShell from "./ModuleShell";
import Button from "../ui/Button";
import type { ModuleResult } from "@/hooks/useWorkout";

const TOTAL_ROUNDS = 5;
const ITEM_POOL = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

type MemoryVariant = "sequence" | "reverse" | "grid_pattern";

export const MEMORY_VARIANTS: MemoryVariant[] = ["sequence", "reverse", "grid_pattern"];

const VARIANT_INFO: Record<MemoryVariant, { title: string; description: string }> = {
  sequence: { title: "Sequence Recall", description: "Remember the sequence in order" },
  reverse: { title: "Reverse Recall", description: "Remember the sequence backwards" },
  grid_pattern: { title: "Pattern Recall", description: "Reproduce the pattern on the grid" },
};

interface WorkingMemoryProps {
  difficulty: number;
  streak?: number;
  variant?: MemoryVariant;
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

function generateSequence(length: number): string[] {
  const shuffled = [...ITEM_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, length);
}

function buildRecallOptions(seq: string[]): string[] {
  const extras = ITEM_POOL.filter((x) => !seq.includes(x))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(4, 9 - seq.length));
  return [...seq, ...extras].sort(() => Math.random() - 0.5);
}

const GRID_SIZE = 4;
function generateGridPattern(count: number): number[] {
  const total = GRID_SIZE * GRID_SIZE;
  const indices: number[] = [];
  while (indices.length < count) {
    const idx = Math.floor(Math.random() * total);
    if (!indices.includes(idx)) indices.push(idx);
  }
  return indices;
}

// ---- Sequence / Reverse Recall ----
// Uses a single mount effect + chained timeouts instead of reactive useEffect.

function SequenceRecall({
  sequenceLength,
  displayTimePerItemMs,
  delayMs,
  hasDualTask,
  isReverse,
  onRoundComplete,
}: {
  sequenceLength: number;
  displayTimePerItemMs: number;
  delayMs: number;
  hasDualTask: boolean;
  isReverse: boolean;
  onRoundComplete: (accuracy: number, reactionTime: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("showing");
  const [currentShowIndex, setCurrentShowIndex] = useState(0);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [mathProblem, setMathProblem] = useState<{ question: string; answer: number } | null>(null);
  const [mathInput, setMathInput] = useState("");
  const [roundStartTime, setRoundStartTime] = useState(0);

  const [sequence] = useState<string[]>(() => generateSequence(sequenceLength));
  const [recallOptions] = useState<string[]>(() => {
    const seq = sequence;
    return buildRecallOptions(seq);
  });
  const expected = useMemo(
    () => (isReverse ? [...sequence].reverse() : [...sequence]),
    [sequence, isReverse]
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    let step = 0;

    function tick() {
      if (!mountedRef.current) return;

      if (step < sequence.length) {
        setCurrentShowIndex(step);
        step++;
        timerRef.current = setTimeout(tick, displayTimePerItemMs);
      } else {
        if (hasDualTask) {
          setMathProblem(generateMathProblem());
          setPhase("dual_task");
        } else {
          setPhase("delay");
          timerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            setPhase("recall");
            setRoundStartTime(performance.now());
          }, delayMs);
        }
      }
    }

    timerRef.current = setTimeout(tick, displayTimePerItemMs);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRecallInput = (item: string) => {
    if (phase !== "recall" || userInput.length >= expected.length) return;

    const newInput = [...userInput, item];
    setUserInput(newInput);

    if (newInput.length === expected.length) {
      const reactionTime = performance.now() - roundStartTime;
      let correct = 0;
      for (let i = 0; i < expected.length; i++) {
        if (newInput[i] === expected[i]) correct++;
      }
      setPhase("feedback");
      setTimeout(() => onRoundComplete(correct / expected.length, reactionTime), 2000);
    }
  };

  const handleSkip = () => {
    setPhase("feedback");
    setUserInput(Array(expected.length).fill("?"));
    setTimeout(() => onRoundComplete(0, 10000), 1500);
  };

  return (
    <>
      {phase === "showing" && (
        <div className="text-center animate-scale-in">
          <p className="text-xs text-muted mb-4">
            Memorize the sequence{isReverse ? " (you'll enter it backwards)" : ""}
          </p>
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
          <Button onClick={() => { setPhase("recall"); setRoundStartTime(performance.now()); }}>
            Submit
          </Button>
        </div>
      )}

      {phase === "recall" && (
        <div className="w-full animate-fade-in">
          <p className="text-xs text-muted text-center mb-3">
            {isReverse ? "Enter backwards" : "Enter the sequence"} ({userInput.length}/{expected.length})
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {expected.map((_, i) => (
              <div
                key={i}
                className={`w-11 h-11 flex items-center justify-center rounded-xl border text-lg font-bold ${
                  i < userInput.length
                    ? "bg-primary/20 border-primary text-primary"
                    : i === userInput.length
                    ? "border-primary/50 border-dashed"
                    : "border-surface-lighter"
                }`}
              >
                {userInput[i] || ""}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            {recallOptions.map((item) => (
              <button
                key={item}
                onClick={() => handleRecallInput(item)}
                disabled={userInput.length >= expected.length}
                className="h-12 flex items-center justify-center bg-surface hover:bg-surface-light
                  active:bg-surface-lighter rounded-xl border border-surface-lighter
                  text-lg font-mono transition-colors touch-manipulation select-none
                  disabled:opacity-30"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost" size="sm"
              onClick={() => setUserInput(userInput.slice(0, -1))}
              disabled={userInput.length === 0}
            >
              Undo
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSkip} className="ml-auto text-muted">
              Skip
            </Button>
          </div>
        </div>
      )}

      {phase === "feedback" && (
        <div className="text-center animate-scale-in">
          <div className="flex justify-center gap-2 mb-4">
            {expected.map((item, i) => (
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
            Correct: {expected.filter((item, i) => userInput[i] === item).length}/{expected.length}
          </p>
          <div className="flex justify-center gap-2 mt-2">
            <span className="text-xs text-muted">
              {isReverse ? "Reversed: " : "Answer: "}
            </span>
            {expected.map((item, i) => (
              <span key={i} className="text-xs font-mono text-muted">{item}</span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ---- Grid Pattern Recall ----
// Same approach: single mount effect with chained timeouts.

function GridPatternRecall({
  sequenceLength,
  displayTimePerItemMs,
  delayMs,
  onRoundComplete,
}: {
  sequenceLength: number;
  displayTimePerItemMs: number;
  delayMs: number;
  onRoundComplete: (accuracy: number, reactionTime: number) => void;
}) {
  const cellCount = Math.min(sequenceLength + 1, GRID_SIZE * GRID_SIZE - 2);

  const [phase, setPhase] = useState<Phase>("showing");
  const [pattern] = useState<number[]>(() => generateGridPattern(cellCount));
  const [showIndex, setShowIndex] = useState(0);
  const [userSelected, setUserSelected] = useState<Set<number>>(new Set());
  const [roundStartTime, setRoundStartTime] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let step = 0;

    function tick() {
      if (!mountedRef.current) return;

      if (step < pattern.length) {
        setShowIndex(step);
        step++;
        timerRef.current = setTimeout(tick, displayTimePerItemMs);
      } else {
        setPhase("delay");
        timerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setPhase("recall");
          setRoundStartTime(performance.now());
        }, delayMs);
      }
    }

    timerRef.current = setTimeout(tick, displayTimePerItemMs);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCellClick = (index: number) => {
    if (phase !== "recall") return;

    const newSelected = new Set(userSelected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else if (newSelected.size < pattern.length) {
      newSelected.add(index);
    }
    setUserSelected(newSelected);
  };

  const handleSubmit = () => {
    const reactionTime = performance.now() - roundStartTime;
    let correct = 0;
    for (const idx of userSelected) {
      if (pattern.includes(idx)) correct++;
    }
    setPhase("feedback");
    setTimeout(() => onRoundComplete(pattern.length > 0 ? correct / pattern.length : 0, reactionTime), 2000);
  };

  const handleSkip = () => {
    setPhase("feedback");
    setTimeout(() => onRoundComplete(0, 10000), 1500);
  };

  const getCellClass = (index: number) => {
    if (phase === "showing") {
      return pattern.slice(0, showIndex + 1).includes(index) ? "bg-primary" : "bg-surface-lighter";
    }
    if (phase === "delay") return "bg-surface-lighter";
    if (phase === "recall") {
      return userSelected.has(index) ? "bg-primary" : "bg-surface-lighter";
    }
    const isCorrectCell = pattern.includes(index);
    const wasSelected = userSelected.has(index);
    if (isCorrectCell && wasSelected) return "bg-success";
    if (isCorrectCell && !wasSelected) return "bg-warning";
    if (!isCorrectCell && wasSelected) return "bg-danger";
    return "bg-surface-lighter";
  };

  return (
    <>
      {phase === "showing" && (
        <p className="text-xs text-muted text-center mb-4 animate-fade-in">Memorize the pattern</p>
      )}
      {phase === "delay" && (
        <div className="text-center animate-fade-in mb-4">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted">Hold it in memory...</p>
        </div>
      )}
      {phase === "recall" && (
        <p className="text-xs text-muted text-center mb-4">
          Tap the cells that were highlighted ({userSelected.size}/{pattern.length})
        </p>
      )}
      {phase === "feedback" && (
        <p className="text-xs text-muted text-center mb-4">Results</p>
      )}

      <div className="grid grid-cols-4 gap-2 mb-4" style={{ width: 240 }}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            disabled={phase !== "recall"}
            className={`aspect-square rounded-xl transition-colors duration-200 touch-manipulation select-none ${getCellClass(i)} ${
              phase === "recall" ? "hover:bg-surface-light active:bg-primary/50 cursor-pointer" : "cursor-default"
            }`}
          />
        ))}
      </div>

      {phase === "recall" && (
        <div className="flex gap-2 w-full max-w-[240px]">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted">
            Skip
          </Button>
          <Button
            size="sm" onClick={handleSubmit}
            disabled={userSelected.size !== pattern.length}
            className="ml-auto"
          >
            Confirm
          </Button>
        </div>
      )}

      {phase === "feedback" && (
        <p className="text-xs text-muted mt-2">
          Correct: {
            Array.from(userSelected).filter((idx) => pattern.includes(idx)).length
          }/{pattern.length}
        </p>
      )}
    </>
  );
}

// ---- Main component ----

export default function WorkingMemory({ difficulty, streak = 0, variant, onComplete }: WorkingMemoryProps) {
  const config = useMemo(() => getMemoryConfig(difficulty, streak), [difficulty, streak]);

  const chosenVariant = useMemo(
    () => variant || MEMORY_VARIANTS[Math.floor(Math.random() * MEMORY_VARIANTS.length)],
    [variant]
  );
  const variantInfo = VARIANT_INFO[chosenVariant];

  const [round, setRound] = useState(0);
  const reactionTimes = useRef<number[]>([]);
  const accuracies = useRef<number[]>([]);

  const handleRoundComplete = useCallback((accuracy: number, reactionTime: number) => {
    reactionTimes.current.push(reactionTime);
    accuracies.current.push(accuracy);

    setRound((prev) => {
      const nextRound = prev + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        const avgReactionTime =
          reactionTimes.current.reduce((a, b) => a + b, 0) / reactionTimes.current.length;
        const avgAccuracy =
          accuracies.current.reduce((a, b) => a + b, 0) / accuracies.current.length;

        setTimeout(() => {
          onComplete({
            moduleType: "memory",
            avgReactionTime: Math.round(avgReactionTime),
            accuracy: avgAccuracy,
            difficultyLevel: difficulty,
            roundsCompleted: TOTAL_ROUNDS,
          });
        }, 0);
        return prev;
      }
      return nextRound;
    });
  }, [difficulty, onComplete]);

  return (
    <ModuleShell
      title={variantInfo.title}
      description={variantInfo.description}
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
    >
      {chosenVariant === "grid_pattern" ? (
        <GridPatternRecall
          key={round}
          sequenceLength={config.sequenceLength}
          displayTimePerItemMs={config.displayTimePerItemMs}
          delayMs={config.delayMs}
          onRoundComplete={handleRoundComplete}
        />
      ) : (
        <SequenceRecall
          key={round}
          sequenceLength={config.sequenceLength}
          displayTimePerItemMs={config.displayTimePerItemMs}
          delayMs={config.delayMs}
          hasDualTask={config.hasDualTask}
          isReverse={chosenVariant === "reverse"}
          onRoundComplete={handleRoundComplete}
        />
      )}
    </ModuleShell>
  );
}
