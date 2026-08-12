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
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchMessages, deleteMessage, type MessagesPage } from "./actions"

export function MessagesTable({
  initialResult,
  initialPlateFilter,
}: {
  initialResult: MessagesPage
  initialPlateFilter: string
}) {
  const [result, setResult] = useState(initialResult)
  const [plateFilter, setPlateFilter] = useState(initialPlateFilter)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize))

  const loadPage = (page: number, plate: string) => {
    startTransition(async () => {
      const next = await fetchMessages({ page, plate: plate || undefined })
      setResult(next)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadPage(1, plateFilter)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const res = await deleteMessage(id)
    if (res.success) {
      setResult((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => m.id !== id),
        totalCount: prev.totalCount - 1,
      }))
    }
    setDeletingId(null)
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Filtrar por placa..."
          value={plateFilter}
          onChange={(e) => setPlateFilter(e.target.value)}
          className="sm:max-w-xs"
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          Buscar
        </Button>
      </form>

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
                <TableCell className="max-w-xs truncate">{msg.message}</TableCell>
                <TableCell>{msg.contact ?? "—"}</TableCell>
                <TableCell>{new Date(msg.createdAt).toLocaleString("es-MX")}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={deletingId === msg.id}>
                        Borrar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Borrar este mensaje?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. El mensaje se elimina permanentemente del buzón de{" "}
                          {msg.plateNumber}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(msg.id)}>Borrar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
            onClick={() => loadPage(result.page - 1, plateFilter)}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={result.page >= totalPages || isPending}
            onClick={() => loadPage(result.page + 1, plateFilter)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
