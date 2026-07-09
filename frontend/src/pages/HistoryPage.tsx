import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Trash2, Download, Clock, Layers, Puzzle, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Spinner";
import { historyApi, generateApi } from "@/lib/api";
import { formatDate, truncateUrl, modeLabel, stackLabel, downloadFile } from "@/lib/utils";
import type { HistoryItem } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const modeIcons: Record<string, React.ElementType> = {
  scaffold: Layers,
  component: Puzzle,
  prompt_edit: Edit3,
};

export function HistoryPage() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["history"],
    queryFn: historyApi.list,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: historyApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Failed to delete"),
    onSettled: () => setDeletingId(null),
  });

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const result = await generateApi.download(id);
      if (result.react_code) downloadFile(result.react_code, "Component.tsx");
      if (result.python_code) downloadFile(result.python_code, "router.py");
      toast.success("Downloaded files");
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <History size={18} className="text-accent" aria-hidden />
        <h1 className="text-lg font-semibold text-foreground">Generation History</h1>
        {items && (
          <Badge variant="muted" className="ml-1">{items.length}</Badge>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3" aria-busy aria-label="Loading history">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center" role="alert">
          <p className="text-sm text-destructive">Failed to load history. Is the backend running?</p>
        </div>
      )}

      {!isLoading && !isError && (!items || items.length === 0) && (
        <div className="rounded-lg border border-border bg-surface p-12 flex flex-col items-center gap-3">
          <History size={32} className="text-foreground-muted/40" aria-hidden />
          <p className="text-sm font-medium text-foreground-muted">No generations yet</p>
          <p className="text-xs text-foreground-muted/60">Your history will appear here after you generate code</p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="flex flex-col gap-2" role="list" aria-label="Generation history">
          {items.map((item) => (
            <HistoryRow
              key={item.id}
              item={item}
              isDeleting={deletingId === item.id}
              isDownloading={downloadingId === item.id}
              onDelete={() => {
                setDeletingId(item.id);
                deleteMutation.mutate(item.id);
              }}
              onDownload={() => handleDownload(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  item, isDeleting, isDownloading, onDelete, onDownload,
}: {
  item: HistoryItem;
  isDeleting: boolean;
  isDownloading: boolean;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const Icon = modeIcons[item.mode] ?? Layers;

  return (
    <div
      role="listitem"
      className={cn(
        "rounded-lg border border-border bg-surface px-4 py-3 flex items-center gap-4",
        "transition-all duration-150 hover:border-foreground-muted/30 animate-fade-in"
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-foreground-muted" aria-hidden />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate font-mono">
          {truncateUrl(item.figma_url, 60)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Clock size={10} className="text-foreground-muted/60" aria-hidden />
          <span className="text-xs text-foreground-muted">{formatDate(item.created_at)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="muted">{modeLabel(item.mode)}</Badge>
        <Badge variant="info">{stackLabel(item.stack)}</Badge>
      </div>

      <div className="flex gap-1.5 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          loading={isDownloading}
          leftIcon={<Download size={12} />}
          aria-label="Download generated files"
        />
        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          loading={isDeleting}
          leftIcon={<Trash2 size={12} />}
          aria-label="Delete this generation"
        />
      </div>
    </div>
  );
}
