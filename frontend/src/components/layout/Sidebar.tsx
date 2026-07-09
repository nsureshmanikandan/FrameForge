import { NavLink } from "react-router-dom";
import { Zap, History, Settings, BookOpen, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { healthApi } from "@/lib/api";

const nav = [
  { to: "/generate", icon: Zap, label: "Generate" },
  { to: "/history", icon: History, label: "History" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/docs", icon: BookOpen, label: "Docs" },
];

export function Sidebar() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 30_000,
    retry: 1,
  });

  const isHealthy = health?.status === "ok";

  return (
    <aside
      className="flex-shrink-0 w-14 lg:w-56 h-screen sticky top-0 bg-surface border-r border-border flex flex-col z-20"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 lg:px-4 py-5 border-b border-border">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 flex items-center justify-center shadow-sm shadow-accent/10">
          <Zap size={16} className="text-accent" aria-hidden />
        </div>
        <div className="hidden lg:flex flex-col">
          <span className="font-bold text-foreground font-mono tracking-tight text-sm leading-none">
            FrameForge
          </span>
          <span className="text-[10px] text-foreground-muted/60 font-mono mt-0.5">Enterprise</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "bg-accent/10 text-accent border border-accent/20 shadow-sm shadow-accent/5"
                  : "text-foreground-muted hover:bg-muted hover:text-foreground"
              )
            }
            aria-label={label}
          >
            <Icon size={18} aria-hidden className="flex-shrink-0" />
            <span className="hidden lg:block">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Health indicator */}
      <div className="px-2 pb-4 flex flex-col gap-2">
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
          <div className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            isHealthy ? "bg-accent animate-pulse-slow" : "bg-warning"
          )} />
          <span className="text-[11px] text-foreground-muted font-mono">
            {isHealthy ? "All systems online" : "Degraded"}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5">
          <Shield size={10} className="text-foreground-muted/40" aria-hidden />
          <span className="text-[10px] text-foreground-muted/40 font-mono">
            v{health?.version ?? "2.0.0"}
          </span>
        </div>
      </div>
    </aside>
  );
}
