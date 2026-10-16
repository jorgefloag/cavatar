import { and, eq, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { verifiedRequests } from "@/lib/db/schema"

export interface VerifiedRequestInput {
  fullName: string
  phone: string
  useCase: string
  businessName: string
}

export type ApplyVerifiedRequestResult = { success: true } | { success: false; error: string }

// Etapa 7 review note: no auth()/Clerk call in here — the Server Action
// wrapping this (app/verified/request/actions.ts) resolves clerkUserId and
// email, validates the form with zod, and calls this with the results.
// Keeping this a plain function means it can be exercised with real code
// via a test harness without needing a live Clerk session at all.
export async function applyVerifiedRequest(
  clerkUserId: string,
  email: string,
  data: VerifiedRequestInput,
): Promise<ApplyVerifiedRequestResult> {
  // An already-approved profile can't resubmit its way back to "pending"
  // or change its own businessName; only the admin can touch businessName
  // once approved (see lib/senders/set-business-name.ts). Checked by
  // clerkUserId OR email so a pre-Etapa-7 row (still only linked by
  // email) is caught too, not just ones already carrying a clerkUserId.
  const [alreadyApproved] = await db
    .select({ id: verifiedRequests.id })
    .from(verifiedRequests)
    .where(
      and(
        eq(verifiedRequests.status, "approved"),
        or(eq(verifiedRequests.clerkUserId, clerkUserId), eq(verifiedRequests.userEmail, email)),
      ),
    )
    .limit(1)
  if (alreadyApproved) {
    return { success: false, error: "Tu perfil ya está verificado." }
  }

  // Prefer matching by clerkUserId over email: if this person's Clerk
  // primary email changed since an earlier submission, the old row is
  // still found this way (and its email updated in place) instead of a
  // naive insert colliding with that row's own clerkUserId unique
  // constraint. businessName IS set here, on every pending/rejected
  // submission (approved already returned above) — the "admin-only past
  // approval" rule is entirely enforced by the guard above, not by
  // omitting it from these writes.
  const [existingByClerkId] = await db
    .select({ id: verifiedRequests.id })
    .from(verifiedRequests)
    .where(eq(verifiedRequests.clerkUserId, clerkUserId))
    .limit(1)

  if (existingByClerkId) {
    await db
      .update(verifiedRequests)
      .set({
        userEmail: email,
        fullName: data.fullName,
        phone: data.phone,
        useCase: data.useCase,
        businessName: data.businessName,
        status: "pending",
      })
      .where(eq(verifiedRequests.id, existingByClerkId.id))
  } else {
    await db
      .insert(verifiedRequests)
      .values({
        userEmail: email,
        clerkUserId,
        fullName: data.fullName,
        phone: data.phone,
        useCase: data.useCase,
        businessName: data.businessName,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: verifiedRequests.userEmail,
        set: {
          clerkUserId,
          fullName: data.fullName,
          phone: data.phone,
          useCase: data.useCase,
          businessName: data.businessName,
          status: "pending",
        },
      })
  }

  return { success: true }
}
