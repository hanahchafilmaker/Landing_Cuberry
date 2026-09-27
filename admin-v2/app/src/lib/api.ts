// ─────────────────────────────────────────────────────────────
// 새 어드민(admin-v2) ↔ 기존 Node 서버(server/index.mjs, SQLite) 연결부
//
// tRPC 클라이언트를 쓰던 임포트 어드민을 기존 REST API 에 붙인다.
// 주소 결정 로직은 cms-bridge.js / admin/index.html 과 같은 규칙을 쓴다:
//   1. 주소창 ?api= (이번 방문만)
//   2. localhost 는 항상 같은 서버 (운영 DB 오염 방지 가드)
//   3. localStorage "cuberry.apiOrigin" (어드민 화면에서 저장한 값, 클래식 어드민과 공유)
//   4. 소스에 굽힌 운영 서버 주소 (GitHub Pages 정적 사본용)
// Node 서버가 직접 이 화면을 서빙할 때는 serveClientFile 이 BAKED_API_ORIGIN 값을
// 비워서 본다 — 그래서 이 서버가 띄운 화면은 항상 같은 서버만 쓴다(파일은 고치지 않음).
// ─────────────────────────────────────────────────────────────

// 운영 Node 서버 주소는 index.html 의 <meta name="cuberry-api-origin"> 에 구워 둔다.
// 번들 최소화에도 값이 살아남고, Node 서버가 직접 서빙할 때는 서버가 그 content 를 비워 본다.
const BAKED_API_ORIGIN =
  typeof document !== "undefined"
    ? document.querySelector('meta[name="cuberry-api-origin"]')?.getAttribute("content") ?? ""
    : "";
const API_ORIGIN_KEY = "cuberry.apiOrigin";
const TOKEN_KEY = "cuberry-admin-token"; // 클래식 어드민(admin/index.html)과 세션 공유
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function normalizeApiOrigin(value: string | null): string | null {
  let next = String(value ?? "").trim();
  if (!next) return "";
  if (/^(same|clear|reset)$/i.test(next)) return "";
  if (!/^https?:\/\//i.test(next)) next = `https://${next}`;
  try {
    const parsed = new URL(next);
    return /^https?:$/.test(parsed.protocol) ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function resolveApiOrigin(): string {
  const fromQuery = normalizeApiOrigin(new URLSearchParams(window.location.search).get("api"));
  if (fromQuery) return fromQuery;
  if (LOCAL_HOSTNAMES.has(String(window.location.hostname || ""))) return "";
  let saved = "";
  try {
    saved = window.localStorage.getItem(API_ORIGIN_KEY) || "";
  } catch {
    saved = "";
  }
  return normalizeApiOrigin(saved) ?? (normalizeApiOrigin(BAKED_API_ORIGIN) || "");
}

export const apiOrigin = resolveApiOrigin();

/** 이 어드민이 떠 있는 경로에서 사이트 루트(Render "/", Pages "/Landing_Cuberry/")를 구한다. */
export const siteRoot = (() => {
  const marker = "/admin-v2";
  const pathname = window.location.pathname;
  const idx = pathname.indexOf(marker);
  if (idx <= 0) return "/";
  return `${pathname.slice(0, idx)}/`;
})();

export function apiUrl(path: string): string {
  return !apiOrigin || apiOrigin === window.location.origin ? path : `${apiOrigin}${path}`;
}

/** "/uploads/a.jpg" 같은 루트 상대 콘텐츠를 원격 서버 주소로 바꾼다. */
export function assetUrl(value?: string | null): string {
  const text = String(value ?? "");
  if (!text) return text;
  if (/^(https?:|data:|blob:|\/\/|#|mailto:|tel:)/i.test(text)) return text;
  if (!text.startsWith("/")) return text;
  return !apiOrigin || apiOrigin === window.location.origin ? text : `${apiOrigin}${text}`;
}

export const tokenStore = {
  get(): string | null {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(value: string) {
    try {
      window.localStorage.setItem(TOKEN_KEY, value);
    } catch {
      /* ignore */
    }
  },
  remove() {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** 관리자 API 호출. 401 이면 저장된 토큰을 버린다(클래식 어드민과 동일 동작). */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (init.body) headers["Content-Type"] = "application/json";
  const token = tokenStore.get();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Admin-Token"] = token; // 프록시가 Authorization 을 지우는 경우 대비
  }
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, headers });
  } catch {
    throw new ApiError(
      apiOrigin
        ? `API 서버(${apiOrigin})에 연결하지 못했습니다. 서버가 켜져 있는지 확인해 주세요.`
        : "API 서버에 연결하지 못했습니다. 서버가 켜져 있는지 확인해 주세요.",
      0,
    );
  }
  let body: { error?: string } & Record<string, unknown> = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!response.ok) {
    if (response.status === 401 && token) tokenStore.remove();
    throw new ApiError(String(body.error || `요청이 실패했습니다. (${response.status})`), response.status);
  }
  return body as T;
}

export const get = <T = unknown>(path: string) => api<T>(path);
export const post = <T = unknown>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const put = <T = unknown>(path: string, data: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(data) });
export const patch = <T = unknown>(path: string, data: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(data) });
export const del = <T = unknown>(path: string) => api<T>(path, { method: "DELETE" });

/** 어드민 콘텐츠 묶음(/api/admin/content) 타입. 서버 row 그대로. */
export type AdminContent = {
  settings: {
    brandName: string;
    heroEyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    contactEmail: string;
    contactPhone: string;
  };
  services: Array<Record<string, unknown> & { id: number; isPublished: boolean }>;
  portfolio: Array<Record<string, unknown> & { id: number; isPublished: boolean }>;
  faqs: Array<Record<string, unknown> & { id: number; isPublished: boolean }>;
  team: Array<
    Record<string, unknown> & {
      id: number;
      name: string;
      role: string;
      bio: string;
      photoUrl: string;
      photoPosition: number;
      sortOrder: number;
      isPublished: boolean;
    }
  >;
  inquiries: Array<
    Record<string, unknown> & {
      id: number;
      name: string;
      email: string;
      company?: string;
      phone?: string;
      projectType?: string;
      budget?: string;
      message: string;
      status: "new" | "contacted" | "closed";
      createdAt: string;
    }
  >;
};
