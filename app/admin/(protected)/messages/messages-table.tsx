"use client"

import { useState, useTransition } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadCSV } from "@/lib/csv/download-csv"
import { toCSV } from "@/lib/csv/to-csv"
import {
  fetchMessages,
  fetchAllMessagesForExport,
  fetchReportedMessages,
  deleteMessage,
  permanentlyDeleteMessage,
  dismissReport,
  type MessagesPage,
  type ReportedMessageDTO,
} from "./actions"

type Tab = "all" | "reported"

export function MessagesTable({
  initialResult,
  initialPlateFilter,
  initialReportedMessages,
}: {
  initialResult: MessagesPage
  initialPlateFilter: string
  initialReportedMessages: ReportedMessageDTO[]
}) {
  const [tab, setTab] = useState<Tab>("all")
  const [result, setResult] = useState(initialResult)
  const [plateFilter, setPlateFilter] = useState(initialPlateFilter)
  // Separate from plateFilter (the live search box text) so "Descargar CSV"
  // always matches what's actually on screen, not text typed but not yet
  // submitted via "Buscar".
  const [appliedPlateFilter, setAppliedPlateFilter] = useState(initialPlateFilter)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [reportedMessages, setReportedMessages] = useState(initialReportedMessages)
  const [revealedReportIds, setRevealedReportIds] = useState<Set<string>>(new Set())
  const [reportActionId, setReportActionId] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize))

  const loadPage = (page: number, plate: string, nextIncludeDeleted: boolean) => {
    setAppliedPlateFilter(plate)
    startTransition(async () => {
      const next = await fetchMessages({ page, plate: plate || undefined, includeDeleted: nextIncludeDeleted })
      setResult(next)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadPage(1, plateFilter, includeDeleted)
  }

  const handleToggleIncludeDeleted = (checked: boolean) => {
    setIncludeDeleted(checked)
    loadPage(1, appliedPlateFilter, checked)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const rows = await fetchAllMessagesForExport({ plate: appliedPlateFilter || undefined, includeDeleted })
      const csv = toCSV(
        ["Placa", "Alias", "Mensaje", "Contacto", "Fecha", "Eliminado"],
        rows.map((msg) => [
          msg.plateNumber,
          msg.isBroadcast ? "CAVATAR (Oficial)" : (msg.alias ?? ""),
          msg.message,
          msg.contact ?? "",
          new Date(msg.createdAt).toLocaleString("es-MX"),
          msg.deletedAt ? `Sí (${msg.deletedBy ?? "?"})` : "No",
        ]),
      )
      const datePart = new Date().toISOString().slice(0, 10)
      const filterSuffix = appliedPlateFilter ? `-placa-${appliedPlateFilter}` : ""
      downloadCSV(`mensajes${filterSuffix}-${datePart}.csv`, csv)
    } finally {
      setIsExporting(false)
    }
  }

  const refreshReportedMessages = async () => {
    const next = await fetchReportedMessages()
    setReportedMessages(next)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const res = await deleteMessage(id)
    if (res.success) {
      setResult((prev) => ({
        ...prev,
        messages: includeDeleted
          ? prev.messages.map((m) =>
              m.id === id ? { ...m, deletedAt: new Date().toISOString(), deletedBy: res.deletedBy ?? null } : m,
            )
          : prev.messages.filter((m) => m.id !== id),
        totalCount: includeDeleted ? prev.totalCount : prev.totalCount - 1,
      }))
      await refreshReportedMessages()
    }
    setDeletingId(null)
  }

  const handlePermanentDelete = async (id: string) => {
    setDeletingId(id)
    const res = await permanentlyDeleteMessage(id)
    if (res.success) {
      setResult((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => m.id !== id),
        totalCount: prev.totalCount - 1,
      }))
      await refreshReportedMessages()
    }
    setDeletingId(null)
  }

  const handleDeleteFromReport = async (report: ReportedMessageDTO) => {
    if (!report.messageId) return
    setReportActionId(report.id)
    const res = await deleteMessage(report.messageId)
    if (res.success) {
      setReportedMessages((prev) => prev.filter((r) => r.id !== report.id))
    }
    setReportActionId(null)
  }

  const handleDismissReport = async (reportId: string) => {
    setReportActionId(reportId)
    const res = await dismissReport(reportId)
    if (res.success) {
      setReportedMessages((prev) => prev.filter((r) => r.id !== reportId))
    }
    setReportActionId(null)
  }

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <Button
          type="button"
          variant={tab === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("all")}
        >
          Todos
        </Button>
        <Button
          type="button"
          variant={tab === "reported" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("reported")}
        >
          Reportados {reportedMessages.length > 0 && `(${reportedMessages.length})`}
        </Button>
      </div>

      {tab === "reported" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportedMessages.map((report) => {
                const revealed = revealedReportIds.has(report.id)
                return (
                  <TableRow key={report.id}>
                    <TableCell className="font-plate">{report.plateNumber}</TableCell>
                    <TableCell className="max-w-xs">
                      {revealed ? (
                        <span className="whitespace-pre-wrap">{report.messagePreview}</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevealedReportIds((prev) => new Set(prev).add(report.id))}
                        >
                          Mostrar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{report.reason ?? "—"}</TableCell>
                    <TableCell>{new Date(report.createdAt).toLocaleString("es-MX")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reportActionId === report.id}
                          onClick={() => handleDismissReport(report.id)}
                        >
                          Revisado
                        </Button>
                        {report.messageId && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" disabled={reportActionId === report.id}>
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar este mensaje?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se oculta de inmediato del buzón de {report.plateNumber}. Se purga definitivamente
                                  a los 30 días.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteFromReport(report)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {reportedMessages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No hay reportes pendientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <>
          <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Filtrar por placa..."
              value={plateFilter}
              onChange={(e) => setPlateFilter(e.target.value)}
              className="sm:max-w-xs"
            />
            <Button type="submit" variant="outline" disabled={isPending}>
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={isExporting || result.totalCount === 0}
              className="sm:ml-auto"
            >
              {isExporting ? "Descargando..." : "Descargar CSV"}
            </Button>
          </form>

          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              id="includeDeleted"
              checked={includeDeleted}
              onCheckedChange={(checked) => handleToggleIncludeDeleted(checked === true)}
            />
            <Label htmlFor="includeDeleted" className="text-sm font-normal text-muted-foreground">
              Incluir eliminados
            </Label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.messages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-plate">{msg.plateNumber}</TableCell>
                    <TableCell>
                      {msg.isBroadcast ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          CAVATAR
                        </span>
                      ) : (
                        (msg.alias ?? "—")
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {msg.message}
                      {msg.deletedAt && (
                        <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          Eliminado ({msg.deletedBy ?? "?"})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{msg.contact ?? "—"}</TableCell>
                    <TableCell>{new Date(msg.createdAt).toLocaleString("es-MX")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!msg.deletedAt && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" disabled={deletingId === msg.id}>
                                Borrar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Borrar este mensaje?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se oculta de inmediato del buzón de {msg.plateNumber}. Se purga definitivamente a
                                  los 30 días.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(msg.id)}>Borrar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={deletingId === msg.id}>
                              Eliminar definitivamente
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar definitivamente este mensaje?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer de ninguna forma — el mensaje se borra de la base de
                                datos ahora mismo, sin esperar los 30 días del borrado normal.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handlePermanentDelete(msg.id)}>
                                Eliminar definitivamente
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {result.messages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay mensajes que coincidan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {result.page} de {totalPages} · {result.totalCount} mensajes
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={result.page <= 1 || isPending}
                onClick={() => loadPage(result.page - 1, plateFilter, includeDeleted)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={result.page >= totalPages || isPending}
                onClick={() => loadPage(result.page + 1, plateFilter, includeDeleted)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
