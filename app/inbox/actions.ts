"use server"

import crypto from "crypto"
import { and, eq, gt, isNull } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { claimRequests, messages } from "@/lib/db/schema"

const MAX_FAILED_ATTEMPTS = 5
const BLOCK_DURATION_MS = 5 * 60 * 1000

export interface MessageDTO {
  id: string
  alias: string
  mensaje: string
  contacto: string
  fecha: string
  plate_number: string
}

export type LookupResult =
  | { state: "no_claim" }
  | { state: "pending" }
  | { state: "awaiting_setup" }
  | { state: "enter_password" }

export async function lookupPlate(plateNumber: string): Promise<LookupResult> {
  const plate = plateNumber.trim().toUpperCase()

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
): Promise<{ success: boolean; locked?: boolean; messages?: MessageDTO[] }> {
  const plate = plateNumber.trim().toUpperCase()

  const [claim] = await db.select().from(claimRequests).where(eq(claimRequests.plateNumber, plate)).limit(1)

  if (!claim || !claim.passwordHash) {
    return { success: false }
  }

  if (claim.lockedUntil && claim.lockedUntil.getTime() > Date.now()) {
    return { success: false, locked: true }
  }

  const passwordMatch = await bcrypt.compare(password, claim.passwordHash)

  if (!passwordMatch) {
    const newFailedAttempts = claim.failedAttempts + 1
    const lockedUntil = newFailedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + BLOCK_DURATION_MS) : null

    await db
      .update(claimRequests)
      .set({ failedAttempts: lockedUntil ? 0 : newFailedAttempts, lockedUntil })
      .where(eq(claimRequests.plateNumber, plate))

    return { success: false, locked: Boolean(lockedUntil) }
  }

  await db
    .update(claimRequests)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(claimRequests.plateNumber, plate))

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
    }))

  return { success: true, messages: formatted }
}
