// Deliberately NOT shared with lib/qstash/notification-window.ts, even
// though the anchored-24h-window pattern is identical — the user asked
// that this push-retuning work not touch the email/QStash logic at all, and
// the two channels' numbers are independently tunable on purpose (push has
// no account-wide shared quota the way Resend/QStash do, so its cap is
// higher). Duplicating ~10 lines here is cheaper than the risk of coupling
// the two channels through a shared module.
export const PUSH_MIN_GAP_SECONDS = 60
export const PUSH_DAILY_CAP = 20
export const PUSH_WINDOW_MS = 24 * 60 * 60 * 1000

export function isPushWindowExpired(windowStartedAt: Date | null, now: Date): boolean {
  if (!windowStartedAt) return true
  return now.getTime() - windowStartedAt.getTime() >= PUSH_WINDOW_MS
}

export function isPushCapped(params: { pushWindowStartedAt: Date | null; pushWindowCount: number; now: Date }): boolean {
  if (isPushWindowExpired(params.pushWindowStartedAt, params.now)) return false
  return params.pushWindowCount >= PUSH_DAILY_CAP
}

// Minimum gap check is independent of the daily cap: even a plate nowhere
// near its cap shouldn't get a push for every message in a tight burst —
// tag+renotify would collapse them visually anyway, so skipping a push this
// close to the last one loses nothing the owner would actually see.
export function isWithinMinGap(pushLastSentAt: Date | null, now: Date): boolean {
  if (!pushLastSentAt) return false
  return now.getTime() - pushLastSentAt.getTime() < PUSH_MIN_GAP_SECONDS * 1000
}
