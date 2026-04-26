import Link from "next/link"
import { Send, Inbox, ArrowRight } from "lucide-react"

const features = [
  {
    icon: Send,
    title: "ENVÍA",
    description: "Escribe a cualquier placa.",
    href: "/send",
  },
  {
    icon: Inbox,
    title: "RECIBE",
    description: "Reclama tu placa. Recibe mensajes.",
    href: "/inbox?focus=plate",
  },
]

export function Features() {
  return (
    <section className="border-t border-border px-4 py-20 md:py-28">
      <div className="mx-auto max-w-4xl">
        {/* Section header */}
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            FUNCIONES
          </h2>
        </div>

        {/* Feature cards */}
        <div className="mx-auto grid max-w-2xl gap-8 md:grid-cols-2">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href} className="group">
              <div className="flex h-full flex-col border-2 border-border bg-card p-8 transition-all duration-200 hover:border-primary">
                <div className="mb-6 flex h-14 w-14 items-center justify-center border-2 border-primary bg-transparent">
                  <feature.icon className="h-6 w-6 text-primary" strokeWidth={2} />
                </div>
                <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="mb-6 flex-1 text-muted-foreground">
                  {feature.description}
                </p>
                <div className="flex items-center gap-2 font-mono text-sm uppercase text-primary transition-all group-hover:gap-3">
                  <span>Ir</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
