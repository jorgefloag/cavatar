import { resend, EMAIL_FROM } from "./resend-client"

export async function sendClaimRejectedEmail({
  to,
  plateNumber,
}: {
  to: string
  plateNumber: string
}): Promise<{ success: boolean; error?: string }> {
  const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL}/claim`

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Tu reclamo de la placa ${plateNumber} fue rechazado`,
      html: `
        <p>Tu reclamo de la placa <strong>${plateNumber}</strong> fue rechazado.</p>
        <p>Si crees que esto es un error o quieres enviarlo de nuevo con información adicional, puedes volver a intentarlo aquí:</p>
        <p><a href="${claimUrl}">${claimUrl}</a></p>
      `,
    })

    if (error) {
      console.error("[email] sendClaimRejectedEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendClaimRejectedEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
