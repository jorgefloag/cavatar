const COSTA_RICA_TZ = "America/Costa_Rica"

// Single source of truth for displaying a stored timestamp to a human.
// Vercel's serverless runtime defaults to UTC, so without an explicit
// timeZone here, a server-rendered date (buzón, admin emails) silently
// rolls over to the next calendar day for anything that happened after
// 6pm Costa Rica time. Client-rendered admin tables had the same implicit
// gap — correct only by coincidence, when the admin's own browser happens
// to be set to Costa Rica time. Pinning an explicit IANA zone here also
// closes a latent hydration mismatch for those Client Components: without
// it, the server's SSR pass (UTC) and the browser's hydration pass (the
// admin's local zone) could compute different text for the same render;
// with it, both sides always agree, since Intl's timeZone option doesn't
// depend on either environment's ambient clock.
export function formatDateCR(date: Date | string, options?: Intl.DateTimeFormatOptions, locale = "es-MX"): string {
  return new Date(date).toLocaleDateString(locale, { ...options, timeZone: COSTA_RICA_TZ })
}

export function formatDateTimeCR(date: Date | string, options?: Intl.DateTimeFormatOptions, locale = "es-MX"): string {
  return new Date(date).toLocaleString(locale, { ...options, timeZone: COSTA_RICA_TZ })
}
