"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Car,
  Clock,
  MessageSquare,
  Archive,
  Trash2,
  BadgeCheck,
  Flag,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { lookupPlate, verifyPlatePassword, type MessageDTO } from "./actions"
import { archiveMessage, deleteMessage, reportMessage } from "./moderation-actions"
import { PushNotificationToggle } from "@/components/push-notification-toggle"
import { PlateSendersSection } from "./plate-senders-section"
import { BannerSlot } from "@/components/banner-slot"
import type { BannerDTO } from "@/lib/banners/get-banner"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"

type Message = MessageDTO

// Step 1: plate_input -> Step 2: no_claim | pending | awaiting_setup | enter_password -> inbox
type PageState = "plate_input" | "loading" | "no_claim" | "pending" | "awaiting_setup" | "enter_password" | "wrong_password" | "inbox"

function InboxContentInner({ banner }: { banner: BannerDTO | null }) {
  const router = useRouter()
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

  // Set whenever archiveMessage/deleteMessage/reportMessage fails — always
  // the same generic text from the server, shown here when bounced back to
  // the password screen. Never set by anything else, so it can't linger
  // and be confused with "Clave incorrecta".
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [showPreClaim, setShowPreClaim] = useState(false)
  // Message IDs the owner chose to reveal from behind "Mensaje reportado — Mostrar".
  const [revealedReported, setRevealedReported] = useState<Set<string>>(new Set())

  // The exact ?plate= value handleReset() last dismissed. router.replace()
  // clearing the URL is asynchronous — on a slow connection, the auto-submit
  // effect below can re-fire on the stale searchParams before that
  // navigation lands, re-triggering lookupPlate() and snapping pageState
  // right back. A ref is synchronous and carries no such race: it's set in
  // the same handler call that resets pageState, so the very next run of
  // the effect already sees it, regardless of when the URL itself updates.
  const dismissedPlateRef = useRef<string | null>(null)

  // Auto-focus plate input when navigating from features card
  useEffect(() => {
    if (searchParams.get("focus") === "plate" && plateInputRef.current) {
      plateInputRef.current.focus()
    }
  }, [searchParams])

  // Auto-submit plate lookup when plate param is provided from hero
  useEffect(() => {
    const plateParam = searchParams.get("plate")
    if (plateParam && plateParam === dismissedPlateRef.current) {
      // The user just explicitly left this exact plate via handleReset() —
      // don't resurrect it just because the URL hasn't caught up yet.
      return
    }
    if (plateParam && pageState === "plate_input") {
      const plate = normalizePlateNumber(plateParam)
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

    const plate = normalizePlateNumber(plateNumber)
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
        setSessionExpiredMessage("")
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
    // Set synchronously, before any state update below, so the auto-submit
    // effect's very next run already sees it — no dependency on when
    // router.replace()'s URL change actually lands.
    dismissedPlateRef.current = searchParams.get("plate")
    setPlateNumber("")
    setPassword("")
    setCurrentPlate("")
    setCarName(null)
    setMessages([])
    setIsBlocked(false)
    setSessionExpiredMessage("")
    setShowArchived(false)
    setShowPreClaim(false)
    setRevealedReported(new Set())
    setPageState("plate_input")
    // Still clear ?plate= (and any other query param) so the URL itself is
    // honest afterward — reloading, sharing the link, etc. — even though
    // the ref above, not this, is what stops the stale re-trigger now.
    router.replace("/inbox", { scroll: false })
  }

  // Bounces back to the password screen on any session failure — the same
  // generic message for every cause (expired, wrong plate, message gone),
  // never distinguished, per lib/inbox/session.ts.
  const handleSessionExpired = (error?: string) => {
    setSessionExpiredMessage(error || "Tu sesión venció, volvé a ingresar tu clave.")
    setPassword("")
    setPageState("enter_password")
  }

  // The message only leaves the list once the server confirms success —
  // unlike before, when these buttons just filtered local state and lied.
  const handleArchive = async (id: string) => {
    try {
      const result = await archiveMessage(id)
      if (!result.success) {
        handleSessionExpired(result.error)
        return
      }
      setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, isArchived: true } : msg)))
    } catch (error) {
      console.error("[inbox] Error in handleArchive:", error)
    }
  }

  const handleDeleteConfirmed = async (id: string) => {
    try {
      const result = await deleteMessage(id)
      if (!result.success) {
        handleSessionExpired(result.error)
        return
      }
      setMessages((prev) => prev.filter((msg) => msg.id !== id))
    } catch (error) {
      console.error("[inbox] Error in handleDeleteConfirmed:", error)
    }
  }

  const handleReport = async (id: string) => {
    try {
      const result = await reportMessage(id)
      if (!result.success) {
        handleSessionExpired(result.error)
        return
      }
      setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, isReported: true } : msg)))
    } catch (error) {
      console.error("[inbox] Error in handleReport:", error)
    }
  }

  // Shared by the active/archived/pre-claim sections so the card markup
  // isn't tripled. A pending report collapses the card behind "Mostrar"
  // until the owner chooses to reveal it.
  const renderMessageCard = (msg: Message, featured: boolean) => {
    if (msg.isReported && !revealedReported.has(msg.id)) {
      return (
        <Card key={msg.id} className="rounded-xl border-dashed">
          <CardContent className="flex items-center justify-between pt-6">
            <span className="text-sm text-muted-foreground">Mensaje reportado</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevealedReported((prev) => new Set(prev).add(msg.id))}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              Mostrar
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card
        key={msg.id}
        className={
          featured
            ? "plate-frame"
            : msg.isBroadcast
              ? "rounded-xl border-primary/40 bg-primary/5"
              : "rounded-xl"
        }
      >
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center justify-between">
            {msg.isBroadcast ? (
              <span className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-primary">
                <BadgeCheck className="h-4 w-4" />
                CAVATAR · Oficial
              </span>
            ) : msg.isVerifiedSender ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                {msg.alias}
                <BadgeCheck className="h-4 w-4 text-primary" />
              </span>
            ) : (
              <span className="font-medium text-foreground">{msg.alias}</span>
            )}
            <span className="font-label text-sm text-muted-foreground">{msg.fecha}</span>
          </div>
          <p className="mb-3 text-foreground">{msg.mensaje}</p>
          {msg.contacto && (
            <p className="text-sm text-muted-foreground">
              Contacto: {msg.contacto}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-wrap gap-3 border-t pt-4">
          {!msg.isArchived && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleArchive(msg.id)}
              className="flex-1 rounded-full text-muted-foreground hover:text-foreground"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archivar
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 rounded-full text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este mensaje?</AlertDialogTitle>
                <AlertDialogDescription>
                  Este mensaje dejará de verse en tu buzón de inmediato.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteConfirmed(msg.id)}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!msg.isBroadcast && !msg.isReported && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReport(msg.id)}
              className="flex-1 rounded-full text-muted-foreground hover:text-destructive"
            >
              <Flag className="mr-2 h-4 w-4" />
              Reportar
            </Button>
          )}
        </CardFooter>
      </Card>
    )
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
            <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
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
                onChange={(e) => setPlateNumber(normalizePlateNumber(e.target.value))}
                required
                disabled={isSubmitting}
                className="plate-frame bg-background py-6 font-plate text-lg uppercase tracking-wider text-foreground placeholder:text-muted-foreground focus:ring-foreground"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !plateNumber.trim()}
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
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
            <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
              Ingresa tu clave de acceso
            </h1>
            <p className="text-muted-foreground">
              Para acceder al buzón de{" "}
              <span className="font-plate text-foreground">{currentPlate}</span>
            </p>
          </div>

          {sessionExpiredMessage && (
            <p className="mb-6 text-sm text-destructive">{sessionExpiredMessage}</p>
          )}

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
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
            >
              {isSubmitting ? "Verificando..." : "Ingresar"}
            </Button>
          </form>

          {/* Plain <Link> — a real navigation, not a state change, so this
              can't interact with dismissedPlateRef or the auto-lookup
              effect the way the Bug 2 fix had to guard against. */}
          <Link
            href={`/inbox/forgot-password?plate=${currentPlate}`}
            className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            ¿Olvidaste tu clave?
          </Link>
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
            <h2 className="mb-3 text-xl font-bold text-foreground md:text-2xl">
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
            <h2 className="mb-3 text-xl font-bold text-foreground md:text-2xl">
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
            <h2 className="mb-3 text-xl font-bold text-foreground md:text-2xl">
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
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
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
              <span className="font-plate text-foreground">{currentPlate}</span>
            </p>
          </div>

          {/* Push notifications */}
          <div className="mb-8">
            <PushNotificationToggle plateNumber={currentPlate} />
          </div>

          {/* Remitentes — Etapa 5 */}
          <PlateSendersSection plateNumber={currentPlate} />

          {/* Banner slot */}
          <div className="mb-8">
            <BannerSlot banner={banner} />
          </div>

          {/* Messages list */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1.5} />
              <p className="text-muted-foreground">Aún no tienes mensajes.</p>
            </div>
          ) : (
            (() => {
              const activeMessages = messages.filter((m) => !m.isPreClaim && !m.isArchived)
              const archivedMessages = messages.filter((m) => !m.isPreClaim && m.isArchived)
              const preClaimMessages = messages.filter((m) => m.isPreClaim)

              return (
                <div className="flex flex-col gap-4">
                  {activeMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1.5} />
                      <p className="text-muted-foreground">Aún no tienes mensajes.</p>
                    </div>
                  ) : (
                    activeMessages.map((msg, index) => renderMessageCard(msg, index === 0))
                  )}

                  {archivedMessages.length > 0 && (
                    <div className="mt-2 border-t pt-4">
                      <button
                        type="button"
                        onClick={() => setShowArchived((v) => !v)}
                        className="flex w-full items-center justify-between font-label text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span>Archivados ({archivedMessages.length})</span>
                        {showArchived ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {showArchived && (
                        <div className="mt-4 flex flex-col gap-4">
                          {archivedMessages.map((msg) => renderMessageCard(msg, false))}
                        </div>
                      )}
                    </div>
                  )}

                  {preClaimMessages.length > 0 && (
                    <div className="mt-2 border-t pt-4">
                      <button
                        type="button"
                        onClick={() => setShowPreClaim((v) => !v)}
                        className="flex w-full items-center justify-between font-label text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span>Mensajes de antes de tu reclamo ({preClaimMessages.length})</span>
                        {showPreClaim ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {showPreClaim && (
                        <div className="mt-4 flex flex-col gap-4">
                          {preClaimMessages.map((msg) => renderMessageCard(msg, false))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()
          )}
        </div>
      </main>
    )
  }

  // Fallback - return to login
  return null
}

export function InboxContent({ banner }: { banner: BannerDTO | null }) {
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
      <InboxContentInner banner={banner} />
    </Suspense>
  )
}
