// ─────────────────────────────────────────────────────────────
// 검색엔진 소유확인 파일 (Google Search Console · 네이버 서치어드바이저)
//
// URL 접두어 속성은 DNS 를 건드리지 않고 **저장소 루트의 파일 한 개**로 인증합니다.
// GitHub Pages 는 저장소 루트를 그대로 서빙하므로 파일만 커밋하면 www.cuberry.kr 에서 열립니다.
// 다만 운영 API 서버(Render)는 정해진 경로만 서빙하므로, 같은 파일이 **서버에서도** 열리도록
// server/index.mjs 가 아래 화이트리스트를 보고 서빙합니다(도메인을 나중에 옮겨도 인증이 유지되게).
//
// 보안: 파일 이름은 **루트 한 단계 + 정해진 접두사 + 영숫자**만 허용한다.
//       슬래시·점(.) 이 이름 안에 들어갈 수 없으므로 경로 탈출이 불가능하다.
// ─────────────────────────────────────────────────────────────

/** 발급기관별 파일 이름 규칙. 새 기관을 쓰면 여기 한 줄만 늘리면 된다. */
export const VERIFICATION_PROVIDERS = [
  {
    id: "google",
    label: "Google Search Console",
    // 예: google1a2b3c4d5e6f7a8b.html
    pattern: /^google[a-z0-9]{8,40}\.html$/i,
    /** 구글이 요구하는 파일 내용은 딱 한 줄이다(이름과 동일). */
    content: (name) => `google-site-verification: ${name}`,
  },
  {
    id: "naver",
    label: "네이버 서치어드바이저",
    // 예: naver1a2b3c4d5e6f.html — 네이버는 파일 내용도 지정하지 않고 이름만 본다.
    pattern: /^naver[a-z0-9]{8,40}\.html$/i,
    content: () => "naver-site-verification",
  },
  {
    id: "yandex",
    label: "Yandex Webmaster",
    pattern: /^yandex_[a-z0-9]{8,40}\.html$/i,
    content: () => "yandex-site-verification",
  },
  {
    id: "bing",
    label: "Bing Webmaster Tools",
    pattern: /^BingSiteAuth\.xml$/,
    content: () => "",
  },
];

/**
 * 루트에 둘 수 있는 소유확인 파일 이름인지. 허용되지 않으면 null.
 * (경로 구분자·상위 참조가 섞이면 어떤 규칙에도 걸리지 않는다)
 */
export function providerForFile(name) {
  const base = String(name || "").split("/").pop();
  if (!base || base === "." || base === "..") return null;
  return VERIFICATION_PROVIDERS.find((provider) => provider.pattern.test(base)) || null;
}

/** 파일 이름만 보고 "정적 서빙해도 되는 안전한 이름" 인지 판단한다(서버 라우트용). */
export function isVerificationFile(name) {
  return providerForFile(name) !== null;
}

/** 새로 만들 파일의 기본 내용. Bing 처럼 내용이 정해진 경우 빈 문자열. */
export function verificationContent(name, provided) {
  const provider = providerForFile(name);
  if (!provider) return null;
  const text = provided === undefined ? provider.content(String(name).split("/").pop()) : String(provided);
  return text.endsWith("\n") ? text : `${text}\n`;
}

// ── CLI ─────────────────────────────────────────────────────
// 사용법:
//   npm run seo:verify -- google1a2b3c4d5e6f7a8b.html
//   npm run seo:verify -- naver1a2b3c4d5e6f.html --content "직접 받은 내용"
// 파일을 저장소 루트에 만들고, 이어서 해야 할 일을 출력한다.
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function writeVerificationFile(name, { dir, content } = {}) {
  const base = String(name || "").split("/").pop();
  if (!isVerificationFile(base)) {
    throw new Error(
      `허용되지 않는 파일 이름: ${base || "(빈 값)"}\n` +
        `  발급기관이 준 파일 이름을 그대로 쓰세요. 예) google1a2b3c4d5e6f7a8b.html`,
    );
  }
  const body = verificationContent(base, content);
  const target = path.join(dir || process.cwd(), base);
  writeFileSync(target, body, "utf8");
  return { file: target, content: body, provider: providerForFile(base) };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const contentIndex = args.findIndex((arg) => arg === "--content");
  const name = args.find((arg, index) => !arg.startsWith("--") && index !== contentIndex + 1);
  const content = contentIndex >= 0 ? args[contentIndex + 1] : undefined;

  if (!name) {
    console.error(
      [
        "사용법: npm run seo:verify -- <발급받은 파일 이름> [--content \"내용\"]",
        "",
        "예)  npm run seo:verify -- google1a2b3c4d5e6f7a8b.html",
        "     npm run seo:verify -- naver1a2b3c4d5e6f.html",
        "",
        "Google Search Console → URL 접두어 속성 → HTML 파일 다운로드 후 파일 이름을 그대로 넣으세요.",
      ].join("\n"),
    );
    process.exit(1);
  }
  if (name.endsWith(".xml") && content === undefined) {
    console.error("BingSiteAuth.xml 은 발급받은 파일 그대로 넣어야 하므로 --content 가 필요합니다.");
    process.exit(1);
  }

  try {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const exists = existsSync(path.join(root, name));
    const result = writeVerificationFile(name, { dir: root, content });
    console.log(`\n${exists ? "갱신" : "생성"}: ${path.relative(root, result.file)}`);
    console.log(`  발급기관: ${result.provider.label}`);
    console.log(`  내용: ${JSON.stringify(result.content.trim())}`);
    console.log("\n다음 순서:");
    console.log("  1) npm run typecheck && npm test   # 인증 파일 서빙 배선까지 검사");
    console.log("  2) 커밋 · 푸시 (GitHub Pages 배포 1~2분)");
    console.log(`  3) https://www.cuberry.kr/${path.basename(result.file)} 가 200 인지 확인`);
    console.log("  4) Search Console / 서치어드바이저에서 소유확인 → 사이트맵 제출");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
