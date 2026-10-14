import crypto from "crypto"
import { and, eq, gt } from "drizzle-orm"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { inboxSessions } from "@/lib/db/schema"

const COOKIE_NAME = "cavatar_inbox_session"
const SESSION_TTL_MS = 30 * 60 * 1000

// Shown for every failure mode (no cookie, expired, wrong plate, or the
// message itself not found) — deliberately not distinguished, so none of
// those cases can be told apart from the outside.
export const SESSION_EXPIRED_ERROR = "Tu sesión venció, volvé a ingresar tu clave."

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  }
}

// Called by verifyPlatePassword() on a successful password check. One
// cookie, overwritten each time a buzón is unlocked in this browser — a
// second plate unlocked in the same browser silently supersedes the first
// plate's session (a known, accepted limitation, not solved here).
export async function issueInboxSession(plateNumber: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url")
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.insert(inboxSessions).values({ plateNumber, tokenHash, expiresAt })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, cookieOptions(SESSION_TTL_MS))
}

// Verifies the session cookie belongs to exactly this plate, and — on
// success — renews it another 30 minutes (both the DB row and the cookie's
// own maxAge, so the browser doesn't drop it out from under a renewed
// server-side row). Returns false for every failure mode without saying
// which one; callers should surface SESSION_EXPIRED_ERROR verbatim.
export async function verifyAndRenewInboxSession(plateNumber: string): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return false

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const now = new Date()

  const [session] = await db
    .select()
    .from(inboxSessions)
    .where(and(eq(inboxSessions.tokenHash, tokenHash), gt(inboxSessions.expiresAt, now)))
    .limit(1)

  if (!session || session.plateNumber !== plateNumber) return false

  const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.update(inboxSessions).set({ expiresAt: newExpiresAt }).where(eq(inboxSessions.id, session.id))
  cookieStore.set(COOKIE_NAME, token, cookieOptions(SESSION_TTL_MS))

  return true
}

// Invoked wherever a plate's credentials change out from under any session
// that might be active for it (password reset, claim revocation) — same
// reasoning as those flows already deleting push_subscriptions.
export async function invalidateInboxSessions(plateNumber: string): Promise<void> {
  await db.delete(inboxSessions).where(eq(inboxSessions.plateNumber, plateNumber))
}
