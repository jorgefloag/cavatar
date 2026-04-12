"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RequestStatus = "none" | "pending" | "approved" | "rejected"

interface VerifiedRequest {
  id: string
  user_email: string
  full_name: string
  phone: string
  use_case: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState("")
  const [request, setRequest] = useState<VerifiedRequest | null>(null)
  const [status, setStatus] = useState<RequestStatus>("none")
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is logged in and fetch request status from Supabase
  useEffect(() => {
    console.log("[v0] Dashboard loading, checking user session")
    
    const storedUser = localStorage.getItem("cavatar_verified_user")
    if (!storedUser) {
      console.log("[v0] No user found in localStorage, redirecting to login")
      router.push("/verified/login")
      return
    }

    const user = JSON.parse(storedUser)
    const email = user.email || ""
    setUserEmail(email)
    console.log("[v0] User loaded from localStorage:", email)

    // Fetch request from Supabase
    const fetchRequest = async () => {
      console.log("[v0] Fetching verified_requests from Supabase for email:", email)
      
      const { data, error } = await supabase
        .from("verified_requests")
        .select("*")
        .eq("user_email", email)
        .single()

      console.log("[v0] Supabase response - data:", data)
      console.log("[v0] Supabase response - error:", error)

      if (error) {
        console.log("[v0] Error or no request found:", error.message)
        setStatus("none")
        setRequest(null)
      } else if (data) {
        console.log("[v0] Request found with status:", data.status)
        setRequest(data as VerifiedRequest)
        
        // Map the status from database to our RequestStatus type
        const dbStatus = data.status?.toLowerCase() || "pending"
        if (dbStatus === "approved" || dbStatus === "rejected" || dbStatus === "pending") {
          setStatus(dbStatus as RequestStatus)
        } else {
          setStatus("pending")
        }
        console.log("[v0] Final status set to:", dbStatus)
      }

      setIsLoading(false)
    }

    fetchRequest()
  }, [router])

  const handleLogout = () => {
    console.log("[v0] User logging out, clearing localStorage")
    localStorage.removeItem("cavatar_verified_user")
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
          )
        }
      case "pending":
        return {
          icon: <Clock className="h-16 w-16 text-foreground" strokeWidth={1.5} />,
          title: "Tu solicitud está en revisión",
          description: "Estamos revisando tu solicitud. Te notificaremos cuando haya una actualización.",
          action: null
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
          )
        }
      case "rejected":
        return {
          icon: <XCircle className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />,
          title: "Tu perfil fue rechazado",
          description: "Lo sentimos, tu solicitud no fue aprobada. Puedes contactarnos para más información.",
          action: null
        }
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-16 md:py-24">
        <div className="mx-auto max-w-md text-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </main>
    )
  }

  const statusDisplay = getStatusDisplay()

  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="mb-3 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
            Perfil verificado
          </h1>
          <p className="text-muted-foreground">
            {userEmail}
          </p>
        </div>

        {/* Status Card */}
        <div className="mb-8 rounded-lg border border-border bg-card p-8 text-center">
          <div className="mb-6 flex justify-center">
            {statusDisplay.icon}
          </div>
          <h2 className="mb-3 font-mono text-xl font-bold tracking-wide text-foreground">
            {statusDisplay.title}
          </h2>
          <p className="mb-6 text-muted-foreground">
            {statusDisplay.description}
          </p>
          {statusDisplay.action}
        </div>

        {/* Request details if exists */}
        {request && status !== "none" && (
          <div className="mb-8 rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 font-mono text-sm font-medium tracking-wide text-muted-foreground">
              DETALLES DE LA SOLICITUD
            </h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre</span>
                <span className="text-foreground">{request.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teléfono</span>
                <span className="text-foreground">{request.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="text-foreground">
                  {new Date(request.created_at).toLocaleDateString("es-MX")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Logout button */}
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
