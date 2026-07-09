import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { GeneratePage } from "@/pages/GeneratePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { DocsPage } from "@/pages/DocsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <TopBar />
            <main className="flex-1 min-h-0 flex flex-col overflow-hidden" id="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/generate" replace />} />
                <Route path="/generate" element={<GeneratePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/docs" element={<DocsPage />} />
              </Routes>
            </main>
          </div>
        </div>

        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#1E293B",
              border: "1px solid #475569",
              color: "#F8FAFC",
              fontFamily: "'Fira Sans', sans-serif",
              fontSize: "13px",
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
