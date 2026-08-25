"use server"

import { eq, ne } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { claimRequests } from "@/lib/db/schema"
import { sendAdminNewClaimEmail } from "@/lib/email/send-admin-new-claim-email"
import { sendClaimReceivedEmail } from "@/lib/email/send-claim-received-email"

const claimSchema = z.object({
  plateNumber: z.string().trim().min(1).max(20),
  email: z.string().trim().email(),
  vehicleBrand: z.string().trim().min(1).max(100),
  carName: z.string().trim().max(60).optional(),
})

export async function submitClaim(
  input: z.infer<typeof claimSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = claimSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos." }
  }

  const plateNumber = parsed.data.plateNumber.toUpperCase()
  const carName = parsed.data.carName || null

  try {
    const [existing] = await db
      .select({ status: claimRequests.status })
      .from(claimRequests)
      .where(eq(claimRequests.plateNumber, plateNumber))
      .limit(1)

    if (existing?.status === "approved") {
      return { success: false, error: "Ya existe un reclamo aprobado para esta placa." }
    }

    await db
      .insert(claimRequests)
      .values({
        plateNumber,
        email: parsed.data.email,
        vehicleBrand: parsed.data.vehicleBrand,
        carName,
      })
      .onConflictDoUpdate({
        target: claimRequests.plateNumber,
        set: {
          email: parsed.data.email,
          vehicleBrand: parsed.data.vehicleBrand,
          carName,
          status: "pending",
          reviewedAt: null,
        },
        where: ne(claimRequests.status, "approved"),
      })

    // Both awaited so the sends actually complete before this serverless
    // invocation can be torn down, but neither's failure surfaces to the
    // submitter — the DB insert already succeeded and is the source of
    // truth; these are best-effort notifications, not the confirmation
    // itself (the on-screen "Tu solicitud fue enviada correctamente" is).
    const notified = await sendAdminNewClaimEmail({
      plateNumber,
      email: parsed.data.email,
      vehicleBrand: parsed.data.vehicleBrand,
      carName,
    })
    if (!notified.success) {
      console.error("[claim] submitClaim: admin notification failed:", notified.error)
    }

    const confirmed = await sendClaimReceivedEmail({ to: parsed.data.email, plateNumber })
    if (!confirmed.success) {
      console.error("[claim] submitClaim: submitter confirmation failed:", confirmed.error)
    }

    return { success: true }
  } catch (error) {
    console.error("[claim] submitClaim error:", error)
    return { success: false, error: "Error al enviar la solicitud." }
  }
}
