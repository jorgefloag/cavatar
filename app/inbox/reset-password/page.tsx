"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetPasswordWithToken, validatePasswordResetToken } from "@/app/inbox/password-reset-actions"
import { MIN_PASSWORD_LENGTH } from "@/lib/claims/password-policy"

type PageState = "checking" | "invalid" | "form" | "success"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [pageState, setPageState] = useState<PageState>("checking")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetError, setResetError] = useState("")
  const [plateNumber, setPlateNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setPageState("invalid")
      return
    }
    let cancelled = false
    validatePasswordResetToken(token)
      .then((result) => {
        if (cancelled) return
        setPageState(result.valid ? "form" : "invalid")
      })
      .catch((error) => {
        console.error("[inbox/reset-password] Error validating token:", error)
        if (!cancelled) setPageState("invalid")
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError("")

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setResetError(`La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError("Las claves no coinciden")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await resetPasswordWithToken(token, newPassword)
      if (!result.success || !result.plateNumber) {
        setResetError(result.error || "Enlace inválido o expirado.")
        return
      }
      setPlateNumber(result.plateNumber)
      setPageState("success")
    } catch (error) {
      console.error("[inbox/reset-password] Error resetting password:", error)
      setResetError("Error al cambiar la clave. Intentá de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (pageState === "checking") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg animate-pulse">
          <div className="mb-8 h-4 w-16 rounded bg-muted" />
          <div className="mb-3 h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
      </main>
    )
  }

  if (pageState === "invalid") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          <Link
            href="/inbox"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          <div className="mb-10">
            <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
              Enlace inválido o expirado
            </h1>
            <p className="text-muted-foreground">
              Este enlace ya fue usado o dejó de ser válido.
            </p>
          </div>

          <Button asChild size="lg" className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl">
            <Link href="/inbox/forgot-password">Pedir un enlace nuevo</Link>
          </Button>
        </div>
      </main>
    )
  }

  if (pageState === "success") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="mb-6 h-16 w-16 text-foreground" strokeWidth={1.5} />
            <h2 className="mb-3 text-xl font-bold text-foreground md:text-2xl">
              Clave cambiada correctamente
            </h2>
            <p className="mb-4 max-w-sm text-muted-foreground">
              Tu clave de acceso al buzón de{" "}
              <span className="font-plate text-foreground">{plateNumber}</span> fue actualizada.
            </p>
            <p className="mb-8 max-w-sm text-sm text-muted-foreground">
              Si tenías avisos push activados en algún dispositivo, vas a tener que reactivarlos desde tu buzón.
            </p>
            <Button
              asChild
              size="lg"
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
            >
              <Link href={`/inbox?plate=${plateNumber}`}>Ir a mi buzón</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // pageState === "form"
  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-lg">
        <Link
          href="/inbox"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        <div className="mb-10">
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            Definí tu nueva clave
          </h1>
          <p className="text-muted-foreground">Elegí una clave nueva para tu buzón.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword" className="text-foreground">
              Nueva clave
            </Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="rounded-xl border-border bg-background py-6 text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword" className="text-foreground">
              Confirmar clave
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repetí la clave"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="rounded-xl border-border bg-background py-6 text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground"
            />
          </div>

          {resetError && <p className="text-sm text-destructive">{resetError}</p>}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !newPassword.trim() || !confirmPassword.trim()}
            className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
          >
            {isSubmitting ? "Guardando..." : "Guardar clave"}
          </Button>
        </form>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-12 md:py-20">
          <div className="mx-auto max-w-lg animate-pulse">
            <div className="mb-8 h-4 w-16 rounded bg-muted" />
            <div className="mb-3 h-8 w-48 rounded bg-muted" />
            <div className="h-4 w-64 rounded bg-muted" />
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
