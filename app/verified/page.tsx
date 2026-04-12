import Link from "next/link"
import { ArrowLeft, BadgeCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VerifiedPage() {
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
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            <BadgeCheck className="h-16 w-16 text-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="mb-4 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
            Perfil verificado
          </h1>
          <p className="text-muted-foreground">
            Solicita acceso a un perfil verificado para enviar mensajes sin límite en CAVATAR.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-4">
          <Button
            asChild
            size="lg"
            className="w-full rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
          >
            <Link href="/verified/register">Crear cuenta</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="w-full rounded-full border border-border px-8 py-6 text-base font-normal text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
          >
            <Link href="/verified/login">Iniciar sesión</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
