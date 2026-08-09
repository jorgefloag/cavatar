"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { submitVerifiedRequest } from "./actions"

export function RequestForm({ userEmail }: { userEmail: string }) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [useCase, setUseCase] = useState("")
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedPrivacy) return
    setIsLoading(true)
    setErrorMessage("")

    const result = await submitVerifiedRequest({ fullName, phone, useCase })

    setIsLoading(false)

    if (!result.success) {
      setErrorMessage(result.error || "Error al enviar la solicitud. Intenta nuevamente.")
    } else {
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
            <Link href="/verified/dashboard">Ver estado de solicitud</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-md">
        <Link
          href="/verified"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        <div className="mb-10">
          <h1 className="mb-3 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
            Solicitar perfil verificado
          </h1>
          <p className="text-muted-foreground">
            Completa el formulario para solicitar acceso a un perfil verificado.
          </p>
        </div>

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
                disabled
                className="h-12 rounded-lg text-base disabled:opacity-70"
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

            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptedPrivacy"
                checked={acceptedPrivacy}
                onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="acceptedPrivacy" className="text-sm font-normal text-muted-foreground">
                He leído y acepto el{" "}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  Aviso de Privacidad
                </a>{" "}
                de CAVATAR.
              </Label>
            </div>

            {errorMessage && (
              <p className="text-center text-sm text-red-500">{errorMessage}</p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !acceptedPrivacy}
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
