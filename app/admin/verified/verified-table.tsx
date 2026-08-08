"use client"

import { useMemo, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  approveVerifiedRequest,
  rejectVerifiedRequest,
  revokeVerifiedProfile,
  type VerifiedRequestAdminDTO,
} from "./actions"

type StatusFilter = "all" | "pending" | "approved" | "rejected"

type ActionResult = { success: boolean; error?: string; warning?: string }

const statusLabels: Record<VerifiedRequestAdminDTO["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

const statusVariants: Record<VerifiedRequestAdminDTO["status"], "default" | "secondary" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "secondary",
}

export function VerifiedTable({ initialRequests }: { initialRequests: VerifiedRequestAdminDTO[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== "all" && req.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (
          !req.userEmail.toLowerCase().includes(q) &&
          !req.fullName.toLowerCase().includes(q) &&
          !req.phone.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [requests, statusFilter, search])

  const patchRequest = (id: string, patch: Partial<VerifiedRequestAdminDTO>) => {
    setRequests((prev) => prev.map((req) => (req.id === id ? { ...req, ...patch } : req)))
  }

  const runAction = async (id: string, action: (id: string) => Promise<ActionResult>) => {
    setLoadingId(id)
    const result = await action(id)
    setRowMessage((prev) => ({ ...prev, [id]: result.warning || result.error || "" }))
    if (result.success) {
      patchRequest(id, { reviewedAt: new Date().toISOString() })
    }
    setLoadingId(null)
    return result.success
  }

  const handleApprove = async (id: string) => {
    if (await runAction(id, approveVerifiedRequest)) patchRequest(id, { status: "approved" })
  }
  const handleReject = async (id: string) => {
    if (await runAction(id, rejectVerifiedRequest)) patchRequest(id, { status: "rejected" })
  }
  const handleRevoke = async (id: string) => {
    if (await runAction(id, revokeVerifiedProfile)) patchRequest(id, { status: "rejected" })
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="approved">Aprobados</TabsTrigger>
            <TabsTrigger value="rejected">Rechazados</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Buscar por correo, nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((req) => (
              <TableRow key={req.id}>
                <TableCell>{req.userEmail}</TableCell>
                <TableCell>{req.fullName}</TableCell>
                <TableCell>{req.phone}</TableCell>
                <TableCell>
                  <Badge variant={statusVariants[req.status]}>{statusLabels[req.status]}</Badge>
                </TableCell>
                <TableCell>{new Date(req.createdAt).toLocaleDateString("es-MX")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex justify-end gap-2">
                      {req.status === "pending" && (
                        <>
                          <Button size="sm" disabled={loadingId === req.id} onClick={() => handleApprove(req.id)}>
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loadingId === req.id}
                            onClick={() => handleReject(req.id)}
                          >
                            Rechazar
                          </Button>
                        </>
                      )}
                      {req.status === "approved" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={loadingId === req.id}>
                              Revocar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Revocar este perfil verificado?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {req.userEmail} perderá el límite ampliado de envío de mensajes de inmediato.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevoke(req.id)}>Revocar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    {rowMessage[req.id] && (
                      <p className="max-w-xs text-xs text-muted-foreground">{rowMessage[req.id]}</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay solicitudes que coincidan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
