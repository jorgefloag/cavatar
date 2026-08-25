import { resend, EMAIL_FROM } from "./resend-client"

export async function sendAdminNewClaimEmail({
  plateNumber,
  email,
  vehicleBrand,
  carName,
}: {
  plateNumber: string
  email: string
  vehicleBrand: string
  carName: string | null
}): Promise<{ success: boolean; error?: string }> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!to) {
    console.error("[email] sendAdminNewClaimEmail: ADMIN_NOTIFICATION_EMAIL is not set")
    return { success: false, error: "ADMIN_NOTIFICATION_EMAIL no está configurado." }
  }

  const claimsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/claims`

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Nuevo reclamo pendiente: ${plateNumber}`,
      html: `
        <p>Hay un nuevo reclamo de placa pendiente de revisión.</p>
        <ul>
          <li><strong>Placa:</strong> ${plateNumber}</li>
          <li><strong>Correo:</strong> ${email}</li>
          <li><strong>Marca:</strong> ${vehicleBrand}</li>
          ${carName ? `<li><strong>Nombre del carro:</strong> ${carName}</li>` : ""}
        </ul>
        <p><a href="${claimsUrl}">Revisar en el panel de admin</a></p>
      `,
    })

    if (error) {
      console.error("[email] sendAdminNewClaimEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendAdminNewClaimEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
