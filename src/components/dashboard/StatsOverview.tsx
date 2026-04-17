"use client";

import StatCard from "../ui/StatCard";

interface StatsOverviewProps {
  lastSession: {
    module_type: string;
    avg_reaction_time: number;
    accuracy: number;
    score: number;
  }[];
  totalSessions: number;
}

export default function StatsOverview({ lastSession, totalSessions }: StatsOverviewProps) {
  const avgReaction =
    lastSession.length > 0
      ? Math.round(
          lastSession.reduce((sum, m) => sum + m.avg_reaction_time, 0) /
            lastSession.length
        )
      : 0;

  const avgAccuracy =
    lastSession.length > 0
      ? Math.round(
          (lastSession.reduce((sum, m) => sum + m.accuracy, 0) /
            lastSession.length) *
            100
        )
      : 0;

  const avgScore =
    lastSession.length > 0
      ? Math.round(
          lastSession.reduce((sum, m) => sum + m.score, 0) / lastSession.length
        )
      : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="Reaction"
        value={avgReaction || "—"}
        unit={avgReaction ? "ms" : ""}
      />
      <StatCard
        label="Accuracy"
        value={avgAccuracy || "—"}
        unit={avgAccuracy ? "%" : ""}
      />
      <StatCard
        label="Focus Score"
        value={avgScore || "—"}
      />
      <StatCard
        label="Sessions"
        value={totalSessions}
      />
    </div>
  );
}
