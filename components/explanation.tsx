export function Explanation() {
  return (
    <section className="border-y border-border bg-secondary/30 px-4 py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="relative border border-border bg-background p-6 md:p-8">
          {/* Corner decorations - retro terminal style */}
          <span className="absolute left-2 top-2 font-mono text-[10px] text-muted-foreground">
            [INFO]
          </span>
          
          <p className="text-balance pt-4 text-center text-lg leading-relaxed text-foreground md:text-xl">
            Cavatar convierte cada placa vehicular en un buzón digital al que cualquier persona puede enviar un mensaje.
          </p>
          
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <span className="inline-block h-1 w-1 bg-muted-foreground" />
              <span className="inline-block h-1 w-1 bg-muted-foreground" />
              <span className="inline-block h-1 w-1 bg-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
