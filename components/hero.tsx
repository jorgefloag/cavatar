"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

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
    <section className="flex min-h-[85vh] items-center justify-center px-4 py-16 md:py-24">
      <div className="mx-auto w-full max-w-md text-center">
        {/* Logo / Brand */}
        <div className="mb-6">
          <h1 className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground md:text-4xl">
            C<span className="underline decoration-2 underline-offset-4">AVATA</span>R
          </h1>
        </div>

        {/* Headlines */}
        <div className="mb-8">
          <h2 className="mb-2 text-2xl font-semibold text-foreground md:text-3xl">
            Alguien te dejó un mensaje
          </h2>
          <p className="text-muted-foreground">
            Ingresa tu placa para verlo
          </p>
        </div>

        {/* Plate Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <Input
              type="text"
              placeholder="ABC123"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
              className="h-16 rounded-2xl border-2 border-border bg-background text-center font-mono text-2xl uppercase tracking-[0.2em] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-0 md:text-3xl"
              maxLength={10}
            />
          </div>
          <Button 
            type="submit"
            size="lg" 
            disabled={!plateNumber.trim()}
            className="w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl disabled:opacity-50"
          >
            Ver mensajes
          </Button>
        </form>

        {/* Secondary Action */}
        <div className="border-t border-border pt-6">
          <p className="mb-3 text-sm text-muted-foreground">
            ¿Quieres enviar un mensaje?
          </p>
          <Button 
            asChild
            variant="ghost" 
            size="lg" 
            className="rounded-full border border-border px-6 py-5 text-sm font-normal text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
          >
            <Link href="/send" className="inline-flex items-center gap-2">
              <Send className="h-4 w-4" />
              Enviar mensaje a una placa
            </Link>
          </Button>
        </div>

        {/* Retro decorative element */}
        <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground">
          <span className="font-mono text-xs tracking-widest">SYS</span>
          <span className="inline-block h-2 w-2 animate-pulse bg-foreground" />
          <span className="font-mono text-xs tracking-widest">ONLINE</span>
        </div>
      </div>
    </section>
  )
}
