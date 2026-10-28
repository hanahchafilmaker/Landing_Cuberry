import { useEffect, useMemo, useState } from "react";
import type { PortfolioCard } from "./map";

const ID = /^[A-Za-z0-9_-]{8,200}$/;
const REFRESH_MS = 60 * 1000;

type DriveVideo = {
  id: string;
  name: string;
  resourceKey?: string;
};
type DriveStatus = "loading" | "ready" | "unconfigured" | "unavailable";
export type DrivePortfolio = {
  status: DriveStatus;
  updatedAt: string | null;
  videos: DriveVideo[];
};

const initial: DrivePortfolio = { status: "loading", updatedAt: null, videos: [] };

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
    videos.push({ id: video.id, name: video.name.slice(0, 300), ...(resourceKey ? { resourceKey } : {}) });
  }
  return {
    status: data.status,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    videos: data.status === "ready" ? videos : [],
  };
}

function cardFor(video: DriveVideo): PortfolioCard {
  const title = video.name.replace(/\.(mp4|m4v|mov|webm|avi|mkv)$/i, "").replace(/_/g, " ").trim() || video.name;
  const year = video.name.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/)?.[1] ?? "";
  const resource = video.resourceKey ? `&resourcekey=${encodeURIComponent(video.resourceKey)}` : "";
  const previewResource = video.resourceKey ? `?resourcekey=${encodeURIComponent(video.resourceKey)}` : "";
  return {
    key: `drive-${video.id}`,
    title,
    category: "DRIVE FILM",
    year,
    description: "",
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${video.id}&sz=w1000${resource}`,
    tags: [],
    videoUrl: `https://drive.google.com/file/d/${video.id}/preview${previewResource}`,
    playable: true,
    driveVideo: true,
  };
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

  const films = useMemo(() => state.videos.map(cardFor), [state.videos]);
  return { ...state, films };
}
