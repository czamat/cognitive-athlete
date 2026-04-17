"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkout } from "@/hooks/useWorkout";
import { ModuleIntro } from "@/components/modules/ModuleShell";
import ProcessingSpeed from "@/components/modules/ProcessingSpeed";
import AttentionControl from "@/components/modules/AttentionControl";
import WorkingMemory from "@/components/modules/WorkingMemory";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getUser } from "@/lib/storage";

const MODULE_INFO = [
  {
    icon: "⚡",
    title: "Processing Speed",
    description: "A symbol will flash briefly. Identify it from the options as fast as you can.",
  },
  {
    icon: "🎯",
    title: "Attention Control",
    description: "Track the highlighted dots as they move. Select them when they stop.",
  },
  {
    icon: "🧠",
    title: "Working Memory",
    description: "Memorize a sequence of items and recall them in order.",
  },
];

export default function WorkoutPage() {
  const router = useRouter();
  const workout = useWorkout();
  const [difficulties, setDifficulties] = useState({
    processing_speed: 1,
    attention: 1,
    memory: 1,
  });

  useEffect(() => {
    const user = getUser();
    setDifficulties({
      processing_speed: user.processingSpeedDifficulty,
      attention: user.attentionDifficulty,
      memory: user.memoryDifficulty,
    });
    workout.startWorkout();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (workout.phase === "idle") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (workout.phase === "module_intro") {
    const info = MODULE_INFO[workout.currentModuleIndex];
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
        onComplete={workout.completeModule}
      />
    );
  }

  if (workout.phase === "attention") {
    return (
      <AttentionControl
        difficulty={difficulties.attention}
        onComplete={workout.completeModule}
      />
    );
  }

  if (workout.phase === "memory") {
    return (
      <WorkingMemory
        difficulty={difficulties.memory}
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

    const moduleNames = ["Processing Speed", "Attention Control", "Working Memory"];
    const moduleIcons = ["⚡", "🎯", "🧠"];

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
                <p className="text-sm font-medium">{moduleNames[i]}</p>
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
