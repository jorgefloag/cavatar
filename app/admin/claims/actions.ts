"use server"

import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"

export interface ClaimDTO {
  id: string
  plateNumber: string
  email: string
  vehicleBrand: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  reviewedAt: string | null
}

export async function fetchAllClaims(): Promise<ClaimDTO[]> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return []

  const rows = await db.select().from(claimRequests).orderBy(desc(claimRequests.createdAt))

  return rows.map((row) => ({
    id: row.id,
    plateNumber: row.plateNumber,
    email: row.email,
    vehicleBrand: row.vehicleBrand,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
  }))
}

export async function approveClaim(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    await db
      .update(claimRequests)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(and(eq(claimRequests.id, id), eq(claimRequests.status, "pending")))
    return { success: true }
  } catch (error) {
    console.error("[admin/claims] approveClaim error:", error)
    return { success: false, error: "Error al aprobar el reclamo." }
  }
}

export async function rejectClaim(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    await db
      .update(claimRequests)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(and(eq(claimRequests.id, id), eq(claimRequests.status, "pending")))
    return { success: true }
  } catch (error) {
    console.error("[admin/claims] rejectClaim error:", error)
    return { success: false, error: "Error al rechazar el reclamo." }
  }
}

export async function revokeClaim(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    await db
      .update(claimRequests)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        passwordHash: null,
        failedAttempts: 0,
        lockedUntil: null,
      })
      .where(and(eq(claimRequests.id, id), eq(claimRequests.status, "approved")))
    return { success: true }
  } catch (error) {
    console.error("[admin/claims] revokeClaim error:", error)
    return { success: false, error: "Error al revocar el reclamo." }
  }
}
