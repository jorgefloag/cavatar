import { and, count, desc, eq, ilike, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, senders } from "@/lib/db/schema"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"
import { resolveSenderDisplayEmail } from "@/lib/senders/resolve-sender-display"

// Etapa 6 review note: no requireAdminEmail() in here — the Server Action
// wrapping this (app/admin/(protected)/messages/actions.ts) does the admin
// gate; this file is the real, directly-testable logic, same split as
// lib/senders/block-sender-globally.ts.

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
  // Etapa 6 — the admin, unlike the buzón owner, sees the real email (or
  // "Remitente anterior"/"Remitente anonimizado" — see
  // resolveSenderDisplayEmail()). senderId/senderBlocked back the
  // Bloquear/Desbloquear toggle in the UI; null senderId means there's
  // nothing to block (an old, pre-Etapa-2 message).
  senderId: string | null
  senderDisplay: string
  senderBlocked: boolean
}

export interface MessagesPage {
  messages: MessageAdminDTO[]
  totalCount: number
  page: number
  pageSize: number
}

export const emptyMessagesPage: MessagesPage = { messages: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE }

function toMessageAdminDTO(row: {
  message: typeof messages.$inferSelect
  senderEmail: string | null
  senderBlocked: boolean | null
}): MessageAdminDTO {
  const msg = row.message
  return {
    id: msg.id,
    plateNumber: msg.plateNumber,
    alias: msg.alias,
    message: msg.message,
    contact: msg.contact,
    createdAt: msg.createdAt.toISOString(),
    isBroadcast: msg.broadcastId !== null,
    archivedAt: msg.archivedAt ? msg.archivedAt.toISOString() : null,
    deletedAt: msg.deletedAt ? msg.deletedAt.toISOString() : null,
    deletedBy: msg.deletedBy,
    senderId: msg.senderId,
    senderDisplay: resolveSenderDisplayEmail(row.senderEmail),
    senderBlocked: row.senderBlocked ?? false,
  }
}

// Same filter fetchMessagesPage() uses, factored out so the CSV export can
// match it exactly without duplicating the normalization logic.
function plateFilterClause(plate: string | undefined) {
  return plate ? ilike(messages.plateNumber, `%${normalizePlateNumber(plate)}%`) : undefined
}

function buildWhere(plate: string | undefined, includeDeleted: boolean) {
  const clauses = [plateFilterClause(plate), includeDeleted ? undefined : isNull(messages.deletedAt)].filter(
    (c) => c !== undefined,
  )
  return clauses.length > 0 ? and(...clauses) : undefined
}

export async function fetchMessagesPage({
  page,
  plate,
  includeDeleted = false,
}: {
  page: number
  plate?: string
  includeDeleted?: boolean
}): Promise<MessagesPage> {
  const safePage = Math.max(1, page)
  const where = buildWhere(plate, includeDeleted)

  const [rows, [{ value: totalCount }]] = await Promise.all([
    db
      .select({ message: messages, senderEmail: senders.email, senderBlocked: senders.isBlocked })
      .from(messages)
      .leftJoin(senders, eq(senders.id, messages.senderId))
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
export async function fetchAllMessagesForExportList({
  plate,
  includeDeleted = false,
}: {
  plate?: string
  includeDeleted?: boolean
}): Promise<MessageAdminDTO[]> {
  const where = buildWhere(plate, includeDeleted)
  const rows = await db
    .select({ message: messages, senderEmail: senders.email, senderBlocked: senders.isBlocked })
    .from(messages)
    .leftJoin(senders, eq(senders.id, messages.senderId))
    .where(where)
    .orderBy(desc(messages.createdAt))

  return rows.map(toMessageAdminDTO)
}
