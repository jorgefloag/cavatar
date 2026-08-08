import { resend, EMAIL_FROM } from "./resend-client"

export async function sendClaimRevokedEmail({
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
      subject: `Se revocó el acceso a tu buzón de la placa ${plateNumber}`,
      html: `
        <p>Un administrador revocó el acceso a tu buzón de la placa <strong>${plateNumber}</strong>.</p>
        <p>Tu contraseña de acceso dejó de funcionar de inmediato.</p>
      `,
    })

    if (error) {
      console.error("[email] sendClaimRevokedEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendClaimRevokedEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
