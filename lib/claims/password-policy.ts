// No "use server" and no server-only imports here on purpose — this constant
// is shared by both the server actions that create/replace a buzón password
// (app/inbox/actions.ts's setupPasswordWithToken, app/inbox/password-reset-actions.ts's
// resetPasswordWithToken) and the client forms that collect it
// (app/inbox/setup/page.tsx, app/inbox/reset-password/page.tsx), so it has to
// stay importable from a "use client" component.
//
// Deliberately NOT enforced anywhere a password is verified (lib/claims/verify-claim-password.ts) —
// bcrypt.compare() works the same regardless of the plaintext's length, so an
// existing 6-7 character password keeps working forever. This only gates
// creating or replacing a password, never checking one.
export const MIN_PASSWORD_LENGTH = 8
