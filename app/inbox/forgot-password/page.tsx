"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from "@/app/inbox/password-reset-actions"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const [plateNumber, setPlateNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const plateParam = searchParams.get("plate")
    if (plateParam) setPlateNumber(normalizePlateNumber(plateParam))
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plateNumber.trim()) return

    setIsSubmitting(true)
    try {
      // The response is always {success:true} by design — never branch the
      // UI on it, that's the whole point of the generic message below.
      await requestPasswordReset(plateNumber)
    } finally {
      setIsSubmitting(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          <div className="mb-10">
            <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">Listo</h1>
            <p className="text-muted-foreground">
              Si existe un buzón activo para esa placa, enviamos un enlace al correo registrado.
            </p>
          </div>
          <Link
            href="/inbox"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
      </main>
    )
  }

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
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">Olvidé mi clave</h1>
          <p className="text-muted-foreground">
            Ingresá el número de placa. Si tiene un buzón activo, te mandamos un enlace al correo registrado.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="plate" className="text-foreground">
              Número de placa
            </Label>
            <Input
              id="plate"
              type="text"
              placeholder="ABC123"
              value={plateNumber}
              onChange={(e) => setPlateNumber(normalizePlateNumber(e.target.value))}
              required
              disabled={isSubmitting}
              className="bg-background py-6 font-plate text-lg uppercase tracking-wider text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !plateNumber.trim()}
            className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
          >
            {isSubmitting ? "Enviando..." : "Enviar enlace"}
          </Button>
        </form>
      </div>
    </main>
  )
}

export default function ForgotPasswordPage() {
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
      <ForgotPasswordContent />
    </Suspense>
  )
}
