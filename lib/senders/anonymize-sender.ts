import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { senders, messageReports, messages } from "@/lib/db/schema"

export type AnonymizeSenderResult = { success: true } | { success: false; error: string }

// Ley 8968 right-to-erasure manual process (see CLAUDE.md's Admin panel
// section for the full procedure and its ordering requirement). No admin
// gate in here — same reasoning as blockSenderGlobally(): the caller
// (whatever admin action eventually wraps this) does requireAdminEmail(),
// this stays a plain, directly-testable function.
//
// Three things need to lose the sender's own PII, independently:
// - senders.email itself, rewritten to a stable, non-reversible
//   "eliminado-<id>" placeholder (detected by resolveSenderDisplayEmail()
//   so admin screens show "Remitente anonimizado" instead of this literal
//   string).
// - message_reports.reported_sender_email_snapshot for every report this
//   sender was ever the subject of. This is NOT just a display concern:
//   even though a report's live sender join would already resolve to the
//   same anonymized label via the rewritten senders.email above, the raw
//   snapshot text is itself stored PII and must not persist once erasure
//   happens, independent of what any UI currently derives from it.
// - messages.contact / messages.alias on every message this sender ever
//   sent, on any plate — free-text fields the sender filled in themselves,
//   which can hold a phone number, a different email, or their own name.
//   Cleared to null, not the message body itself (`messages.message`) or
//   message_reports.messagePreview — those are the content of the
//   exchange, not solely the sender's own account data, and erasing them
//   is a different, unaddressed question (not asked for here).
export async function anonymizeSender(senderId: string): Promise<AnonymizeSenderResult> {
  const [existing] = await db.select({ id: senders.id }).from(senders).where(eq(senders.id, senderId)).limit(1)
  if (!existing) return { success: false, error: "Remitente no encontrado." }

  await db
    .update(senders)
    .set({ email: `eliminado-${senderId}` })
    .where(eq(senders.id, senderId))

  await db
    .update(messageReports)
    .set({ reportedSenderEmailSnapshot: null })
    .where(eq(messageReports.reportedSenderId, senderId))

  await db
    .update(messages)
    .set({ contact: null, alias: null })
    .where(eq(messages.senderId, senderId))

  return { success: true }
}
