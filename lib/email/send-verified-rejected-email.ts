import { resend, EMAIL_FROM } from "./resend-client"

export async function sendVerifiedRejectedEmail({
  to,
}: {
  to: string
}): Promise<{ success: boolean; error?: string }> {
  const requestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verified/request`

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Tu solicitud de perfil verificado fue rechazada",
      html: `
        <p>Tu solicitud de perfil verificado en CAVATAR fue rechazada.</p>
        <p>Si crees que esto es un error o quieres enviarla de nuevo con información adicional, puedes volver a intentarlo aquí:</p>
        <p><a href="${requestUrl}">${requestUrl}</a></p>
      `,
    })

    if (error) {
      console.error("[email] sendVerifiedRejectedEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendVerifiedRejectedEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
