"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Archive, CheckCircle, MessageSquare, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setupPasswordWithToken, validateSetupToken, verifyPlatePassword, type MessageDTO } from "@/app/inbox/actions"

type PageState = "checking" | "invalid" | "form" | "saved" | "inbox"

function SetupContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [pageState, setPageState] = useState<PageState>("checking")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [setupError, setSetupError] = useState("")
  const [plateNumber, setPlateNumber] = useState("")
  const [messages, setMessages] = useState<MessageDTO[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setPageState("invalid")
      return
    }
    let cancelled = false
    validateSetupToken(token)
      .then((result) => {
        if (cancelled) return
        setPageState(result.valid ? "form" : "invalid")
      })
      .catch((error) => {
        console.error("[inbox/setup] Error validating token:", error)
        if (!cancelled) setPageState("invalid")
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSetupError("")

    if (newPassword.length < 6) {
      setSetupError("La clave debe tener al menos 6 caracteres")
      return
    }
    if (newPassword !== confirmPassword) {
      setSetupError("Las claves no coinciden")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await setupPasswordWithToken(token, newPassword)
      if (!result.success || !result.plateNumber) {
        setSetupError(result.error || "Enlace inválido o expirado.")
        return
      }
      setPlateNumber(result.plateNumber)
      setPageState("saved")
    } catch (error) {
      console.error("[inbox/setup] Error setting up password:", error)
      setSetupError("Error al guardar la clave. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinueToInbox = async () => {
    setIsSubmitting(true)
    try {
      const result = await verifyPlatePassword(plateNumber, newPassword)
      setMessages(result.messages || [])
      setPageState("inbox")
    } catch (error) {
      console.error("[inbox/setup] Error loading inbox after setup:", error)
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
            href="/"
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
              Este enlace ya fue usado o dejó de ser válido. Si necesitas configurar tu clave, pide al administrador
              que reenvíe el correo desde el panel de administración.
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (pageState === "form") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          <div className="mb-10">
            <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
              Define tu clave de acceso
            </h1>
            <p className="text-muted-foreground">Crea una clave para acceder a tu buzón.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword" className="text-foreground">
                Nueva clave
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
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
                placeholder="Repite la clave"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="rounded-xl border-border bg-background py-6 text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground"
              />
            </div>

            {setupError && <p className="text-sm text-destructive">{setupError}</p>}

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

  if (pageState === "saved") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="mb-6 h-16 w-16 text-foreground" strokeWidth={1.5} />
            <h2 className="mb-3 text-xl font-bold text-foreground md:text-2xl">
              Clave guardada correctamente
            </h2>
            <p className="mb-8 max-w-sm text-muted-foreground">
              Tu clave de acceso al buzón de{" "}
              <span className="font-plate text-foreground">{plateNumber}</span> ha sido configurada.
            </p>
            <Button
              size="lg"
              onClick={handleContinueToInbox}
              disabled={isSubmitting}
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
            >
              {isSubmitting ? "Cargando..." : "Continuar al buzón"}
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // pageState === "inbox"
  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-lg">
        <div className="mb-10">
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            Mensajes recibidos
          </h1>
          <p className="text-muted-foreground">
            Buzón de la placa <span className="font-plate text-foreground">{plateNumber}</span>
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="text-muted-foreground">Aún no tienes mensajes.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, index) => (
              <Card key={msg.id} className={index === 0 ? "plate-frame" : "rounded-xl"}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-medium text-foreground">{msg.alias}</span>
                    <span className="font-label text-sm text-muted-foreground">{msg.fecha}</span>
                  </div>
                  <p className="mb-3 text-foreground">{msg.mensaje}</p>
                  {msg.contacto && <p className="text-sm text-muted-foreground">Contacto: {msg.contacto}</p>}
                </CardContent>
                <CardFooter className="gap-3 border-t pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMessages((prev) => prev.filter((m) => m.id !== msg.id))}
                    className="flex-1 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archivar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMessages((prev) => prev.filter((m) => m.id !== msg.id))}
                    className="flex-1 rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function SetupPage() {
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
      <SetupContent />
    </Suspense>
  )
}
