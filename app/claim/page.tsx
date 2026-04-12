"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export default function ClaimPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [plateNumber, setPlateNumber] = useState("")
  const [email, setEmail] = useState("")
  const [vehicleBrand, setVehicleBrand] = useState("")

  // Clear any previous claim state on mount - always start fresh
  useEffect(() => {
    console.log("[v0] Opening fresh claim form - clearing any previous claim state")
    // Clear claim-related localStorage items (but NOT inbox email which is separate)
    localStorage.removeItem("cavatar_claim_plate")
    localStorage.removeItem("cavatar_claim_email")
    localStorage.removeItem("cavatar_claim_state")
    // Reset form state to ensure fresh start
    setIsSubmitted(false)
    setErrorMessage("")
    setPlateNumber("")
    setEmail("")
    setVehicleBrand("")
    console.log("[v0] Claim form reset complete - ready for new submission")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Claim form submitted")
    setIsLoading(true)
    setErrorMessage("")

    console.log("[v0] Sending claim request:", { 
      plate_number: plateNumber, 
      email: email, 
      vehicle_brand: vehicleBrand 
    })

    const { data, error } = await supabase
      .from("claim_requests")
      .insert([
        {
          plate_number: plateNumber,
          email: email,
          vehicle_brand: vehicleBrand,
        },
      ])

    console.log("[v0] Supabase response:", { data, error })

    setIsLoading(false)

    if (error) {
      console.error("[v0] Supabase error:", error)
      setErrorMessage("Error al enviar la solicitud.")
    } else {
      console.log("[v0] Claim request successful, clearing form")
      localStorage.setItem("claimEmail", email)
      console.log("Saved claim email:", email)
      setPlateNumber("")
      setEmail("")
      setVehicleBrand("")
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
