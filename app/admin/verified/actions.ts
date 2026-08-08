"use server"

import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { verifiedRequests } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"
import { sendVerifiedApprovedEmail } from "@/lib/email/send-verified-approved-email"
import { sendVerifiedRejectedEmail } from "@/lib/email/send-verified-rejected-email"
import { sendVerifiedRevokedEmail } from "@/lib/email/send-verified-revoked-email"

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

export async function approveVerifiedRequest(id: string): Promise<{ success: boolean; error?: string; warning?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [result] = await db
      .update(verifiedRequests)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(and(eq(verifiedRequests.id, id), eq(verifiedRequests.status, "pending")))
      .returning({ userEmail: verifiedRequests.userEmail })

    if (!result) {
      return { success: false, error: "Esta solicitud ya no está pendiente." }
    }

    const sent = await sendVerifiedApprovedEmail({ to: result.userEmail })
    return { success: true, warning: sent.success ? undefined : "La solicitud se aprobó, pero el correo no se pudo enviar." }
  } catch (error) {
    console.error("[admin/verified] approveVerifiedRequest error:", error)
    return { success: false, error: "Error al aprobar la solicitud." }
  }
}

export async function rejectVerifiedRequest(id: string): Promise<{ success: boolean; error?: string; warning?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [result] = await db
      .update(verifiedRequests)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(and(eq(verifiedRequests.id, id), eq(verifiedRequests.status, "pending")))
      .returning({ userEmail: verifiedRequests.userEmail })

    if (!result) {
      return { success: false, error: "Esta solicitud ya no está pendiente." }
    }

    const sent = await sendVerifiedRejectedEmail({ to: result.userEmail })
    return { success: true, warning: sent.success ? undefined : "La solicitud se rechazó, pero el correo no se pudo enviar." }
  } catch (error) {
    console.error("[admin/verified] rejectVerifiedRequest error:", error)
    return { success: false, error: "Error al rechazar la solicitud." }
  }
}

export async function revokeVerifiedProfile(id: string): Promise<{ success: boolean; error?: string; warning?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [result] = await db
      .update(verifiedRequests)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(and(eq(verifiedRequests.id, id), eq(verifiedRequests.status, "approved")))
      .returning({ userEmail: verifiedRequests.userEmail })

    if (!result) {
      return { success: false, error: "Este perfil ya no está aprobado." }
    }

    const sent = await sendVerifiedRevokedEmail({ to: result.userEmail })
    return { success: true, warning: sent.success ? undefined : "El perfil se revocó, pero el correo no se pudo enviar." }
  } catch (error) {
    console.error("[admin/verified] revokeVerifiedProfile error:", error)
    return { success: false, error: "Error al revocar el perfil." }
  }
}
