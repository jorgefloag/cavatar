"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { claimRequests } from "@/lib/db/schema"

const claimSchema = z.object({
  plateNumber: z.string().trim().min(1).max(20),
  email: z.string().trim().email(),
  vehicleBrand: z.string().trim().min(1).max(100),
})

export async function submitClaim(
  input: z.infer<typeof claimSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = claimSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos." }
  }

  try {
    await db.insert(claimRequests).values({
      plateNumber: parsed.data.plateNumber.toUpperCase(),
      email: parsed.data.email,
      vehicleBrand: parsed.data.vehicleBrand,
    })
    return { success: true }
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      return { success: false, error: "Ya existe una solicitud de reclamo para esta placa." }
    }
    console.error("[claim] submitClaim error:", error)
    return { success: false, error: "Error al enviar la solicitud." }
  }
}
