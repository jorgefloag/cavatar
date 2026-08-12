"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  previewBroadcastRecipients,
  sendBroadcast,
  undoBroadcast,
  type BrandOptionDTO,
  type BroadcastHistoryDTO,
} from "./actions"

const ALL_PLATES = "all"

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function HistoryItem({
  entry,
  onUndone,
}: {
  entry: BroadcastHistoryDTO
  onUndone: (id: string) => void
}) {
  const [error, setError] = useState("")

  const handleUndo = async () => {
    const result = await undoBroadcast(entry.id)
    if (!result.success) {
      setError(result.error || "Error al deshacer la difusión.")
      return
    }
    onUndone(entry.id)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-label text-xs uppercase tracking-wide text-muted-foreground">
          {entry.brandFilter ? capitalize(entry.brandFilter) : "Todas las placas aprobadas"} · {entry.recipientCount}{" "}
          destinatarios
        </span>
        <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
      </div>
      <p className="mb-3 text-sm text-foreground">{entry.message}</p>
      {entry.undoneAt ? (
        <p className="text-xs text-muted-foreground">Deshecha el {formatDate(entry.undoneAt)}</p>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">
              Deshacer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Deshacer esta difusión?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borran los {entry.recipientCount} mensajes de este envío del buzón de cada placa. Esto no
                garantiza que nadie los haya visto ya — solo deja de mostrarlos a partir de ahora.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleUndo}>Deshacer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function BroadcastManager({
  brandOptions,
  initialHistory,
}: {
  brandOptions: BrandOptionDTO[]
  initialHistory: BroadcastHistoryDTO[]
}) {
  const [message, setMessage] = useState("")
  const [brandValue, setBrandValue] = useState(ALL_PLATES)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [confirmInput, setConfirmInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [history, setHistory] = useState(initialHistory)

  const totalApproved = brandOptions.reduce((sum, opt) => sum + opt.count, 0)
  const brandFilter = brandValue === ALL_PLATES ? null : brandValue

  const resetPreview = () => {
    setPreviewCount(null)
    setConfirmInput("")
  }

  const handlePreview = async () => {
    setFeedback(null)
    setIsPreviewing(true)
    const result = await previewBroadcastRecipients(brandFilter)
    setIsPreviewing(false)
    setPreviewCount(result.count)
    setConfirmInput("")
  }

  const handleSend = async () => {
    if (previewCount === null) return
    setIsSending(true)
    setFeedback(null)

    const result = await sendBroadcast({ message, brandFilter, confirmedCount: previewCount })
    setIsSending(false)

    if (!result.success) {
      setFeedback({ type: "error", text: result.error || "Error al enviar el mensaje masivo." })
      return
    }

    setFeedback({ type: "success", text: `Enviado a ${result.recipientCount} placas.` })
    setMessage("")
    setBrandValue(ALL_PLATES)
    resetPreview()

    setHistory((prev) => [
      {
        id: crypto.randomUUID(),
        message,
        brandFilter,
        recipientCount: result.recipientCount ?? 0,
        createdAt: new Date().toISOString(),
        undoneAt: null,
      },
      ...prev,
    ])
  }

  const canConfirmSend = previewCount !== null && previewCount > 0 && confirmInput.trim() === String(previewCount)

  return (
    <div className="flex flex-col gap-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-label text-sm uppercase tracking-wide text-foreground">Nuevo mensaje masivo</h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="broadcast-brand" className="mb-1.5 block text-xs text-muted-foreground">
              Destinatarios
            </Label>
            <Select
              value={brandValue}
              onValueChange={(value) => {
                setBrandValue(value)
                resetPreview()
              }}
            >
              <SelectTrigger id="broadcast-brand" className="w-full sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PLATES}>Todas las placas aprobadas ({totalApproved})</SelectItem>
                {brandOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="broadcast-message" className="mb-1.5 block text-xs text-muted-foreground">
              Mensaje (aparece marcado como oficial de CAVATAR en el buzón)
            </Label>
            <Textarea
              id="broadcast-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                resetPreview()
              }}
              maxLength={500}
              rows={4}
              placeholder="Escribe el mensaje que verán todas las placas seleccionadas..."
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/500</p>
          </div>

          {previewCount === null ? (
            <Button onClick={handlePreview} disabled={!message.trim() || isPreviewing} className="self-start">
              {isPreviewing ? "Calculando..." : "Vista previa"}
            </Button>
          ) : previewCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay placas aprobadas que coincidan con este filtro.
            </p>
          ) : (
            <div className="rounded-md border border-border bg-background p-4">
              <p className="mb-3 text-sm text-foreground">
                Este mensaje se enviará a <strong>{previewCount}</strong> placa{previewCount === 1 ? "" : "s"}{" "}
                aprobada{previewCount === 1 ? "" : "s"}. Esta acción no se puede deshacer del todo: se puede borrar
                de los buzones después, pero no garantiza que nadie ya lo haya visto.
              </p>
              <Label htmlFor="broadcast-confirm" className="mb-1.5 block text-xs text-muted-foreground">
                Escribe {previewCount} para confirmar
              </Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="broadcast-confirm"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  inputMode="numeric"
                  className="w-32"
                />
                <Button onClick={handleSend} disabled={!canConfirmSend || isSending} variant="destructive">
                  {isSending ? "Enviando..." : `Enviar a ${previewCount}`}
                </Button>
                <Button variant="ghost" onClick={resetPreview}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {feedback && (
            <p className={`text-sm ${feedback.type === "error" ? "text-destructive" : "text-foreground"}`}>
              {feedback.text}
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-label text-sm uppercase tracking-wide text-foreground">Historial de envíos</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no se ha enviado ningún mensaje masivo.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((entry) => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                onUndone={(id) =>
                  setHistory((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, undoneAt: new Date().toISOString() } : item)),
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
