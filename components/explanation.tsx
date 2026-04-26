export function Explanation() {
  return (
    <section className="border-y border-border bg-secondary px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-balance text-2xl font-bold leading-tight text-foreground md:text-3xl lg:text-4xl">
          Cada placa es un buzón.
        </p>
        <p className="mt-4 text-balance text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
          <span className="text-primary">Cualquier persona puede escribirle a tu vehículo. Y tú puedes escribirle a cualquier vehículo.</span>
        </p>
        
        <div className="mt-10 flex justify-center">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-px w-8 bg-border" />
            <span>Info</span>
            <span className="inline-block h-px w-8 bg-border" />
          </div>
        </div>
      </div>
    </section>
  )
}
