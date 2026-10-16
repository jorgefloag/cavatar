"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSignIn, useSignUp, useUser } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { getClerkErrorMessage, isIdentifierNotFoundError } from "@/lib/auth/clerk-error-message"
import { finalizeAndRedirect } from "@/lib/auth/finalize-and-redirect"
import { isInAppBrowser } from "@/lib/browser/is-in-app-browser"

type Step = "form" | "verify"
// Which Clerk resource the in-flight email-code attempt belongs to — an
// existing account signing in, or a brand-new one signing up. Decided once
// signIn.create() either succeeds (existing) or reports the identifier
// doesn't exist (new), then used to call the matching verify method.
type Pending = "signIn" | "signUp" | null

// This page never has a password field — wraps getClerkErrorMessage() and
// overrides its result if the mapped text ever mentions "contraseña"
// (e.g. CLERK_ERROR_MESSAGES' shared form_password_incorrect /
// form_identifier_not_found entry), so a password-shaped error on some
// unrelated Clerk flow can never leak confusing copy onto this page. Belt
// and suspenders on top of isIdentifierNotFoundError() actually handling
// the identifier-not-found case correctly before it ever reaches here.
function getSendLoginErrorMessage(error: unknown, fallback: string): { message: string; expected: boolean } {
  const result = getClerkErrorMessage(error, fallback)
  if (result.message.toLowerCase().includes("contraseña")) {
    return { message: fallback, expected: false }
  }
  return result
}

function SendLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || "/send"
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const { isSignedIn } = useUser()

  const [step, setStep] = useState<Step>("form")
  const [pending, setPending] = useState<Pending>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [showGoogle, setShowGoogle] = useState(true)

  // Instagram/Facebook/WhatsApp open links in an embedded WebView that
  // Google blocks for OAuth (`disallowed_useragent`) — hide the button
  // before anyone hits that error, rather than showing it and failing.
  useEffect(() => {
    setShowGoogle(!isInAppBrowser(navigator.userAgent))
  }, [])

  // Covers returning from the Google OAuth redirect: that round-trip
  // leaves and re-enters this page, so there's no explicit finalize() call
  // to hook into here the way the email-code path below has — this effect
  // is what actually completes the loop once Clerk's own script picks the
  // new session back up. Harmless if it also fires after the email-code
  // path's own finalizeAndRedirect() already navigated.
  useEffect(() => {
    if (isSignedIn) router.replace(returnTo)
  }, [isSignedIn, returnTo, router])

  const callbackUrl = `/send/login?returnTo=${encodeURIComponent(returnTo)}`

  const handleGoogle = async () => {
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage("")
    try {
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: callbackUrl,
        redirectCallbackUrl: callbackUrl,
      })
      if (error) {
        const { message, expected } = getSendLoginErrorMessage(error, "No se pudo continuar con Google. Intenta nuevamente.")
        if (!expected) console.error("[send/login] Google sign-in error:", error)
        setErrorMessage(message)
        setIsLoading(false)
      }
      // On success this navigates away to Google — no further state update here.
    } catch (error) {
      const { message, expected } = getSendLoginErrorMessage(error, "No se pudo continuar con Google. Intenta nuevamente.")
      if (!expected) console.error("[send/login] Google sign-in error:", error)
      setErrorMessage(message)
      setIsLoading(false)
    }
  }

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage("")

    try {
      const { error: createError } = await signIn.create({ identifier: email })
      if (!createError) {
        const { error: sendError } = await signIn.emailCode.sendCode()
        if (sendError) {
          const { message, expected } = getSendLoginErrorMessage(sendError, "No se pudo enviar el código. Intenta nuevamente.")
          if (!expected) console.error("[send/login] signIn send code error:", sendError)
          setErrorMessage(message)
          return
        }
        setPending("signIn")
        setStep("verify")
        return
      }

      if (!isIdentifierNotFoundError(createError)) {
        const { message, expected } = getSendLoginErrorMessage(createError, "No se pudo enviar el código. Intenta nuevamente.")
        if (!expected) console.error("[send/login] signIn create error:", createError)
        setErrorMessage(message)
        return
      }

      // No existe una cuenta con este correo — se registra una nueva.
      const { error: signUpError } = await signUp.create({ emailAddress: email })
      if (signUpError) {
        const { message, expected } = getSendLoginErrorMessage(signUpError, "No se pudo enviar el código. Intenta nuevamente.")
        if (!expected) console.error("[send/login] signUp create error:", signUpError)
        setErrorMessage(message)
        return
      }

      const { error: sendCodeError } = await signUp.verifications.sendEmailCode()
      if (sendCodeError) {
        const { message, expected } = getSendLoginErrorMessage(sendCodeError, "No se pudo enviar el código. Intenta nuevamente.")
        if (!expected) console.error("[send/login] signUp send code error:", sendCodeError)
        setErrorMessage(message)
        return
      }

      setPending("signUp")
      setStep("verify")
    } catch (error) {
      const { message, expected } = getSendLoginErrorMessage(error, "No se pudo enviar el código. Intenta nuevamente.")
      if (!expected) console.error("[send/login] Request code error:", error)
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || !pending) return
    setIsLoading(true)
    setErrorMessage("")

    try {
      if (pending === "signIn") {
        const { error } = await signIn.emailCode.verifyCode({ code })
        if (error) {
          const { message, expected } = getSendLoginErrorMessage(error, "Código inválido. Intenta nuevamente.")
          if (!expected) console.error("[send/login] signIn verify error:", error)
          setErrorMessage(message)
          return
        }
        if (signIn.status === "complete") {
          await finalizeAndRedirect(signIn, router, returnTo)
        } else {
          console.error("[send/login] signIn attempt not complete:", signIn.status)
          setErrorMessage("Código inválido. Intenta nuevamente.")
        }
      } else {
        const { error } = await signUp.verifications.verifyEmailCode({ code })
        if (error) {
          const { message, expected } = getSendLoginErrorMessage(error, "Código inválido. Intenta nuevamente.")
          if (!expected) console.error("[send/login] signUp verify error:", error)
          setErrorMessage(message)
          return
        }
        if (signUp.status === "complete") {
          await finalizeAndRedirect(signUp, router, returnTo)
        } else {
          console.error("[send/login] signUp attempt not complete:", signUp.status)
          setErrorMessage("Código inválido. Intenta nuevamente.")
        }
      }
    } catch (error) {
      const { message, expected } = getSendLoginErrorMessage(error, "Código inválido. Intenta nuevamente.")
      if (!expected) console.error("[send/login] Verify code error:", error)
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-md">
        <Link
          href={step === "form" ? "/send" : "#"}
          onClick={
            step !== "form"
              ? (e) => {
                  e.preventDefault()
                  setErrorMessage("")
                  setStep("form")
                }
              : undefined
          }
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        <div className="mb-8">
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            {step === "form" ? "Verificá tu correo" : "Ingresá el código"}
          </h1>
          <p className="text-muted-foreground">
            {step === "form"
              ? "Para evitar abusos, pedimos verificar tu correo. El dueño de la placa nunca lo ve: solo ve un código tipo “Remitente 3”."
              : `Te enviamos un código a ${email}.`}
          </p>
        </div>

        {step === "form" && (
          <div className="flex flex-col gap-6">
            {showGoogle && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleGoogle}
                  disabled={isLoading}
                  className="h-12 w-full rounded-lg text-base"
                >
                  Continuar con Google
                </Button>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  o
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

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

                {errorMessage && <p className="text-center text-sm text-destructive">{errorMessage}</p>}

                {/* Debe existir en el DOM antes de llamar signUp.create() —
                    este paso ("form") es el único que lo invoca, así que
                    basta con montarlo aquí, igual que /verified/register. */}
                <div id="clerk-captcha" />

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
                >
                  {isLoading ? "Enviando..." : "Enviar código"}
                </Button>
              </FieldGroup>
            </form>
          </div>
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

              {errorMessage && <p className="text-center text-sm text-destructive">{errorMessage}</p>}

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
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

export default function SendLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-12 md:py-20">
          <div className="mx-auto max-w-md">
            <div className="animate-pulse">
              <div className="mb-8 h-4 w-16 rounded bg-muted" />
              <div className="mb-8">
                <div className="mb-3 h-8 w-48 rounded bg-muted" />
                <div className="h-4 w-64 rounded bg-muted" />
              </div>
            </div>
          </div>
        </main>
      }
    >
      <SendLoginForm />
    </Suspense>
  )
}
