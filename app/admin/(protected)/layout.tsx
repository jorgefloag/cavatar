import { redirect } from "next/navigation"
import { getCurrentUserEmail } from "@/lib/auth/current-email"
import { isAdminEmail } from "@/lib/auth/is-admin"
import { AdminNav } from "./admin-nav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await getCurrentUserEmail()
  if (!email) redirect("/admin/login")
  if (!isAdminEmail(email)) redirect("/")

  return (
    <div className="min-h-screen bg-background">
      <AdminNav userEmail={email as string} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
