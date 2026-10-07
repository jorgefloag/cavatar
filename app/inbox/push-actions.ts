"use server"

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { pushSubscriptions } from "@/lib/db/schema"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"
import { verifyClaimPassword } from "@/lib/claims/verify-claim-password"

// Counted per plate, not globally — an owner activating push for several
// plates on the same phone is expected and fine; this only bounds how many
// distinct devices a single plate can push to.
const MAX_DEVICES_PER_PLATE = 5

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function subscribeToPush(
  plateNumber: string,
  password: string,
  subscription: PushSubscriptionInput,
): Promise<{ success: boolean; error?: string; locked?: boolean }> {
  const plate = normalizePlateNumber(plateNumber)

  const result = await verifyClaimPassword(plate, password)
  if (!result.success) {
    return { success: false, locked: result.locked, error: result.locked ? "Demasiados intentos. Intenta más tarde." : "Contraseña incorrecta." }
  }

  try {
    const existing = await db
      .select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, createdAt: pushSubscriptions.createdAt })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.plateNumber, plate))

    const alreadyThisDevice = existing.find((row) => row.endpoint === subscription.endpoint)

    if (!alreadyThisDevice && existing.length >= MAX_DEVICES_PER_PLATE) {
      // Evict the oldest device for this plate to make room — no error
      // shown to the user, activation just quietly succeeds.
      const oldest = existing.reduce((a, b) => (a.createdAt < b.createdAt ? a : b))
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, oldest.id))
    }

    await db
      .insert(pushSubscriptions)
      .values({
        plateNumber: plate,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      })
      .onConflictDoUpdate({
        target: [pushSubscriptions.plateNumber, pushSubscriptions.endpoint],
        set: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      })

    return { success: true }
  } catch (error) {
    console.error("[push] subscribeToPush error:", error)
    return { success: false, error: "Error al activar los avisos. Intenta nuevamente." }
  }
}

export async function unsubscribeFromPush(plateNumber: string, endpoint: string): Promise<{ success: boolean }> {
  const plate = normalizePlateNumber(plateNumber)
  try {
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.plateNumber, plate), eq(pushSubscriptions.endpoint, endpoint)))
    return { success: true }
  } catch (error) {
    console.error("[push] unsubscribeFromPush error:", error)
    return { success: false }
  }
}

export async function getPushSubscriptionStatus(
  plateNumber: string,
  endpoint: string,
): Promise<{ active: boolean }> {
  const plate = normalizePlateNumber(plateNumber)
  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.plateNumber, plate), eq(pushSubscriptions.endpoint, endpoint)))
    .limit(1)
  return { active: Boolean(row) }
}

