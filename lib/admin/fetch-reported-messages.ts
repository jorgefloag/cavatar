import { count, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { messageReports, senders } from "@/lib/db/schema"
import { resolveSenderDisplayEmail } from "@/lib/senders/resolve-sender-display"

// Etapa 6 review note: no requireAdminEmail() in here — see
// lib/admin/fetch-messages-with-sender.ts for the same split rationale.

export interface ReportedMessageDTO {
  id: string
  plateNumber: string
  messageId: string | null
  messagePreview: string
  reason: string | null
  createdAt: string
  // Etapa 6 — null means there's no sender to block (an old report from
  // before Etapa 2, or one filed against a message that never had a
  // senderId). senderDisplay resolution order: the sender's LIVE email (if
  // the row still exists) takes priority over the report's own
  // point-in-time snapshot — the snapshot only matters once the sender row
  // is gone (hard-deleted) or, after anonymizeSender(), once its own
  // snapshot has been cleared; either way resolveSenderDisplayEmail()
  // collapses "no sender row" and "anonymized sender" to the same safe
  // labels a report's reader needs, never a raw email that's gone stale.
  reportedSenderId: string | null
  senderDisplay: string
  senderBlocked: boolean
}

export async function fetchReportedMessagesList(): Promise<ReportedMessageDTO[]> {
  const rows = await db
    .select({ report: messageReports, senderEmail: senders.email, senderBlocked: senders.isBlocked })
    .from(messageReports)
    .leftJoin(senders, eq(senders.id, messageReports.reportedSenderId))
    .where(eq(messageReports.status, "pending"))
    .orderBy(desc(messageReports.createdAt))

  return rows.map(({ report, senderEmail, senderBlocked }) => ({
    id: report.id,
    plateNumber: report.plateNumber,
    messageId: report.messageId,
    messagePreview: report.messagePreview,
    reason: report.reason,
    createdAt: report.createdAt.toISOString(),
    reportedSenderId: report.reportedSenderId,
    senderDisplay: resolveSenderDisplayEmail(senderEmail ?? report.reportedSenderEmailSnapshot),
    senderBlocked: senderBlocked ?? false,
  }))
}

export async function fetchPendingReportsCountValue(): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(messageReports)
    .where(eq(messageReports.status, "pending"))
  return value
}
