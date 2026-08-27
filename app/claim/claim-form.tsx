"use client"

import { useState } from "react"
import Link from "next/link"
import { submitClaim } from "./actions"
import { ArrowLeft, CheckCircle2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { normalizePlateNumber } from "@/lib/plates/normalize-plate"

function Step({
  number,
  title,
  description,
  isLast = false,
  children,
}: {
  number: number
  title: string
  description?: string
  isLast?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground font-label text-sm text-background">
          {number}
        </div>
        {!isLast && <div className="mt-2 w-px flex-1 bg-border" />}
      </div>
      <div className={isLast ? "flex-1" : "flex-1 pb-8"}>
        <h2 className="font-label text-sm uppercase tracking-wide text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  )
}

export function ClaimForm({
  sinpePhoneNumber,
  whatsappPhoneNumber,
}: {
  sinpePhoneNumber: string | undefined
  whatsappPhoneNumber: string | undefined
}) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [plateNumber, setPlateNumber] = useState("")
  const [email, setEmail] = useState("")
  const [vehicleBrand, setVehicleBrand] = useState("")
  const [carName, setCarName] = useState("")
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    const result = await submitClaim({
      plateNumber,
      email,
      vehicleBrand,
      carName: carName || undefined,
    })

    setIsLoading(false)

    if (!result.success) {
      setErrorMessage(result.error || "Error al enviar la solicitud.")
    } else {
      setPlateNumber("")
      setEmail("")
      setVehicleBrand("")
      setCarName("")
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
          <h1 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
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
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            Reclamar placa
          </h1>
          <p className="text-muted-foreground">
            Completa el formulario para reclamar tu placa.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-6">
            {/* Steps: plate first, then payment instructions, all driven by plateNumber */}
            <div className="mb-2 flex flex-col">
              <Step number={1} title="Ingresá tu placa">
                <Field>
                  <FieldLabel htmlFor="plate">Número de placa</FieldLabel>
                  <Input
                    id="plate"
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(normalizePlateNumber(e.target.value))}
                    placeholder="ABC-123"
                    required
                    className="h-12 rounded-lg font-plate text-base uppercase tracking-wider"
                  />
                </Field>
              </Step>

              <Step number={2} title="Pagá vía SINPE">
                <div className="rounded-xl border border-border bg-muted/30 p-5">
                  <p className="text-2xl font-bold text-foreground">₡5,000 / año</p>
                  <p className="mt-1 text-sm text-muted-foreground">Activa tu buzón privado por 1 año.</p>

                  {sinpePhoneNumber && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">Pagá vía SINPE Móvil a:</p>
                      <p className="font-label text-lg tracking-wide text-foreground">{sinpePhoneNumber}</p>
                    </div>
                  )}

                  <div className="mt-4 rounded-lg border border-dashed border-border p-3">
                    <p className="text-sm text-muted-foreground">
                      En el campo de <strong className="text-foreground">Detalle / Motivo</strong> de la
                      transferencia, escribí tu placa:
                    </p>
                    {plateNumber ? (
                      <p className="mt-1 font-plate text-lg uppercase tracking-wider text-foreground">
                        {plateNumber}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Completá tu placa en el paso 1 para ver el detalle exacto.
                      </p>
                    )}
                  </div>
                </div>
              </Step>

              <Step number={3} title="Enviá el comprobante" description="Por WhatsApp, nunca lo subas a CAVATAR.">
                {whatsappPhoneNumber && (
                  <a
                    href={`https://wa.me/${whatsappPhoneNumber}?text=${encodeURIComponent(
                      plateNumber ? `Comprobante de pago para la placa ${plateNumber}` : "Comprobante de pago",
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all hover:bg-foreground/90"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Enviar comprobante por WhatsApp
                  </a>
                )}
              </Step>

              <Step number={4} title="Llená el formulario" isLast>
                <div className="flex flex-col gap-6">
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

                  <Field>
                    <FieldLabel htmlFor="carName">
                      Nombre del carro
                      <span className="ml-1 text-muted-foreground font-normal">(opcional)</span>
                    </FieldLabel>
                    <Input
                      id="carName"
                      type="text"
                      value={carName}
                      onChange={(e) => setCarName(e.target.value)}
                      placeholder='Ej. "El Rayo"'
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
                    <p className="text-center text-sm text-destructive">{errorMessage}</p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading || !acceptedPrivacy}
                    className="mt-4 w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
                  >
                    {isLoading ? "Enviando..." : "Enviar solicitud"}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Revisamos tu pago y tu solicitud antes de activar tu buzón. Te avisaremos por correo en cuanto
                    tengamos una respuesta.
                  </p>
                </div>
              </Step>
            </div>
          </FieldGroup>
        </form>
      </div>
    </main>
  )
}
