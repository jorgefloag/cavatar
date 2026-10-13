import { resend, EMAIL_FROM } from "./resend-client"

// Sent right after a successful password reset completes — a security
// notice, not an action link. If this lands in an inbox the real owner
// didn't expect, it's the only signal they get that something changed.
export async function sendPasswordChangedEmail({
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
      subject: `Tu clave de acceso fue cambiada — placa ${plateNumber}`,
      html: `
        <p>La clave de acceso al buzón de la placa <strong>${plateNumber}</strong> fue cambiada recién.</p>
        <p>Si no fuiste vos, escribinos de inmediato a <a href="mailto:admin@cavatarcr.com">admin@cavatarcr.com</a>.</p>
      `,
    })

    if (error) {
      console.error("[email] sendPasswordChangedEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendPasswordChangedEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
