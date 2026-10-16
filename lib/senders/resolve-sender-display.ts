// Etapa 6 — shared by every admin surface that displays a sender's email
// (messages table, CSV export, Reportados), so the three can't drift into
// showing the anonymization placeholder differently from each other.

const ANONYMIZED_PREFIX = "eliminado-"

export function isAnonymizedEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.startsWith(ANONYMIZED_PREFIX)
}

// null/undefined -> no sender row at all (senderId was null, or a reported
// message had no matching sender) -> "Remitente anterior", same label the
// buzón itself uses for the equivalent case (see app/inbox/actions.ts).
// An anonymized sender's literal "eliminado-<id>" stored email is never
// shown verbatim — admins see "Remitente anonimizado" instead.
export function resolveSenderDisplayEmail(email: string | null | undefined): string {
  if (!email) return "Remitente anterior"
  if (isAnonymizedEmail(email)) return "Remitente anonimizado"
  return email
}
