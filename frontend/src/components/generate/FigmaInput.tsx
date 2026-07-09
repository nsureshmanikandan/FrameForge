import { useState, useEffect, useCallback } from "react";
import { Figma, Link, CheckCircle2, RefreshCw, Clock, Wifi } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Spinner";
import { figmaApi } from "@/lib/api";
import { useStore } from "@/store/useStore";
import type { FigmaInspectResponse } from "@/types";
import { toast } from "sonner";

const RATE_LIMIT_WAIT = 60;

export function FigmaInput() {
  const { figmaUrl, setFigmaUrl, setInspect, inspect } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRateLimit, setIsRateLimit] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [fromCache, setFromCache] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const doInspect = useCallback(async (url: string, force = false): Promise<void> => {
    setLoading(true);
    setError("");
    const start = Date.now();
    let rateLimited = false;
    try {
      const data = await figmaApi.inspect(url, force);
      setInspect(data);
      setFromCache(Date.now() - start < 300);
      setIsRateLimit(false);
      setCountdown(0);
      toast.success(`Found ${data.frames.length} frame${data.frames.length !== 1 ? "s" : ""} in "${data.file_name}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to inspect Figma URL";
      if (msg.toLowerCase().includes("rate limit")) {
        rateLimited = true;
        setIsRateLimit(true);
        setCountdown(RATE_LIMIT_WAIT);
        setTimeout(() => doInspect(url, false), RATE_LIMIT_WAIT * 1000);
      } else {
        setIsRateLimit(false);
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (!rateLimited) setLoading(false);
    }
  }, [setInspect]);

  const handleInspect = useCallback(() => {
    if (!figmaUrl.trim()) { setError("Please enter a Figma URL"); return; }
    if (!figmaUrl.includes("figma.com")) { setError("Must be a figma.com URL"); return; }
    setInspect(null);
    setFromCache(false);
    doInspect(figmaUrl);
  }, [figmaUrl, setInspect, doInspect]);

  const handleReset = () => {
    setInspect(null);
    setError("");
    setFromCache(false);
    setIsRateLimit(false);
    setCountdown(0);
    setLoading(false);
    setFigmaUrl("");
  };

  return (
    <section className="flex flex-col gap-4" aria-label="Figma URL input">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Figma size={16} className="text-accent" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Figma Design</h2>
        </div>
        {(inspect || error || isRateLimit) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            leftIcon={<RefreshCw size={11} />}
            aria-label="Reset session"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={figmaUrl}
            onChange={(e) => { setFigmaUrl(e.target.value); setError(""); setIsRateLimit(false); setCountdown(0); }}
            placeholder="https://www.figma.com/design/..."
            error={!isRateLimit ? error : undefined}
            leftIcon={<Link size={14} />}
            onKeyDown={(e) => e.key === "Enter" && !isRateLimit && !loading && handleInspect()}
            aria-label="Figma design URL"
            type="url"
            disabled={isRateLimit || loading}
          />
        </div>
        <Button
          onClick={handleInspect}
          loading={loading}
          disabled={!figmaUrl.trim() || isRateLimit || loading}
          size="md"
          className="flex-shrink-0"
        >
          Inspect
        </Button>
      </div>

      {/* Rate limit countdown banner */}
      {isRateLimit && countdown > 0 && (
        <div
          className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 flex items-center gap-3 animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <Clock size={14} className="text-warning flex-shrink-0 animate-pulse" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warning">Figma rate limit — auto-retrying</p>
            <p className="text-xs text-foreground-muted mt-0.5">
              Figma's API has a 60s rate limit window. Auto-retrying in{" "}
              <span className="font-mono font-bold text-warning">{countdown}s</span>
              {" "}— close extra Figma tabs to avoid this.
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-full border-2 border-warning/40 flex items-center justify-center flex-shrink-0"
            aria-label={`${countdown} seconds remaining`}
          >
            <span className="text-sm font-mono text-warning font-bold">{countdown}</span>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !isRateLimit && (
        <div
          className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3 animate-fade-in"
          aria-live="polite"
          aria-busy
        >
          <Skeleton className="h-4 w-1/3" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      )}

      {/* Inspect result */}
      {!loading && inspect && (
        <InspectResult
          data={inspect}
          fromCache={fromCache}
          onRefresh={() => doInspect(figmaUrl, true)}
        />
      )}
    </section>
  );
}

function InspectResult({
  data,
  fromCache,
  onRefresh,
}: {
  data: FigmaInspectResponse;
  fromCache: boolean;
  onRefresh: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-accent/20 bg-accent/5 p-4 flex flex-col gap-3 animate-slide-in"
      aria-live="polite"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 size={14} className="text-accent flex-shrink-0" aria-hidden />
          <span className="text-sm font-medium text-foreground truncate">{data.file_name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
          <Badge variant="success">{data.frames.length} frames</Badge>
          <Badge variant="muted">{data.raw_node_count} nodes</Badge>
          {fromCache && (
            <Badge variant="info">
              <Wifi size={9} aria-hidden /> cached
            </Badge>
          )}
          <button
            onClick={onRefresh}
            className="p-1 rounded hover:bg-white/5 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Force refresh from Figma"
            title="Refresh from Figma (bypass cache)"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {data.frames.slice(0, 6).map((frame) => (
          <div
            key={frame.node_id}
            className="rounded-md border border-border bg-muted p-2 flex flex-col gap-1.5"
          >
            {frame.thumbnail_url ? (
              <img
                src={frame.thumbnail_url}
                alt={`${frame.name} preview`}
                className="w-full h-20 object-cover rounded"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-20 rounded bg-surface-2 flex items-center justify-center">
                <Figma size={20} className="text-foreground-muted" aria-hidden />
              </div>
            )}
            <p className="text-xs text-foreground-muted truncate font-mono">{frame.name}</p>
            <p className="text-xs text-foreground-muted/60">{frame.width}×{frame.height}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
