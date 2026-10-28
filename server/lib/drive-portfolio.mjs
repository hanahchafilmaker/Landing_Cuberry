// 비공개 Google Drive 폴더에서 링크 공개된 영상의 메타데이터만 읽는다.
// 영상은 방문자의 브라우저가 Google Drive에서 직접 재생하며, 서버에 복사하지 않는다.
import { JWT } from "google-auth-library";
import { CATEGORY_LABELS, describeVideo, rootFolder, sectionLabel } from "./drive-grouping.mjs";

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const ID = /^[A-Za-z0-9_-]{8,200}$/;
const CACHE_MS = 60 * 1000;
const RETRY_MS = 30 * 1000;
const MAX_FOLDERS = 200;
const MAX_DEPTH = 20;
const MAX_VIDEOS = 2000;
const MAX_PAGES_PER_FOLDER = 50;
const PARALLEL_FOLDERS = 4;

function safeId(value) {
  const text = String(value || "").trim();
  return ID.test(text) ? text : "";
}

class DriveError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// 인증 정보는 서버 환경에만 둔다. 토큰·키·원본 에러를 브라우저나 로그에 내보내지 않는다.
function serviceAccountHeaders(raw) {
  if (!raw) return null;
  try {
    const credentials = JSON.parse(raw);
    if (credentials.type !== "service_account" || typeof credentials.client_email !== "string" || typeof credentials.private_key !== "string") return null;
    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
    });
    return async () => Object.fromEntries((await client.getRequestHeaders()).entries());
  } catch {
    return null;
  }
}

/**
 * 폴더는 공개하지 않는다. 서비스 계정의 읽기 권한으로 하위 폴더를 탐색하되,
 * Google의 visibility 검색으로 링크 공유된 영상만 골라 사이트에 전달한다.
 * 목록에는 폴더 ID·이름·설명을 포함하지 않는다. 갱신 실패 시 오래된 목록도 비운다.
 */
export function createDrivePortfolio({
  folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "",
  serviceAccount = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || "",
  getAuthHeaders = serviceAccountHeaders(serviceAccount),
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  cacheMs = CACHE_MS,
  retryMs = RETRY_MS,
  timeoutMs = 20_000,
  logger = console,
} = {}) {
  const rootId = safeId(folderId);
  const credentialState = inspectCredentials(serviceAccount);
  let snapshot = null;
  let nextAttemptAt = 0;
  let inflight = null;

  const response = (status) => ({
    status,
    updatedAt: snapshot?.updatedAt ?? null,
    videos: snapshot?.videos ?? [],
  });

  async function request(url, headers, signal) {
    const result = await fetchImpl(url, { headers, signal });
    if (!result.ok) throw new DriveError(`http-${Number(result.status) || 0}`);
    let json;
    try { json = await result.json(); } catch { throw new DriveError("invalid-json"); }
    if (!json || typeof json !== "object") throw new DriveError("invalid-response");
    return json;
  }

  async function listFolder(folder, headers, signal) {
    const entries = [];
    const seenTokens = new Set();
    let pageToken = "";
    let pages = 0;
    do {
      if (++pages > MAX_PAGES_PER_FOLDER) throw new DriveError("page-limit");
      const url = new URL(DRIVE_API);
      // 폴더는 탐색만 하고, 비디오는 누구나 링크로 볼 수 있는 것만 공개 응답에 넣는다.
      url.searchParams.set("q", `'${folder.id}' in parents and trashed = false and (mimeType = '${FOLDER_MIME}' or (mimeType contains 'video/' and (visibility = 'anyoneWithLink' or visibility = 'anyoneCanFind')))`);
      url.searchParams.set(
        "fields",
        "nextPageToken,incompleteSearch,files(id,name,mimeType,resourceKey,videoMediaMetadata(width,height,durationMillis))",
      );
      url.searchParams.set("pageSize", "1000");
      url.searchParams.set("supportsAllDrives", "true");
      url.searchParams.set("includeItemsFromAllDrives", "true");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const data = await request(url, headers, signal);
      if (!Array.isArray(data.files) || data.incompleteSearch) throw new DriveError("incomplete-list");
      entries.push(...data.files);
      if (entries.length > MAX_VIDEOS + MAX_FOLDERS) throw new DriveError("entry-limit");
      const next = data.nextPageToken;
      if (next != null && (typeof next !== "string" || next.length > 2000)) throw new DriveError("invalid-page-token");
      pageToken = next || "";
      if (pageToken && seenTokens.has(pageToken)) throw new DriveError("repeated-page-token");
      if (pageToken) seenTokens.add(pageToken);
    } while (pageToken);
    return entries;
  }

  async function collect(headers, signal) {
    // 인증된 계정이 폴더를 열 수 있는지 확인해 빈 폴더와 접근 오류를 구분한다.
    const rootUrl = new URL(`${DRIVE_API}/${rootId}`);
    rootUrl.searchParams.set("fields", "id,mimeType");
    rootUrl.searchParams.set("supportsAllDrives", "true");
    const root = await request(rootUrl, headers, signal);
    if (root.id !== rootId || root.mimeType !== FOLDER_MIME) throw new DriveError("invalid-root");

    // 폴더 이름은 공개 카테고리로만 바꿔 내려보낸다(폴더 ID·이름은 응답에 나가지 않는다).
    const queue = [{ id: rootId, depth: 0, category: "", categoryLabel: "", section: "", order: 999 }];
    const seenFolders = new Set([rootId]);
    const seenVideos = new Set();
    const videos = [];
    while (queue.length) {
      const batch = queue.splice(0, PARALLEL_FOLDERS);
      const contents = await Promise.all(batch.map((folder) => listFolder(folder, headers, signal)));
      for (const [index, entries] of contents.entries()) {
        const parent = batch[index];
        for (const file of entries) {
          if (!file || typeof file !== "object") throw new DriveError("invalid-entry");
          const id = safeId(file.id);
          const name = typeof file.name === "string" ? file.name.trim().slice(0, 300) : "";
          if (!id || !name) continue;
          if (file.mimeType === FOLDER_MIME) {
            if (seenFolders.has(id)) continue;
            // 최상위 폴더가 _archive 이면 하위까지 통째로 건너뛴다(공유 대상 아님).
            if (parent.depth === 0 && rootFolder(name).hidden) continue;
            seenFolders.add(id);
            if (seenFolders.size > MAX_FOLDERS) throw new DriveError("folder-limit");
            if (parent.depth >= MAX_DEPTH) throw new DriveError("depth-limit");
            const top = parent.depth === 0 ? rootFolder(name) : null;
            const category = top ? top.category : parent.category;
            const categoryLabel = top ? top.label : parent.categoryLabel;
            const order = top ? top.order : parent.order;
            const section = top ? "" : parent.section || sectionLabel(category, name);
            queue.push({ id, depth: parent.depth + 1, category, categoryLabel, section, order });
          } else if (typeof file.mimeType === "string" && file.mimeType.startsWith("video/")) {
            if (seenVideos.has(id)) continue;
            seenVideos.add(id);
            if (seenVideos.size > MAX_VIDEOS) throw new DriveError("video-limit");
            // resourceKey가 필요한 오래된 링크 공유 파일은 재생 URL에 이 값이 필요하다.
            const resourceKey = safeId(file.resourceKey);
            const meta = file.videoMediaMetadata && typeof file.videoMediaMetadata === "object" ? file.videoMediaMetadata : {};
            const record = describeVideo(
              { id, name, ...(resourceKey ? { resourceKey } : {}), width: meta.width, height: meta.height, durationMs: meta.durationMillis },
              {
                category: parent.category || "other",
                categoryLabel: parent.categoryLabel || CATEGORY_LABELS.other || "기타",
                section: parent.section || "",
              },
            );
            videos.push({ ...record, _order: parent.order });
          }
        }
      }
    }
    // 카테고리 → 섹션 → 제목 순으로 정렬해 랜딩의 탭/칩 순서와 맞춘다.
    videos.sort(
      (a, b) =>
        (a._order || 0) - (b._order || 0) ||
        a.category.localeCompare(b.category) ||
        a.section.localeCompare(b.section, "ko") ||
        a.title.localeCompare(b.title, "ko", { sensitivity: "base", numeric: true }) ||
        a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }) ||
        a.id.localeCompare(b.id),
    );
    return videos.map(({ _order, ...video }) => video);
  }

  async function get() {
    if (!rootId || typeof getAuthHeaders !== "function") return response("unconfigured");
    if (inflight) return inflight;
    if (now() < nextAttemptAt) return response(snapshot ? "ready" : "unavailable");

    inflight = (async () => {
      try {
        const signal = AbortSignal.timeout(timeoutMs);
        // 인증 라이브러리 자체가 지연되어도 공개 API가 무기한 대기하지 않도록 한다.
        const headers = await Promise.race([
          getAuthHeaders(),
          new Promise((_, reject) => signal.addEventListener("abort", () => reject(new DriveError("timeout")), { once: true })),
        ]);
        const videos = await collect(headers, signal);
        const completedAt = now();
        snapshot = { videos, updatedAt: new Date(completedAt).toISOString() };
        nextAttemptAt = completedAt + cacheMs;
        return response("ready");
      } catch (error) {
        nextAttemptAt = now() + retryMs;
        snapshot = null;
        const code = error instanceof DriveError ? error.code : "network-or-auth";
        logger.warn?.(`[drive] 영상 목록 갱신 실패 (${code}). 서버 인증과 영상 공유 설정을 확인하세요.`);
        return response("unavailable");
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  /**
   * 설정이 왜 비어 있는지 알려준다(비밀값은 절대 담지 않는다).
   * `unconfigured` 는 Google 호출 전에 돌려주는 값이라, 원인을 이걸로만 알 수 있다.
   */
  function diagnose() {
    const folderIdSet = Boolean(String(folderId || "").trim());
    const folderIdValid = Boolean(rootId);
    const reasons = [];
    if (!folderIdSet) reasons.push("GOOGLE_DRIVE_FOLDER_ID 없음");
    else if (!folderIdValid) reasons.push("GOOGLE_DRIVE_FOLDER_ID 형식 오류(폴더 ID만 넣어야 합니다)");
    if (!credentialState.set) reasons.push("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON 없음");
    else if (!credentialState.parsed) reasons.push(`서비스 계정 JSON 오류: ${credentialState.error}`);
    return {
      status: !folderIdValid || !credentialState.parsed ? "unconfigured" : snapshot ? "ready" : "unavailable",
      configured: folderIdValid && credentialState.parsed,
      folderIdSet,
      folderIdValid,
      serviceAccountSet: credentialState.set,
      serviceAccountParsed: credentialState.parsed,
      serviceAccountType: credentialState.type,
      serviceAccountEmail: credentialState.email,
      reasons,
    };
  }

  return { get, diagnose };
}

/** 서비스 계정 JSON 을 비밀값 없이 요약한다(이메일은 앞 3자만). */
function inspectCredentials(raw) {
  const set = Boolean(String(raw || "").trim());
  if (!set) return { set, parsed: false, type: "", email: "", error: "" };
  let value;
  try {
    value = JSON.parse(String(raw));
  } catch (error) {
    return { set, parsed: false, type: "", email: "", error: `JSON 파싱 실패 (${String(error.message).slice(0, 80)})` };
  }
  if (!value || typeof value !== "object") return { set, parsed: false, type: "", email: "", error: "JSON 최상위가 객체가 아님" };
  const type = typeof value.type === "string" ? value.type : "";
  const account = typeof value.client_email === "string" ? value.client_email : "";
  if (type !== "service_account") {
    return { set, parsed: false, type, email: maskEmail(account), error: `type 이 service_account 가 아님 (${type || "없음"})` };
  }
  // 서버 인증(serviceAccountHeaders)과 같은 기준으로 판단한다 — PEM 형식 검사는 CLI 검사기가 한다.
  if (!account || typeof value.private_key !== "string" || !value.private_key.trim()) {
    return { set, parsed: false, type, email: maskEmail(account), error: "client_email 또는 private_key 누락" };
  }
  return { set, parsed: true, type, email: maskEmail(account), error: "" };
}

function maskEmail(email) {
  if (!email) return "";
  const [name, domain = ""] = String(email).split("@");
  return `${name.slice(0, 3)}***@${domain}`;
}

export const drivePortfolio = createDrivePortfolio();
