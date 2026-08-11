import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core"

export const claimStatusEnum = pgEnum("claim_status", ["pending", "approved", "rejected"])
export const verifiedStatusEnum = pgEnum("verified_status", ["pending", "approved", "rejected"])
export const bannerLocationEnum = pgEnum("banner_location", ["landing", "send", "inbox"])

export const claimRequests = pgTable(
  "claim_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plateNumber: text("plate_number").notNull(),
    email: text("email").notNull(),
    vehicleBrand: text("vehicle_brand").notNull(),
    carName: text("car_name"),
    status: claimStatusEnum("status").notNull().default("pending"),
    passwordHash: text("password_hash"),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    setupTokenHash: text("setup_token_hash"),
    setupTokenExpiresAt: timestamp("setup_token_expires_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.plateNumber)],
)

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  plateNumber: text("plate_number").notNull(),
  alias: text("alias"),
  message: text("message").notNull(),
  contact: text("contact"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const verifiedRequests = pgTable(
  "verified_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userEmail: text("user_email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    useCase: text("use_case").notNull(),
    status: verifiedStatusEnum("status").notNull().default("pending"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userEmail)],
)

export const banners = pgTable(
  "banners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    location: bannerLocationEnum("location").notNull(),
    imageUrl: text("image_url").notNull(),
    linkUrl: text("link_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.location)],
)
