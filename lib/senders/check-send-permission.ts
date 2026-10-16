import { and, count, eq, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, verifiedRequests } from "@/lib/db/schema"
import type { SenderDTO } from "./get-or-create-sender"

const STANDARD_HOURLY_CAP = 3
const VERIFIED_HOURLY_CAP = 20

export const SEND_RATE_LIMIT_ERROR = "Alcanzaste el límite de mensajes por hora. Probá de nuevo más tarde."

export type SendPermissionResult =
  | { allowed: true; remainingThisHour: number; verified: boolean }
  | { allowed: false; reason: "blocked" }
  | { allowed: false; reason: "rate_limited" }

// Server-side replacement for /send's old localStorage-only limit, which
// had no real enforcement at all (clearing storage bypassed it entirely).
// Counts directly against `messages` rather than a maintained anchored
// window column like the email/push notification caps elsewhere in this
// codebase: those protect a shared third-party quota (Resend, QStash) and
// need an anchor to avoid a per-message COUNT at high volume; this is a
// much smaller per-sender cap on the same table it inserts into, so a
// plain indexed COUNT is simplest — a true sliding window, with none of
// the anchored pattern's own boundary-burst tradeoff.
//
// Known, accepted race: this counts, then the caller inserts, as two
// separate statements — neon-http has no interactive transactions to make
// that atomic. Two requests from the same sender arriving within the same
// instant could both read a count just under the cap and both insert,
// letting the real total overshoot by 1-2 messages. Documented in
// CLAUDE.md's Roadmap rather than solved here.
export async function checkSendPermission(sender: SenderDTO): Promise<SendPermissionResult> {
  if (sender.isBlocked) return { allowed: false, reason: "blocked" }

  const [verifiedRow] = await db
    .select()
    .from(verifiedRequests)
    .where(and(eq(verifiedRequests.userEmail, sender.email), eq(verifiedRequests.status, "approved")))
    .limit(1)
  const cap = verifiedRow ? VERIFIED_HOURLY_CAP : STANDARD_HOURLY_CAP

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const [{ value }] = await db
    .select({ value: count() })
    .from(messages)
    .where(and(eq(messages.senderId, sender.id), gt(messages.createdAt, oneHourAgo)))

  if (value >= cap) return { allowed: false, reason: "rate_limited" }

  // `verified` is exposed here (not just used internally for the cap)
  // specifically so the caller can skip Etapa 4's link/phone/email
  // restriction for verified senders without a second verifiedRequests
  // lookup — this query above already answers that question.
  return { allowed: true, remainingThisHour: cap - value - 1, verified: Boolean(verifiedRow) }
}
