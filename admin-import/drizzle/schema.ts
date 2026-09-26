import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing Manus OAuth. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const siteSettings = mysqlTable("siteSettings", {
  id: int("id").autoincrement().primaryKey(),
  brandName: varchar("brandName", { length: 120 }).notNull(),
  heroEyebrow: varchar("heroEyebrow", { length: 180 }).notNull(),
  heroTitle: varchar("heroTitle", { length: 240 }).notNull(),
  heroSubtitle: text("heroSubtitle").notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 40 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  price: varchar("price", { length: 60 }).notNull(),
  duration: varchar("duration", { length: 80 }).notNull(),
  description: text("description").notNull(),
  accent: varchar("accent", { length: 40 }).notNull().default("lime"),
  sortOrder: int("sortOrder").notNull().default(0),
  isPublished: int("isPublished").notNull().default(1),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const portfolioItems = mysqlTable("portfolioItems", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  year: varchar("year", { length: 12 }).notNull(),
  description: text("description").notNull(),
  videoUrl: text("videoUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  tags: text("tags").notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  isFeatured: int("isFeatured").notNull().default(0),
  isPublished: int("isPublished").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const faqs = mysqlTable("faqs", {
  id: int("id").autoincrement().primaryKey(),
  question: varchar("question", { length: 240 }).notNull(),
  answer: text("answer").notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  isPublished: int("isPublished").notNull().default(1),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const inquiries = mysqlTable("inquiries", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  projectType: varchar("projectType", { length: 120 }),
  budget: varchar("budget", { length: 80 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type Service = typeof services.$inferSelect;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
