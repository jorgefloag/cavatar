import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Aviso de Privacidad — CAVATAR",
}

export default function PrivacidadPage() {
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
            Aviso de Privacidad
          </h1>
          <p className="text-sm text-muted-foreground">Última actualización: 16 de octubre de 2026</p>
        </div>

        {/* Draft notice */}
        <div className="mb-10 rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            Este es un documento de trabajo, redactado con base en la Ley 8968 de Costa Rica. No sustituye una
            revisión legal profesional antes de un lanzamiento público de CAVATAR a gran escala.
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-8 text-muted-foreground [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_p]:leading-relaxed [&_li]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left [&_th]:font-label [&_th]:text-xs [&_th]:uppercase [&_th]:text-foreground [&_td]:border [&_td]:border-border [&_td]:p-2">
          <section>
            <h2>1. Responsable del tratamiento</h2>
            <p>
              CAVATAR es un proyecto personal operado por Jorge Flores, con domicilio en Heredia, Costa Rica. Aún no
              está constituido como una sociedad formalmente registrada; esta sección se actualizará cuando eso
              ocurra. Podés contactarnos en{" "}
              <a href="mailto:admin@cavatarcr.com" className="text-foreground underline underline-offset-4">
                admin@cavatarcr.com
              </a>{" "}
              para cualquier consulta sobre este aviso o sobre tus datos.
            </p>
          </section>

          <section>
            <h2>2. Qué datos recolectamos y para qué</h2>
            <p>CAVATAR recolecta distintos datos según cómo lo uses:</p>
            <ul>
              <li>
                <strong className="text-foreground">Para reclamar una placa</strong> (/claim): correo electrónico,
                marca del vehículo, y el número de placa que estás reclamando. Opcionalmente, el nombre o apodo de
                tu carro, si le tienes uno — no se usa para verificar tu identidad, es solo información de producto.
                Los usamos para verificar tu solicitud y contactarte sobre su estado. Una vez que tu placa está
                aprobada, también podemos usar la marca del vehículo para decidir a quién le llega un mensaje
                oficial de CAVATAR (ver "Mensajes oficiales de CAVATAR" más abajo).
              </li>
              <li>
                <strong className="text-foreground">Para enviar un mensaje a una placa</strong> (/send): necesitas
                verificar tu correo electrónico antes de tu primer mensaje (con un código que te enviamos, o con tu
                cuenta de Google — nunca con contraseña). Guardamos tu correo asociado a esa verificación, el
                mensaje que escribes, y opcionalmente un alias/nombre y un dato de contacto (teléfono, WhatsApp o
                correo) en el mensaje mismo. El dueño de la placa nunca ve tu correo: en su buzón apareces
                identificado con un código como "Remitente 3", asignado la primera vez que le escribes a esa placa
                en particular (es un código distinto por cada placa, no te identifica entre placas distintas). Si
                escribes un nombre en el campo de alias, el dueño lo ve señalado como algo que dices llamarte, no
                como tu identidad confirmada. El equipo de CAVATAR sí puede ver tu correo, para aplicar límites de
                envío y moderar el servicio (ver sección 4). Mientras no tengas un perfil verificado (ver más abajo),
                no puedes incluir enlaces, teléfonos ni correos electrónicos dentro del texto del mensaje — sí puedes
                dejarlos en el campo de contacto, pensado justo para eso.
              </li>
              <li>
                <strong className="text-foreground">
                  Para silenciar o bloquear a quien te escribe
                </strong>{" "}
                (desde tu buzón, en la sección "Remitentes"): guardamos tu decisión (silenciado o bloqueado)
                asociada a ese remitente y a esa placa en particular. Silenciar significa que dejas de recibir
                avisos de sus mensajes nuevos, pero siguen apareciendo en tu buzón. Bloquear significa que esa
                persona ya no podrá escribirte a esa placa de ahí en adelante. Ninguna de las dos acciones afecta a
                los mensajes que ya recibiste.
              </li>
              <li>
                <strong className="text-foreground">Para crear un perfil verificado</strong> (/verified/register,
                /verified/request): tu correo (verificado con un código, igual que para enviar un mensaje — no
                usamos contraseñas para esto), tu nombre completo, teléfono, una descripción del uso que le darás al
                perfil, y tu nombre comercial. El nombre comercial es el que se muestra públicamente: el equipo lo
                revisa antes de aprobar tu solicitud, y una vez aprobada, solo el equipo puede corregirlo — ya no
                puedes cambiarlo por tu cuenta.
              </li>
              <li>
                <strong className="text-foreground">Para acceder al buzón de una placa reclamada</strong>: una
                contraseña que tú defines, que guardamos con hash (bcrypt) — nunca la contraseña en sí.
              </li>
              <li>
                <strong className="text-foreground">Para activar avisos push en tu dispositivo</strong> (opcional,
                desde tu buzón): si tocas "Activar avisos" y confirmas tu contraseña del buzón, guardamos la
                dirección técnica que tu navegador nos da para ese dispositivo (el "endpoint" del servicio de
                notificaciones) junto con dos llaves técnicas de cifrado, ligadas a la placa, además de la fecha en
                que activaste el aviso y la fecha del último aviso enviado con éxito. Este aviso no incluye el
                contenido del mensaje — solo te notifica que hay uno nuevo, igual que el correo. Se borra si
                desactivas el aviso tú mismo, si tu navegador nos informa que la suscripción ya no existe, si tienes
                más de 5 dispositivos activados para la misma placa (se elimina el más antiguo), o si un
                administrador revoca el reclamo de tu placa.
              </li>
              <li>
                <strong className="text-foreground">Para reportar un mensaje</strong> (desde tu buzón, con tu
                sesión ya iniciada): guardamos la placa, el motivo que indiques (opcional), una copia del contenido
                del mensaje reportado tal como estaba al momento del reporte, y el correo de quien lo envió en ese
                momento (si tenía uno asociado). Esta información se conserva aunque el mensaje original se elimine
                después — salvo el correo: ese se borra si quien envió el mensaje pide la cancelación de sus datos
                (ver sección 7); la copia del contenido del mensaje se conserva de todas formas, para que el
                administrador pueda revisarla.
              </li>
              <li>
                <strong className="text-foreground">Para mantenerte identificado dentro de tu buzón</strong>{" "}
                (después de ingresar tu contraseña): usamos una cookie técnica que contiene solo un código aleatorio;
                nuestro servidor asocia ese código con la placa que desbloqueaste. Vence a los 30 minutos de
                inactividad y se renueva mientras sigues usando el buzón. No la usamos para rastrearte entre sitios
                ni con fines de mercadeo, solo para que no tengas que volver a escribir tu contraseña en cada acción
                (archivar, eliminar, reportar, silenciar, bloquear) dentro de la misma visita.
              </li>
              <li>
                <strong className="text-foreground">Mensajes oficiales de CAVATAR</strong>: el administrador de
                CAVATAR puede enviar mensajes operativos (avisos del servicio, no publicidad de terceros) a todas
                las placas aprobadas o a un grupo filtrado por marca de vehículo, usando el dato de marca que
                registraste al reclamar tu placa. Estos mensajes se identifican como oficiales dentro de tu buzón —
                no se te contacta por correo, WhatsApp ni ningún otro canal a partir de esto, y solo los ves si
                entras a tu buzón con tu contraseña, igual que cualquier otro mensaje.
              </li>
            </ul>
            <p className="mt-3">
              El pago anual de ₡5,000 para reclamar una placa se realiza directamente por SINPE Móvil y WhatsApp
              entre tú y el administrador de CAVATAR — no recolectamos ni almacenamos tu número de teléfono, el
              comprobante de pago, ni ningún dato asociado a esa transacción en la base de datos de CAVATAR.
            </p>
          </section>

          <section>
            <h2>3. Carácter de los datos</h2>
            <p>
              Los campos marcados como obligatorios en cada formulario son necesarios para completar esa acción; sin
              ellos, no podemos procesar tu solicitud — esto incluye la verificación de tu correo para enviar un
              mensaje, obligatoria desde cualquier placa. Los campos realmente opcionales (alias, contacto en /send)
              puedes omitirlos sin que eso te impida enviar tu mensaje.
            </p>
          </section>

          <section>
            <h2>4. A quién se revelan tus datos</h2>
            <ul>
              <li>
                <strong className="text-foreground">
                  Quien tenga o configure la contraseña del buzón de esa placa
                </strong>
                : tu mensaje (incluyendo el alias y contacto que incluyas) queda guardado y lo puede leer quien
                reclame esa placa y configure su contraseña. Esto no es un uso secundario: es el propósito central
                del servicio. Tu correo nunca forma parte de esto — quien lee tu mensaje solo ve el código de
                remitente o, si tienes un perfil verificado, tu nombre comercial.
              </li>
              <li>
                <strong className="text-foreground">El operador de CAVATAR</strong>: como administrador, revisamos
                solicitudes de reclamo y de perfil verificado, y podemos revisar los mensajes de cualquier placa
                para moderar el servicio — no solo los que alguien reportó. También podemos bloquear el acceso de
                un remitente que abuse (en cuyo caso sí vemos su correo, para poder identificarlo y actuar), y
                podemos originar mensajes oficiales dirigidos a tu buzón (ver sección 2).
              </li>
              <li>
                <strong className="text-foreground">Proveedores externos</strong> que procesan datos en nuestro
                nombre (ver sección 5).
              </li>
              <li>
                <strong className="text-foreground">El servicio de notificaciones de tu propio navegador</strong>{" "}
                (por ejemplo Google para Chrome, Mozilla para Firefox, o Apple para Safari, u otro proveedor, según
                tu navegador): si activas avisos push, el aviso viaja a través del servicio de ese navegador para
                llegar a tu dispositivo. El contenido del aviso viaja cifrado de extremo a extremo según el
                protocolo estándar de Web Push, de forma que ese servicio no puede leerlo — solo ve la dirección
                técnica de tu dispositivo y datos de entrega, nunca el texto del mensaje. Ver sección 5.
              </li>
            </ul>
            <p className="mt-3">No vendemos ni compartimos tus datos con terceros para fines de mercadeo.</p>
          </section>

          <section>
            <h2>5. Proveedores externos y transferencia internacional de datos</h2>
            <p>Usamos los siguientes proveedores para operar CAVATAR, todos ubicados fuera de Costa Rica:</p>
            <table>
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Rol</th>
                  <th>Qué datos pasan por ahí</th>
                  <th>País</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Neon</td>
                  <td>Base de datos</td>
                  <td>Todos los que recolecta CAVATAR</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td>Clerk</td>
                  <td>Autenticación de quienes envían mensajes y de perfiles verificados</td>
                  <td>Tu correo, y el código de verificación que te enviamos</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td>Google</td>
                  <td>
                    Confirmar tu identidad si eliges iniciar sesión con tu cuenta de Google en vez de código por
                    correo (siempre a través de Clerk, no directamente por CAVATAR)
                  </td>
                  <td>Tu cuenta de Google; nunca tu mensaje ni tu placa</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td>Resend</td>
                  <td>Envío de correos (notificaciones, enlaces de configuración)</td>
                  <td>Tu correo y el contenido del correo que te enviamos</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td>Vercel</td>
                  <td>Hosting de la aplicación</td>
                  <td>Todos los que procesa CAVATAR al funcionar</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td>Upstash (QStash)</td>
                  <td>Programa el aviso de "tienes mensajes nuevos" al dueño de una placa</td>
                  <td>
                    Únicamente el número de placa — nunca tu mensaje, tu correo, ni tu identidad
                  </td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td>Servicio de push del navegador (Google, Mozilla o Apple, u otro, según el navegador)</td>
                  <td>Entrega del aviso push a tu dispositivo (solo si activaste esta función)</td>
                  <td>La dirección técnica de tu dispositivo, nunca el texto del mensaje</td>
                  <td>Varía según el proveedor</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3">
              Al usar CAVATAR y aceptar este aviso, autorizas expresamente la transferencia de tus datos personales a
              estos proveedores para los fines aquí descritos, conforme al artículo 6 de la Ley 8968.
            </p>
          </section>

          <section>
            <h2>6. Medidas de seguridad</h2>
            <p>
              Las contraseñas se almacenan con hash (bcrypt), nunca en texto plano. Tu identidad como remitente o
              perfil verificado se confirma mediante nuestro proveedor de autenticación (Clerk) con un código o con
              tu cuenta de Google, nunca con una contraseña que nosotros gestionemos para esto. Las conexiones a
              CAVATAR usan HTTPS. El acceso administrativo está restringido por correo autorizado. Ningún sistema es
              perfecto — si detectas un problema de seguridad, escríbenos a admin@cavatarcr.com.
            </p>
          </section>

          <section>
            <h2>7. Tus derechos (ARCO)</h2>
            <p>Como titular de tus datos, tienes derecho a:</p>
            <ul>
              <li>
                <strong className="text-foreground">Acceso</strong>: saber qué datos tuyos tenemos y para qué los
                usamos.
              </li>
              <li>
                <strong className="text-foreground">Rectificación</strong>: corregir datos inexactos o
                desactualizados.
              </li>
              <li>
                <strong className="text-foreground">Cancelación</strong>: pedir que eliminemos tus datos cuando ya no
                sean necesarios o hayan sido recolectados indebidamente.
              </li>
              <li>
                <strong className="text-foreground">Oposición</strong>: oponerte a un uso específico de tus datos.
              </li>
            </ul>
            <p className="mt-3">
              Puedes ejercer cualquiera de estos derechos escribiendo a admin@cavatarcr.com. Vamos a responder dentro
              de los 5 días hábiles siguientes, conforme al Reglamento a la Ley 8968. Ejercer estos derechos no tiene
              costo.
            </p>
            <p className="mt-3">
              Si pides la cancelación de tus datos como remitente de mensajes, el proceso es manual y sigue este
              orden: primero eliminamos tu cuenta de inicio de sesión en nuestro proveedor de autenticación (Clerk);
              una vez que esa cuenta ya no existe, borramos tu correo de nuestra base (quedando reemplazado por un
              valor que no permite identificarte), vaciamos cualquier alias o dato de contacto que hayas escrito en
              tus mensajes anteriores en cualquier placa, y borramos tu correo de cualquier reporte donde aparezcas
              como remitente. El texto de los mensajes en sí (lo que escribiste, sin tu alias ni tu contacto) se
              conserva, porque también forma parte de la comunicación con quien lo recibió.
            </p>
          </section>

          <section>
            <h2>8. Conservación de datos</h2>
            <p>
              Conservamos tus datos mientras tu cuenta, solicitud o reclamo esté activo, o hasta que ejerzas tu
              derecho de cancelación — en cualquier caso, por un máximo de 10 años.
            </p>
            <p className="mt-3">
              Los datos asociados a tu identidad como remitente (tu correo verificado, y el historial de tu código
              de remitente por cada placa a la que escribiste) siguen esta misma regla: se conservan hasta que pidas
              su cancelación (ver sección 7) o, como máximo, 10 años sin actividad de tu parte, lo que ocurra
              primero. Hoy, aplicar ese límite de 10 años todavía depende de un proceso manual — a diferencia de los
              mensajes eliminados, no existe todavía un borrado automático que lo aplique por sí solo.
            </p>
            <p className="mt-3">
              Si archivas, eliminas, o un administrador elimina un mensaje de tu buzón, el mensaje deja de mostrarse
              de inmediato, pero lo conservamos en reserva por aproximadamente 30 días antes de borrarlo
              definitivamente de forma automática — decimos &quot;aproximadamente&quot; porque este borrado corre
              una vez al día, dentro de una ventana horaria, no exactamente a los 30 días en punto. Durante ese
              plazo no ofrecemos una función para restaurar el mensaje. Un administrador puede eliminarlo de forma
              definitiva e inmediata en casos que lo ameriten, sin esperar ese plazo.
            </p>
            <p className="mt-3">
              La cookie técnica de sesión de tu buzón (ver sección 2) vence sola a los 30 minutos de inactividad; el
              mismo proceso automático diario que purga mensajes eliminados también borra las sesiones ya vencidas
              que hayan quedado registradas en nuestra base.
            </p>
            <p className="mt-3">
              Si reportas un mensaje, conservamos la copia de su contenido (ver sección 2) hasta 12 meses después de
              que el reporte se revise o se cierre — ya sea porque un administrador lo marcó como revisado o lo
              descartó, o porque se cerró automáticamente al purgarse el mensaje reportado. Un reporte que todavía
              esté pendiente de revisión no se borra nunca por este motivo.
            </p>
          </section>

          <section>
            <h2>9. Registro ante PRODHAB</h2>
            <p>
              A la fecha de esta publicación, estamos evaluando si el tratamiento descrito en este aviso —en
              particular, el acceso a los mensajes por parte de quien reclama una placa— requiere inscribir la base
              de datos ante la Agencia de Protección de Datos de los Habitantes (PRODHAB), conforme al artículo 8 de
              la Ley 8968. Esta evaluación está pendiente de una revisión legal formal antes de un lanzamiento
              público amplio de CAVATAR.
            </p>
          </section>

          <section>
            <h2>10. Menores de edad</h2>
            <p>
              CAVATAR está destinado únicamente a personas mayores de 18 años (ver Términos de Servicio, sección 2)
              y no recolectamos deliberadamente datos de menores de edad. Si identificamos que recolectamos datos de
              una persona menor de edad, los eliminaremos; también podés solicitar esta eliminación ejerciendo tu
              derecho de cancelación (sección 7).
            </p>
          </section>

          <section>
            <h2>11. Cambios a este aviso</h2>
            <p>
              Podemos actualizar este aviso ocasionalmente. Si hacemos cambios importantes, lo indicaremos en esta
              misma página con la fecha de la actualización.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
