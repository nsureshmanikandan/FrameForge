import { useQuery } from "@tanstack/react-query";
import { Settings, CheckCircle2, XCircle, Shield, Activity, Server, Globe } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Spinner";
import { healthApi } from "@/lib/api";

export function SettingsPage() {
  const { data: health, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 30_000,
  });

  return (
    <div className="p-6 flex flex-col gap-8 max-w-3xl mx-auto overflow-y-auto">
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-accent" aria-hidden />
        <h1 className="text-lg font-semibold text-foreground">Settings & Health</h1>
      </div>

      {/* Overall status */}
      <section aria-labelledby="status-heading">
        <h2 id="status-heading" className="text-sm font-semibold text-foreground mb-3">
          System Status
        </h2>
        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-lg" />
        ) : health ? (
          <div className="rounded-lg border border-border bg-surface p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              health.status === "ok" ? "bg-accent/10 border border-accent/30" : "bg-warning/10 border border-warning/30"
            }`}>
              <Activity size={20} className={health.status === "ok" ? "text-accent" : "text-warning"} aria-hidden />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {health.status === "ok" ? "All Systems Operational" : "Degraded Performance"}
                </span>
                <Badge variant={health.status === "ok" ? "success" : "warning"}>
                  {health.status}
                </Badge>
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                Environment: <span className="font-mono text-foreground-muted">{health.environment}</span>
                {" · "}
                Last checked: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center" role="alert">
            <XCircle size={24} className="text-destructive mx-auto mb-2" aria-hidden />
            <p className="text-sm text-destructive font-medium">Cannot reach backend</p>
            <p className="text-xs text-foreground-muted mt-1">
              Make sure the backend is running on port 8002
            </p>
          </div>
        )}
      </section>

      {/* Service health */}
      <section aria-labelledby="health-heading">
        <h2 id="health-heading" className="text-sm font-semibold text-foreground mb-3">
          Service Health
        </h2>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : health ? (
          <div className="flex flex-col gap-2" role="list">
            {Object.entries(health.services).map(([service, ok]) => (
              <div
                key={service}
                role="listitem"
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 hover:border-foreground-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    ok ? "bg-accent/10" : "bg-destructive/10"
                  }`}>
                    {service === "azure_openai" && <Globe size={14} className={ok ? "text-accent" : "text-destructive"} aria-hidden />}
                    {service === "figma" && <Server size={14} className={ok ? "text-accent" : "text-destructive"} aria-hidden />}
                    {service === "storage" && <Shield size={14} className={ok ? "text-accent" : "text-destructive"} aria-hidden />}
                  </div>
                  <span className="text-sm font-medium text-foreground capitalize">
                    {service.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {ok ? (
                    <>
                      <CheckCircle2 size={14} className="text-accent" aria-hidden />
                      <Badge variant="success">Connected</Badge>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} className="text-destructive" aria-hidden />
                      <Badge variant="error">Not Configured</Badge>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Metadata */}
      {health?.metadata && Object.keys(health.metadata).length > 0 && (
        <section aria-labelledby="metadata-heading">
          <h2 id="metadata-heading" className="text-sm font-semibold text-foreground mb-3">
            Runtime Information
          </h2>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(health.metadata).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-foreground-muted uppercase tracking-wider font-semibold">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm text-foreground font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Config reference */}
      <section aria-labelledby="config-heading">
        <h2 id="config-heading" className="text-sm font-semibold text-foreground mb-3">
          Configuration Reference
        </h2>
        <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Shield size={16} className="text-accent flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">Environment Variables</p>
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                Credentials are stored in{" "}
                <code className="font-mono text-accent bg-muted px-1 py-0.5 rounded text-xs">
                  backend/.env
                </code>{" "}
                locally and injected via Azure Key Vault in production.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-foreground-muted mb-3 uppercase tracking-wider">
              Required Variables
            </p>
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              {[
                ["AZURE_OPENAI_ENDPOINT", "Azure OpenAI resource URL"],
                ["AZURE_OPENAI_API_KEY", "Azure OpenAI API key"],
                ["AZURE_OPENAI_DEPLOYMENT", "Model deployment name (default: gpt-4o)"],
                ["FIGMA_ACCESS_TOKEN", "Figma Personal Access Token"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-start gap-3">
                  <code className="text-accent bg-muted px-2 py-0.5 rounded flex-shrink-0">
                    {key}
                  </code>
                  <span className="text-foreground-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-foreground-muted mb-3 uppercase tracking-wider">
              Optional Variables
            </p>
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              {[
                ["API_KEY", "Protect endpoints with an API key"],
                ["RATE_LIMIT_PER_MINUTE", "Max requests/minute (default: 30)"],
                ["LOG_LEVEL", "Logging verbosity: DEBUG, INFO, WARNING"],
                ["ENVIRONMENT", "development | staging | production"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-start gap-3">
                  <code className="text-info bg-muted px-2 py-0.5 rounded flex-shrink-0">
                    {key}
                  </code>
                  <span className="text-foreground-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Version info */}
      <section aria-labelledby="version-heading">
        <h2 id="version-heading" className="text-sm font-semibold text-foreground mb-3">
          Version
        </h2>
        <div className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-foreground-muted font-mono">
            FrameForge v{health?.version ?? "2.0.0"}
          </span>
          <Badge variant="success">Enterprise</Badge>
        </div>
      </section>
    </div>
  );
}
