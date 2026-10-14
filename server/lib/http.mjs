// HTTP 공통 — 응답/요청 본문 · CORS · 압축/ETag/캐시 · 정적 파일 서빙.
// index.mjs 에서 그대로 옮겨온 파일이다(동작 변경 없음).
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { brotliCompressSync, gzipSync, constants as zlib } from "node:zlib";
import path from "node:path";
import { ALLOW_ANY_ORIGIN, ALLOWED_ORIGINS, CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./config.mjs";

export function send(res, status, body, headers = {}) {
  let payload = Buffer.from(JSON.stringify(body));
  const merged = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...SECURITY_HEADERS,
    ...headers,
  };
  if (CONTENT_SECURITY_POLICY) merged["Content-Security-Policy"] = CONTENT_SECURITY_POLICY;
  const encoding = res.__encoding || "";
  if (encoding && payload.length >= COMPRESS_MIN && !(status >= 300 && status < 400)) {
    payload = compress(payload, encoding, "");
    merged["Content-Encoding"] = encoding;
    addVary(res, "Accept-Encoding");
  }
  merged["Content-Length"] = payload.length;
  res.writeHead(status, merged);
  res.end(payload);
}

export function readBody(req, limit = 8_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("요청이 너무 큽니다."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("JSON 형식을 확인해 주세요."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

export function isHttps(req) {
  return req.headers["x-forwarded-proto"] === "https" || process.env.COOKIE_SECURE === "1" || Boolean(req.socket?.encrypted);
}

export function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

// 요청이 허용된 Origin 에서 왔는지 판별합니다. 아니면 빈 문자열.
export function corsOrigin(req) {
  const origin = normalizeOrigin(req.headers.origin);
  if (!origin) return "";
  if (ALLOW_ANY_ORIGIN) return origin;
  return ALLOWED_ORIGINS.includes(origin) ? origin : "";
}

// /api/* 응답에 CORS 헤더를 미리 심어둔다.
// send() 가 res.writeHead(headers) 를 쓰더라도 setHeader 값은 함께 전송된다.
export function applyCors(req, res) {
  const origin = corsOrigin(req);
  if (!origin) return "";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  // 어드민은 쿠키 대신 Bearer 토큰을 주로 쓰지만, 같은 서버의 /admin 에서 여는 경우도 있어 자격증명을 허용한다.
  // 단 "*"(모든 Origin 허용) 모드에서는 자격증명을 꺼야 임의 사이트가 관리자 세션을 이용할 수 없다.
  if (!ALLOW_ANY_ORIGIN) res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token");
  res.setHeader("Access-Control-Max-Age", "600");
  return origin;
}

export const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

export function safeFile(urlPath, base) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  if (decoded.includes("\0")) return null;
  // %2e%2e%2f 처럼 인코딩된 dot-segment 는 URL 정규화를 지나 여기까지 온다.
  // 디코딩 결과에 "." / ".." 세그먼트가 하나라도 있으면 무조건 거부한다.
  if (decoded.split("/").some((segment) => segment === "." || segment === "..")) return null;
  const resolved = path.resolve(base, `.${decoded}`);
  // startsWith(base) 만 쓰면 "uploads-backup/" 같은 형제 폴더가 통과한다.
  // 구분자를 붙인 루트와 정확히 비교한다.
  const root = base.endsWith(path.sep) ? base : base + path.sep;
  if (resolved !== base && !resolved.startsWith(root)) return null;
  return resolved;
}

// ── 압축 · 캐시 헤더 공통 처리 ────────────────────────────────────────
// 텍스트 응답(HTML/JS/CSS/JSON/SVG/XML)은 브롤리·gzip 으로 보낸다.
// 랜딩 단일 파일이 374KB → 브롤리 98KB 라, 가장 효과적인 개선이다.
export const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".txt", ".svg", ".xml"]);
export const COMPRESS_MIN = 1024;
export const compressedCache = new Map(); // `${key}|${encoding}` → Buffer (파일 서빙용)
export const textFileCache = new Map(); // `${path}|${mtime}|${size}` → 원본 Buffer

export function negotiateEncoding(req) {
  const header = String(req.headers["accept-encoding"] || "");
  if (/\bbr\b/i.test(header)) return "br";
  if (/\bgzip\b/i.test(header)) return "gzip";
  return "";
}

export function compress(buffer, encoding, cacheKey) {
  if (cacheKey) {
    const key = `${cacheKey}|${encoding}`;
    const hit = compressedCache.get(key);
    if (hit) return hit;
    const made = compress(buffer, encoding, "");
    if (compressedCache.size > 24) compressedCache.clear();
    compressedCache.set(key, made);
    return made;
  }
  return encoding === "br"
    ? brotliCompressSync(buffer, { params: { [zlib.BROTLI_PARAM_QUALITY]: cacheKey ? 9 : 6 } })
    : gzipSync(buffer, { level: cacheKey ? 9 : 6 });
}

export function matchesEtag(req, etag) {
  const header = String(req.headers["if-none-match"] || "");
  if (!header || !etag) return false;
  return header.split(",").map((value) => value.trim()).includes(etag) || header.trim() === "*";
}

export function addVary(res, value) {
  const current = res.getHeader("vary");
  const list = Array.isArray(current) ? current : current ? [String(current)] : [];
  if (!list.includes(value)) list.push(value);
  res.setHeader("Vary", list.join(", "));
}

// 버퍼를 (가능하면 압축해서) 보낸다. ETag 재검증이면 304 로 끝낸다.
export function writeBody(req, res, buffer, { type, cacheControl, etag, encoding }) {
  const headers = {
    "Content-Type": type,
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  };
  if (CONTENT_SECURITY_POLICY) headers["Content-Security-Policy"] = CONTENT_SECURITY_POLICY;
  if (etag) headers.ETag = etag;
  if (matchesEtag(req, etag)) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  const canCompress = encoding && buffer.length >= COMPRESS_MIN;
  const body = canCompress ? compress(buffer, encoding) : buffer;
  if (canCompress) {
    headers["Content-Encoding"] = encoding;
    addVary(res, "Accept-Encoding");
  }
  headers["Content-Length"] = body.length;
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
}

export function fileEtag(stat) {
  return `W/"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;
}

export function serveFile(req, res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    res.end("Not found");
    return;
  }
  const stat = statSync(filePath);
  const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const etag = fileEtag(stat);
  const range = req.headers.range;

  // 텍스트 자산은 압축 + ETag 재검증 경로로 보낸다(랜딩 HTML 374KB → 98KB).
  if (!range && COMPRESSIBLE.has(path.extname(filePath).toLowerCase()) && stat.size < 8_000_000) {
    const encoding = negotiateEncoding(req);
    const cacheKey = `${filePath}|${Math.floor(stat.mtimeMs)}|${stat.size}`;
    let buffer = textFileCache.get(cacheKey);
    if (!buffer) {
      buffer = readFileSync(filePath);
      if (textFileCache.size > 16) textFileCache.clear();
      textFileCache.set(cacheKey, buffer);
    }
    writeBody(req, res, buffer, {
      type,
      cacheControl: filePath.endsWith("index.html") ? "no-cache" : "public, max-age=3600",
      etag,
      encoding,
    });
    return;
  }

  if (matchesEtag(req, etag)) {
    res.writeHead(304, { ETag: etag, "Cache-Control": "public, max-age=3600" });
    res.end();
    return;
  }
  if (range && stat.size > 0) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      let start = match[1] ? Number(match[1]) : 0;
      let end = match[2] ? Number(match[2]) : stat.size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      end = Math.min(end, stat.size - 1);
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        ETag: etag,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
  }
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes",
    ETag: etag,
    "Last-Modified": stat.mtime.toUTCString(),
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

// 어드민(admin/index.html)과 랜딩 브리지(cms-bridge.js)에 커밋해 둔 BAKED_API_ORIGIN 은
// GitHub Pages 처럼 "같은 주소에 API 가 없는 정적 호스트"를 위한 값이다.
// 이 Node 서버가 그 화면을 직접 서빙할 때는 API 가 바로 옆에 있으므로 값을 비워서 보낸다.
// 그래야 localhost · 미리보기 주소 · Render 주소에서 연 어드민이 항상 자기 서버(자기 DB)를 쓰고,
// 로컬에서의 편집이 운영 서버에 그대로 반영되는 사고가 나지 않는다.
// (파일 자체는 고치지 않으므로 Pages 에 올라간 사본에는 운영 주소가 그대로 남는다.)
export const BAKED_ORIGIN_PATTERN = /(const BAKED_API_ORIGIN = )"[^"]*"(;)/g;
// admin-v2 단일 HTML 에 구워 둔 <meta name="cuberry-api-origin"> 도 같은 규칙으로 비운다
// (번들 최소화로 JS 상수가 바뀔 수 있어 HTML 메타태그에 둔 값이다).
export const BAKED_ORIGIN_META_PATTERN = /(name="cuberry-api-origin" content=")[^"]*(")/g;

export function serveClientFile(req, res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    res.end("Not found");
    return;
  }
  const stat = statSync(filePath);
  const cacheKey = `${filePath}|${Math.floor(stat.mtimeMs)}|${stat.size}`;
  let body = textFileCache.get(cacheKey);
  if (!body) {
    // 요청마다 500KB 를 읽고 정규식 치환하지 않도록 mtime 단위로 변환 결과를 기억한다.
    body = Buffer.from(
      readFileSync(filePath, "utf8")
        .replace(BAKED_ORIGIN_PATTERN, '$1""$2')
        .replace(BAKED_ORIGIN_META_PATTERN, "$1$2"),
      "utf8",
    );
    if (textFileCache.size > 16) textFileCache.clear();
    textFileCache.set(cacheKey, body);
  }
  // 서빙 시점에 값이 바뀌므로 캐시되면 안 된다(no-store 유지).
  writeBody(req, res, body, {
    type: MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    cacheControl: "no-store",
    etag: "",
    encoding: negotiateEncoding(req),
  });
}
