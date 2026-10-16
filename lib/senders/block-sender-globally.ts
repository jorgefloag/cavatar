import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { senders } from "@/lib/db/schema"

export type BlockSenderResult = { success: true } | { success: false; error: string }

// No admin gate in here on purpose (Etapa 6 review note) — the caller
// (app/admin/(protected)/messages/actions.ts) is responsible for
// requireAdminEmail(), so this stays a plain, directly-testable function:
// a temporary diagnostic route can call it for real without needing a live
// Clerk admin session, unlike the Server Action wrapping it.
//
// Sets/clears all three of senders.isBlocked/blockedAt/blockedBy together —
// checkSendPermission() already checks isBlocked first (built in Etapa 3),
// so this takes effect on every plate immediately, with no other code to
// touch. adminEmail is the caller's own identity (from requireAdminEmail()),
// never something this function derives itself.
export async function blockSenderGlobally(
  senderId: string,
  blocked: boolean,
  adminEmail: string,
): Promise<BlockSenderResult> {
  const [existing] = await db.select({ id: senders.id }).from(senders).where(eq(senders.id, senderId)).limit(1)
  if (!existing) return { success: false, error: "Remitente no encontrado." }

  await db
    .update(senders)
    .set({
      isBlocked: blocked,
      blockedAt: blocked ? new Date() : null,
      blockedBy: blocked ? adminEmail : null,
    })
    .where(eq(senders.id, senderId))

  return { success: true }
}
