"use server"

import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { messages, verifiedRequests } from "@/lib/db/schema"
import { getCurrentUserEmail } from "@/lib/auth/current-email"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"

const messageSchema = z.object({
  plateNumber: z.string().trim().min(1).max(20).transform(normalizePlateNumber),
  name: z.string().trim().max(100).optional(),
  message: z.string().trim().min(1).max(300),
  contact: z.string().trim().max(200).optional(),
})

export async function submitMessage(
  input: z.infer<typeof messageSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = messageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos." }
  }

  try {
    await db.insert(messages).values({
      plateNumber: parsed.data.plateNumber,
      alias: parsed.data.name || null,
      message: parsed.data.message,
      contact: parsed.data.contact || null,
    })
    return { success: true }
  } catch (error) {
    console.error("[send] submitMessage error:", error)
    return { success: false, error: "Error al enviar mensaje. Intenta nuevamente." }
  }
}

export async function checkVerifiedStatus(): Promise<{ verified: boolean; email: string | null }> {
  const email = await getCurrentUserEmail()
  if (!email) {
    return { verified: false, email: null }
  }

  const [row] = await db
    .select()
    .from(verifiedRequests)
    .where(and(eq(verifiedRequests.userEmail, email), eq(verifiedRequests.status, "approved")))
    .limit(1)

  return { verified: Boolean(row), email }
}
