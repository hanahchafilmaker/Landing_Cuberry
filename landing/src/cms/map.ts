import {
  driveFilms,
  faqs as defaultFaqs,
  services as defaultServices,
  settings as defaultSettings,
  team as defaultTeam,
  works as defaultWorks,
  type Accent,
  type Faq,
  type Service,
  type TeamMember,
} from "@/data/content";
import { assetUrl, type CmsContent, type CmsPortfolio } from "./api";

// 화면이 쓰는 형태(뷰 모델). 기본값은 data/content.ts, 어드민 저장값이 오면 덮어쓴다.
export type SiteSettings = {
  brand: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroNote: string;
  email: string;
  phone: string;
};

export type PortfolioCard = {
  key: string;
  title: string;
  category: string;
  year: string;
  description: string;
  thumbnailUrl: string;
  tags: string[];
  videoUrl?: string;
  fallbackUrl?: string;
  /** 드라이브 영상·mp4 처럼 바로 재생되는 링크인지 (아니면 외부 링크 아이콘) */
  playable: boolean;
};

export type SiteService = Service & { key: string };
export type SiteTeamMember = TeamMember & { key: string };
export type SiteFaq = Faq & { key: string };

export type SiteContent = {
  settings: SiteSettings;
  services: SiteService[];
  films: PortfolioCard[];
  works: PortfolioCard[];
  team: SiteTeamMember[];
  faqs: SiteFaq[];
  /** 어드민 API 값이 반영됐는지 (테스트·디버깅용) */
  fromCms: boolean;
};

const isPlayable = (url?: string) =>
  Boolean(url) && (/drive\.google\.com/.test(url!) || /\.(mp4|webm|mov)(\?|#|$)/i.test(url!) || /youtu\.?be|vimeo\.com/.test(url!));

const splitTags = (value?: string) =>
  String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

export const defaultContent: SiteContent = {
  settings: { ...defaultSettings },
  services: defaultServices.map((s) => ({ ...s, key: s.slug })),
  films: driveFilms.map((f) => ({
    key: `drive-${f.title}`,
    title: f.title,
    category: "DRIVE FILM",
    year: f.year,
    description: f.description,
    thumbnailUrl: f.thumbnailUrl,
    tags: ["GOOGLE DRIVE", f.kind.toUpperCase()],
    videoUrl: f.videoUrl,
    playable: true,
  })),
  works: defaultWorks.map((w) => ({
    key: `work-${w.title}`,
    title: w.title,
    category: w.category,
    year: w.year,
    description: w.description,
    thumbnailUrl: w.thumbnailUrl,
    tags: w.tags,
    fallbackUrl: w.fallbackUrl,
    videoUrl: w.videoUrl,
    playable: isPlayable(w.videoUrl),
  })),
  team: defaultTeam.map((m) => ({ ...m, key: m.name })),
  faqs: defaultFaqs.map((f) => ({ ...f, key: f.q })),
  fromCms: false,
};

const ACCENTS: Accent[] = ["lime", "amber", "violet"];
function toAccent(value: string | undefined, index: number): Accent {
  const v = String(value || "").toLowerCase();
  if (v === "lime" || v === "green") return "lime";
  if (v === "amber" || v === "orange" || v === "yellow") return "amber";
  if (v === "violet" || v === "purple") return "violet";
  return ACCENTS[index % ACCENTS.length];
}

function driveThumb(url?: string) {
  const id = String(url || "").match(/\/file\/d\/([^/?#]+)/)?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : "";
}

function portfolioCard(item: CmsPortfolio, drive: boolean): PortfolioCard {
  const videoUrl = item.videoUrl ? assetUrl(item.videoUrl) : undefined;
  const tags = splitTags(item.tags);
  if (drive && item.kind && !tags.some((t) => t.toUpperCase() === item.kind!.toUpperCase())) tags.push(item.kind);
  return {
    key: `p-${item.id}`,
    title: item.title,
    category: drive ? "DRIVE FILM" : item.category || "WORK",
    year: item.year || "",
    description: item.description || "",
    thumbnailUrl: assetUrl(item.thumbnailUrl) || (drive ? driveThumb(item.videoUrl) : ""),
    tags: tags.map((t) => t.toUpperCase()),
    videoUrl,
    playable: isPlayable(videoUrl),
  };
}

/** 어드민 공개 콘텐츠(/api/public/content)를 화면 뷰 모델로 바꾼다. 빠진 부분은 기본값을 유지한다. */
export function mapCmsContent(data: CmsContent | null | undefined): SiteContent {
  if (!data || typeof data !== "object") return defaultContent;
  const base = defaultContent;
  const s = data.settings || {};
  const settings: SiteSettings = {
    ...base.settings,
    brand: s.brandName?.trim() || base.settings.brand,
    eyebrow: s.heroEyebrow?.trim() || base.settings.eyebrow,
    heroTitle: s.heroTitle?.trim() || base.settings.heroTitle,
    heroSubtitle: s.heroSubtitle?.trim() || base.settings.heroSubtitle,
    email: s.contactEmail?.trim() || base.settings.email,
    phone: s.contactPhone?.trim() || base.settings.phone,
  };

  const services: SiteService[] | undefined = data.services?.map((item, index) => {
    const known = defaultServices.find((d) => d.slug === item.slug);
    const description = item.description || "";
    return {
      key: `s-${item.id}`,
      slug: item.slug || `plan-${index + 1}`,
      name: item.name,
      tier: (item.slug || known?.tier || `PLAN ${index + 1}`).toUpperCase(),
      price: item.price || "",
      duration: item.duration || "",
      desc: description,
      // 기본 3종은 디자인의 상세 구성 목록을, 새 상품은 설명을 "·" 로 나눠 목록으로 보여준다.
      features: known?.features ?? description.split(/[·,]/).map((t) => t.trim()).filter(Boolean),
      accent: toAccent(item.accent, index),
      badge: known?.badge ?? null,
    };
  });

  const films: PortfolioCard[] = [];
  const works: PortfolioCard[] = [];
  data.portfolio?.forEach((item) => {
    const drive = item.source === "drive" || String(item.landingSlot || "").startsWith("drive-");
    (drive ? films : works).push(portfolioCard(item, drive));
  });

  const team: SiteTeamMember[] | undefined = data.team?.map((person) => {
    const [role, ...orgParts] = String(person.role || "").split(" · ");
    return {
      key: `t-${person.id}`,
      name: person.name,
      role: role || "",
      org: orgParts.join(" · "),
      career: String(person.bio || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
      image: assetUrl(person.photoUrl),
      photoPosition: Number(person.photoPosition) || 0,
    };
  });

  const faqs: SiteFaq[] | undefined = data.faqs?.map((faq) => ({
    key: `f-${faq.id}`,
    q: faq.question,
    a: faq.answer,
  }));

  return {
    settings,
    services: services ?? base.services,
    films: data.portfolio ? films : base.films,
    works: data.portfolio ? works : base.works,
    team: team ?? base.team,
    faqs: faqs ?? base.faqs,
    fromCms: true,
  };
}
