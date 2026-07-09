import { BookOpen, Link, Code2, Server, Download, Shield, Layers, Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

const steps = [
  {
    icon: Link,
    title: "1. Paste a Figma URL",
    desc: "Copy any Figma design, frame, or node URL and paste it into the input. Click Inspect to extract frames, text, colors, and layout metadata.",
  },
  {
    icon: Layers,
    title: "2. Choose a Generation Mode",
    desc: "Full Scaffold generates a complete multi-file repo with routing, pages, and backend. Component + API generates focused pairs. Prompt Editor lets you customise the GPT-4o prompt.",
  },
  {
    icon: Code2,
    title: "3. Select a Target Stack",
    desc: "React 18 + TypeScript + Vite or Next.js 14 App Router. Both generate with Tailwind CSS, full type safety, and enterprise patterns.",
  },
  {
    icon: Server,
    title: "4. Generate Code",
    desc: "Azure GPT-4o streams production-ready code in real time. Watch your file tree fill with fully-typed React components and FastAPI endpoints.",
  },
  {
    icon: Download,
    title: "5. Export & Deploy",
    desc: "Download as a structured ZIP or save directly to your workspace. Every generation is persisted to History for review.",
  },
];

const enterprise = [
  { label: "Full TypeScript strict mode — no any, no implicit types", category: "Code Quality" },
  { label: "Pydantic v2 models for all API request/response shapes", category: "Code Quality" },
  { label: "WCAG 2.1 AA accessibility on all generated UI components", category: "Accessibility" },
  { label: "Loading, error, empty, and success states built into every component", category: "UX" },
  { label: "React Query (TanStack) for all async data with caching + retry", category: "Data" },
  { label: "FastAPI async endpoints with proper HTTP status codes", category: "Backend" },
  { label: "Rate limiting and structured logging built in", category: "Security" },
  { label: "SSE streaming — no polling, real-time code generation", category: "Performance" },
  { label: "Environment variables via pydantic-settings — never hardcoded", category: "Security" },
  { label: "Docker multi-stage builds optimized for production", category: "DevOps" },
];

const categoryColors: Record<string, string> = {
  "Code Quality": "text-blue-400",
  "Accessibility": "text-purple-400",
  "UX": "text-pink-400",
  "Data": "text-cyan-400",
  "Backend": "text-accent",
  "Security": "text-warning",
  "Performance": "text-info",
  "DevOps": "text-orange-400",
};

export function DocsPage() {
  return (
    <div className="p-6 flex flex-col gap-8 max-w-3xl mx-auto overflow-y-auto">
      <div className="flex items-center gap-2">
        <BookOpen size={18} className="text-accent" aria-hidden />
        <h1 className="text-lg font-semibold text-foreground">Documentation</h1>
        <Badge variant="muted" className="ml-1">v2.0</Badge>
      </div>

      {/* Quick start */}
      <section aria-labelledby="quickstart-heading">
        <h2 id="quickstart-heading" className="text-sm font-semibold text-foreground mb-4">
          Quick Start Guide
        </h2>
        <div className="flex flex-col gap-3">
          {steps.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex gap-4 rounded-lg border border-border bg-surface px-4 py-4 hover:border-accent/30 transition-colors duration-150"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={15} className="text-accent" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise standards */}
      <section aria-labelledby="enterprise-heading">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={14} className="text-accent" aria-hidden />
          <h2 id="enterprise-heading" className="text-sm font-semibold text-foreground">
            Enterprise Standards
          </h2>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted mb-4">
            Every generated project enforces these non-negotiable standards:
          </p>
          <ul className="flex flex-col gap-2.5 text-xs text-foreground-muted list-none">
            {enterprise.map(({ label, category }) => (
              <li key={label} className="flex items-start gap-2.5">
                <span className="text-accent mt-0.5 flex-shrink-0">✓</span>
                <span className="flex-1">{label}</span>
                <Badge variant="muted" className={`text-[9px] px-1.5 py-0 ${categoryColors[category] ?? ""}`}>
                  {category}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Architecture */}
      <section aria-labelledby="arch-heading">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-accent" aria-hidden />
          <h2 id="arch-heading" className="text-sm font-semibold text-foreground">
            Architecture
          </h2>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 font-mono text-xs text-foreground-muted leading-relaxed">
          <pre className="whitespace-pre-wrap">{`┌─────────────────────────────────────────────────┐
│  Frontend (React 18 + TypeScript + Vite)        │
│  ├── React Query for data fetching              │
│  ├── Zustand for UI state                       │
│  ├── SSE stream consumption                     │
│  └── Tailwind CSS + Lucide icons                │
├─────────────────────────────────────────────────┤
│  Nginx Reverse Proxy (/api → backend:8002)      │
├─────────────────────────────────────────────────┤
│  Backend (FastAPI + Python 3.12)                │
│  ├── Rate limiting middleware                   │
│  ├── Structured logging (structlog)             │
│  ├── Figma API client (inspection + caching)    │
│  ├── Azure OpenAI SSE streaming                 │
│  └── File export (ZIP + local save)             │
├─────────────────────────────────────────────────┤
│  Azure GPT-4o (code generation engine)          │
│  Figma API (design extraction)                  │
└─────────────────────────────────────────────────┘`}</pre>
        </div>
      </section>

      {/* API reference */}
      <section aria-labelledby="api-heading">
        <h2 id="api-heading" className="text-sm font-semibold text-foreground mb-3">
          API Reference
        </h2>
        <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
          <p className="text-xs text-foreground-muted">
            Interactive Swagger docs available when the backend is running:
          </p>
          <div className="flex flex-col gap-1.5">
            <code className="text-xs text-accent font-mono bg-muted px-2 py-1.5 rounded block">
              http://localhost:8002/api/docs
            </code>
            <code className="text-xs text-info font-mono bg-muted px-2 py-1.5 rounded block">
              http://localhost:8002/api/redoc
            </code>
          </div>
          <div className="border-t border-border pt-3 mt-1">
            <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider mb-2">
              Key Endpoints
            </p>
            <div className="flex flex-col gap-1 text-xs font-mono">
              <span><span className="text-accent">POST</span> /api/figma/inspect — Extract Figma design data</span>
              <span><span className="text-accent">POST</span> /api/generate/stream — Stream code generation (SSE)</span>
              <span><span className="text-info">GET</span>  /api/history — List all generations</span>
              <span><span className="text-info">GET</span>  /api/export/{'<id>'}/zip — Download as ZIP</span>
              <span><span className="text-info">GET</span>  /api/health — Service health check</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
