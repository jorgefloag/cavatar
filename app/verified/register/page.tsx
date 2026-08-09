"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSignUp } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { getClerkErrorMessage } from "@/lib/auth/clerk-error-message"
import { finalizeAndRedirect } from "@/lib/auth/finalize-and-redirect"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")
  const { signUp } = useSignUp()
  const [step, setStep] = useState<"form" | "verify">("form")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage("")

    if (password.length < 8) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await signUp.password({ emailAddress: email, password })
      if (error) {
        const { message, expected } = getClerkErrorMessage(error, "Error al crear la cuenta. Intenta nuevamente.")
        if (!expected) console.error("[verified/register] Registration error:", error)
        setErrorMessage(message)
        return
      }

      const sendResult = await signUp.verifications.sendEmailCode()
      if (sendResult.error) {
        const { message, expected } = getClerkErrorMessage(
          sendResult.error,
          "Error al enviar el código de verificación. Intenta nuevamente.",
        )
        if (!expected) console.error("[verified/register] Send code error:", sendResult.error)
        setErrorMessage(message)
        return
      }

      setStep("verify")
    } catch (error) {
      const { message, expected } = getClerkErrorMessage(error, "Error al crear la cuenta. Intenta nuevamente.")
      if (!expected) console.error("[verified/register] Registration error:", error)
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage("")

    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code })
      if (error) {
        const { message, expected } = getClerkErrorMessage(error, "Código inválido. Intenta nuevamente.")
        if (!expected) console.error("[verified/register] Verification error:", error)
        setErrorMessage(message)
        return
      }

      if (signUp.status === "complete") {
        await finalizeAndRedirect(signUp, router, returnTo || "/verified/request")
      } else {
        console.error("[verified/register] Sign-up attempt not complete:", signUp.status)
        setErrorMessage("Código inválido. Intenta nuevamente.")
      }
    } catch (error) {
      const { message, expected } = getClerkErrorMessage(error, "Código inválido. Intenta nuevamente.")
      if (!expected) console.error("[verified/register] Verification error:", error)
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
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
          <h1 className="mb-3 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
            {step === "form" ? "Crear cuenta" : "Verifica tu correo"}
          </h1>
          <p className="text-muted-foreground">
            {step === "form"
              ? "Crea una cuenta para solicitar un perfil verificado."
              : `Ingresa el código que enviamos a ${email}.`}
          </p>
        </div>

        {step === "form" ? (
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
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="h-12 rounded-lg text-base"
                />
              </Field>

              {errorMessage && (
                <p className="text-center text-sm text-red-500">{errorMessage}</p>
              )}

              <div id="clerk-captcha" />

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="mt-4 w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl disabled:opacity-50"
              >
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </FieldGroup>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
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
                <p className="text-center text-sm text-red-500">{errorMessage}</p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="mt-4 w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl disabled:opacity-50"
              >
                {isLoading ? "Verificando..." : "Verificar código"}
              </Button>
            </FieldGroup>
          </form>
        )}

        {/* Login link */}
        {step === "form" && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href={returnTo ? `/verified/login?returnTo=${encodeURIComponent(returnTo)}` : "/verified/login"}
              className="text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
            >
              Iniciar sesión
            </Link>
          </p>
        )}
      </div>
    </main>
  )
}

export default function RegisterPage() {
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
      <RegisterForm />
    </Suspense>
  )
}
