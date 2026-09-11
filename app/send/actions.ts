"use server"

import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { claimRequests, messages, verifiedRequests } from "@/lib/db/schema"
import { getCurrentUserEmail } from "@/lib/auth/current-email"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"
import { qstash, notifyOwnerWebhookUrl } from "@/lib/qstash/client"

const messageSchema = z.object({
  plateNumber: z.string().trim().min(1).max(20).transform(normalizePlateNumber),
  name: z.string().trim().max(100).optional(),
  message: z.string().trim().min(1).max(300),
  contact: z.string().trim().max(200).optional(),
})

const BATCH_DELAY_SECONDS = 5 * 60
// If a scheduled callback never fired (QStash outage, misconfiguration),
// don't let a stuck notifyScheduledAt block this plate from ever getting
// notified again — treat a schedule older than this as abandoned.
const STALE_SCHEDULE_MINUTES = 15

export async function submitMessage(
  input: z.infer<typeof messageSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = messageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos." }
  }

  try {
    await db.insert(messages).values({
      plateNumber: parsed.data.plateNumber,
      alias: parsed.data.name || null,
      message: parsed.data.message,
      contact: parsed.data.contact || null,
    })

    // Awaited so it actually completes before this serverless invocation
    // can be torn down, but its failure never blocks the response — the
    // message itself is already saved either way.
    await scheduleOwnerNotificationIfNeeded(parsed.data.plateNumber)

    return { success: true }
  } catch (error) {
    console.error("[send] submitMessage error:", error)
    return { success: false, error: "Error al enviar mensaje. Intenta nuevamente." }
  }
}

async function scheduleOwnerNotificationIfNeeded(plateNumber: string): Promise<void> {
  try {
    const [claim] = await db.select().from(claimRequests).where(eq(claimRequests.plateNumber, plateNumber)).limit(1)
    if (!claim || claim.status !== "approved") return

    const staleThreshold = new Date(Date.now() - STALE_SCHEDULE_MINUTES * 60 * 1000)
    if (claim.notifyScheduledAt && claim.notifyScheduledAt > staleThreshold) {
      // A callback is already pending for this plate — this message will
      // simply be picked up when it fires, no need to schedule another.
      return
    }

    await qstash.publishJSON({
      url: notifyOwnerWebhookUrl(),
      body: { plateNumber },
      delay: BATCH_DELAY_SECONDS,
    })

    await db
      .update(claimRequests)
      .set({ notifyScheduledAt: new Date() })
      .where(eq(claimRequests.plateNumber, plateNumber))
  } catch (error) {
    console.error("[send] scheduleOwnerNotificationIfNeeded error:", error)
  }
}

export async function checkVerifiedStatus(): Promise<{ verified: boolean; email: string | null }> {
  const email = await getCurrentUserEmail()
  if (!email) {
    return { verified: false, email: null }
  }

  const [row] = await db
    .select()
    .from(verifiedRequests)
    .where(and(eq(verifiedRequests.userEmail, email), eq(verifiedRequests.status, "approved")))
    .limit(1)

  return { verified: Boolean(row), email }
}
