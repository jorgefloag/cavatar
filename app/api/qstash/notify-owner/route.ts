import { NextResponse } from "next/server"
import { and, eq, gt, inArray, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests, messages } from "@/lib/db/schema"
import { qstash, qstashReceiver, notifyOwnerWebhookUrl } from "@/lib/qstash/client"
import { sendNewMessageNotificationEmail } from "@/lib/email/send-new-message-notification-email"

// Must match the cooldown submitMessage()'s scheduling logic assumes when
// deciding whether a pending callback already covers a new message.
const COOLDOWN_MINUTES = 30

// QStash calls this ~5 minutes after the first un-notified message for a
// plate arrives (scheduled from app/send/actions.ts's submitMessage()).
// Like the Vercel Cron route, this is a deliberate app/api exception to
// this codebase's "everything is a Server Action" convention — QStash, like
// Vercel Cron, can only call a plain HTTP endpoint.
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("upstash-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 })
  }

  let verified = false
  try {
    verified = await qstashReceiver.verify({ signature, body })
  } catch (error) {
    console.error("[qstash/notify-owner] signature verification error:", error)
  }
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let plateNumber: string | undefined
  try {
    ;({ plateNumber } = JSON.parse(body) as { plateNumber?: string })
  } catch {
    // fall through, handled by the missing-plateNumber check below
  }
  if (!plateNumber) {
    return NextResponse.json({ error: "Missing plateNumber" }, { status: 400 })
  }

  const [claim] = await db.select().from(claimRequests).where(eq(claimRequests.plateNumber, plateNumber)).limit(1)

  if (!claim || claim.status !== "approved") {
    // Shouldn't normally happen — submitMessage() only schedules a callback
    // for approved claims — but the claim could have been revoked in the
    // 5 minutes since. Just clear the pending marker and stop.
    if (claim) {
      await db
        .update(claimRequests)
        .set({ notifyScheduledAt: null })
        .where(eq(claimRequests.plateNumber, plateNumber))
    }
    return NextResponse.json({ sent: false, reason: "not approved" })
  }

  const now = new Date()

  // Cooldown not yet elapsed: don't send, push the batch to whenever it
  // does elapse instead of dropping it — nothing is lost, just delayed.
  if (claim.lastNotifiedAt) {
    const elapsedMs = now.getTime() - claim.lastNotifiedAt.getTime()
    const cooldownMs = COOLDOWN_MINUTES * 60 * 1000
    if (elapsedMs < cooldownMs) {
      const retryInSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000)
      await qstash.publishJSON({
        url: notifyOwnerWebhookUrl(),
        body: { plateNumber },
        delay: retryInSeconds,
      })
      await db
        .update(claimRequests)
        .set({ notifyScheduledAt: now })
        .where(eq(claimRequests.plateNumber, plateNumber))
      return NextResponse.json({ sent: false, reason: "cooldown", retryInSeconds })
    }
  }

  // Only messages after approval count — otherwise approving an old claim
  // with a backlog of messages would trigger a "N new messages" notification
  // for messages the owner hasn't even been able to check yet. Never counts
  // broadcast messages — those are a deliberate one-to-many send already,
  // piling an individual email per recipient on top would multiply exactly
  // when quota matters most.
  const unnotified = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.plateNumber, plateNumber),
        isNull(messages.ownerNotifiedAt),
        isNull(messages.broadcastId),
        claim.reviewedAt ? gt(messages.createdAt, claim.reviewedAt) : undefined,
      ),
    )

  if (unnotified.length === 0) {
    await db
      .update(claimRequests)
      .set({ notifyScheduledAt: null })
      .where(eq(claimRequests.plateNumber, plateNumber))
    return NextResponse.json({ sent: false, reason: "nothing pending" })
  }

  const result = await sendNewMessageNotificationEmail({
    to: claim.email,
    plateNumber,
    messageCount: unnotified.length,
  })

  if (!result.success) {
    console.error("[qstash/notify-owner] send failed:", result.error)
    return NextResponse.json({ sent: false, error: result.error }, { status: 500 })
  }

  const ids = unnotified.map((m) => m.id)
  await db.update(messages).set({ ownerNotifiedAt: now }).where(inArray(messages.id, ids))
  await db
    .update(claimRequests)
    .set({ lastNotifiedAt: now, notifyScheduledAt: null })
    .where(eq(claimRequests.plateNumber, plateNumber))

  return NextResponse.json({ sent: true, count: unnotified.length })
}
