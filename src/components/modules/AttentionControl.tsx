"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getAttentionConfig } from "@/lib/difficulty";
import ModuleShell from "./ModuleShell";
import type { ModuleResult } from "@/hooks/useWorkout";

const TOTAL_ROUNDS = 5;
const ARENA_SIZE = 320;
const DOT_RADIUS = 12;
const MIN_DISTANCE = DOT_RADIUS * 3.5;

type AttentionVariant = "classic" | "color_tracking" | "distractor_flash";

export const ATTENTION_VARIANTS: AttentionVariant[] = [
  "classic", "color_tracking", "distractor_flash",
];

const VARIANT_INFO: Record<AttentionVariant, { title: string; description: string }> = {
  classic: { title: "Dot Tracking", description: "Track the highlighted targets" },
  color_tracking: { title: "Color Tracking", description: "Track dots by their starting color" },
  distractor_flash: { title: "Focus Tracking", description: "Track targets through distracting flashes" },
};

const DOT_COLORS = [
  { name: "red", highlight: "bg-red-500", dim: "bg-red-500/40" },
  { name: "blue", highlight: "bg-blue-500", dim: "bg-blue-500/40" },
  { name: "green", highlight: "bg-green-500", dim: "bg-green-500/40" },
  { name: "yellow", highlight: "bg-yellow-400", dim: "bg-yellow-400/40" },
  { name: "purple", highlight: "bg-purple-500", dim: "bg-purple-500/40" },
  { name: "pink", highlight: "bg-pink-500", dim: "bg-pink-500/40" },
];

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isTarget: boolean;
  id: number;
  colorIndex?: number;
}

type Phase = "highlight" | "tracking" | "select" | "feedback";

interface AttentionControlProps {
  difficulty: number;
  streak?: number;
  variant?: AttentionVariant;
  onComplete: (result: ModuleResult) => void;
}

function spawnDots(count: number, targetCount: number, speed: number, useColors: boolean): Dot[] {
  const dots: Dot[] = [];
  const padding = DOT_RADIUS + 4;

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;

    do {
      x = padding + Math.random() * (ARENA_SIZE - padding * 2);
      y = padding + Math.random() * (ARENA_SIZE - padding * 2);
      attempts++;
    } while (
      attempts < 100 &&
      dots.some((d) => Math.hypot(d.x - x, d.y - y) < MIN_DISTANCE)
    );

    dots.push({
      id: i,
      x,
      y,
      vx: (Math.random() - 0.5) * speed * 2,
      vy: (Math.random() - 0.5) * speed * 2,
      isTarget: i < targetCount,
      colorIndex: useColors ? (i < targetCount ? 0 : 1 + (i % (DOT_COLORS.length - 1))) : undefined,
    });
  }

  return dots;
}

export default function AttentionControl({ difficulty, streak = 0, variant, onComplete }: AttentionControlProps) {
  const config = getAttentionConfig(difficulty, streak);

  const chosenVariant = useMemo(
    () => variant || ATTENTION_VARIANTS[Math.floor(Math.random() * ATTENTION_VARIANTS.length)],
    [variant]
  );
  const variantInfo = VARIANT_INFO[chosenVariant];
  const isColorMode = chosenVariant === "color_tracking";
  const isFlashMode = chosenVariant === "distractor_flash";

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("highlight");
  const [dots, setDots] = useState<Dot[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const [targetColorName, setTargetColorName] = useState("");

  const reactionTimes = useRef<number[]>([]);
  const accuracies = useRef<number[]>([]);
  const animFrameRef = useRef<number>(0);
  const dotsRef = useRef<Dot[]>([]);
  const flashTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const initDots = useCallback(() => {
    const newDots = spawnDots(config.totalDots, config.targetDots, config.movementSpeed, isColorMode);
    dotsRef.current = newDots;
    setDots([...newDots]);
    setSelected(new Set());
    setFlashActive(false);

    if (isColorMode) {
      setTargetColorName(DOT_COLORS[0].name);
    }

    setPhase("highlight");

    setTimeout(() => {
      setPhase("tracking");
      startAnimation();

      if (isFlashMode) {
        scheduleFlashes(config.trackingDurationMs);
      }

      setTimeout(() => {
        cancelAnimationFrame(animFrameRef.current);
        flashTimers.current.forEach(clearTimeout);
        setFlashActive(false);
        setPhase("select");
        setRoundStartTime(performance.now());
      }, config.trackingDurationMs);
    }, 2000);
  }, [config, isColorMode, isFlashMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleFlashes = (duration: number) => {
    flashTimers.current.forEach(clearTimeout);
    flashTimers.current = [];

    const flashCount = 2 + Math.floor(difficulty / 3);
    for (let i = 0; i < flashCount; i++) {
      const flashTime = Math.random() * (duration - 500);
      const t1 = setTimeout(() => setFlashActive(true), flashTime);
      const t2 = setTimeout(() => setFlashActive(false), flashTime + 200);
      flashTimers.current.push(t1, t2);
    }
  };

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

      for (let i = 0; i < current.length; i++) {
        for (let j = i + 1; j < current.length; j++) {
          const a = current[i];
          const b = current[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);

          if (dist < MIN_DISTANCE && dist > 0) {
            const overlap = MIN_DISTANCE - dist;
            const pushX = (dx / dist) * overlap * 0.5;
            const pushY = (dy / dist) * overlap * 0.5;

            a.x -= pushX;
            a.y -= pushY;
            b.x += pushX;
            b.y += pushY;

            a.x = Math.max(DOT_RADIUS, Math.min(ARENA_SIZE - DOT_RADIUS, a.x));
            a.y = Math.max(DOT_RADIUS, Math.min(ARENA_SIZE - DOT_RADIUS, a.y));
            b.x = Math.max(DOT_RADIUS, Math.min(ARENA_SIZE - DOT_RADIUS, b.x));
            b.y = Math.max(DOT_RADIUS, Math.min(ARENA_SIZE - DOT_RADIUS, b.y));
          }
        }
      }

      setDots([...current]);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    initDots();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      flashTimers.current.forEach(clearTimeout);
    };
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
    if (isColorMode) {
      const color = DOT_COLORS[dot.colorIndex ?? 0];
      if (phase === "highlight") return color.highlight;
      if (phase === "tracking") return color.dim;
      if (phase === "select") return selected.has(dot.id) ? "bg-primary" : "bg-foreground/40";
      if (dot.isTarget && selected.has(dot.id)) return "bg-success";
      if (dot.isTarget && !selected.has(dot.id)) return color.highlight;
      if (!dot.isTarget && selected.has(dot.id)) return "bg-danger";
      return "bg-surface-lighter";
    }

    if (phase === "highlight") return dot.isTarget ? "bg-accent" : "bg-surface-lighter";
    if (phase === "tracking") return "bg-foreground/60";
    if (phase === "select") return selected.has(dot.id) ? "bg-primary" : "bg-foreground/60";
    if (dot.isTarget && selected.has(dot.id)) return "bg-success";
    if (dot.isTarget && !selected.has(dot.id)) return "bg-warning";
    if (!dot.isTarget && selected.has(dot.id)) return "bg-danger";
    return "bg-surface-lighter";
  };

  const getHighlightInstruction = () => {
    if (isColorMode) return `Remember the ${targetColorName} dots`;
    return "Remember the highlighted dots";
  };

  return (
    <ModuleShell
      title={variantInfo.title}
      description={variantInfo.description}
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
    >
      <p className="text-xs text-muted mb-3 text-center">
        {phase === "highlight" && getHighlightInstruction()}
        {phase === "tracking" && "Keep tracking them..."}
        {phase === "select" && `Select ${config.targetDots} target dots`}
        {phase === "feedback" && "Results"}
      </p>

      <div
        className={`relative rounded-3xl border border-surface-lighter overflow-hidden touch-manipulation transition-colors duration-100 ${
          flashActive ? "bg-white/10" : "bg-surface"
        }`}
        style={{ width: ARENA_SIZE, height: ARENA_SIZE }}
      >
        {dots.map((dot) => (
          <button
            key={dot.id}
            onClick={() => handleDotClick(dot.id)}
            disabled={phase !== "select"}
            className={`absolute rounded-full ${getDotColor(dot)} ${
              phase === "select" ? "cursor-pointer z-10" : "cursor-default"
            }`}
            style={{
              width: DOT_RADIUS * 2,
              height: DOT_RADIUS * 2,
              left: dot.x - DOT_RADIUS,
              top: dot.y - DOT_RADIUS,
              transform: phase === "highlight" && dot.isTarget ? "scale(1.3)" : "scale(1)",
              transition: phase === "select" || phase === "feedback" ? "background-color 0.2s" : "none",
              padding: phase === "select" ? 8 : 0,
              margin: phase === "select" ? -8 : 0,
            }}
          />
        ))}
      </div>
    </ModuleShell>
  );
}
