import { and, count, eq, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, plateSenderAliases } from "@/lib/db/schema"
import type { SenderDTO } from "./get-or-create-sender"
import { resolveVerifiedStatusByClerkUserId } from "./resolve-verified-status"

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
export async function checkSendPermission(sender: SenderDTO, plateNumber: string): Promise<SendPermissionResult> {
  if (sender.isBlocked) return { allowed: false, reason: "blocked" }

  // Etapa 5 — per-plate block (plate_sender_aliases.blocked), on top of the
  // global one above. A plain SELECT, not get-or-create-plate-alias()'s
  // insert-if-missing logic: a sender who's never written to this plate has
  // no row here yet (so nothing to block), and this check must never be
  // the thing that creates one — alias assignment only ever happens on the
  // success path, in submitMessage(), after this whole function returns
  // allowed. The caller can't tell this apart from the global block above —
  // deliberately, since the response to the sender is identical either way.
  const [plateAlias] = await db
    .select({ blocked: plateSenderAliases.blocked })
    .from(plateSenderAliases)
    .where(and(eq(plateSenderAliases.plateNumber, plateNumber), eq(plateSenderAliases.senderId, sender.id)))
    .limit(1)
  if (plateAlias?.blocked) return { allowed: false, reason: "blocked" }

  // Etapa 7 — resolved by clerkUserId, not email: a sender whose
  // senders.email differs from their verified_requests.userEmail (e.g. the
  // Clerk primary email changed after they applied) is still correctly
  // recognized, which the previous email-based match could silently miss.
  const verifiedStatus = await resolveVerifiedStatusByClerkUserId(sender.clerkUserId)
  const cap = verifiedStatus.verified ? VERIFIED_HOURLY_CAP : STANDARD_HOURLY_CAP

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const [{ value }] = await db
    .select({ value: count() })
    .from(messages)
    .where(and(eq(messages.senderId, sender.id), gt(messages.createdAt, oneHourAgo)))

  if (value >= cap) return { allowed: false, reason: "rate_limited" }

  // `verified` is exposed here (not just used internally for the cap)
  // specifically so the caller can skip Etapa 4's link/phone/email
  // restriction for verified senders without a second lookup — this call
  // above already answers that question.
  return { allowed: true, remainingThisHour: cap - value - 1, verified: verifiedStatus.verified }
}
