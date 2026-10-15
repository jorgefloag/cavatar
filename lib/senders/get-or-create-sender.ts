import { eq } from "drizzle-orm"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { senders } from "@/lib/db/schema"

export interface SenderDTO {
  id: string
  clerkUserId: string
  email: string
  isBlocked: boolean
}

function toDTO(row: typeof senders.$inferSelect): SenderDTO {
  return { id: row.id, clerkUserId: row.clerkUserId, email: row.email, isBlocked: row.isBlocked }
}

// Looks up (or creates) the senders row for the currently authenticated
// Clerk user — never trusts a client-supplied identity, same reasoning as
// getCurrentUserEmail(). Returns null if there's no active Clerk session or
// Clerk hasn't given us a primary email yet.
export async function getOrCreateSender(): Promise<SenderDTO | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress
  if (!email) return null

  const [existing] = await db.select().from(senders).where(eq(senders.clerkUserId, userId)).limit(1)
  if (existing) {
    // Keep the denormalized copy fresh if the Clerk user's primary email
    // changed since we last saw them.
    if (existing.email !== email) {
      await db.update(senders).set({ email }).where(eq(senders.id, existing.id))
      return toDTO({ ...existing, email })
    }
    return toDTO(existing)
  }

  // Two near-simultaneous first-time calls for the same new Clerk user
  // could both reach here before either commits — onConflictDoNothing()
  // plus a re-select is the safe pattern without neon-http's interactive
  // transactions: whichever insert wins, the loser's re-select picks up the
  // winner's row instead of erroring or creating a duplicate.
  const [inserted] = await db
    .insert(senders)
    .values({ clerkUserId: userId, email })
    .onConflictDoNothing({ target: senders.clerkUserId })
    .returning()

  if (inserted) return toDTO(inserted)

  const [afterConflict] = await db.select().from(senders).where(eq(senders.clerkUserId, userId)).limit(1)
  return afterConflict ? toDTO(afterConflict) : null
}
