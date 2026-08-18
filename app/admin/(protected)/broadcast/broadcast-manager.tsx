"use client"

import { useRef, useState } from "react"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { downloadCSV } from "@/lib/csv/download-csv"
import { toCSV } from "@/lib/csv/to-csv"
import {
  fetchBroadcastRecipients,
  previewBroadcastFile,
  previewBroadcastRecipients,
  sendBroadcast,
  undoBroadcast,
  type BrandOptionDTO,
  type BroadcastHistoryDTO,
} from "./actions"

type Mode = "all" | "brand" | "list"

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

function historyLabel(entry: BroadcastHistoryDTO) {
  if (entry.source === "brand" && entry.brandFilter) return capitalize(entry.brandFilter)
  if (entry.source === "list") return "Lista de placas subida"
  return "Todas las placas aprobadas"
}

function RecipientsDialog({ broadcastId, createdAt }: { broadcastId: string; createdAt: string }) {
  const [state, setState] = useState<
    { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "loaded"; plates: string[] }
  >({ status: "idle" })

  const handleOpenChange = async (open: boolean) => {
    if (!open || state.status !== "idle") return
    setState({ status: "loading" })
    const result = await fetchBroadcastRecipients(broadcastId)
    if (!result.success) {
      setState({ status: "error", message: result.error || "No se pudo cargar la lista de destinatarios." })
      return
    }
    setState({ status: "loaded", plates: result.plates ?? [] })
  }

  const handleExport = () => {
    if (state.status !== "loaded") return
    const csv = toCSV(["Placa"], state.plates.map((plate) => [plate]))
    const datePart = createdAt.slice(0, 10)
    downloadCSV(`destinatarios-${datePart}.csv`, csv)
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Ver destinatarios
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Destinatarios</DialogTitle>
        </DialogHeader>
        {state.status === "loading" && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {state.status === "error" && <p className="text-sm text-muted-foreground">{state.message}</p>}
        {state.status === "loaded" && (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{state.plates.length} placas</p>
              <Button size="sm" variant="outline" onClick={handleExport}>
                Exportar CSV
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {state.plates.map((plate) => (
                <span
                  key={plate}
                  className="rounded-md border border-border bg-muted/30 px-2 py-1 font-plate text-sm uppercase tracking-wider text-foreground"
                >
                  {plate}
                </span>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
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
          {historyLabel(entry)} · {entry.recipientCount} destinatarios
        </span>
        <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
      </div>
      <p className="mb-3 text-sm text-foreground">{entry.message}</p>
      <div className="flex flex-wrap items-center gap-2">
        <RecipientsDialog broadcastId={entry.id} createdAt={entry.createdAt} />
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
      </div>
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
  const [mode, setMode] = useState<Mode>("all")
  const [brandValue, setBrandValue] = useState(brandOptions[0]?.value ?? "")
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewPlates, setPreviewPlates] = useState<string[] | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [confirmInput, setConfirmInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [history, setHistory] = useState(initialHistory)

  const totalApproved = brandOptions.reduce((sum, opt) => sum + opt.count, 0)

  const resetPreview = () => {
    setPreviewCount(null)
    setPreviewPlates(null)
    setConfirmInput("")
  }

  const handleModeChange = (value: Mode) => {
    setMode(value)
    setFeedback(null)
    resetPreview()
  }

  const canPreview =
    Boolean(message.trim()) &&
    (mode === "all" || (mode === "brand" && Boolean(brandValue)) || (mode === "list" && Boolean(file)))

  const handlePreview = async () => {
    setFeedback(null)
    setIsPreviewing(true)

    if (mode === "list") {
      if (!file) {
        setIsPreviewing(false)
        return
      }
      const formData = new FormData()
      formData.append("file", file)
      const result = await previewBroadcastFile(formData)
      setIsPreviewing(false)
      if (!result.success) {
        setFeedback({ type: "error", text: result.error || "No se pudo leer el archivo." })
        return
      }
      setPreviewCount(result.count ?? 0)
      setPreviewPlates(result.plates ?? [])
      setConfirmInput("")
      return
    }

    const result = await previewBroadcastRecipients(mode === "brand" ? brandValue : null)
    setIsPreviewing(false)
    setPreviewCount(result.count)
    setConfirmInput("")
  }

  const handleSend = async () => {
    if (previewCount === null) return
    setIsSending(true)
    setFeedback(null)

    const recipients =
      mode === "brand"
        ? ({ mode: "brand", brandFilter: brandValue } as const)
        : mode === "list"
          ? ({ mode: "list", plates: previewPlates ?? [] } as const)
          : ({ mode: "all" } as const)

    const result = await sendBroadcast({ message, confirmedCount: previewCount, recipients })
    setIsSending(false)

    if (!result.success) {
      setFeedback({ type: "error", text: result.error || "Error al enviar el mensaje masivo." })
      return
    }

    setFeedback({ type: "success", text: `Enviado a ${result.recipientCount} placas.` })

    // broadcastId comes from the row sendBroadcast() just inserted — using a
    // client-generated id here instead would leave "Ver destinatarios" and
    // "Deshacer" pointing at a broadcast that doesn't exist in the database
    // until the next full page load replaces this optimistic entry.
    if (result.broadcastId) {
      setHistory((prev) => [
        {
          id: result.broadcastId as string,
          message,
          source: mode,
          brandFilter: mode === "brand" ? brandValue : null,
          recipientCount: result.recipientCount ?? 0,
          createdAt: new Date().toISOString(),
          undoneAt: null,
        },
        ...prev,
      ])
    }

    setMessage("")
    setMode("all")
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    resetPreview()
  }

  const canConfirmSend = previewCount !== null && previewCount > 0 && confirmInput.trim() === String(previewCount)

  return (
    <div className="flex flex-col gap-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-label text-sm uppercase tracking-wide text-foreground">Nuevo mensaje masivo</h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">Destinatarios</Label>
            <RadioGroup value={mode} onValueChange={(value) => handleModeChange(value as Mode)} className="gap-3">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="mode-all" />
                <Label htmlFor="mode-all" className="font-normal">
                  Todas las placas aprobadas ({totalApproved})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="brand" id="mode-brand" />
                <Label htmlFor="mode-brand" className="font-normal">
                  Filtrar por marca
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="list" id="mode-list" />
                <Label htmlFor="mode-list" className="font-normal">
                  Subir lista de placas (.xlsx / .csv)
                </Label>
              </div>
            </RadioGroup>

            {mode === "brand" && (
              <Select
                value={brandValue}
                onValueChange={(value) => {
                  setBrandValue(value)
                  resetPreview()
                }}
              >
                <SelectTrigger className="mt-3 w-full sm:w-80">
                  <SelectValue placeholder="Elegí una marca" />
                </SelectTrigger>
                <SelectContent>
                  {brandOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {mode === "list" && (
              <div className="mt-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null)
                    resetPreview()
                  }}
                  className="h-10 max-w-sm text-sm"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Una columna con las placas (con o sin encabezado "Placa"). Las placas repetidas, vacías o
                  inválidas se omiten automáticamente. Máximo 5,000 placas por archivo.
                </p>
              </div>
            )}
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
            <Button onClick={handlePreview} disabled={!canPreview || isPreviewing} className="self-start">
              {isPreviewing ? "Calculando..." : "Vista previa"}
            </Button>
          ) : previewCount === 0 ? (
            <p className="text-sm text-muted-foreground">No hay destinatarios para este envío.</p>
          ) : (
            <div className="rounded-md border border-border bg-background p-4">
              <p className="mb-3 text-sm text-foreground">
                Este mensaje se enviará a <strong>{previewCount}</strong> placa{previewCount === 1 ? "" : "s"}.
                Esta acción no se puede deshacer del todo: se puede borrar de los buzones después, pero no garantiza
                que nadie ya lo haya visto.
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
