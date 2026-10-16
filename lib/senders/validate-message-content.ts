// Etapa 4 of the abuse plan — rejects links/phones/emails from non-verified
// senders. The "Mensaje" and "Nombre o alias" fields get the full
// restriction (link, email, or phone); the dedicated "Contacto" field only
// restricts links — phones/emails are its entire purpose (its own
// placeholder says "WhatsApp, teléfono o correo", see CLAUDE.md's Send
// flow), so finding one there isn't a violation. Verified senders bypass
// this entirely — enforced by the caller (checkSendPermission already knows
// whether the sender is verified), not here.

export type ContactViolation = "link" | "email" | "phone"

export const MESSAGE_OR_ALIAS_RESTRICTION_ERROR =
  'Para evitar spam, los remitentes sin verificar no pueden incluir enlaces, correos ni teléfonos en el nombre o el mensaje. Si querés dejar tu contacto, usá el campo "Contacto".'

export const CONTACT_LINK_RESTRICTION_ERROR =
  "Para evitar spam, los remitentes sin verificar no pueden incluir enlaces en el campo de contacto. Si es tu teléfono o correo, podés dejarlo ahí sin problema."

// Spelled-out separators used to dodge a naive filter ("instagram punto
// com", "contactame arroba gmail punto com") — normalized to the literal
// character before any pattern below runs.
function normalizeSpelledOutSeparators(text: string): string {
  return text.replace(/\s+punto\s+/gi, ".").replace(/\s+arroba\s+/gi, "@")
}

const LINK_PATTERNS: RegExp[] = [
  /https?:\/\//i,
  /www\./i,
  // A domain-shaped token: requires a letter (not just digits) in the
  // segment before the dot, which is exactly what keeps this from matching
  // an amount like "15.000" or "15.000.000" (all-digit segments).
  /[a-z0-9](?:[a-z0-9-]*[a-z])[a-z0-9-]*\.(com|cr|net|org|io|co|me|info|link|site|xyz|online|biz|mx)\b/i,
  // Known link-shortener/messaging hosts, in case some phrasing dodges the
  // generic domain pattern above.
  /\b(wa\.me|t\.me|bit\.ly|tinyurl\.com|chat\.whatsapp\.com)\b/i,
]

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i

// Costa Rica phone patterns only — deliberately excludes a bare run of
// digits that isn't one of these shapes (a cédula, a plate, an amount):
// - "+506" + 8 digits, with or without internal separators
// - 8 digits split as XXXX-XXXX or XXXX XXXX — the separator itself is the
//   "clear pattern" signal
// - a bare, unformatted run of EXACTLY 8 digits starting with 2/4/5/6/7/8
//   (Costa Rica's real area-code ranges). The (?<!\d)/(?!\d) boundaries
//   mean this never matches a run that's part of a longer digit sequence
//   (a 9-digit cédula, a longer reference number), and restricting to those
//   six leading digits means a coincidentally-8-digit amount starting with
//   another digit (e.g. "15000000") isn't flagged just for being 8 digits
//   long. Known, accepted tradeoff: an 8-digit amount that DOES start with
//   2/4/5/6/7/8 (e.g. "85000000") would still be misflagged — not solved
//   here, per explicit sign-off on this exact rule during planning.
const PHONE_PATTERNS: RegExp[] = [
  /\+506[\s-]?\d{4}[\s-]?\d{4}\b/,
  /(?<!\d)\d{4}[-\s]\d{4}(?!\d)/,
  /(?<!\d)[245678]\d{7}(?!\d)/,
]

// An email address IS a domain (the part after "@"), so it would otherwise
// also match the generic domain-shaped link pattern below — stripped out
// first so an email gets classified (and, on the Contacto field, allowed)
// as "email", never misreported as "link".
function stripEmails(text: string): string {
  return text.replace(EMAIL_PATTERN, " ")
}

function detectLink(text: string): boolean {
  const withoutEmails = stripEmails(text)
  return LINK_PATTERNS.some((pattern) => pattern.test(withoutEmails))
}

function detectEmail(text: string): boolean {
  return EMAIL_PATTERN.test(text)
}

function detectPhone(text: string): boolean {
  return PHONE_PATTERNS.some((pattern) => pattern.test(text))
}

// Full restriction — used for "Mensaje" and "Nombre o alias".
export function findContactViolation(rawText: string | null | undefined): ContactViolation | null {
  if (!rawText) return null
  const text = normalizeSpelledOutSeparators(rawText)
  if (detectEmail(text)) return "email"
  if (detectLink(text)) return "link"
  if (detectPhone(text)) return "phone"
  return null
}

// Link-only restriction — used for the dedicated "Contacto" field.
export function findLinkOnlyViolation(rawText: string | null | undefined): "link" | null {
  if (!rawText) return null
  const text = normalizeSpelledOutSeparators(rawText)
  return detectLink(text) ? "link" : null
}

export function checkContactRestriction(input: {
  message: string
  alias?: string | null
  contact?: string | null
}): { allowed: true } | { allowed: false; error: string } {
  if (findContactViolation(input.message)) {
    return { allowed: false, error: MESSAGE_OR_ALIAS_RESTRICTION_ERROR }
  }
  if (findContactViolation(input.alias)) {
    return { allowed: false, error: MESSAGE_OR_ALIAS_RESTRICTION_ERROR }
  }
  if (findLinkOnlyViolation(input.contact)) {
    return { allowed: false, error: CONTACT_LINK_RESTRICTION_ERROR }
  }
  return { allowed: true }
}
