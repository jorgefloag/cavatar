"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { Clock, CheckCircle2, XCircle, AlertCircle, LogOut, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { VerifiedRequestDTO } from "./actions"

type RequestStatus = "none" | "pending" | "approved" | "rejected"

export function DashboardView({
  userEmail,
  request,
}: {
  userEmail: string
  request: VerifiedRequestDTO | null
}) {
  const router = useRouter()
  const { signOut } = useClerk()
  const status: RequestStatus = request?.status ?? "none"

  const handleLogout = async () => {
    await signOut()
    router.push("/verified")
  }

  const getStatusDisplay = () => {
    switch (status) {
      case "none":
        return {
          icon: <AlertCircle className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />,
          title: "Aún no has enviado tu solicitud",
          description: "Completa el formulario de solicitud para obtener un perfil verificado.",
          action: (
            <Button
              asChild
              size="lg"
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
            >
              <Link href="/verified/request">Solicitar verificación</Link>
            </Button>
          ),
        }
      case "pending":
        return {
          icon: <Clock className="h-16 w-16 text-foreground" strokeWidth={1.5} />,
          title: "Tu solicitud está en revisión",
          description: "Estamos revisando tu solicitud. Te notificaremos cuando haya una actualización.",
          action: null,
        }
      case "approved":
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-foreground" strokeWidth={1.5} />,
          title: "Tu perfil fue aprobado",
          description: "Felicidades. Ahora puedes enviar mensajes sin límite en CAVATAR.",
          action: (
            <Button
              asChild
              size="lg"
              className="rounded-full bg-foreground px-8 py-6 text-base font-medium text-background shadow-lg transition-all hover:bg-foreground/90 hover:shadow-xl"
            >
              <Link href="/send">Enviar mensaje</Link>
            </Button>
          ),
        }
      case "rejected":
        return {
          icon: <XCircle className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />,
          title: "Tu perfil fue rechazado",
          description: "Lo sentimos, tu solicitud no fue aprobada. Puedes contactarnos para más información.",
          action: null,
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
            Perfil verificado
          </h1>
          <p className="text-muted-foreground">{userEmail}</p>
        </div>

        <div className="mb-8 rounded-lg border border-border bg-card p-8 text-center">
          <div className="mb-6 flex justify-center">{statusDisplay.icon}</div>
          <h2 className="mb-3 text-xl font-bold text-foreground">{statusDisplay.title}</h2>
          <p className="mb-6 text-muted-foreground">{statusDisplay.description}</p>
          {statusDisplay.action}
        </div>

        {request && status !== "none" && (
          <div className="mb-8 rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 font-label text-sm tracking-wide text-muted-foreground">
              DETALLES DE LA SOLICITUD
            </h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre</span>
                <span className="text-foreground">{request.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teléfono</span>
                <span className="text-foreground">{request.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="text-foreground">
                  {new Date(request.createdAt).toLocaleDateString("es-MX")}
                </span>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full rounded-full border border-border px-6 py-5 text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </main>
  )
}
