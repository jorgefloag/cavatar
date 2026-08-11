"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSignIn } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { getClerkErrorMessage } from "@/lib/auth/clerk-error-message"
import { finalizeAndRedirect } from "@/lib/auth/finalize-and-redirect"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")
  const { signIn } = useSignIn()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [deviceCode, setDeviceCode] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage("")

    try {
      const { error } = await signIn.password({ emailAddress: email, password })
      if (error) {
        const { message, expected } = getClerkErrorMessage(error, "Correo o contraseña incorrectos.")
        if (!expected) console.error("[verified/login] Login error:", error)
        setErrorMessage(message)
        return
      }

      if (signIn.status === "complete") {
        await finalizeAndRedirect(signIn, router, returnTo || "/verified/dashboard")
      } else if (signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors.find((factor) => factor.strategy === "email_code")
        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode()
        } else {
          console.error("[verified/login] needs_client_trust sin factor email_code disponible")
          setErrorMessage("No se pudo verificar el dispositivo. Intenta nuevamente.")
        }
      } else {
        console.error("[verified/login] Sign-in attempt not complete:", signIn.status)
        setErrorMessage("No se pudo iniciar sesión. Intenta nuevamente.")
      }
    } catch (error) {
      const { message, expected } = getClerkErrorMessage(error, "Correo o contraseña incorrectos.")
      if (!expected) console.error("[verified/login] Login error:", error)
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
        const { message, expected } = getClerkErrorMessage(error, "Código inválido. Intenta nuevamente.")
        if (!expected) console.error("[verified/login] Device verification error:", error)
        setErrorMessage(message)
        return
      }

      if (signIn.status === "complete") {
        await finalizeAndRedirect(signIn, router, returnTo || "/verified/dashboard")
      } else {
        console.error("[verified/login] Sign-in attempt not complete after device verification:", signIn.status)
        setErrorMessage("No se pudo verificar el dispositivo. Intenta nuevamente.")
      }
    } catch (error) {
      const { message, expected } = getClerkErrorMessage(error, "Código inválido. Intenta nuevamente.")
      if (!expected) console.error("[verified/login] Device verification error:", error)
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
      const { message, expected } = getClerkErrorMessage(error, "No se pudo reenviar el código.")
      if (!expected) console.error("[verified/login] Resend device code error:", error)
      setErrorMessage(message)
      return
    }
    setInfoMessage("Código reenviado.")
  }

  const handleStartOver = async () => {
    setErrorMessage("")
    setInfoMessage("")
    setDeviceCode("")
    await signIn.reset()
  }

  if (signIn.status === "needs_client_trust") {
    return (
      <main className="min-h-screen bg-background px-4 py-12 md:py-20">
        <div className="mx-auto max-w-md">
          {/* Header */}
          <div className="mb-10">
            <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
              Verifica tu dispositivo
            </h1>
            <p className="text-muted-foreground">
              Es la primera vez que inicias sesión desde este dispositivo. Ingresa el código que te enviamos por
              correo para confirmar que eres tú.
            </p>
          </div>

          {/* Form */}
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
        {/* Back link */}
        <Link
          href="/verified"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            Iniciar sesión
          </h1>
          <p className="text-muted-foreground">
            Ingresa a tu cuenta de perfil verificado.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
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

            <Field>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                className="h-12 rounded-lg text-base"
              />
              <Link
                href="/verified/forgot-password"
                className="self-end text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                ¿Olvidaste tu contraseña?
              </Link>
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
              {isLoading ? "Ingresando..." : "Ingresar"}
            </Button>
          </FieldGroup>
        </form>

        {/* Register link */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href={returnTo ? `/verified/register?returnTo=${encodeURIComponent(returnTo)}` : "/verified/register"}
            className="text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  )
}
