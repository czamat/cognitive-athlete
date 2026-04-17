interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`
        bg-surface rounded-2xl border border-surface-lighter
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
