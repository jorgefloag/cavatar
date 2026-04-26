"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RequestPage() {
  const router = useRouter()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [useCase, setUseCase] = useState("")

  // Check if user is logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("cavatar_verified_user")
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setUserEmail(user.email || "")
      console.log("[v0] User loaded from localStorage:", user.email)
    } else {
      console.log("[v0] No user found, redirecting to login")
      router.push("/verified/login")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Request form submitted")
    setIsLoading(true)
    setErrorMessage("")

    const requestData = {
      user_email: userEmail,
      full_name: fullName,
      phone: phone,
      use_case: useCase,
      status: "pending"
    }

    console.log("[v0] Sending verification request to Supabase:", requestData)

    const { data, error } = await supabase
      .from("verified_requests")
      .insert([requestData])

    console.log("[v0] Supabase insert response - data:", data)
    console.log("[v0] Supabase insert response - error:", error)

    setIsLoading(false)

    if (error) {
      console.error("[v0] Request submission error:", error.message)
      setErrorMessage("Error al enviar la solicitud. Intenta nuevamente.")
    } else {
      console.log("[v0] Verification request saved successfully")
      setIsSubmitted(true)
    }
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-background px-4 py-16 md:py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="mb-4 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
            Tu solicitud fue enviada correctamente.
          </h1>
          <p className="mb-8 text-muted-foreground">
            Revisaremos tu solicitud y te notificaremos cuando sea aprobada.
          </p>
          <Button
            asChild
            variant="ghost"
            className="rounded-full border border-border px-6 py-5 text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
          >
            <Link href="/verified/dashboard">
              Ver estado de solicitud
            </Link>
          </Button>
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
          <h1 className="mb-3 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
            Solicitar perfil verificado
          </h1>
          <p className="text-muted-foreground">
            Completa el formulario para solicitar acceso a un perfil verificado.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-6">
            <Field>
              <FieldLabel htmlFor="fullName">Nombre completo</FieldLabel>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                required
                className="h-12 rounded-lg text-base"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <Input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                className="h-12 rounded-lg text-base"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
                required
                className="h-12 rounded-lg text-base"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="useCase">Uso previsto</FieldLabel>
              <Textarea
                id="useCase"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="Describe cómo planeas usar el perfil verificado..."
                required
                rows={4}
                className="rounded-lg text-base"
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
              {isLoading ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </FieldGroup>
        </form>
      </div>
    </main>
  )
}
