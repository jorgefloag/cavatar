"use client"

import { useEffect, useState } from "react"
import { Bell, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { subscribeToPush, unsubscribeFromPush, getPushSubscriptionStatus } from "@/app/inbox/push-actions"

type ToggleState =
  | "checking"
  | "unsupported"
  | "ios-not-installed"
  | "denied"
  | "inactive"
  | "prompting-password"
  | "activating"
  | "active"

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandalone(): boolean {
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return window.matchMedia("(display-mode: standalone)").matches || navigatorStandalone === true
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function PushNotificationToggle({ plateNumber }: { plateNumber: string }) {
  const [state, setState] = useState<ToggleState>("checking")
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setState("unsupported")
        return
      }

      if (isIOS() && !isStandalone()) {
        if (!cancelled) setState("ios-not-installed")
        return
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied")
        return
      }

      const registration = await navigator.serviceWorker.getRegistration("/sw.js")
      const subscription = await registration?.pushManager.getSubscription()

      if (!subscription) {
        if (!cancelled) setState("inactive")
        return
      }

      const { active } = await getPushSubscriptionStatus(plateNumber, subscription.endpoint)
      if (cancelled) return
      setEndpoint(subscription.endpoint)
      setState(active ? "active" : "inactive")
    }

    check().catch(() => {
      if (!cancelled) setState("inactive")
    })

    return () => {
      cancelled = true
    }
  }, [plateNumber])

  async function handleActivateClick() {
    // Requested from this click handler (not after an await) so the browser
    // still treats it as a user gesture.
    const permission = await Notification.requestPermission()
    if (permission === "denied") {
      setState("denied")
      return
    }
    if (permission !== "granted") {
      return
    }
    setError(null)
    setState("prompting-password")
  }

  async function handleSubmitPassword(event: React.FormEvent) {
    event.preventDefault()
    setState("activating")
    setError(null)

    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
        })
      }

      const json = subscription.toJSON()
      const result = await subscribeToPush(plateNumber, password, {
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh || "", auth: json.keys?.auth || "" },
      })

      if (!result.success) {
        setError(result.error || "No se pudo activar.")
        setState("prompting-password")
        return
      }

      setEndpoint(subscription.endpoint)
      setPassword("")
      setState("active")
    } catch (err) {
      console.error("[push] activation error:", err)
      setError("Error al activar los avisos. Intenta nuevamente.")
      setState("prompting-password")
    }
  }

  async function handleDeactivate() {
    if (!endpoint) return
    setState("activating")
    await unsubscribeFromPush(plateNumber, endpoint)
    setEndpoint(null)
    setState("inactive")
  }

  if (state === "checking") return null

  if (state === "unsupported") {
    return (
      <p className="font-label text-xs uppercase tracking-wide text-muted-foreground">
        Tu navegador no admite avisos push.
      </p>
    )
  }

  if (state === "ios-not-installed") {
    return (
      <p className="font-label text-xs uppercase tracking-wide text-muted-foreground">
        En iPhone, instalá CAVATAR en tu pantalla de inicio (Compartir → Agregar a inicio) para poder activar avisos.
      </p>
    )
  }

  if (state === "denied") {
    return (
      <p className="font-label text-xs uppercase tracking-wide text-muted-foreground">
        Bloqueaste los avisos para este sitio. Activalos desde la configuración de notificaciones del navegador.
      </p>
    )
  }

  if (state === "active") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm text-foreground">
          <BellRing className="h-4 w-4" />
          Avisos activados en este dispositivo
        </span>
        <Button variant="ghost" size="sm" onClick={handleDeactivate}>
          Desactivar
        </Button>
      </div>
    )
  }

  if (state === "prompting-password" || state === "activating") {
    return (
      <form onSubmit={handleSubmitPassword} className="flex flex-col gap-3 rounded-lg border px-4 py-4">
        <Label htmlFor="push-password">Confirmá tu contraseña del buzón para activar avisos</Label>
        <Input
          id="push-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={state === "activating"}
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={state === "activating"}>
            {state === "activating" ? "Activando..." : "Confirmar"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setState("inactive")} disabled={state === "activating"}>
            Cancelar
          </Button>
        </div>
      </form>
    )
  }

  return (
    <Button variant="outline" onClick={handleActivateClick} className="gap-2">
      <Bell className="h-4 w-4" />
      Activar avisos en este dispositivo
    </Button>
  )
}
