"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProcessingSpeed from "@/components/modules/ProcessingSpeed";
import AttentionControl from "@/components/modules/AttentionControl";
import WorkingMemory from "@/components/modules/WorkingMemory";
import Button from "@/components/ui/Button";
import type { ModuleResult } from "@/hooks/useWorkout";

type TestModule = "menu" | "processing_speed" | "attention" | "memory";

export default function TestPage() {
  const router = useRouter();
  const [active, setActive] = useState<TestModule>("menu");
  const [lastResult, setLastResult] = useState<ModuleResult | null>(null);

  const handleComplete = (result: ModuleResult) => {
    setLastResult(result);
    setActive("menu");
  };

  if (active === "processing_speed") {
    return <ProcessingSpeed difficulty={1} streak={0} onComplete={handleComplete} />;
  }

  if (active === "attention") {
    return <AttentionControl difficulty={1} streak={0} variant="classic" onComplete={handleComplete} />;
  }

  if (active === "memory") {
    return <WorkingMemory difficulty={1} streak={0} onComplete={handleComplete} />;
  }

  return (
    <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-8 gap-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold">Test Individual Games</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          Dashboard
        </Button>
      </div>

      <p className="text-sm text-muted mb-4">
        Tap a game to launch it directly. Results appear here when done.
      </p>

      <Button size="lg" fullWidth onClick={() => setActive("processing_speed")}>
        <span className="mr-2">⚡</span> Processing Speed
      </Button>

      <Button size="lg" fullWidth onClick={() => setActive("attention")}>
        <span className="mr-2">🎯</span> Attention Control
      </Button>

      <Button size="lg" fullWidth onClick={() => setActive("memory")}>
        <span className="mr-2">🧠</span> Working Memory
      </Button>

      {lastResult && (
        <div className="mt-6 p-4 bg-surface rounded-2xl border border-surface-lighter">
          <h2 className="text-sm font-bold mb-2">Last Result</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted">Module:</div>
            <div className="font-mono">{lastResult.moduleType}</div>
            <div className="text-muted">Accuracy:</div>
            <div className="font-mono">{Math.round(lastResult.accuracy * 100)}%</div>
            <div className="text-muted">Avg RT:</div>
            <div className="font-mono">{lastResult.avgReactionTime}ms</div>
            <div className="text-muted">Rounds:</div>
            <div className="font-mono">{lastResult.roundsCompleted}</div>
          </div>
        </div>
      )}
    </main>
  );
}
