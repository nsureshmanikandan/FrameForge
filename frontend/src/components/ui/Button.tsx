import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants = {
  primary:
    "bg-accent hover:bg-accent-dim text-white font-semibold shadow-lg shadow-accent/20 hover:shadow-accent/30 disabled:bg-accent/40",
  secondary:
    "bg-surface-2 hover:bg-border text-foreground border border-border hover:border-foreground-muted disabled:opacity-40",
  ghost:
    "bg-transparent hover:bg-surface text-foreground-muted hover:text-foreground disabled:opacity-40",
  danger:
    "bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 hover:border-destructive/60 disabled:opacity-40",
  outline:
    "bg-transparent hover:bg-surface border border-border hover:border-foreground-muted text-foreground disabled:opacity-40",
};

const sizes = {
  sm: "h-7 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2.5",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "cursor-pointer disabled:cursor-not-allowed select-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === "lg" ? 18 : 14} aria-hidden />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
