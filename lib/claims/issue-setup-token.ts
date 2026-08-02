import crypto from "crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests } from "@/lib/db/schema"
import { sendSetupEmail } from "@/lib/email/send-setup-email"

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000

export async function issueSetupToken({
  claimId,
  email,
  plateNumber,
}: {
  claimId: string
  email: string
  plateNumber: string
}): Promise<{ success: boolean; warning?: string }> {
  const token = crypto.randomBytes(32).toString("base64url")
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  await db
    .update(claimRequests)
    .set({ setupTokenHash: tokenHash, setupTokenExpiresAt: expiresAt })
    .where(eq(claimRequests.id, claimId))

  const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/inbox/setup?token=${token}`
  const result = await sendSetupEmail({ to: email, plateNumber, setupUrl })

  if (!result.success) {
    return { success: true, warning: "El reclamo se actualizó, pero el correo no se pudo enviar. Usa 'Reenviar correo'." }
  }

  return { success: true }
}
