"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSignIn } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { getClerkErrorMessage, isIdentifierNotFoundError } from "@/lib/auth/clerk-error-message"
import { finalizeAndRedirect } from "@/lib/auth/finalize-and-redirect"

// Etapa 3.5 follow-up — the password view (and its "Entrar con
// contraseña" fallback) is gone now that email-code is confirmed working
// in Clerk Production and "Sign-up with password" is off there (see
// CLAUDE.md's Auth section). Email-code is the only way in, same as every
// other login page in this codebase.
type View = "code-form" | "code-verify" | "device"

// This page has no password field anymore — overrides getClerkErrorMessage()'s
// result if it ever mentions "contraseña" (e.g. the shared
// form_identifier_not_found entry, written for the password-based flows
// this migration replaced), so no stale password-shaped copy can leak
// onto this page.
function getCodeErrorMessage(error: unknown, fallback: string): { message: string; expected: boolean } {
  if (isIdentifierNotFoundError(error)) {
    return { message: "No encontramos una cuenta con este correo.", expected: true }
  }
  const result = getClerkErrorMessage(error, fallback)
  if (result.message.toLowerCase().includes("contraseña")) {
    return { message: fallback, expected: false }
  }
  return result
}

function AdminLoginFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")
  const { signIn } = useSignIn()
  const [view, setView] = useState<View>("code-form")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [deviceCode, setDeviceCode] = useState("")

  const handleFirstFactorResult = async () => {
    if (signIn.status === "complete") {
      await finalizeAndRedirect(signIn, router, returnTo || "/admin")
      return
    }
    if (signIn.status === "needs_client_trust") {
      const emailCodeFactor = signIn.supportedSecondFactors?.find((factor) => factor.strategy === "email_code")
      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode()
        setView("device")
      } else {
        console.error("[admin/login] needs_client_trust sin factor email_code disponible")
        setErrorMessage("No se pudo verificar el dispositivo. Intentá nuevamente.")
      }
      return
    }
    console.error("[admin/login] Sign-in attempt not complete:", signIn.status)
    setErrorMessage("No se pudo iniciar sesión. Intentá nuevamente.")
  }

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage("")

    try {
      const { error: createError } = await signIn.create({ identifier: email })
      if (createError) {
        const { message, expected } = getCodeErrorMessage(createError, "No se pudo enviar el código. Intentá nuevamente.")
        if (!expected) console.error("[admin/login] signIn create error:", createError)
        setErrorMessage(message)
        return
      }

      const { error: sendError } = await signIn.emailCode.sendCode()
      if (sendError) {
        const { message, expected } = getCodeErrorMessage(sendError, "No se pudo enviar el código. Intentá nuevamente.")
        if (!expected) console.error("[admin/login] send code error:", sendError)
        setErrorMessage(message)
        return
      }

      setView("code-verify")
    } catch (error) {
      const { message, expected } = getCodeErrorMessage(error, "No se pudo enviar el código. Intentá nuevamente.")
      if (!expected) console.error("[admin/login] Request code error:", error)
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage("")

    try {
      const { error } = await signIn.emailCode.verifyCode({ code })
      if (error) {
        const { message, expected } = getCodeErrorMessage(error, "Código inválido. Intentá nuevamente.")
        if (!expected) console.error("[admin/login] verify code error:", error)
        setErrorMessage(message)
        return
      }
      await handleFirstFactorResult()
    } catch (error) {
      const { message, expected } = getCodeErrorMessage(error, "Código inválido. Intentá nuevamente.")
      if (!expected) console.error("[admin/login] Verify code error:", error)
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage("")
    setInfoMessage("")

    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code: deviceCode })
      if (error) {
        const { message, expected } = getCodeErrorMessage(error, "Código inválido. Intentá nuevamente.")
        if (!expected) console.error("[admin/login] Device verification error:", error)
        setErrorMessage(message)
        return
      }

      if (signIn.status === "complete") {
        await finalizeAndRedirect(signIn, router, returnTo || "/admin")
      } else {
        console.error("[admin/login] Sign-in attempt not complete after device verification:", signIn.status)
        setErrorMessage("No se pudo verificar el dispositivo. Intentá nuevamente.")
      }
    } catch (error) {
      const { message, expected } = getCodeErrorMessage(error, "Código inválido. Intentá nuevamente.")
      if (!expected) console.error("[admin/login] Device verification error:", error)
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendDeviceCode = async () => {
    setErrorMessage("")
    setInfoMessage("")
    const { error } = await signIn.mfa.sendEmailCode()
    if (error) {
      const { message, expected } = getCodeErrorMessage(error, "No se pudo reenviar el código.")
      if (!expected) console.error("[admin/login] Resend device code error:", error)
      setErrorMessage(message)
      return
    }
    setInfoMessage("Código reenviado.")
  }

  const handleStartOver = async () => {
    setErrorMessage("")
    setInfoMessage("")
    setDeviceCode("")
    setCode("")
    setView("code-form")
    await signIn.reset()
  }

  if (view === "device") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-md">
          <div className="mb-10">
            <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
              Verificá tu dispositivo
            </h1>
            <p className="text-muted-foreground">
              Es la primera vez que iniciás sesión desde este dispositivo. Ingresá el código que te enviamos por
              correo para confirmar que sos vos.
            </p>
          </div>

          <form onSubmit={handleVerifyDevice}>
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel htmlFor="deviceCode">Código de verificación</FieldLabel>
                <Input
                  id="deviceCode"
                  type="text"
                  inputMode="numeric"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value)}
                  placeholder="123456"
                  required
                  className="h-12 rounded-lg text-base"
                />
              </Field>

              {errorMessage && (
                <p className="text-center text-sm text-destructive">{errorMessage}</p>
              )}
              {infoMessage && (
                <p className="text-center text-sm text-muted-foreground">{infoMessage}</p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="mt-4 w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
              >
                {isLoading ? "Verificando..." : "Verificar"}
              </Button>
            </FieldGroup>
          </form>

          <div className="mt-6 flex justify-center gap-6 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={handleResendDeviceCode}
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Reenviar código
            </button>
            <button
              type="button"
              onClick={handleStartOver}
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Volver a intentar
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        <div className="mb-10">
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            Acceso de administrador
          </h1>
          <p className="text-muted-foreground">
            {view === "code-verify" ? `Te enviamos un código a ${email}.` : "Ingresá con tu cuenta de administrador."}
          </p>
        </div>

        {view === "code-form" && (
          <form onSubmit={handleRequestCode}>
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="h-12 rounded-lg text-base"
                />
              </Field>

              {errorMessage && (
                <p className="text-center text-sm text-destructive">{errorMessage}</p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="mt-4 w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
              >
                {isLoading ? "Enviando..." : "Enviar código"}
              </Button>
            </FieldGroup>
          </form>
        )}

        {view === "code-verify" && (
          <form onSubmit={handleVerifyCode}>
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel htmlFor="code">Código de verificación</FieldLabel>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                  className="h-12 rounded-lg text-base"
                />
              </Field>

              {errorMessage && (
                <p className="text-center text-sm text-destructive">{errorMessage}</p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="mt-4 w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
              >
                {isLoading ? "Verificando..." : "Verificar código"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </div>
    </main>
  )
}

export function AdminLoginForm() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-md">
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
      <AdminLoginFormInner />
    </Suspense>
  )
}
