"use server"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, messageReports } from "@/lib/db/schema"
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
  const [message] = await db
    .select({ id: messages.id, plateNumber: messages.plateNumber, message: messages.message })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!message) return { success: false, error: SESSION_EXPIRED_ERROR }
  const authorized = await verifyAndRenewInboxSession(message.plateNumber)
  if (!authorized) return { success: false, error: SESSION_EXPIRED_ERROR }

  await db.insert(messageReports).values({
    plateNumber: message.plateNumber,
    messageId: message.id,
    messagePreview: message.message,
    reason: reason?.trim() || null,
    status: "pending",
  })
  return { success: true }
}
