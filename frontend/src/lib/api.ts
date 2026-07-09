import axios from "axios";
import type {
  FigmaInspectResponse,
  GenerateRequest,
  GenerationResult,
  HistoryItem,
  HealthResponse,
} from "@/types";

const api = axios.create({
  baseURL: "/api",
  timeout: 90_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const data = err.response?.data;
    const msg =
      (typeof data === "string" ? data : null) ||
      data?.error ||
      (Array.isArray(data?.detail) ? data.detail.map((d: { msg: string }) => d.msg).join(", ") : data?.detail) ||
      err.message ||
      "Unknown error";
    return Promise.reject(new Error(String(msg)));
  }
);

export const figmaApi = {
  inspect: (figma_url: string, force = false): Promise<FigmaInspectResponse> =>
    api.post("/figma/inspect", { figma_url, force }).then((r) => r.data),
  clearCache: (): Promise<{ cleared: boolean }> =>
    api.delete("/figma/cache").then((r) => r.data),
};

export const generateApi = {
  buildPrompt: (
    figma_url: string,
    mode: string,
    stack: string
  ): Promise<{ prompt: string; file_name: string; frame_count: number }> =>
    api.post("/generate/prompt", { figma_url, mode, stack }).then((r) => r.data),

  download: (id: string): Promise<GenerationResult> =>
    api.get(`/generate/${id}/download`).then((r) => r.data),
};

export const historyApi = {
  list: (): Promise<HistoryItem[]> => api.get("/history").then((r) => r.data),
  get: (id: string): Promise<GenerationResult> =>
    api.get(`/history/${id}`).then((r) => r.data),
  delete: (id: string): Promise<void> => api.delete(`/history/${id}`).then(() => undefined),
};

export const healthApi = {
  check: (): Promise<HealthResponse> => api.get("/health").then((r) => r.data),
};

export function streamGeneration(
  body: GenerateRequest,
  onChunk: (chunk: { type: string; content: string; sequence: number; file?: string }) => void,
  onDone: (result: unknown) => void,
  onError: (msg: string) => void,
  signal?: AbortSignal
): void {
  fetch("/api/generate/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        const text = await res.text();
        onError(text || "Stream failed");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "done") {
              onDone(JSON.parse(parsed.content));
            } else if (parsed.type === "error") {
              onError(parsed.content);
            } else {
              onChunk(parsed);
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err.message);
    });
}
