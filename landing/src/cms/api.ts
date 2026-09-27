// ─────────────────────────────────────────────────────────────
// 어드민(/admin) ↔ 랜딩 연결부
//
// cms-bridge.js 가 API 서버 주소를 정해 window.CuberryApi 를 심고,
// /api/public/content 응답을 window.CuberryContent 에 저장한 뒤
// "cuberry:content" 이벤트로 알려준다. (포커스 복귀 때도 다시 읽어 이벤트를 보낸다)
// 랜딩은 이 값을 받아 React 로 렌더하므로 DOM 을 몰래 고치는 코드가 필요 없다.
// ─────────────────────────────────────────────────────────────

export type CmsSettings = {
  brandName?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type CmsService = {
  id: number;
  slug?: string;
  name: string;
  price?: string;
  duration?: string;
  description?: string;
  accent?: string;
  landingSlot?: string | null;
};

export type CmsPortfolio = {
  id: number;
  title: string;
  category?: string;
  year?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  tags?: string;
  kind?: string;
  source?: string;
  landingSlot?: string | null;
};

export type CmsTeam = {
  id: number;
  name: string;
  role?: string;
  bio?: string;
  photoUrl?: string;
  photoPosition?: number;
  landingSlot?: string | null;
};

export type CmsFaq = {
  id: number;
  question: string;
  answer: string;
  landingSlot?: string | null;
};

export type CmsContent = {
  settings?: CmsSettings | null;
  services?: CmsService[];
  portfolio?: CmsPortfolio[];
  team?: CmsTeam[];
  faqs?: CmsFaq[];
};

type CuberryApi = {
  origin: string;
  isSameOrigin: () => boolean;
  url: (path: string) => string;
  assetUrl: (value: string) => string;
};

declare global {
  interface Window {
    CuberryApi?: CuberryApi;
    CuberryContent?: CmsContent;
  }
}

export const CMS_EVENT = "cuberry:content";

/** "/uploads/a.jpg" 같은 서버 경로를 원격 API 서버 주소로 바꾼다. 브리지가 없으면 그대로 둔다. */
export function assetUrl(value?: string | null): string {
  const text = String(value ?? "");
  if (!text) return "";
  const api = typeof window !== "undefined" ? window.CuberryApi : undefined;
  return api?.assetUrl ? api.assetUrl(text) : text;
}
