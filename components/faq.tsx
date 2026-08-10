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
      "Haz clic en 'Reclama tu placa', completa el formulario con tu placa, correo y marca del vehículo, y realiza el pago anual de ₡5,000 vía SINPE Móvil al número indicado, enviando el comprobante por WhatsApp. Una vez que verifiquemos tu correo y el pago, aprobamos tu solicitud y te llega un enlace para configurar tu contraseña.",
  },
  {
    question: "¿Tiene algún costo?",
    answer:
      "Enviar y recibir mensajes es gratuito. Reclamar una placa, para tener tu propio buzón privado, tiene un costo de ₡5,000 colones por año, pagadero vía SINPE Móvil.",
  },
  {
    question: "¿Qué gano al reclamar mi placa?",
    answer:
      "Reclamar tu placa no es solo un trámite — es abrir un canal directo a tu carro que antes no existía. Vas a recibir alertas (como que dejaste las luces encendidas o estás mal parqueado), avisos y notificaciones importantes, saludos de gente que te reconoció en la calle, propuestas inesperadas, y hasta cupones, regalos, promociones y descuentos que marcas o negocios podrían dejarte directamente en tu placa. Es tu propio espacio para conectar con el mundo que te rodea, con vos decidiendo siempre qué leer y a quién responder.",
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
