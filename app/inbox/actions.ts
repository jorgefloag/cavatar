"use server"

import crypto from "crypto"
import { and, eq, gt, isNull } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { claimRequests, messages, messageReports, plateSenderAliases, senders, verifiedRequests } from "@/lib/db/schema"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"
import { verifyClaimPassword } from "@/lib/claims/verify-claim-password"
import { issueInboxSession } from "@/lib/inbox/session"
import { formatDateCR } from "@/lib/dates/format-date"

// Etapa 5/7 — never the sender's own free-text "Nombre o alias" at face
// value: anyone can type "Remitente 1", "El dueño del carro", or a fake
// business name to try to impersonate. A verified sender (resolved
// server-side, live, by clerkUserId — never cached or client-supplied)
// always shows their real businessName + the "Verificado" badge instead,
// and the free-text alias is dropped entirely for them — their identity
// is server-verified truth, not a self-reported claim worth appending.
// Everyone else gets the Etapa 5 behavior unchanged: system-assigned
// "Remitente N" first, free text appended only as an explicitly labeled
// claim, never presented as the identity itself.
function resolveSenderDisplay(input: {
  aliasCode: string | null
  rawAlias: string | null
  isVerified: boolean
  businessName: string | null
}): { name: string; isVerified: boolean } {
  if (input.isVerified) {
    // Falls back to "Perfil verificado" (never the sender's email — the
    // buzón owner never sees emails, period) if businessName is blank,
    // e.g. an approved profile from before this field existed.
    return { name: input.businessName?.trim() || "Perfil verificado", isVerified: true }
  }
  // A pre-Etapa-2 message (no aliasCode, since it predates per-plate
  // aliasing) still gets the same "dice llamarse" treatment as a real
  // "Remitente N" would — "Remitente anterior" is just the base label in
  // place of a number, never a reason to drop whatever the sender actually
  // typed back then. Fixed here because the original version silently
  // discarded that free text for every historical message the moment this
  // ships, which would have been a real, user-visible regression for
  // existing plate owners (found during pre-push review, not caught by any
  // test up to that point — nothing exercised a historical message with a
  // real alias against the new display logic until then).
  const baseLabel = input.aliasCode ?? "Remitente anterior"
  const trimmed = input.rawAlias?.trim()
  return { name: trimmed ? `${baseLabel}, dice llamarse "${trimmed}"` : baseLabel, isVerified: false }
}

export interface MessageDTO {
  id: string
  alias: string
  isVerifiedSender: boolean
  mensaje: string
  contacto: string
  fecha: string
  plate_number: string
  isBroadcast: boolean
  isArchived: boolean
  // Computed server-side against the claim's own reviewedAt — never trust
  // a client-supplied date for this, it's what decides which messages land
  // in the collapsed "antes de tu reclamo" section.
  isPreClaim: boolean
  // True while a report on this message is still pending admin review —
  // collapses it behind "Mensaje reportado — Mostrar" instead of removing
  // it; the owner can still open or delete it.
  isReported: boolean
}

export type LookupResult =
  | { state: "no_claim" }
  | { state: "pending" }
  | { state: "awaiting_setup" }
  | { state: "enter_password" }

export async function lookupPlate(plateNumber: string): Promise<LookupResult> {
  const plate = normalizePlateNumber(plateNumber)

  const [claim] = await db.select().from(claimRequests).where(eq(claimRequests.plateNumber, plate)).limit(1)

  if (!claim) {
    return { state: "no_claim" }
  }

  if (claim.status === "pending") {
    return { state: "pending" }
  }

  if (claim.status === "approved") {
    return claim.passwordHash ? { state: "enter_password" } : { state: "awaiting_setup" }
  }

  return { state: "no_claim" }
}

export async function validateSetupToken(token: string): Promise<{ valid: boolean }> {
  if (!token.trim()) {
    return { valid: false }
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex")

  const [claim] = await db
    .select({ id: claimRequests.id })
    .from(claimRequests)
    .where(
      and(
        eq(claimRequests.setupTokenHash, tokenHash),
        gt(claimRequests.setupTokenExpiresAt, new Date()),
        isNull(claimRequests.passwordHash),
      ),
    )
    .limit(1)

  return { valid: !!claim }
}

export async function setupPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string; plateNumber?: string }> {
  if (newPassword.length < 6) {
    return { success: false, error: "La clave debe tener al menos 6 caracteres" }
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex")
  const passwordHash = await bcrypt.hash(newPassword, 10)

  const [result] = await db
    .update(claimRequests)
    .set({
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      setupTokenHash: null,
      setupTokenExpiresAt: null,
    })
    .where(
      and(
        eq(claimRequests.setupTokenHash, tokenHash),
        gt(claimRequests.setupTokenExpiresAt, new Date()),
        isNull(claimRequests.passwordHash),
      ),
    )
    .returning({ plateNumber: claimRequests.plateNumber })

  if (!result) {
    return { success: false, error: "Enlace inválido o expirado." }
  }

  return { success: true, plateNumber: result.plateNumber }
}

export async function verifyPlatePassword(
  plateNumber: string,
  password: string,
): Promise<{ success: boolean; locked?: boolean; messages?: MessageDTO[]; carName?: string | null }> {
  const plate = normalizePlateNumber(plateNumber)

  const result = await verifyClaimPassword(plate, password)
  if (!result.success) {
    return { success: false, locked: result.locked }
  }

  // Issued here so the owner doesn't have to re-enter the password for
  // every archive/delete/report action in this same visit — see
  // lib/inbox/session.ts.
  await issueInboxSession(plate)

  // Etapa 7 — joined live against senders/verifiedRequests by clerkUserId
  // (never by email, and never cached): an old message from a sender who
  // got verified AFTER sending it still shows the badge today, and one
  // from a sender who was later de-verified loses it immediately, since
  // this reflects current status on every render, not a snapshot of what
  // was true when the message arrived.
  const rows = await db
    .select({
      message: messages,
      aliasCode: plateSenderAliases.aliasCode,
      isVerified: verifiedRequests.id,
      businessName: verifiedRequests.businessName,
    })
    .from(messages)
    .leftJoin(
      plateSenderAliases,
      and(eq(plateSenderAliases.plateNumber, messages.plateNumber), eq(plateSenderAliases.senderId, messages.senderId)),
    )
    .leftJoin(senders, eq(senders.id, messages.senderId))
    .leftJoin(
      verifiedRequests,
      and(eq(verifiedRequests.clerkUserId, senders.clerkUserId), eq(verifiedRequests.status, "approved")),
    )
    .where(and(eq(messages.plateNumber, plate), isNull(messages.deletedAt)))
    .orderBy(messages.createdAt)

  const pendingReports = await db
    .select({ messageId: messageReports.messageId })
    .from(messageReports)
    .where(and(eq(messageReports.plateNumber, plate), eq(messageReports.status, "pending")))
  const reportedMessageIds = new Set(pendingReports.map((r) => r.messageId))

  const reviewedAt = result.claim.reviewedAt

  const formatted: MessageDTO[] = rows
    .slice()
    .reverse()
    .map(({ message: msg, aliasCode, isVerified, businessName }) => {
      const display = resolveSenderDisplay({
        aliasCode,
        rawAlias: msg.alias,
        isVerified: isVerified !== null,
        businessName,
      })
      return {
        id: msg.id,
        alias: display.name,
        isVerifiedSender: display.isVerified,
        mensaje: msg.message,
        contacto: msg.contact || "",
        fecha: formatDateCR(msg.createdAt, { day: "numeric", month: "short", year: "numeric" }),
        plate_number: msg.plateNumber,
        isBroadcast: msg.broadcastId !== null,
        isArchived: msg.archivedAt !== null,
        isPreClaim: reviewedAt ? msg.createdAt < reviewedAt : false,
        isReported: reportedMessageIds.has(msg.id),
      }
    })

  return { success: true, messages: formatted, carName: result.claim.carName }
}
