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

// 한영 자동 번역(landing/src/i18n)의 주소는 ?lang=ko · ?lang=en 두 가지다.
// 검색엔진이 두 언어를 같은 페이지로 알 수 있게 hreflang 링크를 빌드 산출물에 넣는다.
// (HTML 에 직접 써 두면 Vite 가 rel="alternate" 를 번들 대상으로 오해하므로 빌드 단계에서 주입한다)
// 같은 파일이 GitHub Pages 미러(…/Landing_Cuberry/)에서도 서빙되므로 **공식 주소 절대경로**로 적는다.
// 상대주소로 두면 크롤러가 미러 주소를 두 언어의 정본으로 오해할 수 있다(docs/domain-setup.md).
//
// ⚠ hreflang 은 **각 언어의 canonical 주소**를 가리켜야 한다. 국문 정본은 `/` 이므로
//    `ko` 도 `/?lang=ko` 가 아니라 `/` 로 적는다(`/?lang=ko` 는 canonical 이 `/` 라
//    hreflang 이 다른 주소를 가리키는 셈이 되어 검색엔진이 무시할 수 있다).
//    같은 규칙을 sitemap.xml · en/index.html · kr/index.html ·
//    런타임(LanguageContext 의 syncCanonical)이 함께 지킨다.
function injectLanguageAlternates(): Plugin {
  return {
    name: "cuberry-language-alternates",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const links = [
          '    <link rel="alternate" hreflang="ko" href="https://www.cuberry.kr/" />',
          '    <link rel="alternate" hreflang="en" href="https://www.cuberry.kr/?lang=en" />',
          '    <link rel="alternate" hreflang="x-default" href="https://www.cuberry.kr/" />',
          "  </head>",
        ].join("\n");
        return html.replace("  </head>", links);
      },
    },
  };
}

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
  plugins: [react(), tailwindcss(), viteSingleFile(), injectLanguageAlternates(), publishToRepoRoot()],
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
