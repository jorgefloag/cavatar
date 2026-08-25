import { resend, EMAIL_FROM } from "./resend-client"

export async function sendAdminNewVerifiedRequestEmail({
  userEmail,
  fullName,
  phone,
  useCase,
}: {
  userEmail: string
  fullName: string
  phone: string
  useCase: string
}): Promise<{ success: boolean; error?: string }> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!to) {
    console.error("[email] sendAdminNewVerifiedRequestEmail: ADMIN_NOTIFICATION_EMAIL is not set")
    return { success: false, error: "ADMIN_NOTIFICATION_EMAIL no está configurado." }
  }

  const verifiedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/verified`

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Nueva solicitud de perfil verificado pendiente: ${userEmail}`,
      html: `
        <p>Hay una nueva solicitud de perfil verificado pendiente de revisión.</p>
        <ul>
          <li><strong>Correo:</strong> ${userEmail}</li>
          <li><strong>Nombre completo:</strong> ${fullName}</li>
          <li><strong>Teléfono:</strong> ${phone}</li>
          <li><strong>Uso previsto:</strong> ${useCase}</li>
        </ul>
        <p><a href="${verifiedUrl}">Revisar en el panel de admin</a></p>
      `,
    })

    if (error) {
      console.error("[email] sendAdminNewVerifiedRequestEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendAdminNewVerifiedRequestEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
