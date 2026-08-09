"use client"

import { useState } from "react"
import Link from "next/link"
import { submitClaim } from "./actions"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export default function ClaimPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [plateNumber, setPlateNumber] = useState("")
  const [email, setEmail] = useState("")
  const [vehicleBrand, setVehicleBrand] = useState("")
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    const result = await submitClaim({
      plateNumber,
      email,
      vehicleBrand,
    })

    setIsLoading(false)

    if (!result.success) {
      setErrorMessage(result.error || "Error al enviar la solicitud.")
    } else {
      setPlateNumber("")
      setEmail("")
      setVehicleBrand("")
      setAcceptedPrivacy(false)
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
            Revisaremos tu solicitud y te contactaremos pronto.
          </p>
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
        <div className="mb-10">
          <h1 className="mb-3 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
            Reclamar placa
          </h1>
          <p className="text-muted-foreground">
            Completa el formulario para reclamar tu placa.
          </p>
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
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                required
                className="h-12 rounded-lg font-mono text-base uppercase tracking-wider"
              />
            </Field>

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
              <FieldLabel htmlFor="vehicleBrand">Marca del vehículo</FieldLabel>
              <Input
                id="vehicleBrand"
                type="text"
                value={vehicleBrand}
                onChange={(e) => setVehicleBrand(e.target.value)}
                placeholder="Toyota, Honda, Ford..."
                required
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
