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
    <section className="flex min-h-screen items-center justify-center px-4 py-20">
      <div className="mx-auto w-full max-w-2xl text-center">
        {/* Logo / Brand */}
        <div className="mb-12">
          <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground">
            CAVATAR
          </span>
        </div>

        {/* Headlines - Bold, poster-like */}
        <div className="mb-10">
          <h1 className="mb-4 text-5xl font-black uppercase leading-[0.9] tracking-tight text-foreground md:text-7xl lg:text-8xl">
            ALGUIEN TE ESCRIBIÓ
          </h1>
          <p className="text-lg font-medium text-muted-foreground md:text-xl">
            Ingresa tu placa para verlo
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
            className="h-14 w-full rounded-lg bg-primary px-8 text-lg font-bold uppercase tracking-wide text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40 md:h-16 md:text-xl"
          >
            Ver mensajes
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>

        {/* Mysterious tagline */}
        <p className="mb-10 font-mono text-sm text-muted-foreground">
          No sabes quién. Pero te escribió.
        </p>

        {/* Secondary Action */}
        <div className="border-t border-border pt-8">
          <Button 
            asChild
            variant="outline" 
            size="lg" 
            className="h-12 rounded-lg border-2 border-primary bg-transparent px-8 font-bold uppercase tracking-wide text-primary transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <Link href="/send">
              Enviar mensaje
            </Link>
          </Button>
        </div>

        {/* System status */}
        <div className="mt-16 flex items-center justify-center gap-3 text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="font-mono text-xs uppercase tracking-widest">Sistema activo</span>
        </div>
      </div>
    </section>
  )
}
