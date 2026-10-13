import { resend, EMAIL_FROM } from "./resend-client"

export async function sendPasswordResetEmail({
  to,
  plateNumber,
  resetUrl,
}: {
  to: string
  plateNumber: string
  resetUrl: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Restablecé tu clave de acceso — placa ${plateNumber}`,
      html: `
        <p>Alguien (con suerte vos) solicitó restablecer la clave de acceso al buzón de la placa <strong>${plateNumber}</strong>.</p>
        <p>Si fuiste vos, entrá a este enlace para definir una nueva clave (válido por 1 hora, un solo uso):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Si no solicitaste esto, podés ignorar este correo — tu clave actual sigue siendo válida.</p>
      `,
    })

    if (error) {
      console.error("[email] sendPasswordResetEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendPasswordResetEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
