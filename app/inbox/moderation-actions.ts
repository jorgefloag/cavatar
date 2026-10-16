"use server"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, messageReports, senders } from "@/lib/db/schema"
import { verifyAndRenewInboxSession, SESSION_EXPIRED_ERROR } from "@/lib/inbox/session"

// Every one of these returns the same SESSION_EXPIRED_ERROR for every
// failure mode (no cookie, expired, wrong plate, or the message not
// existing at all) — never distinguished, so none of those cases can be
// told apart from the outside.
type ModerationResult = { success: boolean; error?: string }

async function authorizeMessageAction(messageId: string): Promise<{ plateNumber: string } | null> {
  const [message] = await db
    .select({ id: messages.id, plateNumber: messages.plateNumber })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!message) return null
  const authorized = await verifyAndRenewInboxSession(message.plateNumber)
  if (!authorized) return null
  return { plateNumber: message.plateNumber }
}

export async function archiveMessage(messageId: string): Promise<ModerationResult> {
  const authorized = await authorizeMessageAction(messageId)
  if (!authorized) return { success: false, error: SESSION_EXPIRED_ERROR }

  await db.update(messages).set({ archivedAt: new Date() }).where(eq(messages.id, messageId))
  return { success: true }
}

export async function deleteMessage(messageId: string): Promise<ModerationResult> {
  const authorized = await authorizeMessageAction(messageId)
  if (!authorized) return { success: false, error: SESSION_EXPIRED_ERROR }

  await db
    .update(messages)
    .set({ deletedAt: new Date(), deletedBy: "owner" })
    .where(eq(messages.id, messageId))
  return { success: true }
}

export async function reportMessage(messageId: string, reason?: string): Promise<ModerationResult> {
  // Etapa 6 — snapshots the sender's email at report time, same reasoning
  // as messagePreview: a permanent copy so the report stays reviewable
  // (now who it was from, not just what it said) even after the sender
  // row is later anonymized or the message itself purged. Left-joined so a
  // message with no senderId (pre-Etapa-2) just yields a null sender here,
  // same as everywhere else that treats a missing senderId as the
  // "Remitente anterior" case.
  const [row] = await db
    .select({
      id: messages.id,
      plateNumber: messages.plateNumber,
      message: messages.message,
      senderId: messages.senderId,
      senderEmail: senders.email,
    })
    .from(messages)
    .leftJoin(senders, eq(senders.id, messages.senderId))
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!row) return { success: false, error: SESSION_EXPIRED_ERROR }
  const authorized = await verifyAndRenewInboxSession(row.plateNumber)
  if (!authorized) return { success: false, error: SESSION_EXPIRED_ERROR }

  await db.insert(messageReports).values({
    plateNumber: row.plateNumber,
    messageId: row.id,
    messagePreview: row.message,
    reason: reason?.trim() || null,
    status: "pending",
    reportedSenderId: row.senderId,
    reportedSenderEmailSnapshot: row.senderEmail,
  })
  return { success: true }
}
