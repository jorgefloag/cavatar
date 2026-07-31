"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { verifiedRequests } from "@/lib/db/schema"
import { getCurrentUserEmail } from "@/lib/auth/current-email"

const requestSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(30),
  useCase: z.string().trim().min(1).max(1000),
})

export async function submitVerifiedRequest(
  input: z.infer<typeof requestSchema>,
): Promise<{ success: boolean; error?: string }> {
  const email = await getCurrentUserEmail()
  if (!email) {
    return { success: false, error: "Debes iniciar sesión para enviar esta solicitud." }
  }

  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos." }
  }

  try {
    await db
      .insert(verifiedRequests)
      .values({
        userEmail: email,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        useCase: parsed.data.useCase,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: verifiedRequests.userEmail,
        set: {
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          useCase: parsed.data.useCase,
          status: "pending",
        },
      })
    return { success: true }
  } catch (error) {
    console.error("[verified/request] submitVerifiedRequest error:", error)
    return { success: false, error: "Error al enviar la solicitud. Intenta nuevamente." }
  }
}
