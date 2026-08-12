"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/claims", label: "Reclamos" },
  { href: "/admin/verified", label: "Perfiles verificados" },
  { href: "/admin/messages", label: "Mensajes" },
  { href: "/admin/broadcast", label: "Mensajes masivos" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/reports", label: "Reportes" },
]

export function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()

  const handleLogout = async () => {
    await signOut()
    router.push("/")
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{userEmail}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="rounded-full border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </header>
  )
}
