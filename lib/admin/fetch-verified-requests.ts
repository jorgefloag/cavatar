import { desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { verifiedRequests } from "@/lib/db/schema"

// Etapa 6/7 review note: no requireAdminEmail() in here — the Server
// Action wrapping this (app/admin/(protected)/verified/actions.ts) does
// the admin gate; this file is the real, directly-testable logic.

export interface VerifiedRequestAdminDTO {
  id: string
  userEmail: string
  fullName: string
  phone: string
  useCase: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  reviewedAt: string | null
  // Etapa 7 — businessName must be clearly visible to the admin before
  // approving, since it's what the buzón owner will see with the
  // "Verificado" badge once approved. clerkUserId confirms the Etapa 7
  // link actually took (null only for a legacy row submitted before this
  // existed, or — should never happen going forward — an unauthenticated
  // edge case submitVerifiedRequest() already guards against).
  businessName: string | null
  clerkUserId: string | null
}

export async function fetchAllVerifiedRequestsList(): Promise<VerifiedRequestAdminDTO[]> {
  const rows = await db.select().from(verifiedRequests).orderBy(desc(verifiedRequests.createdAt))

  return rows.map((row) => ({
    id: row.id,
    userEmail: row.userEmail,
    fullName: row.fullName,
    phone: row.phone,
    useCase: row.useCase,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    businessName: row.businessName,
    clerkUserId: row.clerkUserId,
  }))
}
