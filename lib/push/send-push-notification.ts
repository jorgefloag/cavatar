import { eq, inArray } from "drizzle-orm"
import { WebPushError } from "web-push"
import { db } from "@/lib/db"
import { claimRequests, pushSubscriptions } from "@/lib/db/schema"
import { webpush } from "./web-push-client"
import { isPushCapped, isPushWindowExpired, isWithinMinGap } from "./push-window"

const SEND_TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("push send timeout")), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

// Called from submitMessage() via Next's after(), so it runs post-response
// without delaying the reply to the sender, but Vercel still keeps the
// function alive until this finishes (unlike a bare un-awaited promise).
// Never includes the message content in the payload — same reasoning as
// the email notification: push payloads travel through a third-party push
// service (FCM/Mozilla autopush/Apple), an intermediary we don't control.
export async function sendPushNotificationIfNeeded(plateNumber: string): Promise<void> {
  try {
    const [claim] = await db.select().from(claimRequests).where(eq(claimRequests.plateNumber, plateNumber)).limit(1)
    if (!claim || claim.status !== "approved") return

    const now = new Date()

    if (isPushCapped({ pushWindowStartedAt: claim.pushWindowStartedAt, pushWindowCount: claim.pushWindowCount, now })) {
      return
    }

    if (isWithinMinGap(claim.pushLastSentAt, now)) {
      return
    }

    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.plateNumber, plateNumber))

    if (subscriptions.length === 0) return

    const payload = JSON.stringify({
      title: "CAVATAR",
      body: `Tenés un mensaje nuevo en tu placa ${plateNumber}.`,
      plate: plateNumber,
    })

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        withTimeout(
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 60 },
          ),
          SEND_TIMEOUT_MS,
        ).then(() => sub),
      ),
    )

    const goneEndpoints: string[] = []
    const succeededIds: string[] = []

    results.forEach((result, i) => {
      const sub = subscriptions[i]
      if (result.status === "fulfilled") {
        succeededIds.push(sub.id)
        return
      }

      const error = result.reason
      const statusCode = error instanceof WebPushError ? error.statusCode : undefined

      if (statusCode === 404 || statusCode === 410) {
        // Subscription is gone on the push service's side — remove every
        // row sharing this endpoint, not just this plate's, since the same
        // browser subscription may be bound to several plates (ajuste #1).
        goneEndpoints.push(sub.endpoint)
      } else {
        console.error(`[push] send failed for plate ${plateNumber}:`, statusCode ?? error)
      }
    })

    if (goneEndpoints.length > 0) {
      await Promise.all(
        goneEndpoints.map((endpoint) => db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))),
      )
    }

    if (succeededIds.length > 0) {
      await db.update(pushSubscriptions).set({ lastSuccessAt: now }).where(inArray(pushSubscriptions.id, succeededIds))
    }

    const windowExpired = isPushWindowExpired(claim.pushWindowStartedAt, now)
    await db
      .update(claimRequests)
      .set({
        pushLastSentAt: now,
        pushWindowStartedAt: windowExpired ? now : claim.pushWindowStartedAt,
        pushWindowCount: windowExpired ? 1 : claim.pushWindowCount + 1,
      })
      .where(eq(claimRequests.plateNumber, plateNumber))
  } catch (error) {
    console.error(`[push] sendPushNotificationIfNeeded error for plate ${plateNumber}:`, error)
  }
}
