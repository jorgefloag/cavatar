import { resend, EMAIL_FROM } from "./resend-client"

export async function sendVerifiedRevokedEmail({
  to,
}: {
  to: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Tu perfil verificado fue revocado",
      html: `
        <p>Un administrador revocó tu perfil verificado en CAVATAR.</p>
        <p>Tus envíos volverán a estar sujetos al límite de mensajes anónimos.</p>
      `,
    })

    if (error) {
      console.error("[email] sendVerifiedRevokedEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendVerifiedRevokedEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
