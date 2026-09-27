import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/trpc";

// 서빙 경로가 다른 두 배포(Render "/admin-v2", GitHub Pages "/Landing_Cuberry/admin-v2")에서
// 모두 동작하도록 wouter base 를 현재 주소에서 계산한다.
const marker = "/admin-v2";
const pathname = window.location.pathname;
const idx = pathname.indexOf(marker);
const base = idx >= 0 ? pathname.slice(0, idx) + marker : marker;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router base={base}>
        <App />
      </Router>
    </QueryClientProvider>
  </StrictMode>,
);
