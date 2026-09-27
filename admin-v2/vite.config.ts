import { copyFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, "app");
const OUT_DIR = path.resolve(__dirname, "dist");

// 개발 서버(npm run dev:admin)에서 API·정적 자산은 Node 서버(npm start, 8080)로 넘긴다.
const API_TARGET = process.env.CUBERRY_API || "http://127.0.0.1:8080";
const proxied = ["/api", "/cms-bridge.js", "/images", "/portfolio_thumbs", "/team_portraits", "/uploads", "/us-ad-rere.mp4"];

// 단일 파일로 빌드된 admin-v2/dist/index.html 을 admin-v2/index.html 로 복사한다.
// Node 서버(server/index.mjs)와 GitHub Pages 모두 이 디렉터리를 그대로 서빙한다.
// (소스 셸은 admin-v2/app/index.html 이라 빌드 산출물과 경로가 겹치지 않는다.)
function publishToRepoRoot(): Plugin {
  return {
    name: "cuberry-publish-admin-v2",
    apply: "build",
    closeBundle() {
      copyFileSync(path.join(OUT_DIR, "index.html"), path.resolve(__dirname, "index.html"));
      console.log("\n[cuberry] admin-v2/dist/index.html → admin-v2/index.html 복사 완료");
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  root: APP_ROOT,
  base: "./",
  publicDir: false,
  plugins: [react(), tailwindcss(), viteSingleFile(), publishToRepoRoot()],
  resolve: {
    alias: {
      "@": path.resolve(APP_ROOT, "src"),
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
