import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { verifiedRequests } from "@/lib/db/schema"

export type SetBusinessNameResult = { success: true } | { success: false; error: string }

// No admin gate in here — same split as blockSenderGlobally()/
// anonymizeSender(). Etapa 7: the applicant sets businessName once, on
// their initial (pending/rejected) submission; once approved, only the
// admin can change it — submitVerifiedRequest() enforces that half of the
// rule by refusing to touch an approved row at all. This function is the
// other half: the one path that CAN still change it after approval,
// gated only by requireAdminEmail() in the Server Action that calls it.
export async function setBusinessName(requestId: string, businessName: string): Promise<SetBusinessNameResult> {
  const trimmed = businessName.trim()
  if (!trimmed) return { success: false, error: "El nombre comercial no puede estar vacío." }

  const [existing] = await db.select({ id: verifiedRequests.id }).from(verifiedRequests).where(eq(verifiedRequests.id, requestId)).limit(1)
  if (!existing) return { success: false, error: "Solicitud no encontrada." }

  await db.update(verifiedRequests).set({ businessName: trimmed }).where(eq(verifiedRequests.id, requestId))
  return { success: true }
}
