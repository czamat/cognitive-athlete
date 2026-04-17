"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAttentionConfig } from "@/lib/difficulty";
import ModuleShell from "./ModuleShell";
import type { ModuleResult } from "@/hooks/useWorkout";

const TOTAL_ROUNDS = 5;
const ARENA_SIZE = 320;
const DOT_RADIUS = 14;

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isTarget: boolean;
  id: number;
}

type Phase = "highlight" | "tracking" | "select" | "feedback";

interface AttentionControlProps {
  difficulty: number;
  streak?: number;
  onComplete: (result: ModuleResult) => void;
}

export default function AttentionControl({ difficulty, streak = 0, onComplete }: AttentionControlProps) {
  const config = getAttentionConfig(difficulty, streak);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("highlight");
  const [dots, setDots] = useState<Dot[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [roundStartTime, setRoundStartTime] = useState(0);

  const reactionTimes = useRef<number[]>([]);
  const accuracies = useRef<number[]>([]);
  const animFrameRef = useRef<number>(0);
  const dotsRef = useRef<Dot[]>([]);

  const initDots = useCallback(() => {
    const newDots: Dot[] = [];
    for (let i = 0; i < config.totalDots; i++) {
      newDots.push({
        id: i,
        x: DOT_RADIUS + Math.random() * (ARENA_SIZE - DOT_RADIUS * 2),
        y: DOT_RADIUS + Math.random() * (ARENA_SIZE - DOT_RADIUS * 2),
        vx: (Math.random() - 0.5) * config.movementSpeed * 2,
        vy: (Math.random() - 0.5) * config.movementSpeed * 2,
        isTarget: i < config.targetDots,
      });
    }
    dotsRef.current = newDots;
    setDots([...newDots]);
    setSelected(new Set());
    setPhase("highlight");

    setTimeout(() => {
      setPhase("tracking");
      startAnimation();
      setTimeout(() => {
        cancelAnimationFrame(animFrameRef.current);
        setPhase("select");
        setRoundStartTime(performance.now());
      }, config.trackingDurationMs);
    }, 2000);
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAnimation = useCallback(() => {
    const animate = () => {
      const current = dotsRef.current;
      for (const dot of current) {
        dot.x += dot.vx;
        dot.y += dot.vy;

        if (dot.x <= DOT_RADIUS || dot.x >= ARENA_SIZE - DOT_RADIUS) {
          dot.vx *= -1;
          dot.x = Math.max(DOT_RADIUS, Math.min(ARENA_SIZE - DOT_RADIUS, dot.x));
        }
        if (dot.y <= DOT_RADIUS || dot.y >= ARENA_SIZE - DOT_RADIUS) {
          dot.vy *= -1;
          dot.y = Math.max(DOT_RADIUS, Math.min(ARENA_SIZE - DOT_RADIUS, dot.y));
        }
      }
      setDots([...current]);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    initDots();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDotClick = (dotId: number) => {
    if (phase !== "select") return;

    const newSelected = new Set(selected);
    if (newSelected.has(dotId)) {
      newSelected.delete(dotId);
    } else if (newSelected.size < config.targetDots) {
      newSelected.add(dotId);
    }
    setSelected(newSelected);

    if (newSelected.size === config.targetDots) {
      const reactionTime = performance.now() - roundStartTime;
      reactionTimes.current.push(reactionTime);

      let correctSelections = 0;
      for (const id of newSelected) {
        if (dots.find((d) => d.id === id)?.isTarget) {
          correctSelections++;
        }
      }
      const roundAccuracy = correctSelections / config.targetDots;
      accuracies.current.push(roundAccuracy);

      setPhase("feedback");

      setTimeout(() => {
        const nextRound = round + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          const avgReactionTime =
            reactionTimes.current.reduce((a, b) => a + b, 0) / reactionTimes.current.length;
          const avgAccuracy =
            accuracies.current.reduce((a, b) => a + b, 0) / accuracies.current.length;

          onComplete({
            moduleType: "attention",
            avgReactionTime: Math.round(avgReactionTime),
            accuracy: avgAccuracy,
            difficultyLevel: difficulty,
            roundsCompleted: TOTAL_ROUNDS,
          });
        } else {
          setRound(nextRound);
          initDots();
        }
      }, 1500);
    }
  };

  const getDotColor = (dot: Dot) => {
    if (phase === "highlight") {
      return dot.isTarget ? "bg-accent" : "bg-surface-lighter";
    }
    if (phase === "tracking") {
      return "bg-foreground/60";
    }
    if (phase === "select") {
      return selected.has(dot.id) ? "bg-primary" : "bg-foreground/60";
    }
    // feedback
    if (dot.isTarget && selected.has(dot.id)) return "bg-success";
    if (dot.isTarget && !selected.has(dot.id)) return "bg-warning";
    if (!dot.isTarget && selected.has(dot.id)) return "bg-danger";
    return "bg-surface-lighter";
  };

  return (
    <ModuleShell
      title="Attention Control"
      description="Track the highlighted targets"
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
    >
      <p className="text-xs text-muted mb-3 text-center">
        {phase === "highlight" && "Remember the highlighted dots"}
        {phase === "tracking" && "Keep tracking them..."}
        {phase === "select" && `Select ${config.targetDots} target dots`}
        {phase === "feedback" && "Results"}
      </p>

      <div
        className="relative bg-surface rounded-3xl border border-surface-lighter overflow-hidden touch-manipulation"
        style={{ width: ARENA_SIZE, height: ARENA_SIZE }}
      >
        {dots.map((dot) => (
          <button
            key={dot.id}
            onClick={() => handleDotClick(dot.id)}
            disabled={phase !== "select"}
            className={`absolute rounded-full transition-colors duration-200 ${getDotColor(dot)} ${
              phase === "select" ? "cursor-pointer" : "cursor-default"
            }`}
            style={{
              width: DOT_RADIUS * 2,
              height: DOT_RADIUS * 2,
              left: dot.x - DOT_RADIUS,
              top: dot.y - DOT_RADIUS,
              transform: phase === "highlight" && dot.isTarget ? "scale(1.2)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </ModuleShell>
  );
}
