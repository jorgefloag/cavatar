"use server"

import { and, count, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { messages, plateSenderAliases } from "@/lib/db/schema"
import { verifyAndRenewInboxSession, SESSION_EXPIRED_ERROR } from "@/lib/inbox/session"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"

// Etapa 5 — exactly what the owner needs to decide whether to silence or
// block a sender, nothing more. aliasId (plate_sender_aliases.id) is the
// only identifier the client ever sees for a sender — already an opaque
// UUID scoped to exactly this plate, never senderId/clerkUserId/email.
export interface PlateSenderRow {
  aliasId: string
  aliasCode: string
  messageCount: number
  muted: boolean
  blocked: boolean
}

export async function fetchPlateSenders(
  plateNumberInput: string,
): Promise<{ success: true; senders: PlateSenderRow[] } | { success: false; error: string }> {
  const plateNumber = normalizePlateNumber(plateNumberInput)
  const authorized = await verifyAndRenewInboxSession(plateNumber)
  if (!authorized) return { success: false, error: SESSION_EXPIRED_ERROR }

  const aliases = await db
    .select({
      id: plateSenderAliases.id,
      aliasCode: plateSenderAliases.aliasCode,
      senderId: plateSenderAliases.senderId,
      muted: plateSenderAliases.muted,
      blocked: plateSenderAliases.blocked,
    })
    .from(plateSenderAliases)
    .where(eq(plateSenderAliases.plateNumber, plateNumber))

  if (aliases.length === 0) return { success: true, senders: [] }

  // Convention (documented in CLAUDE.md): counts only non-deleted messages.
  // Archiving is an owner-only declutter action, never a signal about the
  // sender, so an archived message still counts — only a soft-deleted one
  // is excluded, same as every other "how many messages" surface in this
  // codebase (fetchMessages()'s default view, the admin CSV export, etc).
  const counts = await db
    .select({ senderId: messages.senderId, value: count() })
    .from(messages)
    .where(and(eq(messages.plateNumber, plateNumber), isNull(messages.deletedAt)))
    .groupBy(messages.senderId)
  const countBySender = new Map(counts.map((c) => [c.senderId, c.value]))

  const senders: PlateSenderRow[] = aliases.map((a) => ({
    aliasId: a.id,
    aliasCode: a.aliasCode,
    messageCount: countBySender.get(a.senderId) ?? 0,
    muted: a.muted,
    blocked: a.blocked,
  }))

  return { success: true, senders }
}

// Confirms aliasId actually belongs to THIS plate before any mutation —
// never trusts the client's claim alone. A tampered aliasId copied from a
// different plate must fail here, not silently touch a stranger's row.
async function authorizeAliasAction(plateNumberInput: string, aliasId: string): Promise<string | null> {
  const plateNumber = normalizePlateNumber(plateNumberInput)
  const authorized = await verifyAndRenewInboxSession(plateNumber)
  if (!authorized) return null

  const [alias] = await db
    .select({ id: plateSenderAliases.id })
    .from(plateSenderAliases)
    .where(and(eq(plateSenderAliases.id, aliasId), eq(plateSenderAliases.plateNumber, plateNumber)))
    .limit(1)
  if (!alias) return null

  return plateNumber
}

export async function muteSender(
  plateNumber: string,
  aliasId: string,
  muted: boolean,
): Promise<{ success: boolean; error?: string }> {
  const authorized = await authorizeAliasAction(plateNumber, aliasId)
  if (!authorized) return { success: false, error: SESSION_EXPIRED_ERROR }

  await db.update(plateSenderAliases).set({ muted }).where(eq(plateSenderAliases.id, aliasId))
  return { success: true }
}

export async function blockSender(
  plateNumber: string,
  aliasId: string,
  blocked: boolean,
): Promise<{ success: boolean; error?: string }> {
  const authorized = await authorizeAliasAction(plateNumber, aliasId)
  if (!authorized) return { success: false, error: SESSION_EXPIRED_ERROR }

  await db
    .update(plateSenderAliases)
    .set({ blocked, blockedAt: blocked ? new Date() : null })
    .where(eq(plateSenderAliases.id, aliasId))
  return { success: true }
}
