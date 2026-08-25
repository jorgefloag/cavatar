import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests, verifiedRequests } from "@/lib/db/schema"
import { sendAdminDailyDigestEmail } from "@/lib/email/send-admin-daily-digest-email"

// Vercel Cron can only call an HTTP endpoint, not a Server Action — this is
// the one deliberate exception to this codebase's "no app/api, everything is
// a Server Action" convention (see CLAUDE.md). Configured in vercel.json.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [pendingClaims, pendingVerified] = await Promise.all([
    db
      .select({ plateNumber: claimRequests.plateNumber, email: claimRequests.email, createdAt: claimRequests.createdAt })
      .from(claimRequests)
      .where(eq(claimRequests.status, "pending")),
    db
      .select({ userEmail: verifiedRequests.userEmail, fullName: verifiedRequests.fullName, createdAt: verifiedRequests.createdAt })
      .from(verifiedRequests)
      .where(eq(verifiedRequests.status, "pending")),
  ])

  if (pendingClaims.length === 0 && pendingVerified.length === 0) {
    return NextResponse.json({ sent: false, reason: "nothing pending" })
  }

  const result = await sendAdminDailyDigestEmail({ pendingClaims, pendingVerified })
  if (!result.success) {
    console.error("[cron/daily-digest] send failed:", result.error)
    return NextResponse.json({ sent: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    sent: true,
    pendingClaims: pendingClaims.length,
    pendingVerified: pendingVerified.length,
  })
}
