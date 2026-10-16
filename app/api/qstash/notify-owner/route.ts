import { NextResponse } from "next/server"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests, messages } from "@/lib/db/schema"
import { qstash, qstashReceiver, notifyOwnerWebhookUrl, qstashPublishHeaders } from "@/lib/qstash/client"
import { sendNewMessageNotificationEmail } from "@/lib/email/send-new-message-notification-email"
import { DAILY_NOTIFICATION_CAP, isNotificationCapped, isWindowExpired } from "@/lib/qstash/notification-window"
import { computeUnnotifiedSplit } from "@/lib/qstash/compute-unnotified-messages"

// Must match the cooldown submitMessage()'s scheduling logic assumes when
// deciding whether a pending callback already covers a new message.
const COOLDOWN_MINUTES = 5

// QStash calls this ~1 minute after the first un-notified message for a
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
    // minute since. Just clear the pending marker and stop.
    if (claim) {
      await db
        .update(claimRequests)
        .set({ notifyScheduledAt: null })
        .where(eq(claimRequests.plateNumber, plateNumber))
    }
    return NextResponse.json({ sent: false, reason: "not approved" })
  }

  const now = new Date()

  // Only messages after approval count — otherwise approving an old claim
  // with a backlog of messages would trigger a "N new messages" notification
  // for messages the owner hasn't even been able to check yet. Never counts
  // broadcast messages — those are a deliberate one-to-many send already,
  // piling an individual email per recipient on top would multiply exactly
  // when quota matters most.
  const { eligibleIds, mutedSkipIds } = await computeUnnotifiedSplit(plateNumber, claim.reviewedAt)

  // Muted senders' messages are never mentioned in the email, but they ARE
  // retired from future consideration right here, unconditionally, before
  // any of the three early-return branches below (daily cap, cooldown,
  // nothing eligible) — not only in the "sent" path. Without this, un-muting
  // later would make an old message that was skipped under a daily cap or
  // cooldown suddenly look "unnotified" again (since nothing had stamped
  // it yet) and surface in some future, unrelated notification run as if it
  // were new — exactly the retroactive trigger this is meant to prevent,
  // regardless of which branch happened to run when it was first seen.
  if (mutedSkipIds.length > 0) {
    await db.update(messages).set({ ownerNotifiedAt: now }).where(inArray(messages.id, mutedSkipIds))
  }

  // Second line of defense (first is the check in submitMessage() itself,
  // which stops scheduling new callbacks for a capped plate in the first
  // place — see lib/qstash/notification-window.ts for why both exist). A
  // callback that was already in flight when the cap was reached can still
  // land here, so this must independently refuse to send.
  if (
    isNotificationCapped({
      notifyWindowStartedAt: claim.notifyWindowStartedAt,
      notifyWindowCount: claim.notifyWindowCount,
      now,
    })
  ) {
    await db
      .update(claimRequests)
      .set({ notifyScheduledAt: null })
      .where(eq(claimRequests.plateNumber, plateNumber))
    return NextResponse.json({ sent: false, reason: "daily cap reached" })
  }

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
        headers: qstashPublishHeaders(),
      })
      await db
        .update(claimRequests)
        .set({ notifyScheduledAt: now })
        .where(eq(claimRequests.plateNumber, plateNumber))
      return NextResponse.json({ sent: false, reason: "cooldown", retryInSeconds })
    }
  }

  if (eligibleIds.length === 0) {
    await db
      .update(claimRequests)
      .set({ notifyScheduledAt: null })
      .where(eq(claimRequests.plateNumber, plateNumber))
    return NextResponse.json({ sent: false, reason: "nothing pending" })
  }

  // Roll the window forward: start a fresh one (count 1) if the previous
  // one expired or never existed, otherwise keep its anchor and increment.
  const windowStartedAt = isWindowExpired(claim.notifyWindowStartedAt, now) ? now : claim.notifyWindowStartedAt!
  const windowCount = isWindowExpired(claim.notifyWindowStartedAt, now) ? 1 : claim.notifyWindowCount + 1
  const reachedDailyCap = windowCount >= DAILY_NOTIFICATION_CAP

  const result = await sendNewMessageNotificationEmail({
    to: claim.email,
    plateNumber,
    messageCount: eligibleIds.length,
    reachedDailyCap,
  })

  if (!result.success) {
    console.error("[qstash/notify-owner] send failed:", result.error)
    return NextResponse.json({ sent: false, error: result.error }, { status: 500 })
  }

  await db.update(messages).set({ ownerNotifiedAt: now }).where(inArray(messages.id, eligibleIds))
  await db
    .update(claimRequests)
    .set({
      lastNotifiedAt: now,
      notifyScheduledAt: null,
      notifyWindowStartedAt: windowStartedAt,
      notifyWindowCount: windowCount,
    })
    .where(eq(claimRequests.plateNumber, plateNumber))

  return NextResponse.json({ sent: true, count: eligibleIds.length, mutedSkipped: mutedSkipIds.length, windowCount, reachedDailyCap })
}
