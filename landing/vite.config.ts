import { copyFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(__dirname, "dist");

// 개발 서버(npm run dev:landing)에서 API·정적 자산은 Node 서버(npm start, 8080)로 넘긴다.
const API_TARGET = process.env.CUBERRY_API || "http://127.0.0.1:8080";
const proxied = ["/api", "/cms-bridge.js", "/images", "/portfolio_thumbs", "/team_portraits", "/uploads", "/us-ad-rere.mp4"];

// 단일 파일로 빌드된 landing/dist/index.html 을 저장소 루트 index.html 로 복사한다.
// Node 서버(server/index.mjs)와 GitHub Pages 모두 이 루트 파일을 그대로 서빙한다.
function publishToRepoRoot(): Plugin {
  return {
    name: "cuberry-publish-root-index",
    apply: "build",
    closeBundle() {
      copyFileSync(path.join(OUT_DIR, "index.html"), path.join(REPO_ROOT, "index.html"));
      console.log("\n[cuberry] landing/dist/index.html → index.html 복사 완료");
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  base: "./",
  // 이미지는 저장소 루트 images/ 에 두고 상대경로(images/…)로 참조한다 → 복사할 필요가 없다.
  publicDir: false,
  plugins: [react(), tailwindcss(), viteSingleFile(), publishToRepoRoot()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: Object.fromEntries(proxied.map((prefix) => [prefix, { target: API_TARGET, changeOrigin: true }])),
  },
});
