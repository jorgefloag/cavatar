export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-12 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        {/* Brand */}
        <span className="font-mono text-sm tracking-[0.2em] text-foreground">
          CAVATAR
        </span>

        {/* Contact */}
        <div className="mt-6">
          <p className="text-xs text-muted-foreground">Contacto:</p>
          <a
            href="mailto:hola@cavatar.app"
            className="mt-1 inline-block font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            hola@cavatar.app
          </a>
        </div>

        {/* Version */}
        <div className="mt-8">
          <span className="font-mono text-[10px] text-muted-foreground/60">
            v1.0 // sistema activo
          </span>
        </div>
      </div>
    </footer>
  )
}
