"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSignIn } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { getClerkErrorMessage } from "@/lib/auth/clerk-error-message"
import { finalizeAndRedirect } from "@/lib/auth/finalize-and-redirect"
import { revokeOtherSessions } from "@/lib/auth/revoke-other-sessions"

type Step = "request" | "verify" | "reset"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { signIn } = useSignIn()
  const [step, setStep] = useState<Step>("request")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage("")

    try {
      const { error: createError } = await signIn.create({ identifier: email })
      if (createError) {
        if (createError.code === "form_identifier_not_found") {
          // No revelamos si el correo tiene cuenta o no: avanzamos igual.
          setStep("verify")
          return
        }
        const { message, expected } = getClerkErrorMessage(createError, "No se pudo enviar el código. Intenta nuevamente.")
        if (!expected) console.error("[verified/forgot-password] Request code error:", createError)
        setErrorMessage(message)
        return
      }

      const { error: sendCodeError } = await signIn.resetPasswordEmailCode.sendCode()
      if (sendCodeError) {
        if (sendCodeError.code === "form_identifier_not_found") {
          setStep("verify")
          return
        }
        const { message, expected } = getClerkErrorMessage(sendCodeError, "No se pudo enviar el código. Intenta nuevamente.")
        if (!expected) console.error("[verified/forgot-password] Send code error:", sendCodeError)
        setErrorMessage(message)
        return
      }

      setStep("verify")
    } catch (error) {
      const { message, expected } = getClerkErrorMessage(error, "No se pudo enviar el código. Intenta nuevamente.")
      if (!expected) console.error("[verified/forgot-password] Request code error:", error)
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
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code })
      if (error) {
        const { message, expected } = getClerkErrorMessage(error, "Código inválido. Intenta nuevamente.")
        if (!expected) console.error("[verified/forgot-password] Verify code error:", error)
        setErrorMessage(message)
        return
      }
      setStep("reset")
    } catch (error) {
      const { message, expected } = getClerkErrorMessage(error, "Código inválido. Intenta nuevamente.")
      if (!expected) console.error("[verified/forgot-password] Verify code error:", error)
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setErrorMessage("")

    if (newPassword.length < 8) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.")
      return
    }

    setIsLoading(true)
    try {
      // Sin signOutOfOtherSessions: el flag hace que Clerk rechace la petición con 422
      // ("sign_out_of_other_sessions is not a valid parameter for this request") en esta
      // instancia. El mismo efecto (cerrar las otras sesiones) se logra abajo con
      // revokeOtherSessions() vía Backend API, una vez que la sesión nueva esté activa.
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      })
      if (error) {
        const { message, expected } = getClerkErrorMessage(error, "No se pudo guardar la contraseña. Intenta nuevamente.")
        if (!expected) console.error("[verified/forgot-password] Reset password error:", error)
        setErrorMessage(message)
        return
      }

      if (signIn.status === "complete") {
        await finalizeAndRedirect(signIn, router, "/verified/dashboard")
        const revoked = await revokeOtherSessions()
        if (!revoked.success) {
          console.error("[verified/forgot-password] No se pudieron revocar otras sesiones:", revoked.error)
        }
      } else {
        // needs_client_trust también es un status posible acá en teoría (es el mismo
        // recurso `signIn` que en login), pero Clerk no lo documenta para este flujo.
        // Fallback genérico + log para no dejar al usuario en una pantalla rota;
        // si el log confirma que ocurre en la práctica, se porta la verificación de
        // dispositivo de login/page.tsx a este archivo también.
        console.error("[verified/forgot-password] Sign-in attempt not complete after reset:", signIn.status)
        setErrorMessage("No se pudo guardar la contraseña. Intenta nuevamente.")
      }
    } catch (error) {
      const { message, expected } = getClerkErrorMessage(error, "No se pudo guardar la contraseña. Intenta nuevamente.")
      if (!expected) console.error("[verified/forgot-password] Reset password error:", error)
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
          href={step === "request" ? "/verified/login" : "#"}
          onClick={
            step !== "request"
              ? (e) => {
                  e.preventDefault()
                  setErrorMessage("")
                  setStep("request")
                }
              : undefined
          }
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            {step === "request" && "Recuperar contraseña"}
            {step === "verify" && "Verifica tu correo"}
            {step === "reset" && "Define tu nueva contraseña"}
          </h1>
          <p className="text-muted-foreground">
            {step === "request" && "Ingresa tu correo y te enviaremos un código para recuperar el acceso."}
            {step === "verify" && "Si el correo tiene una cuenta, te enviamos un código de verificación."}
            {step === "reset" && "Elige una contraseña nueva para tu cuenta."}
          </p>
        </div>

        {step === "request" && (
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

        {step === "verify" && (
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

        {step === "reset" && (
          <form onSubmit={handleResetPassword}>
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel htmlFor="newPassword">Nueva contraseña</FieldLabel>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="h-12 rounded-lg text-base"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirmar contraseña</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
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
                {isLoading ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </div>
    </main>
  )
}
