"use server"

import { desc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { broadcasts, claimRequests, messages } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"

export interface BrandOptionDTO {
  value: string
  label: string
  count: number
}

export async function fetchBrandOptions(): Promise<BrandOptionDTO[]> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return []

  // Same lower(trim(...)) normalization as the reports brand breakdown, so
  // the filter here lines up with what the admin already sees there.
  const normalizedBrand = sql<string>`lower(trim(${claimRequests.vehicleBrand}))`

  const rows = await db
    .select({ brand: normalizedBrand, count: sql<number>`count(*)` })
    .from(claimRequests)
    .where(eq(claimRequests.status, "approved"))
    .groupBy(normalizedBrand)
    .orderBy(sql`count(*) desc`)

  return rows
    .filter((row) => row.brand)
    .map((row) => ({
      value: row.brand,
      label: row.brand.charAt(0).toUpperCase() + row.brand.slice(1),
      count: Number(row.count),
    }))
}

async function countRecipients(brandFilter: string | null): Promise<number> {
  const result = await db.execute(sql`
    select count(*)::int as count
    from claim_requests
    where status = 'approved'
    ${brandFilter ? sql`and lower(trim(vehicle_brand)) = ${brandFilter}` : sql``}
  `)
  return Number((result.rows[0] as { count: number } | undefined)?.count ?? 0)
}

export async function previewBroadcastRecipients(brandFilter: string | null): Promise<{ count: number }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { count: 0 }

  return { count: await countRecipients(brandFilter) }
}

const sendBroadcastSchema = z.object({
  message: z.string().trim().min(1).max(500),
  brandFilter: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .nullable(),
  confirmedCount: z.number().int().min(0),
})

export async function sendBroadcast(
  input: z.infer<typeof sendBroadcastSchema>,
): Promise<{ success: boolean; error?: string; recipientCount?: number }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  const parsed = sendBroadcastSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "Datos inválidos." }

  const { message, brandFilter, confirmedCount } = parsed.data

  // The count the admin confirmed in the modal could be stale by the time
  // the request lands (a claim could be approved/revoked in between) —
  // re-check right before writing anything, rather than trusting the number
  // the client sends back.
  const actualCount = await countRecipients(brandFilter)
  if (actualCount !== confirmedCount) {
    return {
      success: false,
      error: `El número de destinatarios cambió (antes ${confirmedCount}, ahora ${actualCount}). Genera la vista previa de nuevo.`,
    }
  }
  if (actualCount === 0) {
    return { success: false, error: "No hay placas aprobadas que coincidan con este filtro." }
  }

  try {
    const [broadcast] = await db
      .insert(broadcasts)
      .values({ adminEmail: admin.email, message, brandFilter, recipientCount: actualCount })
      .returning({ id: broadcasts.id })

    // A single INSERT...SELECT is one atomic statement at the Postgres level
    // — it either inserts every matching plate or none, so a mid-send
    // failure can never leave some recipients messaged and others not. The
    // neon-http driver used by this project doesn't support interactive
    // transactions, so this atomicity has to come from the statement shape
    // itself rather than a wrapping db.transaction().
    const inserted = await db.execute(sql`
      insert into messages (plate_number, message, broadcast_id)
      select plate_number, ${message}, ${broadcast.id}::uuid
      from claim_requests
      where status = 'approved'
      ${brandFilter ? sql`and lower(trim(vehicle_brand)) = ${brandFilter}` : sql``}
      returning id
    `)

    const recipientCount = inserted.rows.length
    if (recipientCount !== actualCount) {
      await db.update(broadcasts).set({ recipientCount }).where(eq(broadcasts.id, broadcast.id))
    }

    return { success: true, recipientCount }
  } catch (error) {
    console.error("[admin/broadcast] sendBroadcast error:", error)
    return { success: false, error: "Error al enviar el mensaje masivo." }
  }
}

export interface BroadcastHistoryDTO {
  id: string
  message: string
  brandFilter: string | null
  recipientCount: number
  createdAt: string
  undoneAt: string | null
}

export async function fetchBroadcastHistory(): Promise<BroadcastHistoryDTO[]> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return []

  const rows = await db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt)).limit(50)

  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    brandFilter: row.brandFilter,
    recipientCount: row.recipientCount,
    createdAt: row.createdAt.toISOString(),
    undoneAt: row.undoneAt ? row.undoneAt.toISOString() : null,
  }))
}

export async function undoBroadcast(
  broadcastId: string,
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  const [broadcast] = await db.select().from(broadcasts).where(eq(broadcasts.id, broadcastId)).limit(1)
  if (!broadcast) return { success: false, error: "Difusión no encontrada." }
  if (broadcast.undoneAt) return { success: false, error: "Esta difusión ya fue deshecha." }

  try {
    const deleted = await db
      .delete(messages)
      .where(eq(messages.broadcastId, broadcastId))
      .returning({ id: messages.id })

    await db.update(broadcasts).set({ undoneAt: new Date() }).where(eq(broadcasts.id, broadcastId))

    console.error("[admin/broadcast] undoBroadcast", {
      broadcastId,
      adminEmail: admin.email,
      deletedCount: deleted.length,
      undoneAt: new Date().toISOString(),
    })

    return { success: true, deletedCount: deleted.length }
  } catch (error) {
    console.error("[admin/broadcast] undoBroadcast error:", error)
    return { success: false, error: "Error al deshacer la difusión." }
  }
}
