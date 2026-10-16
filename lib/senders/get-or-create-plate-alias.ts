import { and, count, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { plateSenderAliases } from "@/lib/db/schema"

export interface PlateSenderAliasDTO {
  id: string
  aliasCode: string
  muted: boolean
  blocked: boolean
}

function toDTO(row: typeof plateSenderAliases.$inferSelect): PlateSenderAliasDTO {
  return { id: row.id, aliasCode: row.aliasCode, muted: row.muted, blocked: row.blocked }
}

const MAX_ALIAS_CODE_ATTEMPTS = 5

// Looks up (or creates) the sequential "Remitente N" alias for a
// (plateNumber, senderId) pair — called only on submitMessage()'s success
// path, never for a rejected attempt, so a sender who never actually gets a
// message through never consumes a number. Only called after
// checkSendPermission() has already confirmed this sender isn't blocked
// (globally or on this plate), so the row returned here is never blocked at
// the moment it's created.
//
// Never throws: by the time this runs, the message itself is already
// committed to `messages` (see submitMessage()) — a failure here must
// never surface as an error to a sender whose message in fact went
// through. If every retry is exhausted, this logs and returns null; the
// message keeps its real senderId regardless, so a later display lookup
// (plateNumber, senderId) just won't find an alias row — same fallback as
// a pre-Etapa-2 message with no senderId at all ("Remitente anterior").
export async function getOrCreatePlateAlias(plateNumber: string, senderId: string): Promise<PlateSenderAliasDTO | null> {
  const [existing] = await db
    .select()
    .from(plateSenderAliases)
    .where(and(eq(plateSenderAliases.plateNumber, plateNumber), eq(plateSenderAliases.senderId, senderId)))
    .limit(1)
  if (existing) return toDTO(existing)

  // Two unique constraints can each cause a conflict here, handled two
  // different ways because neon-http has no interactive transactions to
  // make "check count, then insert" atomic otherwise:
  // - (plateNumber, senderId): this exact sender racing with themselves
  //   (e.g. a double-submit) — absorbed by onConflictDoNothing below, then
  //   picked up by a re-select, same pattern as getOrCreateSender().
  // - (plateNumber, aliasCode): a DIFFERENT sender's first message to this
  //   same plate winning the same sequential number at nearly the same
  //   instant — onConflictDoNothing only targets the first constraint, so
  //   this one surfaces as a thrown error, caught below and retried with a
  //   freshly recomputed count. Any exception reaching that catch block can
  //   only be this collision, since the other one is already handled by the
  //   statement's own ON CONFLICT clause.
  for (let attempt = 0; attempt < MAX_ALIAS_CODE_ATTEMPTS; attempt++) {
    const [{ value: currentCount }] = await db
      .select({ value: count() })
      .from(plateSenderAliases)
      .where(eq(plateSenderAliases.plateNumber, plateNumber))
    const aliasCode = `Remitente ${currentCount + 1}`

    try {
      const [inserted] = await db
        .insert(plateSenderAliases)
        .values({ plateNumber, senderId, aliasCode })
        .onConflictDoNothing({ target: [plateSenderAliases.plateNumber, plateSenderAliases.senderId] })
        .returning()
      if (inserted) return toDTO(inserted)

      const [afterConflict] = await db
        .select()
        .from(plateSenderAliases)
        .where(and(eq(plateSenderAliases.plateNumber, plateNumber), eq(plateSenderAliases.senderId, senderId)))
        .limit(1)
      if (afterConflict) return toDTO(afterConflict)
      // Row still not found despite no error and no conflict — extremely
      // unlikely, let the loop retry rather than erroring outright.
    } catch (error) {
      if (attempt === MAX_ALIAS_CODE_ATTEMPTS - 1) {
        console.error(`[senders] getOrCreatePlateAlias exhausted ${MAX_ALIAS_CODE_ATTEMPTS} attempts for plate ${plateNumber}:`, error)
        return null
      }
      continue
    }
  }

  return null
}
