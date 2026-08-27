"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { submitMessage, checkVerifiedStatus } from "./actions"
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

// =============================================================================
// ANTI-SPAM CONFIGURATION
// =============================================================================
// Simple rate limiting: max 3 messages per hour using localStorage only
// Verified users (status = "approved" in verified_requests) bypass this limit
// =============================================================================

const MAX_MESSAGES_PER_HOUR = 3
const STORAGE_KEY = "cavatar_send_timestamps"
const FORM_DATA_KEY = "cavatar_send_form_data"

// Save form data to sessionStorage before redirecting to login
function saveFormData(data: { plateNumber: string; name: string; message: string; contact: string }): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(FORM_DATA_KEY, JSON.stringify(data))
}

// Restore form data from sessionStorage after login redirect
function getFormData(): { plateNumber: string; name: string; message: string; contact: string } | null {
  if (typeof window === "undefined") return null
  const stored = sessionStorage.getItem(FORM_DATA_KEY)
  if (!stored) return null
  sessionStorage.removeItem(FORM_DATA_KEY) // Clear after reading
  return JSON.parse(stored)
}

// Get timestamps from last 60 minutes
function getRecentTimestamps(): number[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []

  const timestamps: number[] = JSON.parse(stored)
  const oneHourAgo = Date.now() - 60 * 60 * 1000

  // Filter to only timestamps within the last hour
  return timestamps.filter((ts) => ts > oneHourAgo)
}

// Save a new timestamp
function saveTimestamp(): void {
  const recent = getRecentTimestamps()
  recent.push(Date.now())
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
}

// Check if user can send (has remaining messages)
function canSendMessage(): boolean {
  return getRecentTimestamps().length < MAX_MESSAGES_PER_HOUR
}

// Get remaining messages count
function getRemainingMessages(): number {
  return Math.max(0, MAX_MESSAGES_PER_HOUR - getRecentTimestamps().length)
}

export function SendForm({ banner }: { banner: BannerDTO | null }) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingVerification, setIsCheckingVerification] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [plateNumber, setPlateNumber] = useState("")
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [contact, setContact] = useState("")
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  // Anti-spam state
  const [isBlocked, setIsBlocked] = useState(false)
  const [remainingMessages, setRemainingMessages] = useState(MAX_MESSAGES_PER_HOUR)

  // Verified user state
  const [isVerifiedUser, setIsVerifiedUser] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Restore form data on mount (after returning from login)
  useEffect(() => {
    const savedData = getFormData()
    if (savedData) {
      setPlateNumber(savedData.plateNumber || "")
      setName(savedData.name || "")
      setMessage(savedData.message || "")
      setContact(savedData.contact || "")
    }
  }, [])

  // Function to save form and redirect to login
  const handleLoginRedirect = () => {
    saveFormData({ plateNumber, name, message, contact })
    window.location.href = "/verified/login?returnTo=/send"
  }

  // Check spam status on mount and periodically (only for non-verified users)
  const updateSpamStatus = useCallback(() => {
    // Verified users are never blocked
    if (isVerifiedUser) {
      setIsBlocked(false)
      setRemainingMessages(Infinity)
      return
    }

    const canSend = canSendMessage()
    const remaining = getRemainingMessages()
    setIsBlocked(!canSend)
    setRemainingMessages(remaining)
  }, [isVerifiedUser])

  // Check if user is verified on mount (identity resolved server-side via Clerk, never trusted from the client)
  useEffect(() => {
    checkVerifiedStatus().then(({ verified, email }) => {
      setUserEmail(email)
      setIsVerifiedUser(verified)
      setIsCheckingVerification(false)
    })
  }, [])

  useEffect(() => {
    if (isCheckingVerification) return

    updateSpamStatus()
    // Check every 10 seconds to update remaining count
    const interval = setInterval(updateSpamStatus, 10000)
    return () => clearInterval(interval)
  }, [updateSpamStatus, isCheckingVerification])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!acceptedPrivacy) return

    // Double-check spam status before submitting (verified users bypass this)
    if (!isVerifiedUser && !canSendMessage()) {
      console.log("[v0] Non-verified user blocked by rate limit")
      setIsBlocked(true)
      setRemainingMessages(0)
      return
    }

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
    } else {
      // Only record timestamp for rate limiting if user is NOT verified
      if (!isVerifiedUser) {
        saveTimestamp()
        updateSpamStatus()
      }

      setPlateNumber("")
      setName("")
      setMessage("")
      setContact("")
      setAcceptedPrivacy(false)
      setIsSubmitted(true)
    }
  }

  // Determine if button should be disabled (verified users are never blocked)
  const isButtonDisabled = isLoading || (!isVerifiedUser && isBlocked) || isCheckingVerification || !acceptedPrivacy

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
            {isVerifiedUser ? (
              "Puedes seguir enviando mensajes sin limite"
            ) : (
              `Te quedan ${remainingMessages} mensaje${remainingMessages !== 1 ? "s" : ""} en esta hora`
            )}
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
          {isCheckingVerification ? (
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
                Envia mensajes sin limite
              </p>
            </div>
          ) : isBlocked ? (
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-medium text-foreground">
                Has alcanzado el limite del modo estandar
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Accede a un perfil verificado para continuar sin limite
              </p>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleLoginRedirect}
                className="mt-4 rounded-full"
              >
                Obtener perfil verificado
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-muted-foreground" />
                Modo estandar
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Puedes enviar hasta 3 mensajes por hora
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Quieres enviar sin limite?
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoginRedirect}
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
                {isCheckingVerification ? "Cargando..." : isLoading ? "Enviando..." : "Enviar mensaje"}
              </Button>
              {/* Subtle error message when limit reached */}
              {!isCheckingVerification && !isVerifiedUser && isBlocked && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Limite alcanzado. Intenta mas tarde o accede a un perfil verificado.
                </p>
              )}
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
