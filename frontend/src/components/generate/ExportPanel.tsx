import { useState } from "react";
import { Download, FolderOpen, CheckCircle2, X, Package, HardDrive, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

interface ExportPanelProps {
  generationId: string | null;
  mode: string;
  fileCount?: number;
  onClose: () => void;
}

function toSafeFolderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "project";
}

function getDefaultOutputPath(): string {
  // Use relative path from the workspace — configurable via environment
  return "./generated";
}

export function ExportPanel({ generationId, mode, fileCount = 0, onClose }: ExportPanelProps) {
  const { inspect } = useStore();

  const suggestedName = inspect?.file_name
    ? toSafeFolderName(inspect.file_name)
    : "frameforge-output";

  const basePath = getDefaultOutputPath();
  const defaultPath = `${basePath}/${suggestedName}`;

  const [localPath, setLocalPath] = useState(defaultPath);
  const [editingPath, setEditingPath] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ path: string; files: string[]; file_count: number } | null>(null);

  function handleDownloadZip() {
    if (!generationId) return;
    const link = document.createElement("a");
    link.href = `/api/export/${generationId}/zip`;
    link.download = `${suggestedName}.zip`;
    link.click();
    toast.success("ZIP download started");
  }

  async function handleSaveLocal() {
    if (!generationId || !localPath.trim()) {
      toast.error("Enter a local directory path");
      return;
    }
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch(`/api/export/${generationId}/save-local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local_path: localPath.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaved(data);
      toast.success(`Saved ${data.file_count} files to ${data.path}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const isScaffold = mode === "scaffold";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Export generated code"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl shadow-black/40 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Download size={16} className="text-accent" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Export Project</h2>
            {fileCount > 0 && (
              <span className="text-xs text-foreground-muted font-mono">({fileCount} files)</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">

          {/* Figma source info */}
          {inspect && (
            <div className="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-accent flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{inspect.file_name}</p>
                <p className="text-[10px] text-foreground-muted">{inspect.frames.length} frames · {fileCount} files generated</p>
              </div>
            </div>
          )}

          {/* Output structure */}
          <div className="rounded-lg bg-muted border border-border p-3">
            <p className="text-[10px] font-semibold text-foreground-muted mb-2 uppercase tracking-widest">
              Output Structure
            </p>
            <div className="font-mono text-[11px] text-foreground-muted flex flex-col gap-0.5 leading-relaxed">
              <span className="text-foreground">{suggestedName}/</span>
              {isScaffold ? (
                <>
                  <span className="pl-4">├── frontend/src/<span className="text-blue-400">App.tsx</span></span>
                  <span className="pl-4">├── frontend/src/pages/</span>
                  <span className="pl-4">├── frontend/package.json</span>
                  <span className="pl-4">├── backend/app/<span className="text-accent">main.py</span></span>
                  <span className="pl-4">├── backend/requirements.txt</span>
                  <span className="pl-4">└── README.md</span>
                </>
              ) : (
                <>
                  <span className="pl-4">├── <span className="text-blue-400">Component.tsx</span></span>
                  <span className="pl-4">├── <span className="text-accent">router.py</span></span>
                  <span className="pl-4">└── README.md</span>
                </>
              )}
            </div>
          </div>

          {/* Option 1: Download ZIP */}
          <div className="rounded-lg border border-border bg-background p-4 flex flex-col gap-3 hover:border-foreground-muted/40 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <Package size={14} className="text-accent" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Download ZIP</p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Download as <span className="font-mono text-foreground-muted/80">{suggestedName}.zip</span> — ready to unzip and run
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadZip}
              disabled={!generationId}
              leftIcon={<Download size={13} />}
              className="w-full"
            >
              Download ZIP
            </Button>
          </div>

          {/* Option 2: Save to local path */}
          <div className="rounded-lg border border-border bg-background p-4 flex flex-col gap-3 hover:border-foreground-muted/40 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-info/10 border border-info/20 flex items-center justify-center flex-shrink-0">
                <HardDrive size={14} className="text-info" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Save to Directory</p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Write files directly to a local directory
                </p>
              </div>
            </div>

            {/* Path display / edit */}
            {editingPath ? (
              <Input
                value={localPath}
                onChange={(e) => { setLocalPath(e.target.value); setSaved(null); }}
                placeholder="./generated/my-project"
                leftIcon={<FolderOpen size={13} />}
                hint="Relative or absolute path — folder will be created if needed"
                aria-label="Local directory path"
                autoFocus
                onBlur={() => setEditingPath(false)}
              />
            ) : (
              <button
                onClick={() => setEditingPath(true)}
                className="flex items-center gap-2 w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-left hover:border-foreground-muted/60 transition-colors group"
                aria-label="Edit save path"
              >
                <FolderOpen size={13} className="text-foreground-muted flex-shrink-0" />
                <span className="flex-1 font-mono text-xs text-foreground-muted truncate min-w-0">
                  {localPath}
                </span>
                <Edit2 size={11} className="text-foreground-muted/40 group-hover:text-foreground-muted flex-shrink-0 transition-colors" />
              </button>
            )}

            {/* Success state */}
            {saved && (
              <div
                className="rounded-lg border border-accent/30 bg-accent/5 p-3 flex flex-col gap-2 animate-fade-in"
                role="status"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-accent" />
                  <span className="text-xs font-semibold text-accent">
                    {saved.file_count} files saved
                  </span>
                </div>
                <p className="text-[11px] font-mono text-foreground-muted break-all">{saved.path}</p>
                <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
                  {saved.files.slice(0, 12).map((f) => (
                    <p key={f} className="text-[10px] font-mono text-foreground-muted/60 truncate">
                      ✓ {f.split(/[/\\]/).slice(-2).join("/")}
                    </p>
                  ))}
                  {saved.files.length > 12 && (
                    <p className="text-[10px] text-foreground-muted/40">
                      +{saved.files.length - 12} more files…
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveLocal}
              loading={saving}
              disabled={!generationId || !localPath.trim() || !!saved}
              leftIcon={saved ? <CheckCircle2 size={13} className="text-accent" /> : <HardDrive size={13} />}
              className={cn("w-full", saved && "border-accent/30 text-accent")}
            >
              {saving ? "Saving files…" : saved ? "Saved ✓" : "Save to Directory"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
