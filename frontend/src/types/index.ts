export type GenerationMode = "scaffold" | "component" | "prompt_edit";
export type GenerationStack = "react_typescript" | "nextjs";
export type StreamChunkType = "react" | "python" | "meta" | "done" | "error" | "frontend" | "backend" | "other";

export interface FigmaFrame {
  node_id: string;
  name: string;
  width: number;
  height: number;
  thumbnail_url: string | null;
  component_count: number;
  text_nodes: string[];
  color_styles: string[];
}

export interface FigmaInspectResponse {
  file_name: string;
  frames: FigmaFrame[];
  raw_node_count: number;
}

export interface GenerateRequest {
  figma_url: string;
  mode: GenerationMode;
  custom_prompt?: string;
  stack: GenerationStack;
}

export interface StreamChunk {
  type: StreamChunkType;
  content: string;
  sequence: number;
  file?: string;
}

export interface GenerationMeta {
  id: string;
  figma_url: string;
  mode: GenerationMode;
  stack: GenerationStack;
  prompt_used: string;
  created_at: string;
  duration_ms: number | null;
  frame_count: number;
}

export interface GenerationResult {
  meta: GenerationMeta;
  files: GeneratedFile[];
  react_code: string;
  python_code: string;
  file_tree: string[];
}

export interface HistoryItem {
  id: string;
  figma_url: string;
  mode: GenerationMode;
  stack: GenerationStack;
  created_at: string;
  frame_count: number;
  file_count: number;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  environment: string;
  services: Record<string, boolean>;
  metadata: Record<string, string | number>;
}

export interface GeneratedFile {
  filename: string;
  content: string;
  language: string;
}

export type GenerateStatus =
  | "idle"
  | "inspecting"
  | "building_prompt"
  | "generating"
  | "done"
  | "error";
