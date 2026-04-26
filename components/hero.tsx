"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight } from "lucide-react"

export function Hero() {
  const router = useRouter()
  const [plateNumber, setPlateNumber] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (plateNumber.trim()) {
      // Navigate to inbox - the inbox page handles the plate lookup
      router.push(`/inbox?plate=${encodeURIComponent(plateNumber.trim().toUpperCase())}`)
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center overflow-x-hidden px-6 py-20">
      <div className="mx-auto w-full max-w-2xl text-center">
        {/* Logo / Brand - Primary visual element */}
        <div className="mb-6">
          <span className="block text-5xl font-black tracking-tight text-foreground sm:text-6xl md:text-8xl lg:text-9xl">
            CAVATAR
          </span>
        </div>

        {/* Headlines - Bold, secondary prominence */}
        <div className="mb-10">
          <h1 className="mb-4 text-2xl font-black uppercase leading-[0.9] tracking-tight text-foreground sm:text-3xl md:text-5xl lg:text-6xl">
            ALGUIEN TE ESCRIBIÓ
          </h1>
          <p className="text-lg font-medium text-muted-foreground md:text-xl">
            Ingresa tu placa para leer tus mensajes
          </p>
        </div>

        {/* Plate Input Form */}
        <form onSubmit={handleSubmit} className="mb-10">
          <div className="mb-6">
            <Input
              type="text"
              placeholder="ABC123"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
              className="h-20 rounded-lg border-2 border-border bg-input text-center font-mono text-3xl uppercase tracking-[0.2em] text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:ring-0 md:text-4xl"
              maxLength={10}
            />
          </div>
          <Button 
            type="submit"
            size="lg" 
            disabled={!plateNumber.trim()}
            className="h-14 w-full rounded-lg bg-primary px-8 text-lg font-black uppercase tracking-wide text-primary-foreground transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 md:h-16 md:text-xl"
          >
            Ver mensajes
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>

        {/* Tagline */}
        <p className="mb-10 font-mono text-sm text-muted-foreground">
          Tienes una nueva alerta, un nuevo saludo, o un nuevo recado
        </p>

        {/* Send Message Action - Equal visual prominence */}
        <div className="border-t border-border py-10">
          <p className="mb-4 text-lg font-medium text-muted-foreground">
            O envía un mensaje a otra placa
          </p>
          <Button 
            asChild
            variant="outline" 
            size="lg" 
            className="h-14 w-full rounded-lg border-2 border-primary bg-transparent px-8 text-lg font-black uppercase tracking-wide text-primary transition-all hover:scale-[1.02] hover:bg-primary hover:text-primary-foreground active:scale-[0.98] md:h-16 md:text-xl"
          >
            <Link href="/send">
              Enviar mensaje
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* System status - green for active indicators */}
        <div className="mt-16 flex items-center justify-center gap-3 text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-status" />
          <span className="font-mono text-xs uppercase tracking-widest">Sistema activo</span>
        </div>
      </div>
    </section>
  )
}
