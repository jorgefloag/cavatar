"use server"

import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { verifiedRequests } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"

export interface VerifiedRequestAdminDTO {
  id: string
  userEmail: string
  fullName: string
  phone: string
  useCase: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  reviewedAt: string | null
}

export async function fetchAllVerifiedRequests(): Promise<VerifiedRequestAdminDTO[]> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return []

  const rows = await db.select().from(verifiedRequests).orderBy(desc(verifiedRequests.createdAt))

  return rows.map((row) => ({
    id: row.id,
    userEmail: row.userEmail,
    fullName: row.fullName,
    phone: row.phone,
    useCase: row.useCase,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
  }))
}

export async function approveVerifiedRequest(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    await db
      .update(verifiedRequests)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(and(eq(verifiedRequests.id, id), eq(verifiedRequests.status, "pending")))
    return { success: true }
  } catch (error) {
    console.error("[admin/verified] approveVerifiedRequest error:", error)
    return { success: false, error: "Error al aprobar la solicitud." }
  }
}

export async function rejectVerifiedRequest(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    await db
      .update(verifiedRequests)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(and(eq(verifiedRequests.id, id), eq(verifiedRequests.status, "pending")))
    return { success: true }
  } catch (error) {
    console.error("[admin/verified] rejectVerifiedRequest error:", error)
    return { success: false, error: "Error al rechazar la solicitud." }
  }
}

export async function revokeVerifiedProfile(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    await db
      .update(verifiedRequests)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(and(eq(verifiedRequests.id, id), eq(verifiedRequests.status, "approved")))
    return { success: true }
  } catch (error) {
    console.error("[admin/verified] revokeVerifiedProfile error:", error)
    return { success: false, error: "Error al revocar el perfil." }
  }
}
