"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "¿Qué es Cavatar?",
    answer:
      "Cavatar es una plataforma que convierte cada placa vehicular en un buzón digital, permitiendo la comunicación entre conductores de manera simple y directa.",
  },
  {
    question: "¿Cómo puedo enviar un mensaje a una placa?",
    answer:
      "Simplemente ingresa el número de placa del vehículo al que deseas enviar un mensaje, escribe tu mensaje y envíalo. El propietario del vehículo recibirá una notificación.",
  },
  {
    question: "¿Es anónimo?",
    answer:
      "Sí, puedes enviar mensajes de forma anónima. Tu identidad no será revelada al destinatario a menos que decidas identificarte en tu mensaje.",
  },
  {
    question: "¿Cómo reclamo mi placa?",
    answer:
      "Haz clic en 'Reclama tu placa', ingresa el número de tu placa y sigue el proceso de verificación para vincular tu vehículo a tu cuenta.",
  },
  {
    question: "¿Tiene algún costo?",
    answer:
      "El servicio básico de envío y recepción de mensajes es gratuito. Funciones premium adicionales podrán estar disponibles en el futuro.",
  },
]

export function FAQ() {
  return (
    <section className="border-t border-border bg-card px-4 py-20 md:py-28">
      <div className="mx-auto max-w-2xl">
        {/* Section header */}
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            FAQ
          </h2>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border-border py-2"
            >
              <AccordionTrigger className="text-left text-base font-bold uppercase tracking-tight hover:text-primary hover:no-underline">
                <span className="flex items-center gap-4">
                  <span className="font-mono text-sm text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pl-10 text-base leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
