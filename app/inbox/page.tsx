"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Car, Clock, MessageSquare, Archive, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { lookupPlate, verifyPlatePassword, type MessageDTO } from "./actions"

type Message = MessageDTO

// Step 1: plate_input -> Step 2: no_claim | pending | awaiting_setup | enter_password -> inbox
type PageState = "plate_input" | "loading" | "no_claim" | "pending" | "awaiting_setup" | "enter_password" | "wrong_password" | "inbox"

function InboxContent() {
  const searchParams = useSearchParams()
  const plateInputRef = useRef<HTMLInputElement>(null)
  const [pageState, setPageState] = useState<PageState>("plate_input")
  const [plateNumber, setPlateNumber] = useState("")
  const [password, setPassword] = useState("")
  const [currentPlate, setCurrentPlate] = useState("")
  const [carName, setCarName] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Brute force protection state — real enforcement lives server-side (app/inbox/actions.ts);
  // this is only a UI mirror of the last server response.
  const [isBlocked, setIsBlocked] = useState(false)

  // Auto-focus plate input when navigating from features card
  useEffect(() => {
    if (searchParams.get("focus") === "plate" && plateInputRef.current) {
      plateInputRef.current.focus()
    }
  }, [searchParams])

  // Auto-submit plate lookup when plate param is provided from hero
  useEffect(() => {
    const plateParam = searchParams.get("plate")
    if (plateParam && pageState === "plate_input") {
      const plate = plateParam.trim().toUpperCase()
      setPlateNumber(plate)
      const runLookup = async () => {
        setIsSubmitting(true)
        setCurrentPlate(plate)
        try {
          const result = await lookupPlate(plate)
          setPageState(result.state)
        } catch (error) {
          console.error("[inbox] Error in auto plate lookup:", error)
          setPageState("no_claim")
        } finally {
          setIsSubmitting(false)
        }
      }
      runLookup()
    }
  }, [searchParams, pageState])

  // Step 1: Look up plate only
  const handlePlateLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plateNumber.trim()) return

    const plate = plateNumber.trim().toUpperCase()
    setIsSubmitting(true)
    setCurrentPlate(plate)

    try {
      const result = await lookupPlate(plate)
      setPageState(result.state)
    } catch (error) {
      console.error("[inbox] Error in handlePlateLookup:", error)
      setPageState("no_claim")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2b: Verify password for existing users
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || isBlocked) return

    setIsSubmitting(true)

    try {
      const result = await verifyPlatePassword(currentPlate, password)

      if (result.success) {
        setIsBlocked(false)
        setMessages(result.messages || [])
        setCarName(result.carName ?? null)
        setPageState("inbox")
      } else if (result.locked) {
        setIsBlocked(true)
        setPageState("wrong_password")
      } else {
        setPageState("wrong_password")
      }
    } catch (error) {
      console.error("[inbox] Error in handlePasswordLogin:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setPlateNumber("")
    setPassword("")
    setCurrentPlate("")
    setCarName(null)
    setMessages([])
    setIsBlocked(false)
    setPageState("plate_input")
  }

  const handleArchive = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }

  const handleDelete = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }

  // Step 1: Plate input only
  if (pageState === "plate_input" || pageState === "loading") {
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
            <h1 className="mb-3 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
              Consultar tu buzón
            </h1>
            <p className="text-muted-foreground">
              Ingresa el número de placa para continuar.
            </p>
          </div>

          <form onSubmit={handlePlateLookup} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plate" className="text-foreground">
                Número de placa
              </Label>
              <Input
                ref={plateInputRef}
                id="plate"
                type="text"
                placeholder="ABC123"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                required
                disabled={isSubmitting}
                className="rounded-xl border-border bg-background py-6 font-mono text-lg uppercase tracking-wider text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !plateNumber.trim()}
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? "Buscando..." : "Continuar"}
            </Button>
          </form>
        </div>
      </main>
    )
  }

  // Step 2d: Enter password (approved with existing password)
  if (pageState === "enter_password" || pageState === "wrong_password") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          <button
            onClick={handleReset}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <div className="mb-10">
            <h1 className="mb-3 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
              Ingresa tu clave de acceso
            </h1>
            <p className="text-muted-foreground">
              Para acceder al buzón de{" "}
              <span className="font-mono font-medium text-foreground">{currentPlate}</span>
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-foreground">
                Clave de acceso
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Tu clave"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="rounded-xl border-border bg-background py-6 text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground"
              />
            </div>

            {pageState === "wrong_password" && !isBlocked && (
              <p className="text-sm text-destructive">
                Clave incorrecta
              </p>
            )}

            {isBlocked && (
              <p className="text-sm text-destructive">
                Demasiados intentos fallidos. Intenta nuevamente en unos minutos.
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !password.trim() || isBlocked}
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? "Verificando..." : "Ingresar"}
            </Button>
          </form>
        </div>
      </main>
    )
  }

  // Step 2c: Approved but the owner hasn't finished setup via their emailed link yet
  if (pageState === "awaiting_setup") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          <button
            onClick={handleReset}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="mb-6 h-16 w-16 text-muted-foreground/50" strokeWidth={1.5} />
            <h2 className="mb-3 font-mono text-xl font-bold tracking-wide text-foreground md:text-2xl">
              Tu placa fue aprobada
            </h2>
            <p className="mb-8 max-w-sm text-muted-foreground">
              Revisa el correo con el que hiciste el reclamo para configurar tu acceso al buzón.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              Consultar otra placa
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // No claim found state
  if (pageState === "no_claim") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          {/* Back link */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          {/* No claim state */}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Car className="mb-6 h-16 w-16 text-muted-foreground/50" strokeWidth={1.5} />
            <h2 className="mb-3 font-mono text-xl font-bold tracking-wide text-foreground md:text-2xl">
              Esta placa aún no ha sido reclamada
            </h2>
            <p className="mb-8 max-w-sm text-muted-foreground">
              Si esta es tu placa, puedes solicitar acceso a su buzón.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
              >
                <Link href="/claim">Reclamar placa</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground"
              >
                Consultar otra placa
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Pending review state
  if (pageState === "pending") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          {/* Back link */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          {/* Pending State */}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="mb-6 h-16 w-16 text-muted-foreground/50" strokeWidth={1.5} />
            <h2 className="mb-3 font-mono text-xl font-bold tracking-wide text-foreground md:text-2xl">
              Tu solicitud está en revisión
            </h2>
            <p className="mb-8 max-w-sm text-muted-foreground">
              Estamos validando la solicitud de acceso para esta placa.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              Consultar otra placa
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Inbox state - show messages
  if (pageState === "inbox") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          {/* Back link */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          {/* Header */}
          <div className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <h1 className="font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
                {carName ? `Buzón de ${carName}` : "Mensajes recibidos"}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground"
              >
                Salir
              </Button>
            </div>
            <p className="text-muted-foreground">
              Revisa los mensajes enviados a tu placa{" "}
              <span className="font-mono font-medium text-foreground">{currentPlate}</span>
            </p>
          </div>

          {/* Messages list */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1.5} />
              <p className="text-muted-foreground">Aún no tienes mensajes.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <Card key={msg.id} className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-foreground">{msg.alias}</span>
                      <span className="text-sm text-muted-foreground">{msg.fecha}</span>
                    </div>
                    <p className="mb-3 text-foreground">{msg.mensaje}</p>
                    {msg.contacto && (
                      <p className="text-sm text-muted-foreground">
                        Contacto: {msg.contacto}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="gap-3 border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchive(msg.id)}
                      className="flex-1 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archivar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(msg.id)}
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

  // Fallback - return to login
  return null
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-lg">
          <div className="animate-pulse">
            <div className="mb-8 h-4 w-16 rounded bg-muted" />
            <div className="mb-10">
              <div className="mb-3 h-8 w-48 rounded bg-muted" />
              <div className="h-4 w-64 rounded bg-muted" />
            </div>
          </div>
        </div>
      </main>
    }>
      <InboxContent />
    </Suspense>
  )
}
