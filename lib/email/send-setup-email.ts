import { resend, EMAIL_FROM } from "./resend-client"

export async function sendSetupEmail({
  to,
  plateNumber,
  setupUrl,
}: {
  to: string
  plateNumber: string
  setupUrl: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Configura el acceso a tu buzón de la placa ${plateNumber}`,
      html: `
        <p>Tu reclamo de la placa <strong>${plateNumber}</strong> fue aprobado.</p>
        <p>Para configurar la contraseña de acceso a tu buzón, entra a este enlace (válido por 48 horas, un solo uso):</p>
        <p><a href="${setupUrl}">${setupUrl}</a></p>
        <p>Si no reconoces esta solicitud, ignora este correo.</p>
      `,
    })

    if (error) {
      console.error("[email] sendSetupEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendSetupEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
