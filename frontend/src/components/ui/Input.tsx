import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground-muted"
        >
          {label}
          {props.required && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-foreground-muted pointer-events-none" aria-hidden>
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full rounded-lg bg-surface border border-border text-foreground",
            "placeholder:text-foreground-muted/50 text-sm h-10",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            leftIcon ? "pl-10" : "pl-3",
            rightElement ? "pr-10" : "pr-3",
            error && "border-destructive focus:ring-destructive/50 focus:border-destructive",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3">{rightElement}</span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-destructive flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-foreground-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
