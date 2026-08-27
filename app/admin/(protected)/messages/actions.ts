"use server"

import { count, desc, eq, ilike } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages } from "@/lib/db/schema"
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
}

export interface MessagesPage {
  messages: MessageAdminDTO[]
  totalCount: number
  page: number
  pageSize: number
}

const emptyPage: MessagesPage = { messages: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE }

export async function fetchMessages({ page, plate }: { page: number; plate?: string }): Promise<MessagesPage> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return emptyPage

  const safePage = Math.max(1, page)
  // Normalize the search term the same way plate_number is stored, so
  // searching "ABC-123" still finds a row saved as "ABC123".
  const where = plate ? ilike(messages.plateNumber, `%${normalizePlateNumber(plate)}%`) : undefined

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
    messages: rows.map((row) => ({
      id: row.id,
      plateNumber: row.plateNumber,
      alias: row.alias,
      message: row.message,
      contact: row.contact,
      createdAt: row.createdAt.toISOString(),
      isBroadcast: row.broadcastId !== null,
    })),
    totalCount,
    page: safePage,
    pageSize: PAGE_SIZE,
  }
}

export async function deleteMessage(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [existing] = await db.select().from(messages).where(eq(messages.id, id)).limit(1)
    if (!existing) return { success: false, error: "Mensaje no encontrado." }

    await db.delete(messages).where(eq(messages.id, id))

    console.error("[admin] deleteMessage", {
      plate: existing.plateNumber,
      adminEmail: admin.email,
      deletedAt: new Date().toISOString(),
      messagePreview: existing.message.slice(0, 80),
    })

    return { success: true }
  } catch (error) {
    console.error("[admin/messages] deleteMessage error:", error)
    return { success: false, error: "Error al borrar el mensaje." }
  }
}
