"use server"

import { and, count, desc, eq, ilike, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, messageReports } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"

const PAGE_SIZE = 20

export interface MessageAdminDTO {
  id: string
  plateNumber: string
  alias: string | null
  message: string
  contact: string | null
  createdAt: string
  isBroadcast: boolean
  archivedAt: string | null
  deletedAt: string | null
  deletedBy: string | null
}

export interface MessagesPage {
  messages: MessageAdminDTO[]
  totalCount: number
  page: number
  pageSize: number
}

const emptyPage: MessagesPage = { messages: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE }

function toMessageAdminDTO(row: typeof messages.$inferSelect): MessageAdminDTO {
  return {
    id: row.id,
    plateNumber: row.plateNumber,
    alias: row.alias,
    message: row.message,
    contact: row.contact,
    createdAt: row.createdAt.toISOString(),
    isBroadcast: row.broadcastId !== null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    deletedBy: row.deletedBy,
  }
}

// Same filter fetchMessages() uses, factored out so the CSV export can match
// it exactly without duplicating the normalization logic.
function plateFilterClause(plate: string | undefined) {
  return plate ? ilike(messages.plateNumber, `%${normalizePlateNumber(plate)}%`) : undefined
}

function buildWhere(plate: string | undefined, includeDeleted: boolean) {
  const clauses = [plateFilterClause(plate), includeDeleted ? undefined : isNull(messages.deletedAt)].filter(
    (c) => c !== undefined,
  )
  return clauses.length > 0 ? and(...clauses) : undefined
}

export async function fetchMessages({
  page,
  plate,
  includeDeleted = false,
}: {
  page: number
  plate?: string
  includeDeleted?: boolean
}): Promise<MessagesPage> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return emptyPage

  const safePage = Math.max(1, page)
  const where = buildWhere(plate, includeDeleted)

  const [rows, [{ value: totalCount }]] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(where)
      .orderBy(desc(messages.createdAt))
      .limit(PAGE_SIZE)
      .offset((safePage - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(messages).where(where),
  ])

  return {
    messages: rows.map(toMessageAdminDTO),
    totalCount,
    page: safePage,
    pageSize: PAGE_SIZE,
  }
}

// Unpaginated — used by the "Descargar CSV" button, which exports every row
// matching the currently applied filter, not just the visible page.
export async function fetchAllMessagesForExport({
  plate,
  includeDeleted = false,
}: {
  plate?: string
  includeDeleted?: boolean
}): Promise<MessageAdminDTO[]> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return []

  const where = buildWhere(plate, includeDeleted)
  const rows = await db.select().from(messages).where(where).orderBy(desc(messages.createdAt))

  return rows.map(toMessageAdminDTO)
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

export interface ReportedMessageDTO {
  id: string
  plateNumber: string
  messageId: string | null
  messagePreview: string
  reason: string | null
  createdAt: string
}

export async function fetchReportedMessages(): Promise<ReportedMessageDTO[]> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return []

  const rows = await db
    .select()
    .from(messageReports)
    .where(eq(messageReports.status, "pending"))
    .orderBy(desc(messageReports.createdAt))

  return rows.map((r) => ({
    id: r.id,
    plateNumber: r.plateNumber,
    messageId: r.messageId,
    messagePreview: r.messagePreview,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function fetchPendingReportsCount(): Promise<number> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return 0

  const [{ value }] = await db.select({ value: count() }).from(messageReports).where(eq(messageReports.status, "pending"))
  return value
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
