import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { verifiedRequests } from "@/lib/db/schema"

export interface VerifiedStatus {
  verified: boolean
  businessName: string | null
}

const NOT_VERIFIED: VerifiedStatus = { verified: false, businessName: null }

// Etapa 7 — the single place that answers "is this Clerk identity a
// verified profile?", resolved by clerkUserId (the real, immutable
// identity), never by email. Shared by checkSendPermission() (the 3/20
// hourly cap), checkVerifiedStatus() (the /send status badge), and the
// buzón's own display (app/inbox/actions.ts) — one source of truth so the
// three can't drift into disagreeing about who's verified.
export async function resolveVerifiedStatusByClerkUserId(clerkUserId: string | null): Promise<VerifiedStatus> {
  if (!clerkUserId) return NOT_VERIFIED

  const [row] = await db
    .select({ businessName: verifiedRequests.businessName })
    .from(verifiedRequests)
    .where(and(eq(verifiedRequests.clerkUserId, clerkUserId), eq(verifiedRequests.status, "approved")))
    .limit(1)

  return row ? { verified: true, businessName: row.businessName } : NOT_VERIFIED
}
