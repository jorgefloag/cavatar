import { resend, EMAIL_FROM } from "./resend-client"

export async function sendClaimReceivedEmail({
  to,
  plateNumber,
}: {
  to: string
  plateNumber: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Recibimos tu solicitud de reclamo — placa ${plateNumber}`,
      html: `
        <p>Recibimos tu solicitud para reclamar la placa <strong>${plateNumber}</strong>.</p>
        <p>La estamos revisando. Te avisaremos por este mismo correo en cuanto tengamos una respuesta.</p>
      `,
    })

    if (error) {
      console.error("[email] sendClaimReceivedEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendClaimReceivedEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
