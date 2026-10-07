import { resend, EMAIL_FROM } from "./resend-client"

export async function sendNewMessageNotificationEmail({
  to,
  plateNumber,
  messageCount,
  reachedDailyCap = false,
}: {
  to: string
  plateNumber: string
  messageCount: number
  // True when this send is the one that reaches DAILY_NOTIFICATION_CAP for
  // the plate's current window — appends a line telling the owner to check
  // /inbox directly, since no further emails will go out until the window
  // resets (see lib/qstash/notification-window.ts).
  reachedDailyCap?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const inboxUrl = `${process.env.NEXT_PUBLIC_APP_URL}/inbox?plate=${plateNumber}`
  const plural = messageCount === 1 ? "" : "s"

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Tenés ${messageCount} mensaje${plural} nuevo${plural} en tu buzón — placa ${plateNumber}`,
      html: `
        <p>Tu placa <strong>${plateNumber}</strong> recibió ${messageCount} mensaje${plural} nuevo${plural}.</p>
        <p>Entrá a tu buzón para leerlo${plural}:</p>
        <p><a href="${inboxUrl}">Ver mi buzón</a></p>
        ${
          reachedDailyCap
            ? `<p>Alcanzaste el límite de avisos de hoy para esta placa. Si siguen llegando mensajes, no vas a recibir más correos hasta que pase la ventana de 24 horas — revisá tu buzón directamente acá: <a href="${inboxUrl}">Ver mi buzón</a></p>`
            : ""
        }
      `,
    })

    if (error) {
      console.error("[email] sendNewMessageNotificationEmail error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[email] sendNewMessageNotificationEmail exception:", error)
    return { success: false, error: "Error al enviar el correo." }
  }
}
