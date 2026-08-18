"use server"

import { desc, eq, sql } from "drizzle-orm"
import * as XLSX from "xlsx"
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

// --- File-list mode (upload an .xlsx/.csv of plate numbers) ---

const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2 MB
const MAX_PLATES_PER_UPLOAD = 5000
const PLATE_MAX_LENGTH = 20 // same bound as the /send message schema
const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"]

// Sends regardless of claim status (same leniency as /send for a single
// plate) so this is purely structural validation, not a claim_requests
// lookup: trim/uppercase, non-empty, within the length bound everything
// else in the app already uses. No plate-format regex — CR plates vary
// too much across vehicle types and eras for a stricter check to be safe.
function normalizePlate(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null
  const value = String(raw).trim().toUpperCase()
  if (!value || value.length > PLATE_MAX_LENGTH) return null
  return value
}

// Looks for a header cell containing "placa" (any column, case-insensitive)
// and reads that column from row 2 onward; if no such header exists, falls
// back to column A starting at row 1 (a bare list with no header).
function extractPlatesFromRows(rows: unknown[][]): string[] {
  if (rows.length === 0) return []

  let startRow = 0
  let columnIndex = 0
  const headerIndex = rows[0]?.findIndex((cell) => typeof cell === "string" && /placa/i.test(cell.trim())) ?? -1
  if (headerIndex >= 0) {
    columnIndex = headerIndex
    startRow = 1
  }

  const plates = new Set<string>()
  for (let i = startRow; i < rows.length; i++) {
    const plate = normalizePlate(rows[i]?.[columnIndex])
    if (plate) plates.add(plate)
  }
  return [...plates]
}

export async function previewBroadcastFile(
  formData: FormData,
): Promise<{ success: boolean; error?: string; count?: number; plates?: string[] }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Subí un archivo." }
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { success: false, error: "Formato no soportado. Usá un archivo .xlsx, .xls o .csv." }
  }

  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: "El archivo supera el límite de 2 MB." }
  }

  let plates: string[]
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
    plates = extractPlatesFromRows(rows)
  } catch (error) {
    console.error("[admin/broadcast] previewBroadcastFile parse error:", error)
    return { success: false, error: "No se pudo leer el archivo. Verificá que sea un Excel o CSV válido." }
  }

  if (plates.length === 0) {
    return { success: false, error: "No se encontraron placas válidas en el archivo." }
  }
  if (plates.length > MAX_PLATES_PER_UPLOAD) {
    return {
      success: false,
      error: `El archivo tiene ${plates.length} placas; el máximo por envío es ${MAX_PLATES_PER_UPLOAD}.`,
    }
  }

  return { success: true, count: plates.length, plates }
}

// --- Sending ---

const recipientsSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("all") }),
  z.object({ mode: z.literal("brand"), brandFilter: z.string().trim().toLowerCase().min(1) }),
  z.object({
    mode: z.literal("list"),
    plates: z.array(z.string().trim().min(1).max(PLATE_MAX_LENGTH)).min(1).max(MAX_PLATES_PER_UPLOAD),
  }),
])

const sendBroadcastSchema = z.object({
  message: z.string().trim().min(1).max(500),
  confirmedCount: z.number().int().min(0),
  recipients: recipientsSchema,
})

export async function sendBroadcast(
  input: z.infer<typeof sendBroadcastSchema>,
): Promise<{ success: boolean; error?: string; recipientCount?: number; broadcastId?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  const parsed = sendBroadcastSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "Datos inválidos." }

  const { message, confirmedCount, recipients } = parsed.data

  // The count the admin confirmed in the modal could be stale by the time
  // the request lands (a claim could be approved/revoked since the preview,
  // for "all"/"brand" mode) — re-derive right before writing anything,
  // rather than trusting the number the client sends back. For "list" mode
  // there's no live table to go stale against, but we still re-normalize
  // and re-dedupe the plates server-side as defense in depth.
  let actualCount: number
  let normalizedPlates: string[] = []
  if (recipients.mode === "list") {
    normalizedPlates = [...new Set(recipients.plates.map((p) => p.trim().toUpperCase()).filter(Boolean))]
    actualCount = normalizedPlates.length
  } else {
    actualCount = await countRecipients(recipients.mode === "brand" ? recipients.brandFilter : null)
  }

  if (actualCount !== confirmedCount) {
    return {
      success: false,
      error: `El número de destinatarios cambió (antes ${confirmedCount}, ahora ${actualCount}). Genera la vista previa de nuevo.`,
    }
  }
  if (actualCount === 0) {
    return { success: false, error: "No hay destinatarios para este envío." }
  }

  try {
    const [broadcast] = await db
      .insert(broadcasts)
      .values({
        adminEmail: admin.email,
        message,
        source: recipients.mode,
        brandFilter: recipients.mode === "brand" ? recipients.brandFilter : null,
        recipientCount: actualCount,
      })
      .returning({ id: broadcasts.id })

    // A single INSERT...SELECT (or INSERT...SELECT FROM unnest(...) for the
    // list mode) is one atomic statement at the Postgres level — it either
    // inserts every matching plate or none, so a mid-send failure can never
    // leave some recipients messaged and others not. The neon-http driver
    // used by this project doesn't support interactive transactions, so
    // this atomicity has to come from the statement shape itself rather
    // than a wrapping db.transaction().
    const inserted =
      recipients.mode === "list"
        ? await db.execute(sql`
            insert into messages (plate_number, message, broadcast_id)
            select p.plate_number, ${message}, ${broadcast.id}::uuid
            -- Drizzle's sql tag spreads a JS array into one bound param per
            -- element ($1, $2, ...) rather than a single array-typed param,
            -- so passing the array directly and casting to text[] fails
            -- ("cannot cast type record to text[]"). Rebuilding it as
            -- ARRAY[$1, $2, ...] via sql.join keeps every plate individually
            -- parameterized while still producing a real Postgres array for
            -- unnest() to expand.
            from unnest(ARRAY[${sql.join(
              normalizedPlates.map((p) => sql`${p}`),
              sql`, `,
            )}]::text[]) as p(plate_number)
            returning plate_number
          `)
        : await db.execute(sql`
            insert into messages (plate_number, message, broadcast_id)
            select plate_number, ${message}, ${broadcast.id}::uuid
            from claim_requests
            where status = 'approved'
            ${recipients.mode === "brand" ? sql`and lower(trim(vehicle_brand)) = ${recipients.brandFilter}` : sql``}
            returning plate_number
          `)

    // recipient_plates is a permanent snapshot, independent of the messages
    // rows it was derived from — undoBroadcast() hard-deletes those rows so
    // the message stops showing in inboxes, but never touches this column,
    // so "who received this broadcast" survives even after an undo.
    const recipientPlates = inserted.rows.map((row) => row.plate_number as string)
    const recipientCount = recipientPlates.length
    await db.update(broadcasts).set({ recipientCount, recipientPlates }).where(eq(broadcasts.id, broadcast.id))

    return { success: true, recipientCount, broadcastId: broadcast.id }
  } catch (error) {
    console.error("[admin/broadcast] sendBroadcast error:", error)
    return { success: false, error: "Error al enviar el mensaje masivo." }
  }
}

export interface BroadcastHistoryDTO {
  id: string
  message: string
  source: "all" | "brand" | "list"
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
    source: row.source,
    brandFilter: row.brandFilter,
    recipientCount: row.recipientCount,
    createdAt: row.createdAt.toISOString(),
    undoneAt: row.undoneAt ? row.undoneAt.toISOString() : null,
  }))
}

export async function fetchBroadcastRecipients(
  broadcastId: string,
): Promise<{ success: boolean; error?: string; plates?: string[] }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  const [broadcast] = await db.select().from(broadcasts).where(eq(broadcasts.id, broadcastId)).limit(1)
  if (!broadcast) return { success: false, error: "Difusión no encontrada." }

  // recipient_plates is a permanent snapshot taken at send time — it
  // survives undoBroadcast() (which only deletes the messages rows, never
  // this column), so this works the same whether or not the broadcast was
  // later undone. It's null only for broadcasts sent before this column
  // existed AND already undone by the time it was added — for those,
  // there's genuinely no surviving record of which plates were involved.
  if (!broadcast.recipientPlates) {
    return {
      success: false,
      error: "Esta difusión no tiene un registro histórico de destinatarios (se envió antes de esta función).",
    }
  }

  return { success: true, plates: [...broadcast.recipientPlates].sort() }
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
