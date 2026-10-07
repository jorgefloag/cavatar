import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests } from "@/lib/db/schema"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"

const MAX_FAILED_ATTEMPTS = 5
const BLOCK_DURATION_MS = 5 * 60 * 1000

export type VerifyClaimPasswordResult =
  | { success: true; claim: typeof claimRequests.$inferSelect }
  | { success: false; locked?: boolean }

// Shared by app/inbox/actions.ts's verifyPlatePassword() (unlocking the
// buzón) and app/inbox/push-actions.ts (activating push on a device) — both
// need the exact same password check against the exact same brute-force
// lockout counters (failed_attempts/locked_until), so this lives in one
// place rather than two copies that could drift.
export async function verifyClaimPassword(
  plateNumber: string,
  password: string,
): Promise<VerifyClaimPasswordResult> {
  const plate = normalizePlateNumber(plateNumber)

  const [claim] = await db.select().from(claimRequests).where(eq(claimRequests.plateNumber, plate)).limit(1)

  if (!claim || !claim.passwordHash) {
    return { success: false }
  }

  if (claim.lockedUntil && claim.lockedUntil.getTime() > Date.now()) {
    return { success: false, locked: true }
  }

  const passwordMatch = await bcrypt.compare(password, claim.passwordHash)

  if (!passwordMatch) {
    const newFailedAttempts = claim.failedAttempts + 1
    const lockedUntil = newFailedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + BLOCK_DURATION_MS) : null

    await db
      .update(claimRequests)
      .set({ failedAttempts: lockedUntil ? 0 : newFailedAttempts, lockedUntil })
      .where(eq(claimRequests.plateNumber, plate))

    return { success: false, locked: Boolean(lockedUntil) }
  }

  await db.update(claimRequests).set({ failedAttempts: 0, lockedUntil: null }).where(eq(claimRequests.plateNumber, plate))

  return { success: true, claim }
}
