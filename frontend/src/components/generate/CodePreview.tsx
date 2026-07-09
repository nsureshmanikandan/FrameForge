import { useState, useMemo } from "react";
import {
  Copy, CheckCheck, Download, FileCode2,
  ChevronRight, ChevronDown, Folder, FolderOpen,
  File, PanelLeftClose, PanelLeft,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { SkeletonLine } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import type { GeneratedFile } from "@/types";

interface CodePreviewProps {
  files: GeneratedFile[];
  status: string;
  streamingRaw: string;
  currentStreamingFile: string;
}

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
  language?: string;
}

function buildTree(files: GeneratedFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.filename.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");
      let node = current.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path: fullPath, isFile: isLast, children: [], language: isLast ? file.language : undefined };
        current.push(node);
      }
      current = node.children;
    }
  }
  return root;
}

function FileIcon({ language }: { language?: string }) {
  const colors: Record<string, string> = {
    typescript: "text-blue-400",
    python: "text-accent",
    json: "text-yellow-400",
    markdown: "text-foreground-muted",
    css: "text-purple-400",
  };
  return <File size={11} className={cn("flex-shrink-0", colors[language ?? ""] ?? "text-foreground-muted")} aria-hidden />;
}

function TreeItem({
  node, depth, selectedFile, onSelect, streamingFile,
}: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelect: (path: string) => void;
  streamingFile: string;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isSelected = node.isFile && node.path === selectedFile;
  const isStreaming = node.isFile && streamingFile.includes(node.name);

  if (node.isFile) {
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={cn(
          "w-full flex items-center gap-1.5 py-[3px] pr-2 rounded text-left text-xs cursor-pointer transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          isSelected
            ? "bg-accent/15 text-accent"
            : "text-foreground-muted hover:text-foreground hover:bg-white/5"
        )}
        style={{ paddingLeft: `${depth * 10 + 6}px` }}
        aria-selected={isSelected}
      >
        <FileIcon language={node.language} />
        <span className="truncate font-mono text-[11px]">{node.name}</span>
        {isStreaming && <span className="ml-auto text-accent animate-pulse text-[10px] flex-shrink-0">●</span>}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 py-[3px] pr-2 rounded text-left text-xs text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 10 + 6}px` }}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={10} aria-hidden /> : <ChevronRight size={10} aria-hidden />}
        {open
          ? <FolderOpen size={11} className="text-yellow-500/70 flex-shrink-0" aria-hidden />
          : <Folder size={11} className="text-yellow-500/70 flex-shrink-0" aria-hidden />}
        <span className="font-mono text-[11px] truncate">{node.name}</span>
      </button>
      {open && node.children.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedFile={selectedFile}
          onSelect={onSelect}
          streamingFile={streamingFile}
        />
      ))}
    </div>
  );
}

export function CodePreview({ files, status, streamingRaw, currentStreamingFile }: CodePreviewProps) {
  const { selectedFile, setSelectedFile } = useStore();
  const [copied, setCopied] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);

  const tree = useMemo(() => buildTree(files), [files]);
  const isStreaming = status === "generating";
  const isIdle = status === "idle";

  const activeFile = useMemo(() => {
    if (selectedFile) return files.find((f) => f.filename === selectedFile) ?? null;
    return files[0] ?? null;
  }, [selectedFile, files]);

  const frontendCount = files.filter((f) => f.filename.startsWith("frontend/")).length;
  const backendCount = files.filter((f) => f.filename.startsWith("backend/")).length;

  async function handleCopy() {
    const code = activeFile?.content ?? "";
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!activeFile) return;
    const name = activeFile.filename.split("/").pop() ?? "file.txt";
    downloadFile(activeFile.content, name);
    toast.success(`Downloaded ${name}`);
  }

  const langMap: Record<string, string> = {
    typescript: "tsx", python: "python", json: "json",
    markdown: "markdown", css: "css", html: "html",
  };
  const highlightLang = langMap[activeFile?.language ?? ""] ?? "text";

  return (
    <div className="flex w-full h-full rounded-lg border border-border overflow-hidden bg-[#1E1E1E]">

      {/* File tree pane */}
      {treeOpen && (
        <div className="w-44 flex-shrink-0 border-r border-white/10 flex flex-col bg-[#161b2e] overflow-hidden">
          {/* Tree header */}
          <div className="flex items-center gap-1.5 px-2 py-2 border-b border-white/10 flex-shrink-0">
            <FileCode2 size={11} className="text-foreground-muted flex-shrink-0" aria-hidden />
            <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-widest flex-1">Files</span>
            {files.length > 0 && (
              <span className="text-[10px] text-foreground-muted/50 font-mono">{files.length}</span>
            )}
          </div>

          {/* Counts row */}
          {files.length > 0 && (
            <div className="flex gap-1 px-2 py-1.5 border-b border-white/10 flex-shrink-0">
              <Badge variant="info" className="text-[10px] px-1.5 py-0">{frontendCount} UI</Badge>
              <Badge variant="success" className="text-[10px] px-1.5 py-0">{backendCount} API</Badge>
            </div>
          )}

          {/* Tree scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
            {isIdle && (
              <p className="text-[10px] text-foreground-muted/40 px-2 py-4 text-center leading-relaxed">
                Files appear here after generation
              </p>
            )}
            {isStreaming && files.length === 0 && (
              <div className="px-2 py-3 flex flex-col gap-1.5">
                <SkeletonLine className="w-3/4" />
                <SkeletonLine className="w-1/2 ml-3" />
                <SkeletonLine className="w-2/3 ml-3" />
                <SkeletonLine className="w-3/4 mt-1" />
                <SkeletonLine className="w-1/2 ml-3" />
              </div>
            )}
            {tree.map((node) => (
              <TreeItem
                key={node.path}
                node={node}
                depth={0}
                selectedFile={selectedFile}
                onSelect={setSelectedFile}
                streamingFile={currentStreamingFile}
              />
            ))}
          </div>

          {/* Streaming file indicator */}
          {isStreaming && currentStreamingFile && (
            <div className="px-2 py-1.5 border-t border-white/10 flex-shrink-0">
              <p className="text-[10px] text-accent animate-pulse font-mono truncate">
                ▊ {currentStreamingFile.split("/").pop()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Code pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-[#161b2e] flex-shrink-0 min-w-0">
          {/* Toggle tree button */}
          <button
            onClick={() => setTreeOpen((o) => !o)}
            className="p-1 rounded text-foreground-muted/50 hover:text-foreground-muted hover:bg-white/5 transition-colors flex-shrink-0"
            aria-label={treeOpen ? "Collapse file tree" : "Expand file tree"}
            title={treeOpen ? "Collapse file tree" : "Expand file tree"}
          >
            {treeOpen ? <PanelLeftClose size={13} /> : <PanelLeft size={13} />}
          </button>

          {/* Filename */}
          <span className="text-xs font-mono text-foreground-muted truncate flex-1 min-w-0">
            {activeFile ? activeFile.filename : isStreaming ? "Generating…" : "Select a file"}
          </span>

          {/* Actions — always visible, flex-shrink-0 */}
          <div className="flex gap-0.5 flex-shrink-0">
            <button
              onClick={handleCopy}
              disabled={!activeFile}
              className="p-1.5 rounded text-foreground-muted/50 hover:text-foreground-muted hover:bg-white/5 disabled:opacity-30 transition-colors"
              aria-label="Copy file content"
              title="Copy"
            >
              {copied ? <CheckCheck size={12} className="text-accent" /> : <Copy size={12} />}
            </button>
            <button
              onClick={handleDownload}
              disabled={!activeFile}
              className="p-1.5 rounded text-foreground-muted/50 hover:text-foreground-muted hover:bg-white/5 disabled:opacity-30 transition-colors"
              aria-label="Download this file"
              title="Download"
            >
              <Download size={12} />
            </button>
          </div>
        </div>

        {/* Code body — scrollable in both axes */}
        <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
          {isIdle && <EmptyState />}

          {isStreaming && !activeFile && <StreamingPlaceholder raw={streamingRaw} />}

          {activeFile && (
            <SyntaxHighlighter
              language={highlightLang}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: "12px 16px",
                background: "transparent",
                fontSize: "12px",
                lineHeight: "1.6",
                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                height: "100%",
                overflowX: "auto",
                overflowY: "visible",
              }}
              codeTagProps={{
                style: { fontFamily: "'Fira Code', 'Cascadia Code', monospace" },
              }}
              showLineNumbers
              lineNumberStyle={{
                color: "#3a4055",
                fontSize: "11px",
                minWidth: "3em",
                paddingRight: "12px",
                userSelect: "none",
              }}
              wrapLongLines={false}
            >
              {activeFile.content}
            </SyntaxHighlighter>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 py-12 text-center px-6">
      <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
        <FileCode2 size={18} className="text-foreground-muted" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground-muted">No files generated yet</p>
      <p className="text-xs text-foreground-muted/50 max-w-48 leading-relaxed">
        Paste a Figma URL, choose a mode, and click Generate
      </p>
    </div>
  );
}

function StreamingPlaceholder({ raw }: { raw: string }) {
  const lastLines = raw.split("\n").filter(Boolean).slice(-8);
  return (
    <div className="p-4 font-mono text-xs text-foreground-muted flex flex-col gap-1.5 overflow-hidden">
      <span className="text-accent animate-pulse mb-2 text-[11px]">▊ Streaming code…</span>
      {lastLines.map((line, i) => (
        <span key={i} className="opacity-50 truncate animate-stream text-[11px]">{line}</span>
      ))}
      {lastLines.length === 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLine key={i} className={cn("h-2.5", i % 3 === 0 ? "w-3/4" : i % 3 === 1 ? "w-1/2" : "w-5/6")} />
          ))}
        </div>
      )}
    </div>
  );
}
