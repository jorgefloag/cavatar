"use server"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { verifiedRequests } from "@/lib/db/schema"
import { getCurrentUserEmail } from "@/lib/auth/current-email"

export interface VerifiedRequestDTO {
  fullName: string
  phone: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
}

export async function fetchVerifiedRequestStatus(): Promise<VerifiedRequestDTO | null> {
  const email = await getCurrentUserEmail()
  if (!email) return null

  const [row] = await db.select().from(verifiedRequests).where(eq(verifiedRequests.userEmail, email)).limit(1)
  if (!row) return null

  return {
    fullName: row.fullName,
    phone: row.phone,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }
}
