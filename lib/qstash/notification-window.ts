// Shared between app/send/actions.ts (the publish side, which must stop
// scheduling once a plate is capped — see below for why that matters) and
// app/api/qstash/notify-owner/route.ts (the send side), so the two can
// never disagree about whether a plate is currently capped. Factored out
// specifically to avoid the threshold logic drifting between the two files.
//
// DAILY_NOTIFICATION_CAP protects two independent quotas from a single
// spammed plate: Resend's shared 100/day account quota, and — more
// urgently — QStash's own free-tier quota (1,000 publishes/day for the
// WHOLE account, not per plate). With a 1-minute batch delay, a plate
// getting hammered nonstop and never actually sending (because
// app/send/actions.ts kept scheduling anyway) could generate up to ~1,440
// QStash publishes a day on its own — enough to exhaust the account's
// entire QStash quota and silently break notifications for every other
// plate. That's why the cap is checked in BOTH places: the webhook
// declining to send is not enough on its own, since each decline still
// clears notify_scheduled_at and lets the next message schedule a new
// (also-doomed) callback.
export const DAILY_NOTIFICATION_CAP = 12
export const NOTIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000

// The window is anchored to notifyWindowStartedAt, not derived from
// lastNotifiedAt — a plate notified every ~23h forever would never trip a
// "24h since the last send" check, but correctly keeps resetting here
// every ~2 sends (~46h), since the anchor only moves when the window
// actually expires. The real tradeoff this accepts: a determined sender
// can get up to 2x the cap (two adjacent windows' worth) in a short span,
// by sending one lone message to start a window, waiting ~23h, then
// bursting — the tail of the first window and the head of the next can
// land within roughly 2 hours of each other. A third window can never
// join that cluster, since each window boundary is a fixed 24h past the
// previous one's start.
export function isWindowExpired(windowStartedAt: Date | null, now: Date): boolean {
  if (!windowStartedAt) return true
  return now.getTime() - windowStartedAt.getTime() >= NOTIFICATION_WINDOW_MS
}

export function isNotificationCapped(params: {
  notifyWindowStartedAt: Date | null
  notifyWindowCount: number
  now: Date
}): boolean {
  if (isWindowExpired(params.notifyWindowStartedAt, params.now)) return false
  return params.notifyWindowCount >= DAILY_NOTIFICATION_CAP
}
