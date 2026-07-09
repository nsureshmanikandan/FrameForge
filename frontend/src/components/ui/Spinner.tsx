import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizes = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-8 w-8 border-[3px]" };

export function Spinner({ size = "md", className, label = "Loading…" }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn("inline-block", className)}>
      <span
        className={cn(
          "block rounded-full border-border border-t-accent animate-spin",
          sizes[size]
        )}
      />
    </span>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-3.5 rounded bg-gradient-to-r from-surface via-surface-2 to-surface animate-shimmer bg-[length:200%_100%]",
        className
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-gradient-to-r from-surface via-surface-2 to-surface animate-shimmer bg-[length:200%_100%]",
        className
      )}
    />
  );
}
