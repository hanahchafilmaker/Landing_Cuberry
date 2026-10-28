#!/usr/bin/env node
// Google Drive 서비스 계정 값이 올바른지 검사한다(Render 에 넣기 전에 로컬에서 확인용).
//
//   node scripts/check-drive-service-account.mjs --key ~/keys/sa.json --folder-id <폴더 id>
//   node scripts/check-drive-service-account.mjs --key ~/keys/sa.json --folder-id <폴더 id> --online
//   node scripts/check-drive-service-account.mjs --env-file .env      # 이미 넣은 값 검사
//   node scripts/check-drive-service-account.mjs --self-test          # 오프라인 자체 점검
//
// --online 은 실제로 토큰을 받아 폴더를 읽고, 그중 "사이트에 노출될 영상(링크 공개)" 수까지 센다.
// 키·토큰·파일 ID 는 출력하지 않는다(이메일과 개수만).
import { createPrivateKey, sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const SCOPES = ["https://www.googleapis.com/auth/drive.metadata.readonly"];

let failures = 0;
const ok = (message) => console.log(`  ✓ ${message}`);
const warn = (message) => console.log(`  ! ${message}`);
const fail = (message) => {
  failures += 1;
  console.log(`  ✗ ${message}`);
};

function usage() {
  console.log(`사용법:
  node scripts/check-drive-service-account.mjs --key <키.json> [--folder-id <폴더 id>] [--online]
  node scripts/check-drive-service-account.mjs --env-file <.env> [--online]
  node scripts/check-drive-service-account.mjs --self-test`);
}

/** 붙여넣기 사고(따옴표·이스케이프·앞뒤 공백)까지 잡아낸다. */
export function parseCredentials(raw) {
  const problems = [];
  let text = String(raw ?? "").trim();
  if (!text) return { problems: ["값이 비어 있습니다"], credentials: null };

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    problems.push("값이 따옴표로 감싸져 있습니다 — Render 에는 따옴표 없이 붙여넣으세요");
    text = text.slice(1, -1).trim();
  }
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(text) && !text.startsWith("{")) {
    problems.push("JSON 이 아니라 base64 로 보입니다 — 서비스 계정 JSON 원문을 그대로 넣으세요");
  }

  let credentials = null;
  try {
    credentials = JSON.parse(text);
  } catch (error) {
    problems.push(`JSON 파싱 실패: ${String(error.message).slice(0, 120)}`);
    if (text.includes("\\n") && /\n/.test(text)) {
      problems.push("private_key 에 실제 줄바꿈과 \\n 이 섞여 있습니다 — 파일 내용을 그대로 복사하세요");
    }
    return { problems, credentials: null };
  }

  if (!credentials || typeof credentials !== "object") {
    problems.push("JSON 최상위가 객체가 아닙니다");
    return { problems, credentials: null };
  }
  if (credentials.type !== "service_account") {
    problems.push(`type 이 "service_account" 가 아닙니다 (지금: ${JSON.stringify(credentials.type)}) — OAuth 클라이언트 키가 아닌지 확인하세요`);
  }
  if (typeof credentials.client_email !== "string" || !credentials.client_email.includes("@")) {
    problems.push("client_email 이 없습니다");
  } else if (!credentials.client_email.endsWith(".iam.gserviceaccount.com")) {
    problems.push("client_email 이 서비스 계정 형식이 아닙니다");
  }
  if (typeof credentials.private_key !== "string" || !credentials.private_key.includes("BEGIN PRIVATE KEY")) {
    problems.push("private_key 가 없거나 PEM 형식이 아닙니다");
  } else {
    try {
      createPrivateKey({ key: credentials.private_key });
    } catch (error) {
      problems.push(`private_key 를 읽을 수 없습니다: ${String(error.message).slice(0, 120)}`);
    }
  }
  if (credentials.token_uri && !/^https:\/\//.test(credentials.token_uri)) {
    problems.push("token_uri 가 https 주소가 아닙니다");
  }
  return { problems, credentials };
}

export function parseFolderId(raw) {
  const text = String(raw ?? "").trim();
  const fromUrl = text.match(/folders\/([A-Za-z0-9_-]{8,200})/) || text.match(/[?&]id=([A-Za-z0-9_-]{8,200})/);
  const value = fromUrl ? fromUrl[1] : text;
  if (!/^[A-Za-z0-9_-]{8,200}$/.test(value)) return { folderId: "", problem: "폴더 ID 형식이 아닙니다 (folders/ 뒤 문자열만)" };
  if (text.includes("/file/d/")) return { folderId: "", problem: "파일 링크입니다 — 폴더 링크의 folders/<id> 를 쓰세요" };
  return { folderId: value, problem: "" };
}

function readEnvFile(file) {
  const vars = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[match[1]] = value;
  }
  return vars;
}

async function accessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", typ: "JWT" });
  const payload = encode({
    iss: credentials.client_email,
    scope: SCOPES.join(" "),
    aud: credentials.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    createPrivateKey({ key: credentials.private_key }),
  ).toString("base64url");
  const response = await fetch(credentials.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${payload}.${signature}`,
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) {
    const detail = json.error || `HTTP ${response.status}`;
    throw new Error(
      detail === "invalid_grant"
        ? "invalid_grant — 키가 삭제·교체되었거나 서버 시계가 크게 어긋났습니다"
        : String(detail),
    );
  }
  return json.access_token;
}

async function driveGet(token, url) {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

async function online({ credentials, folderId }) {
  console.log("\n[2/2] 온라인 확인 (Google API)");
  let token;
  try {
    token = await accessToken(credentials);
    ok("토큰 발급 성공 (키·시계 정상)");
  } catch (error) {
    const message = String(error.message || error);
    fail(
      /fetch failed|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|network/i.test(message)
        ? "토큰 발급 실패: Google API 에 연결하지 못했습니다 — 인터넷·방화벽·프록시를 확인하세요 (이 스크립트는 외부 HTTPS 가 필요합니다)"
        : `토큰 발급 실패: ${message}`,
    );
    return;
  }

  const rootUrl = new URL(`${DRIVE_API}/${folderId}`);
  rootUrl.searchParams.set("fields", "id,name,mimeType");
  rootUrl.searchParams.set("supportsAllDrives", "true");
  const root = await driveGet(token, rootUrl);
  if (root.status === 404) {
    fail("폴더를 찾을 수 없습니다 — 서비스 계정 이메일을 폴더에 '뷰어'로 공유했는지 확인하세요 (docs/google-drive-setup.md 2-5)");
    return;
  }
  if (root.status === 403) {
    const reason = root.json?.error?.errors?.[0]?.reason || root.json?.error?.status || "";
    fail(
      reason === "SERVICE_DISABLED" || String(root.json?.error?.message).includes("disabled")
        ? "Google Drive API 가 꺼져 있습니다 — Cloud Console → API 및 서비스 → 라이브러리에서 사용 설정 (2-2)"
        : `권한 거부(403 ${reason}) — 폴더 공유 권한을 확인하세요`,
    );
    return;
  }
  if (root.status !== 200 || root.json?.mimeType !== FOLDER_MIME) {
    fail(`폴더가 아닙니다 (HTTP ${root.status}) — 폴더 링크의 folders/<id> 를 쓰세요`);
    return;
  }
  ok(`폴더 읽기 성공: "${root.json.name}"`);

  // 서버와 같은 조건으로 훑는다: 하위 폴더 재귀 + 링크 공개된 영상만.
  const queue = [folderId];
  const seen = new Set(queue);
  const shared = [];
  const privateVideos = [];
  let folders = 0;
  while (queue.length) {
    const current = queue.shift();
    const url = new URL(DRIVE_API);
    url.searchParams.set(
      "q",
      `'${current}' in parents and trashed = false and (mimeType = '${FOLDER_MIME}' or mimeType contains 'video/')`,
    );
    url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,visibility)");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    const page = await driveGet(token, url);
    if (page.status !== 200) {
      fail(`목록 조회 실패 (HTTP ${page.status})`);
      return;
    }
    for (const file of page.json.files || []) {
      if (file.mimeType === FOLDER_MIME) {
        folders += 1;
        if (!seen.has(file.id)) {
          seen.add(file.id);
          queue.push(file.id);
        }
      } else if (["anyoneWithLink", "anyoneCanFind"].includes(file.visibility)) {
        shared.push(file.name);
      } else {
        privateVideos.push(file.name);
      }
    }
  }

  if (shared.length) {
    ok(`링크 공개된 영상 ${shared.length}편 → 랜딩 DRIVE FILM 에 썸네일 카드로 표시됩니다`);
  } else {
    fail("링크 공개된 영상이 0편입니다 — 노출할 영상만 '링크가 있는 모든 사용자 · 뷰어'로 공유하세요");
  }
  if (privateVideos.length) {
    warn(`링크 비공개 영상 ${privateVideos.length}편 → 사이트에는 나오지 않습니다(썸네일·재생 불가)`);
  }
  console.log(`  · 하위 폴더 ${folders}개 · 영상 ${shared.length + privateVideos.length}편 확인`);
  if (shared.length) {
    console.log("\n  예시(최대 5편):");
    for (const name of shared.slice(0, 5)) console.log(`    - ${name}`);
  }
}

export function selfTest() {
  const problems = (value) => parseCredentials(value).problems;
  const good = {
    type: "service_account",
    project_id: "demo",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----\n",
    client_email: "reader@demo.iam.gserviceaccount.com",
    token_uri: "https://oauth2.googleapis.com/token",
  };
  const cases = [
    ["빈 값", "", /비어 있습니다/],
    ["따옴표로 감쌈", JSON.stringify(JSON.stringify(good)), /따옴표/],
    ["JSON 아님", "hello", /JSON 파싱 실패/],
    ["일반 OAuth 키", JSON.stringify({ ...good, type: "authorized_user" }), /service_account/],
    ["이메일 없음", JSON.stringify({ ...good, client_email: "" }), /client_email/],
    ["키 없음", JSON.stringify({ ...good, private_key: "" }), /private_key/],
    ["깨진 키", JSON.stringify({ ...good, private_key: "-----BEGIN PRIVATE KEY-----\nnope\n-----END PRIVATE KEY-----" }), /읽을 수 없습니다/],
  ];
  for (const [label, value, pattern] of cases) {
    const found = problems(value);
    if (!found.some((problem) => pattern.test(problem))) {
      failures += 1;
      console.error(`  ✗ ${label}: 기대한 문제를 못 찾음 → ${JSON.stringify(found)}`);
    } else {
      ok(`${label} 감지`);
    }
  }
  if (problems(JSON.stringify(good)).length === 1) {
    // 테스트용 PEM 은 실제 키가 아니므로 개인키 검사만 실패하는 것이 정상이다.
    ok("형식이 맞는 서비스 계정 JSON 은 개인키 검사만 남음");
  } else {
    failures += 1;
    console.error("  ✗ 정상 형식인데 문제가 너무 많이 보고됨");
  }

  const folders = [
    ["폴더 URL", "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz012345?usp=drive_link", "1AbCdEfGhIjKlMnOpQrStUvWxYz012345"],
    ["ID 그대로", "1AbCdEfGhIjKlMnOpQrStUvWxYz012345", "1AbCdEfGhIjKlMnOpQrStUvWxYz012345"],
    ["file 링크", "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view", ""],
    ["엉터리", "https://example.com/x", ""],
  ];
  for (const [label, input, expected] of folders) {
    const { folderId } = parseFolderId(input);
    if (folderId !== expected) {
      failures += 1;
      console.error(`  ✗ 폴더 ID ${label}: ${folderId || "(거부)"} ≠ ${expected || "(거부)"}`);
    } else {
      ok(`폴더 ID ${label}`);
    }
  }
  console.log(failures === 0 ? "\n셀프 테스트 통과" : `\n셀프 테스트 실패 ${failures}건`);
  return failures === 0 ? 0 : 1;
}

async function main(argv) {
  if (argv.includes("--self-test")) return selfTest();
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    usage();
    return argv.length === 0 ? 1 : 0;
  }

  const valueOf = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : "";
  };
  const keyPath = valueOf("--key");
  const envPath = valueOf("--env-file");
  const onlineMode = argv.includes("--online");

  let raw = "";
  if (keyPath) {
    if (!existsSync(keyPath)) {
      console.error(`키 파일을 찾을 수 없습니다: ${keyPath}`);
      return 1;
    }
    if (keyPath.includes(".git") || path.resolve(keyPath).includes(`${path.sep}Landing_Cuberry${path.sep}`)) {
      console.log("  ! 키 파일이 저장소 안에 있습니다 — 커밋되지 않도록 저장소 밖으로 옮기세요");
    }
    raw = readFileSync(keyPath, "utf8");
  } else if (envPath) {
    if (!existsSync(envPath)) {
      console.error(`env 파일을 찾을 수 없습니다: ${envPath}`);
      return 1;
    }
    const vars = readEnvFile(envPath);
    raw = vars.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || "";
    if (!valueOf("--folder-id")) argv.push("--folder-id", vars.GOOGLE_DRIVE_FOLDER_ID || "");
  } else {
    usage();
    return 1;
  }

  console.log("[1/2] 서비스 계정 JSON");
  const { problems, credentials } = parseCredentials(raw);
  for (const problem of problems) fail(problem);
  if (credentials && problems.length === 0) {
    ok(`형식 정상 — ${credentials.client_email}`);
  }

  const folderRaw = valueOf("--folder-id") || process.env.GOOGLE_DRIVE_FOLDER_ID || "";
  const folder = parseFolderId(folderRaw);
  if (!folderRaw) {
    console.log("\n  ! --folder-id 가 없어 폴더 검사는 건너뜁니다");
  } else if (folder.problem) {
    fail(`폴더 ID: ${folder.problem}`);
  } else {
    ok(`폴더 ID 형식 정상 (${folder.folderId.slice(0, 4)}…${folder.folderId.slice(-4)})`);
  }

  if (failures > 0 || !credentials) {
    console.log("\n고칠 곳이 있습니다 — docs/google-drive-setup.md 참고");
    return 1;
  }
  if (!onlineMode) {
    console.log("\n오프라인 검사 통과. 실제 권한까지 확인하려면 --online 을 붙여 다시 실행하세요.");
    return 0;
  }
  if (!folder.folderId) {
    console.log("\n--online 에는 --folder-id 가 필요합니다");
    return 1;
  }
  await online({ credentials, folderId: folder.folderId });
  console.log(failures === 0 ? "\n온라인 확인 통과 — 이 값을 Render 환경변수에 넣으면 됩니다." : "\n문제를 먼저 해결하세요 — docs/google-drive-setup.md");
  return failures === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
