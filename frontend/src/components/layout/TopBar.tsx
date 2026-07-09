import { useLocation } from "react-router-dom";
import { Zap, Shield } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

const titles: Record<string, { label: string; desc: string }> = {
  "/generate": { label: "Generate", desc: "Transform Figma designs into production-ready code" },
  "/history": { label: "History", desc: "Browse and manage past generations" },
  "/settings": { label: "Settings", desc: "Configure services and credentials" },
  "/docs": { label: "Documentation", desc: "Usage guide and API reference" },
};

export function TopBar() {
  const { pathname } = useLocation();
  const page = titles[pathname] ?? { label: "FrameForge", desc: "" };

  return (
    <header
      className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10"
      role="banner"
    >
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-none">{page.label}</h1>
          {page.desc && (
            <p className="text-xs text-foreground-muted mt-0.5 hidden sm:block">{page.desc}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="success" className="gap-1.5">
          <Zap size={10} aria-hidden />
          <span className="hidden sm:inline">Azure GPT-4o</span>
        </Badge>
        <Badge variant="muted" className="gap-1.5 hidden md:flex">
          <Shield size={9} aria-hidden />
          Enterprise
        </Badge>
      </div>
    </header>
  );
}
