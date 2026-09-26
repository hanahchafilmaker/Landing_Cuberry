import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createInquiry,
  deleteFaq,
  deletePortfolioItem,
  deleteService,
  getAdminContent,
  getDashboardStats,
  getDb,
  getPublicContent,
  seedInitialContent,
  updateInquiryStatus,
  updateSiteSettings,
  faqs,
  inquiries,
  portfolioItems,
  services,
} from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
  }
  return next({ ctx });
});

const portfolioInput = z.object({
  id: z.number().optional(),
  title: z.string().min(1),
  category: z.string().min(1),
  year: z.string().min(1),
  description: z.string().min(1),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  tags: z.string().min(1),
  sortOrder: z.number().int().min(0),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
});

const serviceInput = z.object({
  id: z.number().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  price: z.string().min(1),
  duration: z.string().min(1),
  description: z.string().min(1),
  accent: z.string().min(1),
  sortOrder: z.number().int().min(0),
  isPublished: z.boolean(),
});

const faqInput = z.object({
  id: z.number().optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  sortOrder: z.number().int().min(0),
  isPublished: z.boolean(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  landing: router({
    content: publicProcedure.query(() => getPublicContent()),
    submitInquiry: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "이름을 입력해 주세요."),
          email: z.string().email("이메일 주소를 확인해 주세요."),
          company: z.string().optional(),
          phone: z.string().optional(),
          projectType: z.string().optional(),
          budget: z.string().optional(),
          message: z.string().min(10, "문의 내용을 10자 이상 입력해 주세요."),
        })
      )
      .mutation(({ input }) => createInquiry(input)),
  }),

  admin: router({
    summary: adminProcedure.query(async () => {
      await seedInitialContent();
      return getDashboardStats();
    }),
    content: adminProcedure.query(() => getAdminContent()),
    settings: router({
      update: adminProcedure
        .input(
          z.object({
            brandName: z.string().min(1),
            heroEyebrow: z.string().min(1),
            heroTitle: z.string().min(1),
            heroSubtitle: z.string().min(1),
            contactEmail: z.string().email(),
            contactPhone: z.string().min(1),
          })
        )
        .mutation(({ input }) => updateSiteSettings(input)),
    }),
    portfolio: router({
      upsert: adminProcedure.input(portfolioInput).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "데이터베이스를 사용할 수 없습니다." });
        const values = {
          title: input.title,
          category: input.category,
          year: input.year,
          description: input.description,
          videoUrl: input.videoUrl,
          thumbnailUrl: input.thumbnailUrl || null,
          tags: input.tags,
          sortOrder: input.sortOrder,
          isFeatured: input.isFeatured ? 1 : 0,
          isPublished: input.isPublished ? 1 : 0,
        };
        if (input.id) await db.update(portfolioItems).set(values).where(eq(portfolioItems.id, input.id));
        else await db.insert(portfolioItems).values(values);
        return { success: true } as const;
      }),
      delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deletePortfolioItem(input.id)),
    }),
    services: router({
      upsert: adminProcedure.input(serviceInput).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "데이터베이스를 사용할 수 없습니다." });
        const values = {
          slug: input.slug,
          name: input.name,
          price: input.price,
          duration: input.duration,
          description: input.description,
          accent: input.accent,
          sortOrder: input.sortOrder,
          isPublished: input.isPublished ? 1 : 0,
        };
        if (input.id) await db.update(services).set(values).where(eq(services.id, input.id));
        else await db.insert(services).values(values);
        return { success: true } as const;
      }),
      delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteService(input.id)),
    }),
    faqs: router({
      upsert: adminProcedure.input(faqInput).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "데이터베이스를 사용할 수 없습니다." });
        const values = {
          question: input.question,
          answer: input.answer,
          sortOrder: input.sortOrder,
          isPublished: input.isPublished ? 1 : 0,
        };
        if (input.id) await db.update(faqs).set(values).where(eq(faqs.id, input.id));
        else await db.insert(faqs).values(values);
        return { success: true } as const;
      }),
      delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteFaq(input.id)),
    }),
    inquiries: router({
      updateStatus: adminProcedure
        .input(z.object({ id: z.number(), status: z.enum(["new", "contacted", "closed"]) }))
        .mutation(({ input }) => updateInquiryStatus(input.id, input.status)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
