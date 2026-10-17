"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchPlateSenders, muteSender, blockSender, type PlateSenderRow } from "./senders-actions"

// Dedicated section, not inline per-message buttons — a decision made
// while planning the abuse-handling work (one place to manage every sender
// of this plate, rather than scattering mute/block controls across dozens
// of message cards).
export function PlateSendersSection({ plateNumber }: { plateNumber: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [senders, setSenders] = useState<PlateSenderRow[] | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [pendingAliasId, setPendingAliasId] = useState<string | null>(null)

  const handleToggleOpen = async () => {
    const next = !isOpen
    setIsOpen(next)
    if (next && senders === null) {
      setIsLoading(true)
      setErrorMessage("")
      const result = await fetchPlateSenders(plateNumber)
      if (result.success) {
        setSenders(result.senders)
      } else {
        setErrorMessage(result.error)
      }
      setIsLoading(false)
    }
  }

  const handleMute = async (aliasId: string, muted: boolean) => {
    setPendingAliasId(aliasId)
    setErrorMessage("")
    const result = await muteSender(plateNumber, aliasId, muted)
    if (result.success) {
      setSenders((prev) => prev?.map((s) => (s.aliasId === aliasId ? { ...s, muted } : s)) ?? null)
    } else {
      setErrorMessage(result.error || "No se pudo actualizar.")
    }
    setPendingAliasId(null)
  }

  const handleBlock = async (aliasId: string, blocked: boolean) => {
    setPendingAliasId(aliasId)
    setErrorMessage("")
    const result = await blockSender(plateNumber, aliasId, blocked)
    if (result.success) {
      setSenders((prev) => prev?.map((s) => (s.aliasId === aliasId ? { ...s, blocked } : s)) ?? null)
    } else {
      setErrorMessage(result.error || "No se pudo actualizar.")
    }
    setPendingAliasId(null)
  }

  return (
    <div className="mb-8 rounded-xl border bg-muted/30 p-4">
      <button
        type="button"
        onClick={handleToggleOpen}
        className="flex w-full items-center justify-between font-label text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Remitentes{senders ? ` (${senders.length})` : ""}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="mt-4 flex flex-col gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          {!isLoading && senders?.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no tenés remitentes.</p>
          )}

          {senders?.map((sender) => (
            <div key={sender.aliasId} className="flex flex-col gap-2 rounded-lg border bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{sender.aliasCode}</span>
                <span className="text-xs text-muted-foreground">
                  {sender.messageCount} mensaje{sender.messageCount !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pendingAliasId === sender.aliasId}
                  onClick={() => handleMute(sender.aliasId, !sender.muted)}
                  className="rounded-full text-xs"
                >
                  {sender.muted ? "Dejar de silenciar" : "Silenciar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pendingAliasId === sender.aliasId}
                  onClick={() => handleBlock(sender.aliasId, !sender.blocked)}
                  className="rounded-full text-xs text-destructive"
                >
                  {sender.blocked ? "Desbloquear" : "Bloquear"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Silenciar: no te llegan avisos por correo ni notificación de sus mensajes, pero siguen apareciendo en
                tu buzón. Bloquear: es silencioso — no se entera — y solo afecta lo que te escriba de ahora en
                adelante; sus mensajes anteriores no cambian.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
