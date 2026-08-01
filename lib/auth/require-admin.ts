import { getCurrentUserEmail } from "@/lib/auth/current-email"
import { isAdminEmail } from "@/lib/auth/is-admin"

export async function requireAdminEmail(): Promise<{ ok: true; email: string } | { ok: false }> {
  const email = await getCurrentUserEmail()
  if (!isAdminEmail(email)) return { ok: false }
  return { ok: true, email: email as string }
}
