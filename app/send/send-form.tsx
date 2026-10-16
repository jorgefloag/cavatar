"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { submitMessage, checkVerifiedStatus, ensureSenderRegistered } from "./actions"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { BannerSlot } from "@/components/banner-slot"
import type { BannerDTO } from "@/lib/banners/get-banner"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"

const FORM_DATA_KEY = "cavatar_send_form_data"

type SavedFormData = { plateNumber: string; name: string; message: string; contact: string; acceptedPrivacy: boolean }

// Save form data to sessionStorage before redirecting to /send/login —
// acceptedPrivacy is included so a returning, now-registered sender's
// auto-submit (see the effect below) doesn't get blocked by a consent
// checkbox that reset to unchecked on remount.
function saveFormData(data: SavedFormData): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(FORM_DATA_KEY, JSON.stringify(data))
}

// Restore form data from sessionStorage after the registration redirect
function getFormData(): SavedFormData | null {
  if (typeof window === "undefined") return null
  const stored = sessionStorage.getItem(FORM_DATA_KEY)
  if (!stored) return null
  sessionStorage.removeItem(FORM_DATA_KEY) // Clear after reading
  return JSON.parse(stored)
}

export function SendForm({ banner }: { banner: BannerDTO | null }) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [plateNumber, setPlateNumber] = useState("")
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [contact, setContact] = useState("")
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const [remainingMessages, setRemainingMessages] = useState<number | null>(null)

  // Verified user state
  const [isVerifiedUser, setIsVerifiedUser] = useState(false)

  // Paso 2 — registration is mandatory from the first message. Resolved
  // server-side (getOrCreateSender() inside ensureSenderRegistered()),
  // never trusted from the client.
  const [isRegistered, setIsRegistered] = useState(false)

  // Set synchronously on mount if a draft was restored, so the auto-submit
  // effect below knows this page load is a "returning from /send/login"
  // case rather than a fresh visit — a ref, not state, so it carries no
  // render-scheduling dependency the way a state flag would (same
  // reasoning as inbox-content.tsx's dismissedPlateRef for the Bug 2 fix).
  const returnedFromLoginRef = useRef(false)
  const hasAutoSubmittedRef = useRef(false)

  // Restore form data on mount (after returning from /send/login)
  useEffect(() => {
    const savedData = getFormData()
    if (savedData) {
      returnedFromLoginRef.current = true
      setPlateNumber(savedData.plateNumber || "")
      setName(savedData.name || "")
      setMessage(savedData.message || "")
      setContact(savedData.contact || "")
      setAcceptedPrivacy(savedData.acceptedPrivacy ?? false)
    }
  }, [])

  // Identity resolved server-side via Clerk, never trusted from the client.
  useEffect(() => {
    Promise.all([checkVerifiedStatus(), ensureSenderRegistered()]).then(([verifiedResult, senderResult]) => {
      setIsVerifiedUser(verifiedResult.verified)
      setIsRegistered(senderResult.registered)
      setIsCheckingStatus(false)
    })
  }, [])

  // Auto-submit once: only when this mount restored a saved draft AND the
  // registration check has now resolved to true — i.e. exactly the
  // "just came back from /send/login, already registered" case. Waiting on
  // `message` too (not just the status flags) so this never fires before
  // the restored draft has actually landed in state.
  useEffect(() => {
    if (!returnedFromLoginRef.current) return
    if (hasAutoSubmittedRef.current) return
    if (isCheckingStatus || !isRegistered) return
    if (!message || !plateNumber) return

    hasAutoSubmittedRef.current = true
    void performSubmit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingStatus, isRegistered, message, plateNumber])

  const redirectToSendLogin = () => {
    saveFormData({ plateNumber, name, message, contact, acceptedPrivacy })
    window.location.href = "/send/login?returnTo=/send"
  }

  const handleUpgradeToVerified = () => {
    saveFormData({ plateNumber, name, message, contact, acceptedPrivacy })
    window.location.href = "/verified/login?returnTo=/send"
  }

  const performSubmit = async () => {
    setIsLoading(true)
    setErrorMessage("")

    const result = await submitMessage({
      plateNumber,
      name: name || undefined,
      message,
      contact: contact || undefined,
    })

    setIsLoading(false)

    if (!result.success) {
      setErrorMessage(result.error || "Error al enviar mensaje. Intenta nuevamente.")
      return
    }

    if (typeof result.remainingThisHour === "number") {
      setRemainingMessages(result.remainingThisHour)
    }
    setPlateNumber("")
    setName("")
    setMessage("")
    setContact("")
    setAcceptedPrivacy(false)
    setIsSubmitted(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!acceptedPrivacy) return

    // Registration is mandatory from the first message — the draft is
    // preserved and resumed automatically once they return, see the
    // auto-submit effect above.
    if (!isRegistered) {
      redirectToSendLogin()
      return
    }

    await performSubmit()
  }

  const isButtonDisabled = isLoading || isCheckingStatus || !acceptedPrivacy

  const characterCount = message.length
  const maxCharacters = 300

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-background px-4 py-16 md:py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
            Mensaje enviado correctamente
          </h1>
          <p className="mb-4 text-muted-foreground">
            Si esta placa aun no ha sido reclamada, el mensaje quedara guardado hasta que el dueno la registre.
          </p>
          {/* User-specific feedback */}
          <p className="mb-8 text-sm text-muted-foreground">
            {remainingMessages !== null
              ? `Te quedan ${remainingMessages} mensaje${remainingMessages !== 1 ? "s" : ""} en esta hora`
              : isVerifiedUser
                ? "Como perfil verificado, podés enviar hasta 20 mensajes por hora"
                : "Podés enviar hasta 3 mensajes por hora"}
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button
              asChild
              variant="ghost"
              className="rounded-full border border-border px-6 py-5 text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio
              </Link>
            </Button>
            <Button
              variant="link"
              className="text-sm text-muted-foreground"
              onClick={() => setIsSubmitted(false)}
            >
              Enviar otro mensaje
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            Enviar mensaje
          </h1>
          <p className="text-muted-foreground">
            Escribe la placa del vehículo y deja tu mensaje.
          </p>
        </div>

        {/* User status card - the only indicator of user status */}
        <div className="mb-8 rounded-xl border border-border bg-muted/30 p-5">
          {isCheckingStatus ? (
            <div className="flex items-center justify-center py-2">
              <p className="text-sm text-muted-foreground">Verificando estado...</p>
            </div>
          ) : isVerifiedUser ? (
            <div className="text-center">
              <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Perfil verificado
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Hasta 20 mensajes por hora
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-muted-foreground" />
                Modo estándar
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Hasta 3 mensajes por hora
                {!isRegistered && " — te vamos a pedir verificar tu correo al enviar"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Querés enviar hasta 20 mensajes por hora?
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUpgradeToVerified}
                className="mt-2 rounded-full text-xs"
              >
                Acceder / crear perfil verificado
              </Button>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-6">
            <Field>
              <FieldLabel htmlFor="plate">Número de placa</FieldLabel>
              <Input
                id="plate"
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(normalizePlateNumber(e.target.value))}
                placeholder="ABC-123"
                required
                className="h-12 rounded-lg font-plate text-base uppercase tracking-wider"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="name">
                Nombre o alias
                <span className="ml-1 text-muted-foreground font-normal">(opcional)</span>
              </FieldLabel>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre o alias"
                className="h-12 rounded-lg text-base"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="message">Mensaje</FieldLabel>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, maxCharacters))}
                placeholder="Escribe tu mensaje aquí..."
                required
                rows={4}
                className="rounded-lg text-base"
              />
              <FieldDescription className="text-right">
                {characterCount}/{maxCharacters} caracteres
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="contact">
                Contacto
                <span className="ml-1 text-muted-foreground font-normal">(opcional)</span>
              </FieldLabel>
              <Input
                id="contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="WhatsApp, teléfono o correo"
                className="h-12 rounded-lg text-base"
              />
            </Field>

            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptedPrivacy"
                checked={acceptedPrivacy}
                onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="acceptedPrivacy" className="text-sm font-normal text-muted-foreground">
                Entiendo que mi mensaje (y el alias/contacto que incluya) será visible públicamente para quien
                consulte esta placa, y acepto el{" "}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  Aviso de Privacidad
                </a>
                .
              </Label>
            </div>

            {errorMessage && (
              <p className="text-center text-sm text-destructive">{errorMessage}</p>
            )}

            <div className="mt-2">
              <Button
                type="submit"
                size="lg"
                disabled={isButtonDisabled}
                className="w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
              >
                {isCheckingStatus ? "Cargando..." : isLoading ? "Enviando..." : "Enviar mensaje"}
              </Button>
            </div>
          </FieldGroup>
        </form>

        <div className="mt-10">
          <BannerSlot banner={banner} />
        </div>
      </div>
    </main>
  )
}
