"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import StreakCounter from "@/components/dashboard/StreakCounter";
import StatsOverview from "@/components/dashboard/StatsOverview";
import ProgressChart from "@/components/dashboard/ProgressChart";
import { getUserWithLevel, getStats } from "@/lib/storage";

interface UserData {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
}

interface StatsData {
  chartData: { date: string; cognitive_score: number }[];
  lastSession: {
    module_type: string;
    avg_reaction_time: number;
    accuracy: number;
    score: number;
  }[];
  totalSessions: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUserWithLevel();
    setUser({
      level: u.level,
      currentXp: u.currentXp,
      nextLevelXp: u.nextLevelXp,
      totalXp: u.totalXp,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
    });
    setStats(getStats());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-6 gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cognitive Athlete</h1>
          <p className="text-sm text-muted mt-0.5">Train your brain daily</p>
        </div>
        {user && (
          <div className="flex items-center gap-2 bg-surface rounded-full px-3 py-1.5">
            <span className="text-xs text-muted">LVL</span>
            <span className="text-sm font-bold text-primary">{user.level}</span>
          </div>
        )}
      </div>

      {user && (
        <ProgressBar
          value={user.currentXp}
          max={user.nextLevelXp}
          label={`Level ${user.level}`}
          showValue
          size="sm"
        />
      )}

      <Link href="/workout" className="block">
        <Button variant="primary" size="xl" fullWidth className="animate-pulse-glow">
          <span className="mr-2 text-xl">⚡</span>
          Start Brain Workout
        </Button>
      </Link>

      {user && (
        <StreakCounter
          currentStreak={user.currentStreak}
          longestStreak={user.longestStreak}
        />
      )}

      {stats && (
        <StatsOverview
          lastSession={stats.lastSession}
          totalSessions={stats.totalSessions}
        />
      )}

      {stats && <ProgressChart data={stats.chartData} />}
    </main>
  );
}
