"use client";

import Card from "../ui/Card";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakCounter({ currentStreak, longestStreak }: StreakCounterProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/10">
        <span className="text-3xl">🔥</span>
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-warning">{currentStreak}</span>
          <span className="text-sm text-muted">day streak</span>
        </div>
        <div className="text-xs text-muted mt-0.5">
          Best: {longestStreak} days
        </div>
      </div>
    </Card>
  );
}
