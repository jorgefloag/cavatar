// Same anchored-24h-window pattern as lib/qstash/notification-window.ts and
// lib/push/push-window.ts — deliberately a third independent copy, not
// shared code, for the same reason as the other two: each channel's limit
// must be free to change without risking the others. Shared by both a real
// password-reset request and a resend of the original setup link (both
// represent "we emailed this plate's owner a password-setting link today").
export const PASSWORD_RESET_DAILY_CAP = 5
export const PASSWORD_RESET_WINDOW_MS = 24 * 60 * 60 * 1000

export function isPasswordResetWindowExpired(windowStartedAt: Date | null, now: Date): boolean {
  if (!windowStartedAt) return true
  return now.getTime() - windowStartedAt.getTime() >= PASSWORD_RESET_WINDOW_MS
}

export function isPasswordResetCapped(params: {
  passwordResetWindowStartedAt: Date | null
  passwordResetWindowCount: number
  now: Date
}): boolean {
  if (isPasswordResetWindowExpired(params.passwordResetWindowStartedAt, params.now)) return false
  return params.passwordResetWindowCount >= PASSWORD_RESET_DAILY_CAP
}
