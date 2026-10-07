"use server"

import crypto from "crypto"
import { and, eq, gt, isNull } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { claimRequests, messages } from "@/lib/db/schema"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"
import { verifyClaimPassword } from "@/lib/claims/verify-claim-password"

export interface MessageDTO {
  id: string
  alias: string
  mensaje: string
  contacto: string
  fecha: string
  plate_number: string
  isBroadcast: boolean
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

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.plateNumber, plate))
    .orderBy(messages.createdAt)

  const formatted: MessageDTO[] = rows
    .slice()
    .reverse()
    .map((msg) => ({
      id: msg.id,
      alias: msg.alias || "Anónimo",
      mensaje: msg.message,
      contacto: msg.contact || "",
      fecha: new Date(msg.createdAt).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      plate_number: msg.plateNumber,
      isBroadcast: msg.broadcastId !== null,
    }))

  return { success: true, messages: formatted, carName: result.claim.carName }
}
