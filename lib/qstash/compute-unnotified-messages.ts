import { and, eq, gt, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, plateSenderAliases } from "@/lib/db/schema"

export interface UnnotifiedSplit {
  eligibleIds: string[]
  mutedSkipIds: string[]
}

// Extracted out of the webhook route so it's one real, importable piece of
// code shared by production and by a test harness — not duplicated logic
// that could silently drift apart. Left-joined against plate_sender_aliases
// so a muted sender's messages can be split out: a message with no
// senderId (pre-Etapa-2) or no alias row never matches the join, so `muted`
// reads as null/false for it, same as if it were never muted.
export async function computeUnnotifiedSplit(plateNumber: string, reviewedAt: Date | null): Promise<UnnotifiedSplit> {
  const rows = await db
    .select({ id: messages.id, muted: plateSenderAliases.muted })
    .from(messages)
    .leftJoin(
      plateSenderAliases,
      and(eq(plateSenderAliases.plateNumber, messages.plateNumber), eq(plateSenderAliases.senderId, messages.senderId)),
    )
    .where(
      and(
        eq(messages.plateNumber, plateNumber),
        isNull(messages.ownerNotifiedAt),
        isNull(messages.broadcastId),
        reviewedAt ? gt(messages.createdAt, reviewedAt) : undefined,
      ),
    )

  return {
    eligibleIds: rows.filter((r) => !r.muted).map((r) => r.id),
    mutedSkipIds: rows.filter((r) => r.muted).map((r) => r.id),
  }
}
