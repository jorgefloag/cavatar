"use server"

import { count, eq, gte } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests, messages, verifiedRequests } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"

export interface DashboardMetrics {
  claimsApproved: number
  claimsPending: number
  verifiedApproved: number
  verifiedPending: number
  messagesTotal: number
  messagesToday: number
  claimsToday: number
  verifiedToday: number
}

const emptyMetrics: DashboardMetrics = {
  claimsApproved: 0,
  claimsPending: 0,
  verifiedApproved: 0,
  verifiedPending: 0,
  messagesTotal: 0,
  messagesToday: 0,
  claimsToday: 0,
  verifiedToday: 0,
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return emptyMetrics

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    [claimsApproved],
    [claimsPending],
    [verifiedApproved],
    [verifiedPending],
    [messagesTotal],
    [messagesToday],
    [claimsToday],
    [verifiedToday],
  ] = await Promise.all([
    db.select({ value: count() }).from(claimRequests).where(eq(claimRequests.status, "approved")),
    db.select({ value: count() }).from(claimRequests).where(eq(claimRequests.status, "pending")),
    db.select({ value: count() }).from(verifiedRequests).where(eq(verifiedRequests.status, "approved")),
    db.select({ value: count() }).from(verifiedRequests).where(eq(verifiedRequests.status, "pending")),
    db.select({ value: count() }).from(messages),
    db.select({ value: count() }).from(messages).where(gte(messages.createdAt, startOfToday)),
    db.select({ value: count() }).from(claimRequests).where(gte(claimRequests.createdAt, startOfToday)),
    db.select({ value: count() }).from(verifiedRequests).where(gte(verifiedRequests.createdAt, startOfToday)),
  ])

  return {
    claimsApproved: claimsApproved.value,
    claimsPending: claimsPending.value,
    verifiedApproved: verifiedApproved.value,
    verifiedPending: verifiedPending.value,
    messagesTotal: messagesTotal.value,
    messagesToday: messagesToday.value,
    claimsToday: claimsToday.value,
    verifiedToday: verifiedToday.value,
  }
}
