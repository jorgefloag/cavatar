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
      "Ingresa el número de placa del vehículo al que deseas enviar un mensaje, escribe tu mensaje y verifica tu correo con un código (es rápido y gratis, no necesitas contraseña). Si el dueño ya reclamó esa placa y activó notificaciones, le puede llegar un aviso de que tiene un mensaje nuevo.",
  },
  {
    question: "¿Es anónimo?",
    answer:
      "Para el dueño de la placa, sí: nunca ve tu correo, solo un código como \"Remitente 3\" (o tu nombre comercial si tienes un perfil verificado). Si escribes un nombre en el campo de alias, el dueño lo ve señalado como algo que dices llamarte, no como tu identidad confirmada. Tu correo sí lo verificamos al momento de enviar, para evitar spam, y el equipo de CAVATAR puede verlo si necesita revisar un reporte.",
  },
  {
    question: "¿Por qué tengo que verificar mi correo para enviar un mensaje?",
    answer:
      "Antes cualquiera podía escribir sin ningún control, lo que abría la puerta a spam y abuso. Ahora pedimos verificar tu correo (con un código, no necesitas contraseña) antes de tu primer mensaje. Esto no te identifica ante el dueño de la placa — solo nos ayuda a aplicar límites de envío y a actuar si alguien abusa.",
  },
  {
    question: "¿Puedo silenciar o bloquear a alguien que me escribe?",
    answer:
      "Sí. Desde tu buzón, en la sección \"Remitentes\", puedes silenciar a alguien (dejas de recibir avisos de sus mensajes, pero siguen apareciendo en tu buzón) o bloquearlo (ya no podrá escribirte a esa placa). Ningún bloqueo afecta los mensajes que ya recibiste.",
  },
  {
    question: "¿Qué es un perfil verificado?",
    answer:
      "Es una cuenta donde confirmamos tu nombre comercial antes de aprobarla. Si tienes un perfil verificado, el dueño de cada placa ve tu nombre comercial con una insignia de \"Verificado\" en vez de un código genérico, y puedes enviar hasta 20 mensajes por hora en vez de 3.",
  },
  {
    question: "¿Cómo reclamo mi placa?",
    answer:
      "Haz clic en 'Reclama tu placa', completa el formulario con tu placa, correo y marca del vehículo, y realiza el pago anual de ₡5,000 vía SINPE Móvil al número indicado, enviando el comprobante por WhatsApp. Una vez que verifiquemos tu correo y el pago, aprobamos tu solicitud y te llega un enlace para configurar tu contraseña.",
  },
  {
    question: "¿Tiene algún costo?",
    answer:
      "Enviar un mensaje es gratuito. Para leer los mensajes de una placa hay que reclamarla, y eso cuesta ₡5,000 colones por año, pagadero vía SINPE Móvil.",
  },
  {
    question: "¿Qué gano al reclamar mi placa?",
    answer:
      "Reclamar tu placa no es solo un trámite — es abrir un canal directo a tu carro que antes no existía. Vas a recibir alertas (como que dejaste las luces encendidas o estás mal parqueado), avisos y notificaciones importantes, saludos de gente que te reconoció en la calle, propuestas inesperadas, y hasta cupones, regalos, promociones y descuentos que marcas o negocios podrían dejarte directamente en tu placa. Es tu propio espacio para conectar con el mundo que te rodea, y tú decides siempre qué leer y a quién responder.",
  },
]

export function FAQ() {
  return (
    <section className="border-t border-border bg-card px-4 py-20 md:py-28">
      <div className="mx-auto max-w-2xl">
        {/* Section header */}
        <div className="mb-14 text-center">
          <h2 className="font-label text-3xl uppercase tracking-tight text-foreground md:text-4xl">
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
              <AccordionTrigger className="font-label text-left text-base uppercase tracking-tight hover:text-primary hover:no-underline">
                <span className="flex items-center gap-4">
                  <span className="font-label text-sm text-primary">
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
