import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getCurrentUserEmail } from "@/lib/auth/current-email"
import { RequestForm } from "./request-form"

export default async function RequestPage() {
  const { userId } = await auth()
  if (!userId) redirect("/verified/login")

  const userEmail = await getCurrentUserEmail()

  return <RequestForm userEmail={userEmail ?? ""} />
}
