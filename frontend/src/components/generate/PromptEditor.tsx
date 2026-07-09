import { useState } from "react";
import { Edit3, RefreshCw, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Spinner";
import { generateApi } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PromptEditor() {
  const { figmaUrl, mode, stack, customPrompt, setCustomPrompt } = useStore();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (mode !== "prompt_edit") return null;

  async function handleBuild() {
    if (!figmaUrl) {
      toast.error("Inspect a Figma URL first");
      return;
    }
    setLoading(true);
    try {
      const res = await generateApi.buildPrompt(figmaUrl, mode, stack);
      setCustomPrompt(res.prompt);
      toast.success("Prompt built — edit it then generate");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to build prompt";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!customPrompt) return;
    await navigator.clipboard.writeText(customPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="flex flex-col gap-3 animate-fade-in" aria-label="Prompt editor">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 size={14} className="text-accent" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Prompt Editor</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!customPrompt}
            leftIcon={copied ? <CheckCheck size={12} className="text-accent" /> : <Copy size={12} />}
            aria-label="Copy prompt"
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBuild}
            loading={loading}
            leftIcon={<RefreshCw size={12} />}
            aria-label="Rebuild prompt from Figma"
          >
            {loading ? "Building…" : "Rebuild"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={
            customPrompt
              ? ""
              : 'Click "Rebuild" to generate a prompt from your Figma design, then customise it…'
          }
          className={cn(
            "w-full min-h-[200px] rounded-lg border border-border bg-surface px-3 py-3",
            "text-sm text-foreground font-mono leading-relaxed resize-y",
            "placeholder:text-foreground-muted/50 focus:outline-none",
            "focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors duration-150"
          )}
          aria-label="GPT-4o prompt — edit before generating"
          spellCheck={false}
        />
      )}
      <p className="text-xs text-foreground-muted">
        This prompt goes directly to Azure GPT-4o. Edit any section to customise the output.
      </p>
    </section>
  );
}
