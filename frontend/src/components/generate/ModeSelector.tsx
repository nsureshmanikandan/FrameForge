import { Layers, Puzzle, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import type { GenerationMode, GenerationStack } from "@/types";

const modes: { id: GenerationMode; icon: React.ElementType; label: string; desc: string }[] = [
  {
    id: "scaffold",
    icon: Layers,
    label: "Full Scaffold",
    desc: "Complete repo: React + FastAPI",
  },
  {
    id: "component",
    icon: Puzzle,
    label: "Component + API",
    desc: "One component, one endpoint",
  },
  {
    id: "prompt_edit",
    icon: Edit3,
    label: "Prompt Editor",
    desc: "Edit prompt before generating",
  },
];

const stacks: { id: GenerationStack; label: string }[] = [
  { id: "react_typescript", label: "React + TypeScript" },
  { id: "nextjs", label: "Next.js 14" },
];

export function ModeSelector() {
  const { mode, setMode, stack, setStack } = useStore();

  return (
    <section className="flex flex-col gap-4" aria-label="Generation mode and stack">
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Generation Mode</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Mode">
          {modes.map(({ id, icon: Icon, label, desc }) => {
            const selected = mode === id;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(id)}
                className={cn(
                  "flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left min-w-0",
                  "transition-all duration-150 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  selected
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border bg-surface hover:border-foreground-muted text-foreground-muted hover:text-foreground"
                )}
              >
                <Icon
                  size={14}
                  aria-hidden
                  className={selected ? "text-accent" : "text-foreground-muted"}
                />
                <span className="text-[11px] font-semibold leading-tight">{label}</span>
                <span className="text-[10px] opacity-60 leading-tight">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Target Stack</h2>
        <div className="flex gap-2" role="radiogroup" aria-label="Stack">
          {stacks.map(({ id, label }) => {
            const selected = stack === id;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={selected}
                onClick={() => setStack(id)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border text-xs font-medium text-center",
                  "transition-all duration-150 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  selected
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border bg-surface text-foreground-muted hover:border-foreground-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
