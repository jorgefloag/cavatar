"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Car, Clock, MessageSquare, Archive, Trash2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Message {
  id: string
  alias: string
  mensaje: string
  contacto: string
  fecha: string
  plate_number: string
}

// Step 1: plate_input -> Step 2: no_claim | pending | setup_password | enter_password -> inbox
type PageState = "plate_input" | "loading" | "no_claim" | "pending" | "setup_password" | "enter_password" | "wrong_password" | "password_saved" | "inbox"

const BLOCK_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const MAX_FAILED_ATTEMPTS = 5

function InboxContent() {
  const searchParams = useSearchParams()
  const plateInputRef = useRef<HTMLInputElement>(null)
  const [pageState, setPageState] = useState<PageState>("plate_input")
  const [plateNumber, setPlateNumber] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [setupError, setSetupError] = useState("")
  const [currentPlate, setCurrentPlate] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Brute force protection state
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)

  const isBlocked = blockedUntil !== null && Date.now() < blockedUntil

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
      // Trigger the lookup after setting the plate
      const lookupPlate = async () => {
        setIsSubmitting(true)
        setCurrentPlate(plate)

        try {
          const { data: claimData, error: claimError } = await supabase
            .from("claim_requests")
            .select("*")
            .eq("plate_number", plate)
            .single()

          if (claimError || !claimData) {
            setPageState("no_claim")
            return
          }

          if (claimData.status === "pending") {
            setPageState("pending")
            return
          }

          if (claimData.status === "approved") {
            const hasPassword = claimData.access_password && claimData.access_password.trim() !== ""
            
            if (!hasPassword) {
              setPageState("setup_password")
            } else {
              setPageState("enter_password")
            }
            return
          }

          setPageState("no_claim")
        } catch (error) {
          console.error("[v0] Error in auto plate lookup:", error)
          setPageState("no_claim")
        } finally {
          setIsSubmitting(false)
        }
      }
      lookupPlate()
    }
  }, [searchParams, pageState])

  // Step 1: Look up plate only
  const handlePlateLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plateNumber.trim()) return

    const plate = plateNumber.trim().toUpperCase()
    setIsSubmitting(true)
    setCurrentPlate(plate)

    console.log("[v0] Step 1: Looking up plate:", plate)

    try {
      const { data: claimData, error: claimError } = await supabase
        .from("claim_requests")
        .select("*")
        .eq("plate_number", plate)
        .single()

      console.log("[v0] Supabase response:", { claimData, claimError })

      if (claimError || !claimData) {
        console.log("[v0] -> State: no_claim")
        setPageState("no_claim")
        return
      }

      console.log("[v0] Status:", claimData.status)
      console.log("[v0] access_password exists:", !!claimData.access_password)

      if (claimData.status === "pending") {
        console.log("[v0] -> State: pending")
        setPageState("pending")
        return
      }

      if (claimData.status === "approved") {
        const hasPassword = claimData.access_password && claimData.access_password.trim() !== ""
        
        if (!hasPassword) {
          console.log("[v0] -> State: setup_password")
          setPageState("setup_password")
        } else {
          console.log("[v0] -> State: enter_password")
          setPageState("enter_password")
        }
        return
      }

      // Default to no_claim for any other status
      console.log("[v0] -> State: no_claim (fallback)")
      setPageState("no_claim")
    } catch (error) {
      console.error("[v0] Error in handlePlateLookup:", error)
      setPageState("no_claim")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2b: Verify password for existing users
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    // Check if currently blocked
    if (blockedUntil !== null && Date.now() < blockedUntil) {
      console.log("[v0] Still blocked, ignoring attempt")
      return
    }

    // If block has expired, reset
    if (blockedUntil !== null && Date.now() >= blockedUntil) {
      console.log("[v0] Block expired, resetting attempts")
      setBlockedUntil(null)
      setFailedAttempts(0)
    }

    setIsSubmitting(true)

    console.log("[v0] Verifying password for plate:", currentPlate)
    console.log("[v0] Current failedAttempts:", failedAttempts)

    try {
      const { data: claimData, error: claimError } = await supabase
        .from("claim_requests")
        .select("access_password")
        .eq("plate_number", currentPlate)
        .single()

      if (claimError || !claimData) {
        console.log("[v0] Error fetching password")
        setPageState("no_claim")
        return
      }

      const passwordMatch = password === claimData.access_password
      console.log("[v0] Password match:", passwordMatch)

      if (passwordMatch) {
        // Reset failed attempts on success
        setFailedAttempts(0)
        setBlockedUntil(null)
        await fetchMessagesAndShowInbox()
      } else {
        const newFailedAttempts = failedAttempts + 1
        console.log("[v0] Failed attempt #" + newFailedAttempts)
        setFailedAttempts(newFailedAttempts)

        if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          const blockUntilTime = Date.now() + BLOCK_DURATION_MS
          console.log("[v0] Blocking started until:", new Date(blockUntilTime).toISOString())
          setBlockedUntil(blockUntilTime)
        }

        setPageState("wrong_password")
      }
    } catch (error) {
      console.error("[v0] Error in handlePasswordLogin:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2a: Setup password for new users
  const handleSetupPassword = async (e: React.FormEvent) => {
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

    console.log("[v0] Setting up password for plate:", currentPlate)

    try {
      const { error } = await supabase
        .from("claim_requests")
        .update({ access_password: newPassword })
        .eq("plate_number", currentPlate)

      if (error) {
        console.error("[v0] Error saving password:", error)
        setSetupError("Error al guardar la clave. Intenta de nuevo.")
        return
      }

      console.log("[v0] Password saved successfully")
      setPageState("password_saved")
    } catch (error) {
      console.error("[v0] Error in handleSetupPassword:", error)
      setSetupError("Error al guardar la clave. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchMessagesAndShowInbox = async () => {
    console.log("[v0] Fetching messages for plate:", currentPlate)

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("plate_number", currentPlate)
        .order("created_at", { ascending: false })

      console.log("[v0] Messages response:", { messagesData, messagesError })

      const formattedMessages: Message[] = (messagesData || []).map((msg: Record<string, unknown>) => ({
        id: String(msg.id),
        alias: String(msg.alias || "Anónimo"),
        mensaje: String(msg.mensaje || msg.message || ""),
        contacto: String(msg.contacto || msg.contact || ""),
        fecha: new Date(String(msg.created_at)).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        plate_number: String(msg.plate_number),
      }))

      setMessages(formattedMessages)
      console.log("[v0] -> State: inbox")
      setPageState("inbox")
    } catch (error) {
      console.error("[v0] Error fetching messages:", error)
    }
  }

  const handleContinueToInbox = async () => {
    setIsSubmitting(true)
    await fetchMessagesAndShowInbox()
    setIsSubmitting(false)
  }

  const handleReset = () => {
    setPlateNumber("")
    setPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setSetupError("")
    setCurrentPlate("")
    setMessages([])
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

  // Step 2c: Setup password (approved but no password yet)
  if (pageState === "setup_password") {
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
              Define tu clave de acceso
            </h1>
            <p className="text-muted-foreground">
              Crea una clave para acceder a tu buzón de la placa{" "}
              <span className="font-mono font-medium text-foreground">{currentPlate}</span>
            </p>
          </div>

          <form onSubmit={handleSetupPassword} className="flex flex-col gap-6">
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

            {setupError && (
              <p className="text-sm text-destructive">
                {setupError}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !newPassword.trim() || !confirmPassword.trim()}
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar clave"}
            </Button>
          </form>
        </div>
      </main>
    )
  }

  // Password saved success state
  if (pageState === "password_saved") {
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

          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="mb-6 h-16 w-16 text-foreground" strokeWidth={1.5} />
            <h2 className="mb-3 font-mono text-xl font-bold tracking-wide text-foreground md:text-2xl">
              Clave guardada correctamente
            </h2>
            <p className="mb-8 max-w-sm text-muted-foreground">
              Tu clave de acceso ha sido configurada. Ahora puedes acceder a tu buzón.
            </p>
            <Button
              size="lg"
              onClick={handleContinueToInbox}
              disabled={isSubmitting}
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? "Cargando..." : "Continuar al buzón"}
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
                Mensajes recibidos
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
