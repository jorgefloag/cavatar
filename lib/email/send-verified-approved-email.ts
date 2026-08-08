import { resend, EMAIL_FROM } from "./resend-client"

export async function sendVerifiedApprovedEmail({
  to,
}: {
  to: string
}): Promise<{ success: boolean; error?: string }> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verified/login`

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Tu perfil verificado fue aprobado",
      html: `
        <p>Tu solicitud de perfil verificado en CAVATAR fue aprobada.</p>
        <p>Ya puedes iniciar sesión y enviar mensajes sin el límite de envíos anónimos:</p>
        <p><a href="${loginUrl}">${loginUrl}</a></p>
      `,
    })

    if (error) {
      console.error("[email] sendVerifiedApprovedEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendVerifiedApprovedEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
