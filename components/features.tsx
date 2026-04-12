import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Inbox } from "lucide-react"

const features = [
  {
    icon: Send,
    title: "Envia un mensaje",
    description: "Introduce una placa y envia un mensaje directo a su buzon.",
    href: "/send",
  },
  {
    icon: Inbox,
    title: "Recibe mensajes",
    description: "Reclama tu placa y recibe notificaciones cuando alguien te escriba.",
    href: "/inbox?focus=plate",
  },
]

export function Features() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="mb-12 text-center">
          <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            // FUNCIONES
          </span>
        </div>

        {/* Feature cards */}
        <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2">
          {features.map((feature, index) => (
            <Link key={feature.title} href={feature.href} className="group">
              <Card 
                className="h-full cursor-pointer border-border bg-background transition-all duration-200 hover:border-foreground/30 hover:shadow-md group-active:scale-[0.98]"
              >
                <CardHeader className="pb-4">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center border border-border transition-colors group-hover:border-foreground/30">
                      <feature.icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <CardTitle className="font-sans text-lg font-medium">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
