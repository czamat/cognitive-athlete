interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  color?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export default function ProgressBar({
  value,
  max,
  label,
  showValue = false,
  color = "bg-primary",
  size = "md",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-muted">{label}</span>}
          {showValue && (
            <span className="text-xs text-muted font-mono">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${sizeClasses[size]} bg-surface-lighter rounded-full overflow-hidden`}>
        <div
          className={`${sizeClasses[size]} ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
