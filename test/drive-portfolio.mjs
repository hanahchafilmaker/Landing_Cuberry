// 비공개 폴더 조회: 공개 영상 필터, 재귀, 페이징, 권한 회수, 실패 시 안전 처리.
// Google API와 인증은 로컬 모의 응답만 사용한다.
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { JWT } from "google-auth-library";
import { createDrivePortfolio } from "../server/lib/drive-portfolio.mjs";

const ROOT = "root_folder_12345";
const FOLDER = "application/vnd.google-apps.folder";
const TOKEN = "local-token-not-for-output";
const PRIVATE_TITLE = "private-video-secret.mp4";
const node = (id, name, mimeType = "video/mp4", extra = {}) => ({ id, name, mimeType, ...extra });
const rootVideo = node("root_video_123", "Root film.mp4", "video/mp4", { visibility: "anyoneWithLink", description: "do not expose" });
const subVideo = node("nested_video_123", "Nested_2026.mp4", "video/mp4", { visibility: "anyoneCanFind", resourceKey: "resource_key_123", description: "private description" });
const privateVideo = node("private_video_123", PRIVATE_TITLE, "video/mp4", { visibility: "limited" });
const list = new Map([
  [ROOT, [
    { files: [node("folder_commercial", "Internal folder name", FOLDER), rootVideo, privateVideo, node("ignored_doc_123", "notes.txt", "text/plain")], nextPageToken: "next" },
    { files: [node("folder_guide_123", "02_Guide", FOLDER), node("folder_archive_123", "_archive", FOLDER)] },
  ]],
  ["folder_commercial", [{ files: [node("folder_nested_123", "Confidential folder", FOLDER)] }]],
  ["folder_nested_123", [{ files: [subVideo] }]],
  ["folder_guide_123", [{ files: [node("guide_video_123", "Guide_XCONDA_05_AutoAngleGenerator_KO.mp4", "video/mp4", { visibility: "anyoneWithLink", videoMediaMetadata: { width: 1080, height: 1920, durationMillis: 61_000 } })] }]],
  ["folder_archive_123", [{ files: [node("archived_video_123", "Old_Duplicate_dup.mp4", "video/mp4", { visibility: "anyoneWithLink" })] }]],
]);
let clock = Date.parse("2026-10-28T00:00:00Z");
let calls = [];
let failingFolder = "";
let failRoot = false;
let repeatedToken = false;
let incomplete = false;
const warnings = [];
const auth = async () => ({ authorization: `Bearer ${TOKEN}` });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockFetch(input, options = {}) {
  const url = new URL(input);
  calls.push(url.toString());
  assert.equal(options.headers.authorization, `Bearer ${TOKEN}`, "인증은 서버의 헤더로만 보낸다");
  assert.equal(url.searchParams.has("key"), false, "인증 정보를 URL에 노출하지 않는다");
  assert.ok(options.signal, "Drive 요청에는 제한 시간이 있다");
  await delay(1);
  if (url.pathname.endsWith(`/files/${ROOT}`)) {
    return failRoot
      ? { ok: false, status: 404 }
      : { ok: true, json: async () => ({ id: ROOT, mimeType: FOLDER }) };
  }
  const q = url.searchParams.get("q");
  const folderId = q?.match(/^'([^']+)' in parents/)?.[1];
  assert.ok(folderId, "부모 폴더를 Drive 쿼리에 지정한다");
  assert.match(q, /trashed = false/);
  assert.match(q, /mimeType contains 'video\//);
  assert.match(q, /visibility = 'anyoneWithLink' or visibility = 'anyoneCanFind'/, "공개 영상으로 범위를 제한한다");
  assert.match(q, /mimeType = 'application\/vnd.google-apps.folder' or \(mimeType contains 'video\//, "비공개 하위 폴더도 탐색할 수 있다");
  assert.equal(url.searchParams.get("fields"), "nextPageToken,incompleteSearch,files(id,name,mimeType,resourceKey,videoMediaMetadata(width,height,durationMillis))");
  if (folderId === failingFolder) return { ok: false, status: 503 };
  if (repeatedToken && folderId === ROOT) return { ok: true, json: async () => ({ files: [], nextPageToken: "repeat" }) };
  if (incomplete && folderId === ROOT) return { ok: true, json: async () => ({ files: [], incompleteSearch: true }) };
  const pages = list.get(folderId) || [{ files: [] }];
  const index = url.searchParams.has("pageToken") ? 1 : 0;
  const page = structuredClone(pages[index] || { files: [] });
  // Drive 서버가 q에 따라 필터한 결과를 흉내 낸다.
  page.files = page.files.filter((file) => file.mimeType === FOLDER || (file.mimeType.startsWith("video/") && ["anyoneWithLink", "anyoneCanFind"].includes(file.visibility)));
  return { ok: true, json: async () => page };
}

const service = createDrivePortfolio({
  folderId: ROOT, getAuthHeaders: auth, fetchImpl: mockFetch, now: () => clock,
  cacheMs: 60_000, retryMs: 30_000, logger: { warn: (message) => warnings.push(message) },
});

console.log("[drive] 재귀·페이징·공개 영상 필터·동시 요청 공유");
const [first, concurrent] = await Promise.all([service.get(), service.get(), service.get()]);
assert.deepEqual(first, concurrent);
assert.equal(first.status, "ready");
assert.deepEqual(first.videos.map((video) => video.id).sort(), ["guide_video_123", "nested_video_123", "root_video_123"]);
const nested = first.videos.find((video) => video.id === "nested_video_123");
assert.equal(nested.resourceKey, "resource_key_123");
assert.equal(nested.category, "other", "루트에 바로 있는 영상은 기타로 분류된다");
assert.equal(nested.categoryLabel, "기타");
assert.equal(nested.group, "other:nested_2026");
assert.equal(nested.title, "Nested 2026");
assert.equal(nested.aspect, "landscape");
assert.deepEqual(Object.keys(nested).sort(), [
  "aspect", "category", "categoryLabel", "durationMs", "episode", "group", "height", "id", "name",
  "resourceKey", "search", "section", "title", "variant", "version", "width",
]);
assert.deepEqual(Object.keys(first).sort(), ["status", "updatedAt", "videos"]);
const guide = first.videos.find((video) => video.id === "guide_video_123");
assert.equal(guide.category, "guide", "02_Guide 폴더는 가이드로 분류된다");
assert.equal(guide.categoryLabel, "가이드");
assert.equal(guide.aspect, "portrait", "세로 영상은 portrait 로 표시한다");
assert.equal(guide.durationMs, 61_000);
assert.equal(first.videos.some((video) => video.id === "archived_video_123"), false, "_archive 는 공개 목록에서 뺀다");
assert.equal(calls.some((call) => call.includes("folder_archive_123")), false, "_archive 하위는 조회하지 않는다");
for (const secret of [ROOT, TOKEN, PRIVATE_TITLE, "private_video_123", "Internal folder name", "Confidential folder", "private description", "folder_commercial", "02_Guide", "_archive"]) {
  assert.equal(JSON.stringify(first).includes(secret), false, `${secret} 공개 금지`);
}
assert.equal(calls.filter((call) => new URL(call).pathname.endsWith(`/files/${ROOT}`)).length, 1);
assert.equal(calls.filter((call) => new URL(call).searchParams.get("pageToken") === "next").length, 1);
const callsAfterFirst = calls.length;
clock += 59_999;
assert.deepEqual(await service.get(), first);
assert.equal(calls.length, callsAfterFirst, "1분 캐시 중에는 API를 반복 호출하지 않는다");

console.log("[drive] 공개 해제·추가·삭제는 다음 정상 조회에 반영");
rootVideo.visibility = "limited";
list.set("folder_nested_123", [{ files: [node("new_video_12345", "New.mp4", "video/mp4", { visibility: "anyoneWithLink", resourceKey: "<invalid>" })] }]);
list.set("folder_guide_123", [{ files: [] }]);
clock += 2;
const changed = await service.get();
assert.equal(changed.status, "ready");
assert.equal(changed.videos.length, 1);
assert.equal(changed.videos[0].id, "new_video_12345");
assert.equal(changed.videos[0].name, "New.mp4");
assert.equal("resourceKey" in changed.videos[0], false, "형식이 틀린 resourceKey 는 버린다");
assert.notEqual(changed.updatedAt, first.updatedAt);

console.log("[drive] 일부 폴더 오류는 이전 목록도 비우고 짧게 재시도");
failingFolder = "folder_nested_123";
clock += 60_001;
const failed = await service.get();
assert.equal(failed.status, "unavailable");
assert.deepEqual(failed.videos, []);
assert.equal(failed.updatedAt, null);
assert.ok(warnings[0].includes("http-503"));
assert.equal(warnings.join(" ").includes(TOKEN), false);
const failedCalls = calls.length;
await service.get();
assert.equal(calls.length, failedCalls, "오류 시 재시도 대기 시간을 지킨다");
failingFolder = "";
list.set(ROOT, [{ files: [] }]);
clock += 30_001;
assert.deepEqual((await service.get()).videos, [], "빈 폴더도 정상 반영");

console.log("[drive] 미설정·권한 오류·불완전 조회·잘못된 페이징은 안전하게 처리");
let unconfiguredCalled = false;
for (const config of [
  { folderId: ROOT, serviceAccount: "" },
  { folderId: ROOT, serviceAccount: "not JSON" },
  { folderId: ROOT, serviceAccount: JSON.stringify({ type: "authorized_user", client_email: "x", private_key: "secret" }) },
  { folderId: "bad' query", getAuthHeaders: auth },
]) {
  const unconfigured = createDrivePortfolio({ ...config, fetchImpl: async () => { unconfiguredCalled = true; } });
  assert.deepEqual(await unconfigured.get(), { status: "unconfigured", updatedAt: null, videos: [] });
}
assert.equal(unconfiguredCalled, false);
failRoot = true;
const inaccessible = createDrivePortfolio({ folderId: ROOT, getAuthHeaders: auth, fetchImpl: mockFetch, logger: { warn() {} } });
assert.equal((await inaccessible.get()).status, "unavailable", "접근 불가는 빈 폴더가 아니다");
failRoot = false;
repeatedToken = true;
const looping = createDrivePortfolio({ folderId: ROOT, getAuthHeaders: auth, fetchImpl: mockFetch, logger: { warn() {} } });
assert.equal((await looping.get()).status, "unavailable");
repeatedToken = false;
incomplete = true;
const partial = createDrivePortfolio({ folderId: ROOT, getAuthHeaders: auth, fetchImpl: mockFetch, logger: { warn() {} } });
assert.equal((await partial.get()).status, "unavailable");
incomplete = false;
const deepTree = createDrivePortfolio({ folderId: ROOT, getAuthHeaders: auth, logger: { warn() {} }, fetchImpl: async (input) => {
  const url = new URL(input);
  if (url.pathname.endsWith(`/files/${ROOT}`)) return { ok: true, json: async () => ({ id: ROOT, mimeType: FOLDER }) };
  const parent = url.searchParams.get("q").match(/^'([^']+)'/)[1];
  const depth = parent === ROOT ? 1 : Number(parent.replace("depth_folder_", "")) + 1;
  return { ok: true, json: async () => ({ files: depth <= 21 ? [node(`depth_folder_${depth}`, `level ${depth}`, FOLDER)] : [] }) };
} });
assert.equal((await deepTree.get()).status, "unavailable", "깊이 제한 초과 시 부분 결과를 공개하지 않는다");
const logs = [];
const networkError = createDrivePortfolio({ folderId: ROOT, getAuthHeaders: auth, fetchImpl: async () => { throw new Error(`secret ${TOKEN}`); }, logger: { warn: (line) => logs.push(line) } });
assert.equal((await networkError.get()).status, "unavailable");
assert.equal(logs.join(" ").includes(TOKEN), false);
const hanging = createDrivePortfolio({ folderId: ROOT, getAuthHeaders: () => new Promise(() => {}), fetchImpl: mockFetch, timeoutMs: 15, logger: { warn() {} } });
// AbortSignal.timeout은 자체적으로 이벤트 루프를 유지하지 않으므로 테스트 대기 타이머도 함께 둔다.
const keepAlive = setTimeout(() => {}, 100);
assert.equal((await hanging.get()).status, "unavailable", "인증 지연도 제한 시간 내에 실패한다");
clearTimeout(keepAlive);

console.log("[drive] 서비스 계정 JSON으로 읽기 전용 JWT 서명 및 토큰 교환");
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" });
const originalHeaders = JWT.prototype.getRequestHeaders;
let authCalls = 0;
let tokenCalls = 0;
JWT.prototype.getRequestHeaders = async function (...args) {
  authCalls++;
  assert.equal(this.email, "test-service@example.invalid");
  assert.equal(this.key, pem);
  assert.deepEqual(this.scopes, ["https://www.googleapis.com/auth/drive.metadata.readonly"]);
  // 외부 Google 연결 대신 토큰 엔드포인트만 모의하며 라이브러리의 JWT 생성·교환은 그대로 실행한다.
  this.transporter.defaults.fetchImplementation = async (input, options) => {
    tokenCalls++;
    assert.equal(String(input), "https://oauth2.googleapis.com/token");
    assert.equal(options.method, "POST");
    const body = new URLSearchParams(String(options.body));
    assert.equal(body.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
    const [header, payload, signature] = body.get("assertion").split(".");
    assert.equal(JSON.parse(Buffer.from(header, "base64url").toString()).alg, "RS256");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    assert.equal(claims.iss, "test-service@example.invalid");
    assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
    assert.equal(claims.scope, "https://www.googleapis.com/auth/drive.metadata.readonly");
    assert.equal(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url")), true);
    return new Response(JSON.stringify({ access_token: TOKEN, token_type: "Bearer", expires_in: 3600 }), { status: 200, headers: { "content-type": "application/json" } });
  };
  return originalHeaders.apply(this, args);
};
try {
  const usingJson = createDrivePortfolio({
    folderId: ROOT,
    serviceAccount: JSON.stringify({ type: "service_account", client_email: "test-service@example.invalid", private_key: pem }),
    fetchImpl: mockFetch,
  });
  const actual = await usingJson.get();
  assert.equal(actual.status, "ready");
  assert.equal(authCalls, 1);
  assert.equal(tokenCalls, 1);
  assert.equal(JSON.stringify(actual).includes(pem), false);
} finally {
  JWT.prototype.getRequestHeaders = originalHeaders;
}
console.log("[drive] 설정 진단은 비밀값 없이 사유를 알려준다");
{
  const empty = createDrivePortfolio({ folderId: "", serviceAccount: "", getAuthHeaders: null });
  const emptyDiag = empty.diagnose();
  assert.equal(emptyDiag.configured, false);
  assert.equal(emptyDiag.folderIdSet, false);
  assert.equal(emptyDiag.reasons.length, 2);
  assert.match(emptyDiag.reasons.join(" "), /GOOGLE_DRIVE_FOLDER_ID 없음/);
  assert.match(emptyDiag.reasons.join(" "), /SERVICE_ACCOUNT_JSON 없음/);

  const urlId = createDrivePortfolio({ folderId: "https://drive.google.com/drive/folders/root_folder_12345", serviceAccount: "", getAuthHeaders: null });
  const urlDiag = urlId.diagnose();
  assert.equal(urlDiag.folderIdSet, true);
  assert.equal(urlDiag.folderIdValid, false, "URL 을 넣으면 형식 오류로 잡는다");
  assert.match(urlDiag.reasons.join(" "), /형식 오류/);

  const badJson = createDrivePortfolio({ folderId: ROOT, serviceAccount: "{quoted}", getAuthHeaders: null });
  assert.match(badJson.diagnose().reasons.join(" "), /JSON 파싱 실패/);

  const wrongType = createDrivePortfolio({
    folderId: ROOT,
    serviceAccount: JSON.stringify({ type: "authorized_user", client_email: "someone@example.com" }),
    getAuthHeaders: null,
  });
  const wrongDiag = wrongType.diagnose();
  assert.equal(wrongDiag.serviceAccountSet, true);
  assert.equal(wrongDiag.serviceAccountParsed, false);
  assert.equal(wrongDiag.serviceAccountEmail, "som***@example.com");
  assert.match(wrongDiag.reasons.join(" "), /service_account/);

  const good = createDrivePortfolio({
    folderId: ROOT,
    serviceAccount: JSON.stringify({ type: "service_account", client_email: "reader@project.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----" }),
    getAuthHeaders: null,
  });
  const goodDiag = good.diagnose();
  assert.equal(goodDiag.configured, true);
  assert.equal(goodDiag.serviceAccountParsed, true);
  assert.equal(goodDiag.serviceAccountEmail, "rea***@project.iam.gserviceaccount.com");
  assert.deepEqual(goodDiag.reasons, []);
  assert.equal(JSON.stringify(goodDiag).includes("BEGIN PRIVATE KEY"), false, "진단에 키가 들어가지 않는다");
}

console.log("[drive] 통과");
