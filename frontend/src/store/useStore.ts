import { create } from "zustand";
import type {
  FigmaInspectResponse,
  GenerationMode,
  GenerationStack,
  GenerateStatus,
  GeneratedFile,
} from "@/types";

interface GenerateState {
  figmaUrl: string;
  setFigmaUrl: (url: string) => void;

  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;

  stack: GenerationStack;
  setStack: (stack: GenerationStack) => void;

  inspect: FigmaInspectResponse | null;
  setInspect: (data: FigmaInspectResponse | null) => void;

  customPrompt: string;
  setCustomPrompt: (p: string) => void;

  status: GenerateStatus;
  setStatus: (s: GenerateStatus) => void;

  // Multi-file output
  generatedFiles: GeneratedFile[];
  setGeneratedFiles: (files: GeneratedFile[]) => void;

  // Streaming raw accumulator (for live preview)
  streamingRaw: string;
  appendStreamingRaw: (chunk: string) => void;

  // Selected file in the file tree
  selectedFile: string | null;
  setSelectedFile: (f: string | null) => void;

  errorMsg: string;
  setErrorMsg: (m: string) => void;

  generationId: string | null;
  setGenerationId: (id: string | null) => void;

  currentStreamingFile: string;
  setCurrentStreamingFile: (f: string) => void;

  reset: () => void;
}

export const useStore = create<GenerateState>((set) => ({
  figmaUrl: "",
  setFigmaUrl: (figmaUrl) => set({ figmaUrl }),

  mode: "scaffold",
  setMode: (mode) => set({ mode }),

  stack: "react_typescript",
  setStack: (stack) => set({ stack }),

  inspect: null,
  setInspect: (inspect) => set({ inspect }),

  customPrompt: "",
  setCustomPrompt: (customPrompt) => set({ customPrompt }),

  status: "idle",
  setStatus: (status) => set({ status }),

  generatedFiles: [],
  setGeneratedFiles: (generatedFiles) => set({ generatedFiles }),

  streamingRaw: "",
  appendStreamingRaw: (chunk) => set((s) => ({ streamingRaw: s.streamingRaw + chunk })),

  selectedFile: null,
  setSelectedFile: (selectedFile) => set({ selectedFile }),

  errorMsg: "",
  setErrorMsg: (errorMsg) => set({ errorMsg }),

  generationId: null,
  setGenerationId: (generationId) => set({ generationId }),

  currentStreamingFile: "",
  setCurrentStreamingFile: (currentStreamingFile) => set({ currentStreamingFile }),

  reset: () =>
    set({
      status: "idle",
      generatedFiles: [],
      streamingRaw: "",
      selectedFile: null,
      errorMsg: "",
      generationId: null,
      currentStreamingFile: "",
    }),
}));
