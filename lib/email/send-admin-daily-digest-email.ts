import { resend, EMAIL_FROM } from "./resend-client"

interface PendingClaimSummary {
  plateNumber: string
  email: string
  createdAt: Date
}

interface PendingVerifiedSummary {
  userEmail: string
  fullName: string
  createdAt: Date
}

function daysPending(createdAt: Date): number {
  const ms = Date.now() - createdAt.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function formatDays(days: number): string {
  if (days === 0) return "hoy"
  return `${days} día${days === 1 ? "" : "s"}`
}

export async function sendAdminDailyDigestEmail({
  pendingClaims,
  pendingVerified,
}: {
  pendingClaims: PendingClaimSummary[]
  pendingVerified: PendingVerifiedSummary[]
}): Promise<{ success: boolean; error?: string }> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!to) {
    console.error("[email] sendAdminDailyDigestEmail: ADMIN_NOTIFICATION_EMAIL is not set")
    return { success: false, error: "ADMIN_NOTIFICATION_EMAIL no está configurado." }
  }

  const claimsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/claims`
  const verifiedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/verified`
  const today = new Date().toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })

  const claimsList = pendingClaims
    .map(
      (c) =>
        `<li><strong>${c.plateNumber}</strong> — ${c.email} (esperando ${formatDays(daysPending(c.createdAt))})</li>`,
    )
    .join("")

  const verifiedList = pendingVerified
    .map(
      (v) =>
        `<li><strong>${v.fullName}</strong> — ${v.userEmail} (esperando ${formatDays(daysPending(v.createdAt))})</li>`,
    )
    .join("")

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Pendientes de revisar en CAVATAR — ${today}`,
      html: `
        <p>Resumen de lo pendiente de revisión en CAVATAR al ${today}:</p>
        <h3>Reclamos de placa (${pendingClaims.length})</h3>
        ${pendingClaims.length ? `<ul>${claimsList}</ul><p><a href="${claimsUrl}">Revisar reclamos</a></p>` : "<p>Ninguno pendiente.</p>"}
        <h3>Solicitudes de perfil verificado (${pendingVerified.length})</h3>
        ${pendingVerified.length ? `<ul>${verifiedList}</ul><p><a href="${verifiedUrl}">Revisar solicitudes</a></p>` : "<p>Ninguna pendiente.</p>"}
      `,
    })

    if (error) {
      console.error("[email] sendAdminDailyDigestEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendAdminDailyDigestEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
