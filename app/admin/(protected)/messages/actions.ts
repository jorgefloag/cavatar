"use server"

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, messageReports } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"
import {
  fetchMessagesPage,
  fetchAllMessagesForExportList,
  emptyMessagesPage,
  type MessageAdminDTO,
  type MessagesPage,
} from "@/lib/admin/fetch-messages-with-sender"
import {
  fetchReportedMessagesList,
  fetchPendingReportsCountValue,
  type ReportedMessageDTO,
} from "@/lib/admin/fetch-reported-messages"
import { blockSenderGlobally } from "@/lib/senders/block-sender-globally"

// Etapa 6 review: the actual query/mutation logic for all of these lives in
// lib/ (no requireAdminEmail() in there), so it can be exercised with real
// code via a test harness without needing a live Clerk admin session. Every
// export here is just: gate, then call.
//
// No `export type { ... }` here — a "use server" file's export list is
// scanned by Next's server-actions bundler, which expects every export to
// be a callable action reference; re-exporting a type-only binding (even
// via `export type`) breaks that codegen. Callers import these types
// directly from lib/admin/* instead.

export async function fetchMessages(args: { page: number; plate?: string; includeDeleted?: boolean }): Promise<MessagesPage> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return emptyMessagesPage
  return fetchMessagesPage(args)
}

// Unpaginated — used by the "Descargar CSV" button, which exports every row
// matching the currently applied filter, not just the visible page.
export async function fetchAllMessagesForExport(args: {
  plate?: string
  includeDeleted?: boolean
}): Promise<MessageAdminDTO[]> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return []
  return fetchAllMessagesForExportList(args)
}

// Soft delete — same mechanism as the owner's own "Eliminar" (see
// app/inbox/moderation-actions.ts), just with deletedBy set to the admin's
// email instead of "owner". Purged for real ~30 days later by a cron
// (not yet built). Any pending report on this message is marked reviewed,
// since deleting the message IS the action that report was asking for.
export async function deleteMessage(id: string): Promise<{ success: boolean; error?: string; deletedBy?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [existing] = await db.select().from(messages).where(eq(messages.id, id)).limit(1)
    if (!existing) return { success: false, error: "Mensaje no encontrado." }

    await db.update(messages).set({ deletedAt: new Date(), deletedBy: admin.email }).where(eq(messages.id, id))
    await db
      .update(messageReports)
      .set({ status: "reviewed", reviewedAt: new Date(), reviewedBy: admin.email })
      .where(and(eq(messageReports.messageId, id), eq(messageReports.status, "pending")))

    console.error("[admin] deleteMessage (soft)", {
      plate: existing.plateNumber,
      adminEmail: admin.email,
      deletedAt: new Date().toISOString(),
      messagePreview: existing.message.slice(0, 80),
    })

    return { success: true, deletedBy: admin.email }
  } catch (error) {
    console.error("[admin/messages] deleteMessage error:", error)
    return { success: false, error: "Error al borrar el mensaje." }
  }
}

// Immediate, irreversible hard delete for severe cases — bypasses the
// ~30-day soft-delete window entirely. Minimal trail logged BEFORE the
// delete executes, same proportionate-for-a-single-admin-MVP level as the
// rest of this codebase's audit trails.
export async function permanentlyDeleteMessage(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [existing] = await db.select().from(messages).where(eq(messages.id, id)).limit(1)
    if (!existing) return { success: false, error: "Mensaje no encontrado." }

    console.error("[admin] permanentlyDeleteMessage", {
      id,
      plate: existing.plateNumber,
      adminEmail: admin.email,
      deletedAt: new Date().toISOString(),
      messagePreview: existing.message.slice(0, 80),
    })

    // Must run BEFORE the delete below — once the message is gone, the FK
    // (ON DELETE SET NULL) has already cleared message_id on any report for
    // it, so matching on messageId here afterward would find nothing. Same
    // resolution as the soft-delete path, just ordered to still see the id.
    await db
      .update(messageReports)
      .set({ status: "reviewed", reviewedAt: new Date(), reviewedBy: admin.email })
      .where(and(eq(messageReports.messageId, id), eq(messageReports.status, "pending")))

    await db.delete(messages).where(eq(messages.id, id))

    return { success: true }
  } catch (error) {
    console.error("[admin/messages] permanentlyDeleteMessage error:", error)
    return { success: false, error: "Error al borrar el mensaje definitivamente." }
  }
}

export async function fetchReportedMessages(): Promise<ReportedMessageDTO[]> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return []
  return fetchReportedMessagesList()
}

export async function fetchPendingReportsCount(): Promise<number> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return 0
  return fetchPendingReportsCountValue()
}

// "Revisado sin acción" — the admin looked and decided the report doesn't
// warrant deleting the message. Deleting the message (above) is the other
// way a pending report resolves; this is for when it doesn't.
export async function dismissReport(reportId: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  await db
    .update(messageReports)
    .set({ status: "dismissed", reviewedAt: new Date(), reviewedBy: admin.email })
    .where(eq(messageReports.id, reportId))

  return { success: true }
}

// Etapa 6 — global block, independent of (and in addition to) a plate
// owner's own per-plate block from Etapa 5. checkSendPermission() already
// checks senders.isBlocked first, so this takes effect on every plate the
// instant it's set, with nothing else to wire.
export async function blockSender(senderId: string, blocked: boolean): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }
  return blockSenderGlobally(senderId, blocked, admin.email)
}
