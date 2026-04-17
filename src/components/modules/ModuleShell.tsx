"use client";

import { useState, useEffect } from "react";
import Button from "../ui/Button";

interface ModuleShellProps {
  title: string;
  description: string;
  round: number;
  totalRounds: number;
  children: React.ReactNode;
}

export default function ModuleShell({
  title,
  description,
  round,
  totalRounds,
  children,
}: ModuleShellProps) {
  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-6 animate-fade-in">
      {/* Module Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <div className="bg-surface rounded-full px-3 py-1 text-sm font-mono">
          {round}/{totalRounds}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mb-6">
        {Array.from({ length: totalRounds }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < round ? "bg-primary" : "bg-surface-lighter"
            }`}
          />
        ))}
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

interface ModuleIntroProps {
  title: string;
  description: string;
  icon: string;
  moduleNumber: number;
  onStart: () => void;
}

export function ModuleIntro({ title, description, icon, moduleNumber, onStart }: ModuleIntroProps) {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      onStart();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onStart]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4 animate-scale-in">
      {countdown !== null ? (
        <div className="text-8xl font-bold text-primary animate-scale-in">
          {countdown}
        </div>
      ) : (
        <>
          <div className="text-xs text-muted uppercase tracking-widest mb-2">
            Module {moduleNumber} of 3
          </div>
          <div className="text-6xl mb-4">{icon}</div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-sm text-muted text-center mb-8 max-w-xs">
            {description}
          </p>
          <Button size="lg" onClick={() => setCountdown(3)}>
            Ready
          </Button>
        </>
      )}
    </div>
  );
}
