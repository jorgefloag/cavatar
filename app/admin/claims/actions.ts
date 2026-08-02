"use server"

import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"
import { issueSetupToken } from "@/lib/claims/issue-setup-token"

const RESEND_COOLDOWN_MS = 60 * 1000
const TOKEN_TTL_MS = 48 * 60 * 60 * 1000

export interface ClaimDTO {
  id: string
  plateNumber: string
  email: string
  vehicleBrand: string
  status: "pending" | "approved" | "rejected"
  hasPassword: boolean
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
    hasPassword: row.passwordHash !== null,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
  }))
}

export async function approveClaim(id: string): Promise<{ success: boolean; error?: string; warning?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [result] = await db
      .update(claimRequests)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(and(eq(claimRequests.id, id), eq(claimRequests.status, "pending")))
      .returning({ id: claimRequests.id, email: claimRequests.email, plateNumber: claimRequests.plateNumber })

    if (!result) {
      return { success: false, error: "Este reclamo ya no está pendiente." }
    }

    const issued = await issueSetupToken({ claimId: result.id, email: result.email, plateNumber: result.plateNumber })
    return { success: true, warning: issued.warning }
  } catch (error) {
    console.error("[admin/claims] approveClaim error:", error)
    return { success: false, error: "Error al aprobar el reclamo." }
  }
}

export async function resendSetupEmail(id: string): Promise<{ success: boolean; error?: string; warning?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [claim] = await db.select().from(claimRequests).where(eq(claimRequests.id, id)).limit(1)

    if (!claim || claim.status !== "approved" || claim.passwordHash) {
      return { success: false, error: "Este reclamo no está esperando configuración." }
    }

    if (claim.setupTokenExpiresAt) {
      const issuedAt = claim.setupTokenExpiresAt.getTime() - TOKEN_TTL_MS
      if (Date.now() - issuedAt < RESEND_COOLDOWN_MS) {
        return { success: false, error: "Espera un momento antes de reenviar." }
      }
    }

    console.error("[admin] resendSetupEmail", {
      claimId: id,
      adminEmail: admin.email,
      plateNumber: claim.plateNumber,
      at: new Date().toISOString(),
    })

    const issued = await issueSetupToken({ claimId: claim.id, email: claim.email, plateNumber: claim.plateNumber })
    return { success: true, warning: issued.warning }
  } catch (error) {
    console.error("[admin/claims] resendSetupEmail error:", error)
    return { success: false, error: "Error al reenviar el correo." }
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
        setupTokenHash: null,
        setupTokenExpiresAt: null,
      })
      .where(and(eq(claimRequests.id, id), eq(claimRequests.status, "approved")))
    return { success: true }
  } catch (error) {
    console.error("[admin/claims] revokeClaim error:", error)
    return { success: false, error: "Error al revocar el reclamo." }
  }
}
