import { useRef, useState } from "react";
import { Zap, XCircle, RotateCcw, Download, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FigmaInput } from "@/components/generate/FigmaInput";
import { ModeSelector } from "@/components/generate/ModeSelector";
import { PromptEditor } from "@/components/generate/PromptEditor";
import { CodePreview } from "@/components/generate/CodePreview";
import { StatusBar } from "@/components/generate/StatusBar";
import { ExportPanel } from "@/components/generate/ExportPanel";
import { useStore } from "@/store/useStore";
import { streamGeneration } from "@/lib/api";
import type { GeneratedFile } from "@/types";
import { toast } from "sonner";

export function GeneratePage() {
  const {
    figmaUrl, mode, stack, customPrompt, status,
    setStatus, setGeneratedFiles, appendStreamingRaw,
    streamingRaw, generatedFiles,
    setErrorMsg, reset,
    generationId, setGenerationId,
    currentStreamingFile, setCurrentStreamingFile,
  } = useStore();

  const abortRef = useRef<AbortController | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);

  const canGenerate =
    figmaUrl.trim().length > 0 &&
    (status === "idle" || status === "done" || status === "error");

  function handleGenerate() {
    if (!figmaUrl.trim()) { toast.error("Paste a Figma URL first"); return; }
    if (mode === "prompt_edit" && !customPrompt.trim()) {
      toast.error("Build or write a prompt before generating"); return;
    }
    reset();
    setShowExport(false);
    abortRef.current = new AbortController();
    setStatus("inspecting");

    streamGeneration(
      { figma_url: figmaUrl, mode, stack, custom_prompt: customPrompt || undefined },
      (chunk) => {
        if (chunk.type === "meta") {
          try {
            const meta = JSON.parse(chunk.content);
            if (meta.id) setGenerationId(meta.id);
          } catch { /* ignore */ }
          setStatus("generating");
        } else if (["frontend", "backend", "other"].includes(chunk.type)) {
          setStatus("generating");
          appendStreamingRaw(chunk.content);
          if (chunk.file) setCurrentStreamingFile(chunk.file);
        }
      },
      (result) => {
        const files = result as unknown as GeneratedFile[];
        setGeneratedFiles(Array.isArray(files) ? files : []);
        setStatus("done");
        const count = Array.isArray(files) ? files.length : 0;
        toast.success(`Generated ${count} files — ready to export`);
      },
      (msg) => {
        setErrorMsg(msg);
        setStatus("error");
        toast.error(msg);
      },
      abortRef.current.signal
    );
  }

  function handleCancel() {
    abortRef.current?.abort();
    reset();
    toast.info("Generation cancelled");
  }

  const totalLines = generatedFiles.reduce(
    (acc, f) => acc + f.content.split("\n").length, 0
  );

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">

        {/* Main split */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left panel ── */}
          <div
            className={[
              "flex-shrink-0 flex flex-col border-r border-border bg-background transition-all duration-200 overflow-hidden",
              leftOpen ? "w-72 xl:w-80" : "w-0",
            ].join(" ")}
          >
            <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1 min-w-[272px]">
              <FigmaInput />
              <div className="border-t border-border" />
              <ModeSelector />
              {mode === "prompt_edit" && (
                <>
                  <div className="border-t border-border" />
                  <PromptEditor />
                </>
              )}
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">

            {/* Right top bar: collapse toggle + status */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-1 flex-shrink-0">
              <button
                onClick={() => setLeftOpen((o) => !o)}
                className="p-1.5 rounded-md text-foreground-muted/60 hover:text-foreground-muted hover:bg-muted transition-colors flex-shrink-0"
                aria-label={leftOpen ? "Hide controls" : "Show controls"}
                title={leftOpen ? "Collapse left panel" : "Expand left panel"}
              >
                {leftOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
              </button>
              <div className="flex-1 min-w-0">
                <StatusBar
                  status={status}
                  fileCount={generatedFiles.length}
                  totalLines={totalLines}
                  currentFile={currentStreamingFile}
                />
              </div>
            </div>

            {/* Code viewer — fills remaining height */}
            <div className="flex-1 min-h-0 px-3 pb-3 pt-1">
              <CodePreview
                files={generatedFiles}
                status={status}
                streamingRaw={streamingRaw}
                currentStreamingFile={currentStreamingFile}
              />
            </div>
          </div>
        </div>

        {/* ── Bottom action bar ── */}
        <div className="flex-shrink-0 border-t border-border bg-surface px-4 py-2.5 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
          <div className="text-xs text-foreground-muted font-mono min-w-0 truncate hidden sm:block">
            {status === "generating" && currentStreamingFile && (
              <span className="text-accent animate-pulse">▊ {currentStreamingFile.split("/").pop()}…</span>
            )}
            {status === "generating" && !currentStreamingFile && (
              <span className="text-accent animate-pulse">▊ Streaming via Azure GPT-4o…</span>
            )}
            {status === "done" && (
              <span className="text-accent">✓ {generatedFiles.length} files · {totalLines} lines</span>
            )}
            {status === "error" && (
              <span className="text-destructive">Generation failed — check settings</span>
            )}
            {status === "idle" && <span>Ready — inspect a Figma URL to begin</span>}
          </div>

          <div className="flex gap-2 ml-auto flex-shrink-0">
            {status === "generating" && (
              <Button variant="danger" size="sm" onClick={handleCancel} leftIcon={<XCircle size={13} />}>
                Cancel
              </Button>
            )}
            {status === "done" && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setShowExport(true)} leftIcon={<Download size={13} />}>
                  Export
                </Button>
                <Button variant="ghost" size="sm" onClick={reset} leftIcon={<RotateCcw size={13} />}>
                  New
                </Button>
              </>
            )}
            {status === "error" && (
              <Button variant="secondary" size="sm" onClick={reset} leftIcon={<RotateCcw size={13} />}>
                Retry
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerate}
              loading={["generating", "inspecting", "building_prompt"].includes(status)}
              disabled={!canGenerate}
              leftIcon={<Zap size={13} />}
            >
              {status === "generating" ? "Generating…" : "Generate"}
            </Button>
          </div>
        </div>
      </div>

      {showExport && (
        <ExportPanel
          generationId={generationId}
          mode={mode}
          fileCount={generatedFiles.length}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
}
