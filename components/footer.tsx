import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background px-4 py-16 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        {/* Brand */}
        <span className="font-plate text-2xl tracking-tight text-foreground">
          CAVATAR
        </span>

        {/* Contact */}
        <div className="mt-8">
          <a
            href="mailto:hola@cavatarcr.com"
            className="inline-block border-b-2 border-primary pb-1 font-label text-sm text-primary transition-all hover:brightness-110"
          >
            hola@cavatarcr.com
          </a>
        </div>

        {/* Legal links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacidad" className="underline underline-offset-4 transition-colors hover:text-foreground">
            Aviso de Privacidad
          </Link>
          <Link href="/terminos" className="underline underline-offset-4 transition-colors hover:text-foreground">
            Términos de Servicio
          </Link>
        </div>

        {/* Version - green for system status */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-status" />
          <span className="font-label text-xs uppercase tracking-widest text-muted-foreground">
            v1.0 Sistema activo
          </span>
        </div>
      </div>
    </footer>
  )
}
