"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWorkout } from "@/hooks/useWorkout";
import { ModuleIntro } from "@/components/modules/ModuleShell";
import ProcessingSpeed, { PROCESSING_SPEED_VARIANTS } from "@/components/modules/ProcessingSpeed";
import AttentionControl, { ATTENTION_VARIANTS } from "@/components/modules/AttentionControl";
import WorkingMemory, { MEMORY_VARIANTS } from "@/components/modules/WorkingMemory";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getUser } from "@/lib/storage";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const VARIANT_DESCRIPTIONS: Record<string, { icon: string; title: string; description: string }> = {
  // Processing Speed
  symbol_match: { icon: "⚡", title: "Symbol Match", description: "A symbol will flash briefly. Identify it from the options." },
  number_compare: { icon: "⚡", title: "Number Compare", description: "Two numbers will flash. Pick the larger one quickly." },
  color_match: { icon: "⚡", title: "Color Match", description: "A color will flash briefly. Pick the matching color." },
  arrow_direction: { icon: "⚡", title: "Arrow Direction", description: "An arrow will flash. Remember which direction it pointed." },
  // Attention
  classic: { icon: "🎯", title: "Dot Tracking", description: "Track the highlighted dots as they move around." },
  distractor_flash: { icon: "🎯", title: "Focus Tracking", description: "Track targets through distracting screen flashes." },
  // Memory
  sequence: { icon: "🧠", title: "Sequence Recall", description: "Memorize a sequence and enter it in order." },
  reverse: { icon: "🧠", title: "Reverse Recall", description: "Memorize a sequence and enter it backwards." },
  grid_pattern: { icon: "🧠", title: "Pattern Recall", description: "Memorize a grid pattern and reproduce it." },
};

export default function WorkoutPage() {
  const router = useRouter();
  const workout = useWorkout();
  const [difficulties, setDifficulties] = useState({
    processing_speed: 1,
    attention: 1,
    memory: 1,
  });
  const [streak, setStreak] = useState(0);

  // Pick random variants once per session
  const variants = useMemo(() => ({
    processingSpeed: pickRandom(PROCESSING_SPEED_VARIANTS),
    attention: pickRandom(ATTENTION_VARIANTS),
    memory: pickRandom(MEMORY_VARIANTS),
  }), []);

  useEffect(() => {
    const user = getUser();
    setDifficulties({
      processing_speed: user.processingSpeedDifficulty,
      attention: user.attentionDifficulty,
      memory: user.memoryDifficulty,
    });
    setStreak(user.currentStreak);
    workout.startWorkout();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getModuleIntroInfo = (moduleIndex: number) => {
    const variantKeys = [variants.processingSpeed, variants.attention, variants.memory];
    const key = variantKeys[moduleIndex];
    return VARIANT_DESCRIPTIONS[key] || { icon: "🧠", title: "Module", description: "" };
  };

  if (workout.phase === "idle") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (workout.phase === "module_intro") {
    const info = getModuleIntroInfo(workout.currentModuleIndex);
    return (
      <ModuleIntro
        title={info.title}
        description={info.description}
        icon={info.icon}
        moduleNumber={workout.currentModuleIndex + 1}
        onStart={workout.startCurrentModule}
      />
    );
  }

  if (workout.phase === "processing_speed") {
    return (
      <ProcessingSpeed
        difficulty={difficulties.processing_speed}
        streak={streak}
        variant={variants.processingSpeed}
        onComplete={workout.completeModule}
      />
    );
  }

  if (workout.phase === "attention") {
    return (
      <AttentionControl
        difficulty={difficulties.attention}
        streak={streak}
        variant={variants.attention}
        onComplete={workout.completeModule}
      />
    );
  }

  if (workout.phase === "memory") {
    return (
      <WorkingMemory
        difficulty={difficulties.memory}
        streak={streak}
        variant={variants.memory}
        onComplete={workout.completeModule}
      />
    );
  }

  if (workout.phase === "complete") {
    const result = workout.sessionResult;

    if (workout.isSubmitting || !result) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted">Saving results...</p>
          </div>
        </div>
      );
    }

    const moduleIcons = ["⚡", "🎯", "🧠"];
    const variantKeys = [variants.processingSpeed, variants.attention, variants.memory];

    return (
      <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-6 animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold mb-1">Workout Complete!</h1>
          <p className="text-sm text-muted">Great work on today&apos;s session</p>
        </div>

        <Card className="text-center mb-6" padding="lg">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Cognitive Score</p>
          <p className="text-5xl font-bold text-primary">{result.cognitiveScore}</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div>
              <p className="text-xs text-muted">XP Earned</p>
              <p className="text-lg font-bold text-accent">+{result.xpGain}</p>
            </div>
            <div className="w-px h-8 bg-surface-lighter" />
            <div>
              <p className="text-xs text-muted">Streak</p>
              <p className="text-lg font-bold text-warning">{result.newStreak} 🔥</p>
            </div>
          </div>
        </Card>

        <div className="space-y-3 mb-8">
          {workout.results.map((mod, i) => (
            <Card key={i} className="flex items-center gap-3">
              <span className="text-2xl">{moduleIcons[i]}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {VARIANT_DESCRIPTIONS[variantKeys[i]]?.title || "Module"}
                </p>
                <div className="flex gap-3 text-xs text-muted mt-0.5">
                  <span>Accuracy: {Math.round(mod.accuracy * 100)}%</span>
                  <span>RT: {mod.avgReactionTime}ms</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  {result.moduleScores[i]}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <Button
          size="lg"
          fullWidth
          onClick={() => router.push("/")}
        >
          Back to Dashboard
        </Button>
      </main>
    );
  }

  return null;
}
