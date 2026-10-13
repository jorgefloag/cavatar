import crypto from "crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests } from "@/lib/db/schema"
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email"

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1h — shorter than the 48h setup-link
// window on purpose: a reset is a higher-stakes action on an account that
// already has a password, not a first-time setup.

// Mirrors lib/claims/issue-setup-token.ts's shape, but writes to the
// separate password_reset_token_hash/password_reset_token_expires_at pair
// — see lib/db/schema.ts for why these must never be the same columns as
// the setup token. Overwriting the hash here is what makes "requesting a
// new link invalidates the previous one" true, with no extra bookkeeping:
// the old hash simply stops matching anything once this UPDATE runs.
export async function issuePasswordResetToken({
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
    .set({ passwordResetTokenHash: tokenHash, passwordResetTokenExpiresAt: expiresAt })
    .where(eq(claimRequests.id, claimId))

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/inbox/reset-password?token=${token}`
  const result = await sendPasswordResetEmail({ to: email, plateNumber, resetUrl })

  if (!result.success) {
    return { success: true, warning: "No se pudo enviar el correo de restablecimiento." }
  }

  return { success: true }
}
