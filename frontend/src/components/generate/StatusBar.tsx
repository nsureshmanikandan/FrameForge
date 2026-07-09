import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerateStatus } from "@/types";

interface StatusBarProps {
  status: GenerateStatus;
  fileCount: number;
  totalLines: number;
  currentFile: string;
}

const steps: { key: GenerateStatus; label: string }[] = [
  { key: "inspecting", label: "Inspecting Figma" },
  { key: "building_prompt", label: "Building Prompt" },
  { key: "generating", label: "Generating Files" },
  { key: "done", label: "Complete" },
];

export function StatusBar({ status, fileCount, totalLines, currentFile }: StatusBarProps) {
  if (status === "idle") return null;

  const isError = status === "error";
  const isDone = status === "done";
  const stepIndex = steps.findIndex((s) => s.key === status);
  const currentStep = steps[Math.max(0, stepIndex)];

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-2.5 flex items-center justify-between gap-4 animate-slide-in flex-shrink-0",
        isError ? "border-destructive/40 bg-destructive/5"
          : isDone ? "border-accent/30 bg-accent/5"
          : "border-border bg-surface"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isError ? (
          <AlertCircle size={14} className="text-destructive flex-shrink-0" aria-hidden />
        ) : isDone ? (
          <CheckCircle2 size={14} className="text-accent flex-shrink-0" aria-hidden />
        ) : (
          <Loader2 size={14} className="text-accent animate-spin flex-shrink-0" aria-hidden />
        )}
        <span className="text-sm font-medium text-foreground flex-shrink-0">
          {isError ? "Generation failed" : currentStep?.label ?? status}
        </span>
        {status === "generating" && currentFile && (
          <span className="text-xs text-foreground-muted font-mono truncate hidden sm:block">
            → {currentFile}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {(status === "generating" || isDone) && (
          <div className="flex gap-3 text-xs font-mono text-foreground-muted">
            <span><span className="text-info">{fileCount}</span> files</span>
            <span><span className="text-accent">{totalLines}</span> lines</span>
          </div>
        )}
        <div className="hidden sm:flex items-center gap-1" aria-hidden>
          {steps.map((step, i) => (
            <div
              key={step.key}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                i < stepIndex || isDone ? "bg-accent"
                  : i === stepIndex && !isError ? "bg-accent animate-pulse"
                  : "bg-border"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
