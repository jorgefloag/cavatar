import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core"

export const claimStatusEnum = pgEnum("claim_status", ["pending", "approved", "rejected"])
export const verifiedStatusEnum = pgEnum("verified_status", ["pending", "approved", "rejected"])
export const bannerLocationEnum = pgEnum("banner_location", ["landing", "send", "inbox"])
export const broadcastSourceEnum = pgEnum("broadcast_source", ["all", "brand", "list"])
export const reportStatusEnum = pgEnum("report_status", ["pending", "reviewed", "dismissed"])

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
    // New-message owner notifications (see app/api/qstash/notify-owner):
    // notifyScheduledAt marks a pending QStash callback so submitMessage()
    // doesn't schedule a second one within the same batching window;
    // lastNotifiedAt is the cooldown clock so a burst of messages can't
    // notify this plate more than once every COOLDOWN_MINUTES.
    notifyScheduledAt: timestamp("notify_scheduled_at", { withTimezone: true }),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    // Daily notification cap (see lib/qstash/notification-window.ts):
    // notifyWindowStartedAt anchors this plate's own rolling 24h window —
    // deliberately NOT derived from lastNotifiedAt, which only records the
    // *most recent* send and can't tell "2 hours into this window" from
    // "23 hours into this window" once several sends have happened.
    // notifyWindowCount is how many notifications this plate has had since
    // that anchor. Both reset together once 24h have elapsed since the
    // anchor — not on a calendar-day boundary.
    notifyWindowStartedAt: timestamp("notify_window_started_at", { withTimezone: true }),
    notifyWindowCount: integer("notify_window_count").notNull().default(0),
    // Push notification rate limiting (see lib/push/push-window.ts) — a
    // deliberately separate set of columns/constants from the email ones
    // above, not shared logic, so this channel's limits can never drift the
    // email channel's by accident. pushLastSentAt is the per-plate minimum-
    // gap clock; pushWindowStartedAt/pushWindowCount are the same anchored-
    // 24h-window pattern as notifyWindowStartedAt/notifyWindowCount, just
    // with push's own (higher) daily cap.
    pushLastSentAt: timestamp("push_last_sent_at", { withTimezone: true }),
    pushWindowStartedAt: timestamp("push_window_started_at", { withTimezone: true }),
    pushWindowCount: integer("push_window_count").notNull().default(0),
    // Self-service "forgot my password" (see lib/claims/issue-password-reset-token.ts).
    // Deliberately a SEPARATE token pair from setupTokenHash/setupTokenExpiresAt
    // above, not a relaxed version of it: the setup token's guard (only
    // usable while password_hash IS NULL) is a real security property —
    // a setup token can never overwrite an existing password. A reset
    // token needs the opposite guard (only usable once password_hash IS
    // NOT NULL), so the two must never share one column pair or that
    // property could blur. Requesting a new reset token overwrites this
    // hash, which is what makes "only the latest link works" true — no
    // extra bookkeeping needed. Cleared (along with setupTokenHash) when a
    // claim is approved or revoked, so a stale link never survives a status
    // change out from under it.
    passwordResetTokenHash: text("password_reset_token_hash"),
    passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at", { withTimezone: true }),
    // Same anchored-24h-window pattern as notify_window_*/push_window_*
    // above — a third independent copy, not shared code, same reasoning.
    // This single counter is shared between two different triggers (a
    // genuine password reset, and a resend of the original setup link for
    // a claim that's still awaiting_setup): both represent "we sent this
    // plate's owner a password-setting email," which is the thing actually
    // worth rate-limiting, regardless of which of the two emails it was.
    passwordResetWindowStartedAt: timestamp("password_reset_window_started_at", { withTimezone: true }),
    passwordResetWindowCount: integer("password_reset_window_count").notNull().default(0),
  },
  (t) => [unique().on(t.plateNumber)],
)

export const broadcasts = pgTable("broadcasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminEmail: text("admin_email").notNull(),
  message: text("message").notNull(),
  source: broadcastSourceEnum("source").notNull().default("all"),
  brandFilter: text("brand_filter"),
  recipientCount: integer("recipient_count").notNull(),
  recipientPlates: text("recipient_plates").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  undoneAt: timestamp("undone_at", { withTimezone: true }),
})

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  plateNumber: text("plate_number").notNull(),
  alias: text("alias"),
  message: text("message").notNull(),
  contact: text("contact"),
  broadcastId: uuid("broadcast_id").references(() => broadcasts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  ownerNotifiedAt: timestamp("owner_notified_at", { withTimezone: true }),
  // Owner-side declutter only — never hides anything from the admin, never
  // a moderation action. archivedAt nullable, set/unset freely.
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  // Soft delete, by the owner (deletedBy: "owner") or the admin
  // (deletedBy: the admin's email) — same mechanism either way, so there's
  // one deletion story to reason about, not two. Purged for real ~30 days
  // later by a cron (Fase 4 of this plan); deletedBy is the audit trail
  // CLAUDE.md's Roadmap already flagged as missing.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: text("deleted_by"),
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

// One row per (plate, browser subscription). UNIQUE is on (plateNumber,
// endpoint), not endpoint alone: a single browser subscription is one per
// origin, but nothing stops the same device being linked to several plates
// the same owner controls (or several test plates) — endpoint alone would
// have forced a device to silently "move" between plates on re-activation.
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plateNumber: text("plate_number").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.plateNumber, t.endpoint)],
)

// One row per owner report of a message. messageId is nullable with
// ON DELETE SET NULL specifically so the 30-day purge cron can hard-delete
// the underlying message without breaking (or cascading into) this row —
// messagePreview is a permanent snapshot, captured at report time, so the
// report stays reviewable even after the message itself is gone (same
// survives-deletion reasoning as broadcasts.recipient_plates elsewhere).
export const messageReports = pgTable("message_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  plateNumber: text("plate_number").notNull(),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
  messagePreview: text("message_preview").notNull(),
  reason: text("reason"),
  status: reportStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
})

// Short-lived buzón session (see lib/inbox/session.ts) — issued by
// verifyPlatePassword() on a successful password check, so the owner isn't
// forced to re-enter the password for every archive/delete/report action
// in the same visit. Deliberately the same "opaque random token, hash
// stored, checked against expiry" shape as the setup/reset tokens above,
// not a signed/stateless cookie — no new trust mechanism, same pattern
// proven three times already in this codebase. Expired rows are purged by
// the same cron that purges soft-deleted messages.
export const inboxSessions = pgTable("inbox_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  plateNumber: text("plate_number").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
