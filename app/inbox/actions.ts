"use server"

import crypto from "crypto"
import { and, eq, gt, isNull } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { claimRequests, messages, messageReports, plateSenderAliases } from "@/lib/db/schema"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"
import { verifyClaimPassword } from "@/lib/claims/verify-claim-password"
import { issueInboxSession } from "@/lib/inbox/session"
import { formatDateCR } from "@/lib/dates/format-date"

// Etapa 5 — never the sender's own free-text "Nombre o alias" at face
// value: anyone can type "Remitente 1" or "El dueño del carro" to try to
// impersonate. The system-assigned "Remitente N" always comes first; the
// free text, if any, is appended clearly labeled as a self-reported claim,
// never presented as if it were the identity itself.
function buildSenderLabel(aliasCode: string | null, rawAlias: string | null): string {
  if (!aliasCode) return "Remitente anterior"
  const trimmed = rawAlias?.trim()
  return trimmed ? `${aliasCode}, dice llamarse "${trimmed}"` : aliasCode
}

export interface MessageDTO {
  id: string
  alias: string
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

  const rows = await db
    .select({ message: messages, aliasCode: plateSenderAliases.aliasCode })
    .from(messages)
    .leftJoin(
      plateSenderAliases,
      and(eq(plateSenderAliases.plateNumber, messages.plateNumber), eq(plateSenderAliases.senderId, messages.senderId)),
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
    .map(({ message: msg, aliasCode }) => ({
      id: msg.id,
      alias: buildSenderLabel(aliasCode, msg.alias),
      mensaje: msg.message,
      contacto: msg.contact || "",
      fecha: formatDateCR(msg.createdAt, { day: "numeric", month: "short", year: "numeric" }),
      plate_number: msg.plateNumber,
      isBroadcast: msg.broadcastId !== null,
      isArchived: msg.archivedAt !== null,
      isPreClaim: reviewedAt ? msg.createdAt < reviewedAt : false,
      isReported: reportedMessageIds.has(msg.id),
    }))

  return { success: true, messages: formatted, carName: result.claim.carName }
}
