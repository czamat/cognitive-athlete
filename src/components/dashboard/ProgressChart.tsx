"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import Card from "../ui/Card";

interface ProgressChartProps {
  data: { date: string; cognitive_score: number }[];
}

export default function ProgressChart({ data }: ProgressChartProps) {
  if (data.length < 2) {
    return (
      <Card className="flex items-center justify-center h-48">
        <p className="text-sm text-muted">
          Complete at least 2 sessions to see your progress chart
        </p>
      </Card>
    );
  }

  const formatted = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: Math.round(d.cognitive_score),
  }));

  return (
    <Card padding="sm">
      <h3 className="text-xs text-muted uppercase tracking-wider mb-3 px-2">
        Cognitive Score
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={formatted} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#737373" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#737373" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#1e1e1e",
              border: "1px solid #2a2a2a",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#737373" }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ fill: "#6366f1", r: 3 }}
            activeDot={{ r: 5, fill: "#818cf8" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
