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
          <p className="text-sm text-muted-foreground">Última actualización: 9 de agosto de 2026</p>
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
              <a href="mailto:hola@cavatarcr.com" className="text-foreground underline underline-offset-4">
                hola@cavatarcr.com
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
                tu carro, si le tenés uno — no se usa para verificar tu identidad, es solo información de producto.
                Los usamos para verificar tu solicitud y contactarte sobre su estado.
              </li>
              <li>
                <strong className="text-foreground">Para enviar un mensaje a una placa</strong> (/send): el mensaje
                que escribís, y opcionalmente un alias/nombre y un dato de contacto (teléfono, WhatsApp o correo).
                Se usan para que el mensaje llegue al dueño de la placa, o quede guardado hasta que la reclame.
              </li>
              <li>
                <strong className="text-foreground">Para crear un perfil verificado</strong> (/verified/register,
                /verified/request): tu correo y contraseña (gestionados por Clerk, nuestro proveedor de
                autenticación — nunca vemos tu contraseña en texto plano), y adicionalmente tu nombre completo,
                teléfono, y una descripción del uso que le darás al perfil verificado.
              </li>
              <li>
                <strong className="text-foreground">Para acceder al buzón de una placa reclamada</strong>: una
                contraseña que vos definís, que guardamos con hash (bcrypt) — nunca la contraseña en sí.
              </li>
            </ul>
            <p className="mt-3">
              El pago anual de ₡5,000 para reclamar una placa se realiza directamente por SINPE Móvil y WhatsApp
              entre vos y el administrador de CAVATAR — no recolectamos ni almacenamos tu número de teléfono, el
              comprobante de pago, ni ningún dato asociado a esa transacción en la base de datos de CAVATAR.
            </p>
          </section>

          <section>
            <h2>3. Carácter de los datos</h2>
            <p>
              Los campos marcados como obligatorios en cada formulario son necesarios para completar esa acción; sin
              ellos, no podemos procesar tu solicitud. Los campos opcionales (alias, contacto en /send) podés
              omitirlos sin que eso te impida enviar tu mensaje.
            </p>
          </section>

          <section>
            <h2>4. A quién se revelan tus datos</h2>
            <ul>
              <li>
                <strong className="text-foreground">Otros usuarios de CAVATAR</strong>: los mensajes que envíes a una
                placa (incluyendo el alias y contacto que incluyas) son visibles públicamente para cualquiera que
                consulte esa placa en CAVATAR — este es el propósito central del servicio, no un uso secundario.
              </li>
              <li>
                <strong className="text-foreground">El operador de CAVATAR</strong>: como administrador, revisamos
                solicitudes de reclamo y de perfil verificado, y moderamos mensajes reportados.
              </li>
              <li>
                <strong className="text-foreground">Proveedores externos</strong> que procesan datos en nuestro
                nombre (ver sección 5).
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
                  <th>País</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Neon</td>
                  <td>Base de datos</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td>Clerk</td>
                  <td>Autenticación de perfiles verificados</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td>Resend</td>
                  <td>Envío de correos (notificaciones, enlaces de configuración)</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td>Vercel</td>
                  <td>Hosting de la aplicación</td>
                  <td>Estados Unidos</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3">
              Al usar CAVATAR y aceptar este aviso, autorizás expresamente la transferencia de tus datos personales a
              estos proveedores para los fines aquí descritos, conforme al artículo 6 de la Ley 8968.
            </p>
          </section>

          <section>
            <h2>6. Medidas de seguridad</h2>
            <p>
              Las contraseñas se almacenan con hash (bcrypt), nunca en texto plano. Las conexiones a CAVATAR usan
              HTTPS. El acceso administrativo está restringido por correo autorizado. Ningún sistema es perfecto —
              si detectás un problema de seguridad, escribinos a hola@cavatarcr.com.
            </p>
          </section>

          <section>
            <h2>7. Tus derechos (ARCO)</h2>
            <p>Como titular de tus datos, tenés derecho a:</p>
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
              Podés ejercer cualquiera de estos derechos escribiendo a hola@cavatarcr.com. Vamos a responder dentro
              de los 5 días hábiles siguientes, conforme al Reglamento a la Ley 8968. Ejercer estos derechos no tiene
              costo.
            </p>
          </section>

          <section>
            <h2>8. Conservación de datos</h2>
            <p>
              Conservamos tus datos mientras tu cuenta, solicitud o reclamo esté activo, o hasta que ejerzas tu
              derecho de cancelación — en cualquier caso, por un máximo de 10 años, conforme al límite establecido en
              la Ley 8968.
            </p>
          </section>

          <section>
            <h2>9. Registro ante PRODHAB</h2>
            <p>
              A la fecha de esta publicación, estamos evaluando si el tratamiento descrito en este aviso —en
              particular, la visibilidad pública de los mensajes— requiere inscribir la base de datos ante la
              Agencia de Protección de Datos de los Habitantes (PRODHAB), conforme al artículo 8 de la Ley 8968.
              Esta evaluación está pendiente de una revisión legal formal antes de un lanzamiento público amplio de
              CAVATAR.
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
