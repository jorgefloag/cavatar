"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { verifiedRequests } from "@/lib/db/schema"
import { getCurrentUserEmail } from "@/lib/auth/current-email"
import { sendAdminNewVerifiedRequestEmail } from "@/lib/email/send-admin-new-verified-request-email"

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

    // Awaited so the send actually completes before this serverless
    // invocation can be torn down, but its failure never surfaces to the
    // applicant — this is an internal admin ping, not something they
    // should see or worry about.
    const notified = await sendAdminNewVerifiedRequestEmail({
      userEmail: email,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      useCase: parsed.data.useCase,
    })
    if (!notified.success) {
      console.error("[verified/request] submitVerifiedRequest: admin notification failed:", notified.error)
    }

    return { success: true }
  } catch (error) {
    console.error("[verified/request] submitVerifiedRequest error:", error)
    return { success: false, error: "Error al enviar la solicitud. Intenta nuevamente." }
  }
}
