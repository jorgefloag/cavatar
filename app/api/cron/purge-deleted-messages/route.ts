import { NextResponse } from "next/server"
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, messageReports, inboxSessions } from "@/lib/db/schema"

const PURGE_AFTER_MS = 30 * 24 * 60 * 60 * 1000
// ~12 months — a closed report's content-copy retention (status "reviewed"
// or "dismissed" — anything the admin resolved one way or the other, plus
// the "reviewed" a pending report gets auto-stamped with above when its own
// message is purged), independent of the message's own 30-day one (a report
// can outlive the message it was about, since messageId goes null via
// ON DELETE SET NULL above). A still-pending report is never touched by
// this cutoff, no matter how old.
const REPORT_RETENTION_MS = 365 * 24 * 60 * 60 * 1000

// Vercel Cron can only call an HTTP endpoint, not a Server Action — same
// deliberate app/api exception as app/api/cron/daily-digest (see
// CLAUDE.md). Configured in vercel.json, scheduled well apart from that
// cron so neither run overlaps the other.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - PURGE_AFTER_MS)

  // Exactly this condition — deleted_at IS NOT NULL AND deleted_at < cutoff
  // — never touches archived_at or anything with deleted_at still NULL.
  const toPurge = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(isNotNull(messages.deletedAt), lt(messages.deletedAt, cutoff)))

  // Must run BEFORE the messages DELETE below — once a message is gone,
  // the FK (ON DELETE SET NULL) has already cleared message_id on any
  // report for it, so matching on messageId afterward would find nothing.
  // Same ordering fix already applied to permanentlyDeleteMessage().
  if (toPurge.length > 0) {
    const ids = toPurge.map((m) => m.id)
    await db
      .update(messageReports)
      .set({ status: "reviewed", reviewedAt: new Date(), reviewedBy: "cron:purge-deleted-messages" })
      .where(and(inArray(messageReports.messageId, ids), eq(messageReports.status, "pending")))
  }

  const purgedMessages = await db
    .delete(messages)
    .where(and(isNotNull(messages.deletedAt), lt(messages.deletedAt, cutoff)))
    .returning({ id: messages.id })

  const purgedSessions = await db
    .delete(inboxSessions)
    .where(lt(inboxSessions.expiresAt, new Date()))
    .returning({ id: inboxSessions.id })

  const reportCutoff = new Date(Date.now() - REPORT_RETENTION_MS)
  const purgedReports = await db
    .delete(messageReports)
    .where(
      and(inArray(messageReports.status, ["reviewed", "dismissed"]), lt(messageReports.reviewedAt, reportCutoff)),
    )
    .returning({ id: messageReports.id })

  console.error("[cron/purge-deleted-messages] purged", {
    messages: purgedMessages.length,
    inboxSessions: purgedSessions.length,
    messageReports: purgedReports.length,
    at: new Date().toISOString(),
  })

  return NextResponse.json({
    purgedMessages: purgedMessages.length,
    purgedInboxSessions: purgedSessions.length,
    purgedMessageReports: purgedReports.length,
  })
}
