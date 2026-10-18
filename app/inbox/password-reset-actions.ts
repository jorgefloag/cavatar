"use server"

import crypto from "crypto"
import { and, eq, gt, isNotNull } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { after } from "next/server"
import { db } from "@/lib/db"
import { claimRequests, pushSubscriptions } from "@/lib/db/schema"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"
import { issuePasswordResetToken } from "@/lib/claims/issue-password-reset-token"
import { issueSetupToken } from "@/lib/claims/issue-setup-token"
import { isPasswordResetCapped, isPasswordResetWindowExpired } from "@/lib/claims/password-reset-window"
import { sendPasswordChangedEmail } from "@/lib/email/send-password-changed-email"
import { invalidateInboxSessions } from "@/lib/inbox/session"
import { MIN_PASSWORD_LENGTH } from "@/lib/claims/password-policy"

// Always the same response regardless of whether the plate exists, is
// pending, awaiting_setup, or approved-with-password — never give the
// caller anything to distinguish those cases on. The actual work (and its
// branching, and its timing) happens inside after(), entirely decoupled
// from this response.
export async function requestPasswordReset(plateNumber: string): Promise<{ success: true }> {
  after(() => processPasswordResetRequest(plateNumber))
  return { success: true }
}

async function processPasswordResetRequest(rawPlateNumber: string): Promise<void> {
  try {
    const plate = normalizePlateNumber(rawPlateNumber)
    const [claim] = await db.select().from(claimRequests).where(eq(claimRequests.plateNumber, plate)).limit(1)

    // Nothing to send for a plate with no claim, or one still pending
    // review — only an approved claim has an owner email worth trusting.
    if (!claim || claim.status !== "approved") return

    const now = new Date()
    if (
      isPasswordResetCapped({
        passwordResetWindowStartedAt: claim.passwordResetWindowStartedAt,
        passwordResetWindowCount: claim.passwordResetWindowCount,
        now,
      })
    ) {
      console.error(`[password-reset] rate limit reached for plate ${plate}, request dropped`)
      return
    }

    // Two different emails share this one limit, because both represent
    // the same thing worth rate-limiting: "we sent this plate's owner a
    // password-setting link today." A claim still awaiting_setup has never
    // had a password, so there's nothing to "reset" — just resend the
    // original setup link instead of minting a reset token that could
    // never pass resetPasswordWithToken()'s password_hash IS NOT NULL guard.
    const result = claim.passwordHash
      ? await issuePasswordResetToken({ claimId: claim.id, email: claim.email, plateNumber: plate })
      : await issueSetupToken({ claimId: claim.id, email: claim.email, plateNumber: plate })

    console.error(`[password-reset] request processed for plate ${plate}`, {
      hadPassword: Boolean(claim.passwordHash),
      emailSucceeded: result.success && !result.warning,
    })

    const windowExpired = isPasswordResetWindowExpired(claim.passwordResetWindowStartedAt, now)
    await db
      .update(claimRequests)
      .set({
        passwordResetWindowStartedAt: windowExpired ? now : claim.passwordResetWindowStartedAt,
        passwordResetWindowCount: windowExpired ? 1 : claim.passwordResetWindowCount + 1,
      })
      .where(eq(claimRequests.id, claim.id))
  } catch (error) {
    console.error("[password-reset] processPasswordResetRequest error:", error)
  }
}

export async function validatePasswordResetToken(token: string): Promise<{ valid: boolean }> {
  if (!token.trim()) {
    return { valid: false }
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex")

  const [claim] = await db
    .select({ id: claimRequests.id })
    .from(claimRequests)
    .where(
      and(
        eq(claimRequests.passwordResetTokenHash, tokenHash),
        gt(claimRequests.passwordResetTokenExpiresAt, new Date()),
        isNotNull(claimRequests.passwordHash),
      ),
    )
    .limit(1)

  return { valid: !!claim }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string; plateNumber?: string; warning?: string }> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` }
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex")
  const passwordHash = await bcrypt.hash(newPassword, 10)

  // The guard is the mirror image of setupPasswordWithToken()'s: a reset
  // token only works when a password ALREADY exists, so it can never be
  // used to set one for the first time — that stays exclusively the
  // setup-token flow's job (see lib/db/schema.ts for why these two guards
  // must never be merged).
  const [result] = await db
    .update(claimRequests)
    .set({
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    })
    .where(
      and(
        eq(claimRequests.passwordResetTokenHash, tokenHash),
        gt(claimRequests.passwordResetTokenExpiresAt, new Date()),
        isNotNull(claimRequests.passwordHash),
      ),
    )
    .returning({ plateNumber: claimRequests.plateNumber, email: claimRequests.email })

  if (!result) {
    return { success: false, error: "Enlace inválido o expirado." }
  }

  // A password reset is the natural moment to evict any device that might
  // be registered for push without the real owner's current knowledge —
  // same reasoning as revokeClaim() already applies on revocation. Cheap
  // for the legitimate owner (reactivate on their own phone), correctly
  // kicks out anything else.
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.plateNumber, result.plateNumber))
  // Same reasoning as the push eviction above — any inbox_sessions cookie
  // issued before this reset must stop working, in case it wasn't the real
  // owner who held it.
  await invalidateInboxSessions(result.plateNumber)

  const notified = await sendPasswordChangedEmail({ to: result.email, plateNumber: result.plateNumber })

  return {
    success: true,
    plateNumber: result.plateNumber,
    warning: notified.success ? undefined : "La clave se cambió, pero no pudimos enviar el correo de aviso.",
  }
}
