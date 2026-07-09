import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function truncateUrl(url: string, maxLen = 48): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + "…";
}

export function downloadFile(content: string, filename: string, type = "text/plain"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function modeLabel(mode: string): string {
  const labels: Record<string, string> = {
    scaffold: "Full Scaffold",
    component: "Component + API",
    prompt_edit: "Prompt Editor",
  };
  return labels[mode] ?? mode;
}

export function stackLabel(stack: string): string {
  const labels: Record<string, string> = {
    react_typescript: "React + TypeScript",
    nextjs: "Next.js 14",
  };
  return labels[stack] ?? stack;
}
