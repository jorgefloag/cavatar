import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Términos de Servicio — CAVATAR",
}

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            Términos de Servicio
          </h1>
          <p className="text-sm text-muted-foreground">Última actualización: 16 de octubre de 2026</p>
        </div>

        {/* Draft notice */}
        <div className="mb-10 rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            Este es un documento de trabajo. No sustituye una revisión legal profesional antes de un lanzamiento
            público de CAVATAR a gran escala.
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-8 text-muted-foreground [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_p]:leading-relaxed [&_li]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5">
          <section>
            <h2>1. Qué es CAVATAR</h2>
            <p>
              CAVATAR es una plataforma que convierte el número de placa de un vehículo en un buzón digital:
              cualquier persona puede consultar una placa y dejar un mensaje para su dueño. El dueño del vehículo
              puede reclamar su placa y, una vez aprobado, configurar una contraseña para acceder a su buzón de
              forma privada y leer los mensajes que le dejaron.
            </p>
          </section>

          <section>
            <h2>2. Elegibilidad y edad mínima</h2>
            <p>
              CAVATAR está destinado únicamente a personas mayores de 18 años. Al usar el servicio —ya sea para
              reclamar una placa, enviar un mensaje, o crear un perfil verificado— declaras que tienes al menos 18
              años. Dado que CAVATAR permite el contacto entre personas que no se conocen y recolecta datos
              personales, no ofrecemos ninguna modalidad de uso supervisado para menores de edad. Si tenemos
              conocimiento de que una persona menor de edad usó el servicio, eliminaremos su información y
              cualquier cuenta o reclamo asociado.
            </p>
          </section>

          <section>
            <h2>3. Uso aceptable</h2>
            <p>Al usar CAVATAR aceptas no:</p>
            <ul>
              <li>Enviar mensajes con contenido ilegal, difamatorio, amenazante, o que constituya acoso.</li>
              <li>Suplantar la identidad de otra persona.</li>
              <li>Reclamar una placa que no te pertenece.</li>
              <li>Usar el servicio para spam o fines comerciales no autorizados.</li>
              <li>Intentar vulnerar la seguridad del servicio o acceder a cuentas ajenas.</li>
              <li>
                Incluir enlaces, teléfonos o correos electrónicos dentro del texto de tu mensaje, salvo que tengas
                un perfil verificado aprobado — si quieres dejar tu contacto, usa el campo de contacto, pensado
                para eso.
              </li>
            </ul>
            <p className="mt-3">Nos reservamos el derecho de suspender el acceso a quien incumpla estas reglas.</p>
          </section>

          <section>
            <h2>4. Contenido generado por usuarios</h2>
            <p>
              Los mensajes enviados a través de CAVATAR no se revisan antes de publicarse. Eres responsable del
              contenido que escribes.
            </p>
            <p className="mt-3">
              Para enviar un mensaje necesitas verificar tu correo electrónico (con un código o con tu cuenta de
              Google — no usamos contraseñas para esto). El dueño de la placa nunca ve tu correo: solo un código de
              remitente asignado por placa, o tu nombre comercial si tienes un perfil verificado aprobado. Puedes
              enviar hasta 3 mensajes por hora; con un perfil verificado aprobado, hasta 20.
            </p>
            <p className="mt-3">Si tienes una placa reclamada y aprobada, desde tu buzón puedes:</p>
            <ul>
              <li>Archivar un mensaje, para dejar de verlo en la lista principal sin que se elimine.</li>
              <li>Eliminar un mensaje de tu buzón, para que deje de mostrarse de inmediato.</li>
              <li>
                Reportar un mensaje que te parezca abusivo o que incumpla estas reglas, para que un administrador lo
                revise y, si corresponde, lo elimine.
              </li>
              <li>
                Silenciar o bloquear a un remitente que te escriba. Ninguna de las dos acciones cambia los mensajes
                que ya recibiste.
              </li>
            </ul>
            <p className="mt-3">
              Podemos limitar o bloquear remitentes. Un mensaje puede no ser entregado sin que se te notifique.
            </p>
            <p className="mt-3">
              Los mensajes oficiales de CAVATAR (identificados como tales dentro de tu buzón) no se pueden
              reportar — sí puedes eliminarlos de tu propio buzón como cualquier otro mensaje.
            </p>
            <p className="mt-3">
              Nos reservamos el derecho de eliminar, con o sin reporte previo, cualquier contenido que incumpla
              estas reglas.
            </p>
            <p className="mt-3">
              Un mensaje eliminado (por ti o por un administrador) deja de mostrarse de inmediato. La plataforma lo
              conserva en reserva por aproximadamente 30 días antes de borrarlo definitivamente de forma automática
              (ver Aviso de Privacidad, sección 8); no ofrecemos una función para restaurar un mensaje eliminado
              durante ese plazo. Como excepción, un administrador puede eliminar un mensaje de forma definitiva e
              inmediata, sin esperar ese plazo, en casos que lo ameriten.
            </p>
          </section>

          <section>
            <h2>5. Perfiles verificados</h2>
            <p>
              Un perfil verificado es una cuenta donde confirmamos tu nombre comercial antes de aprobarla. Al
              aprobarse, el dueño de cada placa a la que le escribas ve tu nombre comercial junto con una insignia
              de "Verificado", en vez del código de remitente genérico, y puedes enviar hasta 20 mensajes por hora
              en vez de 3.
            </p>
            <p className="mt-3">
              El equipo revisa tu nombre comercial antes de aprobar tu solicitud; una vez aprobado, solo el equipo
              puede corregirlo — ya no puedes cambiarlo por tu cuenta.
            </p>
            <p className="mt-3">
              Podemos revocar un perfil verificado, con o sin aviso previo, si detectamos uso indebido del
              servicio. Al revocarse, el nombre comercial y la insignia dejan de mostrarse de inmediato, incluso en
              mensajes ya enviados, y vuelve a aplicar el límite estándar de 3 mensajes por hora.
            </p>
          </section>

          <section>
            <h2>6. Reclamo de placas</h2>
            <p>
              El proceso de reclamo depende de que un administrador verifique, fuera de la plataforma, que el correo
              proporcionado corresponde al dueño real del vehículo. CAVATAR no puede garantizar que todo reclamo
              aprobado sea legítimo — si crees que tu placa fue reclamada indebidamente, contáctanos de inmediato a
              hola@cavatarcr.com.
            </p>
            <p className="mt-3">
              Reclamar y mantener una placa activa en CAVATAR tiene un costo de ₡5,000 colones por año, pagadero
              mediante SINPE Móvil al número indicado en la página de reclamo. El comprobante de pago debe enviarse
              por WhatsApp al número de contacto ahí indicado; no procesamos pagos por ningún otro medio. La
              aprobación de tu solicitud queda sujeta a la verificación manual de este pago, además de la
              verificación del correo electrónico ya descrita. CAVATAR se reserva el derecho de ajustar este monto
              con aviso previo.
            </p>
          </section>

          <section>
            <h2>7. Cuentas y contraseñas</h2>
            <p>
              Eres responsable de mantener segura tu contraseña del buzón de tu placa, y de cualquier actividad que
              ocurra con tus credenciales. Avísanos de inmediato si sospechas un acceso no autorizado. Para enviar
              mensajes o acceder a un perfil verificado no usamos contraseñas — tu identidad se verifica con un
              código que te enviamos por correo, o con tu cuenta de Google — así que ahí la responsabilidad de
              mantener seguro tu acceso es la misma que ya tienes con tu propio correo o cuenta de Google.
            </p>
          </section>

          <section>
            <h2>8. Suspensión y terminación</h2>
            <p>
              Podemos suspender o revocar el acceso a una cuenta, un perfil verificado, una placa reclamada, o la
              posibilidad de enviar mensajes desde una cuenta de remitente, si detectamos uso indebido, fraude, o
              incumplimiento de estos términos, con o sin aviso previo dependiendo de la gravedad del caso.
            </p>
          </section>

          <section>
            <h2>9. El servicio se ofrece &quot;tal cual&quot;</h2>
            <p>
              CAVATAR se ofrece &quot;tal cual&quot; (as-is), sin garantías de disponibilidad, exactitud, o ausencia
              de errores. En la medida permitida por la ley costarricense, no somos responsables por daños
              indirectos derivados del uso del servicio.
            </p>
          </section>

          <section>
            <h2>10. Propiedad intelectual</h2>
            <p>
              El nombre CAVATAR, su diseño y contenido propio del sitio son propiedad del operador del servicio. Los
              mensajes que publicas siguen siendo tuyos, pero nos das permiso para mostrarlos como parte del
              funcionamiento del servicio.
            </p>
          </section>

          <section>
            <h2>11. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Costa Rica. Cualquier disputa se resolverá
              ante los tribunales competentes de Costa Rica.
            </p>
          </section>

          <section>
            <h2>12. Cambios a estos términos</h2>
            <p>
              Podemos actualizar estos términos ocasionalmente. El uso continuado de CAVATAR después de un cambio
              implica tu aceptación de los términos actualizados.
            </p>
          </section>

          <section>
            <h2>13. Contacto</h2>
            <p>
              Para cualquier consulta sobre estos términos, escríbenos a{" "}
              <a href="mailto:hola@cavatarcr.com" className="text-foreground underline underline-offset-4">
                hola@cavatarcr.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
