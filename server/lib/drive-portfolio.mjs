// 비공개 Google Drive 폴더에서 링크 공개된 영상의 메타데이터만 읽는다.
// 영상은 방문자의 브라우저가 Google Drive에서 직접 재생하며, 서버에 복사하지 않는다.
import { JWT } from "google-auth-library";

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
      url.searchParams.set("fields", "nextPageToken,incompleteSearch,files(id,name,mimeType,resourceKey)");
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

    const queue = [{ id: rootId, depth: 0 }];
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
            seenFolders.add(id);
            if (seenFolders.size > MAX_FOLDERS) throw new DriveError("folder-limit");
            if (parent.depth >= MAX_DEPTH) throw new DriveError("depth-limit");
            queue.push({ id, depth: parent.depth + 1 });
          } else if (typeof file.mimeType === "string" && file.mimeType.startsWith("video/")) {
            if (seenVideos.has(id)) continue;
            seenVideos.add(id);
            if (seenVideos.size > MAX_VIDEOS) throw new DriveError("video-limit");
            // resourceKey가 필요한 오래된 링크 공유 파일은 재생 URL에 이 값이 필요하다.
            const resourceKey = safeId(file.resourceKey);
            videos.push({ id, name, ...(resourceKey ? { resourceKey } : {}) });
          }
        }
      }
    }
    videos.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }) || a.id.localeCompare(b.id));
    return videos;
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

  return { get };
}

export const drivePortfolio = createDrivePortfolio();
