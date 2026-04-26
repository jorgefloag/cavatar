export function Footer() {
  return (
    <footer className="border-t border-border bg-background px-4 py-16 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        {/* Brand */}
        <span className="text-2xl font-black uppercase tracking-tight text-foreground">
          CAVATAR
        </span>

        {/* Contact */}
        <div className="mt-8">
          <a
            href="mailto:hola@cavatar.app"
            className="inline-block border-b-2 border-primary pb-1 font-mono text-sm text-primary transition-all hover:brightness-110"
          >
            hola@cavatar.app
          </a>
        </div>

        {/* Version - green for system status */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-status" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            v1.0 Sistema activo
          </span>
        </div>
      </div>
    </footer>
  )
}
