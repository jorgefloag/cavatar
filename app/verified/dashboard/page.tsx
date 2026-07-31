import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getCurrentUserEmail } from "@/lib/auth/current-email"
import { fetchVerifiedRequestStatus } from "./actions"
import { DashboardView } from "./dashboard-view"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/verified/login")

  const [userEmail, request] = await Promise.all([getCurrentUserEmail(), fetchVerifiedRequestStatus()])

  return <DashboardView userEmail={userEmail ?? ""} request={request} />
}
