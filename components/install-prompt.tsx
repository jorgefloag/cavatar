"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Share, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const DISMISS_KEY = "cavatar_install_prompt_dismissed_at"
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

// Chrome fires this before showing its own install UI; it's not a standard
// DOM type, so it's hand-declared here rather than pulling in a types package
// for one interface.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return window.matchMedia("(display-mode: standalone)").matches || navigatorStandalone === true
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function wasDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (Number.isNaN(dismissedAt)) return false
  return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS
}

export function InstallPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [dismissed, setDismissed] = useState(true) // default hidden until the effect below clears it
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return

    setDismissed(false)

    if (isIOS()) {
      setShowIOSInstructions(true)
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    // If the user installs mid-session (e.g. via the browser's own menu,
    // not our button), hide the bar immediately instead of waiting for a
    // reload to re-evaluate isStandalone().
    const handleAppInstalled = () => setDismissed(true)

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  // Operator-only area — not the audience for an install nudge, and the
  // dense admin tables don't need a fixed bar competing for space.
  const isAdminRoute = pathname?.startsWith("/admin") ?? false
  const shouldShow = !isAdminRoute && !dismissed && (showIOSInstructions || !!deferredPrompt)

  // This bar is `fixed`, so no page knows to leave room for it — on a short
  // viewport (iPhone 12 and smaller) it can sit directly on top of the
  // bottom-most control on whatever page happens to be open (buzón
  // archive/delete/report buttons, /send's submit button, etc). Reserving
  // the space here, once, covers every page without touching any of them.
  // Measured via ResizeObserver rather than a fixed guess, since the
  // Spanish copy wraps to one or two lines depending on viewport width.
  useEffect(() => {
    if (!shouldShow || !barRef.current) {
      document.body.style.paddingBottom = ""
      return
    }

    const el = barRef.current
    const applyHeight = () => {
      document.body.style.paddingBottom = `${el.offsetHeight}px`
    }
    applyHeight()

    const observer = new ResizeObserver(applyHeight)
    observer.observe(el)
    return () => {
      observer.disconnect()
      document.body.style.paddingBottom = ""
    }
  }, [shouldShow])

  if (!shouldShow) return null

  return (
    <div ref={barRef} className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)_+_1rem)]">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-background p-4 shadow-lg">
        <div className="flex-1">
          <p className="font-label text-xs uppercase tracking-widest text-muted-foreground">Instalá CAVATAR</p>
          {showIOSInstructions ? (
            <p className="mt-1 text-sm text-foreground">
              Tocá <Share className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" /> Compartir y luego
              &quot;Agregar a pantalla de inicio&quot;.
            </p>
          ) : (
            <p className="mt-1 text-sm text-foreground">Accedé más rápido desde tu pantalla de inicio.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!showIOSInstructions && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              Instalar
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            aria-label="Cerrar aviso de instalación"
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
