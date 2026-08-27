// Single source of truth for what counts as "the same plate" across the app.
// Costa Rican plates are physically written with a hyphen (e.g. ABC-123),
// but are typed inconsistently everywhere they're entered — with or without
// the hyphen, with spaces, mixed case. Stripping everything but letters and
// digits (after uppercasing) means "ABC-123", "abc 123", and "ABC123" all
// collapse to the same stored/compared value, so a plate claimed one way
// can't silently miss messages sent to it written a different way.
export function normalizePlateNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
}
