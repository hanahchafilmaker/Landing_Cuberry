import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  faqs,
  inquiries,
  portfolioItems,
  services,
  siteSettings,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

const defaultSettings = {
  brandName: "CUBE RRY",
  heroEyebrow: "CREATIVE VIDEO STUDIO / SEOUL · KOREA",
  heroTitle: "MAKE IT MOVE.",
  heroSubtitle:
    "브랜드의 메시지를 가장 효과적인 방법으로. 기획·촬영·편집·모션그래픽과 XCONDA AI 플랫폼까지, 영상의 처음과 끝을 함께 만듭니다.",
  contactEmail: "f9.flownine@gmail.com",
  contactPhone: "070-8095-2302",
};

const defaultServices = [
  {
    slug: "standard",
    name: "숏폼 AI 광고",
    price: "29만원~",
    duration: "15초 · 최대 5컷",
    description: "기획·스크립트·생성·편집·자막",
    accent: "lime",
    sortOrder: 1,
  },
  {
    slug: "deluxe",
    name: "브랜드 AI 광고",
    price: "69만원~",
    duration: "60초 · 최대 12컷",
    description: "스토리보드·캐릭터 관리·AI 나레이션·사운드",
    accent: "orange",
    sortOrder: 2,
  },
  {
    slug: "premium",
    name: "AI 풀 프로덕션",
    price: "149만원~",
    duration: "120초 · 최대 25컷",
    description: "컨셉 2안·사운드 디자인·9:16 + 16:9",
    accent: "violet",
    sortOrder: 3,
  },
];

const defaultPortfolio = [
  {
    title: "AI엑스콘다광고",
    category: "AI AD",
    year: "2026",
    description: "XCONDA AI 플랫폼의 장면 설계와 일관성 제작 공정을 보여주는 브랜드 광고입니다.",
    videoUrl: "https://drive.google.com/file/d/1uVP4Ih6kKHxb0uUHsntCR7UsepMJ2djG/preview",
    tags: "AI, BRAND FILM, XCONDA",
    sortOrder: 1,
    isFeatured: 1,
  },
  {
    title: "현대건설 기업 홍보 영상",
    category: "CORPORATE VIDEO",
    year: "2025",
    description: "미래 스마트시티를 배경으로 현대건설의 기술력과 성장 비전을 담았습니다.",
    videoUrl: "https://drive.google.com/drive/folders/1nd_QHnTcZQ9Wywdcw-F9ye8_Zt87gcyx?usp=sharing",
    tags: "CG, COLOR CORRECTION, CAMERA DIRECTION",
    sortOrder: 2,
    isFeatured: 1,
  },
  {
    title: "유네코 기업 홍보 영상",
    category: "CORPORATE VIDEO",
    year: "2026",
    description: "철강 부산물 슬래그를 재활용한 친환경 소재의 가치와 기술력을 담았습니다.",
    videoUrl: "https://drive.google.com/drive/folders/1nd_QHnTcZQ9Wywdcw-F9ye8_Zt87gcyx?usp=sharing",
    tags: "PLANNING, AI GENERATION, ART DIRECTION",
    sortOrder: 3,
    isFeatured: 0,
  },
  {
    title: "비치오네 AI 브랜드 필름",
    category: "BRAND FILM",
    year: "2026",
    description: "주얼리 브랜드의 감성과 메시지를 생성형 AI의 새로운 비주얼 언어로 담았습니다.",
    videoUrl: "https://drive.google.com/drive/folders/1nd_QHnTcZQ9Wywdcw-F9ye8_Zt87gcyx?usp=sharing",
    tags: "AI GENERATION, EDITING, MOTION",
    sortOrder: 4,
    isFeatured: 0,
  },
  {
    title: "Seedwar",
    category: "AI WEB DRAMA",
    year: "2026",
    description: "AI 웹드라마와 콘셉트 필름의 장편 시퀀스를 설계한 프로젝트입니다.",
    videoUrl: "https://drive.google.com/file/d/1jP4J4RbNFDlK3bZI5dWz_atj4pYMPFeo/preview",
    tags: "AI DRAMA, CONCEPT FILM",
    sortOrder: 5,
    isFeatured: 0,
  },
  {
    title: "미국광고 세로 숏폼",
    category: "SHORT FORM",
    year: "2026",
    description: "9:16 포맷에 맞춘 짧고 강한 메시지의 광고 영상입니다.",
    videoUrl: "https://drive.google.com/file/d/1Gg2_R8jnLgaVBYWEwrn8KB-mt_yJ6J43/preview",
    tags: "9:16, ADVERTISING, SHORTS",
    sortOrder: 6,
    isFeatured: 0,
  },
  {
    title: "CJ대한통운 사업 소개 영상",
    category: "MOTION GRAPHICS",
    year: "2024",
    description: "실사 촬영에 라인아트 모션그래픽과 3D 타이포를 더해 스마트 물류를 표현했습니다.",
    videoUrl: "https://drive.google.com/drive/folders/1nd_QHnTcZQ9Wywdcw-F9ye8_Zt87gcyx?usp=sharing",
    tags: "ART DIRECTION, EDITING, MOTION",
    sortOrder: 7,
    isFeatured: 0,
  },
  {
    title: "모션그래픽 쇼릴",
    category: "MOTION SHOWREEL",
    year: "2025",
    description: "기업 홍보영상과 광고에 작업한 2D·3D 모션그래픽 장면을 한 편의 쇼릴로 구성했습니다.",
    videoUrl: "https://drive.google.com/drive/folders/1nd_QHnTcZQ9Wywdcw-F9ye8_Zt87gcyx?usp=sharing",
    tags: "2D, 3D, TYPOGRAPHY",
    sortOrder: 8,
    isFeatured: 0,
  },
];

const defaultFaqs = [
  {
    question: "실사 촬영 없이도 완성도 있는 영상이 가능한가요?",
    answer: "가능합니다. 기획·콘티·이미지 및 영상 생성·컷 편집·후보정·사운드까지 전체 공정으로 진행합니다.",
    sortOrder: 1,
  },
  {
    question: "AI 영상에서 인물과 공간이 계속 바뀌지 않나요?",
    answer: "XCONDA의 Turn, FlexBoard, Blocking Board를 활용해 공간·캐릭터·동선을 제작 단계에서 관리합니다.",
    sortOrder: 2,
  },
  {
    question: "어떤 자료를 준비하면 상담이 빨라지나요?",
    answer: "영상 목적과 업로드 채널, 참고 영상 1~2개, 로고·제품 사진·컬러 가이드, 희망 납기일을 준비해주시면 좋습니다.",
    sortOrder: 3,
  },
  {
    question: "상업적 이용과 NDA가 가능한가요?",
    answer: "기업회원·세금계산서 발행·NDA 체결이 가능하며, 최종 제작물은 협의된 범위에서 상업적으로 이용할 수 있습니다.",
    sortOrder: 4,
  },
];

let seedPromise: Promise<void> | null = null;

export async function seedInitialContent() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
  const db = await getDb();
  if (!db) return;

  const [settings, serviceRows, portfolioRows, faqRows] = await Promise.all([
    db.select({ id: siteSettings.id }).from(siteSettings).limit(1),
    db.select({ id: services.id }).from(services).limit(1),
    db.select({ id: portfolioItems.id }).from(portfolioItems).limit(1),
    db.select({ id: faqs.id }).from(faqs).limit(1),
  ]);
  const seedOperations: Promise<unknown>[] = [];
  if (settings.length === 0) seedOperations.push(db.insert(siteSettings).values(defaultSettings));
  if (serviceRows.length === 0) seedOperations.push(db.insert(services).values(defaultServices.map((item) => ({ ...item, isPublished: 1 }))));
  if (portfolioRows.length === 0) seedOperations.push(db.insert(portfolioItems).values(defaultPortfolio.map((item) => ({ ...item, isPublished: 1 }))));
  if (faqRows.length === 0) seedOperations.push(db.insert(faqs).values(defaultFaqs.map((item) => ({ ...item, isPublished: 1 }))));
  await Promise.all(seedOperations);
  })();
  try {
    await seedPromise;
  } catch (error) {
    seedPromise = null;
    throw error;
  }
}

export async function getPublicContent() {
  const db = await getDb();
  if (!db) {
    return {
      settings: { id: 0, ...defaultSettings, updatedAt: new Date() },
      services: defaultServices.map((item, index) => ({ id: index + 1, ...item, isPublished: 1, updatedAt: new Date() })),
      portfolio: defaultPortfolio.map((item, index) => ({ id: index + 1, ...item, thumbnailUrl: null, isPublished: 1, createdAt: new Date(), updatedAt: new Date() })),
      faqs: defaultFaqs.map((item, index) => ({ id: index + 1, ...item, isPublished: 1, updatedAt: new Date() })),
    };
  }

  try {
    await seedInitialContent();
    const [settingsRows, serviceRows, portfolioRows, faqRows] = await Promise.all([
      db.select().from(siteSettings).limit(1),
      db.select().from(services).where(eq(services.isPublished, 1)).orderBy(asc(services.sortOrder)),
      db.select().from(portfolioItems).where(eq(portfolioItems.isPublished, 1)).orderBy(asc(portfolioItems.sortOrder)),
      db.select().from(faqs).where(eq(faqs.isPublished, 1)).orderBy(asc(faqs.sortOrder)),
    ]);
    return { settings: settingsRows[0] ?? { id: 0, ...defaultSettings, updatedAt: new Date() }, services: serviceRows, portfolio: portfolioRows, faqs: faqRows };
  } catch (error) {
    console.warn("[Database] Falling back to default landing content:", error);
    return {
      settings: { id: 0, ...defaultSettings, updatedAt: new Date() },
      services: defaultServices.map((item, index) => ({ id: index + 1, ...item, isPublished: 1, updatedAt: new Date() })),
      portfolio: defaultPortfolio.map((item, index) => ({ id: index + 1, ...item, thumbnailUrl: null, isPublished: 1, createdAt: new Date(), updatedAt: new Date() })),
      faqs: defaultFaqs.map((item, index) => ({ id: index + 1, ...item, isPublished: 1, updatedAt: new Date() })),
    };
  }
}

export async function getAdminContent() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await seedInitialContent();
  const [settingsRows, serviceRows, portfolioRows, faqRows, inquiryRows] = await Promise.all([
    db.select().from(siteSettings).limit(1),
    db.select().from(services).orderBy(asc(services.sortOrder), desc(services.updatedAt)),
    db.select().from(portfolioItems).orderBy(asc(portfolioItems.sortOrder), desc(portfolioItems.updatedAt)),
    db.select().from(faqs).orderBy(asc(faqs.sortOrder), desc(faqs.updatedAt)),
    db.select().from(inquiries).orderBy(desc(inquiries.createdAt)),
  ]);
  return { settings: settingsRows[0], services: serviceRows, portfolio: portfolioRows, faqs: faqRows, inquiries: inquiryRows };
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { portfolio: 0, published: 0, inquiries: 0, newInquiries: 0 };
  const [portfolio, published, inquiriesCount, newInquiries] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(portfolioItems),
    db.select({ count: sql<number>`count(*)` }).from(portfolioItems).where(eq(portfolioItems.isPublished, 1)),
    db.select({ count: sql<number>`count(*)` }).from(inquiries),
    db.select({ count: sql<number>`count(*)` }).from(inquiries).where(eq(inquiries.status, "new")),
  ]);
  return {
    portfolio: Number(portfolio[0]?.count ?? 0),
    published: Number(published[0]?.count ?? 0),
    inquiries: Number(inquiriesCount[0]?.count ?? 0),
    newInquiries: Number(newInquiries[0]?.count ?? 0),
  };
}

export async function createInquiry(input: {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  projectType?: string;
  budget?: string;
  message: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(inquiries).values(input);
  return { id: Number(result[0].insertId) };
}

export async function updateInquiryStatus(id: number, status: "new" | "contacted" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(inquiries).set({ status }).where(eq(inquiries.id, id));
  return { success: true } as const;
}

export async function deletePortfolioItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
  return { success: true } as const;
}

export async function deleteService(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(services).where(eq(services.id, id));
  return { success: true } as const;
}

export async function deleteFaq(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(faqs).where(eq(faqs.id, id));
  return { success: true } as const;
}

export async function updateSiteSettings(input: {
  brandName: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  contactEmail: string;
  contactPhone: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const current = await db.select({ id: siteSettings.id }).from(siteSettings).limit(1);
  if (current[0]) await db.update(siteSettings).set(input).where(eq(siteSettings.id, current[0].id));
  else await db.insert(siteSettings).values(input);
  return { success: true } as const;
}

export { faqs, inquiries, portfolioItems, services, siteSettings };
