import { redirect } from "next/navigation"
import { getCurrentUserEmail } from "@/lib/auth/current-email"
import { isAdminEmail } from "@/lib/auth/is-admin"
import { AdminLoginForm } from "./admin-login-form"

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const email = await getCurrentUserEmail()

  if (email) {
    // Already signed in — either send them where they were headed (admin),
    // or bounce non-admins away without ever showing the login form. Same
    // outcome for non-admins as hitting any other /admin/* route directly.
    if (isAdminEmail(email)) {
      const { returnTo } = await searchParams
      redirect(returnTo || "/admin")
    }
    redirect("/")
  }

  return <AdminLoginForm />
}
