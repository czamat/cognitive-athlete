"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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

function buildRecallOptions(sequence: string[]): string[] {
  const extras = ITEM_POOL.filter((x) => !sequence.includes(x))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(4, 9 - sequence.length));
  return [...sequence, ...extras].sort(() => Math.random() - 0.5);
}

// Grid pattern: generate which cells to highlight
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

// ---- Sequence / Reverse Recall sub-component ----

function SequenceRecall({
  config,
  isReverse,
  round,
  onRoundComplete,
}: {
  config: ReturnType<typeof getMemoryConfig>;
  isReverse: boolean;
  round: number;
  onRoundComplete: (accuracy: number, reactionTime: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("showing");
  const [roundKey, setRoundKey] = useState(0);

  const sequenceRef = useRef<string[]>(generateSequence(config.sequenceLength));
  const recallOptionsRef = useRef<string[]>(buildRecallOptions(sequenceRef.current));
  const expectedRef = useRef<string[]>(
    isReverse ? [...sequenceRef.current].reverse() : sequenceRef.current
  );

  const [currentShowIndex, setCurrentShowIndex] = useState(0);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [mathProblem, setMathProblem] = useState<{ question: string; answer: number } | null>(null);
  const [mathInput, setMathInput] = useState("");
  const [roundStartTime, setRoundStartTime] = useState(0);

  const sequence = sequenceRef.current;
  const recallOptions = recallOptionsRef.current;
  const expected = expectedRef.current;

  // Reset state when round changes via parent
  useEffect(() => {
    const seq = generateSequence(config.sequenceLength);
    sequenceRef.current = seq;
    recallOptionsRef.current = buildRecallOptions(seq);
    expectedRef.current = isReverse ? [...seq].reverse() : seq;
    setCurrentShowIndex(0);
    setUserInput([]);
    setMathInput("");
    setPhase("showing");
    setRoundKey((k) => k + 1);
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [phase, currentShowIndex, sequence.length, config, roundKey]);

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
      const accuracy = correct / expected.length;
      setPhase("feedback");
      setTimeout(() => onRoundComplete(accuracy, reactionTime), 2000);
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
        <div className="text-center animate-scale-in" key={`show-${roundKey}`}>
          <p className="text-xs text-muted mb-4">
            Memorize the sequence{isReverse ? " (you'll enter it backwards)" : ""}
          </p>
          <div className="w-28 h-28 flex items-center justify-center bg-surface rounded-3xl border-2 border-primary/30 mx-auto">
            {currentShowIndex < sequence.length && (
              <span className="text-4xl font-bold text-primary animate-scale-in" key={`item-${currentShowIndex}`}>
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

// ---- Grid Pattern sub-component ----

function GridPatternRecall({
  config,
  round,
  onRoundComplete,
}: {
  config: ReturnType<typeof getMemoryConfig>;
  round: number;
  onRoundComplete: (accuracy: number, reactionTime: number) => void;
}) {
  const cellCount = Math.min(config.sequenceLength + 1, GRID_SIZE * GRID_SIZE - 2);
  const [phase, setPhase] = useState<Phase>("showing");
  const [roundKey, setRoundKey] = useState(0);

  const patternRef = useRef<number[]>(generateGridPattern(cellCount));
  const [showIndex, setShowIndex] = useState(0);
  const [userSelected, setUserSelected] = useState<Set<number>>(new Set());
  const [roundStartTime, setRoundStartTime] = useState(0);

  const pattern = patternRef.current;

  useEffect(() => {
    patternRef.current = generateGridPattern(cellCount);
    setShowIndex(0);
    setUserSelected(new Set());
    setPhase("showing");
    setRoundKey((k) => k + 1);
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate pattern display: highlight cells one by one
  useEffect(() => {
    if (phase !== "showing") return;

    if (showIndex >= pattern.length) {
      setPhase("delay");
      const timer = setTimeout(() => {
        setPhase("recall");
        setRoundStartTime(performance.now());
      }, config.delayMs);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setShowIndex((prev) => prev + 1);
    }, config.displayTimePerItemMs);

    return () => clearTimeout(timer);
  }, [phase, showIndex, pattern.length, config, roundKey]);

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
    const accuracy = pattern.length > 0 ? correct / pattern.length : 0;
    setPhase("feedback");
    setTimeout(() => onRoundComplete(accuracy, reactionTime), 2000);
  };

  const handleSkip = () => {
    setPhase("feedback");
    setTimeout(() => onRoundComplete(0, 10000), 1500);
  };

  const getCellClass = (index: number) => {
    if (phase === "showing") {
      const isHighlighted = pattern.slice(0, showIndex).includes(index);
      return isHighlighted ? "bg-primary" : "bg-surface-lighter";
    }
    if (phase === "delay") return "bg-surface-lighter";
    if (phase === "recall") {
      return userSelected.has(index) ? "bg-primary" : "bg-surface-lighter";
    }
    // feedback
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
        <div className="text-center animate-fade-in" key={`grid-show-${roundKey}`}>
          <p className="text-xs text-muted mb-4">Memorize the pattern</p>
        </div>
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
          <Button
            variant="ghost" size="sm" onClick={handleSkip} className="text-muted"
          >
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
  const config = getMemoryConfig(difficulty, streak);

  const chosenVariant = useMemo(
    () => variant || MEMORY_VARIANTS[Math.floor(Math.random() * MEMORY_VARIANTS.length)],
    [variant]
  );
  const variantInfo = VARIANT_INFO[chosenVariant];

  const [round, setRound] = useState(0);
  const reactionTimes = useRef<number[]>([]);
  const accuracies = useRef<number[]>([]);

  const handleRoundComplete = (accuracy: number, reactionTime: number) => {
    reactionTimes.current.push(reactionTime);
    accuracies.current.push(accuracy);

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
    }
  };

  return (
    <ModuleShell
      title={variantInfo.title}
      description={variantInfo.description}
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
    >
      {chosenVariant === "grid_pattern" ? (
        <GridPatternRecall
          config={config}
          round={round}
          onRoundComplete={handleRoundComplete}
        />
      ) : (
        <SequenceRecall
          config={config}
          isReverse={chosenVariant === "reverse"}
          round={round}
          onRoundComplete={handleRoundComplete}
        />
      )}
    </ModuleShell>
  );
}
