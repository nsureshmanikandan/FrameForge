import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info" | "muted";
  className?: string;
}

const variants = {
  default: "bg-surface text-foreground-muted border border-border",
  success: "bg-accent/10 text-accent border border-accent/30",
  error: "bg-destructive/10 text-destructive border border-destructive/30",
  warning: "bg-warning/10 text-warning border border-warning/30",
  info: "bg-info/10 text-info border border-info/30",
  muted: "bg-muted text-foreground-muted border border-border",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
