type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "accent";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-elevated text-fg-muted",
  success: "bg-status-green text-status-green-fg",
  warning: "bg-status-amber text-status-amber-fg",
  error: "bg-status-red text-status-red-fg",
  info: "bg-status-blue text-status-blue-fg",
  accent: "bg-accent-soft text-accent-fg",
};

export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-0.5 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
