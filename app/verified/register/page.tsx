"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Register form submitted")
    setIsLoading(true)
    setErrorMessage("")

    // Validate password length
    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.")
      setIsLoading(false)
      return
    }

    console.log("[v0] Attempting to register user:", { email })

    // Note: Supabase integration required for actual registration
    // For now, simulate registration by storing in localStorage
    try {
      // Store user email in localStorage to simulate auth
      localStorage.setItem("cavatar_verified_user", JSON.stringify({ email }))
      console.log("[v0] User registered successfully (simulated)")
      
      // Redirect to returnTo URL or request page
      // Note: New users go to request page first to verify, then can return
      const redirectUrl = returnTo || "/verified/request"
      console.log("[v0] Redirecting to:", redirectUrl)
      router.push(redirectUrl)
    } catch (error) {
      console.error("[v0] Registration error:", error)
      setErrorMessage("Error al crear la cuenta. Intenta nuevamente.")
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
            Crear cuenta
          </h1>
          <p className="text-muted-foreground">
            Crea una cuenta para solicitar un perfil verificado.
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
                placeholder="Mínimo 6 caracteres"
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
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </FieldGroup>
        </form>

        {/* Login link */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link
            href={returnTo ? `/verified/login?returnTo=${encodeURIComponent(returnTo)}` : "/verified/login"}
            className="text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
          >
            Iniciar sesión
          </Link>
        </p>
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
