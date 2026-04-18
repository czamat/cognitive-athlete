"use client";

interface PressureTimerBarProps {
  remainingMs: number;
  fraction: number;
  label?: string;
  className?: string;
}

export default function PressureTimerBar({
  remainingMs,
  fraction,
  label = "Time",
  className = "",
}: PressureTimerBarProps) {
  const secs = Math.max(0, remainingMs / 1000);
  const pct = Math.round(fraction * 100);
  const warn = fraction < 0.25;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center text-[10px] text-muted mb-1 uppercase tracking-wider">
        <span>{label}</span>
        <span className={`font-mono tabular-nums ${warn ? "text-warning" : ""}`}>
          {secs.toFixed(1)}s
        </span>
      </div>
      <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
            warn ? "bg-warning" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
