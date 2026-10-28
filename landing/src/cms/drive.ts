import { useEffect, useMemo, useState } from "react";
import type { PortfolioCard } from "./map";

const ID = /^[A-Za-z0-9_-]{8,200}$/;
const REFRESH_MS = 60 * 1000;

type DriveAspect = "portrait" | "landscape";

/** 서버가 내려주는 개별 영상(분류 정보 포함). 옛 응답(이름만)도 받아들인다. */
type DriveVideo = {
  id: string;
  name: string;
  resourceKey?: string;
  category?: string;
  categoryLabel?: string;
  section?: string;
  group?: string;
  title?: string;
  variant?: string;
  version?: number;
  episode?: number;
  aspect?: DriveAspect;
  durationMs?: number;
  search?: string;
};

/** 같은 작품의 변형(본편·납품본·자막본·언어본·에피소드) */
export type DriveVariant = {
  id: string;
  name: string;
  label: string;
  thumbnailUrl: string;
  previewUrl: string;
  viewUrl: string;
  aspect: DriveAspect;
  durationMs: number;
};

/** 포트폴리오 카드 한 장 = 한 작품. 변형이 여러 개면 카드 안에서 고른다. */
export type DriveFilm = PortfolioCard & {
  categorySlug: string;
  categoryLabel: string;
  section: string;
  searchText: string;
  aspect: DriveAspect;
  durationMs: number;
  badges: string[];
  variants: DriveVariant[];
};

type DriveStatus = "loading" | "ready" | "unconfigured" | "unavailable";
export type DrivePortfolio = {
  status: DriveStatus;
  updatedAt: string | null;
  videos: DriveVideo[];
};

const initial: DrivePortfolio = { status: "loading", updatedAt: null, videos: [] };

/** 서버 값이 없을 때(옛 응답·테스트) 쓰는 최소 분류 */
const FALLBACK = { category: "other", categoryLabel: "기타", section: "", aspect: "landscape" as DriveAspect };

function humanize(name: string) {
  const stem = name.replace(/\.(mp4|m4v|mov|webm|avi|mkv)$/i, "");
  const words = stem
    .replace(/(\d)\.(\d)/g, "$1\u0000$2")
    .split(/[_\-.]+/)
    .filter(Boolean)
    .flatMap((token) =>
      token
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .split(/\s+/)
        .filter(Boolean),
    );
  return words.join(" ").replace(/\u0000/g, ".") || stem;
}

const finite = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
const text = (value: unknown, limit = 300) => (typeof value === "string" ? value.trim().slice(0, limit) : "");

function normalize(value: unknown): DrivePortfolio | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.status !== "ready" && data.status !== "unconfigured" && data.status !== "unavailable") return null;
  if (!Array.isArray(data.videos)) return null;
  const seen = new Set<string>();
  const videos: DriveVideo[] = [];
  for (const item of data.videos) {
    if (!item || typeof item !== "object") continue;
    const video = item as Record<string, unknown>;
    if (typeof video.id !== "string" || !ID.test(video.id) || seen.has(video.id) || typeof video.name !== "string" || !video.name.trim()) continue;
    seen.add(video.id);
    const resourceKey = typeof video.resourceKey === "string" && ID.test(video.resourceKey) ? video.resourceKey : undefined;
    const aspect = video.aspect === "portrait" || video.aspect === "landscape" ? video.aspect : undefined;
    videos.push({
      id: video.id,
      name: video.name.slice(0, 300),
      ...(resourceKey ? { resourceKey } : {}),
      ...(text(video.category, 40) ? { category: text(video.category, 40) } : {}),
      ...(text(video.categoryLabel, 40) ? { categoryLabel: text(video.categoryLabel, 40) } : {}),
      ...(text(video.section, 60) ? { section: text(video.section, 60) } : {}),
      ...(text(video.group) ? { group: text(video.group) } : {}),
      ...(text(video.title) ? { title: text(video.title) } : {}),
      ...(text(video.variant, 120) ? { variant: text(video.variant, 120) } : {}),
      ...(typeof video.version === "number" && video.version > 0 ? { version: Math.floor(video.version) } : {}),
      ...(typeof video.episode === "number" && video.episode > 0 ? { episode: Math.floor(video.episode) } : {}),
      ...(aspect ? { aspect } : {}),
      ...(finite(video.durationMs) ? { durationMs: finite(video.durationMs) } : {}),
      ...(text(video.search, 600) ? { search: text(video.search, 600) } : {}),
    });
  }
  return {
    status: data.status,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    videos: data.status === "ready" ? videos : [],
  };
}

function variantFor(video: DriveVideo): DriveVariant {
  const resource = video.resourceKey ? `&resourcekey=${encodeURIComponent(video.resourceKey)}` : "";
  const previewResource = video.resourceKey ? `?resourcekey=${encodeURIComponent(video.resourceKey)}` : "";
  const base = `https://drive.google.com/file/d/${video.id}`;
  const title = video.title || humanize(video.name);
  return {
    id: video.id,
    name: video.name,
    label: video.variant || title,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${video.id}&sz=w1000${resource}`,
    previewUrl: `${base}/preview${previewResource}`,
    viewUrl: `${base}/view${previewResource}`,
    aspect: video.aspect || FALLBACK.aspect,
    durationMs: video.durationMs || 0,
  };
}

/** 대표 변형: 최신 버전 → 에피소드 순서 → 한국어 → 자막 없는 것 */
function pickRepresentative(variants: Array<{ video: DriveVideo; variant: DriveVariant }>) {
  return [...variants].sort((a, b) => {
    const episode = (a.video.episode || 0) - (b.video.episode || 0);
    if (episode) return episode;
    const version = (b.video.version || 0) - (a.video.version || 0);
    if (version) return version;
    const korean = Number((b.video.variant || "").includes("한국어")) - Number((a.video.variant || "").includes("한국어"));
    if (korean) return korean;
    return a.video.name.length - b.video.name.length || a.video.name.localeCompare(b.video.name, "en", { numeric: true });
  })[0];
}

/** "webdrama:webdrama_toyfarm_animation" → 카테고리 + 이름 토큰 */
function groupParts(key: string) {
  const index = key.indexOf(":");
  const category = index >= 0 ? key.slice(0, index) : FALLBACK.category;
  const name = index >= 0 ? key.slice(index + 1) : key;
  return { category, tokens: name.split("_").filter(Boolean) };
}

/**
 * 같은 작품의 다른 컷을 한 장으로 합친다.
 *   WebDrama_ToyFarm  +  WebDrama_ToyFarm_Animation
 *   WebDrama_GirlDetective  +  WebDrama_GirlDetective_Seorok_Trailer
 * 짧은 쪽 토큰이 긴 쪽의 앞부분과 같으면 같은 작품으로 본다(카테고리는 같아야 하고,
 * 한 단어짜리 이름은 다른 작품을 삼킬 수 있으므로 두 단어 이상일 때만 합친다).
 */
function canonicalGroups(keys: string[]) {
  const canonicals: Array<{ key: string; category: string; tokens: string[] }> = [];
  const mapping = new Map<string, string>();
  const byLength = [...keys].sort((a, b) => groupParts(a).tokens.length - groupParts(b).tokens.length || a.localeCompare(b));
  for (const key of byLength) {
    const { category, tokens } = groupParts(key);
    const parent = tokens.length >= 2
      ? canonicals.find((entry) => entry.category === category && entry.tokens.length >= 2 && entry.tokens.every((token, i) => tokens[i] === token))
      : undefined;
    if (parent) {
      mapping.set(key, parent.key);
      continue;
    }
    canonicals.push({ key, category, tokens });
    mapping.set(key, key);
  }
  return mapping;
}

/** 영상 목록 → 작품 카드 목록(같은 작품의 변형은 한 장으로 합친다) */
export function toFilms(videos: DriveVideo[]): DriveFilm[] {
  const groups = new Map<string, Array<{ video: DriveVideo; variant: DriveVariant }>>();
  for (const video of videos) {
    const key = video.group || `${video.category || FALLBACK.category}:${video.name.toLowerCase()}`;
    const bucket = groups.get(key) || [];
    bucket.push({ video, variant: variantFor(video) });
    groups.set(key, bucket);
  }

  // 이름이 겹치는 변형(예: 본편 + 애니메이션판)은 같은 카드로 모은다.
  const canonical = canonicalGroups([...groups.keys()]);
  const merged = new Map<string, Array<{ video: DriveVideo; variant: DriveVariant }>>();
  for (const [key, bucket] of groups) {
    const target = canonical.get(key) || key;
    merged.set(target, [...(merged.get(target) || []), ...bucket]);
  }
  groups.clear();
  for (const [key, bucket] of merged) groups.set(key, bucket);

  const films: DriveFilm[] = [];
  for (const [group, bucket] of groups) {
    const sorted = [...bucket].sort((a, b) => (a.video.episode || 0) - (b.video.episode || 0) || a.variant.label.localeCompare(b.variant.label, "ko", { numeric: true }));
    const representative = pickRepresentative(bucket);
    const first = representative.video;
    const categorySlug = first.category || FALLBACK.category;
    const categoryLabel = first.categoryLabel || FALLBACK.categoryLabel;
    const section = first.section || "";
    // 카드 배지는 한 개만 — 여러 변형이 있다는 사실만 알려주고, 언어·버전·자막은
    // 플레이어의 버전 선택 줄에서 고른다(카드에 다 붙이면 지저분해진다).
    const episodeCount = sorted.filter((entry) => (entry.video.episode || 0) > 0).length;
    const badges: string[] = [];
    if (episodeCount > 1) badges.push(`${episodeCount}편 시리즈`);
    else if (sorted.length > 1) badges.push(`${sorted.length}개 버전`);

    const year = first.name.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/)?.[1] ?? "";
    const searchText = [
      first.search || "",
      first.name,
      first.title || humanize(first.name),
      categoryLabel,
      section,
      ...sorted.map((entry) => `${entry.video.name} ${entry.variant.label}`),
    ]
      .join(" ")
      .toLowerCase();

    films.push({
      key: `drive-${group}`,
      title: first.title || humanize(first.name),
      category: categoryLabel,
      year,
      description: "",
      thumbnailUrl: representative.variant.thumbnailUrl,
      tags: [],
      videoUrl: representative.variant.previewUrl,
      playable: true,
      driveVideo: true,
      categorySlug,
      categoryLabel,
      section,
      searchText,
      aspect: representative.variant.aspect,
      durationMs: representative.variant.durationMs,
      badges,
      variants: sorted.map((entry) => entry.variant),
    });
  }

  return films.sort(
    (a, b) =>
      a.categoryLabel.localeCompare(b.categoryLabel, "ko") ||
      a.section.localeCompare(b.section, "ko") ||
      a.title.localeCompare(b.title, "ko", { sensitivity: "base", numeric: true }),
  );
}

/** 방문·포커스 복귀·1분 간격으로 영상만 갱신한다. 폴더 자체는 공개 화면에 표시하지 않는다. */
export function useDrivePortfolio() {
  const [state, setState] = useState<DrivePortfolio>(initial);

  useEffect(() => {
    let disposed = false;
    let pending = false;
    let activeController: AbortController | null = null;
    const refresh = async () => {
      if (pending || disposed) return;
      pending = true;
      const controller = new AbortController();
      activeController = controller;
      const timeout = window.setTimeout(() => controller.abort(), 25_000);
      try {
        const url = window.CuberryApi?.url("/api/public/drive-portfolio") ?? "/api/public/drive-portfolio";
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("drive unavailable");
        const next = normalize(await res.json());
        if (!next) throw new Error("invalid drive response");
        if (!disposed) setState(next);
      } catch {
        // 공개 가능 여부를 다시 확인할 수 없으면 이전 영상 메타데이터를 남기지 않는다.
        if (!disposed) setState({ status: "unavailable", videos: [], updatedAt: null });
      } finally {
        window.clearTimeout(timeout);
        if (activeController === controller) activeController = null;
        pending = false;
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, REFRESH_MS);
    return () => {
      disposed = true;
      activeController?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const films = useMemo(() => toFilms(state.videos), [state.videos]);
  return { ...state, films };
}
